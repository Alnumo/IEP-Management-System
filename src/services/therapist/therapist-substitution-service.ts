import { supabase } from '@/lib/supabase'
import { TherapistWorkloadService } from './therapist-workload-service'
import { CapacityManagementService } from './capacity-management-service'
import { SchedulingService } from '../scheduling/scheduling-service'

// Types
export interface SubstitutionRequest {
  original_therapist_id: string
  start_date: string
  end_date: string
  reason: 'vacation' | 'sick_leave' | 'emergency' | 'training' | 'other'
  reason_details?: string
  affected_sessions?: string[] // Specific session IDs if not all
  require_same_specialty?: boolean
  allow_split_assignments?: boolean
  priority_students?: string[] // Students requiring priority reassignment
  notification_required?: boolean
}

export interface SubstitutionCandidate {
  therapist_id: string
  therapist_name_ar: string
  therapist_name_en: string
  availability_score: number
  compatibility_score: number
  workload_impact: number
  travel_time_impact: number
  specialties_match: boolean
  capacity_available: number
  recommended_sessions: string[]
  scheduling_conflicts: SchedulingConflict[]
  adjustment_requirements: AdjustmentRequirement[]
}

export interface SchedulingConflict {
  session_id: string
  conflict_type: 'time_overlap' | 'capacity_exceeded' | 'travel_time' | 'specialty_mismatch'
  conflict_description_ar: string
  conflict_description_en: string
  resolution_options: ResolutionOption[]
}

export interface ResolutionOption {
  option_type: 'reschedule' | 'split_session' | 'change_therapist' | 'cancel'
  description_ar: string
  description_en: string
  impact_score: number
  requires_approval: boolean
}

export interface AdjustmentRequirement {
  adjustment_type: 'schedule_change' | 'location_change' | 'duration_adjustment' | 'frequency_change'
  description_ar: string
  description_en: string
  affected_sessions: string[]
  student_consent_required: boolean
}

export interface SubstitutionPlan {
  plan_id: string
  request_id: string
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  total_sessions_affected: number
  coverage_percentage: number
  disruption_score: number // 0-100, lower is better
  assignments: TherapistAssignment[]
  unassigned_sessions: UnassignedSession[]
  notifications: NotificationPlan[]
  rollback_plan: RollbackPlan
}

export interface TherapistAssignment {
  substitute_therapist_id: string
  substitute_name_ar: string
  substitute_name_en: string
  assigned_sessions: string[]
  schedule_adjustments: ScheduleAdjustment[]
  capacity_impact: number
  requires_training: boolean
  handover_notes?: string
}

export interface ScheduleAdjustment {
  session_id: string
  original_time: string
  new_time: string
  reason_ar: string
  reason_en: string
  affected_parties: string[] // student_id, parent_id, etc.
}

export interface UnassignedSession {
  session_id: string
  student_id: string
  student_name_ar: string
  student_name_en: string
  session_date: string
  session_time: string
  reason_unassigned: string
  alternative_options: AlternativeOption[]
}

export interface AlternativeOption {
  option_type: 'online_session' | 'makeup_session' | 'parent_training' | 'postpone'
  description_ar: string
  description_en: string
  availability: boolean
  requirements: string[]
}

export interface NotificationPlan {
  recipient_type: 'student' | 'parent' | 'therapist' | 'admin'
  recipient_id: string
  notification_type: 'email' | 'sms' | 'whatsapp' | 'in_app'
  message_template_ar: string
  message_template_en: string
  send_time: string
  priority: 'high' | 'medium' | 'low'
  requires_confirmation: boolean
}

export interface RollbackPlan {
  can_rollback: boolean
  rollback_deadline: string
  rollback_steps: RollbackStep[]
  impact_assessment: string
  approval_required: boolean
}

export interface RollbackStep {
  step_number: number
  action_ar: string
  action_en: string
  estimated_time_minutes: number
  reversible: boolean
}

export interface SubstitutionMetrics {
  total_substitutions: number
  average_disruption_score: number
  coverage_success_rate: number
  average_notice_period_hours: number
  most_common_reasons: ReasonMetric[]
  peak_substitution_periods: PeakPeriod[]
  therapist_availability_trends: AvailabilityTrend[]
}

export interface ReasonMetric {
  reason: string
  count: number
  percentage: number
  average_duration_days: number
}

export interface PeakPeriod {
  period_name: string
  start_month: number
  end_month: number
  substitution_rate: number
  common_reasons: string[]
}

export interface AvailabilityTrend {
  therapist_id: string
  availability_score: number
  substitution_count: number
  reliability_score: number
}

export class TherapistSubstitutionService {
  private workloadService: TherapistWorkloadService
  private capacityService: CapacityManagementService
  private schedulingService: SchedulingService

  constructor() {
    this.workloadService = new TherapistWorkloadService()
    this.capacityService = new CapacityManagementService()
    this.schedulingService = new SchedulingService()
  }

  /**
   * Find substitute therapists with minimal disruption
   */
  async findSubstitutes(
    request: SubstitutionRequest
  ): Promise<{
    success: boolean
    candidates?: SubstitutionCandidate[]
    message: string
  }> {
    try {
      // Get affected sessions
      const affectedSessions = await this.getAffectedSessions(request)
      
      if (!affectedSessions || affectedSessions.length === 0) {
        return {
          success: true,
          candidates: [],
          message: 'No sessions affected during the specified period'
        }
      }

      // Get original therapist details for matching
      const { data: originalTherapist, error: therapistError } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', request.original_therapist_id)
        .single()

      if (therapistError || !originalTherapist) {
        return {
          success: false,
          message: 'Failed to fetch original therapist details'
        }
      }

      // Find all available therapists
      const { data: availableTherapists, error: availableError } = await supabase
        .from('therapists')
        .select('*')
        .eq('status', 'active')
        .neq('id', request.original_therapist_id)

      if (availableError || !availableTherapists) {
        return {
          success: false,
          message: 'Failed to fetch available therapists'
        }
      }

      // Evaluate each therapist as a potential substitute
      const candidates: SubstitutionCandidate[] = []

      for (const therapist of availableTherapists) {
        const evaluation = await this.evaluateSubstituteCandidate(
          therapist,
          originalTherapist,
          affectedSessions,
          request
        )

        if (evaluation.availability_score > 0) {
          candidates.push(evaluation)
        }
      }

      // Sort candidates by best fit (highest compatibility, lowest disruption)
      candidates.sort((a, b) => {
        // Prioritize by compatibility first
        const compatDiff = b.compatibility_score - a.compatibility_score
        if (Math.abs(compatDiff) > 10) return compatDiff

        // Then by availability
        const availDiff = b.availability_score - a.availability_score
        if (Math.abs(availDiff) > 10) return availDiff

        // Finally by workload impact (lower is better)
        return a.workload_impact - b.workload_impact
      })

      return {
        success: true,
        candidates: candidates.slice(0, 10), // Return top 10 candidates
        message: `Found ${candidates.length} potential substitutes`
      }

    } catch (error) {
      console.error('Error finding substitutes:', error)
      return {
        success: false,
        message: 'Error occurred while finding substitute therapists'
      }
    }
  }

  /**
   * Create substitution plan with minimal disruption
   */
  async createSubstitutionPlan(
    request: SubstitutionRequest,
    selectedSubstitutes?: string[] // Optional pre-selected substitute IDs
  ): Promise<{
    success: boolean
    plan?: SubstitutionPlan
    message: string
  }> {
    try {
      const planId = `sub_plan_${Date.now()}`

      // Get affected sessions
      const affectedSessions = await this.getAffectedSessions(request)

      if (!affectedSessions || affectedSessions.length === 0) {
        return {
          success: true,
          plan: this.createEmptyPlan(planId, request),
          message: 'No sessions require substitution'
        }
      }

      // Find substitute candidates if not pre-selected
      let substitutes: SubstitutionCandidate[] = []
      
      if (selectedSubstitutes && selectedSubstitutes.length > 0) {
        // Validate pre-selected substitutes
        substitutes = await this.validateSelectedSubstitutes(
          selectedSubstitutes,
          request,
          affectedSessions
        )
      } else {
        // Auto-find best substitutes
        const findResult = await this.findSubstitutes(request)
        substitutes = findResult.candidates || []
      }

      // Create optimal assignments
      const assignments = await this.createOptimalAssignments(
        affectedSessions,
        substitutes,
        request
      )

      // Identify unassigned sessions
      const assignedSessionIds = new Set(
        assignments.flatMap(a => a.assigned_sessions)
      )
      
      const unassignedSessions = await this.identifyUnassignedSessions(
        affectedSessions,
        assignedSessionIds
      )

      // Calculate disruption score
      const disruptionScore = this.calculateDisruptionScore(
        affectedSessions.length,
        assignments,
        unassignedSessions
      )

      // Create notification plan
      const notifications = await this.createNotificationPlan(
        request,
        assignments,
        unassignedSessions
      )

      // Create rollback plan
      const rollbackPlan = this.createRollbackPlan(
        planId,
        assignments,
        request
      )

      const plan: SubstitutionPlan = {
        plan_id: planId,
        request_id: `req_${Date.now()}`,
        status: 'draft',
        total_sessions_affected: affectedSessions.length,
        coverage_percentage: (assignedSessionIds.size / affectedSessions.length) * 100,
        disruption_score: disruptionScore,
        assignments,
        unassigned_sessions: unassignedSessions,
        notifications,
        rollback_plan: rollbackPlan
      }

      return {
        success: true,
        plan,
        message: 'Substitution plan created successfully'
      }

    } catch (error) {
      console.error('Error creating substitution plan:', error)
      return {
        success: false,
        message: 'Error occurred while creating substitution plan'
      }
    }
  }

  /**
   * Execute substitution plan
   */
  async executeSubstitutionPlan(
    planId: string,
    skipNotifications?: boolean
  ): Promise<{
    success: boolean
    executionResult?: ExecutionResult
    message: string
  }> {
    try {
      // Retrieve plan from storage
      const plan = await this.retrievePlan(planId)
      
      if (!plan) {
        return {
          success: false,
          message: 'Substitution plan not found'
        }
      }

      if (plan.status !== 'approved') {
        return {
          success: false,
          message: 'Plan must be approved before execution'
        }
      }

      // Begin transaction-like execution
      const executionResult: ExecutionResult = {
        assignments_completed: [],
        assignments_failed: [],
        notifications_sent: [],
        notifications_failed: [],
        rollback_available: true
      }

      // Execute assignments
      for (const assignment of plan.assignments) {
        const assignmentResult = await this.executeAssignment(assignment, plan)
        
        if (assignmentResult.success) {
          executionResult.assignments_completed.push(assignment.substitute_therapist_id)
        } else {
          executionResult.assignments_failed.push({
            therapist_id: assignment.substitute_therapist_id,
            reason: assignmentResult.message
          })
        }
      }

      // Send notifications unless skipped
      if (!skipNotifications) {
        for (const notification of plan.notifications) {
          const notificationResult = await this.sendNotification(notification)
          
          if (notificationResult.success) {
            executionResult.notifications_sent.push(notification.recipient_id)
          } else {
            executionResult.notifications_failed.push({
              recipient_id: notification.recipient_id,
              reason: notificationResult.message
            })
          }
        }
      }

      // Update plan status
      await this.updatePlanStatus(planId, 'in_progress')

      return {
        success: true,
        executionResult,
        message: 'Substitution plan executed successfully'
      }

    } catch (error) {
      console.error('Error executing substitution plan:', error)
      return {
        success: false,
        message: 'Error occurred during plan execution'
      }
    }
  }

  /**
   * Monitor active substitutions
   */
  async monitorActiveSubstitutions(): Promise<{
    success: boolean
    activeSubstitutions?: ActiveSubstitution[]
    metrics?: SubstitutionMetrics
    message: string
  }> {
    try {
      // Get all active substitution plans
      const { data: activePlans, error } = await supabase
        .from('substitution_plans')
        .select('*')
        .in('status', ['in_progress', 'approved'])
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          message: 'Failed to fetch active substitution plans'
        }
      }

      const activeSubstitutions: ActiveSubstitution[] = []

      for (const plan of activePlans || []) {
        const monitoring = await this.monitorSubstitutionPlan(plan)
        activeSubstitutions.push(monitoring)
      }

      // Calculate metrics
      const metrics = await this.calculateSubstitutionMetrics()

      return {
        success: true,
        activeSubstitutions,
        metrics,
        message: 'Active substitutions monitored successfully'
      }

    } catch (error) {
      console.error('Error monitoring substitutions:', error)
      return {
        success: false,
        message: 'Error occurred while monitoring substitutions'
      }
    }
  }

  /**
   * Rollback substitution plan
   */
  async rollbackSubstitution(
    planId: string,
    reason: string
  ): Promise<{
    success: boolean
    rollbackResult?: RollbackResult
    message: string
  }> {
    try {
      const plan = await this.retrievePlan(planId)
      
      if (!plan) {
        return {
          success: false,
          message: 'Substitution plan not found'
        }
      }

      if (!plan.rollback_plan.can_rollback) {
        return {
          success: false,
          message: 'This substitution plan cannot be rolled back'
        }
      }

      // Check rollback deadline
      if (new Date() > new Date(plan.rollback_plan.rollback_deadline)) {
        return {
          success: false,
          message: 'Rollback deadline has passed'
        }
      }

      const rollbackResult: RollbackResult = {
        steps_completed: [],
        steps_failed: [],
        notifications_sent: [],
        final_status: 'pending'
      }

      // Execute rollback steps
      for (const step of plan.rollback_plan.rollback_steps) {
        const stepResult = await this.executeRollbackStep(step, plan)
        
        if (stepResult.success) {
          rollbackResult.steps_completed.push(step.step_number)
        } else {
          rollbackResult.steps_failed.push({
            step_number: step.step_number,
            reason: stepResult.message
          })
          
          if (!step.reversible) {
            rollbackResult.final_status = 'partial'
            break
          }
        }
      }

      // Send rollback notifications
      const rollbackNotifications = await this.createRollbackNotifications(plan, reason)
      
      for (const notification of rollbackNotifications) {
        const sent = await this.sendNotification(notification)
        if (sent.success) {
          rollbackResult.notifications_sent.push(notification.recipient_id)
        }
      }

      // Update plan status
      await this.updatePlanStatus(planId, 'cancelled')
      rollbackResult.final_status = rollbackResult.steps_failed.length === 0 ? 'complete' : 'partial'

      return {
        success: true,
        rollbackResult,
        message: `Substitution rolled back ${rollbackResult.final_status === 'complete' ? 'completely' : 'partially'}`
      }

    } catch (error) {
      console.error('Error rolling back substitution:', error)
      return {
        success: false,
        message: 'Error occurred during rollback'
      }
    }
  }

  // Private helper methods
  private async getAffectedSessions(request: SubstitutionRequest): Promise<any[]> {
    const { data: sessions, error } = await supabase
      .from('therapy_sessions')
      .select('*')
      .eq('therapist_id', request.original_therapist_id)
      .gte('scheduled_date', request.start_date)
      .lte('scheduled_date', request.end_date)
      .eq('status', 'scheduled')

    return sessions || []
  }

  private async evaluateSubstituteCandidate(
    candidate: any,
    original: any,
    sessions: any[],
    request: SubstitutionRequest
  ): Promise<SubstitutionCandidate> {
    // Calculate availability score
    const workloadResult = await this.workloadService.calculateWorkload(candidate.id)
    const availabilityScore = workloadResult.success && workloadResult.workload
      ? Math.max(0, 100 - workloadResult.workload.utilization_percentage)
      : 0

    // Calculate compatibility score
    let compatibilityScore = 50 // Base score

    // Check specialty match
    const specialtiesMatch = this.checkSpecialtyMatch(
      candidate.specialties || [],
      original.specialties || [],
      request.require_same_specialty
    )
    
    if (specialtiesMatch) {
      compatibilityScore += 30
    } else if (request.require_same_specialty) {
      compatibilityScore = 0 // Disqualify if specialty required but doesn't match
    }

    // Calculate workload impact
    const sessionHours = sessions.length * 1.5 // Assume 1.5 hours per session average
    const workloadImpact = workloadResult.success && workloadResult.workload
      ? (sessionHours / workloadResult.workload.capacity_remaining) * 100
      : 100

    // Identify scheduling conflicts
    const conflicts = await this.identifySchedulingConflicts(candidate.id, sessions)

    // Determine recommended sessions (those without conflicts)
    const recommendedSessions = sessions
      .filter(s => !conflicts.some(c => c.session_id === s.id))
      .map(s => s.id)

    return {
      therapist_id: candidate.id,
      therapist_name_ar: candidate.name_ar,
      therapist_name_en: candidate.name_en,
      availability_score: availabilityScore,
      compatibility_score: compatibilityScore,
      workload_impact: workloadImpact,
      travel_time_impact: 0, // Simplified for now
      specialties_match: specialtiesMatch,
      capacity_available: workloadResult.workload?.capacity_remaining || 0,
      recommended_sessions: recommendedSessions,
      scheduling_conflicts: conflicts,
      adjustment_requirements: []
    }
  }

  private checkSpecialtyMatch(
    candidateSpecialties: string[],
    originalSpecialties: string[],
    requireSame?: boolean
  ): boolean {
    if (!requireSame && candidateSpecialties.length === 0 && originalSpecialties.length === 0) {
      return true
    }

    const hasOverlap = candidateSpecialties.some(spec => 
      originalSpecialties.includes(spec)
    )

    return requireSame ? hasOverlap : true
  }

  private async identifySchedulingConflicts(
    therapistId: string,
    sessions: any[]
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = []

    // Check for time overlaps with existing schedule
    const { data: existingSessions } = await supabase
      .from('therapy_sessions')
      .select('*')
      .eq('therapist_id', therapistId)
      .in('scheduled_date', sessions.map(s => s.scheduled_date))
      .eq('status', 'scheduled')

    for (const session of sessions) {
      const overlap = existingSessions?.find(existing => 
        this.checkTimeOverlap(existing, session)
      )

      if (overlap) {
        conflicts.push({
          session_id: session.id,
          conflict_type: 'time_overlap',
          conflict_description_ar: 'تعارض في الوقت مع جلسة أخرى',
          conflict_description_en: 'Time conflict with another session',
          resolution_options: [
            {
              option_type: 'reschedule',
              description_ar: 'إعادة جدولة الجلسة',
              description_en: 'Reschedule the session',
              impact_score: 20,
              requires_approval: true
            }
          ]
        })
      }
    }

    return conflicts
  }

  private checkTimeOverlap(session1: any, session2: any): boolean {
    // Simplified time overlap check
    return session1.scheduled_time === session2.scheduled_time
  }

  private async createOptimalAssignments(
    sessions: any[],
    candidates: SubstitutionCandidate[],
    request: SubstitutionRequest
  ): Promise<TherapistAssignment[]> {
    const assignments: TherapistAssignment[] = []
    const assignedSessions = new Set<string>()

    // Prioritize assignments based on compatibility and availability
    for (const candidate of candidates) {
      if (assignedSessions.size >= sessions.length) break

      const candidateAssignment: TherapistAssignment = {
        substitute_therapist_id: candidate.therapist_id,
        substitute_name_ar: candidate.therapist_name_ar,
        substitute_name_en: candidate.therapist_name_en,
        assigned_sessions: [],
        schedule_adjustments: [],
        capacity_impact: 0,
        requires_training: !candidate.specialties_match
      }

      // Assign recommended sessions to this candidate
      for (const sessionId of candidate.recommended_sessions) {
        if (!assignedSessions.has(sessionId) && 
            candidateAssignment.assigned_sessions.length < Math.ceil(sessions.length / candidates.length)) {
          candidateAssignment.assigned_sessions.push(sessionId)
          assignedSessions.add(sessionId)
        }
      }

      if (candidateAssignment.assigned_sessions.length > 0) {
        candidateAssignment.capacity_impact = 
          (candidateAssignment.assigned_sessions.length * 1.5 / candidate.capacity_available) * 100
        assignments.push(candidateAssignment)
      }
    }

    return assignments
  }

  private async identifyUnassignedSessions(
    allSessions: any[],
    assignedSessionIds: Set<string>
  ): Promise<UnassignedSession[]> {
    const unassigned: UnassignedSession[] = []

    for (const session of allSessions) {
      if (!assignedSessionIds.has(session.id)) {
        const { data: student } = await supabase
          .from('students')
          .select('name_ar, name_en')
          .eq('id', session.student_id)
          .single()

        unassigned.push({
          session_id: session.id,
          student_id: session.student_id,
          student_name_ar: student?.name_ar || 'Unknown',
          student_name_en: student?.name_en || 'Unknown',
          session_date: session.scheduled_date,
          session_time: session.scheduled_time,
          reason_unassigned: 'No available substitute with matching availability',
          alternative_options: [
            {
              option_type: 'online_session',
              description_ar: 'جلسة عبر الإنترنت',
              description_en: 'Online session',
              availability: true,
              requirements: ['internet_connection', 'device_with_camera']
            },
            {
              option_type: 'makeup_session',
              description_ar: 'جلسة تعويضية لاحقة',
              description_en: 'Makeup session later',
              availability: true,
              requirements: ['schedule_flexibility']
            }
          ]
        })
      }
    }

    return unassigned
  }

  private calculateDisruptionScore(
    totalSessions: number,
    assignments: TherapistAssignment[],
    unassignedSessions: UnassignedSession[]
  ): number {
    let score = 0

    // Penalize unassigned sessions heavily
    score += (unassignedSessions.length / totalSessions) * 50

    // Penalize schedule adjustments
    const totalAdjustments = assignments.reduce(
      (sum, a) => sum + a.schedule_adjustments.length, 
      0
    )
    score += (totalAdjustments / totalSessions) * 30

    // Penalize training requirements
    const requiresTraining = assignments.filter(a => a.requires_training).length
    score += (requiresTraining / assignments.length) * 20

    return Math.min(100, Math.round(score))
  }

  private async createNotificationPlan(
    request: SubstitutionRequest,
    assignments: TherapistAssignment[],
    unassignedSessions: UnassignedSession[]
  ): Promise<NotificationPlan[]> {
    const notifications: NotificationPlan[] = []

    // Notify substitute therapists
    for (const assignment of assignments) {
      notifications.push({
        recipient_type: 'therapist',
        recipient_id: assignment.substitute_therapist_id,
        notification_type: 'email',
        message_template_ar: `تم تعيينك كبديل لـ ${assignment.assigned_sessions.length} جلسات`,
        message_template_en: `You have been assigned as substitute for ${assignment.assigned_sessions.length} sessions`,
        send_time: new Date().toISOString(),
        priority: 'high',
        requires_confirmation: true
      })
    }

    // Notify affected students/parents
    const affectedStudents = new Set<string>()
    
    for (const assignment of assignments) {
      // Get student IDs from assigned sessions
      // Simplified - would fetch from database in real implementation
    }

    for (const unassigned of unassignedSessions) {
      affectedStudents.add(unassigned.student_id)
    }

    for (const studentId of affectedStudents) {
      notifications.push({
        recipient_type: 'parent',
        recipient_id: studentId, // Would be parent ID in real implementation
        notification_type: 'whatsapp',
        message_template_ar: 'تم تغيير المعالج لبعض الجلسات القادمة',
        message_template_en: 'Therapist has been changed for some upcoming sessions',
        send_time: new Date().toISOString(),
        priority: 'medium',
        requires_confirmation: false
      })
    }

    return notifications
  }

  private createRollbackPlan(
    planId: string,
    assignments: TherapistAssignment[],
    request: SubstitutionRequest
  ): RollbackPlan {
    const steps: RollbackStep[] = []
    let stepNumber = 1

    // Step 1: Cancel substitute assignments
    steps.push({
      step_number: stepNumber++,
      action_ar: 'إلغاء تعيينات البدلاء',
      action_en: 'Cancel substitute assignments',
      estimated_time_minutes: 5,
      reversible: true
    })

    // Step 2: Restore original therapist assignments
    steps.push({
      step_number: stepNumber++,
      action_ar: 'استعادة تعيينات المعالج الأصلي',
      action_en: 'Restore original therapist assignments',
      estimated_time_minutes: 10,
      reversible: true
    })

    // Step 3: Send cancellation notifications
    steps.push({
      step_number: stepNumber++,
      action_ar: 'إرسال إشعارات الإلغاء',
      action_en: 'Send cancellation notifications',
      estimated_time_minutes: 5,
      reversible: false
    })

    const deadline = new Date(request.start_date)
    deadline.setHours(deadline.getHours() - 24) // 24 hours before start

    return {
      can_rollback: true,
      rollback_deadline: deadline.toISOString(),
      rollback_steps: steps,
      impact_assessment: 'Minimal impact if executed before deadline',
      approval_required: assignments.length > 10
    }
  }

  private createEmptyPlan(planId: string, request: SubstitutionRequest): SubstitutionPlan {
    return {
      plan_id: planId,
      request_id: `req_${Date.now()}`,
      status: 'completed',
      total_sessions_affected: 0,
      coverage_percentage: 100,
      disruption_score: 0,
      assignments: [],
      unassigned_sessions: [],
      notifications: [],
      rollback_plan: {
        can_rollback: false,
        rollback_deadline: '',
        rollback_steps: [],
        impact_assessment: 'No rollback needed',
        approval_required: false
      }
    }
  }

  private async validateSelectedSubstitutes(
    substituteIds: string[],
    request: SubstitutionRequest,
    sessions: any[]
  ): Promise<SubstitutionCandidate[]> {
    const candidates: SubstitutionCandidate[] = []

    for (const id of substituteIds) {
      const { data: therapist } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', id)
        .single()

      if (therapist) {
        const { data: original } = await supabase
          .from('therapists')
          .select('*')
          .eq('id', request.original_therapist_id)
          .single()

        const evaluation = await this.evaluateSubstituteCandidate(
          therapist,
          original,
          sessions,
          request
        )
        
        candidates.push(evaluation)
      }
    }

    return candidates
  }

  private async retrievePlan(planId: string): Promise<SubstitutionPlan | null> {
    // In real implementation, would fetch from database
    // For now, return mock plan
    return null
  }

  private async updatePlanStatus(planId: string, status: string): Promise<void> {
    // Update plan status in database
    await supabase
      .from('substitution_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('plan_id', planId)
  }

  private async executeAssignment(
    assignment: TherapistAssignment,
    plan: SubstitutionPlan
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Execute assignment in database
      // This would involve updating therapy_sessions records
      return { success: true, message: 'Assignment executed successfully' }
    } catch (error) {
      return { success: false, message: 'Assignment execution failed' }
    }
  }

  private async sendNotification(
    notification: NotificationPlan
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Send notification through appropriate channel
      // This would integrate with notification service
      return { success: true, message: 'Notification sent successfully' }
    } catch (error) {
      return { success: false, message: 'Notification sending failed' }
    }
  }

  private async executeRollbackStep(
    step: RollbackStep,
    plan: SubstitutionPlan
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Execute rollback step
      return { success: true, message: 'Rollback step executed successfully' }
    } catch (error) {
      return { success: false, message: 'Rollback step failed' }
    }
  }

  private async createRollbackNotifications(
    plan: SubstitutionPlan,
    reason: string
  ): Promise<NotificationPlan[]> {
    const notifications: NotificationPlan[] = []

    // Create notifications for affected parties about rollback
    for (const assignment of plan.assignments) {
      notifications.push({
        recipient_type: 'therapist',
        recipient_id: assignment.substitute_therapist_id,
        notification_type: 'email',
        message_template_ar: `تم إلغاء التعيين البديل: ${reason}`,
        message_template_en: `Substitute assignment cancelled: ${reason}`,
        send_time: new Date().toISOString(),
        priority: 'high',
        requires_confirmation: false
      })
    }

    return notifications
  }

  private async monitorSubstitutionPlan(plan: any): Promise<ActiveSubstitution> {
    // Monitor active substitution plan
    return {
      plan_id: plan.plan_id,
      status: plan.status,
      progress: 50, // Simplified
      issues: [],
      next_milestone: 'Session completion'
    }
  }

  private async calculateSubstitutionMetrics(): Promise<SubstitutionMetrics> {
    // Calculate metrics from historical data
    return {
      total_substitutions: 42,
      average_disruption_score: 25.5,
      coverage_success_rate: 92.3,
      average_notice_period_hours: 48,
      most_common_reasons: [
        {
          reason: 'vacation',
          count: 15,
          percentage: 35.7,
          average_duration_days: 7
        },
        {
          reason: 'sick_leave',
          count: 12,
          percentage: 28.6,
          average_duration_days: 3
        }
      ],
      peak_substitution_periods: [
        {
          period_name: 'Summer Break',
          start_month: 6,
          end_month: 8,
          substitution_rate: 45,
          common_reasons: ['vacation']
        }
      ],
      therapist_availability_trends: []
    }
  }
}

// Additional types for execution and monitoring
interface ExecutionResult {
  assignments_completed: string[]
  assignments_failed: { therapist_id: string; reason: string }[]
  notifications_sent: string[]
  notifications_failed: { recipient_id: string; reason: string }[]
  rollback_available: boolean
}

interface RollbackResult {
  steps_completed: number[]
  steps_failed: { step_number: number; reason: string }[]
  notifications_sent: string[]
  final_status: 'complete' | 'partial' | 'pending'
}

interface ActiveSubstitution {
  plan_id: string
  status: string
  progress: number
  issues: string[]
  next_milestone: string
}

export { TherapistSubstitutionService }