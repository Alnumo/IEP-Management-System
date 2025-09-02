/**
 * Availability Service
 * Story 3.1: Automated Scheduling Engine
 * 
 * Core service for managing therapist availability, time slots, and workload balancing
 * Supports Arabic/English bilingual operations and Saudi compliance requirements
 */

import { supabase } from '../lib/supabase'
import type {
  TherapistAvailability,
  AvailabilityTemplate,
  AvailabilityException,
  TimeSlot,
  ConflictType,
  ConflictSeverity,
  SchedulingMetrics,
  ValidationError,
  PerformanceTarget
} from '../types/scheduling'

// =====================================================
// Core Availability Management
// =====================================================

/**
 * Get therapist availability for a specific date range
 * @param therapistId - UUID of the therapist
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Promise with availability data
 */
export async function getTherapistAvailability(
  therapistId: string,
  startDate: string,
  endDate: string
): Promise<TherapistAvailability[]> {
  try {
    const { data, error } = await supabase
      .from('therapist_availability')
      .select(`
        id,
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        is_recurring,
        specific_date,
        max_sessions_per_slot,
        current_bookings,
        is_time_off,
        time_off_reason,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('therapist_id', therapistId)
      .and(
        'specific_date.gte', startDate,
        'specific_date.lte', endDate
      )
      .or(
        `specific_date.is.null,and(specific_date.gte.${startDate},specific_date.lte.${endDate})`
      )
      .order('day_of_week')
      .order('start_time')

    if (error) {
      throw new Error(`Failed to fetch availability: ${error.message}`)
    }

    // Calculate computed properties
    return data.map(availability => ({
      ...availability,
      available_slots: availability.max_sessions_per_slot - availability.current_bookings,
      utilization_rate: availability.max_sessions_per_slot > 0 
        ? (availability.current_bookings / availability.max_sessions_per_slot) * 100 
        : 0
    }))

  } catch (error) {
    console.error('Error fetching therapist availability:', error)
    throw error
  }
}

/**
 * Create or update therapist availability slot
 * @param availability - Availability data to create/update
 * @returns Promise with created/updated availability
 */
export async function upsertTherapistAvailability(
  availability: Partial<TherapistAvailability>
): Promise<TherapistAvailability> {
  try {
    // Validate time slot consistency
    validateTimeSlot({
      start_time: availability.start_time!,
      end_time: availability.end_time!,
      duration_minutes: 0 // Will be calculated
    })

    // Prepare data for database
    const availabilityData = {
      therapist_id: availability.therapist_id,
      day_of_week: availability.day_of_week,
      start_time: availability.start_time,
      end_time: availability.end_time,
      is_available: availability.is_available ?? true,
      is_recurring: availability.is_recurring ?? true,
      specific_date: availability.specific_date,
      max_sessions_per_slot: availability.max_sessions_per_slot ?? 1,
      current_bookings: availability.current_bookings ?? 0,
      is_time_off: availability.is_time_off ?? false,
      time_off_reason: availability.time_off_reason,
      notes: availability.notes,
      updated_by: (await supabase.auth.getUser()).data.user?.id
    }

    const { data, error } = availability.id
      ? await supabase
          .from('therapist_availability')
          .update(availabilityData)
          .eq('id', availability.id)
          .select()
          .single()
      : await supabase
          .from('therapist_availability')
          .insert({
            ...availabilityData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single()

    if (error) {
      throw new Error(`Failed to save availability: ${error.message}`)
    }

    // Return with computed properties
    return {
      ...data,
      available_slots: data.max_sessions_per_slot - data.current_bookings,
      utilization_rate: data.max_sessions_per_slot > 0 
        ? (data.current_bookings / data.max_sessions_per_slot) * 100 
        : 0
    }

  } catch (error) {
    console.error('Error saving availability:', error)
    throw error
  }
}

/**
 * Delete therapist availability slot
 * @param availabilityId - ID of availability slot to delete
 * @returns Promise with deletion confirmation
 */
export async function deleteTherapistAvailability(availabilityId: string): Promise<void> {
  try {
    // Check if availability slot has current bookings
    const { data: availability, error: fetchError } = await supabase
      .from('therapist_availability')
      .select('current_bookings, therapist_id')
      .eq('id', availabilityId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to check availability: ${fetchError.message}`)
    }

    if (availability.current_bookings > 0) {
      throw new Error('Cannot delete availability slot with existing bookings')
    }

    const { error } = await supabase
      .from('therapist_availability')
      .delete()
      .eq('id', availabilityId)

    if (error) {
      throw new Error(`Failed to delete availability: ${error.message}`)
    }

  } catch (error) {
    console.error('Error deleting availability:', error)
    throw error
  }
}

// =====================================================
// Availability Templates Management
// =====================================================

/**
 * Get availability templates for a therapist
 * @param therapistId - UUID of the therapist
 * @returns Promise with template data
 */
export async function getAvailabilityTemplates(therapistId: string): Promise<AvailabilityTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('availability_templates')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`)
    }

    // Transform database data to template format
    return data.map(template => ({
      id: template.id,
      name: { en: template.name, ar: template.name_ar },
      description: template.description ? { en: template.description, ar: template.description_ar } : undefined,
      therapist_id: template.therapist_id,
      weekly_schedule: template.weekly_pattern || [],
      exceptions: template.exceptions || [],
      is_active: template.is_active
    }))

  } catch (error) {
    console.error('Error fetching availability templates:', error)
    throw error
  }
}

/**
 * Create availability template from current schedule
 * @param therapistId - UUID of the therapist
 * @param templateName - Name for the template (bilingual)
 * @param description - Optional description (bilingual)
 * @returns Promise with created template
 */
export async function createAvailabilityTemplate(
  therapistId: string,
  templateName: { en: string; ar: string },
  description?: { en: string; ar: string }
): Promise<AvailabilityTemplate> {
  try {
    // Get current weekly availability pattern
    const { data: currentAvailability, error: availError } = await supabase
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('is_recurring', true)
      .is('specific_date', null)
      .order('day_of_week')
      .order('start_time')

    if (availError) {
      throw new Error(`Failed to fetch current availability: ${availError.message}`)
    }

    const templateData = {
      therapist_id: therapistId,
      name: templateName.en,
      name_ar: templateName.ar,
      description: description?.en,
      description_ar: description?.ar,
      is_active: true,
      weekly_pattern: currentAvailability,
      exceptions: [],
      created_by: (await supabase.auth.getUser()).data.user?.id
    }

    const { data, error } = await supabase
      .from('availability_templates')
      .insert(templateData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`)
    }

    return {
      id: data.id,
      name: templateName,
      description,
      therapist_id: data.therapist_id,
      weekly_schedule: data.weekly_pattern,
      exceptions: data.exceptions,
      is_active: data.is_active
    }

  } catch (error) {
    console.error('Error creating availability template:', error)
    throw error
  }
}

/**
 * Apply availability template to therapist schedule
 * @param templateId - UUID of the template to apply
 * @param startDate - Start date for application
 * @returns Promise with application result
 */
export async function applyAvailabilityTemplate(
  templateId: string,
  startDate: string
): Promise<{ applied: number; conflicts: string[] }> {
  try {
    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('availability_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError) {
      throw new Error(`Failed to fetch template: ${templateError.message}`)
    }

    const weeklyPattern = template.weekly_pattern as TherapistAvailability[]
    const conflicts: string[] = []
    let appliedCount = 0

    // Apply each availability slot from template
    for (const slot of weeklyPattern) {
      try {
        await upsertTherapistAvailability({
          therapist_id: template.therapist_id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available,
          is_recurring: true,
          max_sessions_per_slot: slot.max_sessions_per_slot,
          is_time_off: false
        })
        appliedCount++
      } catch (error) {
        conflicts.push(`Day ${slot.day_of_week} ${slot.start_time}-${slot.end_time}: ${error}`)
      }
    }

    // Update template usage tracking
    await supabase
      .from('availability_templates')
      .update({
        usage_count: (template.usage_count || 0) + 1,
        last_applied: new Date().toISOString().split('T')[0]
      })
      .eq('id', templateId)

    return { applied: appliedCount, conflicts }

  } catch (error) {
    console.error('Error applying availability template:', error)
    throw error
  }
}

// =====================================================
// Availability Exceptions Management
// =====================================================

/**
 * Create availability exception (time-off, modified hours)
 * @param exception - Exception data
 * @returns Promise with created exception
 */
export async function createAvailabilityException(
  exception: Omit<AvailabilityException, 'id'>
): Promise<AvailabilityException> {
  try {
    const exceptionData = {
      therapist_id: exception.therapist_id,
      start_date: exception.start_date,
      end_date: exception.end_date,
      exception_type: exception.exception_type,
      is_all_day: exception.is_all_day ?? true,
      start_time: exception.start_time,
      end_time: exception.end_time,
      reason: exception.reason,
      reason_ar: exception.reason_ar,
      status: 'pending',
      automatic_rescheduling: exception.automatic_rescheduling ?? true,
      requested_by: (await supabase.auth.getUser()).data.user?.id
    }

    const { data, error } = await supabase
      .from('availability_exceptions')
      .insert(exceptionData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create exception: ${error.message}`)
    }

    return data

  } catch (error) {
    console.error('Error creating availability exception:', error)
    throw error
  }
}

/**
 * Get availability exceptions for therapist in date range
 * @param therapistId - UUID of therapist
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Promise with exceptions
 */
export async function getAvailabilityExceptions(
  therapistId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilityException[]> {
  try {
    const { data, error } = await supabase
      .from('availability_exceptions')
      .select('*')
      .eq('therapist_id', therapistId)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .in('status', ['approved', 'pending'])
      .order('start_date')

    if (error) {
      throw new Error(`Failed to fetch exceptions: ${error.message}`)
    }

    return data

  } catch (error) {
    console.error('Error fetching availability exceptions:', error)
    throw error
  }
}

// =====================================================
// Conflict Detection and Prevention
// =====================================================

/**
 * Check for availability conflicts when scheduling
 * @param therapistId - UUID of therapist
 * @param date - Date to check (YYYY-MM-DD)
 * @param startTime - Start time (HH:MM)
 * @param endTime - End time (HH:MM)
 * @returns Promise with conflict information
 */
export async function checkAvailabilityConflicts(
  therapistId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{
  hasConflicts: boolean
  conflicts: Array<{
    type: ConflictType
    severity: ConflictSeverity
    description: string
    description_ar?: string
  }>
  suggestions: TimeSlot[]
}> {
  try {
    const dayOfWeek = new Date(date).getDay()
    const conflicts: Array<{
      type: ConflictType
      severity: ConflictSeverity
      description: string
      description_ar?: string
    }> = []

    // Check base availability
    const { data: baseAvailability, error: availError } = await supabase
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapistId)
      .or(`and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek}),specific_date.eq.${date}`)
      .overlaps('start_time', 'end_time', startTime, endTime)

    if (availError) {
      throw new Error(`Failed to check availability: ${availError.message}`)
    }

    // Check if therapist is available during requested time
    const availableSlots = baseAvailability?.filter(slot => 
      slot.is_available && !slot.is_time_off
    ) || []

    if (availableSlots.length === 0) {
      conflicts.push({
        type: ConflictType.THERAPIST_DOUBLE_BOOKING,
        severity: ConflictSeverity.HIGH,
        description: `Therapist not available on ${date} from ${startTime} to ${endTime}`,
        description_ar: `المعالج غير متاح في ${date} من ${startTime} إلى ${endTime}`
      })
    }

    // Check for double booking
    const { data: existingSessions, error: sessionError } = await supabase
      .from('scheduled_sessions')
      .select('id, start_time, end_time, session_number')
      .eq('therapist_id', therapistId)
      .eq('scheduled_date', date)
      .in('status', ['scheduled', 'confirmed'])
      .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

    if (sessionError) {
      throw new Error(`Failed to check existing sessions: ${sessionError.message}`)
    }

    if (existingSessions && existingSessions.length > 0) {
      conflicts.push({
        type: ConflictType.THERAPIST_DOUBLE_BOOKING,
        severity: ConflictSeverity.CRITICAL,
        description: `Time slot conflicts with existing session(s): ${existingSessions.map(s => s.session_number).join(', ')}`,
        description_ar: `تعارض الوقت مع الجلسة/الجلسات الموجودة: ${existingSessions.map(s => s.session_number).join(', ')}`
      })
    }

    // Check capacity limits
    for (const slot of availableSlots) {
      if (slot.current_bookings >= slot.max_sessions_per_slot) {
        conflicts.push({
          type: ConflictType.TIME_CONSTRAINT,
          severity: ConflictSeverity.MEDIUM,
          description: `Time slot at capacity (${slot.current_bookings}/${slot.max_sessions_per_slot})`,
          description_ar: `الفترة الزمنية مكتملة (${slot.current_bookings}/${slot.max_sessions_per_slot})`
        })
      }
    }

    // Check for exceptions (time-off, etc.)
    const exceptions = await getAvailabilityExceptions(therapistId, date, date)
    for (const exception of exceptions) {
      if (exception.status === 'approved') {
        conflicts.push({
          type: ConflictType.THERAPIST_DOUBLE_BOOKING,
          severity: ConflictSeverity.HIGH,
          description: `Therapist has scheduled time off: ${exception.reason}`,
          description_ar: `المعالج لديه إجازة مجدولة: ${exception.reason_ar || exception.reason}`
        })
      }
    }

    // Generate alternative suggestions if there are conflicts
    const suggestions: TimeSlot[] = []
    if (conflicts.length > 0) {
      const alternativeSuggestions = await findAlternativeTimeSlots(
        therapistId,
        date,
        parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]) - 
        parseInt(startTime.split(':')[0]) * 60 - parseInt(startTime.split(':')[1])
      )
      suggestions.push(...alternativeSuggestions)
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      suggestions
    }

  } catch (error) {
    console.error('Error checking availability conflicts:', error)
    throw error
  }
}

/**
 * Find alternative time slots for scheduling
 * @param therapistId - UUID of therapist
 * @param preferredDate - Preferred date
 * @param durationMinutes - Session duration in minutes
 * @returns Promise with alternative time slots
 */
export async function findAlternativeTimeSlots(
  therapistId: string,
  preferredDate: string,
  durationMinutes: number
): Promise<TimeSlot[]> {
  try {
    const dayOfWeek = new Date(preferredDate).getDay()
    const suggestions: TimeSlot[] = []

    // Get available slots for the same day
    const { data: availableSlots, error } = await supabase
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapistId)
      .or(`and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek}),specific_date.eq.${preferredDate}`)
      .eq('is_available', true)
      .eq('is_time_off', false)
      .order('start_time')

    if (error) {
      throw new Error(`Failed to fetch available slots: ${error.message}`)
    }

    // Get existing bookings for the day
    const { data: existingBookings } = await supabase
      .from('scheduled_sessions')
      .select('start_time, end_time')
      .eq('therapist_id', therapistId)
      .eq('scheduled_date', preferredDate)
      .in('status', ['scheduled', 'confirmed'])
      .order('start_time')

    // Find free time slots within available hours
    for (const slot of availableSlots || []) {
      if ((slot.current_bookings || 0) < slot.max_sessions_per_slot) {
        // Calculate available time slots within this availability window
        const slotStart = timeToMinutes(slot.start_time)
        const slotEnd = timeToMinutes(slot.end_time)
        
        // Find gaps in existing bookings
        let currentTime = slotStart
        const bookingsInSlot = (existingBookings || [])
          .filter(booking => 
            timeToMinutes(booking.start_time) < slotEnd &&
            timeToMinutes(booking.end_time) > slotStart
          )
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

        for (const booking of bookingsInSlot) {
          const bookingStart = timeToMinutes(booking.start_time)
          
          // Check if there's enough gap before this booking
          if (bookingStart - currentTime >= durationMinutes) {
            suggestions.push({
              start_time: minutesToTime(currentTime),
              end_time: minutesToTime(currentTime + durationMinutes),
              duration_minutes: durationMinutes
            })
          }
          
          currentTime = Math.max(currentTime, timeToMinutes(booking.end_time))
        }

        // Check gap after last booking
        if (slotEnd - currentTime >= durationMinutes) {
          suggestions.push({
            start_time: minutesToTime(currentTime),
            end_time: minutesToTime(currentTime + durationMinutes),
            duration_minutes: durationMinutes
          })
        }
      }
    }

    return suggestions.slice(0, 5) // Return top 5 suggestions

  } catch (error) {
    console.error('Error finding alternative time slots:', error)
    throw error
  }
}

// =====================================================
// Workload Analysis and Capacity Planning
// =====================================================

/**
 * Calculate therapist workload metrics
 * @param therapistId - UUID of therapist
 * @param date - Date to analyze
 * @returns Promise with workload metrics
 */
export async function calculateWorkloadMetrics(
  therapistId: string,
  date: string
): Promise<SchedulingMetrics> {
  try {
    // Use the database function for workload calculation
    const { data: workloadData, error } = await supabase
      .rpc('calculate_daily_workload', {
        p_therapist_id: therapistId,
        p_analysis_date: date
      })

    if (error) {
      throw new Error(`Failed to calculate workload: ${error.message}`)
    }

    // Transform to SchedulingMetrics format
    return {
      therapist_utilization: { [therapistId]: workloadData.utilization_rate || 0 },
      room_utilization: {},
      equipment_utilization: {},
      total_conflicts: 0, // Would need additional query
      conflicts_by_type: {},
      conflicts_by_severity: {},
      average_resolution_time: 0,
      schedule_optimization_score: workloadData.workload_balance_score || 0,
      average_gap_between_sessions: 0,
      back_to_back_session_percentage: 0,
      reschedule_rate: 0,
      no_show_rate: workloadData.no_show_sessions / Math.max(workloadData.total_scheduled_sessions, 1) * 100,
      cancellation_rate: workloadData.cancelled_sessions / Math.max(workloadData.total_scheduled_sessions, 1) * 100,
      period_start: date,
      period_end: date,
      last_updated: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error calculating workload metrics:', error)
    throw error
  }
}

/**
 * Get performance targets for therapist workload
 * @returns Array of performance targets
 */
export function getPerformanceTargets(): PerformanceTarget[] {
  return [
    {
      metric_name: 'utilization_rate',
      target_value: 75,
      current_value: 0, // To be filled by calling function
      unit: 'percentage',
      status: 'on_target',
      trend: 'stable'
    },
    {
      metric_name: 'no_show_rate',
      target_value: 5,
      current_value: 0,
      unit: 'percentage',
      status: 'on_target',
      trend: 'stable'
    },
    {
      metric_name: 'cancellation_rate',
      target_value: 10,
      current_value: 0,
      unit: 'percentage',
      status: 'on_target',
      trend: 'stable'
    }
  ]
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Validate time slot consistency
 * @param timeSlot - Time slot to validate
 */
function validateTimeSlot(timeSlot: TimeSlot): void {
  const startMinutes = timeToMinutes(timeSlot.start_time)
  const endMinutes = timeToMinutes(timeSlot.end_time)
  
  if (startMinutes >= endMinutes) {
    throw new Error('Start time must be before end time')
  }
  
  if (endMinutes - startMinutes > 480) { // Max 8 hours
    throw new Error('Session duration cannot exceed 8 hours')
  }
}

/**
 * Convert time string to minutes since midnight
 * @param time - Time string (HH:MM)
 * @returns Minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string
 * @param minutes - Minutes since midnight
 * @returns Time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}