/**
 * Progress Tracking Service
 * Data collection workflows and progress calculations for IEP goals
 * IDEA 2024 Compliant - Evidence-based progress monitoring
 */

import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  IEPProgressData, 
  MeasurementMethod,
  ProgressStatus,
  DataReliability
} from '@/types/iep'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ProgressDataPoint {
  goalId: string
  collectionDate: string
  measurementValue: number
  measurementUnit: MeasurementMethod
  collectedBy: string
  notes?: string
  reliability: DataReliability
  context?: string
  sessionDuration?: number
  trialCount?: number
  environment?: string
}

export interface ProgressTrend {
  direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  magnitude: number // percentage change
  confidence: 'high' | 'medium' | 'low'
  dataPoints: number
  timeSpan: number // days
  projectedMastery?: Date
}

export interface ProgressSummary {
  goalId: string
  currentPercentage: number
  progressStatus: ProgressStatus
  trend: ProgressTrend
  lastDataPoint?: IEPProgressData
  totalDataPoints: number
  averageImprovement: number
  consistency: number // 0-1 scale
  masteryProjection?: Date
}

export interface CollectionSession {
  id: string
  goalId: string
  scheduledDate: Date
  completedDate?: Date
  collectedBy: string
  sessionType: 'baseline' | 'progress' | 'mastery_check'
  environment: string
  duration?: number
  notes?: string
  dataPoints: ProgressDataPoint[]
  reliability: DataReliability
}

export interface ProgressReport {
  reportId: string
  goalId: string
  reportType: 'weekly' | 'monthly' | 'quarterly'
  periodStart: Date
  periodEnd: Date
  summary: ProgressSummary
  dataPoints: IEPProgressData[]
  recommendations: string[]
  concerns: string[]
  nextSteps: string[]
}

// =============================================================================
// PROGRESS CALCULATION ALGORITHMS
// =============================================================================

/**
 * Calculate progress percentage using weighted moving average
 * Recent data points have higher weight for more accurate current status
 */
export const calculateProgressPercentage = (progressData: IEPProgressData[]): number => {
  if (progressData.length === 0) return 0

  // Filter reliable data only
  const reliableData = progressData
    .filter(data => data.data_reliability === 'reliable')
    .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())

  if (reliableData.length === 0) return 0

  // Use weighted average with exponential decay (more recent = higher weight)
  const weights = reliableData.map((_, index) => Math.pow(0.85, index))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)

  const weightedSum = reliableData.reduce((sum, data, index) => {
    const percentage = data.percentage_achieved || 
                      (data.score_achieved && data.score_possible 
                        ? (data.score_achieved / data.score_possible) * 100 
                        : 0)
    return sum + (percentage * weights[index])
  }, 0)

  return Math.round(weightedSum / weightSum)
}

/**
 * Determine progress status based on percentage and trend
 */
export const determineProgressStatus = (
  percentage: number, 
  trend: ProgressTrend,
  daysSinceStart: number
): ProgressStatus => {
  // Mastered: >= 90% with stable or improving trend
  if (percentage >= 90 && trend.direction !== 'declining') {
    return 'mastered'
  }
  
  // Progressing: >= 60% or positive trend with reasonable time
  if (percentage >= 60 || 
      (trend.direction === 'improving' && percentage >= 40 && daysSinceStart >= 30)) {
    return 'progressing'
  }
  
  // Introduced: Some progress but < 60%
  if (percentage > 10 && percentage < 60) {
    return 'introduced'
  }
  
  // Not started: <= 10% or no reliable data
  return 'not_started'
}

/**
 * Calculate progress trend analysis
 */
export const calculateProgressTrend = (progressData: IEPProgressData[]): ProgressTrend => {
  if (progressData.length < 2) {
    return {
      direction: 'insufficient_data',
      magnitude: 0,
      confidence: 'low',
      dataPoints: progressData.length,
      timeSpan: 0
    }
  }

  // Sort by date and get reliable data
  const reliableData = progressData
    .filter(data => data.data_reliability === 'reliable')
    .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())

  if (reliableData.length < 2) {
    return {
      direction: 'insufficient_data',
      magnitude: 0,
      confidence: 'low',
      dataPoints: reliableData.length,
      timeSpan: 0
    }
  }

  const firstPoint = reliableData[0]
  const lastPoint = reliableData[reliableData.length - 1]
  const timeSpan = Math.ceil(
    (new Date(lastPoint.collection_date).getTime() - new Date(firstPoint.collection_date).getTime()) 
    / (1000 * 60 * 60 * 24)
  )

  const firstPercentage = firstPoint.percentage_achieved || 
    (firstPoint.score_achieved && firstPoint.score_possible 
      ? (firstPoint.score_achieved / firstPoint.score_possible) * 100 
      : 0)
  
  const lastPercentage = lastPoint.percentage_achieved || 
    (lastPoint.score_achieved && lastPoint.score_possible 
      ? (lastPoint.score_achieved / lastPoint.score_possible) * 100 
      : 0)

  const magnitude = Math.abs(lastPercentage - firstPercentage)
  const direction = lastPercentage > firstPercentage + 5 ? 'improving' :
                   lastPercentage < firstPercentage - 5 ? 'declining' : 'stable'

  // Calculate confidence based on data consistency and quantity
  const confidence = reliableData.length >= 8 && timeSpan >= 30 ? 'high' :
                    reliableData.length >= 4 && timeSpan >= 14 ? 'medium' : 'low'

  // Project mastery date if improving
  let projectedMastery: Date | undefined
  if (direction === 'improving' && lastPercentage < 90) {
    const ratePerDay = (lastPercentage - firstPercentage) / timeSpan
    if (ratePerDay > 0) {
      const daysToMastery = (90 - lastPercentage) / ratePerDay
      projectedMastery = new Date(Date.now() + daysToMastery * 24 * 60 * 60 * 1000)
    }
  }

  return {
    direction,
    magnitude,
    confidence,
    dataPoints: reliableData.length,
    timeSpan,
    projectedMastery
  }
}

/**
 * Calculate consistency score (0-1) based on data point variance
 */
export const calculateConsistency = (progressData: IEPProgressData[]): number => {
  if (progressData.length < 3) return 0

  const percentages = progressData
    .filter(data => data.data_reliability === 'reliable')
    .map(data => data.percentage_achieved || 
      (data.score_achieved && data.score_possible 
        ? (data.score_achieved / data.score_possible) * 100 
        : 0))

  if (percentages.length < 3) return 0

  const mean = percentages.reduce((sum, p) => sum + p, 0) / percentages.length
  const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length
  const standardDeviation = Math.sqrt(variance)

  // Consistency decreases with higher standard deviation
  // Scale: 0-1 where 1 is perfectly consistent
  return Math.max(0, 1 - (standardDeviation / 50)) // 50 is max reasonable SD for percentages
}

// =============================================================================
// DATA COLLECTION FUNCTIONS
// =============================================================================

/**
 * Record new progress data point
 */
export const recordProgressData = async (
  goalId: string,
  dataPoint: Omit<ProgressDataPoint, 'goalId'>
): Promise<IEPProgressData> => {
  return retryApiCall(async () => {
    console.log('🔍 ProgressTracking: Recording progress data for goal:', goalId)
    
    await requireAuth() // Ensure user is authenticated
    
    // Validate data point
    if (dataPoint.measurementValue < 0) {
      throw new Error('Measurement value cannot be negative')
    }
    
    // Determine reliability based on collection conditions
    const reliability = determineDataReliability(dataPoint)
    
    const progressData = {
      goal_id: goalId,
      collection_date: dataPoint.collectionDate,
      percentage_achieved: dataPoint.measurementValue,
      score_achieved: dataPoint.measurementValue,
      score_possible: 100, // Normalized to percentage
      measurement_method: dataPoint.measurementUnit,
      data_reliability: reliability,
      collected_by: user.id,
      collection_notes: dataPoint.notes,
      session_duration_minutes: dataPoint.sessionDuration,
      trial_count: dataPoint.trialCount,
      environment_setting: dataPoint.environment,
      created_by: user.id
    }

    const { data: newProgressData, error } = await supabase
      .from('iep_progress_data')
      .insert([progressData])
      .select()
      .single()

    if (error) {
      console.error('❌ ProgressTracking: Error recording progress data:', error)
      errorMonitoring.reportError(error, {
        component: 'recordProgressData',
        action: 'insert_progress',
        userId: user.id,
        context: { goalId }
      })
      throw error
    }

    console.log('✅ ProgressTracking: Progress data recorded successfully:', newProgressData.id)
    
    // Update goal's current progress after recording new data
    await updateGoalProgress(goalId)
    
    return newProgressData
  }, {
    context: 'Recording progress data',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Update goal's current progress based on all data points
 */
export const updateGoalProgress = async (goalId: string): Promise<void> => {
  return retryApiCall(async () => {
    console.log('🔍 ProgressTracking: Updating goal progress calculations:', goalId)
    
    await requireAuth() // Ensure user is authenticated
    
    // Fetch all progress data for this goal
    const { data: progressData, error: fetchError } = await supabase
      .from('iep_progress_data')
      .select('*')
      .eq('goal_id', goalId)
      .order('collection_date', { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    if (!progressData || progressData.length === 0) {
      console.log('⚠️ ProgressTracking: No progress data found for goal:', goalId)
      return
    }

    // Calculate new progress metrics
    const currentPercentage = calculateProgressPercentage(progressData)
    const trend = calculateProgressTrend(progressData)
    
    // Get goal start date for status calculation
    const { data: goal, error: goalError } = await supabase
      .from('iep_goals')
      .select('baseline_date')
      .eq('id', goalId)
      .single()

    if (goalError) {
      throw goalError
    }

    const daysSinceStart = goal ? Math.ceil(
      (Date.now() - new Date(goal.baseline_date).getTime()) / (1000 * 60 * 60 * 24)
    ) : 0

    const progressStatus = determineProgressStatus(currentPercentage, trend, daysSinceStart)

    // Update goal with new progress calculations
    const { error: updateError } = await supabase
      .from('iep_goals')
      .update({
        current_progress_percentage: currentPercentage,
        progress_status: progressStatus,
        last_progress_update: new Date().toISOString().split('T')[0],
        updated_by: user.id
      })
      .eq('id', goalId)

    if (updateError) {
      console.error('❌ ProgressTracking: Error updating goal progress:', updateError)
      errorMonitoring.reportError(updateError, {
        component: 'updateGoalProgress',
        action: 'update_goal',
        userId: user.id,
        context: { goalId }
      })
      throw updateError
    }

    console.log('✅ ProgressTracking: Goal progress updated:', {
      goalId,
      currentPercentage,
      progressStatus,
      trendDirection: trend.direction
    })
  }, {
    context: 'Updating goal progress',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Generate progress summary for a goal
 */
export const generateProgressSummary = async (goalId: string): Promise<ProgressSummary> => {
  return retryApiCall(async () => {
    console.log('🔍 ProgressTracking: Generating progress summary for goal:', goalId)
    
    await requireAuth() // Ensure user is authenticated
    
    // Fetch goal and progress data
    const [goalResponse, progressResponse] = await Promise.all([
      supabase
        .from('iep_goals')
        .select('*, iep:ieps(effective_date)')
        .eq('id', goalId)
        .single(),
      supabase
        .from('iep_progress_data')
        .select('*')
        .eq('goal_id', goalId)
        .order('collection_date', { ascending: false })
    ])

    if (goalResponse.error) throw goalResponse.error
    if (progressResponse.error) throw progressResponse.error

    const goal = goalResponse.data
    const progressData = progressResponse.data || []

    // Calculate all metrics
    const currentPercentage = calculateProgressPercentage(progressData)
    const trend = calculateProgressTrend(progressData)
    const consistency = calculateConsistency(progressData)
    
    const startDate = new Date(goal.iep?.effective_date || goal.baseline_date)
    const daysSinceStart = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const progressStatus = determineProgressStatus(currentPercentage, trend, daysSinceStart)
    
    // Calculate average improvement per week
    const averageImprovement = progressData.length >= 2 
      ? (currentPercentage - (progressData[progressData.length - 1]?.percentage_achieved || 0)) / (trend.timeSpan / 7)
      : 0

    const summary: ProgressSummary = {
      goalId,
      currentPercentage,
      progressStatus,
      trend,
      lastDataPoint: progressData[0],
      totalDataPoints: progressData.length,
      averageImprovement,
      consistency,
      masteryProjection: trend.projectedMastery
    }

    console.log('✅ ProgressTracking: Progress summary generated successfully')
    return summary
  }, {
    context: 'Generating progress summary',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Generate comprehensive progress report
 */
export const generateProgressReport = async (
  goalId: string,
  reportType: 'weekly' | 'monthly' | 'quarterly',
  periodStart?: Date,
  periodEnd?: Date
): Promise<ProgressReport> => {
  return retryApiCall(async () => {
    console.log('🔍 ProgressTracking: Generating progress report:', { goalId, reportType })
    
    await requireAuth() // Ensure user is authenticated
    
    // Calculate period dates if not provided
    const now = new Date()
    const endDate = periodEnd || now
    
    let startDate: Date
    if (periodStart) {
      startDate = periodStart
    } else {
      switch (reportType) {
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case 'quarterly':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
    }

    // Get progress data for the period
    const { data: periodData, error } = await supabase
      .from('iep_progress_data')
      .select('*')
      .eq('goal_id', goalId)
      .gte('collection_date', startDate.toISOString())
      .lte('collection_date', endDate.toISOString())
      .order('collection_date', { ascending: false })

    if (error) throw error

    // Generate summary
    const summary = await generateProgressSummary(goalId)

    // Generate recommendations and concerns
    const recommendations = generateRecommendations(summary)
    const concerns = generateConcerns(summary)
    const nextSteps = generateNextSteps(summary)

    const report: ProgressReport = {
      reportId: `report-${goalId}-${Date.now()}`,
      goalId,
      reportType,
      periodStart: startDate,
      periodEnd: endDate,
      summary,
      dataPoints: periodData || [],
      recommendations,
      concerns,
      nextSteps
    }

    console.log('✅ ProgressTracking: Progress report generated successfully')
    return report
  }, {
    context: 'Generating progress report',
    maxAttempts: 2,
    logErrors: true
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Determine data reliability based on collection conditions
 */
export const determineDataReliability = (dataPoint: Omit<ProgressDataPoint, 'goalId'>): DataReliability => {
  let reliabilityScore = 100

  // Reduce score for short sessions (less than 10 minutes)
  if (dataPoint.sessionDuration && dataPoint.sessionDuration < 10) {
    reliabilityScore -= 20
  }

  // Reduce score for very few trials (less than 3)
  if (dataPoint.trialCount && dataPoint.trialCount < 3) {
    reliabilityScore -= 15
  }

  // Reduce score for non-optimal environments
  if (dataPoint.environment && !['controlled', 'classroom', 'therapy_room'].includes(dataPoint.environment)) {
    reliabilityScore -= 10
  }

  // Return reliability category
  if (reliabilityScore >= 85) return 'reliable'
  if (reliabilityScore >= 65) return 'somewhat_reliable'
  return 'unreliable'
}

/**
 * Generate recommendations based on progress summary
 */
export const generateRecommendations = (summary: ProgressSummary): string[] => {
  const recommendations: string[] = []

  if (summary.currentPercentage >= 90) {
    recommendations.push('Consider advancing to more challenging objectives')
    recommendations.push('Maintain current intervention strategies')
  } else if (summary.progressStatus === 'progressing') {
    if (summary.trend.direction === 'improving') {
      recommendations.push('Continue current intervention approach')
      if (summary.consistency < 0.7) {
        recommendations.push('Focus on consistency across different settings')
      }
    } else {
      recommendations.push('Review and adjust intervention strategies')
      recommendations.push('Consider environmental factors affecting performance')
    }
  } else if (summary.progressStatus === 'introduced') {
    recommendations.push('Increase intervention intensity or frequency')
    recommendations.push('Break down goal into smaller, more achievable steps')
    recommendations.push('Consider alternative teaching strategies')
  } else {
    recommendations.push('Reassess goal appropriateness and baseline level')
    recommendations.push('Increase support and scaffolding')
    recommendations.push('Consider prerequisite skills that may need development')
  }

  return recommendations
}

/**
 * Generate concerns based on progress summary
 */
export const generateConcerns = (summary: ProgressSummary): string[] => {
  const concerns: string[] = []

  if (summary.trend.direction === 'declining') {
    concerns.push('Progress is declining - immediate intervention needed')
  }

  if (summary.consistency < 0.5) {
    concerns.push('Inconsistent performance across sessions')
  }

  if (summary.totalDataPoints < 4) {
    concerns.push('Insufficient data points for reliable progress monitoring')
  }

  if (summary.currentPercentage < 20 && summary.totalDataPoints >= 8) {
    concerns.push('Minimal progress despite adequate intervention time')
  }

  return concerns
}

/**
 * Generate next steps based on progress summary
 */
export const generateNextSteps = (summary: ProgressSummary): string[] => {
  const nextSteps: string[] = []

  if (summary.currentPercentage >= 90) {
    nextSteps.push('Schedule mastery assessment')
    nextSteps.push('Plan transition to new goals')
  } else if (summary.trend.direction === 'improving') {
    nextSteps.push('Continue data collection at current frequency')
    nextSteps.push('Monitor for maintenance of gains')
  } else {
    nextSteps.push('Review intervention plan in next team meeting')
    nextSteps.push('Consider consultation with specialist')
    nextSteps.push('Increase data collection frequency')
  }

  return nextSteps
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Update progress for multiple goals
 */
export const updateMultipleGoalsProgress = async (goalIds: string[]): Promise<void> => {
  console.log('🔍 ProgressTracking: Updating progress for multiple goals:', goalIds.length)
  
  const updatePromises = goalIds.map(goalId => updateGoalProgress(goalId))
  
  try {
    await Promise.all(updatePromises)
    console.log('✅ ProgressTracking: All goal progress updates completed')
  } catch (error) {
    console.error('❌ ProgressTracking: Some goal updates failed:', error)
    throw error
  }
}

/**
 * Generate progress summaries for multiple goals
 */
export const generateMultipleProgressSummaries = async (goalIds: string[]): Promise<ProgressSummary[]> => {
  console.log('🔍 ProgressTracking: Generating summaries for multiple goals:', goalIds.length)
  
  const summaryPromises = goalIds.map(goalId => generateProgressSummary(goalId))
  
  try {
    const summaries = await Promise.all(summaryPromises)
    console.log('✅ ProgressTracking: All progress summaries generated')
    return summaries
  } catch (error) {
    console.error('❌ ProgressTracking: Some summary generation failed:', error)
    throw error
  }
}

// =============================================================================
// EXPORT ALL FUNCTIONS
// =============================================================================

export {
  // Core calculations
  calculateProgressPercentage,
  determineProgressStatus,
  calculateProgressTrend,
  calculateConsistency,
  
  // Data collection
  recordProgressData,
  updateGoalProgress,
  determineDataReliability,
  
  // Reporting
  generateProgressSummary,
  generateProgressReport,
  generateRecommendations,
  generateConcerns,
  generateNextSteps,
  
  // Bulk operations
  updateMultipleGoalsProgress,
  generateMultipleProgressSummaries
}