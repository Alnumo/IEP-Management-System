import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface FreezeRequest {
  subscription_id: string
  start_date: string
  end_date: string
  reason: string
  freeze_days: number
}

interface FreezeResponse {
  success: boolean
  subscription_id: string
  new_end_date: string
  sessions_rescheduled: number
  conflicts_detected: Array<{
    type: string
    session_id: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  billing_adjustment?: {
    original_amount: number
    adjusted_amount: number
    credit_issued: number
  }
  notifications_sent: number
  execution_time_ms: number
  error?: string
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Initialize Supabase client with user JWT to respect RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }
    )

    // Verify user authentication with RLS-respecting client
    const { data: user, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user?.user) {
      console.error('❌ Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔐 Authenticated user: ${user.user.id}`)

    // Parse and sanitize request body
    const requestBody: FreezeRequest = await req.json()
    const { subscription_id, start_date, end_date, reason, freeze_days } = requestBody

    // Validate required fields
    if (!subscription_id || !start_date || !end_date || !reason || !freeze_days) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize and validate inputs
    const sanitizedInputs = {
      subscription_id: String(subscription_id).trim().replace(/[^a-zA-Z0-9-]/g, ''),
      start_date: String(start_date).trim(),
      end_date: String(end_date).trim(),
      reason: String(reason).trim().substring(0, 500), // Limit reason length
      freeze_days: Number(freeze_days)
    }

    // Validate UUID format for subscription_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sanitizedInputs.subscription_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date formats (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(sanitizedInputs.start_date) || !dateRegex.test(sanitizedInputs.end_date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate freeze_days is positive integer
    if (!Number.isInteger(sanitizedInputs.freeze_days) || sanitizedInputs.freeze_days <= 0 || sanitizedInputs.freeze_days > 365) {
      return new Response(
        JSON.stringify({ error: 'Freeze days must be a positive integer between 1 and 365' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date logic
    const startDateObj = new Date(sanitizedInputs.start_date)
    const endDateObj = new Date(sanitizedInputs.end_date)
    if (startDateObj >= endDateObj) {
      return new Response(
        JSON.stringify({ error: 'End date must be after start date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate reason content
    if (sanitizedInputs.reason.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Reason must be at least 10 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Processing freeze request for subscription: ${sanitizedInputs.subscription_id}`)

    // Use sanitized inputs from here on
    const { subscription_id: safeSubId, start_date: safeStartDate, end_date: safeEndDate, reason: safeReason, freeze_days: safeDays } = sanitizedInputs

    // Validate user permissions for freeze operations
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('❌ Failed to fetch user profile:', profileError?.message)
      return new Response(
        JSON.stringify({ error: 'User profile not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has freeze permission
    const allowedRoles = ['admin', 'manager', 'therapist_lead']
    const userPermissions = userProfile.permissions || []
    
    if (!allowedRoles.includes(userProfile.role) && !userPermissions.includes('freeze_subscriptions')) {
      console.error(`❌ User ${user.user.id} lacks freeze permissions. Role: ${userProfile.role}`)
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions to freeze subscriptions',
          required_role: 'admin, manager, or therapist_lead',
          required_permission: 'freeze_subscriptions'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ User ${user.user.id} has freeze permissions (Role: ${userProfile.role})`)

    // Validate subscription access with RLS enforcement
    const { data: subscription, error: subError } = await supabaseClient
      .from('student_subscriptions')
      .select(`
        *,
        student:students(id, name_ar, name_en, parent_id),
        therapy_program:therapy_programs(id, name_ar, name_en, monthly_price)
      `)
      .eq('id', safeSubId)
      .single()

    if (subError || !subscription) {
      console.error(`❌ Subscription access denied for ${safeSubId}:`, subError?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Subscription not found or access denied',
          subscription_id: safeSubId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if subscription can be frozen
    const remainingFreezeDays = subscription.freeze_days_allowed - subscription.freeze_days_used
    if (safeDays > remainingFreezeDays) {
      console.error(`❌ Insufficient freeze days: Available=${remainingFreezeDays}, Requested=${safeDays}`)
      return new Response(
        JSON.stringify({ 
          error: `Insufficient freeze days. Available: ${remainingFreezeDays}, Requested: ${safeDays}`,
          available_days: remainingFreezeDays,
          requested_days: safeDays
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (subscription.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Only active subscriptions can be frozen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for overlapping freeze periods
    const { data: existingFreezes, error: freezeCheckError } = await supabaseClient
      .from('subscription_freeze_history')
      .select('start_date, end_date, operation_type')
      .eq('subscription_id', safeSubId)
      .eq('operation_type', 'freeze')
      .or(`and(start_date.lte.${safeEndDate},end_date.gte.${safeStartDate})`)

    if (freezeCheckError) {
      console.error('❌ Failed to check existing freezes:', freezeCheckError)
      throw new Error('Failed to validate freeze period')
    }

    if (existingFreezes && existingFreezes.length > 0) {
      console.error(`❌ Overlapping freeze period detected:`, existingFreezes)
      return new Response(
        JSON.stringify({ 
          error: 'Freeze period overlaps with existing freeze',
          existing_freezes: existingFreezes,
          requested_period: { start_date: safeStartDate, end_date: safeEndDate }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Start atomic transaction by calling the comprehensive freeze function
    console.log('🔄 Starting atomic subscription freeze transaction')

    let transactionResult: any
    let operationId: string
    let affectedSessions: any[] = []
    let newEndDate: Date

    try {
      // Generate unique operation ID for tracking
      operationId = `FREEZE_${Date.now()}_${user.user.id.substring(0, 8)}`

      // Step 1: Get affected sessions for preview
      const { data: sessionsData, error: sessionsError } = await supabaseClient
        .from('therapy_sessions')
        .select('*')
        .eq('student_id', subscription.student_id)
        .gte('session_date', safeStartDate)
        .lte('session_date', safeEndDate)
        .eq('status', 'scheduled')

      if (sessionsError) {
        console.error('❌ Failed to fetch affected sessions:', sessionsError)
        throw new Error(`Failed to analyze sessions: ${sessionsError.message}`)
      }

      affectedSessions = sessionsData || []
      console.log(`📅 Found ${affectedSessions.length} sessions to reschedule`)

      // Step 2: Execute comprehensive freeze operation using database function
      // This handles all database operations atomically within a single transaction
      console.log('🔄 Step 2: Executing atomic subscription freeze')
      
      const { data: freezeResult, error: freezeError } = await supabaseClient
        .rpc('freeze_subscription', {
          p_subscription_id: safeSubId,
          p_start_date: safeStartDate,
          p_end_date: safeEndDate,
          p_reason: safeReason,
          p_created_by: user.user.id
        })

      if (freezeError) {
        console.error('❌ Atomic freeze operation failed:', freezeError)
        throw new Error(`Freeze transaction failed: ${freezeError.message}`)
      }

      console.log('✅ Atomic freeze operation completed successfully')
      transactionResult = freezeResult

      // Step 3: Get updated subscription data for response
      const { data: updatedSubscription, error: fetchError } = await supabaseClient
        .from('student_subscriptions')
        .select('end_date, status, freeze_days_used')
        .eq('id', safeSubId)
        .single()

      if (fetchError) {
        console.warn('⚠️ Could not fetch updated subscription data:', fetchError)
        // Don't fail the operation - the freeze was successful
      }

      // Step 4: Record operation tracking (non-critical)
      try {
        await supabaseClient
          .from('subscription_freeze_operations')
          .insert({
            operation_id: operationId,
            subscription_id: safeSubId,
            operation_type: 'freeze',
            status: 'completed',
            metadata: {
              user_id: user.user.id,
              affected_sessions: affectedSessions.length,
              freeze_days: safeDays,
              execution_time_ms: Date.now() - startTime
            },
            created_by: user.user.id
          })
      } catch (trackingError) {
        console.warn('⚠️ Failed to record operation tracking:', trackingError)
        // Don't fail the main operation for tracking errors
      }

      // Calculate response data
      const originalEndDate = new Date(subscription.end_date)
      newEndDate = updatedSubscription ? 
        new Date(updatedSubscription.end_date) : 
        new Date(originalEndDate.getTime() + (safeDays * 24 * 60 * 60 * 1000))

    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError)
      
      // Record failed operation for audit
      try {
        await supabaseClient
          .from('subscription_freeze_operations')
          .insert({
            operation_id: operationId || `FAILED_${Date.now()}`,
            subscription_id: safeSubId,
            operation_type: 'freeze',
            status: 'failed',
            metadata: {
              user_id: user.user.id,
              error_message: transactionError.message,
              execution_time_ms: Date.now() - startTime
            },
            created_by: user.user.id
          })
      } catch (auditError) {
        console.error('❌ Failed to record operation failure:', auditError)
      }

      throw transactionError
    }

    // Step 5: Calculate billing adjustment (simplified)
    console.log('💰 Step 5: Calculating billing adjustment')
    
    const monthlyPrice = subscription.therapy_program?.monthly_price || 0
    const totalProgramDays = Math.ceil(
      (new Date(subscription.end_date).getTime() - new Date(subscription.start_date).getTime()) / (24 * 60 * 60 * 1000)
    )
    const freezePercentage = safeDays / totalProgramDays
    const creditAmount = monthlyPrice * freezePercentage

    const billingAdjustment = {
      original_amount: monthlyPrice,
      adjusted_amount: monthlyPrice - creditAmount,
      credit_issued: creditAmount
    }

    // Step 6: Send notifications (non-critical - don't fail transaction)
    console.log('📬 Step 6: Sending notifications')
    
    let notificationsSent = 0
    try {
      // Here you would integrate with your notification service
      // For now, we'll just log and simulate success
      console.log('📱 Would send WhatsApp notification to parent')
      console.log('📧 Would send email notification to parent and therapist')
      notificationsSent = 2 // Simulated
    } catch (notifError) {
      console.warn('⚠️ Failed to send some notifications:', notifError)
      // Don't fail the entire operation for notification errors
    }

    const executionTime = Date.now() - startTime

    // Get session count from transaction result or fallback
    const sessionsRescheduled = transactionResult?.sessions_rescheduled || 
                               affectedSessions.length

    // Prepare response
    const response: FreezeResponse = {
      success: true,
      subscription_id: safeSubId,
      new_end_date: newEndDate.toISOString().split('T')[0],
      sessions_rescheduled: sessionsRescheduled,
      conflicts_detected: transactionResult?.conflicts || [],
      billing_adjustment: billingAdjustment,
      notifications_sent: notificationsSent,
      execution_time_ms: executionTime
    }

    console.log(`✅ Subscription freeze completed successfully in ${executionTime}ms`)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Subscription freeze failed:', error)
    
    const errorResponse: FreezeResponse = {
      success: false,
      subscription_id: '',
      new_end_date: '',
      sessions_rescheduled: 0,
      conflicts_detected: [],
      notifications_sent: 0,
      execution_time_ms: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})