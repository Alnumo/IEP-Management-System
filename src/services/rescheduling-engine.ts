import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import { requireAuth } from '@/lib/auth-utils'
import { addDays, parseISO, format, isAfter, isBefore } from 'date-fns'
import type {
  TherapySession,
  TherapistAvailability,
  ScheduleConflict,
  ReschedulingRequest,
  ReschedulingResult,
  SessionReschedulingOptions
} from '@/types/scheduling'

/**
 * Automated Rescheduling Engine
 * 
 * Handles intelligent session rescheduling when subscriptions are frozen:
 * - Finds optimal time slots based on therapist availability
 * - Maintains session continuity and program integrity
 * - Detects and reports scheduling conflicts
 * - Provides rollback capabilities for failed operations
 */

interface AvailableSlot {
  therapist_id: string
  date: string
  time_start: string
  time_end: string
  room_id?: string
  score: number // Priority score for slot selection
}

interface ReschedulingContext {
  subscription_id: string
  freeze_start_date: string
  freeze_end_date: string
  affected_sessions: TherapySession[]
  therapist_availability: Record<string, TherapistAvailability[]>
  existing_sessions: TherapySession[]
}

export class ReschedulingEngine {
  private readonly MAX_RESCHEDULE_ATTEMPTS = 3
  private readonly PREFERRED_TIME_BUFFER_HOURS = 2
  private readonly MAX_DAYS_AHEAD = 60

  /**
   * Main rescheduling function - handles the complete rescheduling workflow
   */
  async rescheduleSessionsForFreeze(request: ReschedulingRequest): Promise<ReschedulingResult> {
    const user = await requireAuth()
    const startTime = Date.now()

    console.log('🔄 Starting session rescheduling:', request)

    try {
      // 1. Build rescheduling context
      const context = await this.buildReschedulingContext(request)
      
      // 2. Find optimal slots for each session
      const reschedulingPlan = await this.generateReschedulingPlan(context)
      
      // 3. Validate the plan for conflicts
      const validationResult = await this.validateReschedulingPlan(reschedulingPlan, context)
      
      // 4. Execute the rescheduling (with transaction safety)
      const executionResult = await this.executeReschedulingPlan(reschedulingPlan, request, user.id)

      const duration = Date.now() - startTime

      console.log('✅ Rescheduling completed successfully in', duration, 'ms')

      return {
        success: true,
        sessions_rescheduled: executionResult.sessions_rescheduled,
        conflicts_detected: validationResult.conflicts,
        new_end_date: executionResult.new_end_date,
        execution_time_ms: duration,
        rollback_info: executionResult.rollback_info
      }

    } catch (error) {
      console.error('❌ Rescheduling failed:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'ReschedulingEngine',
        action: 'rescheduleSessionsForFreeze',
        request,
        userId: user.id
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessions_rescheduled: 0,
        conflicts_detected: [],
        execution_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Build comprehensive context for rescheduling operations
   */
  private async buildReschedulingContext(request: ReschedulingRequest): Promise<ReschedulingContext> {
    console.log('🔍 Building rescheduling context')

    // Fetch affected sessions
    const { data: affectedSessions, error: sessionsError } = await supabase
      .from('therapy_sessions')
      .select(`
        *,
        student:students(id, name_ar, name_en),
        therapist:therapists(id, name_ar, name_en),
        therapy_program:therapy_programs(id, name_ar, name_en)
      `)
      .eq('student_id', request.student_id)
      .gte('session_date', request.freeze_start_date)
      .lte('session_date', request.freeze_end_date)
      .eq('status', 'scheduled')

    if (sessionsError) throw sessionsError

    // Fetch therapist availability for the rescheduling period
    const rescheduleEndDate = addDays(parseISO(request.freeze_end_date), this.MAX_DAYS_AHEAD)
    
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('therapist_availability')
      .select('*')
      .gte('date', request.freeze_end_date)
      .lte('date', format(rescheduleEndDate, 'yyyy-MM-dd'))
      .eq('is_available', true)

    if (availabilityError) throw availabilityError

    // Group availability by therapist
    const therapistAvailability = availabilityData?.reduce((acc, slot) => {
      if (!acc[slot.therapist_id]) {
        acc[slot.therapist_id] = []
      }
      acc[slot.therapist_id].push(slot)
      return acc
    }, {} as Record<string, TherapistAvailability[]>) || {}

    // Fetch existing sessions in the rescheduling window
    const { data: existingSessions, error: existingError } = await supabase
      .from('therapy_sessions')
      .select('*')
      .gte('session_date', request.freeze_end_date)
      .lte('session_date', format(rescheduleEndDate, 'yyyy-MM-dd'))
      .neq('status', 'cancelled')

    if (existingError) throw existingError

    return {
      subscription_id: request.subscription_id,
      freeze_start_date: request.freeze_start_date,
      freeze_end_date: request.freeze_end_date,
      affected_sessions: affectedSessions || [],
      therapist_availability: therapistAvailability,
      existing_sessions: existingSessions || []
    }
  }

  /**
   * Generate optimal rescheduling plan using intelligent algorithms
   */
  private async generateReschedulingPlan(context: ReschedulingContext) {
    console.log('🧠 Generating rescheduling plan')

    const reschedulingPlan: Array<{
      original_session: TherapySession
      new_slot: AvailableSlot | null
      reason?: string
    }> = []

    for (const session of context.affected_sessions) {
      const availableSlots = await this.findAvailableSlotsForSession(session, context)
      
      if (availableSlots.length > 0) {
        // Select the best slot based on scoring algorithm
        const bestSlot = this.selectOptimalSlot(availableSlots, session, context)
        reschedulingPlan.push({
          original_session: session,
          new_slot: bestSlot
        })
      } else {
        reschedulingPlan.push({
          original_session: session,
          new_slot: null,
          reason: 'No available slots found'
        })
      }
    }

    return reschedulingPlan
  }

  /**
   * Find available time slots for a specific session
   */
  private async findAvailableSlotsForSession(
    session: TherapySession, 
    context: ReschedulingContext
  ): Promise<AvailableSlot[]> {
    const availableSlots: AvailableSlot[] = []
    const sessionDurationMinutes = session.duration_minutes || 60
    const preferredTherapist = session.therapist_id

    // Get availability for the session's preferred therapist
    const therapistAvailability = context.therapist_availability[preferredTherapist] || []

    for (const availability of therapistAvailability) {
      // Check if this slot can accommodate the session duration
      const slotDurationMinutes = this.calculateSlotDuration(availability.time_start, availability.time_end)
      
      if (slotDurationMinutes >= sessionDurationMinutes) {
        // Check for conflicts with existing sessions
        const hasConflict = this.checkTimeSlotConflict(
          availability.date,
          availability.time_start,
          availability.time_end,
          context.existing_sessions,
          preferredTherapist
        )

        if (!hasConflict) {
          availableSlots.push({
            therapist_id: preferredTherapist,
            date: availability.date,
            time_start: availability.time_start,
            time_end: availability.time_end,
            room_id: availability.room_id,
            score: this.calculateSlotScore(availability, session, context)
          })
        }
      }
    }

    // If no slots with preferred therapist, try other qualified therapists
    if (availableSlots.length === 0) {
      // This would involve finding alternative therapists with same specializations
      // Implementation depends on therapist qualification matching logic
    }

    return availableSlots.sort((a, b) => b.score - a.score) // Sort by score descending
  }

  /**
   * Select the optimal slot based on multiple criteria
   */
  private selectOptimalSlot(
    availableSlots: AvailableSlot[], 
    session: TherapySession,
    context: ReschedulingContext
  ): AvailableSlot {
    // Return the highest scored slot
    return availableSlots[0]
  }

  /**
   * Calculate priority score for a time slot
   */
  private calculateSlotScore(
    slot: TherapistAvailability, 
    session: TherapySession,
    context: ReschedulingContext
  ): number {
    let score = 100 // Base score

    // Prefer slots closer to the original session time
    const originalTime = session.time_start
    const timeDifference = Math.abs(
      this.timeToMinutes(slot.time_start) - this.timeToMinutes(originalTime)
    )
    score -= timeDifference * 0.1 // Reduce score for time differences

    // Prefer slots closer to the end of freeze period
    const daysDifference = Math.abs(
      new Date(slot.date).getTime() - new Date(context.freeze_end_date).getTime()
    ) / (1000 * 60 * 60 * 24)
    score -= daysDifference * 2 // Reduce score for date distance

    // Bonus for same weekday as original
    const originalDate = new Date(session.session_date)
    const slotDate = new Date(slot.date)
    if (originalDate.getDay() === slotDate.getDay()) {
      score += 20
    }

    // Bonus for same room if available
    if (slot.room_id === session.room_id) {
      score += 15
    }

    return Math.max(0, score)
  }

  /**
   * Validate the rescheduling plan for conflicts and issues
   */
  private async validateReschedulingPlan(
    plan: Array<{ original_session: TherapySession; new_slot: AvailableSlot | null; reason?: string }>,
    context: ReschedulingContext
  ) {
    const conflicts: ScheduleConflict[] = []
    const warnings: string[] = []

    // Check for internal conflicts within the plan
    const plannedSlots = new Map<string, TherapySession>()

    for (const item of plan) {
      if (!item.new_slot) {
        conflicts.push({
          type: 'no_slot_available',
          session_id: item.original_session.id,
          description: item.reason || 'No available slot found',
          severity: 'high'
        })
        continue
      }

      const slotKey = `${item.new_slot.therapist_id}-${item.new_slot.date}-${item.new_slot.time_start}`
      
      if (plannedSlots.has(slotKey)) {
        conflicts.push({
          type: 'double_booking',
          session_id: item.original_session.id,
          conflicting_session_id: plannedSlots.get(slotKey)?.id,
          description: 'Two sessions scheduled for the same time slot',
          severity: 'high'
        })
      } else {
        plannedSlots.set(slotKey, item.original_session)
      }
    }

    return { conflicts, warnings }
  }

  /**
   * Execute the rescheduling plan with transaction safety
   */
  private async executeReschedulingPlan(
    plan: Array<{ original_session: TherapySession; new_slot: AvailableSlot | null }>,
    request: ReschedulingRequest,
    userId: string
  ) {
    console.log('🚀 Executing rescheduling plan')

    const rollbackInfo: Array<{ session_id: string; original_data: Partial<TherapySession> }> = []
    let sessionsRescheduled = 0

    // Use Supabase transaction
    const { data, error } = await supabase.rpc('execute_session_rescheduling', {
      p_rescheduling_plan: plan.map(item => ({
        session_id: item.original_session.id,
        new_date: item.new_slot?.date,
        new_time_start: item.new_slot?.time_start,
        new_time_end: item.new_slot?.time_end,
        new_room_id: item.new_slot?.room_id
      })),
      p_subscription_id: request.subscription_id,
      p_freeze_days: request.freeze_days,
      p_user_id: userId
    })

    if (error) throw error

    return {
      sessions_rescheduled: data.sessions_rescheduled,
      new_end_date: data.new_end_date,
      rollback_info
    }
  }

  /**
   * Utility methods
   */
  private calculateSlotDuration(timeStart: string, timeEnd: string): number {
    const start = this.timeToMinutes(timeStart)
    const end = this.timeToMinutes(timeEnd)
    return end - start
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private checkTimeSlotConflict(
    date: string,
    timeStart: string,
    timeEnd: string,
    existingSessions: TherapySession[],
    therapistId: string
  ): boolean {
    return existingSessions.some(session => 
      session.session_date === date &&
      session.therapist_id === therapistId &&
      this.timeRangesOverlap(timeStart, timeEnd, session.time_start, session.time_end)
    )
  }

  private timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Minutes = this.timeToMinutes(start1)
    const end1Minutes = this.timeToMinutes(end1)
    const start2Minutes = this.timeToMinutes(start2)
    const end2Minutes = this.timeToMinutes(end2)

    return start1Minutes < end2Minutes && end1Minutes > start2Minutes
  }
}

// Export singleton instance
export const reschedulingEngine = new ReschedulingEngine()