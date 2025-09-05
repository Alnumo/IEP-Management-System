// Story 6.1: Individual schedule modification and management service

import { supabase } from '@/lib/supabase'
import type { ScheduleSlot } from './individualized-scheduling-service'
import type { CustomSchedule } from '@/types/individualized-enrollment'

export interface ScheduleModificationRequest {
  enrollment_id: string
  modification_type: 'reschedule' | 'cancel' | 'pause' | 'resume' | 'extend' | 'intensity_change'
  effective_date: string
  end_date?: string
  reason: string
  requested_by: string
  details: ModificationDetails
}

export interface ModificationDetails {
  // For reschedule
  new_date?: string
  new_time?: string
  new_duration?: number
  
  // For pause/resume
  pause_duration_weeks?: number
  resume_with_makeup?: boolean
  
  // For extend
  extension_weeks?: number
  maintain_intensity?: boolean
  
  // For intensity change
  new_sessions_per_week?: number
  new_session_duration?: number
  apply_retroactively?: boolean
}

export interface ModificationHistory {
  id: string
  enrollment_id: string
  modification_type: string
  requested_at: string
  applied_at?: string
  requested_by: string
  approved_by?: string
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  original_values: any
  new_values: any
  affected_sessions: number
  notes: string
}

export interface ScheduleAdjustmentOptions {
  allow_weekend_sessions: boolean
  allow_evening_sessions: boolean
  preferred_time_slots: string[]
  blackout_dates: string[]
  therapist_preference: 'keep_current' | 'allow_change' | 'require_same_specialization'
  room_preference: 'keep_current' | 'any_available' | 'specific_rooms'
  makeup_session_window_days: number
}

export interface MakeupSession {
  original_session_id: string
  original_date: string
  makeup_date?: string
  makeup_time?: string
  status: 'pending' | 'scheduled' | 'completed' | 'expired'
  expiry_date: string
  reason: string
}

class ScheduleModificationService {
  /**
   * Process a schedule modification request
   */
  async processModificationRequest(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string; affected_sessions?: ScheduleSlot[] }> {
    try {
      // Validate request
      const validation = await this.validateModificationRequest(request)
      if (!validation.valid) {
        return { success: false, message: validation.message || 'Invalid request' }
      }

      // Process based on modification type
      switch (request.modification_type) {
        case 'reschedule':
          return await this.processReschedule(request)
        
        case 'cancel':
          return await this.processCancel(request)
        
        case 'pause':
          return await this.processPause(request)
        
        case 'resume':
          return await this.processResume(request)
        
        case 'extend':
          return await this.processExtension(request)
        
        case 'intensity_change':
          return await this.processIntensityChange(request)
        
        default:
          return { success: false, message: 'Unknown modification type' }
      }
    } catch (error) {
      console.error('Error processing modification request:', error)
      return { success: false, message: `Error: ${error}` }
    }
  }

  /**
   * Reschedule individual sessions
   */
  async rescheduleSession(
    session_id: string,
    new_date: string,
    new_time: string,
    options?: {
      notify_participants?: boolean
      check_conflicts?: boolean
      auto_resolve_conflicts?: boolean
    }
  ): Promise<{ success: boolean; conflicts?: any[]; new_slot?: ScheduleSlot }> {
    try {
      // Get original session
      const { data: originalSession, error: fetchError } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('id', session_id)
        .single()

      if (fetchError || !originalSession) {
        return { success: false }
      }

      // Calculate new end time based on duration
      const duration = this.calculateDuration(
        originalSession.start_time,
        originalSession.end_time
      )
      const newEndTime = this.calculateEndTime(new_time, duration)

      // Create new slot
      const newSlot: ScheduleSlot = {
        ...originalSession,
        session_date: new_date,
        start_time: new_time,
        end_time: newEndTime
      }

      // Check for conflicts if requested
      if (options?.check_conflicts) {
        const conflicts = await this.checkSessionConflicts(newSlot)
        if (conflicts.length > 0) {
          if (!options.auto_resolve_conflicts) {
            return { success: false, conflicts }
          }
          // Auto-resolve conflicts
          await this.autoResolveConflicts(conflicts, newSlot)
        }
      }

      // Update the session
      const { error: updateError } = await supabase
        .from('schedule_slots')
        .update({
          session_date: new_date,
          start_time: new_time,
          end_time: newEndTime,
          updated_at: new Date().toISOString(),
          notes: `Rescheduled from ${originalSession.session_date} ${originalSession.start_time}`
        })
        .eq('id', session_id)

      if (updateError) {
        return { success: false }
      }

      // Log the modification
      await this.logModification({
        enrollment_id: originalSession.enrollment_id,
        modification_type: 'reschedule',
        original_values: {
          date: originalSession.session_date,
          time: originalSession.start_time
        },
        new_values: {
          date: new_date,
          time: new_time
        },
        affected_sessions: 1
      })

      return { success: true, new_slot: newSlot }
    } catch (error) {
      console.error('Error rescheduling session:', error)
      return { success: false }
    }
  }

  /**
   * Pause enrollment schedule
   */
  async pauseEnrollmentSchedule(
    enrollment_id: string,
    pause_start_date: string,
    pause_duration_weeks: number,
    options?: {
      cancel_sessions_during_pause?: boolean
      auto_extend_enrollment?: boolean
      create_makeup_sessions?: boolean
    }
  ): Promise<{ success: boolean; resume_date: string; affected_sessions: number }> {
    try {
      const pauseEndDate = new Date(pause_start_date)
      pauseEndDate.setDate(pauseEndDate.getDate() + (pause_duration_weeks * 7))

      // Get affected sessions
      const { data: affectedSessions, error: fetchError } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('enrollment_id', enrollment_id)
        .eq('status', 'scheduled')
        .gte('session_date', pause_start_date)
        .lte('session_date', pauseEndDate.toISOString())

      if (fetchError) throw fetchError

      const affectedCount = affectedSessions?.length || 0

      if (options?.cancel_sessions_during_pause && affectedSessions) {
        // Cancel sessions during pause period
        const sessionIds = affectedSessions.map(s => s.id)
        await supabase
          .from('schedule_slots')
          .update({
            status: 'cancelled',
            notes: 'Enrollment paused',
            updated_at: new Date().toISOString()
          })
          .in('id', sessionIds)

        // Create makeup sessions if requested
        if (options.create_makeup_sessions) {
          await this.createMakeupSessions(affectedSessions, pauseEndDate)
        }
      }

      // Update enrollment status
      await supabase
        .from('student_subscriptions')
        .update({
          enrollment_status: 'paused',
          pause_start_date: pause_start_date,
          pause_end_date: pauseEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      // Extend enrollment end date if requested
      if (options?.auto_extend_enrollment) {
        await this.extendEnrollmentDuration(enrollment_id, pause_duration_weeks)
      }

      // Log the pause
      await this.logModification({
        enrollment_id,
        modification_type: 'pause',
        original_values: { status: 'active' },
        new_values: {
          status: 'paused',
          pause_duration: pause_duration_weeks,
          resume_date: pauseEndDate.toISOString()
        },
        affected_sessions: affectedCount
      })

      return {
        success: true,
        resume_date: pauseEndDate.toISOString(),
        affected_sessions: affectedCount
      }
    } catch (error) {
      console.error('Error pausing enrollment:', error)
      return {
        success: false,
        resume_date: '',
        affected_sessions: 0
      }
    }
  }

  /**
   * Resume paused enrollment
   */
  async resumeEnrollmentSchedule(
    enrollment_id: string,
    resume_date: string,
    options?: {
      regenerate_schedule?: boolean
      use_original_schedule?: boolean
      apply_makeup_sessions?: boolean
    }
  ): Promise<{ success: boolean; sessions_created: number }> {
    try {
      // Get enrollment details
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', enrollment_id)
        .single()

      if (enrollmentError || !enrollment) {
        return { success: false, sessions_created: 0 }
      }

      // Update enrollment status
      await supabase
        .from('student_subscriptions')
        .update({
          enrollment_status: 'active',
          pause_start_date: null,
          pause_end_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      let sessionsCreated = 0

      if (options?.regenerate_schedule) {
        // Generate new schedule from resume date
        const { individualizedSchedulingService } = await import('./individualized-scheduling-service')
        const newSlots = await individualizedSchedulingService.generateIndividualSchedule({
          enrollment_id,
          start_date: resume_date,
          end_date: enrollment.individual_end_date,
          custom_schedule: enrollment.custom_schedule,
          therapist_id: enrollment.assigned_therapist_id
        })
        sessionsCreated = newSlots.length
      } else if (options?.use_original_schedule) {
        // Reactivate cancelled sessions
        const { data: cancelledSessions } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('enrollment_id', enrollment_id)
          .eq('status', 'cancelled')
          .gte('session_date', resume_date)

        if (cancelledSessions && cancelledSessions.length > 0) {
          await supabase
            .from('schedule_slots')
            .update({
              status: 'scheduled',
              notes: 'Resumed from pause',
              updated_at: new Date().toISOString()
            })
            .in('id', cancelledSessions.map(s => s.id))
          sessionsCreated = cancelledSessions.length
        }
      }

      // Apply makeup sessions if requested
      if (options?.apply_makeup_sessions) {
        const makeupCount = await this.scheduleMakeupSessions(enrollment_id, resume_date)
        sessionsCreated += makeupCount
      }

      // Log the resume
      await this.logModification({
        enrollment_id,
        modification_type: 'resume',
        original_values: { status: 'paused' },
        new_values: {
          status: 'active',
          resume_date,
          sessions_created: sessionsCreated
        },
        affected_sessions: sessionsCreated
      })

      return { success: true, sessions_created: sessionsCreated }
    } catch (error) {
      console.error('Error resuming enrollment:', error)
      return { success: false, sessions_created: 0 }
    }
  }

  /**
   * Change session intensity
   */
  async changeSessionIntensity(
    enrollment_id: string,
    new_sessions_per_week: number,
    new_duration_minutes: number,
    effective_date: string
  ): Promise<{ success: boolean; sessions_modified: number }> {
    try {
      // Get enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', enrollment_id)
        .single()

      if (enrollmentError || !enrollment) {
        return { success: false, sessions_modified: 0 }
      }

      // Update custom schedule
      const updatedSchedule: CustomSchedule = {
        ...enrollment.custom_schedule,
        sessions_per_week: new_sessions_per_week,
        session_duration_minutes: new_duration_minutes
      }

      // Update enrollment
      await supabase
        .from('student_subscriptions')
        .update({
          custom_schedule: updatedSchedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      // Cancel future sessions after effective date
      const { data: futureSessions } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('enrollment_id', enrollment_id)
        .eq('status', 'scheduled')
        .gte('session_date', effective_date)

      if (futureSessions && futureSessions.length > 0) {
        await supabase
          .from('schedule_slots')
          .update({
            status: 'cancelled',
            notes: 'Intensity change - rescheduling required'
          })
          .in('id', futureSessions.map(s => s.id))
      }

      // Generate new schedule with updated intensity
      const { individualizedSchedulingService } = await import('./individualized-scheduling-service')
      const newSlots = await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id,
        start_date: effective_date,
        end_date: enrollment.individual_end_date,
        custom_schedule: updatedSchedule,
        therapist_id: enrollment.assigned_therapist_id
      })

      // Log the change
      await this.logModification({
        enrollment_id,
        modification_type: 'intensity_change',
        original_values: {
          sessions_per_week: enrollment.custom_schedule.sessions_per_week,
          duration: enrollment.custom_schedule.session_duration_minutes
        },
        new_values: {
          sessions_per_week: new_sessions_per_week,
          duration: new_duration_minutes
        },
        affected_sessions: newSlots.length
      })

      return { success: true, sessions_modified: newSlots.length }
    } catch (error) {
      console.error('Error changing session intensity:', error)
      return { success: false, sessions_modified: 0 }
    }
  }

  /**
   * Extend enrollment duration
   */
  async extendEnrollmentDuration(
    enrollment_id: string,
    extension_weeks: number,
    options?: {
      maintain_current_schedule?: boolean
      adjust_goals?: boolean
      prorate_fees?: boolean
    }
  ): Promise<{ success: boolean; new_end_date: string }> {
    try {
      // Get enrollment
      const { data: enrollment, error: fetchError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', enrollment_id)
        .single()

      if (fetchError || !enrollment) {
        return { success: false, new_end_date: '' }
      }

      // Calculate new end date
      const currentEndDate = new Date(enrollment.individual_end_date)
      const newEndDate = new Date(currentEndDate)
      newEndDate.setDate(newEndDate.getDate() + (extension_weeks * 7))

      // Update enrollment
      await supabase
        .from('student_subscriptions')
        .update({
          individual_end_date: newEndDate.toISOString(),
          program_modifications: {
            ...enrollment.program_modifications,
            extended: true,
            extension_weeks,
            extension_date: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      // Generate sessions for extension period if requested
      if (options?.maintain_current_schedule) {
        const { individualizedSchedulingService } = await import('./individualized-scheduling-service')
        await individualizedSchedulingService.generateIndividualSchedule({
          enrollment_id,
          start_date: currentEndDate.toISOString(),
          end_date: newEndDate.toISOString(),
          custom_schedule: enrollment.custom_schedule,
          therapist_id: enrollment.assigned_therapist_id
        })
      }

      // Log the extension
      await this.logModification({
        enrollment_id,
        modification_type: 'extend',
        original_values: {
          end_date: enrollment.individual_end_date
        },
        new_values: {
          end_date: newEndDate.toISOString(),
          extension_weeks
        },
        affected_sessions: 0
      })

      return { success: true, new_end_date: newEndDate.toISOString() }
    } catch (error) {
      console.error('Error extending enrollment:', error)
      return { success: false, new_end_date: '' }
    }
  }

  /**
   * Create makeup sessions for cancelled sessions
   */
  async createMakeupSessions(
    cancelled_sessions: ScheduleSlot[],
    available_after: Date,
    expiry_window_days: number = 30
  ): Promise<MakeupSession[]> {
    const makeupSessions: MakeupSession[] = []

    for (const session of cancelled_sessions) {
      const expiryDate = new Date(available_after)
      expiryDate.setDate(expiryDate.getDate() + expiry_window_days)

      const makeupSession: MakeupSession = {
        original_session_id: session.id,
        original_date: session.session_date,
        status: 'pending',
        expiry_date: expiryDate.toISOString(),
        reason: 'Enrollment pause'
      }

      // Store in database
      const { data, error } = await supabase
        .from('makeup_sessions')
        .insert(makeupSession)
        .select()
        .single()

      if (!error && data) {
        makeupSessions.push(data)
      }
    }

    return makeupSessions
  }

  /**
   * Schedule pending makeup sessions
   */
  async scheduleMakeupSessions(
    enrollment_id: string,
    start_date: string
  ): Promise<number> {
    try {
      // Get pending makeup sessions
      const { data: makeupSessions, error: fetchError } = await supabase
        .from('makeup_sessions')
        .select('*')
        .eq('enrollment_id', enrollment_id)
        .eq('status', 'pending')
        .gte('expiry_date', new Date().toISOString())

      if (fetchError || !makeupSessions || makeupSessions.length === 0) {
        return 0
      }

      let scheduled = 0
      const currentDate = new Date(start_date)

      for (const makeup of makeupSessions) {
        // Find available slot
        const availableSlot = await this.findNextAvailableSlot(
          enrollment_id,
          currentDate.toISOString()
        )

        if (availableSlot) {
          // Create new session
          await supabase
            .from('schedule_slots')
            .insert({
              ...availableSlot,
              notes: `Makeup session for ${makeup.original_date}`
            })

          // Update makeup session status
          await supabase
            .from('makeup_sessions')
            .update({
              status: 'scheduled',
              makeup_date: availableSlot.session_date,
              makeup_time: availableSlot.start_time
            })
            .eq('id', makeup.id)

          scheduled++
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      return scheduled
    } catch (error) {
      console.error('Error scheduling makeup sessions:', error)
      return 0
    }
  }

  /**
   * Get modification history for an enrollment
   */
  async getModificationHistory(
    enrollment_id: string,
    options?: {
      start_date?: string
      end_date?: string
      modification_types?: string[]
      limit?: number
    }
  ): Promise<ModificationHistory[]> {
    try {
      let query = supabase
        .from('schedule_modifications')
        .select('*')
        .eq('enrollment_id', enrollment_id)
        .order('requested_at', { ascending: false })

      if (options?.start_date) {
        query = query.gte('requested_at', options.start_date)
      }

      if (options?.end_date) {
        query = query.lte('requested_at', options.end_date)
      }

      if (options?.modification_types && options.modification_types.length > 0) {
        query = query.in('modification_type', options.modification_types)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching modification history:', error)
      return []
    }
  }

  /**
   * Apply bulk modifications to multiple enrollments
   */
  async applyBulkModifications(
    enrollment_ids: string[],
    modification: Partial<ScheduleModificationRequest>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const enrollment_id of enrollment_ids) {
      try {
        const request: ScheduleModificationRequest = {
          enrollment_id,
          modification_type: modification.modification_type || 'reschedule',
          effective_date: modification.effective_date || new Date().toISOString(),
          reason: modification.reason || 'Bulk modification',
          requested_by: modification.requested_by || 'system',
          details: modification.details || {}
        }

        const result = await this.processModificationRequest(request)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${enrollment_id}: ${result.message}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`${enrollment_id}: ${error}`)
      }
    }

    return results
  }

  // Helper methods

  private async validateModificationRequest(
    request: ScheduleModificationRequest
  ): Promise<{ valid: boolean; message?: string }> {
    // Check enrollment exists
    const { data: enrollment, error } = await supabase
      .from('student_subscriptions')
      .select('*')
      .eq('id', request.enrollment_id)
      .single()

    if (error || !enrollment) {
      return { valid: false, message: 'Enrollment not found' }
    }

    // Validate effective date
    if (new Date(request.effective_date) < new Date()) {
      return { valid: false, message: 'Effective date cannot be in the past' }
    }

    // Type-specific validation
    switch (request.modification_type) {
      case 'pause':
        if (!request.details.pause_duration_weeks) {
          return { valid: false, message: 'Pause duration required' }
        }
        break
      
      case 'extend':
        if (!request.details.extension_weeks) {
          return { valid: false, message: 'Extension duration required' }
        }
        break
      
      case 'intensity_change':
        if (!request.details.new_sessions_per_week) {
          return { valid: false, message: 'New session frequency required' }
        }
        break
    }

    return { valid: true }
  }

  private async processReschedule(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string; affected_sessions?: ScheduleSlot[] }> {
    if (!request.details.new_date || !request.details.new_time) {
      return { success: false, message: 'New date and time required' }
    }

    // Get sessions to reschedule
    const { data: sessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', request.enrollment_id)
      .eq('status', 'scheduled')
      .gte('session_date', request.effective_date)

    if (!sessions || sessions.length === 0) {
      return { success: false, message: 'No sessions to reschedule' }
    }

    const affectedSessions: ScheduleSlot[] = []

    for (const session of sessions) {
      const result = await this.rescheduleSession(
        session.id,
        request.details.new_date,
        request.details.new_time,
        { check_conflicts: true }
      )

      if (result.success && result.new_slot) {
        affectedSessions.push(result.new_slot)
      }
    }

    return {
      success: true,
      message: `Rescheduled ${affectedSessions.length} sessions`,
      affected_sessions: affectedSessions
    }
  }

  private async processCancel(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const { data: sessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', request.enrollment_id)
      .eq('status', 'scheduled')
      .gte('session_date', request.effective_date)

    if (!sessions || sessions.length === 0) {
      return { success: false, message: 'No sessions to cancel' }
    }

    await supabase
      .from('schedule_slots')
      .update({
        status: 'cancelled',
        notes: request.reason,
        updated_at: new Date().toISOString()
      })
      .in('id', sessions.map(s => s.id))

    return { success: true, message: `Cancelled ${sessions.length} sessions` }
  }

  private async processPause(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.pauseEnrollmentSchedule(
      request.enrollment_id,
      request.effective_date,
      request.details.pause_duration_weeks || 4,
      {
        cancel_sessions_during_pause: true,
        auto_extend_enrollment: true,
        create_makeup_sessions: request.details.resume_with_makeup
      }
    )

    return {
      success: result.success,
      message: result.success 
        ? `Paused until ${result.resume_date}, ${result.affected_sessions} sessions affected`
        : 'Failed to pause enrollment'
    }
  }

  private async processResume(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.resumeEnrollmentSchedule(
      request.enrollment_id,
      request.effective_date,
      {
        regenerate_schedule: true,
        apply_makeup_sessions: request.details.resume_with_makeup
      }
    )

    return {
      success: result.success,
      message: result.success 
        ? `Resumed with ${result.sessions_created} new sessions`
        : 'Failed to resume enrollment'
    }
  }

  private async processExtension(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.extendEnrollmentDuration(
      request.enrollment_id,
      request.details.extension_weeks || 4,
      { maintain_current_schedule: request.details.maintain_intensity }
    )

    return {
      success: result.success,
      message: result.success 
        ? `Extended until ${result.new_end_date}`
        : 'Failed to extend enrollment'
    }
  }

  private async processIntensityChange(
    request: ScheduleModificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.changeSessionIntensity(
      request.enrollment_id,
      request.details.new_sessions_per_week || 2,
      request.details.new_session_duration || 60,
      request.effective_date
    )

    return {
      success: result.success,
      message: result.success 
        ? `Intensity changed, ${result.sessions_modified} sessions modified`
        : 'Failed to change intensity'
    }
  }

  private calculateDuration(start_time: string, end_time: string): number {
    const [startHours, startMinutes] = start_time.split(':').map(Number)
    const [endHours, endMinutes] = end_time.split(':').map(Number)
    return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  }

  private calculateEndTime(start_time: string, duration_minutes: number): string {
    const [hours, minutes] = start_time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + duration_minutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  private async checkSessionConflicts(slot: ScheduleSlot): Promise<any[]> {
    const { scheduleConflictResolutionService } = await import('./schedule-conflict-resolution-service')
    const conflicts = await scheduleConflictResolutionService.detectConflictsInSchedule([slot])
    return conflicts
  }

  private async autoResolveConflicts(conflicts: any[], newSlot: ScheduleSlot): Promise<void> {
    const { scheduleConflictResolutionService } = await import('./schedule-conflict-resolution-service')
    await scheduleConflictResolutionService.autoResolveConflicts(conflicts, {
      type: 'auto',
      priority_rules: [
        { criteria: 'severity', weight: 1, order: 'desc' }
      ],
      resolution_preferences: [
        { conflict_type: 'therapist', preferred_action: 'reschedule', auto_apply: true },
        { conflict_type: 'room', preferred_action: 'reassign', auto_apply: true },
        { conflict_type: 'student', preferred_action: 'reschedule', auto_apply: true }
      ]
    })
  }

  private async logModification(details: {
    enrollment_id: string
    modification_type: string
    original_values: any
    new_values: any
    affected_sessions: number
  }): Promise<void> {
    await supabase
      .from('schedule_modifications')
      .insert({
        enrollment_id: details.enrollment_id,
        modification_type: details.modification_type,
        requested_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
        status: 'applied',
        original_values: details.original_values,
        new_values: details.new_values,
        affected_sessions: details.affected_sessions,
        notes: 'Automated modification'
      })
  }

  private async findNextAvailableSlot(
    enrollment_id: string,
    after_date: string
  ): Promise<ScheduleSlot | null> {
    // Get enrollment details
    const { data: enrollment } = await supabase
      .from('student_subscriptions')
      .select('*')
      .eq('id', enrollment_id)
      .single()

    if (!enrollment) return null

    // Use scheduling service to find slot
    const { individualizedSchedulingService } = await import('./individualized-scheduling-service')
    
    // This is a simplified version - would need more sophisticated logic
    const currentDate = new Date(after_date)
    const slot: ScheduleSlot = {
      id: crypto.randomUUID(),
      enrollment_id,
      student_id: enrollment.student_id,
      therapist_id: enrollment.assigned_therapist_id,
      session_date: currentDate.toISOString().split('T')[0],
      start_time: enrollment.custom_schedule.preferred_times[0] || '10:00',
      end_time: this.calculateEndTime(
        enrollment.custom_schedule.preferred_times[0] || '10:00',
        enrollment.custom_schedule.session_duration_minutes
      ),
      session_type: 'individual',
      status: 'scheduled'
    }

    return slot
  }
}

export const scheduleModificationService = new ScheduleModificationService()