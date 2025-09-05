/**
 * Adaptive Learning System
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Implements continuous learning from therapy outcomes and therapist feedback
 * Adapts recommendations based on real-time progress data and clinical insights
 */

import { supabase } from '../../lib/supabase'
import type {
  TherapistFeedback,
  TherapyOutcome,
  AIRecommendation,
  MLTrainingData,
  StudentDemographics,
  AIServiceResult
} from '../../types/ai-recommendations'

/**
 * Adaptive Learning Service
 * Continuously learns from outcomes and feedback to improve recommendation quality
 */
export class AdaptiveLearningService {
  private static readonly LEARNING_RATE = 0.01
  private static readonly FEEDBACK_WINDOW_DAYS = 30
  private static readonly MIN_FEEDBACK_COUNT = 10
  private static readonly OUTCOME_TRACKING_WINDOW = 90 // days

  /**
   * Process new therapy outcomes to update model understanding
   * @param outcomes - Recent therapy outcomes
   * @param studentData - Associated student context
   * @returns Learning update results
   */
  static async processOutcomeData(
    outcomes: TherapyOutcome[],
    studentData: MLTrainingData['studentData'][0]
  ): Promise<AIServiceResult<{
    adaptationsApplied: number
    modelUpdateRequired: boolean
    learningInsights: string[]
  }>> {
    try {
      const insights: string[] = []
      let adaptationsApplied = 0

      // Analyze outcome patterns
      const patterns = this.analyzeOutcomePatterns(outcomes, studentData)
      
      // Update recommendation weights based on outcomes
      if (patterns.significantChanges.length > 0) {
        await this.updateRecommendationWeights(patterns, studentData)
        adaptationsApplied = patterns.significantChanges.length
        insights.push(`Updated ${adaptationsApplied} recommendation parameters based on outcome patterns`)
      }

      // Detect unexpected outcomes that might indicate model drift
      const anomalies = this.detectOutcomeAnomalies(outcomes, studentData)
      if (anomalies.length > 0) {
        insights.push(`Detected ${anomalies.length} outcome anomalies requiring investigation`)
      }

      // Check if full model retraining is needed
      const modelUpdateRequired = await this.assessRetrainingNeed()

      return {
        data: {
          adaptationsApplied,
          modelUpdateRequired,
          learningInsights: insights
        },
        error: null
      }

    } catch (error) {
      console.error('Error processing outcome data:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error processing outcome data: ${error.message}`,
          messageAr: `خطأ في معالجة بيانات النتائج: ${error.message}`
        }
      }
    }
  }

  /**
   * Learn from therapist feedback to improve future recommendations
   * @param feedback - Therapist decision and reasoning
   * @returns Feedback processing results
   */
  static async learnFromFeedback(
    feedback: TherapistFeedback
  ): Promise<AIServiceResult<{
    feedbackProcessed: boolean
    adaptationsApplied: string[]
    confidenceAdjustment?: number
  }>> {
    try {
      const adaptationsApplied: string[] = []

      // Get the original recommendation
      const { data: recommendation, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('id', feedback.recommendationId)
        .single()

      if (error || !recommendation) {
        return {
          data: null,
          error: {
            code: 'UNKNOWN_ERROR',
            messageEn: 'Could not find original recommendation for feedback learning',
            messageAr: 'لا يمكن العثور على التوصية الأصلية لتعلم التقييم'
          }
        }
      }

      // Learn from decision patterns
      if (feedback.decision === 'reject') {
        await this.learnFromRejection(feedback, recommendation)
        adaptationsApplied.push('Updated rejection pattern learning')
      } else if (feedback.decision === 'modify') {
        await this.learnFromModification(feedback, recommendation)
        adaptationsApplied.push('Incorporated modification preferences')
      } else if (feedback.decision === 'accept') {
        await this.reinforceSuccessfulPattern(feedback, recommendation)
        adaptationsApplied.push('Reinforced successful recommendation pattern')
      }

      // Update therapist-specific preferences
      await this.updateTherapistPreferences(feedback)
      adaptationsApplied.push('Updated therapist preference model')

      // Calculate confidence adjustment based on feedback
      const confidenceAdjustment = this.calculateConfidenceAdjustment(feedback, recommendation)

      return {
        data: {
          feedbackProcessed: true,
          adaptationsApplied,
          confidenceAdjustment
        },
        error: null
      }

    } catch (error) {
      console.error('Error learning from feedback:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error learning from feedback: ${error.message}`,
          messageAr: `خطأ في التعلم من التقييم: ${error.message}`
        }
      }
    }
  }

  /**
   * Adapt recommendations based on real-time progress data
   * @param studentId - Student identifier
   * @param recentOutcomes - Latest therapy outcomes
   * @returns Adaptive recommendation adjustments
   */
  static async adaptToProgressData(
    studentId: string,
    recentOutcomes: TherapyOutcome[]
  ): Promise<AIServiceResult<{
    adaptiveAdjustments: Array<{
      type: 'frequency' | 'duration' | 'approach' | 'goal'
      adjustment: string
      reasoning: string
      confidence: number
    }>
    triggerRecommendationUpdate: boolean
  }>> {
    try {
      const adaptiveAdjustments: Array<{
        type: 'frequency' | 'duration' | 'approach' | 'goal'
        adjustment: string
        reasoning: string
        confidence: number
      }> = []

      if (recentOutcomes.length === 0) {
        return {
          data: { adaptiveAdjustments, triggerRecommendationUpdate: false },
          error: null
        }
      }

      // Analyze recent progress trends
      const progressAnalysis = this.analyzeProgressTrends(recentOutcomes)
      
      // Detect plateaus or declining performance
      if (progressAnalysis.trend === 'declining' && progressAnalysis.significance > 0.7) {
        adaptiveAdjustments.push({
          type: 'frequency',
          adjustment: 'Increase session frequency by 1 per week',
          reasoning: 'Declining progress detected - additional support may be needed',
          confidence: 0.75
        })
      } else if (progressAnalysis.trend === 'plateau' && progressAnalysis.duration > 4) {
        adaptiveAdjustments.push({
          type: 'approach',
          adjustment: 'Consider alternative therapeutic approaches',
          reasoning: `Progress plateau detected for ${progressAnalysis.duration} sessions`,
          confidence: 0.8
        })
      }

      // Detect rapid improvement suggesting possible frequency reduction
      if (progressAnalysis.trend === 'improving' && progressAnalysis.rate > 0.15) {
        const currentFrequency = await this.getCurrentSessionFrequency(studentId)
        if (currentFrequency > 2) {
          adaptiveAdjustments.push({
            type: 'frequency',
            adjustment: 'Consider reducing session frequency while maintaining gains',
            reasoning: 'Rapid improvement suggests current intensity may be higher than needed',
            confidence: 0.65
          })
        }
      }

      // Goal-specific adaptations
      const goalAnalysis = this.analyzeGoalSpecificProgress(recentOutcomes)
      goalAnalysis.forEach(goal => {
        if (goal.mastery > 0.9) {
          adaptiveAdjustments.push({
            type: 'goal',
            adjustment: `Advance goal: ${goal.goalId}`,
            reasoning: 'Goal mastery achieved - ready for advancement',
            confidence: 0.9
          })
        } else if (goal.stagnation > 6) {
          adaptiveAdjustments.push({
            type: 'goal',
            adjustment: `Modify approach for goal: ${goal.goalId}`,
            reasoning: `No progress on goal for ${goal.stagnation} sessions`,
            confidence: 0.8
          })
        }
      })

      // Trigger recommendation update if significant adaptations are needed
      const triggerRecommendationUpdate = adaptiveAdjustments.some(adj => adj.confidence > 0.8)

      return {
        data: {
          adaptiveAdjustments,
          triggerRecommendationUpdate
        },
        error: null
      }

    } catch (error) {
      console.error('Error adapting to progress data:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error adapting to progress: ${error.message}`,
          messageAr: `خطأ في التكيف مع التقدم: ${error.message}`
        }
      }
    }
  }

  /**
   * Trigger model retraining based on accumulated feedback and outcomes
   * @returns Retraining assessment and trigger status
   */
  static async assessRetrainingNeed(): Promise<boolean> {
    try {
      // Check feedback patterns over recent period
      const { data: recentFeedback } = await supabase
        .from('recommendation_feedback')
        .select('decision, created_at')
        .gte('created_at', new Date(Date.now() - this.FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())

      if (!recentFeedback || recentFeedback.length < this.MIN_FEEDBACK_COUNT) {
        return false // Not enough feedback to assess
      }

      // Calculate rejection rate
      const rejectionRate = recentFeedback.filter(f => f.decision === 'reject').length / recentFeedback.length
      
      // Calculate modification rate
      const modificationRate = recentFeedback.filter(f => f.decision === 'modify').length / recentFeedback.length

      // Trigger retraining if rejection rate > 30% or modification rate > 50%
      return rejectionRate > 0.3 || modificationRate > 0.5

    } catch (error) {
      console.error('Error assessing retraining need:', error)
      return false
    }
  }

  // Private helper methods

  private static analyzeOutcomePatterns(
    outcomes: TherapyOutcome[],
    studentData: MLTrainingData['studentData'][0]
  ) {
    const significantChanges: Array<{
      parameter: string
      oldValue: number
      newValue: number
      confidence: number
    }> = []

    // Analyze achievement rate changes
    const recentAchievements = outcomes.slice(0, 5).map(o => o.achievement)
    const olderAchievements = outcomes.slice(-5).map(o => o.achievement)

    if (recentAchievements.length >= 3 && olderAchievements.length >= 3) {
      const recentAvg = recentAchievements.reduce((a, b) => a + b) / recentAchievements.length
      const olderAvg = olderAchievements.reduce((a, b) => a + b) / olderAchievements.length
      
      const change = Math.abs(recentAvg - olderAvg)
      if (change > 0.2) { // Significant change threshold
        significantChanges.push({
          parameter: 'achievement_trend',
          oldValue: olderAvg,
          newValue: recentAvg,
          confidence: Math.min(0.9, change * 2)
        })
      }
    }

    return { significantChanges }
  }

  private static detectOutcomeAnomalies(
    outcomes: TherapyOutcome[],
    studentData: MLTrainingData['studentData'][0]
  ): string[] {
    const anomalies: string[] = []

    if (outcomes.length < 5) return anomalies

    // Calculate baseline statistics
    const achievements = outcomes.map(o => o.achievement)
    const mean = achievements.reduce((a, b) => a + b) / achievements.length
    const variance = achievements.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / achievements.length
    const stdDev = Math.sqrt(variance)

    // Detect outliers (more than 2 standard deviations from mean)
    const outliers = achievements.filter(a => Math.abs(a - mean) > 2 * stdDev)
    if (outliers.length > achievements.length * 0.1) { // More than 10% outliers
      anomalies.push(`${outliers.length} outcome outliers detected`)
    }

    // Detect sudden drops in performance
    for (let i = 1; i < achievements.length; i++) {
      if (achievements[i-1] - achievements[i] > 0.4) {
        anomalies.push(`Sudden performance drop detected in session ${i}`)
      }
    }

    return anomalies
  }

  private static async updateRecommendationWeights(
    patterns: any,
    studentData: MLTrainingData['studentData'][0]
  ): Promise<void> {
    // Update recommendation weights in database
    // This would adjust model parameters based on observed patterns
    
    try {
      const updates = patterns.significantChanges.map(change => ({
        student_demographic_pattern: this.serializeDemographics(studentData.demographics),
        parameter_name: change.parameter,
        adjustment_factor: change.newValue / (change.oldValue || 1),
        confidence: change.confidence,
        created_at: new Date().toISOString()
      }))

      // Store learning updates (would be used in model retraining)
      await supabase.from('ml_learning_updates').insert(updates)
    } catch (error) {
      console.error('Error updating recommendation weights:', error)
    }
  }

  private static async learnFromRejection(
    feedback: TherapistFeedback,
    recommendation: any
  ): Promise<void> {
    // Learn why recommendations were rejected
    const rejectionPattern = {
      recommendation_type: recommendation.recommendation_type,
      student_demographics: recommendation.student_id, // Would extract demographics
      rejection_reason: feedback.reasoning,
      confidence_at_rejection: recommendation.confidence,
      created_at: new Date().toISOString()
    }

    try {
      await supabase.from('ml_rejection_patterns').insert(rejectionPattern)
    } catch (error) {
      console.error('Error learning from rejection:', error)
    }
  }

  private static async learnFromModification(
    feedback: TherapistFeedback,
    recommendation: any
  ): Promise<void> {
    // Learn from therapist modifications
    if (feedback.modifications) {
      const modificationPattern = {
        original_recommendation: recommendation.recommendations,
        therapist_modifications: feedback.modifications,
        modification_reasoning: feedback.reasoning,
        therapist_id: feedback.therapistId,
        created_at: new Date().toISOString()
      }

      try {
        await supabase.from('ml_modification_patterns').insert(modificationPattern)
      } catch (error) {
        console.error('Error learning from modification:', error)
      }
    }
  }

  private static async reinforceSuccessfulPattern(
    feedback: TherapistFeedback,
    recommendation: any
  ): Promise<void> {
    // Reinforce successful recommendation patterns
    const successPattern = {
      recommendation_type: recommendation.recommendation_type,
      successful_parameters: recommendation.recommendations,
      confidence_at_acceptance: recommendation.confidence,
      therapist_satisfaction: 'accepted', // Could be rating
      created_at: new Date().toISOString()
    }

    try {
      await supabase.from('ml_success_patterns').insert(successPattern)
    } catch (error) {
      console.error('Error reinforcing successful pattern:', error)
    }
  }

  private static async updateTherapistPreferences(feedback: TherapistFeedback): Promise<void> {
    // Track individual therapist preferences
    try {
      const { data: existing } = await supabase
        .from('therapist_preferences')
        .select('*')
        .eq('therapist_id', feedback.therapistId)
        .single()

      if (existing) {
        // Update existing preferences
        await supabase
          .from('therapist_preferences')
          .update({
            total_feedback_count: (existing.total_feedback_count || 0) + 1,
            last_feedback_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('therapist_id', feedback.therapistId)
      } else {
        // Create new preferences record
        await supabase.from('therapist_preferences').insert({
          therapist_id: feedback.therapistId,
          total_feedback_count: 1,
          first_feedback_date: new Date().toISOString(),
          last_feedback_date: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error updating therapist preferences:', error)
    }
  }

  private static calculateConfidenceAdjustment(
    feedback: TherapistFeedback,
    recommendation: any
  ): number | undefined {
    const originalConfidence = recommendation.confidence

    switch (feedback.decision) {
      case 'accept':
        // Slight boost for accepted recommendations
        return Math.min(0.95, originalConfidence * 1.05)
        
      case 'modify':
        // Small reduction for modified recommendations
        return originalConfidence * 0.9
        
      case 'reject':
        // Significant reduction for rejected recommendations
        return originalConfidence * 0.7
        
      default:
        return undefined
    }
  }

  private static analyzeProgressTrends(outcomes: TherapyOutcome[]) {
    if (outcomes.length < 3) {
      return { trend: 'insufficient_data', significance: 0, rate: 0, duration: 0 }
    }

    // Sort by date
    const sortedOutcomes = outcomes.sort((a, b) => 
      new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
    )

    // Calculate trend
    const achievements = sortedOutcomes.map(o => o.achievement)
    const n = achievements.length
    const xValues = achievements.map((_, i) => i)
    const xMean = xValues.reduce((a, b) => a + b) / n
    const yMean = achievements.reduce((a, b) => a + b) / n

    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (achievements[i] - yMean), 0)
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0)

    const slope = denominator === 0 ? 0 : numerator / denominator

    let trend: 'improving' | 'declining' | 'stable' | 'plateau'
    if (Math.abs(slope) < 0.05) {
      // Check if it's a plateau (consistently high) or stable (varying)
      trend = yMean > 0.8 && achievements.every(a => a > 0.7) ? 'plateau' : 'stable'
    } else {
      trend = slope > 0 ? 'improving' : 'declining'
    }

    return {
      trend,
      significance: Math.abs(slope),
      rate: slope,
      duration: n
    }
  }

  private static async getCurrentSessionFrequency(studentId: string): Promise<number> {
    // Mock implementation - would query current therapy plan
    return 2 // Default 2 sessions per week
  }

  private static analyzeGoalSpecificProgress(outcomes: TherapyOutcome[]) {
    const goalAnalysis = new Map<string, { achievements: number[], sessions: number }>()

    // Group outcomes by goal
    outcomes.forEach(outcome => {
      if (!goalAnalysis.has(outcome.goalId)) {
        goalAnalysis.set(outcome.goalId, { achievements: [], sessions: 0 })
      }
      const goalData = goalAnalysis.get(outcome.goalId)!
      goalData.achievements.push(outcome.achievement)
      goalData.sessions++
    })

    // Analyze each goal
    return Array.from(goalAnalysis.entries()).map(([goalId, data]) => {
      const avgAchievement = data.achievements.reduce((a, b) => a + b) / data.achievements.length
      const recentAchievements = data.achievements.slice(-5)
      const recentAvg = recentAchievements.reduce((a, b) => a + b) / recentAchievements.length

      return {
        goalId,
        mastery: recentAvg,
        stagnation: recentAvg < 0.3 && data.sessions > 6 ? data.sessions : 0,
        improvement: recentAvg - avgAchievement
      }
    })
  }

  private static serializeDemographics(demographics: StudentDemographics): string {
    return JSON.stringify({
      ageGroup: demographics.ageGroup,
      primaryLanguage: demographics.primaryLanguage,
      diagnosisCodes: demographics.diagnosisCodes.slice(0, 2) // Only first 2 for privacy
    })
  }
}