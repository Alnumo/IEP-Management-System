/**
 * Conflict Resolution Service
 * Story 3.1: Automated Scheduling Engine - Task 4
 * 
 * Advanced conflict detection and resolution system with intelligent algorithms
 * Supports multi-level conflict analysis and automated resolution strategies
 */

import { supabase } from '../lib/supabase'
import type {
  ScheduledSession,
  ScheduleConflict,
  ConflictType,
  ConflictSeverity,
  ConflictResolution,
  AlternativeTimeSlot,
  ResourceAvailability,
  TherapistAvailability,
  ConflictAnalysisResult,
  ResolutionStrategy,
  ConflictPrevention
} from '../types/scheduling'

// =====================================================
// Core Conflict Detection Engine
// =====================================================

/**
 * Comprehensive conflict detection for scheduled sessions
 * @param sessions - Array of scheduled sessions to analyze
 * @returns Detailed conflict analysis results
 */
export async function detectScheduleConflicts(
  sessions: ScheduledSession[]
): Promise<ConflictAnalysisResult> {
  try {
    const startTime = Date.now()
    
    // Step 1: Group sessions for efficient conflict detection
    const sessionGroups = groupSessionsForAnalysis(sessions)
    
    // Step 2: Detect different types of conflicts
    const conflicts = await Promise.all([
      detectTherapistConflicts(sessionGroups.byTherapistDate),
      detectRoomConflicts(sessionGroups.byRoomDate),
      detectStudentConflicts(sessionGroups.byStudentDate),
      detectResourceConflicts(sessionGroups.byResourceDate),
      detectAvailabilityConflicts(sessions),
      detectCapacityConflicts(sessions),
      detectDependencyConflicts(sessions)
    ])

    // Step 3: Flatten and categorize all conflicts
    const allConflicts = conflicts.flat()
    
    // Step 4: Calculate conflict severity and impact
    const severityAnalysis = analyzeConflictSeverity(allConflicts)
    
    // Step 5: Generate resolution priorities
    const resolutionPriorities = calculateResolutionPriorities(allConflicts)
    
    // Step 6: Identify conflict patterns for prevention
    const conflictPatterns = identifyConflictPatterns(allConflicts, sessions)
    
    const analysisTime = Date.now() - startTime

    return {
      success: true,
      data: {
        total_conflicts: allConflicts.length,
        conflicts_by_type: categorizeConflictsByType(allConflicts),
        severity_breakdown: severityAnalysis,
        resolution_priorities: resolutionPriorities,
        conflict_patterns: conflictPatterns,
        analysis_time_ms: analysisTime,
        prevention_suggestions: generatePreventionSuggestions(conflictPatterns)
      }
    }

  } catch (error) {
    console.error('Conflict detection failed:', error)
    return {
      success: false,
      error: `فشل في كشف التعارضات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      error_en: `Conflict detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Detect therapist scheduling conflicts (double booking, overlapping sessions)
 */
async function detectTherapistConflicts(
  sessionsByTherapistDate: Map<string, ScheduledSession[]>
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  for (const [key, therapistSessions] of sessionsByTherapistDate) {
    const [therapistId, date] = key.split('|')
    
    // Sort sessions by start time
    const sortedSessions = therapistSessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )

    // Check for overlapping sessions
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1]
      const currentSession = sortedSessions[i]
      
      const prevEndTime = parseTime(prevSession.end_time)
      const currentStartTime = parseTime(currentSession.start_time)
      
      // Check for overlap or insufficient buffer
      const bufferMinutes = await getTherapistBufferRequirement(therapistId)
      const timeDifference = currentStartTime - prevEndTime
      
      if (timeDifference < bufferMinutes) {
        const conflictType: ConflictType = timeDifference <= 0 
          ? 'therapist_double_booked' 
          : 'insufficient_buffer_time'
          
        const severity: ConflictSeverity = timeDifference <= 0 ? 'high' : 'medium'
        
        conflicts.push({
          id: generateConflictId(),
          session_id: currentSession.id,
          conflict_type: conflictType,
          conflict_severity: severity,
          conflicting_session_id: prevSession.id,
          conflicting_resource_id: therapistId,
          description_ar: getConflictDescription(conflictType, 'ar'),
          description_en: getConflictDescription(conflictType, 'en'),
          suggested_resolution: suggestConflictResolution(conflictType),
          resolution_options: generateResolutionOptions(conflictType, currentSession, prevSession),
          impact_score: calculateConflictImpact(conflictType, severity, [currentSession, prevSession]),
          created_at: new Date().toISOString()
        })
      }
    }

    // Check therapist availability violations
    const availabilityViolations = await checkTherapistAvailabilityViolations(
      therapistId,
      date,
      therapistSessions
    )
    
    conflicts.push(...availabilityViolations)
  }

  return conflicts
}

/**
 * Detect room and facility conflicts
 */
async function detectRoomConflicts(
  sessionsByRoomDate: Map<string, ScheduledSession[]>
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  for (const [key, roomSessions] of sessionsByRoomDate) {
    const [roomId, date] = key.split('|')
    
    if (!roomId || roomId === 'null') continue

    // Sort sessions by start time
    const sortedSessions = roomSessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )

    // Check for overlapping room usage
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1]
      const currentSession = sortedSessions[i]
      
      const prevEndTime = parseTime(prevSession.end_time)
      const currentStartTime = parseTime(currentSession.start_time)
      
      // Get room turnaround time requirement
      const turnaroundTime = await getRoomTurnaroundTime(roomId)
      const timeDifference = currentStartTime - prevEndTime
      
      if (timeDifference < turnaroundTime) {
        const conflictType: ConflictType = timeDifference <= 0 
          ? 'room_double_booked' 
          : 'insufficient_turnaround_time'
        
        conflicts.push({
          id: generateConflictId(),
          session_id: currentSession.id,
          conflict_type: conflictType,
          conflict_severity: 'high',
          conflicting_session_id: prevSession.id,
          conflicting_resource_id: roomId,
          description_ar: getConflictDescription(conflictType, 'ar'),
          description_en: getConflictDescription(conflictType, 'en'),
          suggested_resolution: 'reassign_room',
          resolution_options: await generateRoomResolutionOptions(currentSession, date),
          impact_score: calculateConflictImpact(conflictType, 'high', [currentSession, prevSession]),
          created_at: new Date().toISOString()
        })
      }
    }
  }

  return conflicts
}

/**
 * Detect student scheduling conflicts (multiple simultaneous sessions)
 */
async function detectStudentConflicts(
  sessionsByStudentDate: Map<string, ScheduledSession[]>
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  for (const [key, studentSessions] of sessionsByStudentDate) {
    const [studentId, date] = key.split('|')
    
    // Sort sessions by start time
    const sortedSessions = studentSessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )

    // Check for overlapping sessions or violations of student constraints
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1]
      const currentSession = sortedSessions[i]
      
      const prevEndTime = parseTime(prevSession.end_time)
      const currentStartTime = parseTime(currentSession.start_time)
      
      // Get student rest time requirement
      const restTime = await getStudentRestRequirement(studentId)
      const timeDifference = currentStartTime - prevEndTime
      
      if (timeDifference < restTime) {
        const conflictType: ConflictType = timeDifference <= 0 
          ? 'student_double_booked' 
          : 'insufficient_rest_time'
        
        const severity: ConflictSeverity = timeDifference <= 0 ? 'high' : 'medium'
        
        conflicts.push({
          id: generateConflictId(),
          session_id: currentSession.id,
          conflict_type: conflictType,
          conflict_severity: severity,
          conflicting_session_id: prevSession.id,
          conflicting_resource_id: studentId,
          description_ar: getConflictDescription(conflictType, 'ar'),
          description_en: getConflictDescription(conflictType, 'en'),
          suggested_resolution: 'reschedule_session',
          resolution_options: await generateStudentResolutionOptions(currentSession, studentId),
          impact_score: calculateConflictImpact(conflictType, severity, [currentSession, prevSession]),
          created_at: new Date().toISOString()
        })
      }
    }

    // Check daily session limits for student
    const dailyLimit = await getStudentDailySessionLimit(studentId)
    if (studentSessions.length > dailyLimit) {
      conflicts.push({
        id: generateConflictId(),
        session_id: studentSessions[dailyLimit].id,
        conflict_type: 'daily_session_limit_exceeded',
        conflict_severity: 'medium',
        conflicting_resource_id: studentId,
        description_ar: `تجاوز الحد الأقصى للجلسات اليومية (${dailyLimit})`,
        description_en: `Daily session limit exceeded (${dailyLimit})`,
        suggested_resolution: 'redistribute_sessions',
        resolution_options: await generateRedistributionOptions(studentSessions, studentId),
        impact_score: calculateConflictImpact('daily_session_limit_exceeded', 'medium', studentSessions),
        created_at: new Date().toISOString()
      })
    }
  }

  return conflicts
}

/**
 * Detect equipment and resource conflicts
 */
async function detectResourceConflicts(
  sessionsByResourceDate: Map<string, ScheduledSession[]>
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  // Get equipment requirements for sessions
  const sessionsWithEquipment = await getSessionsWithEquipmentRequirements()
  
  for (const [equipmentId, sessions] of sessionsWithEquipment) {
    const sortedSessions = sessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )

    // Check for equipment conflicts
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1]
      const currentSession = sortedSessions[i]
      
      const prevEndTime = parseTime(prevSession.end_time)
      const currentStartTime = parseTime(currentSession.start_time)
      
      if (prevEndTime > currentStartTime) {
        conflicts.push({
          id: generateConflictId(),
          session_id: currentSession.id,
          conflict_type: 'equipment_double_booked',
          conflict_severity: 'medium',
          conflicting_session_id: prevSession.id,
          conflicting_resource_id: equipmentId,
          description_ar: `تعارض في استخدام المعدات: ${equipmentId}`,
          description_en: `Equipment conflict: ${equipmentId}`,
          suggested_resolution: 'find_alternative_equipment',
          resolution_options: await generateEquipmentResolutionOptions(currentSession, equipmentId),
          impact_score: calculateConflictImpact('equipment_double_booked', 'medium', [currentSession, prevSession]),
          created_at: new Date().toISOString()
        })
      }
    }
  }

  return conflicts
}

/**
 * Detect therapist availability violations
 */
async function detectAvailabilityConflicts(
  sessions: ScheduledSession[]
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  // Get all therapist availability data
  const therapistIds = [...new Set(sessions.map(s => s.therapist_id))]
  const availabilityData = await fetchTherapistAvailabilityData(therapistIds)

  for (const session of sessions) {
    const sessionDate = new Date(session.session_date)
    const dayOfWeek = sessionDate.getDay() === 0 ? 7 : sessionDate.getDay()
    
    const therapistAvailability = availabilityData.filter(a => 
      a.therapist_id === session.therapist_id &&
      (a.day_of_week === dayOfWeek || a.specific_date === session.session_date)
    )

    // Check if session is within available hours
    const isWithinAvailability = therapistAvailability.some(availability => 
      session.start_time >= availability.start_time &&
      session.end_time <= availability.end_time &&
      availability.is_available
    )

    if (!isWithinAvailability) {
      conflicts.push({
        id: generateConflictId(),
        session_id: session.id,
        conflict_type: 'therapist_unavailable',
        conflict_severity: 'high',
        conflicting_resource_id: session.therapist_id,
        description_ar: 'المعالج غير متاح في هذا الوقت',
        description_en: 'Therapist not available at this time',
        suggested_resolution: 'find_alternative_time',
        resolution_options: await generateAvailabilityResolutionOptions(session),
        impact_score: calculateConflictImpact('therapist_unavailable', 'high', [session]),
        created_at: new Date().toISOString()
      })
    }
  }

  return conflicts
}

/**
 * Detect capacity and workload conflicts
 */
async function detectCapacityConflicts(
  sessions: ScheduledSession[]
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  // Group sessions by therapist and date
  const therapistDailyLoad = new Map<string, ScheduledSession[]>()
  
  sessions.forEach(session => {
    const key = `${session.therapist_id}|${session.session_date}`
    if (!therapistDailyLoad.has(key)) {
      therapistDailyLoad.set(key, [])
    }
    therapistDailyLoad.get(key)!.push(session)
  })

  // Check daily capacity limits
  for (const [key, dailySessions] of therapistDailyLoad) {
    const [therapistId, date] = key.split('|')
    
    const therapistCapacity = await getTherapistDailyCapacity(therapistId)
    const totalDuration = dailySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
    
    if (totalDuration > therapistCapacity.max_daily_minutes) {
      // Find sessions that exceed capacity
      let currentLoad = 0
      const excessSessions = []
      
      for (const session of dailySessions.sort((a, b) => a.start_time.localeCompare(b.start_time))) {
        currentLoad += session.duration_minutes
        if (currentLoad > therapistCapacity.max_daily_minutes) {
          excessSessions.push(session)
        }
      }

      excessSessions.forEach(session => {
        conflicts.push({
          id: generateConflictId(),
          session_id: session.id,
          conflict_type: 'therapist_overload',
          conflict_severity: 'medium',
          conflicting_resource_id: therapistId,
          description_ar: `تجاوز الطاقة الاستيعابية اليومية للمعالج`,
          description_en: `Therapist daily capacity exceeded`,
          suggested_resolution: 'redistribute_workload',
          resolution_options: await generateWorkloadResolutionOptions(session, therapistId),
          impact_score: calculateConflictImpact('therapist_overload', 'medium', [session]),
          created_at: new Date().toISOString()
        })
      })
    }
  }

  return conflicts
}

/**
 * Detect session dependency conflicts
 */
async function detectDependencyConflicts(
  sessions: ScheduledSession[]
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  // Get session dependencies (e.g., assessment before therapy)
  const dependencies = await getSessionDependencies(sessions.map(s => s.id))

  for (const dependency of dependencies) {
    const prerequisiteSession = sessions.find(s => s.id === dependency.prerequisite_session_id)
    const dependentSession = sessions.find(s => s.id === dependency.dependent_session_id)

    if (prerequisiteSession && dependentSession) {
      const prereqDateTime = new Date(`${prerequisiteSession.session_date}T${prerequisiteSession.start_time}`)
      const depDateTime = new Date(`${dependentSession.session_date}T${dependentSession.start_time}`)

      // Check if dependent session is scheduled before prerequisite
      if (depDateTime <= prereqDateTime) {
        conflicts.push({
          id: generateConflictId(),
          session_id: dependentSession.id,
          conflict_type: 'dependency_violation',
          conflict_severity: 'high',
          conflicting_session_id: prerequisiteSession.id,
          description_ar: 'انتهاك تسلسل الجلسات المطلوب',
          description_en: 'Session dependency violation',
          suggested_resolution: 'reorder_sessions',
          resolution_options: await generateDependencyResolutionOptions(prerequisiteSession, dependentSession),
          impact_score: calculateConflictImpact('dependency_violation', 'high', [dependentSession, prerequisiteSession]),
          created_at: new Date().toISOString()
        })
      }
    }
  }

  return conflicts
}

// =====================================================
// Resolution Strategy Generation
// =====================================================

/**
 * Generate comprehensive resolution strategies for conflicts
 */
export async function generateConflictResolutions(
  conflicts: ScheduleConflict[]
): Promise<ConflictResolution[]> {
  const resolutions: ConflictResolution[] = []

  for (const conflict of conflicts) {
    const strategies = await generateResolutionStrategies(conflict)
    
    for (const strategy of strategies) {
      const resolution: ConflictResolution = {
        id: generateResolutionId(),
        conflict_id: conflict.id,
        resolution_strategy: strategy.type,
        description_ar: strategy.description_ar,
        description_en: strategy.description_en,
        implementation_steps: strategy.steps,
        estimated_effort: strategy.effort,
        success_probability: strategy.successProbability,
        side_effects: strategy.sideEffects,
        alternative_options: strategy.alternatives,
        created_at: new Date().toISOString()
      }

      resolutions.push(resolution)
    }
  }

  // Sort by success probability and effort
  return resolutions.sort((a, b) => {
    const scoreA = a.success_probability - (a.estimated_effort / 10)
    const scoreB = b.success_probability - (b.estimated_effort / 10)
    return scoreB - scoreA
  })
}

/**
 * Generate specific resolution strategies for each conflict type
 */
async function generateResolutionStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  switch (conflict.conflict_type) {
    case 'therapist_double_booked':
      return await generateTherapistConflictStrategies(conflict)
    
    case 'room_double_booked':
      return await generateRoomConflictStrategies(conflict)
    
    case 'student_double_booked':
      return await generateStudentConflictStrategies(conflict)
    
    case 'equipment_double_booked':
      return await generateEquipmentConflictStrategies(conflict)
    
    case 'therapist_unavailable':
      return await generateAvailabilityConflictStrategies(conflict)
    
    case 'insufficient_buffer_time':
      return await generateBufferTimeStrategies(conflict)
    
    default:
      return await generateGenericConflictStrategies(conflict)
  }
}

async function generateTherapistConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return [
    {
      type: 'reschedule_later_session',
      description_ar: 'إعادة جدولة الجلسة المتأخرة',
      description_en: 'Reschedule the later session',
      steps: [
        'Identify alternative time slots for the later session',
        'Check therapist availability in alternative slots',
        'Verify no new conflicts are created',
        'Update session schedule'
      ],
      effort: 3,
      successProbability: 0.8,
      sideEffects: ['May affect other sessions', 'Student notification required'],
      alternatives: ['assign_different_therapist', 'split_session_duration']
    },
    {
      type: 'assign_different_therapist',
      description_ar: 'تعيين معالج مختلف',
      description_en: 'Assign a different therapist',
      steps: [
        'Find qualified alternative therapists',
        'Check alternative therapist availability',
        'Verify therapist specialization match',
        'Update session assignment'
      ],
      effort: 5,
      successProbability: 0.6,
      sideEffects: ['Continuity of care disrupted', 'Patient preference may be affected'],
      alternatives: ['reschedule_later_session', 'merge_sessions']
    }
  ]
}

async function generateRoomConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return [
    {
      type: 'assign_alternative_room',
      description_ar: 'تعيين غرفة بديلة',
      description_en: 'Assign alternative room',
      steps: [
        'Find available rooms at the same time',
        'Verify room meets session requirements',
        'Check equipment availability in new room',
        'Update room assignment'
      ],
      effort: 2,
      successProbability: 0.9,
      sideEffects: ['Equipment may need to be moved'],
      alternatives: ['reschedule_session', 'use_shared_space']
    }
  ]
}

async function generateStudentConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return [
    {
      type: 'increase_break_time',
      description_ar: 'زيادة وقت الراحة بين الجلسات',
      description_en: 'Increase break time between sessions',
      steps: [
        'Calculate optimal break duration',
        'Reschedule later session with adequate break',
        'Verify no cascade conflicts occur',
        'Update session schedule'
      ],
      effort: 3,
      successProbability: 0.85,
      sideEffects: ['May extend daily schedule'],
      alternatives: ['reschedule_to_different_day', 'reduce_session_duration']
    }
  ]
}

// =====================================================
// Helper Functions
// =====================================================

function groupSessionsForAnalysis(sessions: ScheduledSession[]): {
  byTherapistDate: Map<string, ScheduledSession[]>
  byRoomDate: Map<string, ScheduledSession[]>
  byStudentDate: Map<string, ScheduledSession[]>
  byResourceDate: Map<string, ScheduledSession[]>
} {
  const byTherapistDate = new Map<string, ScheduledSession[]>()
  const byRoomDate = new Map<string, ScheduledSession[]>()
  const byStudentDate = new Map<string, ScheduledSession[]>()
  const byResourceDate = new Map<string, ScheduledSession[]>()

  sessions.forEach(session => {
    // Group by therapist and date
    const therapistKey = `${session.therapist_id}|${session.session_date}`
    if (!byTherapistDate.has(therapistKey)) {
      byTherapistDate.set(therapistKey, [])
    }
    byTherapistDate.get(therapistKey)!.push(session)

    // Group by room and date (if room is assigned)
    if (session.room_id) {
      const roomKey = `${session.room_id}|${session.session_date}`
      if (!byRoomDate.has(roomKey)) {
        byRoomDate.set(roomKey, [])
      }
      byRoomDate.get(roomKey)!.push(session)
    }

    // Group by student and date
    const studentKey = `${session.student_id}|${session.session_date}`
    if (!byStudentDate.has(studentKey)) {
      byStudentDate.set(studentKey, [])
    }
    byStudentDate.get(studentKey)!.push(session)
  })

  return { byTherapistDate, byRoomDate, byStudentDate, byResourceDate }
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function analyzeConflictSeverity(conflicts: ScheduleConflict[]): Record<ConflictSeverity, number> {
  const severity = { high: 0, medium: 0, low: 0 }
  
  conflicts.forEach(conflict => {
    severity[conflict.conflict_severity]++
  })

  return severity
}

function categorizeConflictsByType(conflicts: ScheduleConflict[]): Record<ConflictType, number> {
  const types: Record<string, number> = {}
  
  conflicts.forEach(conflict => {
    types[conflict.conflict_type] = (types[conflict.conflict_type] || 0) + 1
  })

  return types as Record<ConflictType, number>
}

function calculateResolutionPriorities(conflicts: ScheduleConflict[]): ScheduleConflict[] {
  return conflicts.sort((a, b) => {
    // Priority factors: severity, impact, urgency
    const scoreA = getSeverityScore(a.conflict_severity) + a.impact_score
    const scoreB = getSeverityScore(b.conflict_severity) + b.impact_score
    return scoreB - scoreA
  })
}

function getSeverityScore(severity: ConflictSeverity): number {
  switch (severity) {
    case 'high': return 10
    case 'medium': return 5
    case 'low': return 1
    default: return 0
  }
}

function identifyConflictPatterns(
  conflicts: ScheduleConflict[],
  sessions: ScheduledSession[]
): Array<{ pattern: string; frequency: number; description: string }> {
  const patterns = []

  // Pattern 1: Recurring therapist conflicts
  const therapistConflicts = conflicts.filter(c => c.conflict_type.includes('therapist'))
  const therapistConflictCount = new Map<string, number>()
  
  therapistConflicts.forEach(conflict => {
    const therapistId = conflict.conflicting_resource_id
    if (therapistId) {
      therapistConflictCount.set(therapistId, (therapistConflictCount.get(therapistId) || 0) + 1)
    }
  })

  therapistConflictCount.forEach((count, therapistId) => {
    if (count > 2) {
      patterns.push({
        pattern: `frequent_therapist_conflicts_${therapistId}`,
        frequency: count,
        description: `Therapist ${therapistId} has recurring scheduling conflicts`
      })
    }
  })

  // Pattern 2: Time slot conflicts
  const timeSlotConflicts = new Map<string, number>()
  conflicts.forEach(conflict => {
    const session = sessions.find(s => s.id === conflict.session_id)
    if (session) {
      const timeSlot = session.start_time.substring(0, 2) + ':00'
      timeSlotConflicts.set(timeSlot, (timeSlotConflicts.get(timeSlot) || 0) + 1)
    }
  })

  timeSlotConflicts.forEach((count, timeSlot) => {
    if (count > 3) {
      patterns.push({
        pattern: `peak_conflict_time_${timeSlot}`,
        frequency: count,
        description: `High conflict frequency at ${timeSlot}`
      })
    }
  })

  return patterns
}

function generatePreventionSuggestions(patterns: Array<{ pattern: string; frequency: number; description: string }>): ConflictPrevention[] {
  return patterns.map(pattern => ({
    prevention_type: pattern.pattern.includes('therapist') ? 'therapist_management' : 'schedule_optimization',
    description_ar: getPreventionDescription(pattern.pattern, 'ar'),
    description_en: getPreventionDescription(pattern.pattern, 'en'),
    implementation_priority: pattern.frequency > 5 ? 'high' : 'medium',
    estimated_impact: pattern.frequency * 0.1
  }))
}

function calculateConflictImpact(
  conflictType: ConflictType,
  severity: ConflictSeverity,
  affectedSessions: ScheduledSession[]
): number {
  let baseScore = getSeverityScore(severity)
  
  // Add impact based on number of affected sessions
  baseScore += affectedSessions.length * 2
  
  // Add impact based on conflict type
  const typeMultiplier = getConflictTypeMultiplier(conflictType)
  baseScore *= typeMultiplier

  return Math.min(baseScore, 100) // Cap at 100
}

function getConflictTypeMultiplier(conflictType: ConflictType): number {
  switch (conflictType) {
    case 'therapist_double_booked': return 1.5
    case 'student_double_booked': return 1.4
    case 'room_double_booked': return 1.2
    case 'dependency_violation': return 1.3
    case 'therapist_unavailable': return 1.4
    default: return 1.0
  }
}

// Database helper functions
async function getTherapistBufferRequirement(therapistId: string): Promise<number> {
  const { data } = await supabase
    .from('therapist_preferences')
    .select('buffer_minutes')
    .eq('therapist_id', therapistId)
    .single()
  
  return data?.buffer_minutes || 15 // Default 15 minutes
}

async function getRoomTurnaroundTime(roomId: string): Promise<number> {
  const { data } = await supabase
    .from('therapy_rooms')
    .select('turnaround_minutes')
    .eq('id', roomId)
    .single()
  
  return data?.turnaround_minutes || 10 // Default 10 minutes
}

async function getStudentRestRequirement(studentId: string): Promise<number> {
  const { data } = await supabase
    .from('student_preferences')
    .select('rest_minutes_between_sessions')
    .eq('student_id', studentId)
    .single()
  
  return data?.rest_minutes_between_sessions || 30 // Default 30 minutes
}

async function getStudentDailySessionLimit(studentId: string): Promise<number> {
  const { data } = await supabase
    .from('student_preferences')
    .select('max_daily_sessions')
    .eq('student_id', studentId)
    .single()
  
  return data?.max_daily_sessions || 4 // Default 4 sessions per day
}

async function getTherapistDailyCapacity(therapistId: string): Promise<{ max_daily_minutes: number; max_sessions: number }> {
  const { data } = await supabase
    .from('therapist_preferences')
    .select('max_daily_minutes, max_daily_sessions')
    .eq('therapist_id', therapistId)
    .single()
  
  return {
    max_daily_minutes: data?.max_daily_minutes || 480, // Default 8 hours
    max_sessions: data?.max_daily_sessions || 8
  }
}

async function fetchTherapistAvailabilityData(therapistIds: string[]): Promise<TherapistAvailability[]> {
  const { data } = await supabase
    .from('therapist_availability')
    .select('*')
    .in('therapist_id', therapistIds)
    .eq('is_available', true)
  
  return data || []
}

async function getSessionsWithEquipmentRequirements(): Promise<Map<string, ScheduledSession[]>> {
  // This would typically query session equipment requirements
  // For now, return empty map
  return new Map()
}

async function getSessionDependencies(sessionIds: string[]): Promise<Array<{
  prerequisite_session_id: string
  dependent_session_id: string
  dependency_type: string
}>> {
  const { data } = await supabase
    .from('session_dependencies')
    .select('*')
    .or(`prerequisite_session_id.in.(${sessionIds.join(',')}),dependent_session_id.in.(${sessionIds.join(',')})`)
  
  return data || []
}

// Resolution option generators
async function generateResolutionOptions(
  conflictType: ConflictType,
  currentSession: ScheduledSession,
  conflictingSession?: ScheduledSession
): Promise<string[]> {
  switch (conflictType) {
    case 'therapist_double_booked':
      return ['reschedule_current', 'reschedule_conflicting', 'assign_different_therapist']
    case 'room_double_booked':
      return ['assign_different_room', 'reschedule_session']
    case 'student_double_booked':
      return ['reschedule_with_break', 'move_to_different_day']
    default:
      return ['reschedule_session']
  }
}

async function generateRoomResolutionOptions(session: ScheduledSession, date: string): Promise<string[]> {
  return ['find_alternative_room', 'reschedule_session', 'use_shared_space']
}

async function generateStudentResolutionOptions(session: ScheduledSession, studentId: string): Promise<string[]> {
  return ['increase_break_time', 'reschedule_to_different_day', 'reduce_session_duration']
}

async function generateEquipmentResolutionOptions(session: ScheduledSession, equipmentId: string): Promise<string[]> {
  return ['find_alternative_equipment', 'reschedule_session', 'share_equipment']
}

async function generateAvailabilityResolutionOptions(session: ScheduledSession): Promise<string[]> {
  return ['find_available_time_slot', 'assign_available_therapist', 'extend_therapist_hours']
}

async function generateWorkloadResolutionOptions(session: ScheduledSession, therapistId: string): Promise<string[]> {
  return ['redistribute_to_other_therapist', 'reschedule_to_different_day', 'reduce_session_duration']
}

async function generateRedistributionOptions(sessions: ScheduledSession[], studentId: string): Promise<string[]> {
  return ['spread_across_multiple_days', 'reduce_session_frequency', 'combine_compatible_sessions']
}

async function generateDependencyResolutionOptions(
  prerequisiteSession: ScheduledSession,
  dependentSession: ScheduledSession
): Promise<string[]> {
  return ['reschedule_dependent_after_prerequisite', 'reschedule_prerequisite_before_dependent', 'remove_dependency']
}

// Utility functions
function generateConflictId(): string {
  return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateResolutionId(): string {
  return `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getConflictDescription(conflictType: ConflictType, language: 'ar' | 'en'): string {
  const descriptions = {
    ar: {
      therapist_double_booked: 'حجز مزدوج للمعالج',
      room_double_booked: 'حجز مزدوج للغرفة',
      student_double_booked: 'حجز مزدوج للطالب',
      equipment_double_booked: 'حجز مزدوج للمعدات',
      therapist_unavailable: 'المعالج غير متاح',
      insufficient_buffer_time: 'وقت انتظار غير كافٍ',
      insufficient_turnaround_time: 'وقت تحويل غير كافٍ',
      insufficient_rest_time: 'وقت راحة غير كافٍ',
      daily_session_limit_exceeded: 'تجاوز الحد الأقصى للجلسات اليومية',
      therapist_overload: 'إفراط في تحميل المعالج',
      dependency_violation: 'انتهاك تسلسل الجلسات'
    },
    en: {
      therapist_double_booked: 'Therapist double booked',
      room_double_booked: 'Room double booked',
      student_double_booked: 'Student double booked',
      equipment_double_booked: 'Equipment double booked',
      therapist_unavailable: 'Therapist unavailable',
      insufficient_buffer_time: 'Insufficient buffer time',
      insufficient_turnaround_time: 'Insufficient turnaround time',
      insufficient_rest_time: 'Insufficient rest time',
      daily_session_limit_exceeded: 'Daily session limit exceeded',
      therapist_overload: 'Therapist overload',
      dependency_violation: 'Session dependency violation'
    }
  }

  return descriptions[language][conflictType] || conflictType
}

function suggestConflictResolution(conflictType: ConflictType): string {
  const resolutions: Record<ConflictType, string> = {
    therapist_double_booked: 'reschedule_session',
    room_double_booked: 'assign_alternative_room',
    student_double_booked: 'increase_break_time',
    equipment_double_booked: 'find_alternative_equipment',
    therapist_unavailable: 'find_alternative_time',
    insufficient_buffer_time: 'increase_buffer_time',
    insufficient_turnaround_time: 'increase_turnaround_time',
    insufficient_rest_time: 'increase_rest_time',
    daily_session_limit_exceeded: 'redistribute_sessions',
    therapist_overload: 'redistribute_workload',
    dependency_violation: 'reorder_sessions'
  }

  return resolutions[conflictType] || 'manual_review'
}

function getPreventionDescription(pattern: string, language: 'ar' | 'en'): string {
  if (language === 'ar') {
    if (pattern.includes('therapist')) {
      return 'تحسين إدارة جدولة المعالجين'
    } else if (pattern.includes('time')) {
      return 'تجنب جدولة جلسات متعددة في الأوقات المزدحمة'
    }
    return 'تحسين عام للجدولة'
  } else {
    if (pattern.includes('therapist')) {
      return 'Improve therapist schedule management'
    } else if (pattern.includes('time')) {
      return 'Avoid scheduling multiple sessions during peak conflict times'
    }
    return 'General schedule optimization'
  }
}

async function checkTherapistAvailabilityViolations(
  therapistId: string,
  date: string,
  sessions: ScheduledSession[]
): Promise<ScheduleConflict[]> {
  // Implementation for checking availability violations
  return []
}

async function generateEquipmentConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return []
}

async function generateAvailabilityConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return []
}

async function generateBufferTimeStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return []
}

async function generateGenericConflictStrategies(conflict: ScheduleConflict): Promise<ResolutionStrategy[]> {
  return []
}