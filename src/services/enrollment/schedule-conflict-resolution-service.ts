// Story 6.1: Schedule conflict detection and resolution service

import { supabase } from '@/lib/supabase'
import type { ScheduleSlot, ScheduleConflict } from './individualized-scheduling-service'

export interface ConflictResolutionStrategy {
  type: 'auto' | 'manual' | 'hybrid'
  priority_rules: PriorityRule[]
  resolution_preferences: ResolutionPreference[]
}

export interface PriorityRule {
  criteria: 'seniority' | 'severity' | 'program_type' | 'therapist_preference'
  weight: number
  order: 'asc' | 'desc'
}

export interface ResolutionPreference {
  conflict_type: 'therapist' | 'room' | 'student'
  preferred_action: 'reschedule' | 'reassign' | 'split' | 'cancel'
  auto_apply: boolean
}

export interface ConflictResolution {
  conflict_id: string
  original_slot: ScheduleSlot
  resolution_type: 'rescheduled' | 'reassigned' | 'split' | 'cancelled'
  new_slot?: ScheduleSlot
  alternate_therapist_id?: string
  alternate_room_id?: string
  notes: string
  applied_at?: string
  applied_by?: string
}

export interface ConflictAnalysis {
  total_conflicts: number
  conflicts_by_type: {
    therapist: number
    room: number
    student: number
  }
  peak_conflict_times: Array<{
    day: string
    time: string
    conflict_count: number
  }>
  resolution_success_rate: number
  average_resolution_time_minutes: number
}

class ScheduleConflictResolutionService {
  /**
   * Detect all conflicts in a schedule
   */
  async detectConflictsInSchedule(
    schedule_slots: ScheduleSlot[],
    check_future_only: boolean = true
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []
    const processedPairs = new Set<string>()

    // Filter slots based on time preference
    const slotsToCheck = check_future_only
      ? schedule_slots.filter(slot => new Date(slot.session_date) >= new Date())
      : schedule_slots

    // Check each slot against all others
    for (let i = 0; i < slotsToCheck.length; i++) {
      const slot1 = slotsToCheck[i]

      for (let j = i + 1; j < slotsToCheck.length; j++) {
        const slot2 = slotsToCheck[j]
        const pairKey = `${slot1.id}-${slot2.id}`

        if (processedPairs.has(pairKey)) continue
        processedPairs.add(pairKey)

        // Check for conflicts
        const conflict = await this.checkSlotConflict(slot1, slot2)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    }

    // Check against existing database schedules
    const dbConflicts = await this.checkDatabaseConflicts(slotsToCheck)
    conflicts.push(...dbConflicts)

    return this.deduplicateConflicts(conflicts)
  }

  /**
   * Automatically resolve conflicts based on strategy
   */
  async autoResolveConflicts(
    conflicts: ScheduleConflict[],
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []

    // Sort conflicts by priority
    const prioritizedConflicts = this.prioritizeConflicts(conflicts, strategy.priority_rules)

    for (const conflict of prioritizedConflicts) {
      const preference = strategy.resolution_preferences.find(
        p => p.conflict_type === conflict.type
      )

      if (!preference || !preference.auto_apply) {
        // Skip if no auto-resolution preference
        continue
      }

      const resolution = await this.applyResolutionStrategy(
        conflict,
        preference.preferred_action
      )

      if (resolution) {
        resolutions.push(resolution)
        
        // Apply the resolution
        if (strategy.type === 'auto') {
          await this.applyResolution(resolution)
        }
      }
    }

    return resolutions
  }

  /**
   * Suggest manual resolution options
   */
  async suggestResolutions(
    conflict: ScheduleConflict
  ): Promise<ConflictResolution[]> {
    const suggestions: ConflictResolution[] = []

    // Get the primary conflicting slot
    const primarySlot = conflict.conflicting_slots[0]
    if (!primarySlot) return suggestions

    // Suggest rescheduling
    const rescheduleOptions = await this.generateRescheduleOptions(primarySlot, conflict)
    suggestions.push(...rescheduleOptions)

    // Suggest reassignment (for therapist conflicts)
    if (conflict.type === 'therapist') {
      const reassignOptions = await this.generateReassignmentOptions(primarySlot)
      suggestions.push(...reassignOptions)
    }

    // Suggest room changes (for room conflicts)
    if (conflict.type === 'room') {
      const roomChangeOptions = await this.generateRoomChangeOptions(primarySlot)
      suggestions.push(...roomChangeOptions)
    }

    // Suggest session splitting (for long sessions)
    if (this.canSplitSession(primarySlot)) {
      const splitOptions = await this.generateSplitOptions(primarySlot)
      suggestions.push(...splitOptions)
    }

    return suggestions
  }

  /**
   * Apply a resolution to the schedule
   */
  async applyResolution(resolution: ConflictResolution): Promise<boolean> {
    try {
      switch (resolution.resolution_type) {
        case 'rescheduled':
          return await this.applyReschedule(resolution)
        
        case 'reassigned':
          return await this.applyReassignment(resolution)
        
        case 'split':
          return await this.applySplit(resolution)
        
        case 'cancelled':
          return await this.applyCancel(resolution)
        
        default:
          return false
      }
    } catch (error) {
      console.error('Error applying resolution:', error)
      return false
    }
  }

  /**
   * Analyze conflict patterns
   */
  async analyzeConflictPatterns(
    start_date: string,
    end_date: string
  ): Promise<ConflictAnalysis> {
    try {
      // Get all conflicts in date range
      const { data: conflicts, error } = await supabase
        .from('schedule_conflicts')
        .select('*')
        .gte('detected_at', start_date)
        .lte('detected_at', end_date)

      if (error) throw error

      // Analyze patterns
      const analysis: ConflictAnalysis = {
        total_conflicts: conflicts?.length || 0,
        conflicts_by_type: {
          therapist: 0,
          room: 0,
          student: 0
        },
        peak_conflict_times: [],
        resolution_success_rate: 0,
        average_resolution_time_minutes: 0
      }

      if (!conflicts || conflicts.length === 0) {
        return analysis
      }

      // Count by type
      conflicts.forEach(conflict => {
        if (conflict.conflict_type === 'therapist') analysis.conflicts_by_type.therapist++
        else if (conflict.conflict_type === 'room') analysis.conflicts_by_type.room++
        else if (conflict.conflict_type === 'student') analysis.conflicts_by_type.student++
      })

      // Find peak times
      const timeFrequency = new Map<string, number>()
      conflicts.forEach(conflict => {
        const date = new Date(conflict.session_date)
        const dayName = this.getDayName(date.getDay())
        const timeKey = `${dayName}-${conflict.session_time}`
        
        timeFrequency.set(timeKey, (timeFrequency.get(timeKey) || 0) + 1)
      })

      // Sort and get top peak times
      const sortedTimes = Array.from(timeFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      analysis.peak_conflict_times = sortedTimes.map(([key, count]) => {
        const [day, time] = key.split('-')
        return { day, time, conflict_count: count }
      })

      // Calculate resolution success rate
      const resolved = conflicts.filter(c => c.resolution_status === 'resolved').length
      analysis.resolution_success_rate = (resolved / conflicts.length) * 100

      // Calculate average resolution time
      const resolutionTimes = conflicts
        .filter(c => c.resolved_at && c.detected_at)
        .map(c => {
          const detected = new Date(c.detected_at).getTime()
          const resolved = new Date(c.resolved_at).getTime()
          return (resolved - detected) / (1000 * 60) // Convert to minutes
        })

      if (resolutionTimes.length > 0) {
        analysis.average_resolution_time_minutes = 
          resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      }

      return analysis
    } catch (error) {
      console.error('Error analyzing conflict patterns:', error)
      throw error
    }
  }

  /**
   * Bulk conflict resolution
   */
  async bulkResolveConflicts(
    conflict_ids: string[],
    resolution_action: 'reschedule' | 'reassign' | 'cancel',
    options?: {
      new_date?: string
      new_time?: string
      new_therapist_id?: string
      new_room_id?: string
    }
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const conflict_id of conflict_ids) {
      try {
        // Get conflict details
        const { data: conflict, error: fetchError } = await supabase
          .from('schedule_conflicts')
          .select('*')
          .eq('id', conflict_id)
          .single()

        if (fetchError) throw fetchError

        // Create resolution based on action
        const resolution: ConflictResolution = {
          conflict_id,
          original_slot: conflict.original_slot,
          resolution_type: resolution_action === 'cancel' ? 'cancelled' : 
                          resolution_action === 'reassign' ? 'reassigned' : 'rescheduled',
          notes: `Bulk resolution: ${resolution_action}`,
          applied_at: new Date().toISOString()
        }

        // Add specific options
        if (resolution_action === 'reschedule' && options?.new_date && options?.new_time) {
          resolution.new_slot = {
            ...conflict.original_slot,
            session_date: options.new_date,
            start_time: options.new_time
          }
        } else if (resolution_action === 'reassign' && options?.new_therapist_id) {
          resolution.alternate_therapist_id = options.new_therapist_id
        }

        // Apply resolution
        const applied = await this.applyResolution(resolution)
        if (applied) {
          success++
        } else {
          failed++
          errors.push(`Failed to resolve conflict ${conflict_id}`)
        }
      } catch (error) {
        failed++
        errors.push(`Error resolving conflict ${conflict_id}: ${error}`)
      }
    }

    return { success, failed, errors }
  }

  // Helper methods

  private async checkSlotConflict(
    slot1: ScheduleSlot,
    slot2: ScheduleSlot
  ): Promise<ScheduleConflict | null> {
    // Check if slots are on the same date
    if (slot1.session_date !== slot2.session_date) return null

    // Check time overlap
    const slot1Start = this.parseTime(slot1.start_time)
    const slot1End = this.parseTime(slot1.end_time)
    const slot2Start = this.parseTime(slot2.start_time)
    const slot2End = this.parseTime(slot2.end_time)

    const hasTimeOverlap = (slot1Start < slot2End) && (slot2Start < slot1End)
    if (!hasTimeOverlap) return null

    // Check for specific conflict types
    if (slot1.therapist_id === slot2.therapist_id) {
      return {
        type: 'therapist',
        entity_id: slot1.therapist_id,
        conflicting_slots: [slot1, slot2],
        suggested_alternatives: []
      }
    }

    if (slot1.room_id && slot1.room_id === slot2.room_id) {
      return {
        type: 'room',
        entity_id: slot1.room_id,
        conflicting_slots: [slot1, slot2],
        suggested_alternatives: []
      }
    }

    if (slot1.student_id === slot2.student_id) {
      return {
        type: 'student',
        entity_id: slot1.student_id,
        conflicting_slots: [slot1, slot2],
        suggested_alternatives: []
      }
    }

    return null
  }

  private async checkDatabaseConflicts(slots: ScheduleSlot[]): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    for (const slot of slots) {
      // Check therapist conflicts
      const { data: therapistConflicts } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('therapist_id', slot.therapist_id)
        .eq('session_date', slot.session_date)
        .eq('status', 'scheduled')
        .neq('id', slot.id)

      if (therapistConflicts && therapistConflicts.length > 0) {
        const overlapping = therapistConflicts.filter(existing => 
          this.hasTimeOverlap(slot, existing)
        )
        
        if (overlapping.length > 0) {
          conflicts.push({
            type: 'therapist',
            entity_id: slot.therapist_id,
            conflicting_slots: [slot, ...overlapping],
            suggested_alternatives: []
          })
        }
      }

      // Check room conflicts if applicable
      if (slot.room_id) {
        const { data: roomConflicts } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('room_id', slot.room_id)
          .eq('session_date', slot.session_date)
          .eq('status', 'scheduled')
          .neq('id', slot.id)

        if (roomConflicts && roomConflicts.length > 0) {
          const overlapping = roomConflicts.filter(existing => 
            this.hasTimeOverlap(slot, existing)
          )
          
          if (overlapping.length > 0) {
            conflicts.push({
              type: 'room',
              entity_id: slot.room_id,
              conflicting_slots: [slot, ...overlapping],
              suggested_alternatives: []
            })
          }
        }
      }
    }

    return conflicts
  }

  private deduplicateConflicts(conflicts: ScheduleConflict[]): ScheduleConflict[] {
    const seen = new Set<string>()
    return conflicts.filter(conflict => {
      const key = `${conflict.type}-${conflict.entity_id}-${conflict.conflicting_slots.map(s => s.id).sort().join('-')}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private prioritizeConflicts(
    conflicts: ScheduleConflict[],
    rules: PriorityRule[]
  ): ScheduleConflict[] {
    return conflicts.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      for (const rule of rules) {
        switch (rule.criteria) {
          case 'severity':
            // More conflicting slots = higher severity
            scoreA += a.conflicting_slots.length * rule.weight
            scoreB += b.conflicting_slots.length * rule.weight
            break
          
          case 'program_type':
            // Could prioritize based on program importance
            // This would need additional data
            break
          
          case 'seniority':
            // Could prioritize based on enrollment date
            // This would need additional data
            break
        }
      }

      return scoreB - scoreA // Higher score = higher priority
    })
  }

  private async applyResolutionStrategy(
    conflict: ScheduleConflict,
    action: 'reschedule' | 'reassign' | 'split' | 'cancel'
  ): Promise<ConflictResolution | null> {
    const primarySlot = conflict.conflicting_slots[0]
    if (!primarySlot) return null

    const resolution: ConflictResolution = {
      conflict_id: crypto.randomUUID(),
      original_slot: primarySlot,
      resolution_type: action === 'cancel' ? 'cancelled' : 
                      action === 'reassign' ? 'reassigned' : 
                      action === 'split' ? 'split' : 'rescheduled',
      notes: `Auto-resolved: ${action}`,
      applied_at: new Date().toISOString()
    }

    switch (action) {
      case 'reschedule':
        const alternatives = conflict.suggested_alternatives || []
        if (alternatives.length > 0) {
          resolution.new_slot = alternatives[0]
        }
        break
      
      case 'reassign':
        if (conflict.type === 'therapist') {
          const alternateTherapist = await this.findAlternateTherapist(primarySlot)
          if (alternateTherapist) {
            resolution.alternate_therapist_id = alternateTherapist
          }
        }
        break
      
      case 'split':
        // Implementation for splitting sessions
        break
      
      case 'cancel':
        // No additional data needed for cancellation
        break
    }

    return resolution
  }

  private async generateRescheduleOptions(
    slot: ScheduleSlot,
    conflict: ScheduleConflict
  ): Promise<ConflictResolution[]> {
    const options: ConflictResolution[] = []
    const baseDate = new Date(slot.session_date)

    // Try next 5 business days
    for (let i = 1; i <= 5; i++) {
      const newDate = new Date(baseDate)
      newDate.setDate(newDate.getDate() + i)
      
      // Skip weekends
      if (newDate.getDay() === 0 || newDate.getDay() === 6) continue

      // Check availability
      const isAvailable = await this.checkSlotAvailability({
        ...slot,
        session_date: newDate.toISOString().split('T')[0]
      })

      if (isAvailable) {
        options.push({
          conflict_id: crypto.randomUUID(),
          original_slot: slot,
          resolution_type: 'rescheduled',
          new_slot: {
            ...slot,
            session_date: newDate.toISOString().split('T')[0]
          },
          notes: `Rescheduled to ${newDate.toISOString().split('T')[0]}`
        })

        if (options.length >= 3) break
      }
    }

    return options
  }

  private async generateReassignmentOptions(
    slot: ScheduleSlot
  ): Promise<ConflictResolution[]> {
    const options: ConflictResolution[] = []

    // Get available therapists
    const { data: therapists } = await supabase
      .from('therapists')
      .select('*')
      .eq('is_active', true)
      .neq('id', slot.therapist_id)

    if (!therapists) return options

    for (const therapist of therapists) {
      // Check therapist availability
      const isAvailable = await this.checkTherapistAvailability(
        therapist.id,
        slot.session_date,
        slot.start_time,
        slot.end_time
      )

      if (isAvailable) {
        options.push({
          conflict_id: crypto.randomUUID(),
          original_slot: slot,
          resolution_type: 'reassigned',
          alternate_therapist_id: therapist.id,
          notes: `Reassigned to therapist ${therapist.name_en}`
        })

        if (options.length >= 3) break
      }
    }

    return options
  }

  private async generateRoomChangeOptions(
    slot: ScheduleSlot
  ): Promise<ConflictResolution[]> {
    const options: ConflictResolution[] = []

    // Get available rooms
    const { data: rooms } = await supabase
      .from('therapy_rooms')
      .select('*')
      .eq('is_active', true)
      .neq('id', slot.room_id || '')

    if (!rooms) return options

    for (const room of rooms) {
      // Check room availability
      const isAvailable = await this.checkRoomAvailability(
        room.id,
        slot.session_date,
        slot.start_time,
        slot.end_time
      )

      if (isAvailable) {
        options.push({
          conflict_id: crypto.randomUUID(),
          original_slot: slot,
          resolution_type: 'reassigned',
          alternate_room_id: room.id,
          notes: `Changed to room ${room.name}`
        })

        if (options.length >= 3) break
      }
    }

    return options
  }

  private canSplitSession(slot: ScheduleSlot): boolean {
    // Can only split sessions longer than 60 minutes
    const duration = this.calculateDuration(slot.start_time, slot.end_time)
    return duration > 60
  }

  private async generateSplitOptions(
    slot: ScheduleSlot
  ): Promise<ConflictResolution[]> {
    const duration = this.calculateDuration(slot.start_time, slot.end_time)
    const halfDuration = Math.floor(duration / 2)

    const midTime = new Date(`2000-01-01T${slot.start_time}`)
    midTime.setMinutes(midTime.getMinutes() + halfDuration)
    const midTimeStr = midTime.toTimeString().slice(0, 5)

    return [{
      conflict_id: crypto.randomUUID(),
      original_slot: slot,
      resolution_type: 'split',
      new_slot: {
        ...slot,
        id: crypto.randomUUID(),
        end_time: midTimeStr
      },
      notes: `Split into two ${halfDuration}-minute sessions`
    }]
  }

  private async applyReschedule(resolution: ConflictResolution): Promise<boolean> {
    if (!resolution.new_slot) return false

    const { error } = await supabase
      .from('schedule_slots')
      .update({
        session_date: resolution.new_slot.session_date,
        start_time: resolution.new_slot.start_time,
        end_time: resolution.new_slot.end_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolution.original_slot.id)

    return !error
  }

  private async applyReassignment(resolution: ConflictResolution): Promise<boolean> {
    const updates: any = {}
    
    if (resolution.alternate_therapist_id) {
      updates.therapist_id = resolution.alternate_therapist_id
    }
    
    if (resolution.alternate_room_id) {
      updates.room_id = resolution.alternate_room_id
    }

    if (Object.keys(updates).length === 0) return false

    const { error } = await supabase
      .from('schedule_slots')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolution.original_slot.id)

    return !error
  }

  private async applySplit(resolution: ConflictResolution): Promise<boolean> {
    if (!resolution.new_slot) return false

    // Update original slot
    const { error: updateError } = await supabase
      .from('schedule_slots')
      .update({
        end_time: resolution.new_slot.end_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolution.original_slot.id)

    if (updateError) return false

    // Create second slot
    const secondSlotStart = new Date(`2000-01-01T${resolution.new_slot.end_time}`)
    secondSlotStart.setMinutes(secondSlotStart.getMinutes() + 15) // 15-minute break

    const { error: insertError } = await supabase
      .from('schedule_slots')
      .insert({
        ...resolution.original_slot,
        id: crypto.randomUUID(),
        start_time: secondSlotStart.toTimeString().slice(0, 5),
        notes: 'Split session - Part 2'
      })

    return !insertError
  }

  private async applyCancel(resolution: ConflictResolution): Promise<boolean> {
    const { error } = await supabase
      .from('schedule_slots')
      .update({
        status: 'cancelled',
        notes: resolution.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolution.original_slot.id)

    return !error
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  private hasTimeOverlap(slot1: ScheduleSlot, slot2: ScheduleSlot): boolean {
    const slot1Start = this.parseTime(slot1.start_time)
    const slot1End = this.parseTime(slot1.end_time)
    const slot2Start = this.parseTime(slot2.start_time)
    const slot2End = this.parseTime(slot2.end_time)

    return (slot1Start < slot2End) && (slot2Start < slot1End)
  }

  private getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayIndex]
  }

  private calculateDuration(startTime: string, endTime: string): number {
    return this.parseTime(endTime) - this.parseTime(startTime)
  }

  private async checkSlotAvailability(slot: ScheduleSlot): Promise<boolean> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id')
      .eq('therapist_id', slot.therapist_id)
      .eq('session_date', slot.session_date)
      .eq('status', 'scheduled')
      .neq('id', slot.id)

    if (error) return false

    return !data || data.length === 0 || !data.some(existing => 
      this.hasTimeOverlap(slot, { ...slot, ...existing })
    )
  }

  private async checkTherapistAvailability(
    therapist_id: string,
    date: string,
    start_time: string,
    end_time: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('therapist_id', therapist_id)
      .eq('session_date', date)
      .eq('status', 'scheduled')

    if (error) return false

    return !data || data.length === 0 || !data.some(existing => 
      this.hasTimeOverlap(
        { start_time, end_time } as ScheduleSlot,
        existing
      )
    )
  }

  private async checkRoomAvailability(
    room_id: string,
    date: string,
    start_time: string,
    end_time: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('room_id', room_id)
      .eq('session_date', date)
      .eq('status', 'scheduled')

    if (error) return false

    return !data || data.length === 0 || !data.some(existing => 
      this.hasTimeOverlap(
        { start_time, end_time } as ScheduleSlot,
        existing
      )
    )
  }

  private async findAlternateTherapist(slot: ScheduleSlot): Promise<string | null> {
    const { data: therapists } = await supabase
      .from('therapists')
      .select('id')
      .eq('is_active', true)
      .neq('id', slot.therapist_id)

    if (!therapists || therapists.length === 0) return null

    for (const therapist of therapists) {
      const isAvailable = await this.checkTherapistAvailability(
        therapist.id,
        slot.session_date,
        slot.start_time,
        slot.end_time
      )

      if (isAvailable) return therapist.id
    }

    return null
  }
}

export const scheduleConflictResolutionService = new ScheduleConflictResolutionService()