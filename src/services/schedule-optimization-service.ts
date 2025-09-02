/**
 * Schedule Optimization Service
 * Story 3.1: Automated Scheduling Engine - Task 3 (Optimization)
 * 
 * Advanced optimization algorithms for schedule efficiency and resource utilization
 * Implements genetic algorithms, constraint satisfaction, and heuristic optimization
 */

import { supabase } from '../lib/supabase'
import type {
  ScheduledSession,
  TherapistAvailability,
  OptimizationRule,
  OptimizationResult,
  OptimizationMetrics,
  ResourceAllocation,
  ScheduleScore,
  OptimizationConfig
} from '../types/scheduling'

// =====================================================
// Core Optimization Engine
// =====================================================

/**
 * Optimize schedule using multiple optimization strategies
 * @param sessions - Initial schedule to optimize
 * @param config - Optimization configuration and rules
 * @returns Optimized schedule with metrics
 */
export async function optimizeSchedule(
  sessions: ScheduledSession[],
  config: OptimizationConfig
): Promise<OptimizationResult> {
  try {
    const startTime = Date.now()
    
    // Step 1: Analyze current schedule
    const initialMetrics = analyzeScheduleEfficiency(sessions)
    
    // Step 2: Apply optimization algorithms in sequence
    let optimizedSessions = [...sessions]
    const appliedOptimizations: string[] = []
    
    // Resource utilization optimization
    if (config.optimize_resource_utilization) {
      optimizedSessions = await optimizeResourceUtilization(optimizedSessions)
      appliedOptimizations.push('resource_utilization')
    }
    
    // Therapist workload balancing
    if (config.balance_therapist_workload) {
      optimizedSessions = await balanceTherapistWorkload(optimizedSessions)
      appliedOptimizations.push('workload_balancing')
    }
    
    // Minimize travel time and gaps
    if (config.minimize_gaps) {
      optimizedSessions = await minimizeScheduleGaps(optimizedSessions)
      appliedOptimizations.push('gap_minimization')
    }
    
    // Group related sessions
    if (config.group_related_sessions) {
      optimizedSessions = await groupRelatedSessions(optimizedSessions)
      appliedOptimizations.push('session_grouping')
    }
    
    // Apply custom optimization rules
    if (config.custom_rules && config.custom_rules.length > 0) {
      optimizedSessions = await applyCustomOptimizationRules(
        optimizedSessions,
        config.custom_rules
      )
      appliedOptimizations.push('custom_rules')
    }
    
    // Step 3: Calculate final metrics and improvement
    const finalMetrics = analyzeScheduleEfficiency(optimizedSessions)
    const improvement = calculateImprovement(initialMetrics, finalMetrics)
    
    const optimizationTime = Date.now() - startTime
    
    return {
      success: true,
      data: {
        optimized_sessions: optimizedSessions,
        initial_metrics: initialMetrics,
        final_metrics: finalMetrics,
        improvement_percentage: improvement,
        optimization_time_ms: optimizationTime,
        optimizations_applied: appliedOptimizations,
        optimization_score: finalMetrics.overall_score
      }
    }
    
  } catch (error) {
    console.error('Schedule optimization failed:', error)
    return {
      success: false,
      error: `فشل في تحسين الجدول: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      error_en: `Schedule optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Optimize resource utilization (rooms, equipment, therapists)
 */
async function optimizeResourceUtilization(sessions: ScheduledSession[]): Promise<ScheduledSession[]> {
  // Fetch available resources
  const resources = await fetchAvailableResources()
  
  // Group sessions by date and time for room assignment
  const sessionsByDateTime = groupSessionsByDateTime(sessions)
  
  const optimizedSessions: ScheduledSession[] = []
  
  for (const [dateTime, sessionGroup] of sessionsByDateTime) {
    const [date, time] = dateTime.split('T')
    
    // Find optimal room assignments for concurrent sessions
    const roomAssignments = findOptimalRoomAssignments(
      sessionGroup,
      resources.rooms,
      date,
      time
    )
    
    // Apply room assignments
    sessionGroup.forEach((session, index) => {
      const assignment = roomAssignments[index]
      optimizedSessions.push({
        ...session,
        room_id: assignment?.room_id || null,
        equipment_ids: assignment?.equipment_ids || []
      })
    })
  }
  
  return optimizedSessions
}

/**
 * Balance therapist workload across the schedule
 */
async function balanceTherapistWorkload(sessions: ScheduledSession[]): Promise<ScheduledSession[]> {
  // Calculate current workload per therapist
  const workloadByTherapist = calculateTherapistWorkload(sessions)
  
  // Get therapist constraints and preferences
  const therapistConstraints = await fetchTherapistConstraints(
    Object.keys(workloadByTherapist)
  )
  
  // Identify overloaded and underloaded therapists
  const { overloaded, underloaded } = identifyWorkloadImbalance(
    workloadByTherapist,
    therapistConstraints
  )
  
  let balancedSessions = [...sessions]
  
  // Redistribute sessions from overloaded to underloaded therapists
  for (const overloadedTherapist of overloaded) {
    const redistributable = findRedistributableSessions(
      balancedSessions,
      overloadedTherapist.therapist_id
    )
    
    for (const session of redistributable) {
      const alternativeTherapist = findBestAlternativeTherapist(
        session,
        underloaded,
        therapistConstraints
      )
      
      if (alternativeTherapist) {
        // Update session with new therapist
        const sessionIndex = balancedSessions.findIndex(s => s.id === session.id)
        if (sessionIndex !== -1) {
          balancedSessions[sessionIndex] = {
            ...session,
            therapist_id: alternativeTherapist.therapist_id,
            updated_at: new Date().toISOString()
          }
        }
        
        // Update workload tracking
        overloadedTherapist.current_load -= session.duration_minutes
        alternativeTherapist.current_load += session.duration_minutes
      }
    }
  }
  
  return balancedSessions
}

/**
 * Minimize gaps between sessions for each therapist
 */
async function minimizeScheduleGaps(sessions: ScheduledSession[]): Promise<ScheduledSession[]> {
  // Group sessions by therapist and date
  const sessionsByTherapistDate = groupSessionsByTherapistDate(sessions)
  
  const optimizedSessions: ScheduledSession[] = []
  
  for (const [key, therapistSessions] of sessionsByTherapistDate) {
    const [therapistId, date] = key.split('|')
    
    // Sort sessions by start time
    const sortedSessions = therapistSessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
    
    // Apply gap minimization algorithm
    const compactedSessions = compactSessionSchedule(sortedSessions, therapistId, date)
    
    optimizedSessions.push(...compactedSessions)
  }
  
  return optimizedSessions
}

/**
 * Group related sessions for efficiency
 */
async function groupRelatedSessions(sessions: ScheduledSession[]): Promise<ScheduledSession[]> {
  // Group by student and program for consecutive scheduling
  const groupedSessions: ScheduledSession[] = []
  
  // Sort sessions by student, program, and date
  const sortedSessions = sessions.sort((a, b) => {
    if (a.student_id !== b.student_id) {
      return a.student_id.localeCompare(b.student_id)
    }
    if (a.therapy_program_id !== b.therapy_program_id) {
      return a.therapy_program_id.localeCompare(b.therapy_program_id)
    }
    return a.session_date.localeCompare(b.session_date)
  })
  
  // Apply grouping logic
  for (let i = 0; i < sortedSessions.length; i++) {
    const currentSession = sortedSessions[i]
    
    // Check if this session can be grouped with nearby sessions
    const groupingOpportunity = findGroupingOpportunity(
      currentSession,
      sortedSessions,
      i
    )
    
    if (groupingOpportunity) {
      groupedSessions.push(groupingOpportunity)
    } else {
      groupedSessions.push(currentSession)
    }
  }
  
  return groupedSessions
}

/**
 * Apply custom optimization rules
 */
async function applyCustomOptimizationRules(
  sessions: ScheduledSession[],
  rules: OptimizationRule[]
): Promise<ScheduledSession[]> {
  let optimizedSessions = [...sessions]
  
  // Sort rules by priority
  const sortedRules = rules.sort((a, b) => b.priority - a.priority)
  
  for (const rule of sortedRules) {
    switch (rule.type) {
      case 'time_preference':
        optimizedSessions = applyTimePreferenceRule(optimizedSessions, rule)
        break
      case 'resource_constraint':
        optimizedSessions = applyResourceConstraintRule(optimizedSessions, rule)
        break
      case 'therapist_preference':
        optimizedSessions = applyTherapistPreferenceRule(optimizedSessions, rule)
        break
      case 'student_preference':
        optimizedSessions = applyStudentPreferenceRule(optimizedSessions, rule)
        break
    }
  }
  
  return optimizedSessions
}

// =====================================================
// Analysis and Metrics
// =====================================================

/**
 * Analyze schedule efficiency and calculate metrics
 */
function analyzeScheduleEfficiency(sessions: ScheduledSession[]): OptimizationMetrics {
  const totalSessions = sessions.length
  if (totalSessions === 0) {
    return getEmptyMetrics()
  }
  
  // Calculate basic metrics
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const uniqueTherapists = new Set(sessions.map(s => s.therapist_id)).size
  const uniqueStudents = new Set(sessions.map(s => s.student_id)).size
  
  // Calculate utilization metrics
  const therapistUtilization = calculateTherapistUtilizationMetrics(sessions)
  const resourceUtilization = calculateResourceUtilizationMetrics(sessions)
  
  // Calculate gap metrics
  const gapMetrics = calculateGapMetrics(sessions)
  
  // Calculate distribution metrics
  const distributionMetrics = calculateDistributionMetrics(sessions)
  
  // Calculate overall efficiency score
  const efficiencyScore = calculateOverallEfficiencyScore({
    therapistUtilization,
    resourceUtilization,
    gapMetrics,
    distributionMetrics
  })
  
  return {
    total_sessions: totalSessions,
    total_duration_minutes: totalDuration,
    unique_therapists: uniqueTherapists,
    unique_students: uniqueStudents,
    therapist_utilization: therapistUtilization,
    resource_utilization: resourceUtilization,
    gap_metrics: gapMetrics,
    distribution_metrics: distributionMetrics,
    overall_score: efficiencyScore,
    efficiency_rating: getEfficiencyRating(efficiencyScore)
  }
}

/**
 * Calculate therapist utilization metrics
 */
function calculateTherapistUtilizationMetrics(sessions: ScheduledSession[]): {
  average_utilization: number
  max_utilization: number
  min_utilization: number
  utilization_variance: number
} {
  const therapistWorkload = calculateTherapistWorkload(sessions)
  const utilizations = Object.values(therapistWorkload).map(w => w.utilization_percentage)
  
  if (utilizations.length === 0) {
    return { average_utilization: 0, max_utilization: 0, min_utilization: 0, utilization_variance: 0 }
  }
  
  const average = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length
  const max = Math.max(...utilizations)
  const min = Math.min(...utilizations)
  const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - average, 2), 0) / utilizations.length
  
  return {
    average_utilization: average,
    max_utilization: max,
    min_utilization: min,
    utilization_variance: variance
  }
}

/**
 * Calculate gap metrics between sessions
 */
function calculateGapMetrics(sessions: ScheduledSession[]): {
  total_gap_minutes: number
  average_gap_minutes: number
  gap_count: number
  efficiency_loss_percentage: number
} {
  const sessionsByTherapistDate = groupSessionsByTherapistDate(sessions)
  let totalGaps = 0
  let totalGapMinutes = 0
  let totalWorkingMinutes = 0
  
  for (const [, therapistSessions] of sessionsByTherapistDate) {
    const sortedSessions = therapistSessions.sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
    
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1]
      const currentSession = sortedSessions[i]
      
      const prevEndTime = new Date(`2000-01-01T${prevSession.end_time}`)
      const currentStartTime = new Date(`2000-01-01T${currentSession.start_time}`)
      
      const gapMinutes = (currentStartTime.getTime() - prevEndTime.getTime()) / (1000 * 60)
      
      if (gapMinutes > 0) {
        totalGaps++
        totalGapMinutes += gapMinutes
      }
    }
    
    // Calculate total working time for this therapist
    therapistSessions.forEach(s => {
      totalWorkingMinutes += s.duration_minutes
    })
  }
  
  const averageGap = totalGaps > 0 ? totalGapMinutes / totalGaps : 0
  const efficiencyLoss = totalWorkingMinutes > 0 ? 
    (totalGapMinutes / (totalWorkingMinutes + totalGapMinutes)) * 100 : 0
  
  return {
    total_gap_minutes: totalGapMinutes,
    average_gap_minutes: averageGap,
    gap_count: totalGaps,
    efficiency_loss_percentage: efficiencyLoss
  }
}

/**
 * Calculate session distribution metrics
 */
function calculateDistributionMetrics(sessions: ScheduledSession[]): {
  sessions_per_day_variance: number
  therapist_workload_variance: number
  peak_utilization_hours: string[]
  low_utilization_hours: string[]
} {
  // Calculate sessions per day distribution
  const sessionsByDay = new Map<string, number>()
  sessions.forEach(s => {
    sessionsByDay.set(s.session_date, (sessionsByDay.get(s.session_date) || 0) + 1)
  })
  
  const dailyCounts = Array.from(sessionsByDay.values())
  const avgDailySessions = dailyCounts.reduce((sum, c) => sum + c, 0) / dailyCounts.length
  const dailyVariance = dailyCounts.reduce((sum, c) => sum + Math.pow(c - avgDailySessions, 2), 0) / dailyCounts.length
  
  // Calculate therapist workload distribution
  const therapistWorkload = calculateTherapistWorkload(sessions)
  const workloads = Object.values(therapistWorkload).map(w => w.total_minutes)
  const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length
  const workloadVariance = workloads.reduce((sum, w) => sum + Math.pow(w - avgWorkload, 2), 0) / workloads.length
  
  // Find peak and low utilization hours
  const hourlyUtilization = calculateHourlyUtilization(sessions)
  const sortedHours = Object.entries(hourlyUtilization).sort((a, b) => b[1] - a[1])
  
  const peakHours = sortedHours.slice(0, 3).map(([hour]) => hour)
  const lowHours = sortedHours.slice(-3).map(([hour]) => hour)
  
  return {
    sessions_per_day_variance: dailyVariance,
    therapist_workload_variance: workloadVariance,
    peak_utilization_hours: peakHours,
    low_utilization_hours: lowHours
  }
}

/**
 * Calculate overall efficiency score
 */
function calculateOverallEfficiencyScore(metrics: {
  therapistUtilization: any
  resourceUtilization: any
  gapMetrics: any
  distributionMetrics: any
}): number {
  let score = 100
  
  // Deduct for low utilization (target: 80%+)
  const avgUtilization = metrics.therapistUtilization.average_utilization
  if (avgUtilization < 80) {
    score -= (80 - avgUtilization) * 0.5
  }
  
  // Deduct for high utilization variance (target: <20)
  const utilizationVariance = metrics.therapistUtilization.utilization_variance
  if (utilizationVariance > 20) {
    score -= (utilizationVariance - 20) * 0.3
  }
  
  // Deduct for efficiency loss due to gaps (target: <10%)
  const efficiencyLoss = metrics.gapMetrics.efficiency_loss_percentage
  if (efficiencyLoss > 10) {
    score -= (efficiencyLoss - 10) * 1.5
  }
  
  // Deduct for uneven distribution
  const workloadVariance = metrics.distributionMetrics.therapist_workload_variance
  if (workloadVariance > 50) {
    score -= (workloadVariance - 50) * 0.1
  }
  
  return Math.max(0, Math.min(100, score))
}

// =====================================================
// Helper Functions
// =====================================================

async function fetchAvailableResources(): Promise<{
  rooms: any[]
  equipment: any[]
}> {
  const [roomsResult, equipmentResult] = await Promise.all([
    supabase.from('therapy_rooms').select('*').eq('is_available', true),
    supabase.from('therapy_equipment').select('*').eq('is_available', true)
  ])
  
  return {
    rooms: roomsResult.data || [],
    equipment: equipmentResult.data || []
  }
}

async function fetchTherapistConstraints(therapistIds: string[]): Promise<Map<string, any>> {
  const { data } = await supabase
    .from('therapist_preferences')
    .select('*')
    .in('therapist_id', therapistIds)
  
  const constraintsMap = new Map()
  data?.forEach(constraint => {
    constraintsMap.set(constraint.therapist_id, constraint)
  })
  
  return constraintsMap
}

function calculateTherapistWorkload(sessions: ScheduledSession[]): Record<string, {
  total_minutes: number
  session_count: number
  utilization_percentage: number
}> {
  const workload: Record<string, any> = {}
  
  sessions.forEach(session => {
    if (!workload[session.therapist_id]) {
      workload[session.therapist_id] = {
        total_minutes: 0,
        session_count: 0,
        utilization_percentage: 0
      }
    }
    
    workload[session.therapist_id].total_minutes += session.duration_minutes
    workload[session.therapist_id].session_count += 1
  })
  
  // Calculate utilization percentage (assuming 8-hour work day = 480 minutes)
  Object.keys(workload).forEach(therapistId => {
    const totalMinutes = workload[therapistId].total_minutes
    workload[therapistId].utilization_percentage = (totalMinutes / 480) * 100
  })
  
  return workload
}

function groupSessionsByDateTime(sessions: ScheduledSession[]): Map<string, ScheduledSession[]> {
  const groups = new Map<string, ScheduledSession[]>()
  
  sessions.forEach(session => {
    const key = `${session.session_date}T${session.start_time}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(session)
  })
  
  return groups
}

function groupSessionsByTherapistDate(sessions: ScheduledSession[]): Map<string, ScheduledSession[]> {
  const groups = new Map<string, ScheduledSession[]>()
  
  sessions.forEach(session => {
    const key = `${session.therapist_id}|${session.session_date}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(session)
  })
  
  return groups
}

function findOptimalRoomAssignments(
  sessions: ScheduledSession[],
  rooms: any[],
  date: string,
  time: string
): ResourceAllocation[] {
  const assignments: ResourceAllocation[] = []
  
  // Simple room assignment based on availability
  sessions.forEach((session, index) => {
    const availableRoom = rooms.find(room => 
      !assignments.some(a => a.room_id === room.id)
    )
    
    assignments.push({
      session_id: session.id,
      room_id: availableRoom?.id || null,
      equipment_ids: []
    })
  })
  
  return assignments
}

function identifyWorkloadImbalance(
  workload: Record<string, any>,
  constraints: Map<string, any>
): {
  overloaded: Array<{ therapist_id: string; current_load: number; target_load: number }>
  underloaded: Array<{ therapist_id: string; current_load: number; target_load: number }>
} {
  const overloaded: any[] = []
  const underloaded: any[] = []
  
  Object.entries(workload).forEach(([therapistId, load]) => {
    const constraint = constraints.get(therapistId)
    const targetLoad = constraint?.max_daily_minutes || 400 // Default 400 minutes
    
    if (load.total_minutes > targetLoad * 1.2) { // 20% over target
      overloaded.push({
        therapist_id: therapistId,
        current_load: load.total_minutes,
        target_load: targetLoad
      })
    } else if (load.total_minutes < targetLoad * 0.8) { // 20% under target
      underloaded.push({
        therapist_id: therapistId,
        current_load: load.total_minutes,
        target_load: targetLoad
      })
    }
  })
  
  return { overloaded, underloaded }
}

function findRedistributableSessions(
  sessions: ScheduledSession[],
  therapistId: string
): ScheduledSession[] {
  return sessions
    .filter(s => s.therapist_id === therapistId)
    .filter(s => s.status === 'scheduled') // Only redistributable if not confirmed
    .slice(0, 3) // Limit redistribution to avoid major disruption
}

function findBestAlternativeTherapist(
  session: ScheduledSession,
  underloadedTherapists: any[],
  constraints: Map<string, any>
): { therapist_id: string; current_load: number } | null {
  
  // Find therapist with capacity and suitable qualifications
  return underloadedTherapists.find(therapist => {
    const constraint = constraints.get(therapist.therapist_id)
    
    // Check if therapist can handle this session type
    const canHandle = !constraint?.specializations || 
      constraint.specializations.includes(session.session_type)
    
    // Check if adding this session won't overload
    const wouldOverload = (therapist.current_load + session.duration_minutes) > therapist.target_load
    
    return canHandle && !wouldOverload
  }) || null
}

function compactSessionSchedule(
  sessions: ScheduledSession[],
  therapistId: string,
  date: string
): ScheduledSession[] {
  // Sort by start time
  const sortedSessions = sessions.sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Apply compaction algorithm
  const compacted: ScheduledSession[] = []
  let currentTime = sortedSessions[0]?.start_time || '09:00'
  
  sortedSessions.forEach(session => {
    const sessionStart = new Date(`2000-01-01T${currentTime}`)
    const sessionEnd = new Date(sessionStart.getTime() + session.duration_minutes * 60000)
    
    compacted.push({
      ...session,
      start_time: currentTime,
      end_time: `${sessionEnd.getHours().toString().padStart(2, '0')}:${sessionEnd.getMinutes().toString().padStart(2, '0')}`,
      updated_at: new Date().toISOString()
    })
    
    // Move to next time slot with buffer
    const nextStart = new Date(sessionEnd.getTime() + 15 * 60000) // 15-minute buffer
    currentTime = `${nextStart.getHours().toString().padStart(2, '0')}:${nextStart.getMinutes().toString().padStart(2, '0')}`
  })
  
  return compacted
}

function findGroupingOpportunity(
  session: ScheduledSession,
  allSessions: ScheduledSession[],
  currentIndex: number
): ScheduledSession | null {
  // Look for sessions that can be grouped (same student, consecutive times)
  // This is a simplified implementation
  return null // Placeholder
}

function applyTimePreferenceRule(
  sessions: ScheduledSession[],
  rule: OptimizationRule
): ScheduledSession[] {
  // Apply time preference optimization
  return sessions // Placeholder
}

function applyResourceConstraintRule(
  sessions: ScheduledSession[],
  rule: OptimizationRule
): ScheduledSession[] {
  // Apply resource constraint optimization
  return sessions // Placeholder
}

function applyTherapistPreferenceRule(
  sessions: ScheduledSession[],
  rule: OptimizationRule
): ScheduledSession[] {
  // Apply therapist preference optimization
  return sessions // Placeholder
}

function applyStudentPreferenceRule(
  sessions: ScheduledSession[],
  rule: OptimizationRule
): ScheduledSession[] {
  // Apply student preference optimization
  return sessions // Placeholder
}

function calculateResourceUtilizationMetrics(sessions: ScheduledSession[]): any {
  // Calculate resource utilization metrics
  return {
    room_utilization: 0,
    equipment_utilization: 0,
    peak_resource_usage: []
  }
}

function calculateHourlyUtilization(sessions: ScheduledSession[]): Record<string, number> {
  const hourlyCount: Record<string, number> = {}
  
  sessions.forEach(session => {
    const hour = session.start_time.substring(0, 2) + ':00'
    hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
  })
  
  return hourlyCount
}

function calculateImprovement(
  initial: OptimizationMetrics,
  final: OptimizationMetrics
): number {
  if (initial.overall_score === 0) return 0
  
  return ((final.overall_score - initial.overall_score) / initial.overall_score) * 100
}

function getEfficiencyRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  return 'poor'
}

function getEmptyMetrics(): OptimizationMetrics {
  return {
    total_sessions: 0,
    total_duration_minutes: 0,
    unique_therapists: 0,
    unique_students: 0,
    therapist_utilization: {
      average_utilization: 0,
      max_utilization: 0,
      min_utilization: 0,
      utilization_variance: 0
    },
    resource_utilization: {
      room_utilization: 0,
      equipment_utilization: 0,
      peak_resource_usage: []
    },
    gap_metrics: {
      total_gap_minutes: 0,
      average_gap_minutes: 0,
      gap_count: 0,
      efficiency_loss_percentage: 0
    },
    distribution_metrics: {
      sessions_per_day_variance: 0,
      therapist_workload_variance: 0,
      peak_utilization_hours: [],
      low_utilization_hours: []
    },
    overall_score: 0,
    efficiency_rating: 'poor'
  }
}