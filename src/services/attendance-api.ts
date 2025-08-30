/**
 * QR Attendance System API Service
 * Handles all database operations for the QR attendance system
 */

import { supabase } from '@/lib/supabase'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface StudentAttendance {
  id: string
  student_id: string
  session_id?: string
  course_id?: string
  enrollment_id?: string
  check_in_time: string
  check_out_time?: string
  duration_minutes?: number
  room_number?: string
  session_type: string
  attendance_mode: 'qr_scan' | 'manual' | 'auto_check_in'
  status: 'checked_in' | 'in_session' | 'checked_out' | 'absent' | 'cancelled'
  qr_scan_data?: Record<string, any>
  qr_scan_device?: string
  qr_scan_location?: string
  checked_in_by?: string
  checked_out_by?: string
  therapist_id?: string
  notes?: string
  is_late: boolean
  late_minutes: number
  early_departure: boolean
  early_departure_minutes: number
  created_at: string
  updated_at: string
  
  // Joined data
  student_name?: string
  therapist_name?: string
}

export interface TherapistAttendance {
  id: string
  therapist_id: string
  check_in_time: string
  check_out_time?: string
  work_duration_minutes?: number
  status: 'checked_in' | 'in_session' | 'on_break' | 'checked_out'
  attendance_mode: 'qr_scan' | 'manual' | 'auto_check_in'
  active_sessions: string[]
  completed_sessions: string[]
  qr_scan_data?: Record<string, any>
  qr_scan_device?: string
  building_location?: string
  department?: string
  created_at: string
  updated_at: string
  
  // Joined data
  therapist_name?: string
}

export interface RoomUtilization {
  id: string
  room_number: string
  room_name?: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  session_id?: string
  student_id?: string
  therapist_id?: string
  purpose: string
  capacity_used: number
  max_capacity: number
  equipment_used: string[]
  special_requirements?: string
  status: 'occupied' | 'available' | 'maintenance' | 'reserved' | 'cleaning'
  qr_scan_entry_data?: Record<string, any>
  qr_scan_exit_data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface QRCodeLog {
  id: string
  qr_type: 'student' | 'session' | 'therapist' | 'room' | 'generic'
  qr_data: Record<string, any>
  qr_hash: string
  student_id?: string
  session_id?: string
  therapist_id?: string
  course_id?: string
  generated_by?: string
  generated_at: string
  expires_at?: string
  scan_count: number
  last_scanned_at?: string
  last_scanned_by?: string
  is_active: boolean
  is_single_use: boolean
  max_scans?: number
  description?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AttendanceNotification {
  id: string
  recipient_type: 'parent' | 'therapist' | 'admin' | 'student'
  recipient_id: string
  notification_type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  student_id?: string
  attendance_record_id?: string
  session_id?: string
  send_email: boolean
  send_sms: boolean
  send_whatsapp: boolean
  send_push: boolean
  is_sent: boolean
  sent_at?: string
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  delivery_attempts: number
  last_attempt_at?: string
  error_message?: string
  is_read: boolean
  read_at?: string
  action_taken?: string
  created_at: string
  updated_at: string
}

export interface AttendanceStats {
  totalStudents: number
  presentStudents: number
  inSession: number
  checkedOut: number
  attendanceRate: number
  activeTherapists: number
  occupiedRooms: number
  avgSessionDuration: number
  lateArrivals: number
  earlyDepartures: number
}

export interface CreateStudentAttendanceData {
  student_id: string
  session_id?: string
  course_id?: string
  enrollment_id?: string
  room_number?: string
  session_type: string
  attendance_mode?: 'qr_scan' | 'manual' | 'auto_check_in'
  qr_scan_data?: Record<string, any>
  qr_scan_device?: string
  qr_scan_location?: string
  therapist_id?: string
  notes?: string
}

export interface UpdateStudentAttendanceData {
  id: string
  check_out_time?: string
  status?: 'checked_in' | 'in_session' | 'checked_out' | 'absent' | 'cancelled'
  room_number?: string
  session_id?: string
  therapist_id?: string
  notes?: string
  checked_out_by?: string
}

// =====================================================
// STUDENT ATTENDANCE OPERATIONS
// =====================================================

export class StudentAttendanceAPI {
  
  /**
   * Get all attendance records with optional filtering
   */
  static async getAttendanceRecords(filters?: {
    studentId?: string
    date?: string
    status?: string
    sessionType?: string
    therapistId?: string
    roomNumber?: string
    limit?: number
    offset?: number
  }): Promise<StudentAttendance[]> {
    let query = supabase
      .from('student_attendance')
      .select(`
        *,
        students!inner(name),
        therapists(name),
        sessions(
          scheduled_start_time,
          scheduled_end_time,
          title
        )
      `)
      .order('check_in_time', { ascending: false })

    // Apply filters
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }
    if (filters?.date) {
      query = query.gte('check_in_time', `${filters.date}T00:00:00.000Z`)
        .lt('check_in_time', `${filters.date}T23:59:59.999Z`)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.sessionType) {
      query = query.eq('session_type', filters.sessionType)
    }
    if (filters?.therapistId) {
      query = query.eq('therapist_id', filters.therapistId)
    }
    if (filters?.roomNumber) {
      query = query.eq('room_number', filters.roomNumber)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching attendance records:', error)
      throw new Error(`Failed to fetch attendance records: ${error.message}`)
    }

    return data.map((record: any) => ({
      ...record,
      student_name: record.students?.name,
      therapist_name: record.therapists?.name
    }))
  }

  /**
   * Get today's attendance records
   */
  static async getTodaysAttendance(): Promise<StudentAttendance[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getAttendanceRecords({ date: today })
  }

  /**
   * Get real-time attendance updates (last 10 records)
   */
  static async getRealtimeAttendance(): Promise<StudentAttendance[]> {
    return this.getAttendanceRecords({ limit: 10 })
  }

  /**
   * Check in a student
   */
  static async checkInStudent(data: CreateStudentAttendanceData): Promise<StudentAttendance> {
    // First check if student is already checked in and not checked out
    const { data: existingRecord } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', data.student_id)
      .in('status', ['checked_in', 'in_session'])
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single()

    if (existingRecord) {
      throw new Error('Student is already checked in')
    }

    const { data: result, error } = await supabase
      .from('student_attendance')
      .insert({
        student_id: data.student_id,
        session_id: data.session_id,
        course_id: data.course_id,
        enrollment_id: data.enrollment_id,
        room_number: data.room_number,
        session_type: data.session_type,
        attendance_mode: data.attendance_mode || 'qr_scan',
        qr_scan_data: data.qr_scan_data,
        qr_scan_device: data.qr_scan_device,
        qr_scan_location: data.qr_scan_location,
        therapist_id: data.therapist_id,
        notes: data.notes,
        status: 'checked_in',
        checked_in_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        students!inner(name),
        therapists(name)
      `)
      .single()

    if (error) {
      console.error('Error checking in student:', error)
      throw new Error(`Failed to check in student: ${error.message}`)
    }

    return {
      ...result,
      student_name: result.students?.name,
      therapist_name: result.therapists?.name
    }
  }

  /**
   * Check out a student
   */
  static async checkOutStudent(attendanceId: string, notes?: string): Promise<StudentAttendance> {
    const { data: result, error } = await supabase
      .from('student_attendance')
      .update({
        check_out_time: new Date().toISOString(),
        status: 'checked_out',
        checked_out_by: (await supabase.auth.getUser()).data.user?.id,
        notes: notes
      })
      .eq('id', attendanceId)
      .select(`
        *,
        students!inner(name),
        therapists(name)
      `)
      .single()

    if (error) {
      console.error('Error checking out student:', error)
      throw new Error(`Failed to check out student: ${error.message}`)
    }

    return {
      ...result,
      student_name: result.students?.name,
      therapist_name: result.therapists?.name
    }
  }

  /**
   * Start a therapy session (move from checked_in to in_session)
   */
  static async startSession(attendanceId: string, sessionId?: string, therapistId?: string): Promise<StudentAttendance> {
    const updateData: any = {
      status: 'in_session'
    }

    if (sessionId) updateData.session_id = sessionId
    if (therapistId) updateData.therapist_id = therapistId

    const { data: result, error } = await supabase
      .from('student_attendance')
      .update(updateData)
      .eq('id', attendanceId)
      .select(`
        *,
        students!inner(name),
        therapists(name)
      `)
      .single()

    if (error) {
      console.error('Error starting session:', error)
      throw new Error(`Failed to start session: ${error.message}`)
    }

    return {
      ...result,
      student_name: result.students?.name,
      therapist_name: result.therapists?.name
    }
  }

  /**
   * Update attendance record
   */
  static async updateAttendance(data: UpdateStudentAttendanceData): Promise<StudentAttendance> {
    const { id, ...updateData } = data

    const { data: result, error } = await supabase
      .from('student_attendance')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        students!inner(name),
        therapists(name)
      `)
      .single()

    if (error) {
      console.error('Error updating attendance:', error)
      throw new Error(`Failed to update attendance: ${error.message}`)
    }

    return {
      ...result,
      student_name: result.students?.name,
      therapist_name: result.therapists?.name
    }
  }

  /**
   * Get attendance statistics for today
   */
  static async getTodaysStats(): Promise<AttendanceStats> {
    const today = new Date().toISOString().split('T')[0]

    // Get today's attendance records
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('*')
      .gte('check_in_time', `${today}T00:00:00.000Z`)
      .lt('check_in_time', `${today}T23:59:59.999Z`)

    if (attendanceError) {
      throw new Error(`Failed to fetch attendance stats: ${attendanceError.message}`)
    }

    // Get active therapists
    const { data: therapistRecords, error: therapistError } = await supabase
      .from('therapist_attendance')
      .select('*')
      .gte('check_in_time', `${today}T00:00:00.000Z`)
      .lt('check_in_time', `${today}T23:59:59.999Z`)
      .in('status', ['checked_in', 'in_session'])

    if (therapistError) {
      console.warn('Failed to fetch therapist attendance:', therapistError.message)
    }

    // Get room utilization
    const { data: roomRecords, error: roomError } = await supabase
      .from('room_utilization')
      .select('*')
      .gte('start_time', `${today}T00:00:00.000Z`)
      .lt('start_time', `${today}T23:59:59.999Z`)
      .eq('status', 'occupied')

    if (roomError) {
      console.warn('Failed to fetch room utilization:', roomError.message)
    }

    // Calculate statistics
    const totalStudents = await this.getTotalEnrolledStudents()
    const presentStudents = attendanceRecords?.filter(r => r.status !== 'absent').length || 0
    const inSession = attendanceRecords?.filter(r => r.status === 'in_session').length || 0
    const checkedOut = attendanceRecords?.filter(r => r.status === 'checked_out').length || 0
    const activeTherapists = therapistRecords?.length || 0
    const occupiedRooms = roomRecords?.length || 0
    
    const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0
    
    const durations = attendanceRecords?.filter(r => r.duration_minutes).map(r => r.duration_minutes!) || []
    const avgSessionDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    
    const lateArrivals = attendanceRecords?.filter(r => r.is_late).length || 0
    const earlyDepartures = attendanceRecords?.filter(r => r.early_departure).length || 0

    return {
      totalStudents,
      presentStudents,
      inSession,
      checkedOut,
      attendanceRate,
      activeTherapists,
      occupiedRooms,
      avgSessionDuration,
      lateArrivals,
      earlyDepartures
    }
  }

  /**
   * Get total enrolled students (for calculating attendance rate)
   */
  private static async getTotalEnrolledStudents(): Promise<number> {
    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) {
      console.warn('Failed to get total enrolled students:', error.message)
      return 50 // Fallback number
    }

    return count || 0
  }
}

// =====================================================
// QR CODE MANAGEMENT OPERATIONS
// =====================================================

export class QRCodeAPI {
  
  /**
   * Generate a QR code and log it
   */
  static async generateQRCode(qrData: {
    qr_type: 'student' | 'session' | 'therapist' | 'room' | 'generic'
    data: Record<string, any>
    student_id?: string
    session_id?: string
    therapist_id?: string
    course_id?: string
    expires_at?: string
    is_single_use?: boolean
    max_scans?: number
    description?: string
    tags?: string[]
  }): Promise<QRCodeLog> {
    
    // Create hash of QR data for uniqueness
    const qrString = JSON.stringify(qrData.data)
    const qrHash = await this.createHash(qrString)

    const { data: result, error } = await supabase
      .from('qr_code_generation_log')
      .insert({
        qr_type: qrData.qr_type,
        qr_data: qrData.data,
        qr_hash: qrHash,
        student_id: qrData.student_id,
        session_id: qrData.session_id,
        therapist_id: qrData.therapist_id,
        course_id: qrData.course_id,
        generated_by: (await supabase.auth.getUser()).data.user?.id,
        expires_at: qrData.expires_at,
        is_single_use: qrData.is_single_use || false,
        max_scans: qrData.max_scans,
        description: qrData.description,
        tags: qrData.tags || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error generating QR code:', error)
      throw new Error(`Failed to generate QR code: ${error.message}`)
    }

    return result
  }

  /**
   * Validate and record QR code scan
   */
  static async validateQRScan(qrHash: string, scanData?: {
    scanned_by?: string
    device_info?: string
    location?: string
  }): Promise<{ valid: boolean; qrRecord?: QRCodeLog; message: string }> {
    
    // Find the QR code record
    const { data: qrRecord, error } = await supabase
      .from('qr_code_generation_log')
      .select('*')
      .eq('qr_hash', qrHash)
      .eq('is_active', true)
      .single()

    if (error || !qrRecord) {
      return { valid: false, message: 'QR code not found or inactive' }
    }

    // Check if expired
    if (qrRecord.expires_at && new Date(qrRecord.expires_at) < new Date()) {
      return { valid: false, qrRecord, message: 'QR code has expired' }
    }

    // Check scan limits
    if (qrRecord.max_scans && qrRecord.scan_count >= qrRecord.max_scans) {
      return { valid: false, qrRecord, message: 'QR code scan limit exceeded' }
    }

    // Update scan count and last scanned info
    const { error: updateError } = await supabase
      .from('qr_code_generation_log')
      .update({
        scan_count: qrRecord.scan_count + 1,
        last_scanned_at: new Date().toISOString(),
        last_scanned_by: scanData?.scanned_by || (await supabase.auth.getUser()).data.user?.id,
        // Deactivate if single use
        is_active: qrRecord.is_single_use ? false : qrRecord.is_active
      })
      .eq('id', qrRecord.id)

    if (updateError) {
      console.error('Error updating QR scan count:', updateError)
    }

    return { valid: true, qrRecord, message: 'QR code is valid' }
  }

  /**
   * Get QR code generation history
   */
  static async getQRHistory(filters?: {
    qr_type?: string
    student_id?: string
    generated_by?: string
    limit?: number
  }): Promise<QRCodeLog[]> {
    let query = supabase
      .from('qr_code_generation_log')
      .select('*')
      .order('generated_at', { ascending: false })

    if (filters?.qr_type) {
      query = query.eq('qr_type', filters.qr_type)
    }
    if (filters?.student_id) {
      query = query.eq('student_id', filters.student_id)
    }
    if (filters?.generated_by) {
      query = query.eq('generated_by', filters.generated_by)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching QR history:', error)
      throw new Error(`Failed to fetch QR history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create SHA-256 hash of string
   */
  private static async createHash(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }
}

// =====================================================
// NOTIFICATION SYSTEM OPERATIONS
// =====================================================

export class NotificationAPI {
  
  /**
   * Create attendance notification
   */
  static async createNotification(data: {
    recipient_type: 'parent' | 'therapist' | 'admin' | 'student'
    recipient_id: string
    notification_type: string
    title: string
    message: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    student_id?: string
    attendance_record_id?: string
    session_id?: string
    send_email?: boolean
    send_sms?: boolean
    send_whatsapp?: boolean
    send_push?: boolean
  }): Promise<AttendanceNotification> {
    
    const { data: result, error } = await supabase
      .from('attendance_notifications')
      .insert({
        recipient_type: data.recipient_type,
        recipient_id: data.recipient_id,
        notification_type: data.notification_type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        student_id: data.student_id,
        attendance_record_id: data.attendance_record_id,
        session_id: data.session_id,
        send_email: data.send_email ?? true,
        send_sms: data.send_sms ?? false,
        send_whatsapp: data.send_whatsapp ?? true,
        send_push: data.send_push ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    return result
  }

  /**
   * Get unread notifications for a recipient
   */
  static async getUnreadNotifications(recipientId: string, recipientType: string): Promise<AttendanceNotification[]> {
    const { data, error } = await supabase
      .from('attendance_notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('recipient_type', recipientType)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    return data || []
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }
}

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

export class RealtimeAttendanceAPI {
  
  /**
   * Subscribe to real-time attendance updates
   */
  static subscribeToAttendanceUpdates(
    callback: (payload: any) => void,
    filters?: {
      studentId?: string
      therapistId?: string
      roomNumber?: string
    }
  ) {
    let channel = supabase
      .channel('attendance_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'student_attendance' 
        }, 
        callback
      )

    if (filters?.studentId) {
      channel = channel.filter('student_id', 'eq', filters.studentId)
    }

    return channel.subscribe()
  }

  /**
   * Subscribe to notification updates
   */
  static subscribeToNotifications(
    recipientId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('notification_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'attendance_notifications',
          filter: `recipient_id=eq.${recipientId}`
        }, 
        callback
      )
      .subscribe()
  }
}

// All APIs are already exported above with 'export class'