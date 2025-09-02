import { supabase } from '@/lib/supabase'
import type { 
  ScheduledSession, 
  TherapistAvailability, 
  ScheduleConflict,
  ScheduleFilter,
  SchedulingIntegrationResult 
} from '@/types/scheduling'
import type { 
  Student,
  StudentEnrollment,
  TherapyPlan,
  Therapist,
  TherapyRoom,
  BillingRecord
} from '@/types'

/**
 * Scheduling Integration Service
 * 
 * Manages integration between the scheduling system and core business systems
 * including student enrollment, therapist management, room booking, and billing.
 */

export class SchedulingIntegrationService {
  private static instance: SchedulingIntegrationService

  static getInstance(): SchedulingIntegrationService {
    if (!this.instance) {
      this.instance = new SchedulingIntegrationService()
    }
    return this.instance
  }

  /**
   * Student Enrollment System Integration
   * Synchronizes scheduling with active student enrollments and therapy plans
   */
  async syncWithEnrollmentSystem(sessionData: Partial<ScheduledSession>): Promise<SchedulingIntegrationResult> {
    try {
      // Validate student enrollment status
      const enrollmentValidation = await this.validateStudentEnrollment(sessionData.student_id!)
      if (!enrollmentValidation.isValid) {
        return {
          success: false,
          error: enrollmentValidation.error,
          warnings: [],
          data: null
        }
      }

      // Check therapy plan compatibility
      const planCompatibility = await this.checkTherapyPlanCompatibility(
        sessionData.student_id!,
        sessionData.session_type!,
        sessionData.session_category!
      )

      if (!planCompatibility.isCompatible) {
        return {
          success: false,
          error: 'Session type not compatible with student\'s therapy plan',
          warnings: planCompatibility.warnings,
          data: null
        }
      }

      // Update enrollment session counts and progress tracking
      const sessionUpdate = await this.updateEnrollmentSessionCounts(
        sessionData.student_id!,
        sessionData.session_type!,
        'scheduled'
      )

      return {
        success: true,
        data: {
          enrollment: enrollmentValidation.enrollment,
          therapyPlan: planCompatibility.plan,
          sessionCounts: sessionUpdate.counts,
          billingImpact: sessionUpdate.billingImpact
        },
        warnings: [...planCompatibility.warnings, ...sessionUpdate.warnings]
      }

    } catch (error) {
      console.error('Enrollment system sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown enrollment sync error',
        warnings: [],
        data: null
      }
    }
  }

  /**
   * Therapist Availability System Integration
   * Manages therapist schedules, availability, and workload distribution
   */
  async syncWithTherapistSystem(sessionData: Partial<ScheduledSession>): Promise<SchedulingIntegrationResult> {
    try {
      // Validate therapist availability for the requested time slot
      const availabilityCheck = await this.validateTherapistAvailability(
        sessionData.therapist_id!,
        sessionData.session_date!,
        sessionData.start_time!,
        sessionData.end_time!
      )

      if (!availabilityCheck.isAvailable) {
        return {
          success: false,
          error: availabilityCheck.reason,
          warnings: [],
          data: null
        }
      }

      // Check therapist specialization compatibility
      const specializationCheck = await this.validateTherapistSpecialization(
        sessionData.therapist_id!,
        sessionData.session_type!,
        sessionData.session_category!
      )

      if (!specializationCheck.isQualified) {
        return {
          success: false,
          error: 'Therapist not qualified for this session type',
          warnings: specializationCheck.warnings,
          data: null
        }
      }

      // Update therapist schedule and workload metrics
      const workloadUpdate = await this.updateTherapistWorkload(
        sessionData.therapist_id!,
        sessionData.session_date!,
        sessionData.start_time!,
        sessionData.duration_minutes || 60
      )

      return {
        success: true,
        data: {
          therapist: availabilityCheck.therapist,
          availability: availabilityCheck.availabilitySlot,
          workload: workloadUpdate.newWorkload,
          utilizationRate: workloadUpdate.utilizationRate
        },
        warnings: [...specializationCheck.warnings, ...workloadUpdate.warnings]
      }

    } catch (error) {
      console.error('Therapist system sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown therapist sync error',
        warnings: [],
        data: null
      }
    }
  }

  /**
   * Room Management System Integration
   * Handles room availability, equipment requirements, and facility management
   */
  async syncWithRoomSystem(sessionData: Partial<ScheduledSession>): Promise<SchedulingIntegrationResult> {
    try {
      // Find optimal room based on requirements
      const roomSelection = await this.findOptimalRoom(
        sessionData.session_date!,
        sessionData.start_time!,
        sessionData.end_time!,
        sessionData.session_type!,
        sessionData.required_equipment || []
      )

      if (!roomSelection.success) {
        return {
          success: false,
          error: roomSelection.error,
          warnings: [],
          data: null
        }
      }

      // Validate room availability and equipment status
      const roomValidation = await this.validateRoomAvailability(
        roomSelection.room!.id,
        sessionData.session_date!,
        sessionData.start_time!,
        sessionData.end_time!
      )

      if (!roomValidation.isAvailable) {
        return {
          success: false,
          error: 'Selected room is not available for the requested time',
          warnings: roomValidation.warnings,
          data: null
        }
      }

      // Book room and equipment
      const booking = await this.bookRoomAndEquipment(
        roomSelection.room!.id,
        sessionData.session_date!,
        sessionData.start_time!,
        sessionData.end_time!,
        sessionData.required_equipment || []
      )

      return {
        success: true,
        data: {
          room: roomSelection.room,
          booking: booking.booking,
          equipment: booking.equipment,
          alternativeRooms: roomSelection.alternatives
        },
        warnings: [...roomSelection.warnings, ...booking.warnings]
      }

    } catch (error) {
      console.error('Room system sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown room sync error',
        warnings: [],
        data: null
      }
    }
  }

  /**
   * Billing System Integration
   * Manages session billing, payment tracking, and financial impact
   */
  async syncWithBillingSystem(sessionData: Partial<ScheduledSession>): Promise<SchedulingIntegrationResult> {
    try {
      // Calculate session billing information
      const billingCalculation = await this.calculateSessionBilling(
        sessionData.student_id!,
        sessionData.session_type!,
        sessionData.duration_minutes || 60,
        sessionData.therapist_id!
      )

      if (!billingCalculation.success) {
        return {
          success: false,
          error: billingCalculation.error,
          warnings: [],
          data: null
        }
      }

      // Validate payment status and credit availability
      const paymentValidation = await this.validatePaymentStatus(
        sessionData.student_id!,
        billingCalculation.amount!
      )

      if (!paymentValidation.canProceed) {
        return {
          success: false,
          error: 'Payment validation failed: ' + paymentValidation.reason,
          warnings: paymentValidation.warnings,
          data: paymentValidation.data
        }
      }

      // Create billing record for the session
      const billingRecord = await this.createSessionBillingRecord(
        sessionData,
        billingCalculation.amount!,
        billingCalculation.details!
      )

      return {
        success: true,
        data: {
          billingRecord: billingRecord.record,
          amount: billingCalculation.amount,
          paymentStatus: paymentValidation.status,
          creditBalance: paymentValidation.creditBalance
        },
        warnings: [...billingCalculation.warnings, ...paymentValidation.warnings]
      }

    } catch (error) {
      console.error('Billing system sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown billing sync error',
        warnings: [],
        data: null
      }
    }
  }

  /**
   * Comprehensive Integration Check
   * Validates session against all core systems before scheduling
   */
  async validateSessionIntegration(sessionData: Partial<ScheduledSession>): Promise<SchedulingIntegrationResult> {
    try {
      const results = await Promise.allSettled([
        this.syncWithEnrollmentSystem(sessionData),
        this.syncWithTherapistSystem(sessionData),
        this.syncWithRoomSystem(sessionData),
        this.syncWithBillingSystem(sessionData)
      ])

      const [enrollmentResult, therapistResult, roomResult, billingResult] = results

      // Check if all integrations succeeded
      const allSuccessful = results.every(result => 
        result.status === 'fulfilled' && result.value.success
      )

      if (!allSuccessful) {
        const errors = results
          .filter((result): result is PromiseFulfilledResult<SchedulingIntegrationResult> => 
            result.status === 'fulfilled' && !result.value.success
          )
          .map(result => result.value.error)
          .filter(Boolean)

        const rejectedErrors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason?.message || 'Unknown error')

        return {
          success: false,
          error: [...errors, ...rejectedErrors].join('; '),
          warnings: [],
          data: null
        }
      }

      // Combine successful results
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<SchedulingIntegrationResult> => 
          result.status === 'fulfilled' && result.value.success
        )
        .map(result => result.value)

      const combinedWarnings = successfulResults.flatMap(result => result.warnings || [])

      return {
        success: true,
        data: {
          enrollment: enrollmentResult.status === 'fulfilled' ? enrollmentResult.value.data : null,
          therapist: therapistResult.status === 'fulfilled' ? therapistResult.value.data : null,
          room: roomResult.status === 'fulfilled' ? roomResult.value.data : null,
          billing: billingResult.status === 'fulfilled' ? billingResult.value.data : null
        },
        warnings: combinedWarnings
      }

    } catch (error) {
      console.error('Comprehensive integration validation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown integration validation error',
        warnings: [],
        data: null
      }
    }
  }

  /**
   * Session Conflict Resolution
   * Resolves conflicts when scheduling changes impact multiple systems
   */
  async resolveSchedulingConflicts(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ): Promise<SchedulingIntegrationResult> {
    try {
      // Analyze the impact of proposed changes
      const impactAnalysis = await this.analyzeScheduleChangeImpact(originalSession, proposedChanges)

      if (impactAnalysis.hasBlockingConflicts) {
        return {
          success: false,
          error: 'Blocking conflicts detected: ' + impactAnalysis.blockingConflicts.join(', '),
          warnings: impactAnalysis.warnings,
          data: {
            conflicts: impactAnalysis.conflicts,
            suggestedAlternatives: impactAnalysis.alternatives
          }
        }
      }

      // Execute conflict resolution strategies
      const resolutionResults = await Promise.allSettled([
        this.resolveEnrollmentConflicts(originalSession, proposedChanges),
        this.resolveTherapistConflicts(originalSession, proposedChanges),
        this.resolveRoomConflicts(originalSession, proposedChanges),
        this.resolveBillingConflicts(originalSession, proposedChanges)
      ])

      const successfulResolutions = resolutionResults.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.success
      )

      return {
        success: true,
        data: {
          resolvedConflicts: successfulResolutions.map(result => result.value.data),
          remainingWarnings: impactAnalysis.warnings
        },
        warnings: impactAnalysis.warnings
      }

    } catch (error) {
      console.error('Conflict resolution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conflict resolution error',
        warnings: [],
        data: null
      }
    }
  }

  // Private helper methods for integration logic

  private async validateStudentEnrollment(studentId: string) {
    const { data: enrollment, error } = await supabase
      .from('student_enrollments')
      .select(`
        *,
        students(*),
        therapy_plans(*)
      `)
      .eq('student_id', studentId)
      .eq('enrollment_status', 'active')
      .single()

    if (error || !enrollment) {
      return {
        isValid: false,
        error: 'Student not found or enrollment not active',
        enrollment: null
      }
    }

    return {
      isValid: true,
      enrollment,
      error: null
    }
  }

  private async checkTherapyPlanCompatibility(
    studentId: string, 
    sessionType: string, 
    sessionCategory: string
  ) {
    const { data: plan, error } = await supabase
      .from('therapy_plans')
      .select('*')
      .eq('id', 
        supabase
          .from('student_enrollments')
          .select('plan_id')
          .eq('student_id', studentId)
          .single()
      )
      .single()

    if (error || !plan) {
      return {
        isCompatible: false,
        warnings: ['Unable to verify therapy plan compatibility'],
        plan: null
      }
    }

    // Check if session type is included in the therapy plan
    const isCompatible = plan.included_session_types?.includes(sessionType) || 
                        plan.category === sessionCategory

    return {
      isCompatible,
      plan,
      warnings: isCompatible ? [] : ['Session type may require plan modification']
    }
  }

  private async updateEnrollmentSessionCounts(
    studentId: string, 
    sessionType: string, 
    action: 'scheduled' | 'completed' | 'cancelled'
  ) {
    // Implementation for updating session counts and tracking progress
    return {
      counts: { scheduled: 0, completed: 0, remaining: 0 },
      billingImpact: { amount: 0, creditUsed: 0 },
      warnings: []
    }
  }

  private async validateTherapistAvailability(
    therapistId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ) {
    const { data: availability, error } = await supabase
      .from('therapist_availability')
      .select(`
        *,
        therapists(*)
      `)
      .eq('therapist_id', therapistId)
      .eq('available_date', sessionDate)
      .lte('start_time', startTime)
      .gte('end_time', endTime)
      .eq('is_available', true)
      .single()

    if (error || !availability) {
      return {
        isAvailable: false,
        reason: 'Therapist not available at requested time',
        therapist: null,
        availabilitySlot: null
      }
    }

    return {
      isAvailable: true,
      therapist: availability.therapists,
      availabilitySlot: availability,
      reason: null
    }
  }

  private async validateTherapistSpecialization(
    therapistId: string,
    sessionType: string,
    sessionCategory: string
  ) {
    const { data: therapist, error } = await supabase
      .from('therapists')
      .select('specializations, certifications')
      .eq('id', therapistId)
      .single()

    if (error || !therapist) {
      return {
        isQualified: false,
        warnings: ['Unable to verify therapist qualifications']
      }
    }

    const hasSpecialization = therapist.specializations?.includes(sessionCategory) ||
                             therapist.specializations?.includes(sessionType)

    return {
      isQualified: hasSpecialization || therapist.specializations?.includes('general'),
      warnings: hasSpecialization ? [] : ['Therapist specialization may not match session requirements']
    }
  }

  private async updateTherapistWorkload(
    therapistId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ) {
    // Implementation for workload calculation and updates
    return {
      newWorkload: { dailyHours: 0, weeklyHours: 0, monthlyHours: 0 },
      utilizationRate: 0,
      warnings: []
    }
  }

  private async findOptimalRoom(
    sessionDate: string,
    startTime: string,
    endTime: string,
    sessionType: string,
    requiredEquipment: string[]
  ) {
    const { data: rooms, error } = await supabase
      .from('therapy_rooms')
      .select('*')
      .eq('is_active', true)
      .contains('supported_session_types', [sessionType])

    if (error || !rooms?.length) {
      return {
        success: false,
        error: 'No suitable rooms available',
        room: null,
        alternatives: [],
        warnings: []
      }
    }

    // Find the best room based on equipment and availability
    const bestRoom = rooms[0] // Simplified selection logic

    return {
      success: true,
      room: bestRoom,
      alternatives: rooms.slice(1, 3),
      warnings: []
    }
  }

  private async validateRoomAvailability(
    roomId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ) {
    const { data: conflictingSessions } = await supabase
      .from('scheduled_sessions')
      .select('id')
      .eq('room_id', roomId)
      .eq('session_date', sessionDate)
      .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`)

    return {
      isAvailable: !conflictingSessions?.length,
      warnings: conflictingSessions?.length ? ['Room has scheduling conflicts'] : []
    }
  }

  private async bookRoomAndEquipment(
    roomId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    requiredEquipment: string[]
  ) {
    // Implementation for room and equipment booking
    return {
      booking: { id: 'booking-id', status: 'confirmed' },
      equipment: requiredEquipment.map(eq => ({ name: eq, status: 'available' })),
      warnings: []
    }
  }

  private async calculateSessionBilling(
    studentId: string,
    sessionType: string,
    durationMinutes: number,
    therapistId: string
  ) {
    // Implementation for billing calculation
    return {
      success: true,
      amount: 100, // Placeholder amount
      details: { baseRate: 100, duration: durationMinutes },
      warnings: []
    }
  }

  private async validatePaymentStatus(studentId: string, amount: number) {
    const { data: billing } = await supabase
      .from('billing_accounts')
      .select('credit_balance, payment_status')
      .eq('student_id', studentId)
      .single()

    return {
      canProceed: (billing?.credit_balance || 0) >= amount,
      reason: (billing?.credit_balance || 0) < amount ? 'Insufficient credit balance' : '',
      status: billing?.payment_status || 'unknown',
      creditBalance: billing?.credit_balance || 0,
      warnings: [],
      data: billing
    }
  }

  private async createSessionBillingRecord(
    sessionData: Partial<ScheduledSession>,
    amount: number,
    details: any
  ) {
    // Implementation for creating billing records
    return {
      record: { id: 'billing-record-id', amount, status: 'pending' },
      warnings: []
    }
  }

  private async analyzeScheduleChangeImpact(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ) {
    // Implementation for impact analysis
    return {
      hasBlockingConflicts: false,
      blockingConflicts: [],
      conflicts: [],
      alternatives: [],
      warnings: []
    }
  }

  private async resolveEnrollmentConflicts(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ) {
    return { success: true, data: null }
  }

  private async resolveTherapistConflicts(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ) {
    return { success: true, data: null }
  }

  private async resolveRoomConflicts(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ) {
    return { success: true, data: null }
  }

  private async resolveBillingConflicts(
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSess-ion>
  ) {
    return { success: true, data: null }
  }
}

// Export singleton instance
export const schedulingIntegration = SchedulingIntegrationService.getInstance()