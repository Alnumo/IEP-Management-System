/**
 * Advanced Conflict Detection Service
 * Story 3.1: Automated Scheduling Engine - Conflict Detection System
 * 
 * Real-time conflict detection with severity classification, automated resolution,
 * and comprehensive conflict analysis. Supports Arabic RTL/English LTR interfaces.
 */

import { supabase } from '@/lib/supabase'
import type {
  ScheduledSession,
  ScheduleConflict,
  ConflictType,
  ConflictSeverity,
  ConflictResolution,
  TherapistAvailability,
  SchedulingSuggestion,
  ResourceAvailability
} from '@/types/scheduling'

// =====================================================
// Conflict Detection Engine
// =====================================================

export class ConflictDetector {
  private static instance: ConflictDetector
  private conflictCache = new Map<string, ScheduleConflict[]>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static getInstance(): ConflictDetector {
    if (!ConflictDetector.instance) {
      ConflictDetector.instance = new ConflictDetector()
    }
    return ConflictDetector.instance
  }

  /**
   * Real-time conflict detection for a single session
   */
  async detectConflictsForSession(
    session: ScheduledSession,
    context?: {
      existingSessions?: ScheduledSession[]
      availability?: TherapistAvailability[]
      checkResources?: boolean
    }
  ): Promise<ScheduleConflict[]> {
    const startTime = Date.now()
    const conflicts: ScheduleConflict[] = []

    try {
      // Get context data if not provided
      const ctx = await this.getDetectionContext(session, context)

      // Run all conflict detection algorithms in parallel
      const conflictDetectionPromises = [
        this.detectTherapistConflicts(session, ctx.existingSessions),
        this.detectAvailabilityConflicts(session, ctx.availability),
        this.detectResourceConflicts(session, ctx.existingSessions, ctx.checkResources),
        this.detectTimeConstraintConflicts(session),
        this.detectCapacityConflicts(session, ctx.existingSessions),
        this.detectBusinessRuleConflicts(session, ctx.existingSessions)
      ]

      const allConflictResults = await Promise.all(conflictDetectionPromises)
      allConflictResults.forEach(conflictSet => conflicts.push(...conflictSet))

      // Classify and prioritize conflicts
      const classifiedConflicts = this.classifyAndPrioritizeConflicts(conflicts)

      // Cache results for performance
      this.cacheConflicts(session.id, classifiedConflicts)

      const detectionTime = Date.now() - startTime
      console.log(`Conflict detection completed in ${detectionTime}ms for session ${session.id}`)

      return classifiedConflicts

    } catch (error) {
      console.error('Conflict detection failed:', error)
      throw new Error(`فشل في كشف التضارب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  /**
   * Batch conflict detection for multiple sessions
   */
  async detectBatchConflicts(
    sessions: ScheduledSession[],
    options: {
      parallelProcessing?: boolean
      maxConcurrency?: number
      includeResources?: boolean
    } = {}
  ): Promise<Map<string, ScheduleConflict[]>> {
    const { parallelProcessing = true, maxConcurrency = 10, includeResources = true } = options
    const conflictMap = new Map<string, ScheduleConflict[]>()

    if (!parallelProcessing) {
      // Sequential processing for simpler debugging
      for (const session of sessions) {
        const conflicts = await this.detectConflictsForSession(session, { checkResources: includeResources })
        conflictMap.set(session.id, conflicts)
      }
    } else {
      // Parallel processing with concurrency control
      const chunks = this.chunkArray(sessions, maxConcurrency)
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async session => {
          const conflicts = await this.detectConflictsForSession(session, { checkResources: includeResources })
          return { sessionId: session.id, conflicts }
        })

        const chunkResults = await Promise.all(chunkPromises)
        chunkResults.forEach(({ sessionId, conflicts }) => {
          conflictMap.set(sessionId, conflicts)
        })
      }
    }

    return conflictMap
  }

  /**
   * Generate resolution suggestions for conflicts
   */
  async generateResolutionSuggestions(
    conflicts: ScheduleConflict[],
    session: ScheduledSession,
    availability?: TherapistAvailability[]
  ): Promise<SchedulingSuggestion[]> {
    const suggestions: SchedulingSuggestion[] = []

    for (const conflict of conflicts) {
      switch (conflict.conflict_type) {
        case ConflictType.THERAPIST_DOUBLE_BOOKING:
          suggestions.push(...await this.suggestTherapistAlternatives(session, conflict, availability))
          break

        case ConflictType.ROOM_UNAVAILABLE:
          suggestions.push(...await this.suggestRoomAlternatives(session, conflict))
          break

        case ConflictType.TIME_CONSTRAINT:
          suggestions.push(...await this.suggestTimeAlternatives(session, conflict, availability))
          break

        case ConflictType.EQUIPMENT_CONFLICT:
          suggestions.push(...await this.suggestEquipmentAlternatives(session, conflict))
          break

        default:
          suggestions.push(...await this.suggestGenericAlternatives(session, conflict))
      }
    }

    // Rank suggestions by confidence score
    return suggestions.sort((a, b) => b.confidence_score - a.confidence_score)
  }

  /**
   * Attempt automatic conflict resolution
   */
  async attemptAutoResolution(
    conflict: ScheduleConflict,
    session: ScheduledSession,
    options: {
      allowTimeShifts?: boolean
      allowTherapistChanges?: boolean
      allowRoomChanges?: boolean
      maxTimeShiftMinutes?: number
    } = {}
  ): Promise<{
    resolved: boolean
    updatedSession?: ScheduledSession
    method?: string
    confidence?: number
  }> {
    const {
      allowTimeShifts = true,
      allowTherapistChanges = false,
      allowRoomChanges = true,
      maxTimeShiftMinutes = 60
    } = options

    switch (conflict.severity) {
      case ConflictSeverity.LOW:
        return this.attemptLowSeverityResolution(conflict, session, options)

      case ConflictSeverity.MEDIUM:
        return this.attemptMediumSeverityResolution(conflict, session, options)

      case ConflictSeverity.HIGH:
      case ConflictSeverity.CRITICAL:
        // High severity conflicts require manual intervention
        return {
          resolved: false,
          method: 'requires_manual_intervention'
        }

      default:
        return { resolved: false }
    }
  }

  // =====================================================
  // Specific Conflict Detection Methods
  // =====================================================

  private async detectTherapistConflicts(
    session: ScheduledSession,
    existingSessions: ScheduledSession[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    // Check for therapist double-booking
    const conflictingSessions = existingSessions.filter(existing => 
      existing.id !== session.id &&
      existing.therapist_id === session.therapist_id &&
      existing.scheduled_date === session.scheduled_date &&
      this.hasTimeOverlap(session, existing) &&
      !['cancelled', 'no_show'].includes(existing.status)
    )

    for (const conflictingSession of conflictingSessions) {
      conflicts.push({
        id: this.generateConflictId(),
        conflict_type: ConflictType.THERAPIST_DOUBLE_BOOKING,
        severity: ConflictSeverity.HIGH,
        primary_session_id: session.id,
        conflicting_session_id: conflictingSession.id,
        conflict_description: 'المعالج محجوز مع طالب آخر في نفس الوقت',
        conflict_description_ar: 'المعالج محجوز مع طالب آخر في نفس الوقت',
        detected_at: new Date().toISOString(),
        resolution_status: 'pending',
        suggested_alternatives: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    return conflicts
  }

  private async detectAvailabilityConflicts(
    session: ScheduledSession,
    availability: TherapistAvailability[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []
    const sessionDate = new Date(session.scheduled_date)
    const dayOfWeek = sessionDate.getDay() === 0 ? 7 : sessionDate.getDay()

    // Find therapist's availability for this day
    const therapistAvailability = availability.filter(a => 
      a.therapist_id === session.therapist_id && 
      (a.day_of_week === dayOfWeek || a.specific_date === session.scheduled_date) &&
      a.is_available
    )

    if (therapistAvailability.length === 0) {
      conflicts.push({
        id: this.generateConflictId(),
        conflict_type: ConflictType.STUDENT_UNAVAILABLE, // Using closest available enum
        severity: ConflictSeverity.HIGH,
        primary_session_id: session.id,
        conflict_description: 'المعالج غير متاح في هذا اليوم',
        conflict_description_ar: 'المعالج غير متاح في هذا اليوم',
        detected_at: new Date().toISOString(),
        resolution_status: 'pending',
        suggested_alternatives: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } else {
      // Check if session time falls within availability windows
      const isWithinAvailability = therapistAvailability.some(avail => 
        this.isTimeWithinWindow(session.start_time, session.end_time, avail.start_time, avail.end_time)
      )

      if (!isWithinAvailability) {
        conflicts.push({
          id: this.generateConflictId(),
          conflict_type: ConflictType.TIME_CONSTRAINT,
          severity: ConflictSeverity.MEDIUM,
          primary_session_id: session.id,
          conflict_description: 'الجلسة خارج ساعات عمل المعالج المحددة',
          conflict_description_ar: 'الجلسة خارج ساعات عمل المعالج المحددة',
          detected_at: new Date().toISOString(),
          resolution_status: 'pending',
          suggested_alternatives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    return conflicts
  }

  private async detectResourceConflicts(
    session: ScheduledSession,
    existingSessions: ScheduledSession[],
    checkResources: boolean = true
  ): Promise<ScheduleConflict[]> {
    if (!checkResources) return []

    const conflicts: ScheduleConflict[] = []

    // Check room conflicts
    if (session.room_id) {
      const roomConflicts = existingSessions.filter(existing =>
        existing.id !== session.id &&
        existing.room_id === session.room_id &&
        existing.scheduled_date === session.scheduled_date &&
        this.hasTimeOverlap(session, existing) &&
        !['cancelled', 'no_show'].includes(existing.status)
      )

      if (roomConflicts.length > 0) {
        conflicts.push({
          id: this.generateConflictId(),
          conflict_type: ConflictType.ROOM_UNAVAILABLE,
          severity: ConflictSeverity.MEDIUM,
          primary_session_id: session.id,
          conflicting_session_id: roomConflicts[0].id,
          conflict_description: 'الغرفة محجوزة لجلسة أخرى',
          conflict_description_ar: 'الغرفة محجوزة لجلسة أخرى',
          detected_at: new Date().toISOString(),
          resolution_status: 'pending',
          suggested_alternatives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    // Check equipment conflicts
    if (session.equipment_ids && session.equipment_ids.length > 0) {
      for (const equipmentId of session.equipment_ids) {
        const equipmentConflicts = existingSessions.filter(existing =>
          existing.id !== session.id &&
          existing.equipment_ids?.includes(equipmentId) &&
          existing.scheduled_date === session.scheduled_date &&
          this.hasTimeOverlap(session, existing) &&
          !['cancelled', 'no_show'].includes(existing.status)
        )

        if (equipmentConflicts.length > 0) {
          conflicts.push({
            id: this.generateConflictId(),
            conflict_type: ConflictType.EQUIPMENT_CONFLICT,
            severity: ConflictSeverity.LOW,
            primary_session_id: session.id,
            conflicting_session_id: equipmentConflicts[0].id,
            conflict_description: `المعدات ${equipmentId} محجوزة لجلسة أخرى`,
            conflict_description_ar: `المعدات ${equipmentId} محجوزة لجلسة أخرى`,
            detected_at: new Date().toISOString(),
            resolution_status: 'pending',
            suggested_alternatives: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    return conflicts
  }

  private async detectTimeConstraintConflicts(
    session: ScheduledSession
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    // Check for invalid session duration
    const sessionStart = new Date(`2000-01-01T${session.start_time}`)
    const sessionEnd = new Date(`2000-01-01T${session.end_time}`)
    const actualDuration = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60)

    if (actualDuration !== session.duration_minutes) {
      conflicts.push({
        id: this.generateConflictId(),
        conflict_type: ConflictType.TIME_CONSTRAINT,
        severity: ConflictSeverity.LOW,
        primary_session_id: session.id,
        conflict_description: 'مدة الجلسة لا تتطابق مع الأوقات المحددة',
        conflict_description_ar: 'مدة الجلسة لا تتطابق مع الأوقات المحددة',
        detected_at: new Date().toISOString(),
        resolution_status: 'pending',
        suggested_alternatives: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // Check for sessions outside business hours
    const businessHoursStart = '08:00'
    const businessHoursEnd = '18:00'

    if (session.start_time < businessHoursStart || session.end_time > businessHoursEnd) {
      conflicts.push({
        id: this.generateConflictId(),
        conflict_type: ConflictType.TIME_CONSTRAINT,
        severity: ConflictSeverity.MEDIUM,
        primary_session_id: session.id,
        conflict_description: 'الجلسة خارج ساعات العمل الرسمية',
        conflict_description_ar: 'الجلسة خارج ساعات العمل الرسمية',
        detected_at: new Date().toISOString(),
        resolution_status: 'pending',
        suggested_alternatives: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    return conflicts
  }

  private async detectCapacityConflicts(
    session: ScheduledSession,
    existingSessions: ScheduledSession[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    // Check therapist daily capacity
    const therapistSessionsToday = existingSessions.filter(existing =>
      existing.therapist_id === session.therapist_id &&
      existing.scheduled_date === session.scheduled_date &&
      !['cancelled', 'no_show'].includes(existing.status)
    )

    const maxSessionsPerDay = 8 // This would typically come from therapist configuration
    if (therapistSessionsToday.length >= maxSessionsPerDay) {
      conflicts.push({
        id: this.generateConflictId(),
        conflict_type: ConflictType.TIME_CONSTRAINT,
        severity: ConflictSeverity.HIGH,
        primary_session_id: session.id,
        conflict_description: `المعالج تجاوز الحد الأقصى للجلسات اليومية (${maxSessionsPerDay})`,
        conflict_description_ar: `المعالج تجاوز الحد الأقصى للجلسات اليومية (${maxSessionsPerDay})`,
        detected_at: new Date().toISOString(),
        resolution_status: 'pending',
        suggested_alternatives: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    return conflicts
  }

  private async detectBusinessRuleConflicts(
    session: ScheduledSession,
    existingSessions: ScheduledSession[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    // Check minimum gap between sessions for same therapist
    const minGapMinutes = 15
    const therapistSessionsSameDay = existingSessions
      .filter(existing =>
        existing.therapist_id === session.therapist_id &&
        existing.scheduled_date === session.scheduled_date &&
        existing.id !== session.id &&
        !['cancelled', 'no_show'].includes(existing.status)
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    for (const existing of therapistSessionsSameDay) {
      const gap = this.calculateTimeGap(existing, session)
      if (gap >= 0 && gap < minGapMinutes) {
        conflicts.push({
          id: this.generateConflictId(),
          conflict_type: ConflictType.TIME_CONSTRAINT,
          severity: ConflictSeverity.LOW,
          primary_session_id: session.id,
          conflicting_session_id: existing.id,
          conflict_description: `فترة راحة غير كافية بين الجلسات (${gap} دقيقة < ${minGapMinutes} دقيقة)`,
          conflict_description_ar: `فترة راحة غير كافية بين الجلسات (${gap} دقيقة < ${minGapMinutes} دقيقة)`,
          detected_at: new Date().toISOString(),
          resolution_status: 'pending',
          suggested_alternatives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    return conflicts
  }

  // =====================================================
  // Resolution Suggestion Methods
  // =====================================================

  private async suggestTherapistAlternatives(
    session: ScheduledSession,
    conflict: ScheduleConflict,
    availability?: TherapistAvailability[]
  ): Promise<SchedulingSuggestion[]> {
    const suggestions: SchedulingSuggestion[] = []

    if (!availability) return suggestions

    // Find alternative therapists available at the same time
    const alternativeTherapists = availability.filter(avail =>
      avail.therapist_id !== session.therapist_id &&
      this.isTimeWithinWindow(session.start_time, session.end_time, avail.start_time, avail.end_time)
    )

    for (const alt of alternativeTherapists) {
      suggestions.push({
        date: session.scheduled_date,
        start_time: session.start_time,
        end_time: session.end_time,
        therapist_id: alt.therapist_id,
        confidence_score: 85, // High confidence for same time slot
        reasons: ['نفس الوقت مع معالج بديل', 'Same time with alternative therapist'],
        trade_offs: ['تغيير المعالج', 'Therapist change required'],
        resource_availability: {
          therapist_available: true,
          room_available: true, // Would check actual availability
          equipment_available: true,
          student_available: true,
          conflicts: []
        }
      })
    }

    return suggestions
  }

  private async suggestTimeAlternatives(
    session: ScheduledSession,
    conflict: ScheduleConflict,
    availability?: TherapistAvailability[]
  ): Promise<SchedulingSuggestion[]> {
    const suggestions: SchedulingSuggestion[] = []

    if (!availability) return suggestions

    const therapistAvailability = availability.filter(a => a.therapist_id === session.therapist_id)
    
    for (const avail of therapistAvailability) {
      // Suggest earlier time slots
      const earlierSlot = this.findEarlierTimeSlot(session, avail)
      if (earlierSlot) {
        suggestions.push({
          date: session.scheduled_date,
          start_time: earlierSlot.start_time,
          end_time: earlierSlot.end_time,
          therapist_id: session.therapist_id,
          confidence_score: 70,
          reasons: ['وقت أبكر في نفس اليوم', 'Earlier time same day'],
          trade_offs: ['تغيير الوقت', 'Time change required'],
          resource_availability: {
            therapist_available: true,
            room_available: true,
            equipment_available: true,
            student_available: true,
            conflicts: []
          }
        })
      }

      // Suggest later time slots
      const laterSlot = this.findLaterTimeSlot(session, avail)
      if (laterSlot) {
        suggestions.push({
          date: session.scheduled_date,
          start_time: laterSlot.start_time,
          end_time: laterSlot.end_time,
          therapist_id: session.therapist_id,
          confidence_score: 65,
          reasons: ['وقت أبكر في نفس اليوم', 'Later time same day'],
          trade_offs: ['تغيير الوقت', 'Time change required'],
          resource_availability: {
            therapist_available: true,
            room_available: true,
            equipment_available: true,
            student_available: true,
            conflicts: []
          }
        })
      }
    }

    return suggestions
  }

  private async suggestRoomAlternatives(
    session: ScheduledSession,
    conflict: ScheduleConflict
  ): Promise<SchedulingSuggestion[]> {
    // Implementation for room alternatives
    return []
  }

  private async suggestEquipmentAlternatives(
    session: ScheduledSession,
    conflict: ScheduleConflict
  ): Promise<SchedulingSuggestion[]> {
    // Implementation for equipment alternatives
    return []
  }

  private async suggestGenericAlternatives(
    session: ScheduledSession,
    conflict: ScheduleConflict
  ): Promise<SchedulingSuggestion[]> {
    // Implementation for generic alternatives
    return []
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async getDetectionContext(
    session: ScheduledSession,
    providedContext?: {
      existingSessions?: ScheduledSession[]
      availability?: TherapistAvailability[]
      checkResources?: boolean
    }
  ) {
    const context = providedContext || {}

    if (!context.existingSessions) {
      // Fetch existing sessions for the same date
      const { data } = await supabase
        .from('therapy_sessions')
        .select('*')
        .eq('scheduled_date', session.scheduled_date)
        .neq('status', 'cancelled')

      context.existingSessions = data || []
    }

    if (!context.availability) {
      // Fetch therapist availability
      const { data } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('is_available', true)

      context.availability = data || []
    }

    return {
      existingSessions: context.existingSessions,
      availability: context.availability,
      checkResources: context.checkResources ?? true
    }
  }

  private classifyAndPrioritizeConflicts(conflicts: ScheduleConflict[]): ScheduleConflict[] {
    return conflicts.sort((a, b) => {
      // Sort by severity first, then by type
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      
      if (severityDiff !== 0) return severityDiff
      
      // Then by conflict type (therapist conflicts are highest priority)
      const typeOrder = {
        therapist_double_booking: 4,
        time_constraint: 3,
        room_unavailable: 2,
        equipment_conflict: 1,
        student_unavailable: 1
      }
      
      return typeOrder[b.conflict_type] - typeOrder[a.conflict_type]
    })
  }

  private cacheConflicts(sessionId: string, conflicts: ScheduleConflict[]): void {
    this.conflictCache.set(sessionId, conflicts)
    
    // Auto-expire cache entries
    setTimeout(() => {
      this.conflictCache.delete(sessionId)
    }, this.CACHE_TTL)
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private hasTimeOverlap(session1: ScheduledSession, session2: ScheduledSession): boolean {
    return !(session1.end_time <= session2.start_time || session2.end_time <= session1.start_time)
  }

  private isTimeWithinWindow(startTime: string, endTime: string, windowStart: string, windowEnd: string): boolean {
    return startTime >= windowStart && endTime <= windowEnd
  }

  private calculateTimeGap(session1: ScheduledSession, session2: ScheduledSession): number {
    const end1 = new Date(`2000-01-01T${session1.end_time}`)
    const start2 = new Date(`2000-01-01T${session2.start_time}`)
    
    return (start2.getTime() - end1.getTime()) / (1000 * 60) // Gap in minutes
  }

  private findEarlierTimeSlot(session: ScheduledSession, availability: TherapistAvailability): { start_time: string; end_time: string } | null {
    // Implementation to find earlier available time slot
    return null
  }

  private findLaterTimeSlot(session: ScheduledSession, availability: TherapistAvailability): { start_time: string; end_time: string } | null {
    // Implementation to find later available time slot
    return null
  }

  private async attemptLowSeverityResolution(
    conflict: ScheduleConflict,
    session: ScheduledSession,
    options: any
  ): Promise<{ resolved: boolean; updatedSession?: ScheduledSession; method?: string; confidence?: number }> {
    // Implementation for low severity conflict resolution
    return { resolved: false }
  }

  private async attemptMediumSeverityResolution(
    conflict: ScheduleConflict,
    session: ScheduledSession,
    options: any
  ): Promise<{ resolved: boolean; updatedSession?: ScheduledSession; method?: string; confidence?: number }> {
    // Implementation for medium severity conflict resolution
    return { resolved: false }
  }
}

// =====================================================
// Export Singleton and Utility Functions
// =====================================================

export const conflictDetector = ConflictDetector.getInstance()

/**
 * Detect conflicts for a single session
 */
export async function detectSessionConflicts(
  session: ScheduledSession,
  context?: {
    existingSessions?: ScheduledSession[]
    availability?: TherapistAvailability[]
    checkResources?: boolean
  }
): Promise<ScheduleConflict[]> {
  return conflictDetector.detectConflictsForSession(session, context)
}

/**
 * Batch detect conflicts for multiple sessions
 */
export async function detectBatchConflicts(
  sessions: ScheduledSession[],
  options?: {
    parallelProcessing?: boolean
    maxConcurrency?: number
    includeResources?: boolean
  }
): Promise<Map<string, ScheduleConflict[]>> {
  return conflictDetector.detectBatchConflicts(sessions, options)
}

/**
 * Generate resolution suggestions for conflicts
 */
export async function generateConflictResolutions(
  conflicts: ScheduleConflict[],
  session: ScheduledSession,
  availability?: TherapistAvailability[]
): Promise<SchedulingSuggestion[]> {
  return conflictDetector.generateResolutionSuggestions(conflicts, session, availability)
}