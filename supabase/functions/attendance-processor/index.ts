/**
 * @file attendance-processor/index.ts
 * @description Supabase Edge Function for dual-level QR attendance processing
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface AttendanceRequest {
  student_id: string | null;
  session_id?: string | null;
  event_type: 'center_check_in' | 'center_check_out' | 'session_check_in';
  qr_scan_data?: any;
  scan_location?: string;
  device_info?: string;
  offline_sync?: boolean;
  batch_data?: AttendanceRequest[];
}

interface AttendanceResponse {
  success: boolean;
  attendance_id?: string;
  message: string;
  student_status?: 'checked_in' | 'checked_out' | 'in_session';
  facility_count?: number;
  validation_warnings?: string[];
  batch_results?: BatchResult[];
}

interface BatchResult {
  success: boolean;
  attendance_id?: string;
  error?: string;
  request_index: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const requestData: AttendanceRequest = await req.json()

    // Handle batch processing for offline sync
    if (requestData.batch_data) {
      const batchResults = await processBatchAttendance(supabase, requestData.batch_data, user.id)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Processed ${batchResults.length} attendance records`,
          batch_results: batchResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process single attendance record
    const result = await processSingleAttendance(supabase, requestData, user.id)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Attendance processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processSingleAttendance(
  supabase: any, 
  requestData: AttendanceRequest, 
  userId: string
): Promise<AttendanceResponse> {
  const validationWarnings: string[] = []

  // Validate event type
  const validEventTypes = ['center_check_in', 'center_check_out', 'session_check_in']
  if (!validEventTypes.includes(requestData.event_type)) {
    return {
      success: false,
      message: `Invalid event type: ${requestData.event_type}. Must be one of: ${validEventTypes.join(', ')}`
    }
  }

  // Enhanced validation for dual-level system
  if (requestData.event_type === 'session_check_in' && !requestData.session_id) {
    validationWarnings.push('Session check-in without session_id - treating as general attendance')
  }

  if (requestData.event_type.startsWith('center_') && !requestData.scan_location) {
    validationWarnings.push('Center attendance without scan location')
  }

  // Check for duplicate recent scans (prevent accidental double-scans)
  const recentScanCheck = await supabase
    .from('attendance_logs')
    .select('id, timestamp')
    .eq('student_id', requestData.student_id)
    .eq('event_type', requestData.event_type)
    .gte('timestamp', new Date(Date.now() - 60000).toISOString()) // Within last minute
    .order('timestamp', { ascending: false })
    .limit(1)

  if (recentScanCheck.data && recentScanCheck.data.length > 0) {
    return {
      success: false,
      message: 'Duplicate scan detected within the last minute',
      validation_warnings: validationWarnings
    }
  }

  // Validate student exists (if provided)
  if (requestData.student_id) {
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, name_en, name_ar, is_active')
      .eq('id', requestData.student_id)
      .single()

    if (studentError || !studentData) {
      return {
        success: false,
        message: 'Student not found'
      }
    }

    if (!studentData.is_active) {
      return {
        success: false,
        message: 'Student account is inactive'
      }
    }
  }

  // Validate session exists (if provided)
  if (requestData.session_id) {
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, scheduled_start_time, scheduled_end_time, status')
      .eq('id', requestData.session_id)
      .single()

    if (sessionError || !sessionData) {
      return {
        success: false,
        message: 'Session not found'
      }
    }

    // Check if session is in valid time window (within 30 minutes of start/end)
    const now = new Date()
    const sessionStart = new Date(sessionData.scheduled_start_time)
    const sessionEnd = new Date(sessionData.scheduled_end_time)
    const thirtyMinutes = 30 * 60 * 1000

    if (now < new Date(sessionStart.getTime() - thirtyMinutes)) {
      validationWarnings.push('Attendance recorded before session start time')
    }

    if (now > new Date(sessionEnd.getTime() + thirtyMinutes)) {
      validationWarnings.push('Attendance recorded after session end time')
    }
  }

  // Call the database function to log attendance
  const { data: attendanceData, error: attendanceError } = await supabase
    .rpc('log_attendance', {
      p_student_id: requestData.student_id,
      p_event_type: requestData.event_type,
      p_session_id: requestData.session_id || null,
      p_qr_scan_data: requestData.qr_scan_data || null,
      p_scan_location: requestData.scan_location || null,
      p_scanned_by: userId,
      p_device_info: requestData.device_info || null
    })

  if (attendanceError) {
    console.error('Database error:', attendanceError)
    return {
      success: false,
      message: 'Failed to log attendance: ' + attendanceError.message
    }
  }

  // Determine student status after this event
  let studentStatus: 'checked_in' | 'checked_out' | 'in_session' = 'checked_in'
  
  if (requestData.event_type === 'center_check_out') {
    studentStatus = 'checked_out'
  } else if (requestData.event_type === 'session_check_in') {
    studentStatus = 'in_session'
  }

  // Get current facility count
  const { data: facilityCountData } = await supabase
    .rpc('get_current_facility_attendance')

  const facilityCount = facilityCountData ? facilityCountData.length : 0

  // Send real-time notification for live updates
  if (requestData.student_id && requestData.event_type !== 'center_check_out') {
    await supabase
      .channel('attendance_updates')
      .send({
        type: 'broadcast',
        event: 'attendance_logged',
        payload: {
          student_id: requestData.student_id,
          event_type: requestData.event_type,
          timestamp: new Date().toISOString(),
          scan_location: requestData.scan_location,
          facility_count: facilityCount
        }
      })
  }

  return {
    success: true,
    attendance_id: attendanceData,
    message: getSuccessMessage(requestData.event_type, requestData.scan_location),
    student_status: studentStatus,
    facility_count: facilityCount,
    validation_warnings: validationWarnings.length > 0 ? validationWarnings : undefined
  }
}

async function processBatchAttendance(
  supabase: any,
  batchData: AttendanceRequest[],
  userId: string
): Promise<BatchResult[]> {
  const results: BatchResult[] = []

  for (let i = 0; i < batchData.length; i++) {
    const request = batchData[i]
    
    try {
      const result = await processSingleAttendance(supabase, request, userId)
      
      results.push({
        success: result.success,
        attendance_id: result.attendance_id,
        error: result.success ? undefined : result.message,
        request_index: i
      })
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        request_index: i
      })
    }

    // Add small delay between batch processing to prevent overwhelming the database
    if (i < batchData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

function getSuccessMessage(eventType: string, location?: string): string {
  switch (eventType) {
    case 'center_check_in':
      return `Successfully checked in at ${location || 'facility'}`
    case 'center_check_out':
      return `Successfully checked out from ${location || 'facility'}`
    case 'session_check_in':
      return `Successfully recorded session attendance`
    default:
      return 'Attendance logged successfully'
  }
}

/* To deploy this function:

1. Make sure you have Supabase CLI installed:
   npm install -g supabase

2. Deploy the function:
   supabase functions deploy attendance-processor

3. Set environment variables:
   supabase secrets set SUPABASE_URL=your_supabase_url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

4. Test the function:
   curl -X POST 'https://your-project.supabase.co/functions/v1/attendance-processor' \
   -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
   -H 'Content-Type: application/json' \
   -d '{
     "student_id": "student-123",
     "event_type": "center_check_in",
     "scan_location": "Main Entrance",
     "qr_scan_data": {"type": "center_entry", "location": "Main Entrance"}
   }'

5. For batch processing (offline sync):
   -d '{
     "batch_data": [
       {
         "student_id": "student-123",
         "event_type": "center_check_in",
         "scan_location": "Main Entrance"
       },
       {
         "student_id": "student-124", 
         "event_type": "session_check_in",
         "session_id": "session-456"
       }
     ]
   }'
*/