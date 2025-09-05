// Story 6.1: Cohort scheduling service for managing group program activities

import { supabase } from '@/lib/supabase'
import type { ScheduleSlot } from './individualized-scheduling-service'
import type { IndividualizedEnrollment } from '@/types/individualized-enrollment'

export interface ProgramCohort {
  id: string
  program_template_id: string
  cohort_name: string
  start_date: string
  end_date: string
  enrollment_ids: string[]
  shared_activities: SharedActivity[]
  cohort_settings: CohortSettings
  status: 'active' | 'completed' | 'paused'
  created_at: string
  created_by: string
}

export interface SharedActivity {
  id: string
  activity_type: 'group_therapy' | 'assessment' | 'parent_meeting' | 'workshop' | 'social_activity'
  activity_name: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'one_time'
  day_of_week?: number // 0-6, Sunday-Saturday
  preferred_time: string
  duration_minutes: number
  therapist_ids: string[]
  room_requirements: RoomRequirements
  min_participants: number
  max_participants: number
  mandatory: boolean
}

export interface CohortSettings {
  allow_individual_modifications: boolean
  sync_schedule_changes: boolean
  maintain_group_consistency: boolean
  auto_fill_absences: boolean
  notification_settings: {
    notify_on_changes: boolean
    notify_on_cancellations: boolean
    advance_notice_hours: number
  }
}

export interface RoomRequirements {
  room_type: 'standard' | 'large_group' | 'sensory' | 'gym' | 'outdoor'
  min_capacity: number
  equipment_needed: string[]
  accessibility_requirements: string[]
}

export interface CohortScheduleResult {
  cohort_id: string
  shared_sessions: ScheduleSlot[]
  individual_sessions: Map<string, ScheduleSlot[]>
  conflicts: Array<{
    session: ScheduleSlot
    conflict_type: string
    resolution_needed: boolean
  }>
  statistics: {
    total_shared_sessions: number
    total_individual_sessions: number
    conflicts_detected: number
    auto_resolved: number
  }
}

export interface CohortMember {
  enrollment_id: string
  student_id: string
  student_name_ar: string
  student_name_en: string
  participation_rate: number
  attendance_rate: number
  special_requirements: string[]
  opt_out_activities: string[]
}

class CohortSchedulingService {
  /**
   * Create a new program cohort
   */
  async createProgramCohort(
    program_template_id: string,
    enrollment_ids: string[],
    settings: {
      cohort_name: string
      start_date: string
      end_date: string
      shared_activities: SharedActivity[]
      cohort_settings?: Partial<CohortSettings>
    }
  ): Promise<{ success: boolean; cohort: ProgramCohort | null; message: string }> {
    try {
      // Validate enrollments belong to same program template
      const validation = await this.validateCohortEnrollments(enrollment_ids, program_template_id)
      if (!validation.valid) {
        return { success: false, cohort: null, message: validation.message || 'Invalid enrollments' }
      }

      // Create cohort
      const cohort: ProgramCohort = {
        id: crypto.randomUUID(),
        program_template_id,
        cohort_name: settings.cohort_name,
        start_date: settings.start_date,
        end_date: settings.end_date,
        enrollment_ids,
        shared_activities: settings.shared_activities,
        cohort_settings: {
          allow_individual_modifications: true,
          sync_schedule_changes: true,
          maintain_group_consistency: true,
          auto_fill_absences: false,
          notification_settings: {
            notify_on_changes: true,
            notify_on_cancellations: true,
            advance_notice_hours: 24
          },
          ...settings.cohort_settings
        },
        status: 'active',
        created_at: new Date().toISOString(),
        created_by: 'system'
      }

      // Save to database
      const { data, error } = await supabase
        .from('program_cohorts')
        .insert(cohort)
        .select()
        .single()

      if (error) {
        return { success: false, cohort: null, message: `Database error: ${error.message}` }
      }

      // Update enrollments with cohort reference
      await supabase
        .from('student_subscriptions')
        .update({ 
          cohort_id: cohort.id,
          updated_at: new Date().toISOString()
        })
        .in('id', enrollment_ids)

      return { success: true, cohort: data, message: 'Cohort created successfully' }
    } catch (error) {
      console.error('Error creating program cohort:', error)
      return { success: false, cohort: null, message: `Error: ${error}` }
    }
  }

  /**
   * Generate schedule for entire cohort
   */
  async generateCohortSchedule(
    cohort_id: string,
    options?: {
      include_individual_sessions?: boolean
      auto_resolve_conflicts?: boolean
      respect_individual_preferences?: boolean
    }
  ): Promise<CohortScheduleResult> {
    try {
      // Get cohort details
      const { data: cohort, error: cohortError } = await supabase
        .from('program_cohorts')
        .select('*')
        .eq('id', cohort_id)
        .single()

      if (cohortError || !cohort) {
        throw new Error('Cohort not found')
      }

      const result: CohortScheduleResult = {
        cohort_id,
        shared_sessions: [],
        individual_sessions: new Map(),
        conflicts: [],
        statistics: {
          total_shared_sessions: 0,
          total_individual_sessions: 0,
          conflicts_detected: 0,
          auto_resolved: 0
        }
      }

      // Generate shared activity sessions
      for (const activity of cohort.shared_activities) {
        const sessions = await this.generateSharedActivitySessions(
          cohort,
          activity
        )
        result.shared_sessions.push(...sessions)
      }

      result.statistics.total_shared_sessions = result.shared_sessions.length

      // Generate individual sessions if requested
      if (options?.include_individual_sessions) {
        for (const enrollment_id of cohort.enrollment_ids) {
          const individualSessions = await this.generateIndividualSessionsWithCohortConstraints(
            enrollment_id,
            cohort,
            result.shared_sessions,
            options.respect_individual_preferences || false
          )
          result.individual_sessions.set(enrollment_id, individualSessions)
          result.statistics.total_individual_sessions += individualSessions.length
        }
      }

      // Check for conflicts
      const allSessions = [
        ...result.shared_sessions,
        ...Array.from(result.individual_sessions.values()).flat()
      ]

      const conflicts = await this.detectCohortConflicts(allSessions)
      result.conflicts = conflicts
      result.statistics.conflicts_detected = conflicts.length

      // Auto-resolve conflicts if requested
      if (options?.auto_resolve_conflicts && conflicts.length > 0) {
        const resolved = await this.resolveCohortConflicts(conflicts, cohort.cohort_settings)
        result.statistics.auto_resolved = resolved
      }

      // Save schedule to database
      await this.saveCohortSchedule(result)

      return result
    } catch (error) {
      console.error('Error generating cohort schedule:', error)
      throw error
    }
  }

  /**
   * Synchronize individual schedules within cohort
   */
  async synchronizeCohortSchedules(
    cohort_id: string,
    sync_type: 'full' | 'shared_only' | 'individual_only'
  ): Promise<{ success: boolean; synchronized: number; conflicts: number }> {
    try {
      // Get cohort and all its enrollments
      const { data: cohort } = await supabase
        .from('program_cohorts')
        .select('*')
        .eq('id', cohort_id)
        .single()

      if (!cohort) {
        return { success: false, synchronized: 0, conflicts: 0 }
      }

      // Get all schedules for cohort members
      const { data: schedules } = await supabase
        .from('schedule_slots')
        .select('*')
        .in('enrollment_id', cohort.enrollment_ids)
        .eq('status', 'scheduled')

      if (!schedules) {
        return { success: false, synchronized: 0, conflicts: 0 }
      }

      let synchronized = 0
      let conflicts = 0

      // Group schedules by type
      const sharedSchedules = schedules.filter(s => s.session_type === 'group')
      const individualSchedules = schedules.filter(s => s.session_type === 'individual')

      // Synchronize based on type
      if (sync_type === 'full' || sync_type === 'shared_only') {
        const syncResult = await this.synchronizeSharedSessions(
          cohort,
          sharedSchedules
        )
        synchronized += syncResult.synchronized
        conflicts += syncResult.conflicts
      }

      if (sync_type === 'full' || sync_type === 'individual_only') {
        const syncResult = await this.synchronizeIndividualSessions(
          cohort,
          individualSchedules
        )
        synchronized += syncResult.synchronized
        conflicts += syncResult.conflicts
      }

      return { success: true, synchronized, conflicts }
    } catch (error) {
      console.error('Error synchronizing cohort schedules:', error)
      return { success: false, synchronized: 0, conflicts: 0 }
    }
  }

  /**
   * Add new member to existing cohort
   */
  async addMemberToCohort(
    cohort_id: string,
    enrollment_id: string,
    options?: {
      generate_schedule?: boolean
      sync_with_cohort?: boolean
      notify_members?: boolean
    }
  ): Promise<{ success: boolean; sessions_created: number }> {
    try {
      // Get cohort
      const { data: cohort } = await supabase
        .from('program_cohorts')
        .select('*')
        .eq('id', cohort_id)
        .single()

      if (!cohort) {
        return { success: false, sessions_created: 0 }
      }

      // Add enrollment to cohort
      const updatedEnrollments = [...cohort.enrollment_ids, enrollment_id]
      
      await supabase
        .from('program_cohorts')
        .update({
          enrollment_ids: updatedEnrollments,
          updated_at: new Date().toISOString()
        })
        .eq('id', cohort_id)

      // Update enrollment with cohort reference
      await supabase
        .from('student_subscriptions')
        .update({
          cohort_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      let sessionsCreated = 0

      // Generate schedule if requested
      if (options?.generate_schedule) {
        // Add to shared activities
        const sharedSessions = await this.addMemberToSharedActivities(
          enrollment_id,
          cohort
        )
        sessionsCreated += sharedSessions.length

        // Generate individual sessions with cohort constraints
        if (options.sync_with_cohort) {
          const individualSessions = await this.generateIndividualSessionsWithCohortConstraints(
            enrollment_id,
            cohort,
            sharedSessions,
            true
          )
          sessionsCreated += individualSessions.length
        }
      }

      // Notify other members if requested
      if (options?.notify_members) {
        await this.notifyCohortMembers(cohort_id, `New member added to cohort: ${enrollment_id}`)
      }

      return { success: true, sessions_created: sessionsCreated }
    } catch (error) {
      console.error('Error adding member to cohort:', error)
      return { success: false, sessions_created: 0 }
    }
  }

  /**
   * Remove member from cohort
   */
  async removeMemberFromCohort(
    cohort_id: string,
    enrollment_id: string,
    options?: {
      keep_individual_sessions?: boolean
      cancel_shared_sessions?: boolean
      notify_members?: boolean
    }
  ): Promise<{ success: boolean; sessions_affected: number }> {
    try {
      // Get cohort
      const { data: cohort } = await supabase
        .from('program_cohorts')
        .select('*')
        .eq('id', cohort_id)
        .single()

      if (!cohort) {
        return { success: false, sessions_affected: 0 }
      }

      // Remove enrollment from cohort
      const updatedEnrollments = cohort.enrollment_ids.filter(id => id !== enrollment_id)
      
      await supabase
        .from('program_cohorts')
        .update({
          enrollment_ids: updatedEnrollments,
          updated_at: new Date().toISOString()
        })
        .eq('id', cohort_id)

      // Remove cohort reference from enrollment
      await supabase
        .from('student_subscriptions')
        .update({
          cohort_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      let sessionsAffected = 0

      // Handle shared sessions
      if (options?.cancel_shared_sessions) {
        const { data: sharedSessions } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('enrollment_id', enrollment_id)
          .eq('session_type', 'group')
          .eq('status', 'scheduled')

        if (sharedSessions) {
          await supabase
            .from('schedule_slots')
            .update({
              status: 'cancelled',
              notes: 'Removed from cohort'
            })
            .in('id', sharedSessions.map(s => s.id))

          sessionsAffected = sharedSessions.length
        }
      }

      // Notify other members if requested
      if (options?.notify_members) {
        await this.notifyCohortMembers(cohort_id, `Member removed from cohort: ${enrollment_id}`)
      }

      return { success: true, sessions_affected: sessionsAffected }
    } catch (error) {
      console.error('Error removing member from cohort:', error)
      return { success: false, sessions_affected: 0 }
    }
  }

  /**
   * Get cohort analytics
   */
  async getCohortAnalytics(
    cohort_id: string,
    date_range?: { start: string; end: string }
  ): Promise<{
    attendance_rate: number
    participation_by_activity: Map<string, number>
    member_engagement: Array<{
      enrollment_id: string
      attendance_rate: number
      participation_score: number
    }>
    schedule_efficiency: number
    conflict_rate: number
  }> {
    try {
      // Get cohort and sessions
      const { data: cohort } = await supabase
        .from('program_cohorts')
        .select('*')
        .eq('id', cohort_id)
        .single()

      if (!cohort) {
        return {
          attendance_rate: 0,
          participation_by_activity: new Map(),
          member_engagement: [],
          schedule_efficiency: 0,
          conflict_rate: 0
        }
      }

      // Get all sessions for cohort
      let sessionsQuery = supabase
        .from('schedule_slots')
        .select('*')
        .in('enrollment_id', cohort.enrollment_ids)

      if (date_range) {
        sessionsQuery = sessionsQuery
          .gte('session_date', date_range.start)
          .lte('session_date', date_range.end)
      }

      const { data: sessions } = await sessionsQuery

      if (!sessions || sessions.length === 0) {
        return {
          attendance_rate: 0,
          participation_by_activity: new Map(),
          member_engagement: [],
          schedule_efficiency: 0,
          conflict_rate: 0
        }
      }

      // Calculate overall attendance rate
      const attendedSessions = sessions.filter(s => s.status === 'completed').length
      const totalSessions = sessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length
      const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0

      // Calculate participation by activity type
      const participationByActivity = new Map<string, number>()
      const groupSessions = sessions.filter(s => s.session_type === 'group')
      
      for (const activity of cohort.shared_activities) {
        const activitySessions = groupSessions.filter(s => 
          s.notes?.includes(activity.activity_name)
        )
        const attended = activitySessions.filter(s => s.status === 'completed').length
        const total = activitySessions.length
        participationByActivity.set(
          activity.activity_name,
          total > 0 ? (attended / total) * 100 : 0
        )
      }

      // Calculate member engagement
      const memberEngagement = []
      for (const enrollment_id of cohort.enrollment_ids) {
        const memberSessions = sessions.filter(s => s.enrollment_id === enrollment_id)
        const memberAttended = memberSessions.filter(s => s.status === 'completed').length
        const memberTotal = memberSessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length
        
        memberEngagement.push({
          enrollment_id,
          attendance_rate: memberTotal > 0 ? (memberAttended / memberTotal) * 100 : 0,
          participation_score: this.calculateParticipationScore(memberSessions)
        })
      }

      // Calculate schedule efficiency (utilized vs scheduled slots)
      const scheduledSlots = sessions.filter(s => s.status === 'scheduled').length
      const utilizedSlots = sessions.filter(s => s.status === 'completed').length
      const scheduleEfficiency = (scheduledSlots + utilizedSlots) > 0 
        ? (utilizedSlots / (scheduledSlots + utilizedSlots)) * 100 
        : 0

      // Calculate conflict rate
      const { data: conflicts } = await supabase
        .from('schedule_conflicts')
        .select('*')
        .in('enrollment_id', cohort.enrollment_ids)

      const conflictRate = sessions.length > 0 
        ? ((conflicts?.length || 0) / sessions.length) * 100 
        : 0

      return {
        attendance_rate: attendanceRate,
        participation_by_activity: participationByActivity,
        member_engagement: memberEngagement,
        schedule_efficiency: scheduleEfficiency,
        conflict_rate: conflictRate
      }
    } catch (error) {
      console.error('Error getting cohort analytics:', error)
      return {
        attendance_rate: 0,
        participation_by_activity: new Map(),
        member_engagement: [],
        schedule_efficiency: 0,
        conflict_rate: 0
      }
    }
  }

  // Helper methods

  private async validateCohortEnrollments(
    enrollment_ids: string[],
    program_template_id: string
  ): Promise<{ valid: boolean; message?: string }> {
    // Check all enrollments exist and belong to same program
    const { data: enrollments, error } = await supabase
      .from('student_subscriptions')
      .select('*')
      .in('id', enrollment_ids)

    if (error || !enrollments) {
      return { valid: false, message: 'Error fetching enrollments' }
    }

    if (enrollments.length !== enrollment_ids.length) {
      return { valid: false, message: 'Some enrollments not found' }
    }

    const invalidEnrollments = enrollments.filter(e => 
      e.program_template_id !== program_template_id
    )

    if (invalidEnrollments.length > 0) {
      return { valid: false, message: 'All enrollments must belong to same program template' }
    }

    return { valid: true }
  }

  private async generateSharedActivitySessions(
    cohort: ProgramCohort,
    activity: SharedActivity
  ): Promise<ScheduleSlot[]> {
    const sessions: ScheduleSlot[] = []
    const startDate = new Date(cohort.start_date)
    const endDate = new Date(cohort.end_date)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Check if this date matches activity schedule
      let shouldSchedule = false

      if (activity.frequency === 'one_time') {
        // Schedule only once at start
        shouldSchedule = currentDate.getTime() === startDate.getTime()
      } else if (activity.day_of_week !== undefined) {
        // Check day of week
        if (currentDate.getDay() === activity.day_of_week) {
          // Check frequency
          const weeksSinceStart = Math.floor(
            (currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )

          switch (activity.frequency) {
            case 'weekly':
              shouldSchedule = true
              break
            case 'biweekly':
              shouldSchedule = weeksSinceStart % 2 === 0
              break
            case 'monthly':
              shouldSchedule = currentDate.getDate() <= 7 // First week of month
              break
          }
        }
      }

      if (shouldSchedule) {
        // Find available room
        const room = await this.findSuitableRoom(
          currentDate.toISOString().split('T')[0],
          activity.preferred_time,
          activity.duration_minutes,
          activity.room_requirements
        )

        // Create session for each cohort member
        for (const enrollment_id of cohort.enrollment_ids) {
          const session: ScheduleSlot = {
            id: crypto.randomUUID(),
            enrollment_id,
            student_id: await this.getStudentIdForEnrollment(enrollment_id),
            therapist_id: activity.therapist_ids[0], // Primary therapist
            session_date: currentDate.toISOString().split('T')[0],
            start_time: activity.preferred_time,
            end_time: this.calculateEndTime(activity.preferred_time, activity.duration_minutes),
            session_type: 'group',
            status: 'scheduled',
            room_id: room?.id,
            notes: `${activity.activity_name} - Cohort: ${cohort.cohort_name}`
          }

          sessions.push(session)
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return sessions
  }

  private async generateIndividualSessionsWithCohortConstraints(
    enrollment_id: string,
    cohort: ProgramCohort,
    shared_sessions: ScheduleSlot[],
    respect_preferences: boolean
  ): Promise<ScheduleSlot[]> {
    // Get enrollment details
    const { data: enrollment } = await supabase
      .from('student_subscriptions')
      .select('*')
      .eq('id', enrollment_id)
      .single()

    if (!enrollment) return []

    // Get dates occupied by shared sessions
    const sharedDates = new Set(
      shared_sessions
        .filter(s => s.enrollment_id === enrollment_id)
        .map(s => `${s.session_date}-${s.start_time}`)
    )

    // Import scheduling service
    const { individualizedSchedulingService } = await import('./individualized-scheduling-service')

    // Generate individual schedule avoiding shared session times
    const schedule = await individualizedSchedulingService.generateIndividualSchedule({
      enrollment_id,
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      custom_schedule: enrollment.custom_schedule,
      therapist_id: enrollment.assigned_therapist_id,
      avoid_holidays: true,
      allow_weekends: false
    })

    // Filter out conflicting slots
    return schedule.filter(slot => 
      !sharedDates.has(`${slot.session_date}-${slot.start_time}`)
    )
  }

  private async detectCohortConflicts(
    sessions: ScheduleSlot[]
  ): Promise<Array<{ session: ScheduleSlot; conflict_type: string; resolution_needed: boolean }>> {
    const conflicts = []

    // Check each session against others
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const session1 = sessions[i]
        const session2 = sessions[j]

        // Skip if different dates
        if (session1.session_date !== session2.session_date) continue

        // Check time overlap
        if (this.hasTimeOverlap(session1, session2)) {
          // Check conflict type
          if (session1.therapist_id === session2.therapist_id) {
            conflicts.push({
              session: session1,
              conflict_type: 'therapist',
              resolution_needed: true
            })
          }

          if (session1.room_id && session1.room_id === session2.room_id) {
            conflicts.push({
              session: session1,
              conflict_type: 'room',
              resolution_needed: true
            })
          }

          if (session1.student_id === session2.student_id) {
            conflicts.push({
              session: session1,
              conflict_type: 'student',
              resolution_needed: true
            })
          }
        }
      }
    }

    return conflicts
  }

  private async resolveCohortConflicts(
    conflicts: any[],
    settings: CohortSettings
  ): Promise<number> {
    let resolved = 0

    if (!settings.auto_fill_absences) {
      return resolved
    }

    // Import conflict resolution service
    const { scheduleConflictResolutionService } = await import('./schedule-conflict-resolution-service')

    for (const conflict of conflicts) {
      const resolution = await scheduleConflictResolutionService.suggestResolutions({
        type: conflict.conflict_type,
        entity_id: conflict.session.therapist_id || conflict.session.room_id || conflict.session.student_id,
        conflicting_slots: [conflict.session],
        suggested_alternatives: []
      })

      if (resolution.length > 0) {
        // Apply first suggested resolution
        const applied = await scheduleConflictResolutionService.applyResolution(resolution[0])
        if (applied) resolved++
      }
    }

    return resolved
  }

  private async saveCohortSchedule(result: CohortScheduleResult): Promise<void> {
    // Save shared sessions
    if (result.shared_sessions.length > 0) {
      await supabase
        .from('schedule_slots')
        .insert(result.shared_sessions)
    }

    // Save individual sessions
    for (const [enrollment_id, sessions] of result.individual_sessions) {
      if (sessions.length > 0) {
        await supabase
          .from('schedule_slots')
          .insert(sessions)
      }
    }

    // Log schedule generation
    await supabase
      .from('cohort_schedule_logs')
      .insert({
        cohort_id: result.cohort_id,
        generated_at: new Date().toISOString(),
        shared_sessions: result.statistics.total_shared_sessions,
        individual_sessions: result.statistics.total_individual_sessions,
        conflicts: result.statistics.conflicts_detected,
        resolved: result.statistics.auto_resolved
      })
  }

  private async synchronizeSharedSessions(
    cohort: ProgramCohort,
    sessions: ScheduleSlot[]
  ): Promise<{ synchronized: number; conflicts: number }> {
    let synchronized = 0
    let conflicts = 0

    // Group sessions by date and time
    const sessionGroups = new Map<string, ScheduleSlot[]>()
    
    for (const session of sessions) {
      const key = `${session.session_date}-${session.start_time}`
      const group = sessionGroups.get(key) || []
      group.push(session)
      sessionGroups.set(key, group)
    }

    // Ensure all cohort members have sessions for each group activity
    for (const [key, group] of sessionGroups) {
      const missingEnrollments = cohort.enrollment_ids.filter(
        id => !group.some(s => s.enrollment_id === id)
      )

      for (const enrollment_id of missingEnrollments) {
        // Create missing session
        const templateSession = group[0]
        const newSession: ScheduleSlot = {
          ...templateSession,
          id: crypto.randomUUID(),
          enrollment_id,
          student_id: await this.getStudentIdForEnrollment(enrollment_id)
        }

        await supabase
          .from('schedule_slots')
          .insert(newSession)

        synchronized++
      }
    }

    return { synchronized, conflicts }
  }

  private async synchronizeIndividualSessions(
    cohort: ProgramCohort,
    sessions: ScheduleSlot[]
  ): Promise<{ synchronized: number; conflicts: number }> {
    let synchronized = 0
    let conflicts = 0

    if (!cohort.cohort_settings.maintain_group_consistency) {
      return { synchronized, conflicts }
    }

    // Check for conflicts between individual sessions
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        if (sessions[i].session_date === sessions[j].session_date &&
            this.hasTimeOverlap(sessions[i], sessions[j])) {
          conflicts++
        }
      }
    }

    return { synchronized, conflicts }
  }

  private async addMemberToSharedActivities(
    enrollment_id: string,
    cohort: ProgramCohort
  ): Promise<ScheduleSlot[]> {
    const newSessions: ScheduleSlot[] = []

    // Get existing shared sessions for cohort
    const { data: existingSessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .in('enrollment_id', cohort.enrollment_ids.filter(id => id !== enrollment_id))
      .eq('session_type', 'group')
      .eq('status', 'scheduled')
      .gte('session_date', new Date().toISOString())

    if (!existingSessions) return newSessions

    // Group by unique date/time combinations
    const uniqueSessions = new Map<string, ScheduleSlot>()
    for (const session of existingSessions) {
      const key = `${session.session_date}-${session.start_time}-${session.end_time}`
      if (!uniqueSessions.has(key)) {
        uniqueSessions.set(key, session)
      }
    }

    // Create matching sessions for new member
    const student_id = await this.getStudentIdForEnrollment(enrollment_id)
    
    for (const [key, templateSession] of uniqueSessions) {
      const newSession: ScheduleSlot = {
        ...templateSession,
        id: crypto.randomUUID(),
        enrollment_id,
        student_id
      }
      newSessions.push(newSession)
    }

    // Save to database
    if (newSessions.length > 0) {
      await supabase
        .from('schedule_slots')
        .insert(newSessions)
    }

    return newSessions
  }

  private async notifyCohortMembers(cohort_id: string, message: string): Promise<void> {
    // This would integrate with notification service
    await supabase
      .from('notifications')
      .insert({
        type: 'cohort_update',
        cohort_id,
        message,
        created_at: new Date().toISOString()
      })
  }

  private calculateParticipationScore(sessions: ScheduleSlot[]): number {
    if (sessions.length === 0) return 0

    const weights = {
      attendance: 0.5,
      group_participation: 0.3,
      consistency: 0.2
    }

    // Attendance score
    const attended = sessions.filter(s => s.status === 'completed').length
    const attendanceScore = (attended / sessions.length) * 100 * weights.attendance

    // Group participation score
    const groupSessions = sessions.filter(s => s.session_type === 'group')
    const groupAttended = groupSessions.filter(s => s.status === 'completed').length
    const groupScore = groupSessions.length > 0 
      ? (groupAttended / groupSessions.length) * 100 * weights.group_participation
      : 0

    // Consistency score (no long gaps between sessions)
    const consistencyScore = this.calculateConsistencyScore(sessions) * weights.consistency

    return attendanceScore + groupScore + consistencyScore
  }

  private calculateConsistencyScore(sessions: ScheduleSlot[]): number {
    if (sessions.length < 2) return 100

    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    )

    let totalGapDays = 0
    let gapCount = 0

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevDate = new Date(sortedSessions[i - 1].session_date)
      const currDate = new Date(sortedSessions[i].session_date)
      const gapDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
      
      if (gapDays > 0) {
        totalGapDays += gapDays
        gapCount++
      }
    }

    const avgGap = gapCount > 0 ? totalGapDays / gapCount : 0
    // Ideal gap is 3-4 days, penalize for longer gaps
    const score = Math.max(0, 100 - (Math.abs(avgGap - 3.5) * 10))
    
    return score
  }

  private hasTimeOverlap(session1: ScheduleSlot, session2: ScheduleSlot): boolean {
    const start1 = this.parseTime(session1.start_time)
    const end1 = this.parseTime(session1.end_time)
    const start2 = this.parseTime(session2.start_time)
    const end2 = this.parseTime(session2.end_time)

    return (start1 < end2) && (start2 < end1)
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  private async findSuitableRoom(
    date: string,
    time: string,
    duration: number,
    requirements: RoomRequirements
  ): Promise<{ id: string } | null> {
    // Get rooms matching requirements
    const { data: rooms } = await supabase
      .from('therapy_rooms')
      .select('*')
      .eq('room_type', requirements.room_type)
      .gte('capacity', requirements.min_capacity)
      .eq('is_active', true)

    if (!rooms || rooms.length === 0) return null

    // Check availability
    for (const room of rooms) {
      const { data: bookings } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('room_id', room.id)
        .eq('session_date', date)
        .eq('status', 'scheduled')

      const endTime = this.calculateEndTime(time, duration)
      const isAvailable = !bookings || bookings.length === 0 || 
        !bookings.some(booking => 
          this.hasTimeOverlap(
            { start_time: time, end_time: endTime } as ScheduleSlot,
            booking
          )
        )

      if (isAvailable) return room
    }

    return null
  }

  private async getStudentIdForEnrollment(enrollment_id: string): Promise<string> {
    const { data } = await supabase
      .from('student_subscriptions')
      .select('student_id')
      .eq('id', enrollment_id)
      .single()

    return data?.student_id || ''
  }
}

export const cohortSchedulingService = new CohortSchedulingService()