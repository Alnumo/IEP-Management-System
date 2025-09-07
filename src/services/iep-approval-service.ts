/**
 * IEP Approval Service
 * خدمة موافقة البرنامج التعليمي الفردي
 * 
 * @description Service for managing IEP approval workflows, digital signatures, and audit trails
 * خدمة إدارة تدفقات موافقة البرامج التعليمية الفردية والتوقيعات الرقمية ومسارات المراجعة
 */

import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export type ApprovalStatus = 
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'requires_changes'
  | 'expired'
  | 'withdrawn'

export type ApprovalType = 
  | 'initial_iep'
  | 'annual_review'
  | 'interim_review'
  | 'goal_modification'
  | 'service_change'
  | 'placement_change'
  | 'evaluation_consent'
  | 'meeting_minutes'

export type SignatureType = 
  | 'electronic'
  | 'digital'
  | 'wet_signature'
  | 'voice_confirmation'

export type ApprovalRole = 
  | 'coordinator'
  | 'special_education_teacher'
  | 'administrator'
  | 'parent_guardian'
  | 'student'
  | 'related_service_provider'
  | 'general_education_teacher'
  | 'evaluator'

export interface ApprovalRequest {
  id: string
  iep_id: string
  document_id?: string
  
  // Request Details
  approval_type: ApprovalType
  title_ar: string
  title_en: string
  description_ar?: string
  description_en?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Approval Configuration
  required_approvers: ApprovalRole[]
  optional_approvers: ApprovalRole[]
  approval_threshold: number
  allow_sequential_approval: boolean
  allow_parallel_approval: boolean
  
  // Status and Timeline
  request_status: ApprovalStatus
  requested_date: string
  due_date?: string
  completed_date?: string
  
  // Content and Changes
  content_summary_ar?: string
  content_summary_en?: string
  changes_made: Array<{
    section: string
    change_type: 'added' | 'modified' | 'removed'
    description_ar: string
    description_en: string
    timestamp: string
    made_by: string
  }>
  
  // Workflow Configuration
  workflow_steps: Array<{
    step_number: number
    step_name_ar: string
    step_name_en: string
    required_roles: ApprovalRole[]
    is_parallel: boolean
    estimated_days: number
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  }>
  
  // Metadata
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApprovalAction {
  id: string
  approval_request_id: string
  
  // Approver Details
  approver_id: string
  approver_role: ApprovalRole
  approver_name_ar: string
  approver_name_en: string
  
  // Action Details
  action_type: 'approved' | 'rejected' | 'request_changes' | 'delegated' | 'comment_added'
  action_status: 'completed' | 'pending' | 'expired'
  
  // Decision Information
  decision_reason_ar?: string
  decision_reason_en?: string
  suggested_changes_ar?: string
  suggested_changes_en?: string
  conditions_ar?: string
  conditions_en?: string
  
  // Signature Information
  signature_type: SignatureType
  signature_data?: string
  signature_timestamp?: string
  signature_ip_address?: string
  signature_device_info?: string
  
  // Delegation (if applicable)
  delegated_to?: string
  delegation_reason_ar?: string
  delegation_reason_en?: string
  delegation_expires_at?: string
  
  // Timing
  responded_date?: string
  expires_at?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface DigitalSignature {
  id: string
  approval_action_id: string
  
  // Signature Details
  signature_method: SignatureType
  signature_image?: string
  signature_hash: string
  certificate_data?: string
  
  // Signer Information
  signer_id: string
  signer_name: string
  signer_email: string
  signer_role: ApprovalRole
  
  // Verification Data
  verification_status: 'verified' | 'unverified' | 'failed' | 'expired'
  verification_timestamp?: string
  verification_method?: string
  
  // Security Information
  signing_timestamp: string
  signing_ip_address: string
  signing_device: string
  signing_location?: string
  
  // Legal Information
  consent_statement_ar: string
  consent_statement_en: string
  legal_disclaimer_ar?: string
  legal_disclaimer_en?: string
  
  // Audit Trail
  created_at: string
  updated_at: string
}

export interface CreateApprovalRequestData {
  iep_id: string
  document_id?: string
  approval_type: ApprovalType
  title_ar: string
  title_en: string
  description_ar?: string
  description_en?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  required_approvers: ApprovalRole[]
  optional_approvers?: ApprovalRole[]
  due_date?: string
  workflow_steps?: Array<{
    step_name_ar: string
    step_name_en: string
    required_roles: ApprovalRole[]
    is_parallel?: boolean
    estimated_days?: number
  }>
}

export interface ApprovalActionData {
  action_type: 'approved' | 'rejected' | 'request_changes' | 'delegated'
  decision_reason_ar?: string
  decision_reason_en?: string
  suggested_changes_ar?: string
  suggested_changes_en?: string
  signature_type: SignatureType
  signature_data?: string
  delegated_to?: string
  delegation_reason_ar?: string
  delegation_reason_en?: string
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class IEPApprovalService {
  
  // =============================================================================
  // APPROVAL REQUEST MANAGEMENT
  // =============================================================================

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    data: CreateApprovalRequestData,
    currentUserId: string
  ): Promise<{ success: boolean; data?: ApprovalRequest; error?: string }> {
    try {
      const now = new Date().toISOString()
      
      const requestData = {
        iep_id: data.iep_id,
        document_id: data.document_id,
        approval_type: data.approval_type,
        title_ar: data.title_ar,
        title_en: data.title_en,
        description_ar: data.description_ar,
        description_en: data.description_en,
        priority: data.priority,
        required_approvers: data.required_approvers,
        optional_approvers: data.optional_approvers || [],
        approval_threshold: 100, // Default: all required approvers must approve
        allow_sequential_approval: true,
        allow_parallel_approval: true,
        request_status: 'pending_review' as ApprovalStatus,
        requested_date: now,
        due_date: data.due_date,
        content_summary_ar: '',
        content_summary_en: '',
        changes_made: [],
        workflow_steps: data.workflow_steps?.map((step, index) => ({
          step_number: index + 1,
          step_name_ar: step.step_name_ar,
          step_name_en: step.step_name_en,
          required_roles: step.required_roles,
          is_parallel: step.is_parallel || false,
          estimated_days: step.estimated_days || 2,
          status: index === 0 ? 'in_progress' as const : 'pending' as const
        })) || [],
        created_by: currentUserId,
        created_at: now,
        updated_at: now
      }

      const { data: result, error } = await supabase
        .from('iep_approval_requests')
        .insert(requestData)
        .select()
        .single()

      if (error) {
        console.error('Error creating approval request:', error)
        return { success: false, error: error.message }
      }

      // Create audit trail entry
      await this.createAuditTrailEntry({
        approval_request_id: result.id,
        action_type: 'created',
        user_id: currentUserId,
        description_ar: 'تم إنشاء طلب موافقة جديد',
        description_en: 'New approval request created'
      })

      return { success: true, data: result }
    } catch (error) {
      console.error('Error in createApprovalRequest:', error)
      return { success: false, error: 'Failed to create approval request' }
    }
  }

  /**
   * Get approval requests for a specific IEP
   */
  async getApprovalRequests(
    iepId: string,
    options?: {
      status?: ApprovalStatus
      type?: ApprovalType
      includeCompleted?: boolean
    }
  ): Promise<{ success: boolean; data?: ApprovalRequest[]; error?: string }> {
    try {
      let query = supabase
        .from('iep_approval_requests')
        .select('*')
        .eq('iep_id', iepId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (options?.status) {
        query = query.eq('request_status', options.status)
      }

      if (options?.type) {
        query = query.eq('approval_type', options.type)
      }

      if (!options?.includeCompleted) {
        query = query.not('request_status', 'in', '(approved,rejected,expired,withdrawn)')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching approval requests:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getApprovalRequests:', error)
      return { success: false, error: 'Failed to fetch approval requests' }
    }
  }

  /**
   * Get approval requests requiring action from a specific user
   */
  async getUserPendingApprovals(
    userId: string,
    userRole: ApprovalRole
  ): Promise<{ success: boolean; data?: ApprovalRequest[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('iep_approval_requests')
        .select(`
          *,
          iep_approval_actions!inner(*)
        `)
        .contains('required_approvers', [userRole])
        .in('request_status', ['pending_review', 'under_review'])
        .not('iep_approval_actions.approver_id', 'eq', userId)

      if (error) {
        console.error('Error fetching user pending approvals:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getUserPendingApprovals:', error)
      return { success: false, error: 'Failed to fetch pending approvals' }
    }
  }

  // =============================================================================
  // APPROVAL ACTIONS
  // =============================================================================

  /**
   * Submit approval action with digital signature
   */
  async submitApprovalAction(
    requestId: string,
    actionData: ApprovalActionData,
    currentUserId: string,
    userRole: ApprovalRole,
    userProfile: { name_ar: string; name_en: string; email: string }
  ): Promise<{ success: boolean; data?: ApprovalAction; error?: string }> {
    try {
      const now = new Date().toISOString()
      
      // Get user's IP address and device info (in a real app, this would come from request headers)
      const ipAddress = await this.getUserIPAddress()
      const deviceInfo = this.getUserDeviceInfo()

      const actionRecord = {
        approval_request_id: requestId,
        approver_id: currentUserId,
        approver_role: userRole,
        approver_name_ar: userProfile.name_ar,
        approver_name_en: userProfile.name_en,
        action_type: actionData.action_type,
        action_status: 'completed' as const,
        decision_reason_ar: actionData.decision_reason_ar,
        decision_reason_en: actionData.decision_reason_en,
        suggested_changes_ar: actionData.suggested_changes_ar,
        suggested_changes_en: actionData.suggested_changes_en,
        signature_type: actionData.signature_type,
        signature_data: actionData.signature_data,
        signature_timestamp: now,
        signature_ip_address: ipAddress,
        signature_device_info: deviceInfo,
        delegated_to: actionData.delegated_to,
        delegation_reason_ar: actionData.delegation_reason_ar,
        delegation_reason_en: actionData.delegation_reason_en,
        responded_date: now,
        created_at: now,
        updated_at: now
      }

      const { data: result, error } = await supabase
        .from('iep_approval_actions')
        .insert(actionRecord)
        .select()
        .single()

      if (error) {
        console.error('Error submitting approval action:', error)
        return { success: false, error: error.message }
      }

      // Create digital signature record if signature provided
      if (actionData.signature_data) {
        await this.createDigitalSignature({
          approval_action_id: result.id,
          signature_method: actionData.signature_type,
          signature_data: actionData.signature_data,
          signer_id: currentUserId,
          signer_name: userProfile.name_en,
          signer_email: userProfile.email,
          signer_role: userRole,
          signing_timestamp: now,
          signing_ip_address: ipAddress,
          signing_device: deviceInfo
        })
      }

      // Update approval request status if needed
      await this.updateApprovalRequestStatus(requestId)

      // Create audit trail entry
      await this.createAuditTrailEntry({
        approval_request_id: requestId,
        action_type: actionData.action_type,
        user_id: currentUserId,
        description_ar: actionData.action_type === 'approved' ? 'تمت الموافقة على الطلب' :
                       actionData.action_type === 'rejected' ? 'تم رفض الطلب' :
                       'تم طلب تعديلات',
        description_en: actionData.action_type === 'approved' ? 'Request approved' :
                       actionData.action_type === 'rejected' ? 'Request rejected' :
                       'Changes requested'
      })

      return { success: true, data: result }
    } catch (error) {
      console.error('Error in submitApprovalAction:', error)
      return { success: false, error: 'Failed to submit approval action' }
    }
  }

  /**
   * Get approval actions for a request
   */
  async getApprovalActions(
    requestId: string
  ): Promise<{ success: boolean; data?: ApprovalAction[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('iep_approval_actions')
        .select('*')
        .eq('approval_request_id', requestId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching approval actions:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getApprovalActions:', error)
      return { success: false, error: 'Failed to fetch approval actions' }
    }
  }

  // =============================================================================
  // DIGITAL SIGNATURE MANAGEMENT
  // =============================================================================

  /**
   * Create digital signature record
   */
  async createDigitalSignature(data: {
    approval_action_id: string
    signature_method: SignatureType
    signature_data?: string
    signer_id: string
    signer_name: string
    signer_email: string
    signer_role: ApprovalRole
    signing_timestamp: string
    signing_ip_address: string
    signing_device: string
  }): Promise<{ success: boolean; data?: DigitalSignature; error?: string }> {
    try {
      const signatureHash = await this.generateSignatureHash(
        data.signature_data || '',
        data.signer_id,
        data.signing_timestamp
      )

      const signatureRecord = {
        approval_action_id: data.approval_action_id,
        signature_method: data.signature_method,
        signature_image: data.signature_data,
        signature_hash: signatureHash,
        signer_id: data.signer_id,
        signer_name: data.signer_name,
        signer_email: data.signer_email,
        signer_role: data.signer_role,
        verification_status: 'verified' as const,
        verification_timestamp: data.signing_timestamp,
        verification_method: 'system_validated',
        signing_timestamp: data.signing_timestamp,
        signing_ip_address: data.signing_ip_address,
        signing_device: data.signing_device,
        consent_statement_ar: 'أؤكد بتوقيعي أدناه موافقتي على محتويات هذا المستند وأن جميع المعلومات صحيحة ودقيقة.',
        consent_statement_en: 'I confirm by my signature below that I agree to the contents of this document and that all information is true and accurate.',
        legal_disclaimer_ar: 'هذا التوقيع الإلكتروني له نفس القوة القانونية للتوقيع اليدوي.',
        legal_disclaimer_en: 'This electronic signature has the same legal force as a handwritten signature.',
        created_at: data.signing_timestamp,
        updated_at: data.signing_timestamp
      }

      const { data: result, error } = await supabase
        .from('iep_digital_signatures')
        .insert(signatureRecord)
        .select()
        .single()

      if (error) {
        console.error('Error creating digital signature:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: result }
    } catch (error) {
      console.error('Error in createDigitalSignature:', error)
      return { success: false, error: 'Failed to create digital signature' }
    }
  }

  /**
   * Verify digital signature
   */
  async verifyDigitalSignature(
    signatureId: string
  ): Promise<{ success: boolean; verified: boolean; data?: DigitalSignature; error?: string }> {
    try {
      const { data: signature, error } = await supabase
        .from('iep_digital_signatures')
        .select('*')
        .eq('id', signatureId)
        .single()

      if (error) {
        console.error('Error fetching digital signature:', error)
        return { success: false, verified: false, error: error.message }
      }

      // Verify signature hash
      const expectedHash = await this.generateSignatureHash(
        signature.signature_image || '',
        signature.signer_id,
        signature.signing_timestamp
      )

      const isValid = signature.signature_hash === expectedHash

      if (!isValid) {
        // Update verification status
        await supabase
          .from('iep_digital_signatures')
          .update({ 
            verification_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', signatureId)
      }

      return { 
        success: true, 
        verified: isValid,
        data: signature
      }
    } catch (error) {
      console.error('Error in verifyDigitalSignature:', error)
      return { success: false, verified: false, error: 'Failed to verify signature' }
    }
  }

  // =============================================================================
  // AUDIT TRAIL
  // =============================================================================

  /**
   * Create audit trail entry
   */
  async createAuditTrailEntry(data: {
    approval_request_id: string
    action_type: string
    user_id: string
    description_ar: string
    description_en: string
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      await supabase
        .from('iep_approval_audit_trail')
        .insert({
          approval_request_id: data.approval_request_id,
          action_type: data.action_type,
          user_id: data.user_id,
          description_ar: data.description_ar,
          description_en: data.description_en,
          metadata: data.metadata || {},
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error creating audit trail entry:', error)
      // Don't throw error as this is logging functionality
    }
  }

  /**
   * Get audit trail for an approval request
   */
  async getAuditTrail(
    requestId: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('iep_approval_audit_trail')
        .select(`
          *,
          users!inner(name_ar, name_en, email)
        `)
        .eq('approval_request_id', requestId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error fetching audit trail:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getAuditTrail:', error)
      return { success: false, error: 'Failed to fetch audit trail' }
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Update approval request status based on current actions
   */
  private async updateApprovalRequestStatus(requestId: string): Promise<void> {
    try {
      // Get request and actions
      const [requestResult, actionsResult] = await Promise.all([
        supabase
          .from('iep_approval_requests')
          .select('*')
          .eq('id', requestId)
          .single(),
        supabase
          .from('iep_approval_actions')
          .select('*')
          .eq('approval_request_id', requestId)
      ])

      if (requestResult.error || actionsResult.error) {
        throw new Error('Failed to fetch request or actions')
      }

      const request = requestResult.data
      const actions = actionsResult.data || []

      // Calculate new status
      const approvals = actions.filter(a => a.action_type === 'approved').length
      const rejections = actions.filter(a => a.action_type === 'rejected').length
      const requiredApprovals = request.required_approvers.length

      let newStatus: ApprovalStatus = request.request_status

      if (rejections > 0) {
        newStatus = 'rejected'
      } else if (approvals >= requiredApprovals) {
        newStatus = 'approved'
      } else if (actions.some(a => a.action_type === 'request_changes')) {
        newStatus = 'requires_changes'
      } else if (actions.length > 0) {
        newStatus = 'under_review'
      }

      // Update if status changed
      if (newStatus !== request.request_status) {
        const updateData: any = { 
          request_status: newStatus,
          updated_at: new Date().toISOString()
        }

        if (newStatus === 'approved' || newStatus === 'rejected') {
          updateData.completed_date = new Date().toISOString()
        }

        await supabase
          .from('iep_approval_requests')
          .update(updateData)
          .eq('id', requestId)
      }
    } catch (error) {
      console.error('Error updating approval request status:', error)
    }
  }

  /**
   * Generate cryptographic hash for signature verification
   */
  private async generateSignatureHash(
    signatureData: string,
    signerId: string,
    timestamp: string
  ): Promise<string> {
    const data = `${signatureData}:${signerId}:${timestamp}`
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get user's IP address (simplified for demo)
   */
  private async getUserIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || '127.0.0.1'
    } catch {
      return '127.0.0.1'
    }
  }

  /**
   * Get user's device information
   */
  private getUserDeviceInfo(): string {
    if (typeof navigator !== 'undefined') {
      return `${navigator.userAgent.split(' ').slice(0, 2).join(' ')}`
    }
    return 'Unknown Device'
  }

  // =============================================================================
  // WORKFLOW MANAGEMENT
  // =============================================================================

  /**
   * Get workflow templates for different approval types
   */
  getWorkflowTemplate(approvalType: ApprovalType): Array<{
    step_name_ar: string
    step_name_en: string
    required_roles: ApprovalRole[]
    is_parallel: boolean
    estimated_days: number
  }> {
    const templates = {
      initial_iep: [
        {
          step_name_ar: 'مراجعة المنسق',
          step_name_en: 'Coordinator Review',
          required_roles: ['coordinator' as ApprovalRole],
          is_parallel: false,
          estimated_days: 2
        },
        {
          step_name_ar: 'موافقة الفريق التعليمي',
          step_name_en: 'Educational Team Approval',
          required_roles: ['special_education_teacher' as ApprovalRole, 'administrator' as ApprovalRole],
          is_parallel: true,
          estimated_days: 3
        },
        {
          step_name_ar: 'موافقة ولي الأمر',
          step_name_en: 'Parent Approval',
          required_roles: ['parent_guardian' as ApprovalRole],
          is_parallel: false,
          estimated_days: 5
        }
      ],
      annual_review: [
        {
          step_name_ar: 'مراجعة شاملة',
          step_name_en: 'Comprehensive Review',
          required_roles: ['coordinator' as ApprovalRole, 'special_education_teacher' as ApprovalRole],
          is_parallel: false,
          estimated_days: 3
        },
        {
          step_name_ar: 'موافقة إدارية',
          step_name_en: 'Administrative Approval',
          required_roles: ['administrator' as ApprovalRole],
          is_parallel: false,
          estimated_days: 2
        },
        {
          step_name_ar: 'التوقيع النهائي',
          step_name_en: 'Final Signatures',
          required_roles: ['parent_guardian' as ApprovalRole],
          is_parallel: false,
          estimated_days: 5
        }
      ],
      goal_modification: [
        {
          step_name_ar: 'مراجعة التعديل',
          step_name_en: 'Modification Review',
          required_roles: ['coordinator' as ApprovalRole],
          is_parallel: false,
          estimated_days: 1
        },
        {
          step_name_ar: 'موافقة متوازية',
          step_name_en: 'Parallel Approval',
          required_roles: ['parent_guardian' as ApprovalRole, 'special_education_teacher' as ApprovalRole],
          is_parallel: true,
          estimated_days: 3
        }
      ]
    }

    return templates[approvalType] || templates.goal_modification
  }

  /**
   * Check if user can approve a specific request
   */
  async canUserApprove(
    requestId: string,
    userId: string,
    userRole: ApprovalRole
  ): Promise<{ canApprove: boolean; hasApproved: boolean; reason?: string }> {
    try {
      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('iep_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError) {
        return { canApprove: false, hasApproved: false, reason: 'Request not found' }
      }

      // Check if user role is in required or optional approvers
      const canApprove = request.required_approvers.includes(userRole) || 
                        request.optional_approvers.includes(userRole)

      if (!canApprove) {
        return { canApprove: false, hasApproved: false, reason: 'Role not authorized' }
      }

      // Check if user has already approved
      const { data: existingAction } = await supabase
        .from('iep_approval_actions')
        .select('*')
        .eq('approval_request_id', requestId)
        .eq('approver_id', userId)
        .eq('action_type', 'approved')
        .single()

      const hasApproved = !!existingAction

      return { canApprove: true, hasApproved, reason: hasApproved ? 'Already approved' : undefined }
    } catch (error) {
      console.error('Error checking user approval permissions:', error)
      return { canApprove: false, hasApproved: false, reason: 'Permission check failed' }
    }
  }
}

// Export service instance
export const iepApprovalService = new IEPApprovalService()
export default iepApprovalService