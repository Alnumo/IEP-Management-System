import { supabase } from '../lib/supabase'

// Types for emergency access system
export interface EmergencyAccessRequest {
  id: string
  requester_id: string
  patient_id: string
  reason: string
  emergency_type: 'LIFE_THREATENING' | 'URGENT_CARE' | 'MEDICATION_CRITICAL' | 'BEHAVIORAL_CRISIS' | 'OTHER'
  access_level: 'READ_ONLY' | 'LIMITED_EDIT' | 'FULL_ACCESS'
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'USED'
  approved_by: string | null
  approved_at: string | null
  expires_at: string
  accessed_at: string | null
  justification: string
  emergency_contact_verified: boolean
  supervisor_notified: boolean
  created_at: string
  updated_at: string
}

export interface EmergencyAccessSession {
  id: string
  request_id: string
  user_id: string
  patient_id: string
  session_token: string
  access_level: string
  started_at: string
  expires_at: string
  last_activity_at: string
  is_active: boolean
  actions_taken: Record<string, any>[]
  session_notes: string
  terminated_reason: string | null
  created_at: string
}

export interface EmergencyContact {
  id: string
  patient_id: string
  name: string
  relationship: string
  phone: string
  email: string | null
  is_primary: boolean
  can_authorize_emergency: boolean
  verification_code: string | null
  verified_at: string | null
  created_at: string
}

export interface EmergencyNotification {
  id: string
  request_id: string
  notification_type: 'REQUEST_CREATED' | 'REQUEST_APPROVED' | 'REQUEST_DENIED' | 'ACCESS_USED' | 'SESSION_EXPIRED'
  recipient_type: 'SUPERVISOR' | 'EMERGENCY_CONTACT' | 'MEDICAL_TEAM' | 'ADMIN'
  recipient_id: string
  message_content: Record<string, any>
  delivery_method: 'EMAIL' | 'SMS' | 'IN_APP' | 'WHATSAPP'
  sent_at: string | null
  delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  created_at: string
}

export class EmergencyAccessService {
  // Create emergency access request
  static async createEmergencyRequest(request: Omit<EmergencyAccessRequest, 'id' | 'status' | 'approved_by' | 'approved_at' | 'accessed_at' | 'created_at' | 'updated_at'>): Promise<EmergencyAccessRequest> {
    // Validate request
    const validationErrors = this.validateEmergencyRequest(request)
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0])
    }

    const { data, error } = await supabase
      .rpc('create_emergency_access_request', {
        requester_user_id: request.requester_id,
        patient_user_id: request.patient_id,
        emergency_reason: request.reason,
        emergency_type: request.emergency_type,
        requested_access_level: request.access_level,
        justification_text: request.justification,
        expires_in_hours: 24 // Default 24 hours
      })

    if (error) {
      console.error('Error creating emergency access request:', error)
      throw new Error('Failed to create emergency access request')
    }

    return data
  }

  // Get emergency access requests
  static async getEmergencyRequests(
    filters?: {
      status?: EmergencyAccessRequest['status']
      emergency_type?: EmergencyAccessRequest['emergency_type']
      requester_id?: string
      patient_id?: string
    },
    limit: number = 50
  ): Promise<EmergencyAccessRequest[]> {
    let query = supabase
      .from('emergency_access_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.emergency_type) {
      query = query.eq('emergency_type', filters.emergency_type)
    }
    if (filters?.requester_id) {
      query = query.eq('requester_id', filters.requester_id)
    }
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching emergency requests:', error)
      throw new Error('Failed to fetch emergency access requests')
    }

    return data || []
  }

  // Approve emergency access request
  static async approveEmergencyRequest(
    requestId: string,
    approverId: string,
    conditions?: {
      access_level?: EmergencyAccessRequest['access_level']
      expires_in_hours?: number
      additional_notes?: string
    }
  ): Promise<EmergencyAccessRequest> {
    const { data, error } = await supabase
      .rpc('approve_emergency_access', {
        request_id: requestId,
        approver_id: approverId,
        override_access_level: conditions?.access_level || null,
        override_expiry_hours: conditions?.expires_in_hours || null,
        approval_notes: conditions?.additional_notes || null
      })

    if (error) {
      console.error('Error approving emergency access:', error)
      throw new Error('Failed to approve emergency access request')
    }

    return data
  }

  // Deny emergency access request
  static async denyEmergencyRequest(
    requestId: string,
    deniedBy: string,
    reason: string
  ): Promise<EmergencyAccessRequest> {
    const { data, error } = await supabase
      .from('emergency_access_requests')
      .update({
        status: 'DENIED',
        approved_by: deniedBy,
        approved_at: new Date().toISOString(),
        justification: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error denying emergency access:', error)
      throw new Error('Failed to deny emergency access request')
    }

    // Send notifications
    await this.sendEmergencyNotifications(requestId, 'REQUEST_DENIED')

    return data
  }

  // Start emergency access session
  static async startEmergencySession(requestId: string): Promise<EmergencyAccessSession> {
    const { data, error } = await supabase
      .rpc('start_emergency_session', { request_id: requestId })

    if (error) {
      console.error('Error starting emergency session:', error)
      throw new Error('Failed to start emergency session')
    }

    // Log the session start
    await this.logEmergencyAction(data.id, 'SESSION_STARTED', {
      request_id: requestId,
      session_token: data.session_token
    })

    return data
  }

  // Get active emergency sessions
  static async getActiveSessions(userId?: string): Promise<EmergencyAccessSession[]> {
    let query = supabase
      .from('emergency_access_sessions')
      .select(`
        *,
        emergency_access_requests (
          patient_id,
          emergency_type,
          reason
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching active sessions:', error)
      throw new Error('Failed to fetch active emergency sessions')
    }

    return data || []
  }

  // Terminate emergency session
  static async terminateSession(
    sessionId: string,
    reason: string = 'MANUAL_TERMINATION',
    notes?: string
  ): Promise<void> {
    const { data, error } = await supabase
      .rpc('terminate_emergency_session', {
        session_id: sessionId,
        termination_reason: reason,
        session_notes: notes || ''
      })

    if (error) {
      console.error('Error terminating emergency session:', error)
      throw new Error('Failed to terminate emergency session')
    }

    // Log the session termination
    await this.logEmergencyAction(sessionId, 'SESSION_TERMINATED', {
      reason,
      notes
    })
  }

  // Log emergency action
  static async logEmergencyAction(
    sessionId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('emergency_access_logs')
      .insert({
        session_id: sessionId,
        action_type: action,
        action_details: details,
        timestamp: new Date().toISOString(),
        user_id: (await supabase.auth.getUser()).data.user?.id
      })

    if (error) {
      console.error('Error logging emergency action:', error)
      // Don't throw here as logging shouldn't block the main action
    }
  }

  // Verify emergency contact
  static async verifyEmergencyContact(
    contactId: string,
    verificationCode: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('verify_emergency_contact', {
        contact_id: contactId,
        verification_code: verificationCode
      })

    if (error) {
      console.error('Error verifying emergency contact:', error)
      return false
    }

    return data === true
  }

  // Send emergency notifications
  static async sendEmergencyNotifications(
    requestId: string,
    notificationType: EmergencyNotification['notification_type']
  ): Promise<void> {
    const { error } = await supabase
      .rpc('send_emergency_notifications', {
        request_id: requestId,
        notification_type: notificationType
      })

    if (error) {
      console.error('Error sending emergency notifications:', error)
      // Don't throw as notifications shouldn't block the main process
    }
  }

  // Get emergency access statistics
  static async getEmergencyStatistics(): Promise<{
    total_requests_24h: number
    approved_requests_24h: number
    active_sessions: number
    average_response_time_minutes: number
    requests_by_type: Record<string, number>
  }> {
    const { data, error } = await supabase
      .rpc('get_emergency_access_stats')

    if (error) {
      console.error('Error fetching emergency statistics:', error)
      throw new Error('Failed to fetch emergency access statistics')
    }

    return data
  }

  // Check if user can request emergency access
  static async canRequestEmergencyAccess(
    userId: string,
    patientId: string
  ): Promise<{
    can_request: boolean
    reason?: string
    existing_request_id?: string
  }> {
    const { data, error } = await supabase
      .rpc('check_emergency_access_eligibility', {
        user_id: userId,
        patient_id: patientId
      })

    if (error) {
      console.error('Error checking emergency access eligibility:', error)
      return { can_request: false, reason: 'System error' }
    }

    return data
  }

  // Get emergency contacts for patient
  static async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false })

    if (error) {
      console.error('Error fetching emergency contacts:', error)
      throw new Error('Failed to fetch emergency contacts')
    }

    return data || []
  }

  // Validate emergency request
  static validateEmergencyRequest(request: Partial<EmergencyAccessRequest>): string[] {
    const errors: string[] = []

    if (!request.requester_id) {
      errors.push('Requester ID is required')
    }

    if (!request.patient_id) {
      errors.push('Patient ID is required')
    }

    if (!request.reason || request.reason.length < 10) {
      errors.push('Emergency reason must be at least 10 characters')
    }

    if (!request.emergency_type) {
      errors.push('Emergency type is required')
    }

    if (!request.access_level) {
      errors.push('Access level is required')
    }

    if (!request.justification || request.justification.length < 20) {
      errors.push('Justification must be at least 20 characters')
    }

    const validEmergencyTypes = ['LIFE_THREATENING', 'URGENT_CARE', 'MEDICATION_CRITICAL', 'BEHAVIORAL_CRISIS', 'OTHER']
    if (request.emergency_type && !validEmergencyTypes.includes(request.emergency_type)) {
      errors.push('Invalid emergency type')
    }

    const validAccessLevels = ['READ_ONLY', 'LIMITED_EDIT', 'FULL_ACCESS']
    if (request.access_level && !validAccessLevels.includes(request.access_level)) {
      errors.push('Invalid access level')
    }

    return errors
  }

  // Auto-expire old requests
  static async expireOldRequests(): Promise<number> {
    const { data, error } = await supabase
      .rpc('expire_old_emergency_requests')

    if (error) {
      console.error('Error expiring old requests:', error)
      throw new Error('Failed to expire old requests')
    }

    return data // Returns count of expired requests
  }

  // Get emergency access audit trail
  static async getEmergencyAuditTrail(
    patientId?: string,
    userId?: string,
    limit: number = 100
  ): Promise<any[]> {
    let query = supabase
      .from('emergency_access_logs')
      .select(`
        *,
        emergency_access_sessions (
          request_id,
          patient_id,
          user_id
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (patientId) {
      query = query.eq('emergency_access_sessions.patient_id', patientId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching emergency audit trail:', error)
      throw new Error('Failed to fetch emergency access audit trail')
    }

    return data || []
  }
}

// Export individual functions for easier importing
export const {
  createEmergencyRequest,
  getEmergencyRequests,
  approveEmergencyRequest,
  denyEmergencyRequest,
  startEmergencySession,
  getActiveSessions,
  terminateSession,
  logEmergencyAction,
  verifyEmergencyContact,
  sendEmergencyNotifications,
  getEmergencyStatistics,
  canRequestEmergencyAccess,
  getEmergencyContacts,
  validateEmergencyRequest,
  expireOldRequests,
  getEmergencyAuditTrail
} = EmergencyAccessService

export default EmergencyAccessService