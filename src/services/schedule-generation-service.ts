/**
 * Schedule Generation Service
 * Story 3.1: Automated Scheduling Engine - Task 3
 * 
 * Core scheduling engine for automated session schedule generation
 * Supports program-based scheduling, flexible rules, and optimization algorithms
 */

import { supabase } from '../lib/supabase'
import type {
  ScheduledSession,
  StudentSubscription,
  TherapyProgram,
  TherapistAvailability,
  ScheduleRule,
  SchedulePattern,
  SessionCategory,
  OptimizationRule,
  ScheduleGenerationRequest,
  ScheduleGenerationResult,
  ScheduleConflict,
  TimeSlot,
  SchedulingMetrics
} from '../types/scheduling'

// =====================================================
// Core Schedule Generation Engine
// =====================================================

/**
 * Generate automated session schedules based on program requirements
 * @param request - Schedule generation parameters
 * @returns Generated schedule with metrics and conflicts
 */
export async function generateSchedule(
  request: ScheduleGenerationRequest
): Promise<ScheduleGenerationResult> {
  try {
    const startTime = Date.now()
    
    // Step 1: Fetch program requirements and student subscriptions
    const programData = await fetchProgramRequirements(request.program_ids)
    const subscriptions = await fetchActiveSubscriptions(request.student_ids)
    
    // Step 2: Get therapist availability for the date range
    const availability = await fetchTherapistAvailability(
      request.therapist_ids,
      request.start_date,
      request.end_date
    )
    
    // Step 3: Apply scheduling rules and patterns
    const scheduleRules = await getSchedulingRules(request.rule_set_id)
    
    // Step 4: Generate initial schedule based on requirements
    const initialSchedule = await generateInitialSchedule({
      programData,
      subscriptions,
      availability,
      rules: scheduleRules,
      dateRange: {
        start_date: request.start_date,
        end_date: request.end_date
      }
    })
    
    // Step 5: Optimize schedule for efficiency and resource utilization
    const optimizedSchedule = await optimizeSchedule(
      initialSchedule,
      request.optimization_rules || []
    )
    
    // Step 6: Detect and resolve conflicts
    const { finalSchedule, conflicts } = await resolveScheduleConflicts(
      optimizedSchedule,
      availability
    )
    
    // Step 7: Calculate metrics and performance indicators
    const metrics = await calculateScheduleMetrics(finalSchedule)
    
    const generationTime = Date.now() - startTime
    
    return {
      success: true,
      data: {
        generated_sessions: finalSchedule,
        conflicts: conflicts,
        metrics: metrics,
        generation_time_ms: generationTime,
        rules_applied: scheduleRules.length,
        optimization_applied: request.optimization_rules?.length || 0
      }
    }
    
  } catch (error) {
    console.error('Schedule generation failed:', error)
    return {
      success: false,
      error: `فشل في توليد الجدول: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      error_en: `Schedule generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Fetch therapy program requirements and session patterns
 */
async function fetchProgramRequirements(programIds: string[]): Promise<TherapyProgram[]> {
  const { data, error } = await supabase
    .from('therapy_programs')
    .select(`
      id,
      name_ar,
      name_en,
      program_type,
      sessions_per_week,
      session_duration_minutes,
      program_duration_weeks,
      session_categories,
      special_requirements,
      therapist_specializations,
      created_at,
      updated_at
    `)
    .in('id', programIds)
    .eq('is_active', true)
    .order('name_ar', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch program requirements: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch active student subscriptions for scheduling
 */
async function fetchActiveSubscriptions(studentIds: string[]): Promise<StudentSubscription[]> {
  const { data, error } = await supabase
    .from('student_subscriptions')
    .select(`
      id,
      student_id,
      therapy_program_id,
      start_date,
      end_date,
      freeze_start_date,
      freeze_end_date,
      status,
      sessions_completed,
      sessions_remaining,
      preferred_schedule,
      special_notes,
      created_at,
      updated_at,
      students!inner (
        id,
        first_name_ar,
        first_name_en,
        last_name_ar,
        last_name_en,
        date_of_birth,
        preferred_language
      ),
      therapy_programs!inner (
        id,
        name_ar,
        name_en,
        sessions_per_week,
        session_duration_minutes
      )
    `)
    .in('student_id', studentIds)
    .in('status', ['active', 'on_hold'])
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch student subscriptions: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch therapist availability for the specified date range
 */
async function fetchTherapistAvailability(
  therapistIds: string[],
  startDate: string,
  endDate: string
): Promise<TherapistAvailability[]> {
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
      session_buffer_minutes,
      notes,
      created_at,
      updated_at,
      therapists!inner (
        id,
        first_name_ar,
        first_name_en,
        last_name_ar,
        last_name_en,
        specializations,
        max_sessions_per_day
      )
    `)
    .in('therapist_id', therapistIds)
    .eq('is_available', true)
    .or(`specific_date.is.null,specific_date.gte.${startDate},specific_date.lte.${endDate}`)
    .order('therapist_id', { ascending: true })
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch therapist availability: ${error.message}`)
  }

  return data || []
}

/**
 * Get scheduling rules and patterns for the rule set
 */
async function getSchedulingRules(ruleSetId?: string): Promise<ScheduleRule[]> {
  if (!ruleSetId) {
    return getDefaultSchedulingRules()
  }

  const { data, error } = await supabase
    .from('schedule_rules')
    .select(`
      id,
      rule_name_ar,
      rule_name_en,
      rule_type,
      pattern_config,
      priority,
      is_mandatory,
      conditions,
      actions,
      created_at,
      updated_at
    `)
    .eq('rule_set_id', ruleSetId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) {
    console.warn(`Failed to fetch custom scheduling rules: ${error.message}`)
    return getDefaultSchedulingRules()
  }

  return data || getDefaultSchedulingRules()
}

/**
 * Generate initial schedule based on program requirements
 */
async function generateInitialSchedule(params: {
  programData: TherapyProgram[]
  subscriptions: StudentSubscription[]
  availability: TherapistAvailability[]
  rules: ScheduleRule[]
  dateRange: { start_date: string; end_date: string }
}): Promise<ScheduledSession[]> {
  const sessions: ScheduledSession[] = []
  const { programData, subscriptions, availability, rules, dateRange } = params

  for (const subscription of subscriptions) {
    const program = programData.find(p => p.id === subscription.therapy_program_id)
    if (!program) continue

    // Skip if subscription is frozen
    if (subscription.freeze_start_date && subscription.freeze_end_date) {
      const freezeStart = new Date(subscription.freeze_start_date)
      const freezeEnd = new Date(subscription.freeze_end_date)
      const currentDate = new Date()
      
      if (currentDate >= freezeStart && currentDate <= freezeEnd) {
        continue
      }
    }

    // Find suitable therapists for the program
    const suitableTherapists = findSuitableTherapists(program, availability)

    // Generate sessions based on program frequency
    const programSessions = await generateProgramSessions({
      subscription,
      program,
      therapists: suitableTherapists,
      availability,
      rules,
      dateRange
    })

    sessions.push(...programSessions)
  }

  return sessions
}

/**
 * Find therapists suitable for a therapy program
 */
function findSuitableTherapists(
  program: TherapyProgram,
  availability: TherapistAvailability[]
): TherapistAvailability[] {
  return availability.filter(avail => {
    const therapist = avail.therapists
    if (!therapist) return false

    // Check if therapist has required specializations
    const requiredSpecializations = program.therapist_specializations || []
    const therapistSpecializations = therapist.specializations || []
    
    const hasRequiredSpecialization = requiredSpecializations.length === 0 || 
      requiredSpecializations.some(req => 
        therapistSpecializations.includes(req)
      )

    return hasRequiredSpecialization
  })
}

/**
 * Generate sessions for a specific program subscription
 */
async function generateProgramSessions(params: {
  subscription: StudentSubscription
  program: TherapyProgram
  therapists: TherapistAvailability[]
  availability: TherapistAvailability[]
  rules: ScheduleRule[]
  dateRange: { start_date: string; end_date: string }
}): Promise<ScheduledSession[]> {
  const { subscription, program, therapists, rules, dateRange } = params
  const sessions: ScheduledSession[] = []

  const startDate = new Date(dateRange.start_date)
  const endDate = new Date(dateRange.end_date)
  const sessionDuration = program.session_duration_minutes
  const sessionsPerWeek = program.sessions_per_week

  // Apply scheduling patterns based on sessions per week
  const schedulePattern = getSchedulePattern(sessionsPerWeek, rules)

  let currentDate = new Date(startDate)
  let weekSessionCount = 0
  let currentWeekStart = new Date(currentDate)
  currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Monday

  while (currentDate <= endDate && sessions.length < subscription.sessions_remaining) {
    // Reset weekly counter
    if (currentDate >= new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      weekSessionCount = 0
      currentWeekStart = new Date(currentDate)
      currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1)
    }

    // Check if we should schedule a session on this day
    if (weekSessionCount < sessionsPerWeek && 
        shouldScheduleOnDay(currentDate, schedulePattern)) {
      
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay() // Sunday = 7
      const availableTherapists = therapists.filter(t => t.day_of_week === dayOfWeek)

      if (availableTherapists.length > 0) {
        // Find best time slot
        const bestSlot = findBestTimeSlot(
          currentDate,
          availableTherapists,
          sessionDuration,
          rules
        )

        if (bestSlot) {
          const session: ScheduledSession = {
            id: generateSessionId(),
            student_id: subscription.student_id,
            therapist_id: bestSlot.therapist_id,
            therapy_program_id: program.id,
            subscription_id: subscription.id,
            session_date: formatDate(currentDate),
            start_time: bestSlot.start_time,
            end_time: bestSlot.end_time,
            duration_minutes: sessionDuration,
            session_type: program.program_type === 'individual' ? 'individual' : 'group',
            session_category: getSessionCategory(program, rules),
            status: 'scheduled',
            room_id: null, // To be assigned during optimization
            notes: subscription.special_notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system'
          }

          sessions.push(session)
          weekSessionCount++
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return sessions
}

/**
 * Optimize schedule for efficiency and resource utilization
 */
async function optimizeSchedule(
  initialSchedule: ScheduledSession[],
  optimizationRules: OptimizationRule[]
): Promise<ScheduledSession[]> {
  let optimizedSchedule = [...initialSchedule]

  // Apply optimization rules in priority order
  const sortedRules = optimizationRules.sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    switch (rule.type) {
      case 'minimize_gaps':
        optimizedSchedule = minimizeTherapistGaps(optimizedSchedule)
        break
      case 'maximize_utilization':
        optimizedSchedule = maximizeResourceUtilization(optimizedSchedule)
        break
      case 'group_sessions':
        optimizedSchedule = groupRelatedSessions(optimizedSchedule)
        break
      case 'balance_workload':
        optimizedSchedule = balanceTherapistWorkload(optimizedSchedule)
        break
    }
  }

  return optimizedSchedule
}

/**
 * Resolve schedule conflicts and return final schedule
 */
async function resolveScheduleConflicts(
  schedule: ScheduledSession[],
  availability: TherapistAvailability[]
): Promise<{ finalSchedule: ScheduledSession[]; conflicts: ScheduleConflict[] }> {
  const conflicts: ScheduleConflict[] = []
  const finalSchedule: ScheduledSession[] = []

  // Group sessions by therapist and date for conflict detection
  const sessionsByTherapistDate = groupSessionsByTherapistDate(schedule)

  for (const [key, sessions] of sessionsByTherapistDate.entries()) {
    const [therapistId, date] = key.split('|')
    
    // Check for time conflicts
    const sortedSessions = sessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )

    for (let i = 0; i < sortedSessions.length; i++) {
      const currentSession = sortedSessions[i]
      let hasConflict = false

      // Check overlap with previous session
      if (i > 0) {
        const previousSession = sortedSessions[i - 1]
        if (hasTimeOverlap(previousSession, currentSession)) {
          conflicts.push({
            session_id: currentSession.id,
            conflict_type: 'therapist_double_booked',
            conflict_severity: 'high',
            conflicting_session_id: previousSession.id,
            description_ar: 'تعارض في مواعيد المعالج',
            description_en: 'Therapist double booking conflict',
            suggested_resolution: 'reschedule_session'
          })
          hasConflict = true
        }
      }

      // Check availability constraints
      const therapistAvailability = availability.find(a => 
        a.therapist_id === therapistId && 
        a.day_of_week === new Date(date).getDay()
      )

      if (therapistAvailability && 
          !isTimeWithinAvailability(currentSession, therapistAvailability)) {
        conflicts.push({
          session_id: currentSession.id,
          conflict_type: 'therapist_unavailable',
          conflict_severity: 'high',
          description_ar: 'المعالج غير متاح في هذا الوقت',
          description_en: 'Therapist not available at this time',
          suggested_resolution: 'find_alternative_time'
        })
        hasConflict = true
      }

      // Add to final schedule if no conflicts
      if (!hasConflict) {
        finalSchedule.push(currentSession)
      }
    }
  }

  return { finalSchedule, conflicts }
}

/**
 * Calculate schedule generation metrics
 */
async function calculateScheduleMetrics(schedule: ScheduledSession[]): Promise<SchedulingMetrics> {
  const totalSessions = schedule.length
  const uniqueTherapists = new Set(schedule.map(s => s.therapist_id)).size
  const uniqueStudents = new Set(schedule.map(s => s.student_id)).size
  
  // Calculate duration metrics
  const totalMinutes = schedule.reduce((sum, s) => sum + s.duration_minutes, 0)
  const avgSessionDuration = totalSessions > 0 ? totalMinutes / totalSessions : 0
  
  // Calculate date range
  const dates = schedule.map(s => s.session_date).sort()
  const dateRange = dates.length > 0 ? {
    start_date: dates[0],
    end_date: dates[dates.length - 1]
  } : null

  // Calculate utilization by therapist
  const therapistUtilization = calculateTherapistUtilization(schedule)
  
  return {
    total_sessions_generated: totalSessions,
    unique_therapists_involved: uniqueTherapists,
    unique_students_scheduled: uniqueStudents,
    total_duration_minutes: totalMinutes,
    average_session_duration: avgSessionDuration,
    schedule_date_range: dateRange,
    therapist_utilization_stats: therapistUtilization,
    optimization_score: calculateOptimizationScore(schedule),
    efficiency_rating: calculateEfficiencyRating(schedule)
  }
}

// =====================================================
// Helper Functions
// =====================================================

function getDefaultSchedulingRules(): ScheduleRule[] {
  return [
    {
      id: 'default-1',
      rule_name_ar: 'تجنب الفترات المزدحمة',
      rule_name_en: 'Avoid peak hours',
      rule_type: 'time_preference',
      pattern_config: { avoid_hours: ['12:00-13:00'] },
      priority: 3,
      is_mandatory: false,
      conditions: { day_type: 'weekday' },
      actions: { prefer_morning: true }
    },
    {
      id: 'default-2',
      rule_name_ar: 'فترة راحة بين الجلسات',
      rule_name_en: 'Buffer time between sessions',
      rule_type: 'buffer_time',
      pattern_config: { buffer_minutes: 15 },
      priority: 5,
      is_mandatory: true,
      conditions: {},
      actions: { enforce_buffer: true }
    }
  ]
}

function getSchedulePattern(sessionsPerWeek: number, rules: ScheduleRule[]): SchedulePattern {
  // Find pattern rules
  const patternRule = rules.find(r => r.rule_type === 'session_pattern')
  
  if (patternRule && patternRule.pattern_config) {
    return patternRule.pattern_config as SchedulePattern
  }

  // Default patterns based on frequency
  if (sessionsPerWeek <= 2) {
    return { days: [1, 3], pattern_type: 'spaced' } // Mon, Wed
  } else if (sessionsPerWeek <= 3) {
    return { days: [1, 3, 5], pattern_type: 'spaced' } // Mon, Wed, Fri
  } else {
    return { days: [1, 2, 4, 5], pattern_type: 'consecutive' } // Mon-Fri
  }
}

function shouldScheduleOnDay(date: Date, pattern: SchedulePattern): boolean {
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
  return pattern.days.includes(dayOfWeek)
}

function findBestTimeSlot(
  date: Date,
  availableTherapists: TherapistAvailability[],
  duration: number,
  rules: ScheduleRule[]
): { therapist_id: string; start_time: string; end_time: string } | null {
  
  for (const availability of availableTherapists) {
    const startTime = availability.start_time
    const endTime = availability.end_time
    
    // Calculate session end time
    const sessionStart = new Date(`${formatDate(date)} ${startTime}`)
    const sessionEnd = new Date(sessionStart.getTime() + duration * 60000)
    const sessionEndTime = `${sessionEnd.getHours().toString().padStart(2, '0')}:${sessionEnd.getMinutes().toString().padStart(2, '0')}`
    
    // Check if session fits within availability
    if (sessionEndTime <= endTime) {
      return {
        therapist_id: availability.therapist_id,
        start_time: startTime,
        end_time: sessionEndTime
      }
    }
  }
  
  return null
}

function getSessionCategory(program: TherapyProgram, rules: ScheduleRule[]): SessionCategory {
  // Check for category rules
  const categoryRule = rules.find(r => r.rule_type === 'session_category')
  
  if (categoryRule && categoryRule.pattern_config?.category) {
    return categoryRule.pattern_config.category as SessionCategory
  }

  // Default based on program type
  switch (program.program_type) {
    case 'speech_therapy':
      return 'speech_therapy'
    case 'occupational_therapy':
      return 'occupational_therapy'
    case 'physical_therapy':
      return 'physical_therapy'
    case 'behavioral_therapy':
      return 'behavioral_therapy'
    default:
      return 'general_therapy'
  }
}

function minimizeTherapistGaps(schedule: ScheduledSession[]): ScheduledSession[] {
  // Group sessions by therapist and date, then sort by time
  const therapistSchedules = new Map<string, ScheduledSession[]>()
  
  schedule.forEach(session => {
    const key = `${session.therapist_id}|${session.session_date}`
    if (!therapistSchedules.has(key)) {
      therapistSchedules.set(key, [])
    }
    therapistSchedules.get(key)!.push(session)
  })
  
  // Sort sessions by time to minimize gaps
  therapistSchedules.forEach(sessions => {
    sessions.sort((a, b) => a.start_time.localeCompare(b.start_time))
  })
  
  return Array.from(therapistSchedules.values()).flat()
}

function maximizeResourceUtilization(schedule: ScheduledSession[]): ScheduledSession[] {
  // Implementation for maximizing resource utilization
  return schedule // Placeholder - would implement room assignment optimization
}

function groupRelatedSessions(schedule: ScheduledSession[]): ScheduledSession[] {
  // Group sessions by program or student for efficiency
  return schedule.sort((a, b) => {
    if (a.therapy_program_id !== b.therapy_program_id) {
      return a.therapy_program_id.localeCompare(b.therapy_program_id)
    }
    return a.session_date.localeCompare(b.session_date)
  })
}

function balanceTherapistWorkload(schedule: ScheduledSession[]): ScheduledSession[] {
  // Calculate sessions per therapist and redistribute if needed
  const therapistLoad = new Map<string, number>()
  
  schedule.forEach(session => {
    therapistLoad.set(
      session.therapist_id, 
      (therapistLoad.get(session.therapist_id) || 0) + 1
    )
  })
  
  // Would implement load balancing logic here
  return schedule
}

function groupSessionsByTherapistDate(schedule: ScheduledSession[]): Map<string, ScheduledSession[]> {
  const groups = new Map<string, ScheduledSession[]>()
  
  schedule.forEach(session => {
    const key = `${session.therapist_id}|${session.session_date}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(session)
  })
  
  return groups
}

function hasTimeOverlap(session1: ScheduledSession, session2: ScheduledSession): boolean {
  const start1 = session1.start_time
  const end1 = session1.end_time
  const start2 = session2.start_time
  const end2 = session2.end_time
  
  return !(end1 <= start2 || end2 <= start1)
}

function isTimeWithinAvailability(session: ScheduledSession, availability: TherapistAvailability): boolean {
  return session.start_time >= availability.start_time && 
         session.end_time <= availability.end_time
}

function calculateTherapistUtilization(schedule: ScheduledSession[]): Record<string, number> {
  const utilization: Record<string, number> = {}
  
  schedule.forEach(session => {
    utilization[session.therapist_id] = (utilization[session.therapist_id] || 0) + session.duration_minutes
  })
  
  return utilization
}

function calculateOptimizationScore(schedule: ScheduledSession[]): number {
  // Calculate optimization score based on various factors
  if (schedule.length === 0) return 0
  
  let score = 100
  
  // Deduct points for gaps, conflicts, etc.
  // This is a simplified scoring system
  
  return Math.max(0, Math.min(100, score))
}

function calculateEfficiencyRating(schedule: ScheduledSession[]): 'excellent' | 'good' | 'fair' | 'poor' {
  const score = calculateOptimizationScore(schedule)
  
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good' 
  if (score >= 60) return 'fair'
  return 'poor'
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// =====================================================
// Public API Functions
// =====================================================

/**
 * Validate schedule generation request
 */
export function validateScheduleRequest(request: ScheduleGenerationRequest): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!request.start_date) {
    errors.push('تاريخ البداية مطلوب / Start date is required')
  }
  
  if (!request.end_date) {
    errors.push('تاريخ النهاية مطلوب / End date is required')
  }
  
  if (request.start_date && request.end_date && 
      new Date(request.start_date) >= new Date(request.end_date)) {
    errors.push('تاريخ البداية يجب أن يكون قبل تاريخ النهاية / Start date must be before end date')
  }
  
  if (!request.program_ids || request.program_ids.length === 0) {
    errors.push('برامج العلاج مطلوبة / Therapy programs are required')
  }
  
  if (!request.student_ids || request.student_ids.length === 0) {
    errors.push('الطلاب مطلوبون / Students are required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get available schedule patterns
 */
export async function getAvailableSchedulePatterns(): Promise<SchedulePattern[]> {
  const { data, error } = await supabase
    .from('schedule_patterns')
    .select('*')
    .eq('is_active', true)
    .order('pattern_name_ar', { ascending: true })
  
  if (error) {
    console.warn('Failed to fetch schedule patterns:', error.message)
    return getDefaultSchedulePatterns()
  }
  
  return data || getDefaultSchedulePatterns()
}

function getDefaultSchedulePatterns(): SchedulePattern[] {
  return [
    {
      pattern_name_ar: 'نمط متباعد',
      pattern_name_en: 'Spaced Pattern',
      days: [1, 3, 5], // Mon, Wed, Fri
      pattern_type: 'spaced',
      description_ar: 'جلسات متباعدة بيوم راحة',
      description_en: 'Sessions spaced with rest days'
    },
    {
      pattern_name_ar: 'نمط مكثف',
      pattern_name_en: 'Intensive Pattern', 
      days: [1, 2, 3, 4, 5], // Mon-Fri
      pattern_type: 'consecutive',
      description_ar: 'جلسات يومية مكثفة',
      description_en: 'Daily intensive sessions'
    }
  ]
}