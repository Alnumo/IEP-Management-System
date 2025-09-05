/**
 * Confidence Scoring System
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Advanced confidence scoring algorithms for ranking and validating AI recommendations
 * Implements multiple confidence metrics with clinical safety considerations
 */

import type {
  AIRecommendation,
  TherapyRecommendation,
  StudentDemographics,
  TherapyOutcome,
  AssessmentAnalysis,
  MLTrainingData
} from '../../types/ai-recommendations'

/**
 * Confidence Scoring Service
 * Provides multi-dimensional confidence assessment for AI recommendations
 */
export class ConfidenceScoring {
  private static readonly CONFIDENCE_FACTORS = {
    dataQuality: 0.25,
    demographicSupport: 0.20,
    clinicalEvidence: 0.20,
    modelPerformance: 0.15,
    outcomeHistory: 0.10,
    biasCheck: 0.10
  }

  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.3
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.8
  private static readonly SAFETY_CONFIDENCE_THRESHOLD = 0.6

  /**
   * Calculate comprehensive confidence score for a recommendation
   * @param recommendation - The therapy recommendation to score
   * @param studentData - Complete student context data
   * @param historicalData - Reference data for comparison
   * @returns Detailed confidence assessment
   */
  static calculateConfidenceScore(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0],
    historicalData?: MLTrainingData
  ): {
    overallConfidence: number
    confidenceFactors: Record<string, number>
    riskAssessment: 'low' | 'medium' | 'high'
    clinicalSafetyScore: number
    recommendedAction: 'accept' | 'review' | 'reject'
    explanation: string
  } {
    const factors = this.calculateConfidenceFactors(recommendation, studentData, historicalData)
    const overallConfidence = this.weightedConfidenceScore(factors)
    const clinicalSafetyScore = this.assessClinicalSafety(recommendation, studentData)
    
    return {
      overallConfidence,
      confidenceFactors: factors,
      riskAssessment: this.assessRisk(overallConfidence, clinicalSafetyScore),
      clinicalSafetyScore,
      recommendedAction: this.determineRecommendedAction(overallConfidence, clinicalSafetyScore),
      explanation: this.generateConfidenceExplanation(factors, overallConfidence)
    }
  }

  /**
   * Rank multiple recommendations by confidence and clinical relevance
   * @param recommendations - List of recommendations to rank
   * @param studentData - Student context data
   * @param historicalData - Reference data
   * @returns Ranked recommendations with confidence scores
   */
  static rankByConfidence(
    recommendations: AIRecommendation[],
    studentData: MLTrainingData['studentData'][0],
    historicalData?: MLTrainingData
  ): Array<AIRecommendation & { confidenceDetails: ReturnType<typeof ConfidenceScoring.calculateConfidenceScore> }> {
    const scoredRecommendations = recommendations.map(rec => {
      const confidenceDetails = this.calculateConfidenceScore(
        rec.recommendations,
        studentData,
        historicalData
      )
      
      return {
        ...rec,
        confidence: confidenceDetails.overallConfidence,
        clinicalRelevance: Math.min(0.95, confidenceDetails.clinicalSafetyScore),
        confidenceDetails
      }
    })

    // Sort by overall confidence and clinical safety
    return scoredRecommendations.sort((a, b) => {
      // Primary: Clinical safety
      const safetyDiff = b.confidenceDetails.clinicalSafetyScore - a.confidenceDetails.clinicalSafetyScore
      if (Math.abs(safetyDiff) > 0.1) return safetyDiff

      // Secondary: Overall confidence
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.05) return confidenceDiff

      // Tertiary: Clinical relevance
      return b.clinicalRelevance - a.clinicalRelevance
    })
  }

  /**
   * Validate recommendation confidence meets safety thresholds
   * @param recommendation - Recommendation to validate
   * @param studentData - Student context
   * @returns Validation results with safety flags
   */
  static validateRecommendationSafety(
    recommendation: AIRecommendation,
    studentData: MLTrainingData['studentData'][0]
  ): {
    isSafe: boolean
    safetyFlags: string[]
    requiredActions: string[]
    confidenceAdjustment?: number
  } {
    const safetyFlags: string[] = []
    const requiredActions: string[] = []
    let confidenceAdjustment: number | undefined

    // Check minimum confidence threshold
    if (recommendation.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      safetyFlags.push('Below minimum confidence threshold')
      requiredActions.push('Requires senior therapist review before implementation')
    }

    // Check for high-risk demographics
    const riskFactors = this.identifyRiskFactors(studentData.demographics)
    if (riskFactors.length > 0) {
      safetyFlags.push(`High-risk factors: ${riskFactors.join(', ')}`)
      requiredActions.push('Additional clinical oversight required')
      confidenceAdjustment = Math.max(0.1, recommendation.confidence * 0.8)
    }

    // Check for extreme recommendations
    const extremeFlags = this.checkExtremeRecommendations(recommendation.recommendations)
    if (extremeFlags.length > 0) {
      safetyFlags.push(...extremeFlags)
      requiredActions.push('Clinical justification required')
    }

    return {
      isSafe: safetyFlags.length === 0 && recommendation.confidence >= this.SAFETY_CONFIDENCE_THRESHOLD,
      safetyFlags,
      requiredActions,
      confidenceAdjustment
    }
  }

  /**
   * Calculate dynamic confidence thresholds based on student risk profile
   * @param studentData - Student context data
   * @returns Personalized confidence thresholds
   */
  static calculatePersonalizedThresholds(
    studentData: MLTrainingData['studentData'][0]
  ): {
    acceptanceThreshold: number
    reviewThreshold: number
    rejectionThreshold: number
  } {
    let baseAcceptance = 0.7
    let baseReview = 0.5
    let baseRejection = 0.3

    // Adjust based on student complexity
    const complexityScore = this.calculateCaseComplexity(studentData)
    
    if (complexityScore > 0.7) {
      // High complexity - require higher confidence
      baseAcceptance = 0.85
      baseReview = 0.7
      baseRejection = 0.5
    } else if (complexityScore < 0.3) {
      // Low complexity - can accept lower confidence
      baseAcceptance = 0.6
      baseReview = 0.4
      baseRejection = 0.2
    }

    return {
      acceptanceThreshold: baseAcceptance,
      reviewThreshold: baseReview,
      rejectionThreshold: baseRejection
    }
  }

  // Private helper methods

  private static calculateConfidenceFactors(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0],
    historicalData?: MLTrainingData
  ): Record<string, number> {
    return {
      dataQuality: this.assessDataQuality(studentData),
      demographicSupport: this.assessDemographicSupport(studentData.demographics, historicalData),
      clinicalEvidence: this.assessClinicalEvidence(recommendation, studentData),
      modelPerformance: this.assessModelPerformance(historicalData),
      outcomeHistory: this.assessOutcomeHistory(studentData.outcomes),
      biasCheck: this.assessBiasRisk(studentData.demographics)
    }
  }

  private static assessDataQuality(studentData: MLTrainingData['studentData'][0]): number {
    let score = 0

    // Assessment data quality
    if (studentData.assessmentHistory.length >= 2) score += 0.4
    else if (studentData.assessmentHistory.length >= 1) score += 0.2

    // Outcome data quality  
    if (studentData.outcomes.length >= 10) score += 0.4
    else if (studentData.outcomes.length >= 5) score += 0.3
    else if (studentData.outcomes.length >= 2) score += 0.2

    // Data recency
    if (studentData.assessmentHistory.length > 0) {
      const latestAssessment = new Date(studentData.assessmentHistory[0].analysisDate)
      const monthsSinceAssessment = (Date.now() - latestAssessment.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsSinceAssessment < 3) score += 0.2
      else if (monthsSinceAssessment < 6) score += 0.1
    }

    return Math.min(1, score)
  }

  private static assessDemographicSupport(
    demographics: StudentDemographics,
    historicalData?: MLTrainingData
  ): number {
    if (!historicalData) return 0.5

    // Count similar demographic profiles in training data
    const similarProfiles = historicalData.studentData.filter(student => {
      const demo = student.demographics
      return demo.ageGroup === demographics.ageGroup &&
             demo.primaryLanguage === demographics.primaryLanguage &&
             demo.diagnosisCodes.some(code => demographics.diagnosisCodes.includes(code))
    })

    const supportRatio = similarProfiles.length / Math.max(1, historicalData.studentData.length)
    
    // Scale to confidence score
    if (supportRatio > 0.1) return 0.9
    if (supportRatio > 0.05) return 0.7
    if (supportRatio > 0.02) return 0.5
    return 0.3
  }

  private static assessClinicalEvidence(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0]
  ): number {
    let evidenceScore = 0.5 // Base clinical evidence

    // Age-appropriate recommendations
    const ageGroup = studentData.demographics.ageGroup
    const sessionDuration = recommendation.sessionDuration?.recommended || 60
    
    if (ageGroup === 'early_intervention' && sessionDuration <= 45) evidenceScore += 0.2
    else if (ageGroup === 'preschool' && sessionDuration <= 60) evidenceScore += 0.2
    else if (ageGroup === 'elementary' && sessionDuration <= 75) evidenceScore += 0.2
    else if (sessionDuration > 90) evidenceScore -= 0.3 // Too long

    // Frequency appropriateness
    const frequency = recommendation.sessionFrequency?.recommended || 2
    if (frequency >= 1 && frequency <= 4) evidenceScore += 0.2
    else evidenceScore -= 0.2 // Outside reasonable range

    // Approach appropriateness for diagnosis
    if (recommendation.therapeuticApproaches?.length > 0) {
      evidenceScore += 0.1
    }

    return Math.max(0, Math.min(1, evidenceScore))
  }

  private static assessModelPerformance(historicalData?: MLTrainingData): number {
    // Mock performance assessment - would use actual model metrics
    if (!historicalData || historicalData.studentData.length < 50) {
      return 0.6 // Lower confidence for limited training data
    }
    
    // Would calculate based on actual model performance metrics
    return 0.8
  }

  private static assessOutcomeHistory(outcomes: TherapyOutcome[]): number {
    if (outcomes.length === 0) return 0.3

    // Calculate trend and consistency
    const avgAchievement = outcomes.reduce((sum, o) => sum + o.achievement, 0) / outcomes.length
    const variance = outcomes.reduce((sum, o) => sum + Math.pow(o.achievement - avgAchievement, 2), 0) / outcomes.length
    const consistency = Math.max(0, 1 - variance)

    // Recent vs overall performance
    const recentOutcomes = outcomes.slice(0, Math.min(5, outcomes.length))
    const recentAvg = recentOutcomes.reduce((sum, o) => sum + o.achievement, 0) / recentOutcomes.length

    let score = 0.3 // Base score
    if (avgAchievement > 0.6) score += 0.3
    if (consistency > 0.7) score += 0.2
    if (recentAvg > avgAchievement) score += 0.2 // Improving trend

    return Math.min(1, score)
  }

  private static assessBiasRisk(demographics: StudentDemographics): number {
    let biasScore = 0.8 // Start with high score (low bias risk)

    // Check for underrepresented groups
    if (demographics.primaryLanguage === 'ar') {
      // Arabic speakers might have less representation in training data
      biasScore -= 0.1
    }

    if (demographics.diagnosisCodes.length > 3) {
      // Complex cases might have bias
      biasScore -= 0.1
    }

    return Math.max(0.2, biasScore)
  }

  private static weightedConfidenceScore(factors: Record<string, number>): number {
    let totalScore = 0
    Object.entries(this.CONFIDENCE_FACTORS).forEach(([factor, weight]) => {
      totalScore += (factors[factor] || 0.5) * weight
    })
    return Math.max(0.1, Math.min(0.99, totalScore))
  }

  private static assessClinicalSafety(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0]
  ): number {
    let safetyScore = 0.8

    // Check session parameters safety
    const duration = recommendation.sessionDuration?.recommended || 60
    const frequency = recommendation.sessionFrequency?.recommended || 2

    // Age-appropriate safety checks
    const ageGroup = studentData.demographics.ageGroup
    if (ageGroup === 'early_intervention' && (duration > 45 || frequency > 3)) {
      safetyScore -= 0.3
    }

    // Diagnosis-specific safety
    const hasSevereConditions = studentData.demographics.diagnosisCodes.some(code => 
      code.startsWith('F84') || code.startsWith('F71') // Autism, intellectual disability
    )
    
    if (hasSevereConditions && frequency > 3) {
      safetyScore -= 0.2 // High frequency might be overwhelming
    }

    return Math.max(0.1, safetyScore)
  }

  private static assessRisk(overallConfidence: number, clinicalSafetyScore: number): 'low' | 'medium' | 'high' {
    const riskScore = (overallConfidence + clinicalSafetyScore) / 2
    
    if (riskScore >= 0.8) return 'low'
    if (riskScore >= 0.6) return 'medium'
    return 'high'
  }

  private static determineRecommendedAction(
    confidence: number,
    safetyScore: number
  ): 'accept' | 'review' | 'reject' {
    if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD && safetyScore >= this.SAFETY_CONFIDENCE_THRESHOLD) {
      return 'accept'
    }
    
    if (confidence >= this.MIN_CONFIDENCE_THRESHOLD && safetyScore >= 0.5) {
      return 'review'
    }
    
    return 'reject'
  }

  private static generateConfidenceExplanation(
    factors: Record<string, number>,
    overallConfidence: number
  ): string {
    const topFactors = Object.entries(factors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([factor, score]) => `${factor}: ${(score * 100).toFixed(1)}%`)

    const confidenceLevel = overallConfidence > 0.8 ? 'High' : 
                           overallConfidence > 0.6 ? 'Medium' : 'Low'

    return `${confidenceLevel} confidence (${(overallConfidence * 100).toFixed(1)}%) based on: ${topFactors.join(', ')}`
  }

  private static identifyRiskFactors(demographics: StudentDemographics): string[] {
    const risks: string[] = []
    
    if (demographics.diagnosisCodes.length > 3) {
      risks.push('Multiple diagnoses')
    }
    
    if (demographics.ageGroup === 'early_intervention') {
      risks.push('Early intervention age group')
    }
    
    // Check for complex diagnosis codes
    const complexCodes = ['F84.0', 'F71', 'F72'] // Autism, moderate/severe ID
    if (demographics.diagnosisCodes.some(code => complexCodes.includes(code))) {
      risks.push('Complex developmental conditions')
    }
    
    return risks
  }

  private static checkExtremeRecommendations(recommendation: TherapyRecommendation): string[] {
    const flags: string[] = []
    
    const duration = recommendation.sessionDuration?.recommended
    const frequency = recommendation.sessionFrequency?.recommended
    
    if (duration && duration > 120) {
      flags.push('Extremely long session duration recommended')
    }
    
    if (frequency && frequency > 5) {
      flags.push('Extremely high session frequency recommended')
    }
    
    if (duration && duration < 20) {
      flags.push('Extremely short session duration recommended')
    }
    
    return flags
  }

  private static calculateCaseComplexity(studentData: MLTrainingData['studentData'][0]): number {
    let complexity = 0
    
    // Multiple diagnoses increase complexity
    complexity += Math.min(0.4, studentData.demographics.diagnosisCodes.length * 0.1)
    
    // Inconsistent outcomes increase complexity
    if (studentData.outcomes.length > 0) {
      const avgAchievement = studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      const variance = studentData.outcomes.reduce((sum, o) => sum + Math.pow(o.achievement - avgAchievement, 2), 0) / studentData.outcomes.length
      complexity += Math.min(0.3, variance)
    }
    
    // Limited assessment data increases complexity
    if (studentData.assessmentHistory.length < 2) {
      complexity += 0.3
    }
    
    return Math.min(1, complexity)
  }
}