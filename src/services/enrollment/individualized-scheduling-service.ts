// Story 6.1: Individualized scheduling service for managing program schedules

import { supabase } from '@/lib/supabase'
import type { IndividualizedEnrollment, CustomSchedule } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

export interface ScheduleSlot {
  id: string
  enrollment_id: string
  student_id: string
  therapist_id: string
  session_date: string
  start_time: string
  end_time: string
  session_type: 'individual' | 'group' | 'assessment'
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  room_id?: string
  notes?: string
}

export interface ScheduleConflict {
  type: 'therapist' | 'room' | 'student'
  entity_id: string
  conflicting_slots: ScheduleSlot[]
  suggested_alternatives: ScheduleSlot[]
}

export interface ScheduleGenerationOptions {
  enrollment_id: string
  start_date: string
  end_date: string
  custom_schedule: CustomSchedule
  therapist_id: string
  avoid_holidays?: boolean
  allow_weekends?: boolean
  preferred_rooms?: string[]
  buffer_time_minutes?: number
}

export interface BulkScheduleOptions {
  enrollment_ids: string[]
  cohort_mode?: boolean
  shared_sessions?: Array<{
    session_type: string
    frequency: 'weekly' | 'biweekly' | 'monthly'
    day_of_week: number
    time: string
  }>
}

class IndividualizedSchedulingService {
  /**
   * Generate individualized schedule for a student enrollment
   */
  async generateIndividualSchedule(options: ScheduleGenerationOptions): Promise<ScheduleSlot[]> {
    const {
      enrollment_id,
      start_date,
      end_date,
      custom_schedule,
      therapist_id,
      avoid_holidays = true,
      allow_weekends = false,
      preferred_rooms = [],
      buffer_time_minutes = 15
    } = options

    try {
      // Calculate total sessions needed
      const totalWeeks = this.calculateWeeks(start_date, end_date)
      const totalSessions = totalWeeks * custom_schedule.sessions_per_week

      // Get therapist availability
      const therapistAvailability = await this.getTherapistAvailability(
        therapist_id,
        start_date,
        end_date
      )

      // Get existing bookings to avoid conflicts
      const existingBookings = await this.getExistingBookings(
        therapist_id,
        start_date,
        end_date
      )

      // Generate schedule slots
      const scheduleSlots: ScheduleSlot[] = []
      const currentDate = new Date(start_date)
      const endDateObj = new Date(end_date)
      let sessionsScheduled = 0

      while (currentDate <= endDateObj && sessionsScheduled < totalSessions) {
        // Check if date is valid (not holiday, weekend check)
        if (!this.isValidScheduleDate(currentDate, avoid_holidays, allow_weekends)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // Check preferred days
        const dayName = this.getDayName(currentDate.getDay())
        if (!custom_schedule.preferred_days.includes(dayName)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // Find available time slot
        for (const preferredTime of custom_schedule.preferred_times) {
          const slot = await this.findAvailableSlot(
            currentDate,
            preferredTime,
            custom_schedule.session_duration_minutes,
            therapist_id,
            therapistAvailability,
            existingBookings,
            buffer_time_minutes
          )

          if (slot) {
            // Find available room
            const room_id = await this.findAvailableRoom(
              slot.session_date,
              slot.start_time,
              slot.end_time,
              preferred_rooms
            )

            scheduleSlots.push({
              ...slot,
              enrollment_id,
              room_id,
              session_type: 'individual'
            })
            
            sessionsScheduled++
            
            // Add to existing bookings to prevent double booking
            existingBookings.push(slot)
            break
          }
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Save schedule to database
      await this.saveScheduleSlots(scheduleSlots)

      return scheduleSlots
    } catch (error) {
      console.error('Error generating individual schedule:', error)
      throw error
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async detectScheduleConflicts(
    slots: ScheduleSlot[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    for (const slot of slots) {
      // Check therapist conflicts
      const therapistConflicts = await this.checkTherapistConflicts(slot)
      if (therapistConflicts.length > 0) {
        conflicts.push({
          type: 'therapist',
          entity_id: slot.therapist_id,
          conflicting_slots: therapistConflicts,
          suggested_alternatives: await this.suggestAlternatives(slot, 'therapist')
        })
      }

      // Check room conflicts
      if (slot.room_id) {
        const roomConflicts = await this.checkRoomConflicts(slot)
        if (roomConflicts.length > 0) {
          conflicts.push({
            type: 'room',
            entity_id: slot.room_id,
            conflicting_slots: roomConflicts,
            suggested_alternatives: await this.suggestAlternatives(slot, 'room')
          })
        }
      }

      // Check student conflicts
      const studentConflicts = await this.checkStudentConflicts(slot)
      if (studentConflicts.length > 0) {
        conflicts.push({
          type: 'student',
          entity_id: slot.student_id,
          conflicting_slots: studentConflicts,
          suggested_alternatives: await this.suggestAlternatives(slot, 'student')
        })
      }
    }

    return conflicts
  }

  /**
   * Modify individual schedule
   */
  async modifyIndividualSchedule(
    enrollment_id: string,
    modifications: Partial<CustomSchedule>
  ): Promise<ScheduleSlot[]> {
    try {
      // Get existing schedule
      const { data: existingSlots, error: fetchError } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('enrollment_id', enrollment_id)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString())

      if (fetchError) throw fetchError

      // Cancel existing future slots
      if (existingSlots && existingSlots.length > 0) {
        const { error: cancelError } = await supabase
          .from('schedule_slots')
          .update({ status: 'rescheduled' })
          .in('id', existingSlots.map(slot => slot.id))

        if (cancelError) throw cancelError
      }

      // Get enrollment details
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', enrollment_id)
        .single()

      if (enrollmentError) throw enrollmentError

      // Generate new schedule with modifications
      const updatedSchedule: CustomSchedule = {
        ...enrollment.custom_schedule,
        ...modifications
      }

      const newSlots = await this.generateIndividualSchedule({
        enrollment_id,
        start_date: new Date().toISOString(),
        end_date: enrollment.individual_end_date,
        custom_schedule: updatedSchedule,
        therapist_id: enrollment.assigned_therapist_id
      })

      // Update enrollment with new schedule
      const { error: updateError } = await supabase
        .from('student_subscriptions')
        .update({ 
          custom_schedule: updatedSchedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment_id)

      if (updateError) throw updateError

      return newSlots
    } catch (error) {
      console.error('Error modifying individual schedule:', error)
      throw error
    }
  }

  /**
   * Generate cohort schedule for group activities
   */
  async generateCohortSchedule(
    options: BulkScheduleOptions
  ): Promise<Map<string, ScheduleSlot[]>> {
    const { enrollment_ids, cohort_mode = false, shared_sessions = [] } = options
    const cohortSchedules = new Map<string, ScheduleSlot[]>()

    try {
      if (cohort_mode && shared_sessions.length > 0) {
        // Generate shared sessions for the cohort
        const sharedSlots: ScheduleSlot[] = []

        for (const session of shared_sessions) {
          const slots = await this.generateSharedSessionSlots(
            enrollment_ids,
            session
          )
          sharedSlots.push(...slots)
        }

        // Assign shared slots to each enrollment
        for (const enrollment_id of enrollment_ids) {
          const enrollmentSlots = sharedSlots.map(slot => ({
            ...slot,
            enrollment_id
          }))
          cohortSchedules.set(enrollment_id, enrollmentSlots)
        }
      } else {
        // Generate individual schedules for each enrollment
        for (const enrollment_id of enrollment_ids) {
          const { data: enrollment } = await supabase
            .from('student_subscriptions')
            .select('*')
            .eq('id', enrollment_id)
            .single()

          if (enrollment) {
            const slots = await this.generateIndividualSchedule({
              enrollment_id,
              start_date: enrollment.individual_start_date,
              end_date: enrollment.individual_end_date,
              custom_schedule: enrollment.custom_schedule,
              therapist_id: enrollment.assigned_therapist_id
            })
            cohortSchedules.set(enrollment_id, slots)
          }
        }
      }

      return cohortSchedules
    } catch (error) {
      console.error('Error generating cohort schedule:', error)
      throw error
    }
  }

  /**
   * Synchronize schedule with program template updates
   */
  async synchronizeWithTemplateUpdate(
    template_id: string,
    template_changes: Partial<ProgramTemplate>
  ): Promise<void> {
    try {
      // Get all active enrollments using this template
      const { data: enrollments, error: fetchError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('program_template_id', template_id)
        .eq('enrollment_status', 'active')

      if (fetchError) throw fetchError
      if (!enrollments || enrollments.length === 0) return

      // Analyze impact of template changes
      const impactedEnrollments = enrollments.filter(enrollment => {
        // Check if changes affect the enrollment
        if (template_changes.base_sessions_per_week !== undefined &&
            enrollment.custom_schedule.sessions_per_week === enrollment.program_modifications?.original_sessions_per_week) {
          return true
        }
        if (template_changes.base_duration_weeks !== undefined &&
            !enrollment.program_modifications?.custom_duration) {
          return true
        }
        return false
      })

      // Update impacted enrollments
      for (const enrollment of impactedEnrollments) {
        // Determine if schedule regeneration is needed
        const needsRegeneration = template_changes.base_sessions_per_week !== undefined

        if (needsRegeneration) {
          // Cancel future sessions
          await supabase
            .from('schedule_slots')
            .update({ status: 'cancelled', notes: 'Template update synchronization' })
            .eq('enrollment_id', enrollment.id)
            .eq('status', 'scheduled')
            .gte('session_date', new Date().toISOString())

          // Generate new schedule
          const updatedSchedule: CustomSchedule = {
            ...enrollment.custom_schedule,
            sessions_per_week: template_changes.base_sessions_per_week || enrollment.custom_schedule.sessions_per_week
          }

          await this.generateIndividualSchedule({
            enrollment_id: enrollment.id,
            start_date: new Date().toISOString(),
            end_date: enrollment.individual_end_date,
            custom_schedule: updatedSchedule,
            therapist_id: enrollment.assigned_therapist_id
          })

          // Update enrollment record
          await supabase
            .from('student_subscriptions')
            .update({
              custom_schedule: updatedSchedule,
              program_modifications: {
                ...enrollment.program_modifications,
                template_sync_date: new Date().toISOString(),
                template_version: template_changes.updated_at
              }
            })
            .eq('id', enrollment.id)
        }
      }

      // Log synchronization
      await this.logSynchronization(template_id, impactedEnrollments.length)
    } catch (error) {
      console.error('Error synchronizing with template update:', error)
      throw error
    }
  }

  // Helper methods

  private calculateWeeks(start_date: string, end_date: string): number {
    const start = new Date(start_date)
    const end = new Date(end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks
  }

  private getDayName(dayIndex: number): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[dayIndex]
  }

  private isValidScheduleDate(
    date: Date,
    avoid_holidays: boolean,
    allow_weekends: boolean
  ): boolean {
    // Weekend check
    if (!allow_weekends && (date.getDay() === 0 || date.getDay() === 6)) {
      return false
    }

    // Holiday check (simplified - would need actual holiday calendar)
    if (avoid_holidays) {
      // Check against holiday calendar
      // This would need integration with a holiday service or database
    }

    return true
  }

  private async getTherapistAvailability(
    therapist_id: string,
    start_date: string,
    end_date: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapist_id)
      .gte('date', start_date)
      .lte('date', end_date)

    if (error) throw error
    return data || []
  }

  private async getExistingBookings(
    therapist_id: string,
    start_date: string,
    end_date: string
  ): Promise<ScheduleSlot[]> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('therapist_id', therapist_id)
      .eq('status', 'scheduled')
      .gte('session_date', start_date)
      .lte('session_date', end_date)

    if (error) throw error
    return data || []
  }

  private async findAvailableSlot(
    date: Date,
    preferred_time: string,
    duration_minutes: number,
    therapist_id: string,
    availability: any[],
    existingBookings: ScheduleSlot[],
    buffer_time_minutes: number
  ): Promise<ScheduleSlot | null> {
    const dateStr = date.toISOString().split('T')[0]
    const [hours, minutes] = preferred_time.split(':').map(Number)
    
    const startTime = new Date(date)
    startTime.setHours(hours, minutes, 0, 0)
    
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + duration_minutes)

    // Check if therapist is available
    const isAvailable = availability.some(slot => 
      slot.date === dateStr &&
      slot.start_time <= preferred_time &&
      slot.end_time >= endTime.toTimeString().slice(0, 5)
    )

    if (!isAvailable) return null

    // Check for conflicts with existing bookings
    const hasConflict = existingBookings.some(booking => {
      if (booking.session_date !== dateStr) return false
      
      const bookingStart = new Date(`${dateStr}T${booking.start_time}`)
      const bookingEnd = new Date(`${dateStr}T${booking.end_time}`)
      
      // Add buffer time
      bookingStart.setMinutes(bookingStart.getMinutes() - buffer_time_minutes)
      bookingEnd.setMinutes(bookingEnd.getMinutes() + buffer_time_minutes)
      
      return (startTime >= bookingStart && startTime < bookingEnd) ||
             (endTime > bookingStart && endTime <= bookingEnd)
    })

    if (hasConflict) return null

    return {
      id: crypto.randomUUID(),
      enrollment_id: '',
      student_id: '',
      therapist_id,
      session_date: dateStr,
      start_time: startTime.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5),
      session_type: 'individual',
      status: 'scheduled'
    }
  }

  private async findAvailableRoom(
    date: string,
    start_time: string,
    end_time: string,
    preferred_rooms: string[]
  ): Promise<string | undefined> {
    // Get all room bookings for the date and time
    const { data: bookings, error } = await supabase
      .from('room_bookings')
      .select('room_id')
      .eq('date', date)
      .lte('start_time', end_time)
      .gte('end_time', start_time)

    if (error) {
      console.error('Error finding available room:', error)
      return undefined
    }

    const bookedRoomIds = bookings?.map(b => b.room_id) || []

    // Check preferred rooms first
    for (const roomId of preferred_rooms) {
      if (!bookedRoomIds.includes(roomId)) {
        return roomId
      }
    }

    // Get any available room
    const { data: allRooms } = await supabase
      .from('therapy_rooms')
      .select('id')
      .eq('is_active', true)

    if (allRooms) {
      const availableRoom = allRooms.find(room => !bookedRoomIds.includes(room.id))
      return availableRoom?.id
    }

    return undefined
  }

  private async saveScheduleSlots(slots: ScheduleSlot[]): Promise<void> {
    if (slots.length === 0) return

    const { error } = await supabase
      .from('schedule_slots')
      .insert(slots)

    if (error) throw error
  }

  private async checkTherapistConflicts(slot: ScheduleSlot): Promise<ScheduleSlot[]> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('therapist_id', slot.therapist_id)
      .eq('session_date', slot.session_date)
      .eq('status', 'scheduled')
      .neq('id', slot.id)

    if (error) throw error

    return (data || []).filter(existing => {
      const slotStart = new Date(`${slot.session_date}T${slot.start_time}`)
      const slotEnd = new Date(`${slot.session_date}T${slot.end_time}`)
      const existingStart = new Date(`${existing.session_date}T${existing.start_time}`)
      const existingEnd = new Date(`${existing.session_date}T${existing.end_time}`)

      return (slotStart >= existingStart && slotStart < existingEnd) ||
             (slotEnd > existingStart && slotEnd <= existingEnd)
    })
  }

  private async checkRoomConflicts(slot: ScheduleSlot): Promise<ScheduleSlot[]> {
    if (!slot.room_id) return []

    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('room_id', slot.room_id)
      .eq('session_date', slot.session_date)
      .eq('status', 'scheduled')
      .neq('id', slot.id)

    if (error) throw error

    return (data || []).filter(existing => {
      const slotStart = new Date(`${slot.session_date}T${slot.start_time}`)
      const slotEnd = new Date(`${slot.session_date}T${slot.end_time}`)
      const existingStart = new Date(`${existing.session_date}T${existing.start_time}`)
      const existingEnd = new Date(`${existing.session_date}T${existing.end_time}`)

      return (slotStart >= existingStart && slotStart < existingEnd) ||
             (slotEnd > existingStart && slotEnd <= existingEnd)
    })
  }

  private async checkStudentConflicts(slot: ScheduleSlot): Promise<ScheduleSlot[]> {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('student_id', slot.student_id)
      .eq('session_date', slot.session_date)
      .eq('status', 'scheduled')
      .neq('id', slot.id)

    if (error) throw error

    return (data || []).filter(existing => {
      const slotStart = new Date(`${slot.session_date}T${slot.start_time}`)
      const slotEnd = new Date(`${slot.session_date}T${slot.end_time}`)
      const existingStart = new Date(`${existing.session_date}T${existing.start_time}`)
      const existingEnd = new Date(`${existing.session_date}T${existing.end_time}`)

      return (slotStart >= existingStart && slotStart < existingEnd) ||
             (slotEnd > existingStart && slotEnd <= existingEnd)
    })
  }

  private async suggestAlternatives(
    slot: ScheduleSlot,
    conflict_type: 'therapist' | 'room' | 'student'
  ): Promise<ScheduleSlot[]> {
    const suggestions: ScheduleSlot[] = []
    const baseDate = new Date(slot.session_date)

    // Try different times on the same day
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
    for (const time of times) {
      if (time === slot.start_time) continue

      const [hours, minutes] = time.split(':').map(Number)
      const duration = new Date(`${slot.session_date}T${slot.end_time}`).getTime() - 
                      new Date(`${slot.session_date}T${slot.start_time}`).getTime()
      const durationMinutes = duration / (1000 * 60)

      const endTime = new Date(baseDate)
      endTime.setHours(hours, minutes + durationMinutes, 0, 0)

      const suggestion: ScheduleSlot = {
        ...slot,
        start_time: time,
        end_time: endTime.toTimeString().slice(0, 5)
      }

      // Check if this suggestion has conflicts
      let hasConflict = false
      if (conflict_type === 'therapist') {
        const conflicts = await this.checkTherapistConflicts(suggestion)
        hasConflict = conflicts.length > 0
      } else if (conflict_type === 'room' && slot.room_id) {
        const conflicts = await this.checkRoomConflicts(suggestion)
        hasConflict = conflicts.length > 0
      } else if (conflict_type === 'student') {
        const conflicts = await this.checkStudentConflicts(suggestion)
        hasConflict = conflicts.length > 0
      }

      if (!hasConflict) {
        suggestions.push(suggestion)
        if (suggestions.length >= 3) break
      }
    }

    return suggestions
  }

  private async generateSharedSessionSlots(
    enrollment_ids: string[],
    session: any
  ): Promise<ScheduleSlot[]> {
    const slots: ScheduleSlot[] = []
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3) // 3 months ahead

    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      // Check if it's the right day of week
      if (currentDate.getDay() === session.day_of_week) {
        // Check frequency
        let shouldSchedule = false
        if (session.frequency === 'weekly') {
          shouldSchedule = true
        } else if (session.frequency === 'biweekly') {
          const weekNumber = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
          shouldSchedule = weekNumber % 2 === 0
        } else if (session.frequency === 'monthly') {
          shouldSchedule = currentDate.getDate() <= 7 // First week of month
        }

        if (shouldSchedule) {
          const [hours, minutes] = session.time.split(':').map(Number)
          const endTime = new Date(currentDate)
          endTime.setHours(hours + 1, minutes, 0, 0) // 1 hour sessions for group

          const slot: ScheduleSlot = {
            id: crypto.randomUUID(),
            enrollment_id: '', // Will be set per enrollment
            student_id: '', // Will be set per enrollment
            therapist_id: '', // Will need to be assigned
            session_date: currentDate.toISOString().split('T')[0],
            start_time: session.time,
            end_time: endTime.toTimeString().slice(0, 5),
            session_type: 'group',
            status: 'scheduled',
            notes: `Shared ${session.session_type} session`
          }

          slots.push(slot)
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return slots
  }

  private async logSynchronization(template_id: string, affected_count: number): Promise<void> {
    await supabase
      .from('sync_logs')
      .insert({
        entity_type: 'program_template',
        entity_id: template_id,
        action: 'schedule_synchronization',
        affected_count,
        timestamp: new Date().toISOString()
      })
  }
}

export const individualizedSchedulingService = new IndividualizedSchedulingService()