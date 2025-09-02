/**
 * Alternative Suggestions Service
 * Story 3.1: Automated Scheduling Engine - Task 4 (Subtask 4.2)
 * 
 * Intelligent alternative time slot suggestion engine with ranking algorithms
 * Provides smart recommendations based on preferences, constraints, and optimization
 */

import { supabase } from '../lib/supabase'
import { getTherapistAvailability, findAvailableTimeSlots } from './availability-service'
import type {
  ScheduledSession,
  AlternativeTimeSlot,
  TherapistAvailability,
  ScheduleConflict,
  SuggestionCriteria,
  AlternativeSuggestion,
  SuggestionRanking,
  OptimizationPreference,
  AvailabilityWindow,
  SuggestionResult
} from '../types/scheduling'

// =====================================================
// Core Alternative Suggestion Engine
// =====================================================

/**
 * Generate intelligent alternative time slot suggestions
 * @param conflictedSession - Session that needs rescheduling
 * @param criteria - Suggestion criteria and preferences
 * @returns Ranked list of alternative suggestions
 */
export async function generateAlternativeTimeSuggestions(
  conflictedSession: ScheduledSession,
  criteria: SuggestionCriteria = {}
): Promise<SuggestionResult> {
  try {
    const startTime = Date.now()

    // Step 1: Analyze current session requirements
    const sessionRequirements = await analyzeSessionRequirements(conflictedSession)
    
    // Step 2: Get availability windows
    const availabilityWindows = await getAvailabilityWindows(
      conflictedSession,
      criteria.date_range || getDefaultDateRange(),
      criteria.time_preferences
    )

    // Step 3: Generate potential time slots
    const potentialSlots = await generatePotentialTimeSlots(
      availabilityWindows,
      sessionRequirements,
      criteria
    )

    // Step 4: Filter slots based on constraints
    const filteredSlots = await filterSlotsByConstraints(
      potentialSlots,
      conflictedSession,
      criteria
    )

    // Step 5: Rank alternatives using scoring algorithm
    const rankedSuggestions = await rankAlternativeSuggestions(
      filteredSlots,
      conflictedSession,
      criteria.optimization_preferences || {}
    )

    // Step 6: Add impact analysis and side effects
    const enrichedSuggestions = await enrichSuggestionsWithAnalysis(
      rankedSuggestions,
      conflictedSession
    )

    const processingTime = Date.now() - startTime

    return {
      success: true,
      data: {
        original_session: conflictedSession,
        alternative_suggestions: enrichedSuggestions,
        total_alternatives_found: enrichedSuggestions.length,
        processing_time_ms: processingTime,
        search_criteria: criteria,
        recommendation_summary: generateRecommendationSummary(enrichedSuggestions)
      }
    }

  } catch (error) {
    console.error('Alternative suggestion generation failed:', error)
    return {
      success: false,
      error: `فشل في توليد البدائل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      error_en: `Alternative generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generate alternatives for multiple conflicted sessions simultaneously
 */
export async function generateBulkAlternativeSuggestions(
  conflictedSessions: ScheduledSession[],
  globalCriteria: SuggestionCriteria = {}
): Promise<Map<string, SuggestionResult>> {
  const results = new Map<string, SuggestionResult>()

  // Process sessions in parallel with concurrency control
  const concurrencyLimit = 5
  const chunks = chunkArray(conflictedSessions, concurrencyLimit)

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async session => ({
        sessionId: session.id,
        result: await generateAlternativeTimeSuggestions(session, globalCriteria)
      }))
    )

    chunkResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.set(result.value.sessionId, result.value.result)
      }
    })
  }

  return results
}

/**
 * Find optimal alternative therapist assignments
 */
export async function generateAlternativeTherapistSuggestions(
  session: ScheduledSession,
  criteria: {
    maintain_continuity?: boolean
    specialization_priority?: 'strict' | 'preferred' | 'flexible'
    workload_balance?: boolean
    geographic_preference?: string
  } = {}
): Promise<Array<{
  therapist_id: string
  therapist_name_ar: string
  therapist_name_en: string
  specializations: string[]
  availability_score: number
  continuity_score: number
  workload_score: number
  overall_score: number
  suggested_time_slots: AlternativeTimeSlot[]
  considerations: string[]
}>> {
  
  // Get suitable therapists based on session requirements
  const suitableTherapists = await findSuitableAlternativeTherapists(
    session,
    criteria.specialization_priority || 'preferred'
  )

  const suggestions = []

  for (const therapist of suitableTherapists) {
    // Get availability for this therapist
    const availability = await getTherapistAvailability(
      therapist.id,
      session.session_date,
      session.session_date
    )

    if (availability.length === 0) continue

    // Find available time slots
    const availableSlots = await findAvailableTimeSlots(
      therapist.id,
      session.session_date,
      session.duration_minutes
    )

    if (availableSlots.length === 0) continue

    // Calculate scores
    const availabilityScore = calculateAvailabilityScore(availableSlots, session)
    const continuityScore = await calculateContinuityScore(therapist.id, session.student_id)
    const workloadScore = await calculateWorkloadScore(therapist.id, session.session_date)

    // Calculate overall score with weightings
    const weights = {
      availability: 0.4,
      continuity: criteria.maintain_continuity ? 0.3 : 0.1,
      workload: criteria.workload_balance ? 0.3 : 0.2
    }

    const overallScore = 
      availabilityScore * weights.availability +
      continuityScore * weights.continuity +
      workloadScore * weights.workload

    // Convert available slots to alternative time slots
    const suggestedTimeSlots: AlternativeTimeSlot[] = availableSlots.map(slot => ({
      start_time: slot.start_time,
      end_time: slot.end_time,
      date: slot.date,
      therapist_id: therapist.id,
      room_id: slot.room_id,
      confidence_score: slot.availability_confidence,
      estimated_travel_time: 0,
      potential_conflicts: [],
      optimization_notes: []
    }))

    // Generate considerations
    const considerations = generateTherapistSuggestionConsiderations(
      therapist,
      session,
      continuityScore,
      workloadScore
    )

    suggestions.push({
      therapist_id: therapist.id,
      therapist_name_ar: therapist.first_name_ar + ' ' + therapist.last_name_ar,
      therapist_name_en: therapist.first_name_en + ' ' + therapist.last_name_en,
      specializations: therapist.specializations || [],
      availability_score: availabilityScore,
      continuity_score: continuityScore,
      workload_score: workloadScore,
      overall_score: overallScore,
      suggested_time_slots: suggestedTimeSlots,
      considerations
    })
  }

  // Sort by overall score (descending)
  return suggestions.sort((a, b) => b.overall_score - a.overall_score)
}

/**
 * Generate room and resource alternatives
 */
export async function generateAlternativeResourceSuggestions(
  session: ScheduledSession,
  resourceType: 'room' | 'equipment' | 'both' = 'both'
): Promise<{
  room_alternatives: Array<{
    room_id: string
    room_name_ar: string
    room_name_en: string
    capacity: number
    equipment_available: string[]
    suitability_score: number
    distance_from_current: number
    availability_windows: AvailabilityWindow[]
  }>
  equipment_alternatives: Array<{
    equipment_id: string
    equipment_name_ar: string
    equipment_name_en: string
    equipment_type: string
    availability_score: number
    compatibility_score: number
    location: string
  }>
}> {
  
  const roomAlternatives = []
  const equipmentAlternatives = []

  if (resourceType === 'room' || resourceType === 'both') {
    // Find alternative rooms
    const { data: rooms } = await supabase
      .from('therapy_rooms')
      .select(`
        id,
        name_ar,
        name_en,
        capacity,
        equipment_available,
        room_type,
        is_accessible,
        location_floor,
        location_wing
      `)
      .eq('is_available', true)
      .neq('id', session.room_id || '')

    for (const room of rooms || []) {
      // Check room availability at session time
      const isAvailable = await checkRoomAvailability(
        room.id,
        session.session_date,
        session.start_time,
        session.end_time
      )

      if (isAvailable) {
        const suitabilityScore = await calculateRoomSuitabilityScore(room, session)
        const distance = await calculateRoomDistance(room.id, session.room_id)
        const availabilityWindows = await getRoomAvailabilityWindows(
          room.id,
          session.session_date
        )

        roomAlternatives.push({
          room_id: room.id,
          room_name_ar: room.name_ar,
          room_name_en: room.name_en,
          capacity: room.capacity,
          equipment_available: room.equipment_available || [],
          suitability_score: suitabilityScore,
          distance_from_current: distance,
          availability_windows: availabilityWindows
        })
      }
    }
  }

  if (resourceType === 'equipment' || resourceType === 'both') {
    // Find alternative equipment
    const sessionRequirements = await getSessionEquipmentRequirements(session.id)
    
    if (sessionRequirements.length > 0) {
      const { data: equipment } = await supabase
        .from('therapy_equipment')
        .select(`
          id,
          name_ar,
          name_en,
          equipment_type,
          is_portable,
          current_room_id,
          maintenance_status
        `)
        .eq('is_available', true)
        .in('equipment_type', sessionRequirements.map(req => req.equipment_type))

      for (const equip of equipment || []) {
        const availabilityScore = await calculateEquipmentAvailabilityScore(
          equip.id,
          session.session_date,
          session.start_time,
          session.end_time
        )

        const compatibilityScore = calculateEquipmentCompatibilityScore(
          equip,
          sessionRequirements
        )

        equipmentAlternatives.push({
          equipment_id: equip.id,
          equipment_name_ar: equip.name_ar,
          equipment_name_en: equip.name_en,
          equipment_type: equip.equipment_type,
          availability_score: availabilityScore,
          compatibility_score: compatibilityScore,
          location: equip.current_room_id || 'storage'
        })
      }
    }
  }

  return {
    room_alternatives: roomAlternatives.sort((a, b) => b.suitability_score - a.suitability_score),
    equipment_alternatives: equipmentAlternatives.sort((a, b) => b.compatibility_score - a.compatibility_score)
  }
}

// =====================================================
// Session Analysis and Requirements
// =====================================================

/**
 * Analyze session requirements and constraints
 */
async function analyzeSessionRequirements(session: ScheduledSession): Promise<{
  duration_minutes: number
  session_type: string
  therapist_specializations_required: string[]
  equipment_required: string[]
  room_requirements: {
    min_capacity?: number
    accessibility_required?: boolean
    equipment_needed?: string[]
  }
  student_preferences: {
    preferred_times?: string[]
    rest_requirements?: number
    max_daily_sessions?: number
  }
  therapist_constraints: {
    buffer_time_minutes?: number
    max_consecutive_sessions?: number
    preferred_work_hours?: { start: string; end: string }
  }
}> {
  
  // Get session details
  const { data: sessionDetails } = await supabase
    .from('therapy_sessions')
    .select(`
      id,
      session_type,
      therapy_program_id,
      special_requirements,
      therapy_programs!inner (
        therapist_specializations,
        session_requirements
      )
    `)
    .eq('id', session.id)
    .single()

  // Get student preferences
  const { data: studentPrefs } = await supabase
    .from('student_preferences')
    .select('*')
    .eq('student_id', session.student_id)
    .single()

  // Get therapist constraints
  const { data: therapistPrefs } = await supabase
    .from('therapist_preferences')
    .select('*')
    .eq('therapist_id', session.therapist_id)
    .single()

  return {
    duration_minutes: session.duration_minutes,
    session_type: session.session_type,
    therapist_specializations_required: sessionDetails?.therapy_programs?.therapist_specializations || [],
    equipment_required: sessionDetails?.therapy_programs?.session_requirements?.equipment || [],
    room_requirements: {
      min_capacity: sessionDetails?.therapy_programs?.session_requirements?.min_room_capacity,
      accessibility_required: studentPrefs?.requires_accessibility || false,
      equipment_needed: sessionDetails?.therapy_programs?.session_requirements?.equipment || []
    },
    student_preferences: {
      preferred_times: studentPrefs?.preferred_session_times || [],
      rest_requirements: studentPrefs?.rest_minutes_between_sessions || 30,
      max_daily_sessions: studentPrefs?.max_daily_sessions || 4
    },
    therapist_constraints: {
      buffer_time_minutes: therapistPrefs?.buffer_minutes || 15,
      max_consecutive_sessions: therapistPrefs?.max_consecutive_sessions || 3,
      preferred_work_hours: therapistPrefs?.preferred_work_hours || { start: '09:00', end: '17:00' }
    }
  }
}

/**
 * Get availability windows for alternative scheduling
 */
async function getAvailabilityWindows(
  session: ScheduledSession,
  dateRange: { start_date: string; end_date: string },
  timePreferences?: { preferred_times?: string[]; avoid_times?: string[] }
): Promise<AvailabilityWindow[]> {
  
  // Get therapist availability for the date range
  const availability = await getTherapistAvailability(
    session.therapist_id,
    dateRange.start_date,
    dateRange.end_date
  )

  const windows: AvailabilityWindow[] = []

  for (const avail of availability) {
    // Convert day_of_week to actual dates in the range
    const dates = getDatesByDayOfWeek(avail.day_of_week, dateRange.start_date, dateRange.end_date)

    for (const date of dates) {
      // Skip if it's the same date as the conflicted session
      if (date === session.session_date) continue

      // Check if this time preference should be avoided
      if (timePreferences?.avoid_times?.includes(avail.start_time)) continue

      // Calculate preference score
      let preferenceScore = 1.0
      if (timePreferences?.preferred_times?.includes(avail.start_time)) {
        preferenceScore = 1.5
      }

      windows.push({
        date: date,
        start_time: avail.start_time,
        end_time: avail.end_time,
        therapist_id: session.therapist_id,
        duration_available: calculateDurationBetween(avail.start_time, avail.end_time),
        preference_score: preferenceScore,
        availability_type: avail.is_recurring ? 'recurring' : 'specific',
        constraints: []
      })
    }
  }

  return windows.sort((a, b) => {
    // Sort by date first, then by preference score
    const dateComparison = a.date.localeCompare(b.date)
    if (dateComparison !== 0) return dateComparison
    return b.preference_score - a.preference_score
  })
}

/**
 * Generate potential time slots from availability windows
 */
async function generatePotentialTimeSlots(
  windows: AvailabilityWindow[],
  requirements: any,
  criteria: SuggestionCriteria
): Promise<AlternativeTimeSlot[]> {
  
  const slots: AlternativeTimeSlot[] = []
  const sessionDuration = requirements.duration_minutes

  for (const window of windows) {
    // Calculate how many slots can fit in this window
    const windowDuration = window.duration_available
    const bufferTime = requirements.therapist_constraints?.buffer_time_minutes || 15
    
    if (windowDuration < sessionDuration + bufferTime) continue

    // Generate time slots within the window
    const windowSlots = generateSlotsWithinWindow(
      window,
      sessionDuration,
      bufferTime,
      criteria.slot_generation_strategy || 'optimal'
    )

    slots.push(...windowSlots)
  }

  return slots
}

/**
 * Generate time slots within a specific availability window
 */
function generateSlotsWithinWindow(
  window: AvailabilityWindow,
  sessionDuration: number,
  bufferTime: number,
  strategy: 'earliest' | 'latest' | 'optimal' | 'distributed'
): AlternativeTimeSlot[] {
  
  const slots: AlternativeTimeSlot[] = []
  const startMinutes = parseTimeToMinutes(window.start_time)
  const endMinutes = parseTimeToMinutes(window.end_time)
  const requiredDuration = sessionDuration + bufferTime

  switch (strategy) {
    case 'earliest':
      // Generate only the earliest possible slot
      if (endMinutes - startMinutes >= requiredDuration) {
        const slotEndMinutes = startMinutes + sessionDuration
        slots.push(createAlternativeTimeSlot(
          window,
          minutesToTime(startMinutes),
          minutesToTime(slotEndMinutes),
          1.0 // High confidence for earliest slot
        ))
      }
      break

    case 'latest':
      // Generate only the latest possible slot
      if (endMinutes - startMinutes >= requiredDuration) {
        const slotStartMinutes = endMinutes - sessionDuration
        slots.push(createAlternativeTimeSlot(
          window,
          minutesToTime(slotStartMinutes),
          minutesToTime(endMinutes),
          0.9 // Slightly lower confidence for latest slot
        ))
      }
      break

    case 'optimal':
      // Generate slots at optimal intervals (every 30 minutes)
      const interval = 30
      for (let currentStart = startMinutes; currentStart + sessionDuration <= endMinutes; currentStart += interval) {
        const currentEnd = currentStart + sessionDuration
        
        // Calculate confidence based on position within window
        const windowProgress = (currentStart - startMinutes) / (endMinutes - startMinutes - sessionDuration)
        const confidence = 1.0 - (windowProgress * 0.3) // Prefer earlier times

        slots.push(createAlternativeTimeSlot(
          window,
          minutesToTime(currentStart),
          minutesToTime(currentEnd),
          confidence
        ))
      }
      break

    case 'distributed':
      // Generate evenly distributed slots across the window
      const maxSlots = 4
      const availableTime = endMinutes - startMinutes - sessionDuration
      if (availableTime > 0) {
        const slotInterval = Math.max(30, availableTime / maxSlots)
        
        for (let i = 0; i < maxSlots && startMinutes + (i * slotInterval) + sessionDuration <= endMinutes; i++) {
          const slotStart = startMinutes + (i * slotInterval)
          const slotEnd = slotStart + sessionDuration
          
          slots.push(createAlternativeTimeSlot(
            window,
            minutesToTime(slotStart),
            minutesToTime(slotEnd),
            0.8 // Moderate confidence for distributed slots
          ))
        }
      }
      break
  }

  return slots
}

/**
 * Create an alternative time slot object
 */
function createAlternativeTimeSlot(
  window: AvailabilityWindow,
  startTime: string,
  endTime: string,
  confidence: number
): AlternativeTimeSlot {
  return {
    start_time: startTime,
    end_time: endTime,
    date: window.date,
    therapist_id: window.therapist_id,
    room_id: null, // To be determined during filtering
    confidence_score: confidence * window.preference_score,
    estimated_travel_time: 0,
    potential_conflicts: [],
    optimization_notes: []
  }
}

/**
 * Filter slots by constraints and availability
 */
async function filterSlotsByConstraints(
  slots: AlternativeTimeSlot[],
  originalSession: ScheduledSession,
  criteria: SuggestionCriteria
): Promise<AlternativeTimeSlot[]> {
  
  const filteredSlots = []

  for (const slot of slots) {
    let isValid = true
    const validationNotes: string[] = []

    // Check therapist availability conflicts
    const therapistConflicts = await checkTherapistConflictsAtSlot(slot)
    if (therapistConflicts.length > 0) {
      isValid = false
      validationNotes.push(`Therapist has ${therapistConflicts.length} conflicts`)
    }

    // Check student schedule conflicts
    const studentConflicts = await checkStudentConflictsAtSlot(slot, originalSession.student_id)
    if (studentConflicts.length > 0) {
      isValid = false
      validationNotes.push(`Student has ${studentConflicts.length} conflicts`)
    }

    // Check room availability (if room is specified)
    if (slot.room_id) {
      const roomAvailable = await checkRoomAvailability(
        slot.room_id,
        slot.date,
        slot.start_time,
        slot.end_time
      )
      if (!roomAvailable) {
        isValid = false
        validationNotes.push('Room not available')
      }
    }

    // Apply criteria filters
    if (criteria.max_days_from_original) {
      const daysDifference = calculateDaysDifference(originalSession.session_date, slot.date)
      if (daysDifference > criteria.max_days_from_original) {
        isValid = false
        validationNotes.push(`Exceeds max days limit (${daysDifference} > ${criteria.max_days_from_original})`)
      }
    }

    if (criteria.preferred_time_slots) {
      const timeMatches = criteria.preferred_time_slots.some(preferredTime =>
        isTimeInRange(slot.start_time, preferredTime.start, preferredTime.end)
      )
      if (!timeMatches) {
        // Don't mark as invalid, but lower confidence
        slot.confidence_score *= 0.7
        validationNotes.push('Outside preferred time slots')
      }
    }

    if (isValid || criteria.include_suboptimal_alternatives) {
      slot.optimization_notes = validationNotes
      filteredSlots.push(slot)
    }
  }

  return filteredSlots
}

/**
 * Rank alternative suggestions using scoring algorithms
 */
async function rankAlternativeSuggestions(
  slots: AlternativeTimeSlot[],
  originalSession: ScheduledSession,
  preferences: OptimizationPreference
): Promise<AlternativeSuggestion[]> {
  
  const suggestions: AlternativeSuggestion[] = []

  for (const slot of slots) {
    // Calculate various scoring factors
    const timeScore = calculateTimePreferenceScore(slot, originalSession, preferences)
    const dateScore = calculateDatePreferenceScore(slot, originalSession, preferences)
    const resourceScore = await calculateResourceAvailabilityScore(slot, originalSession)
    const impactScore = await calculateScheduleImpactScore(slot, originalSession)
    const continuityScore = calculateContinuityScore(slot, originalSession)

    // Weight the scores based on preferences
    const weights = {
      time: preferences.prioritize_time_preferences ? 0.3 : 0.2,
      date: preferences.minimize_date_changes ? 0.25 : 0.15,
      resource: preferences.optimize_resource_usage ? 0.2 : 0.15,
      impact: preferences.minimize_disruption ? 0.15 : 0.25,
      continuity: preferences.maintain_continuity ? 0.1 : 0.25
    }

    const overallScore = 
      timeScore * weights.time +
      dateScore * weights.date +
      resourceScore * weights.resource +
      impactScore * weights.impact +
      continuityScore * weights.continuity

    // Create suggestion with detailed analysis
    const suggestion: AlternativeSuggestion = {
      id: generateSuggestionId(),
      alternative_slot: slot,
      overall_score: overallScore,
      individual_scores: {
        time_preference: timeScore,
        date_preference: dateScore,
        resource_availability: resourceScore,
        schedule_impact: impactScore,
        continuity: continuityScore
      },
      ranking_factors: {
        days_from_original: calculateDaysDifference(originalSession.session_date, slot.date),
        time_difference_minutes: calculateTimeDifference(originalSession.start_time, slot.start_time),
        same_therapist: slot.therapist_id === originalSession.therapist_id,
        same_room: slot.room_id === originalSession.room_id,
        disruption_level: await calculateDisruptionLevel(slot, originalSession)
      },
      implementation_complexity: calculateImplementationComplexity(slot, originalSession),
      benefits: generateBenefitsList(slot, originalSession),
      drawbacks: generateDrawbacksList(slot, originalSession),
      recommendation_confidence: slot.confidence_score * overallScore
    }

    suggestions.push(suggestion)
  }

  // Sort by overall score (descending)
  return suggestions.sort((a, b) => b.overall_score - a.overall_score)
}

/**
 * Enrich suggestions with detailed analysis
 */
async function enrichSuggestionsWithAnalysis(
  suggestions: AlternativeSuggestion[],
  originalSession: ScheduledSession
): Promise<AlternativeSuggestion[]> {
  
  const enriched = []

  for (const suggestion of suggestions) {
    // Add cascade impact analysis
    const cascadeImpact = await analyzeCascadeImpact(suggestion.alternative_slot, originalSession)
    
    // Add resource optimization analysis
    const resourceOptimization = await analyzeResourceOptimization(suggestion.alternative_slot)
    
    // Add cost-benefit analysis
    const costBenefit = await analyzeCostBenefit(suggestion, originalSession)

    const enrichedSuggestion: AlternativeSuggestion = {
      ...suggestion,
      cascade_impact: cascadeImpact,
      resource_optimization: resourceOptimization,
      cost_benefit_analysis: costBenefit,
      implementation_steps: generateImplementationSteps(suggestion, originalSession),
      risk_assessment: await generateRiskAssessment(suggestion, originalSession),
      success_probability: calculateSuccessProbability(suggestion)
    }

    enriched.push(enrichedSuggestion)
  }

  return enriched
}

// =====================================================
// Helper Functions
// =====================================================

function getDefaultDateRange(): { start_date: string; end_date: string } {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 14) // 2 weeks ahead
  
  return {
    start_date: today.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

async function findSuitableAlternativeTherapists(
  session: ScheduledSession,
  specializationPriority: 'strict' | 'preferred' | 'flexible'
): Promise<Array<{
  id: string
  first_name_ar: string
  first_name_en: string
  last_name_ar: string
  last_name_en: string
  specializations: string[]
  experience_years: number
  current_workload: number
}>> {
  
  // Get session specialization requirements
  const { data: sessionRequirements } = await supabase
    .from('therapy_sessions')
    .select(`
      therapy_programs!inner (
        therapist_specializations
      )
    `)
    .eq('id', session.id)
    .single()

  const requiredSpecializations = sessionRequirements?.therapy_programs?.therapist_specializations || []

  let query = supabase
    .from('therapists')
    .select(`
      id,
      first_name_ar,
      first_name_en,
      last_name_ar,
      last_name_en,
      specializations,
      experience_years,
      is_active,
      max_daily_sessions
    `)
    .eq('is_active', true)
    .neq('id', session.therapist_id) // Exclude current therapist

  // Apply specialization filtering based on priority
  if (specializationPriority === 'strict' && requiredSpecializations.length > 0) {
    query = query.contains('specializations', requiredSpecializations)
  }

  const { data: therapists } = await query

  if (!therapists) return []

  // Filter and score therapists
  const suitableTherapists = []

  for (const therapist of therapists) {
    let specializationMatch = 1.0

    if (requiredSpecializations.length > 0) {
      const matchingSpecs = therapist.specializations?.filter(spec => 
        requiredSpecializations.includes(spec)
      ) || []
      
      specializationMatch = matchingSpecs.length / requiredSpecializations.length

      if (specializationPriority === 'strict' && specializationMatch < 1.0) {
        continue
      }
      
      if (specializationPriority === 'preferred' && specializationMatch < 0.5) {
        continue
      }
    }

    // Calculate current workload
    const workload = await calculateCurrentTherapistWorkload(therapist.id)

    suitableTherapists.push({
      ...therapist,
      specialization_match: specializationMatch,
      current_workload: workload
    })
  }

  // Sort by specialization match and workload
  return suitableTherapists
    .sort((a, b) => {
      const scoreA = a.specialization_match - (a.current_workload * 0.1)
      const scoreB = b.specialization_match - (b.current_workload * 0.1)
      return scoreB - scoreA
    })
    .slice(0, 10) // Return top 10 candidates
}

function getDatesByDayOfWeek(dayOfWeek: number, startDate: string, endDate: string): string[] {
  const dates = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Find the first occurrence of the day
  const startDay = start.getDay() === 0 ? 7 : start.getDay()
  const daysUntilTarget = ((dayOfWeek - startDay + 7) % 7)
  const firstOccurrence = new Date(start)
  firstOccurrence.setDate(start.getDate() + daysUntilTarget)
  
  // Generate all occurrences
  let currentDate = new Date(firstOccurrence)
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0])
    currentDate.setDate(currentDate.getDate() + 7)
  }
  
  return dates
}

function calculateDurationBetween(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  return end - start
}

function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function calculateDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const timeDifference = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24))
}

function calculateTimeDifference(time1: string, time2: string): number {
  const minutes1 = parseTimeToMinutes(time1)
  const minutes2 = parseTimeToMinutes(time2)
  return Math.abs(minutes2 - minutes1)
}

function isTimeInRange(time: string, rangeStart: string, rangeEnd: string): boolean {
  const timeMinutes = parseTimeToMinutes(time)
  const startMinutes = parseTimeToMinutes(rangeStart)
  const endMinutes = parseTimeToMinutes(rangeEnd)
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes
}

function generateSuggestionId(): string {
  return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Scoring functions (simplified implementations)
function calculateTimePreferenceScore(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession,
  preferences: OptimizationPreference
): number {
  // Implementation for time preference scoring
  return 0.8 // Placeholder
}

function calculateDatePreferenceScore(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession,
  preferences: OptimizationPreference
): number {
  // Prefer closer dates
  const daysDiff = calculateDaysDifference(originalSession.session_date, slot.date)
  return Math.max(0, 1.0 - (daysDiff * 0.1))
}

async function calculateResourceAvailabilityScore(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): Promise<number> {
  // Implementation for resource availability scoring
  return 0.9 // Placeholder
}

async function calculateScheduleImpactScore(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): Promise<number> {
  // Implementation for schedule impact scoring
  return 0.7 // Placeholder
}

function calculateContinuityScore(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): number {
  // Same therapist = higher continuity
  return slot.therapist_id === originalSession.therapist_id ? 1.0 : 0.5
}

function calculateImplementationComplexity(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): 'low' | 'medium' | 'high' {
  let complexity = 0
  
  if (slot.therapist_id !== originalSession.therapist_id) complexity += 1
  if (slot.date !== originalSession.session_date) complexity += 1
  if (slot.room_id !== originalSession.room_id) complexity += 1
  
  if (complexity === 0) return 'low'
  if (complexity <= 2) return 'medium'
  return 'high'
}

function generateBenefitsList(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): string[] {
  const benefits = []
  
  if (slot.therapist_id === originalSession.therapist_id) {
    benefits.push('Maintains therapist continuity')
  }
  
  if (slot.date === originalSession.session_date) {
    benefits.push('Same day scheduling')
  }
  
  if (slot.confidence_score > 0.8) {
    benefits.push('High availability confidence')
  }
  
  return benefits
}

function generateDrawbacksList(
  slot: AlternativeTimeSlot,
  originalSession: ScheduledSession
): string[] {
  const drawbacks = []
  
  if (slot.therapist_id !== originalSession.therapist_id) {
    drawbacks.push('Different therapist assignment')
  }
  
  if (calculateDaysDifference(originalSession.session_date, slot.date) > 3) {
    drawbacks.push('Significant date change')
  }
  
  if (slot.optimization_notes.length > 0) {
    drawbacks.push('Has scheduling constraints')
  }
  
  return drawbacks
}

function generateRecommendationSummary(suggestions: AlternativeSuggestion[]): {
  top_recommendation_id: string
  total_viable_alternatives: number
  recommendation_categories: Record<string, number>
  average_confidence_score: number
} {
  if (suggestions.length === 0) {
    return {
      top_recommendation_id: '',
      total_viable_alternatives: 0,
      recommendation_categories: {},
      average_confidence_score: 0
    }
  }

  const categories: Record<string, number> = {
    same_day: 0,
    same_therapist: 0,
    different_day: 0,
    different_therapist: 0
  }

  let totalConfidence = 0

  suggestions.forEach(suggestion => {
    totalConfidence += suggestion.recommendation_confidence

    if (suggestion.ranking_factors.same_therapist) categories.same_therapist++
    else categories.different_therapist++
    
    if (suggestion.ranking_factors.days_from_original === 0) categories.same_day++
    else categories.different_day++
  })

  return {
    top_recommendation_id: suggestions[0].id,
    total_viable_alternatives: suggestions.length,
    recommendation_categories: categories,
    average_confidence_score: totalConfidence / suggestions.length
  }
}

// Additional helper functions (placeholders)
async function checkTherapistConflictsAtSlot(slot: AlternativeTimeSlot): Promise<any[]> {
  return [] // Implementation needed
}

async function checkStudentConflictsAtSlot(slot: AlternativeTimeSlot, studentId: string): Promise<any[]> {
  return [] // Implementation needed
}

async function checkRoomAvailability(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  return true // Implementation needed
}

async function calculateAvailabilityScore(availableSlots: any[], session: ScheduledSession): Promise<number> {
  return 0.8 // Implementation needed
}

async function calculateContinuityScore(therapistId: string, studentId: string): Promise<number> {
  return 0.7 // Implementation needed
}

async function calculateWorkloadScore(therapistId: string, date: string): Promise<number> {
  return 0.6 // Implementation needed
}

function generateTherapistSuggestionConsiderations(
  therapist: any,
  session: ScheduledSession,
  continuityScore: number,
  workloadScore: number
): string[] {
  return ['Consider specialization match', 'Check availability windows'] // Implementation needed
}

async function getSessionEquipmentRequirements(sessionId: string): Promise<any[]> {
  return [] // Implementation needed
}

async function calculateEquipmentAvailabilityScore(
  equipmentId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<number> {
  return 0.8 // Implementation needed
}

function calculateEquipmentCompatibilityScore(equipment: any, requirements: any[]): number {
  return 0.9 // Implementation needed
}

async function calculateRoomSuitabilityScore(room: any, session: ScheduledSession): Promise<number> {
  return 0.8 // Implementation needed
}

async function calculateRoomDistance(roomId1: string, roomId2?: string): Promise<number> {
  return 0 // Implementation needed
}

async function getRoomAvailabilityWindows(roomId: string, date: string): Promise<AvailabilityWindow[]> {
  return [] // Implementation needed
}

async function calculateCurrentTherapistWorkload(therapistId: string): Promise<number> {
  return 0.5 // Implementation needed
}

async function analyzeCascadeImpact(slot: AlternativeTimeSlot, originalSession: ScheduledSession): Promise<any> {
  return {} // Implementation needed
}

async function analyzeResourceOptimization(slot: AlternativeTimeSlot): Promise<any> {
  return {} // Implementation needed
}

async function analyzeCostBenefit(suggestion: AlternativeSuggestion, originalSession: ScheduledSession): Promise<any> {
  return {} // Implementation needed
}

function generateImplementationSteps(suggestion: AlternativeSuggestion, originalSession: ScheduledSession): string[] {
  return ['Update session time', 'Notify stakeholders', 'Confirm resources'] // Implementation needed
}

async function generateRiskAssessment(suggestion: AlternativeSuggestion, originalSession: ScheduledSession): Promise<any> {
  return {} // Implementation needed
}

function calculateSuccessProbability(suggestion: AlternativeSuggestion): number {
  return suggestion.recommendation_confidence * 0.8 // Implementation needed
}

async function calculateDisruptionLevel(slot: AlternativeTimeSlot, originalSession: ScheduledSession): Promise<number> {
  return 0.3 // Implementation needed
}