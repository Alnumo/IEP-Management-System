import { supabase } from '@/lib/supabase'
import { TherapistWorkloadService } from './therapist-workload-service'
import { SchedulingService } from '../scheduling/scheduling-service'

// Types
export interface CapacityConstraints {
  max_daily_hours: number
  max_weekly_hours: number
  max_monthly_hours: number
  max_concurrent_students: number
  max_sessions_per_day: number
  required_break_minutes: number
  max_consecutive_hours: number
  specialty_requirements: string[]
  availability_windows: TimeWindow[]
}

export interface TimeWindow {
  day_of_week: number // 0-6, Sunday = 0
  start_time: string // HH:mm format
  end_time: string // HH:mm format
}

export interface AssignmentRequest {
  therapist_id: string
  student_id: string
  program_template_id: string
  sessions_per_week: number
  session_duration_minutes: number
  start_date: string
  end_date: string
  preferred_time_slots: TimeSlot[]
  priority_level: 'high' | 'medium' | 'low'
}

export interface TimeSlot {
  day_of_week: number
  start_time: string
  duration_minutes: number
}

export interface CapacityValidationResult {
  is_valid: boolean
  validation_errors: ValidationError[]
  capacity_impact: CapacityImpact
  recommendations: CapacityRecommendation[]
  alternative_assignments: AlternativeAssignment[]
}

export interface ValidationError {
  error_code: string
  severity: 'critical' | 'warning' | 'info'
  message_ar: string
  message_en: string
  affected_constraint: keyof CapacityConstraints
  current_value: number
  maximum_allowed: number
}

export interface CapacityImpact {
  current_utilization: number
  projected_utilization: number
  capacity_remaining: number
  peak_utilization_days: string[]
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface CapacityRecommendation {
  type: 'schedule_adjustment' | 'workload_redistribution' | 'capacity_expansion' | 'priority_rebalancing'
  priority: number
  description_ar: string
  description_en: string
  implementation_steps: ImplementationStep[]
  expected_impact: number
}

export interface ImplementationStep {
  step_number: number
  action_ar: string
  action_en: string
  estimated_time_minutes: number
  requires_approval: boolean
}

export interface AlternativeAssignment {
  therapist_id: string
  therapist_name_ar: string
  therapist_name_en: string
  compatibility_score: number
  capacity_utilization: number
  schedule_flexibility: number
  recommended_time_slots: TimeSlot[]
  adjustment_requirements: string[]
}

export interface CapacityMonitoringAlert {
  alert_id: string
  therapist_id: string
  alert_type: 'over_assignment' | 'capacity_warning' | 'constraint_violation' | 'schedule_conflict'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message_ar: string
  message_en: string
  triggered_at: string
  requires_immediate_action: boolean
  recommended_actions: string[]
  auto_resolution_available: boolean
}

export interface BulkAssignmentRequest {
  assignments: AssignmentRequest[]
  optimization_strategy: 'minimize_workload_variance' | 'maximize_compatibility' | 'optimize_utilization' | 'balance_all'
  allow_partial_assignments: boolean
  max_processing_time_seconds: number
}

export interface BulkAssignmentResult {
  successful_assignments: string[]
  failed_assignments: FailedAssignment[]
  optimization_summary: OptimizationSummary
  capacity_impact_summary: CapacityImpactSummary
  recommendations: CapacityRecommendation[]
}

export interface FailedAssignment {
  student_id: string
  reason: string
  alternative_options: AlternativeAssignment[]
}

export interface OptimizationSummary {
  total_processed: number
  successful_count: number
  failed_count: number
  optimization_score: number
  workload_variance_reduction: number
  utilization_improvement: number
}

export interface CapacityImpactSummary {
  average_utilization_change: number
  peak_utilization_change: number
  therapists_at_capacity: number
  capacity_warnings_generated: number
  recommended_adjustments: number
}

export class CapacityManagementService {
  private workloadService: TherapistWorkloadService
  private schedulingService: SchedulingService

  constructor() {
    this.workloadService = new TherapistWorkloadService()
    this.schedulingService = new SchedulingService()
  }

  /**
   * Validate assignment against therapist capacity constraints
   */
  async validateAssignment(
    request: AssignmentRequest,
    constraints?: Partial<CapacityConstraints>
  ): Promise<{
    success: boolean
    result?: CapacityValidationResult
    message: string
  }> {
    try {
      // Get therapist constraints
      const therapistConstraints = await this.getTherapistConstraints(
        request.therapist_id,
        constraints
      )

      // Calculate current workload
      const workloadResult = await this.workloadService.calculateWorkload(
        request.therapist_id
      )

      if (!workloadResult.success || !workloadResult.workload) {
        return {
          success: false,
          message: 'Failed to calculate current workload'
        }
      }

      // Perform validation checks
      const validationErrors = await this.performValidationChecks(
        request,
        therapistConstraints,
        workloadResult.workload
      )

      // Calculate capacity impact
      const capacityImpact = await this.calculateCapacityImpact(
        request,
        workloadResult.workload,
        therapistConstraints
      )

      // Generate recommendations
      const recommendations = await this.generateCapacityRecommendations(
        request,
        validationErrors,
        capacityImpact,
        therapistConstraints
      )

      // Find alternative assignments if current assignment fails
      const alternativeAssignments = validationErrors.some(e => e.severity === 'critical')
        ? await this.findAlternativeAssignments(request)
        : []

      const result: CapacityValidationResult = {
        is_valid: !validationErrors.some(e => e.severity === 'critical'),
        validation_errors: validationErrors,
        capacity_impact: capacityImpact,
        recommendations,
        alternative_assignments: alternativeAssignments
      }

      return {
        success: true,
        result,
        message: result.is_valid 
          ? 'Assignment validated successfully' 
          : 'Assignment validation failed - critical constraints violated'
      }

    } catch (error) {
      console.error('Capacity validation error:', error)
      return {
        success: false,
        message: 'Error occurred during capacity validation'
      }
    }
  }

  /**
   * Process bulk assignments with capacity optimization
   */
  async processBulkAssignments(
    request: BulkAssignmentRequest
  ): Promise<{
    success: boolean
    result?: BulkAssignmentResult
    message: string
  }> {
    try {
      const startTime = Date.now()
      const timeoutMs = request.max_processing_time_seconds * 1000

      let successfulAssignments: string[] = []
      let failedAssignments: FailedAssignment[] = []

      // Sort assignments by priority
      const sortedAssignments = request.assignments.sort((a, b) => {
        const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 }
        return priorityWeight[b.priority_level] - priorityWeight[a.priority_level]
      })

      // Process assignments with optimization strategy
      for (const assignment of sortedAssignments) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          break
        }

        const validationResult = await this.validateAssignment(assignment)

        if (validationResult.success && validationResult.result?.is_valid) {
          // Assignment is valid, proceed with assignment
          const assignmentSuccess = await this.executeAssignment(assignment)
          
          if (assignmentSuccess) {
            successfulAssignments.push(assignment.student_id)
          } else {
            failedAssignments.push({
              student_id: assignment.student_id,
              reason: 'Assignment execution failed',
              alternative_options: validationResult.result.alternative_assignments
            })
          }
        } else {
          // Assignment failed validation
          const alternatives = validationResult.result?.alternative_assignments || []
          
          if (request.allow_partial_assignments && alternatives.length > 0) {
            // Try alternative assignment
            const bestAlternative = alternatives[0]
            const alternativeAssignment: AssignmentRequest = {
              ...assignment,
              therapist_id: bestAlternative.therapist_id,
              preferred_time_slots: bestAlternative.recommended_time_slots
            }

            const alternativeValidation = await this.validateAssignment(alternativeAssignment)
            
            if (alternativeValidation.success && alternativeValidation.result?.is_valid) {
              const assignmentSuccess = await this.executeAssignment(alternativeAssignment)
              
              if (assignmentSuccess) {
                successfulAssignments.push(assignment.student_id)
              } else {
                failedAssignments.push({
                  student_id: assignment.student_id,
                  reason: 'Alternative assignment execution failed',
                  alternative_options: alternatives.slice(1)
                })
              }
            } else {
              failedAssignments.push({
                student_id: assignment.student_id,
                reason: validationResult.message || 'Capacity validation failed',
                alternative_options: alternatives
              })
            }
          } else {
            failedAssignments.push({
              student_id: assignment.student_id,
              reason: validationResult.message || 'Capacity validation failed',
              alternative_options: alternatives
            })
          }
        }
      }

      // Calculate optimization summary
      const optimizationSummary: OptimizationSummary = {
        total_processed: sortedAssignments.length,
        successful_count: successfulAssignments.length,
        failed_count: failedAssignments.length,
        optimization_score: this.calculateOptimizationScore(request, successfulAssignments),
        workload_variance_reduction: await this.calculateWorkloadVarianceReduction(successfulAssignments),
        utilization_improvement: await this.calculateUtilizationImprovement(successfulAssignments)
      }

      // Calculate capacity impact summary
      const capacityImpactSummary: CapacityImpactSummary = {
        average_utilization_change: await this.calculateAverageUtilizationChange(successfulAssignments),
        peak_utilization_change: await this.calculatePeakUtilizationChange(successfulAssignments),
        therapists_at_capacity: await this.countTherapistsAtCapacity(),
        capacity_warnings_generated: await this.countCapacityWarnings(),
        recommended_adjustments: await this.countRecommendedAdjustments()
      }

      // Generate recommendations for failed assignments
      const recommendations = await this.generateBulkRecommendations(
        failedAssignments,
        request.optimization_strategy
      )

      const result: BulkAssignmentResult = {
        successful_assignments: successfulAssignments,
        failed_assignments: failedAssignments,
        optimization_summary: optimizationSummary,
        capacity_impact_summary: capacityImpactSummary,
        recommendations
      }

      return {
        success: true,
        result,
        message: `Processed ${optimizationSummary.successful_count} of ${optimizationSummary.total_processed} assignments successfully`
      }

    } catch (error) {
      console.error('Bulk assignment processing error:', error)
      return {
        success: false,
        message: 'Error occurred during bulk assignment processing'
      }
    }
  }

  /**
   * Monitor capacity and generate alerts
   */
  async monitorCapacityAlerts(): Promise<{
    success: boolean
    alerts?: CapacityMonitoringAlert[]
    message: string
  }> {
    try {
      const alerts: CapacityMonitoringAlert[] = []

      // Get all active therapists
      const { data: therapists, error } = await supabase
        .from('therapists')
        .select('id, name_ar, name_en')
        .eq('status', 'active')

      if (error || !therapists) {
        return {
          success: false,
          message: 'Failed to fetch therapists for capacity monitoring'
        }
      }

      // Check each therapist's capacity
      for (const therapist of therapists) {
        const workloadResult = await this.workloadService.calculateWorkload(therapist.id)
        
        if (!workloadResult.success || !workloadResult.workload) {
          continue
        }

        const constraints = await this.getTherapistConstraints(therapist.id)
        const therapistAlerts = await this.generateCapacityAlerts(
          therapist,
          workloadResult.workload,
          constraints
        )

        alerts.push(...therapistAlerts)
      }

      // Sort alerts by severity and timestamp
      alerts.sort((a, b) => {
        const severityWeight = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
        const severityDiff = severityWeight[b.severity] - severityWeight[a.severity]
        
        if (severityDiff !== 0) return severityDiff
        
        return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
      })

      return {
        success: true,
        alerts,
        message: `Generated ${alerts.length} capacity monitoring alerts`
      }

    } catch (error) {
      console.error('Capacity monitoring error:', error)
      return {
        success: false,
        message: 'Error occurred during capacity monitoring'
      }
    }
  }

  /**
   * Prevent over-assignment by enforcing constraints
   */
  async preventOverAssignment(
    therapist_id: string,
    new_assignment: AssignmentRequest
  ): Promise<{
    success: boolean
    allowed: boolean
    prevention_reason?: string
    alternatives?: AlternativeAssignment[]
    message: string
  }> {
    try {
      // Validate against constraints
      const validation = await this.validateAssignment(new_assignment)
      
      if (!validation.success) {
        return {
          success: false,
          allowed: false,
          message: 'Failed to validate assignment for over-assignment prevention'
        }
      }

      const result = validation.result!

      // Check for critical constraint violations
      const criticalViolations = result.validation_errors.filter(e => e.severity === 'critical')
      
      if (criticalViolations.length > 0) {
        const preventionReason = criticalViolations.map(v => v.message_en).join('; ')
        
        return {
          success: true,
          allowed: false,
          prevention_reason: preventionReason,
          alternatives: result.alternative_assignments,
          message: 'Assignment prevented due to capacity constraints'
        }
      }

      // Check capacity impact risk level
      if (result.capacity_impact.risk_level === 'critical') {
        return {
          success: true,
          allowed: false,
          prevention_reason: 'Assignment would result in critical capacity risk',
          alternatives: result.alternative_assignments,
          message: 'Assignment prevented due to high capacity risk'
        }
      }

      // Assignment is allowed
      return {
        success: true,
        allowed: true,
        message: 'Assignment allowed - within capacity constraints'
      }

    } catch (error) {
      console.error('Over-assignment prevention error:', error)
      return {
        success: false,
        allowed: false,
        message: 'Error occurred during over-assignment prevention check'
      }
    }
  }

  // Private helper methods
  private async getTherapistConstraints(
    therapist_id: string,
    overrides?: Partial<CapacityConstraints>
  ): Promise<CapacityConstraints> {
    // Get therapist-specific constraints from database
    const { data: constraints } = await supabase
      .from('therapist_capacity_constraints')
      .select('*')
      .eq('therapist_id', therapist_id)
      .single()

    // Default constraints if none found
    const defaultConstraints: CapacityConstraints = {
      max_daily_hours: 8,
      max_weekly_hours: 40,
      max_monthly_hours: 160,
      max_concurrent_students: 25,
      max_sessions_per_day: 8,
      required_break_minutes: 15,
      max_consecutive_hours: 4,
      specialty_requirements: [],
      availability_windows: []
    }

    return {
      ...defaultConstraints,
      ...constraints,
      ...overrides
    }
  }

  private async performValidationChecks(
    request: AssignmentRequest,
    constraints: CapacityConstraints,
    currentWorkload: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    // Check daily hours limit
    const projectedDailyHours = currentWorkload.daily_hours_avg + 
      (request.sessions_per_week * request.session_duration_minutes) / (7 * 60)
    
    if (projectedDailyHours > constraints.max_daily_hours) {
      errors.push({
        error_code: 'DAILY_HOURS_EXCEEDED',
        severity: 'critical',
        message_ar: `تجاوز الحد الأقصى للساعات اليومية`,
        message_en: `Daily hours limit exceeded`,
        affected_constraint: 'max_daily_hours',
        current_value: projectedDailyHours,
        maximum_allowed: constraints.max_daily_hours
      })
    }

    // Check weekly hours limit
    const projectedWeeklyHours = currentWorkload.weekly_hours + 
      (request.sessions_per_week * request.session_duration_minutes) / 60
    
    if (projectedWeeklyHours > constraints.max_weekly_hours) {
      errors.push({
        error_code: 'WEEKLY_HOURS_EXCEEDED',
        severity: 'critical',
        message_ar: `تجاوز الحد الأقصى للساعات الأسبوعية`,
        message_en: `Weekly hours limit exceeded`,
        affected_constraint: 'max_weekly_hours',
        current_value: projectedWeeklyHours,
        maximum_allowed: constraints.max_weekly_hours
      })
    }

    // Check concurrent students limit
    if (currentWorkload.active_students >= constraints.max_concurrent_students) {
      errors.push({
        error_code: 'CONCURRENT_STUDENTS_EXCEEDED',
        severity: 'critical',
        message_ar: `تجاوز الحد الأقصى للطلاب المتزامنين`,
        message_en: `Maximum concurrent students exceeded`,
        affected_constraint: 'max_concurrent_students',
        current_value: currentWorkload.active_students + 1,
        maximum_allowed: constraints.max_concurrent_students
      })
    }

    return errors
  }

  private async calculateCapacityImpact(
    request: AssignmentRequest,
    currentWorkload: any,
    constraints: CapacityConstraints
  ): Promise<CapacityImpact> {
    const currentUtilization = (currentWorkload.weekly_hours / constraints.max_weekly_hours) * 100
    
    const additionalHours = (request.sessions_per_week * request.session_duration_minutes) / 60
    const projectedUtilization = ((currentWorkload.weekly_hours + additionalHours) / constraints.max_weekly_hours) * 100
    
    const capacityRemaining = Math.max(0, constraints.max_weekly_hours - (currentWorkload.weekly_hours + additionalHours))

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (projectedUtilization >= 95) riskLevel = 'critical'
    else if (projectedUtilization >= 85) riskLevel = 'high'
    else if (projectedUtilization >= 75) riskLevel = 'medium'

    return {
      current_utilization: currentUtilization,
      projected_utilization: projectedUtilization,
      capacity_remaining: capacityRemaining,
      peak_utilization_days: [], // Calculate based on schedule analysis
      risk_level: riskLevel
    }
  }

  private async generateCapacityRecommendations(
    request: AssignmentRequest,
    errors: ValidationError[],
    impact: CapacityImpact,
    constraints: CapacityConstraints
  ): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = []

    if (impact.projected_utilization > 85) {
      recommendations.push({
        type: 'workload_redistribution',
        priority: 1,
        description_ar: 'إعادة توزيع عبء العمل على معالجين آخرين',
        description_en: 'Redistribute workload to other therapists',
        implementation_steps: [
          {
            step_number: 1,
            action_ar: 'تحديد المعالجين ذوي الطاقة الاستيعابية المتاحة',
            action_en: 'Identify therapists with available capacity',
            estimated_time_minutes: 15,
            requires_approval: false
          }
        ],
        expected_impact: 20
      })
    }

    return recommendations
  }

  private async findAlternativeAssignments(
    request: AssignmentRequest
  ): Promise<AlternativeAssignment[]> {
    // Find alternative therapists with similar qualifications and availability
    const { data: alternativeTherapists } = await supabase
      .from('therapists')
      .select('id, name_ar, name_en, specialties')
      .eq('status', 'active')
      .neq('id', request.therapist_id)

    if (!alternativeTherapists) return []

    const alternatives: AlternativeAssignment[] = []

    for (const therapist of alternativeTherapists) {
      const workloadResult = await this.workloadService.calculateWorkload(therapist.id)
      
      if (workloadResult.success && workloadResult.workload) {
        const constraints = await this.getTherapistConstraints(therapist.id)
        const utilization = (workloadResult.workload.weekly_hours / constraints.max_weekly_hours) * 100

        if (utilization < 85) { // Only consider therapists with < 85% utilization
          alternatives.push({
            therapist_id: therapist.id,
            therapist_name_ar: therapist.name_ar,
            therapist_name_en: therapist.name_en,
            compatibility_score: this.calculateCompatibilityScore(therapist, request),
            capacity_utilization: utilization,
            schedule_flexibility: this.calculateScheduleFlexibility(workloadResult.workload),
            recommended_time_slots: request.preferred_time_slots, // Simplified
            adjustment_requirements: []
          })
        }
      }
    }

    // Sort by compatibility score
    alternatives.sort((a, b) => b.compatibility_score - a.compatibility_score)
    
    return alternatives.slice(0, 5) // Return top 5 alternatives
  }

  private calculateCompatibilityScore(therapist: any, request: AssignmentRequest): number {
    // Simplified compatibility scoring based on specialties
    let score = 70 // Base score
    
    // Add specialty matching logic here
    // This is a simplified version
    
    return Math.min(100, score)
  }

  private calculateScheduleFlexibility(workload: any): number {
    // Calculate flexibility based on current schedule density
    return Math.max(0, 100 - (workload.utilization_percentage || 0))
  }

  private async executeAssignment(assignment: AssignmentRequest): Promise<boolean> {
    try {
      // This would integrate with the actual assignment system
      // For now, return true to simulate successful assignment
      return true
    } catch (error) {
      console.error('Assignment execution error:', error)
      return false
    }
  }

  private calculateOptimizationScore(
    request: BulkAssignmentRequest,
    successfulAssignments: string[]
  ): number {
    const successRate = successfulAssignments.length / request.assignments.length
    return Math.round(successRate * 100)
  }

  private async calculateWorkloadVarianceReduction(successfulAssignments: string[]): Promise<number> {
    // Calculate workload variance reduction
    return 15.5 // Placeholder
  }

  private async calculateUtilizationImprovement(successfulAssignments: string[]): Promise<number> {
    // Calculate overall utilization improvement
    return 8.2 // Placeholder
  }

  private async calculateAverageUtilizationChange(successfulAssignments: string[]): Promise<number> {
    return 5.3 // Placeholder
  }

  private async calculatePeakUtilizationChange(successfulAssignments: string[]): Promise<number> {
    return 12.1 // Placeholder
  }

  private async countTherapistsAtCapacity(): Promise<number> {
    return 3 // Placeholder
  }

  private async countCapacityWarnings(): Promise<number> {
    return 7 // Placeholder
  }

  private async countRecommendedAdjustments(): Promise<number> {
    return 4 // Placeholder
  }

  private async generateBulkRecommendations(
    failedAssignments: FailedAssignment[],
    strategy: string
  ): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = []

    if (failedAssignments.length > 0) {
      recommendations.push({
        type: 'capacity_expansion',
        priority: 1,
        description_ar: 'توسيع الطاقة الاستيعابية لاستيعاب المهام الفاشلة',
        description_en: 'Expand capacity to accommodate failed assignments',
        implementation_steps: [
          {
            step_number: 1,
            action_ar: 'تحليل أسباب فشل التعيينات',
            action_en: 'Analyze reasons for assignment failures',
            estimated_time_minutes: 30,
            requires_approval: false
          }
        ],
        expected_impact: 25
      })
    }

    return recommendations
  }

  private async generateCapacityAlerts(
    therapist: any,
    workload: any,
    constraints: CapacityConstraints
  ): Promise<CapacityMonitoringAlert[]> {
    const alerts: CapacityMonitoringAlert[] = []

    const utilization = (workload.weekly_hours / constraints.max_weekly_hours) * 100

    if (utilization >= 95) {
      alerts.push({
        alert_id: `capacity_critical_${therapist.id}_${Date.now()}`,
        therapist_id: therapist.id,
        alert_type: 'over_assignment',
        severity: 'critical',
        message_ar: `المعالج ${therapist.name_ar} وصل إلى الحد الأقصى للطاقة الاستيعابية`,
        message_en: `Therapist ${therapist.name_en} has reached maximum capacity`,
        triggered_at: new Date().toISOString(),
        requires_immediate_action: true,
        recommended_actions: [
          'Redistribute current assignments',
          'Block new assignments temporarily',
          'Review workload constraints'
        ],
        auto_resolution_available: false
      })
    } else if (utilization >= 85) {
      alerts.push({
        alert_id: `capacity_warning_${therapist.id}_${Date.now()}`,
        therapist_id: therapist.id,
        alert_type: 'capacity_warning',
        severity: 'high',
        message_ar: `المعالج ${therapist.name_ar} يقترب من الحد الأقصى للطاقة الاستيعابية`,
        message_en: `Therapist ${therapist.name_en} is approaching capacity limit`,
        triggered_at: new Date().toISOString(),
        requires_immediate_action: false,
        recommended_actions: [
          'Monitor closely',
          'Plan workload adjustments',
          'Consider assignment redistribution'
        ],
        auto_resolution_available: true
      })
    }

    return alerts
  }
}

export { CapacityManagementService }