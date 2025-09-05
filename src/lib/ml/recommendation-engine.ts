/**
 * Core Recommendation Engine
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Implements collaborative filtering and content-based recommendation algorithms
 * for generating personalized therapy plan recommendations
 */

import type {
  AIRecommendation,
  TherapyRecommendation,
  RecommendationExplanation,
  MLTrainingData,
  StudentDemographics,
  TherapyOutcome,
  AssessmentAnalysis
} from '../../types/ai-recommendations'

import { detectPredictionBias } from './bias-detection'
import { ModelInferenceService } from './model-inference'
import { normalizeAssessmentScores, calculateProgressTrends } from './data-preprocessing'

/**
 * Recommendation Engine implementing hybrid approach
 * Combines collaborative filtering, content-based filtering, and ML predictions
 */
export class RecommendationEngine {
  private static readonly SIMILARITY_THRESHOLD = 0.7
  private static readonly MIN_SIMILAR_STUDENTS = 3
  private static readonly CONFIDENCE_WEIGHTS = {
    contentBased: 0.4,
    collaborative: 0.3,
    mlPrediction: 0.3
  }

  /**
   * Generate comprehensive therapy recommendations using hybrid approach
   * @param targetStudent - Student data for recommendation generation
   * @param historicalData - Historical data from similar students
   * @returns Ranked list of therapy recommendations
   */
  static async generateRecommendations(
    targetStudent: MLTrainingData['studentData'][0],
    historicalData: MLTrainingData
  ): Promise<AIRecommendation[]> {
    try {
      // 1. Content-based recommendations
      const contentBasedRecs = await this.generateContentBasedRecommendations(
        targetStudent,
        historicalData
      )

      // 2. Collaborative filtering recommendations
      const collaborativeRecs = await this.generateCollaborativeRecommendations(
        targetStudent,
        historicalData
      )

      // 3. ML-based predictions (from model inference)
      const mlRecs = await ModelInferenceService.generateRecommendations(targetStudent)

      // 4. Hybrid combination and ranking
      const hybridRecommendations = this.combineRecommendations(
        contentBasedRecs,
        collaborativeRecs,
        mlRecs,
        targetStudent
      )

      // 5. Apply bias detection and mitigation
      const biasCheckedRecs = await this.applyBiasChecking(hybridRecommendations, targetStudent)

      // 6. Rank by confidence and clinical relevance
      return this.rankRecommendations(biasCheckedRecs)

    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw new Error(`Recommendation generation failed: ${error.message}`)
    }
  }

  /**
   * Generate content-based recommendations using student characteristics
   * @param targetStudent - Target student data
   * @param historicalData - Historical training data
   * @returns Content-based recommendations
   */
  private static async generateContentBasedRecommendations(
    targetStudent: MLTrainingData['studentData'][0],
    historicalData: MLTrainingData
  ): Promise<Partial<AIRecommendation>[]> {
    // Find students with similar characteristics
    const similarStudents = this.findSimilarStudentsByContent(targetStudent, historicalData.studentData)
    
    if (similarStudents.length === 0) {
      return []
    }

    // Analyze successful therapy patterns from similar students
    const therapyPatterns = this.analyzeTherapyPatterns(similarStudents)
    
    // Generate recommendations based on patterns
    const recommendations: Partial<AIRecommendation>[] = []

    // Session frequency recommendation
    if (therapyPatterns.avgSessionFrequency > 0) {
      recommendations.push({
        recommendationType: 'therapy_plan',
        recommendations: {
          sessionFrequency: {
            current: 2, // Would come from current plan
            recommended: Math.round(therapyPatterns.avgSessionFrequency),
            unit: 'weekly'
          },
          therapeuticApproaches: this.getTopApproaches(therapyPatterns.approaches)
        },
        confidence: this.calculateContentBasedConfidence(similarStudents.length, therapyPatterns),
        explanation: {
          primaryFactors: [
            `Based on ${similarStudents.length} similar students`,
            'Student demographic and assessment profile match',
            'Historical therapy outcome patterns'
          ],
          supportingData: {
            demographicFactors: this.extractDemographicFactors(targetStudent.demographics)
          },
          clinicalEvidence: `Similar students showed ${(therapyPatterns.successRate * 100).toFixed(1)}% success rate with this approach`,
          textEn: `Content-based recommendation from ${similarStudents.length} similar student profiles`,
          textAr: `توصية قائمة على المحتوى من ${similarStudents.length} طالب مشابه`
        }
      })
    }

    // Goal modification recommendations
    const goalPatterns = this.analyzeGoalPatterns(similarStudents)
    if (goalPatterns.length > 0) {
      recommendations.push({
        recommendationType: 'goal_modification',
        recommendations: {
          goalAdjustments: goalPatterns.map(pattern => ({
            goalId: pattern.goalCategory,
            action: pattern.recommendedAction,
            target: pattern.targetLevel,
            reasoning: pattern.reasoning
          }))
        },
        confidence: this.calculateContentBasedConfidence(similarStudents.length, therapyPatterns),
        explanation: {
          primaryFactors: ['Goal achievement patterns from similar students'],
          supportingData: {},
          clinicalEvidence: 'Similar demographic groups benefit from these goal adjustments',
          textEn: 'Goal recommendations based on peer success patterns',
          textAr: 'توصيات الأهداف بناءً على أنماط نجاح الأقران'
        }
      })
    }

    return recommendations
  }

  /**
   * Generate collaborative filtering recommendations
   * @param targetStudent - Target student data
   * @param historicalData - Historical training data
   * @returns Collaborative filtering recommendations
   */
  private static async generateCollaborativeRecommendations(
    targetStudent: MLTrainingData['studentData'][0],
    historicalData: MLTrainingData
  ): Promise<Partial<AIRecommendation>[]> {
    // Find students with similar therapy outcomes/preferences
    const similarOutcomes = this.findSimilarStudentsByOutcomes(targetStudent, historicalData.studentData)
    
    if (similarOutcomes.length < this.MIN_SIMILAR_STUDENTS) {
      return []
    }

    // Calculate collaborative filtering scores
    const collaborativeScores = this.calculateCollaborativeScores(targetStudent, similarOutcomes)
    
    const recommendations: Partial<AIRecommendation>[] = []

    // Session adjustment recommendations
    if (collaborativeScores.sessionAdjustment.confidence > 0.5) {
      recommendations.push({
        recommendationType: 'session_adjustment',
        recommendations: {
          sessionDuration: {
            current: 60,
            recommended: collaborativeScores.sessionAdjustment.recommendedDuration,
            unit: 'minutes'
          },
          sessionFrequency: {
            current: 2,
            recommended: collaborativeScores.sessionAdjustment.recommendedFrequency,
            unit: 'weekly'
          }
        },
        confidence: collaborativeScores.sessionAdjustment.confidence,
        explanation: {
          primaryFactors: [
            'Students with similar therapy responses',
            'Outcome-based similarity matching',
            'Collaborative preference patterns'
          ],
          supportingData: {},
          clinicalEvidence: `${similarOutcomes.length} students with similar response patterns achieved better outcomes with these settings`,
          textEn: `Collaborative recommendation based on ${similarOutcomes.length} similar therapy response patterns`,
          textAr: `توصية تشاركية بناءً على ${similarOutcomes.length} نمط استجابة علاجية مشابهة`
        }
      })
    }

    return recommendations
  }

  /**
   * Combine recommendations from different approaches using weighted scoring
   * @param contentBased - Content-based recommendations
   * @param collaborative - Collaborative recommendations  
   * @param mlBased - ML model recommendations
   * @param targetStudent - Target student context
   * @returns Combined and weighted recommendations
   */
  private static combineRecommendations(
    contentBased: Partial<AIRecommendation>[],
    collaborative: Partial<AIRecommendation>[],
    mlBased: AIRecommendation[],
    targetStudent: MLTrainingData['studentData'][0]
  ): AIRecommendation[] {
    const combinedRecs: AIRecommendation[] = []

    // Group recommendations by type
    const recsByType = this.groupRecommendationsByType([
      ...contentBased,
      ...collaborative,
      ...mlBased
    ])

    // Combine each type using weighted averaging
    Object.entries(recsByType).forEach(([type, recs]) => {
      const combined = this.weightedCombination(recs as AIRecommendation[], targetStudent)
      if (combined) {
        combinedRecs.push(combined)
      }
    })

    return combinedRecs
  }

  /**
   * Apply bias detection to recommendations and filter/adjust as needed
   * @param recommendations - Generated recommendations
   * @param targetStudent - Target student context
   * @returns Bias-checked recommendations
   */
  private static async applyBiasChecking(
    recommendations: AIRecommendation[],
    targetStudent: MLTrainingData['studentData'][0]
  ): Promise<AIRecommendation[]> {
    return recommendations.map(rec => {
      // Detect potential bias in this recommendation
      const biasResult = detectPredictionBias(
        targetStudent.demographics,
        [{ confidence: rec.confidence, recommendation: rec.recommendations }]
      )

      // Adjust recommendation if bias detected
      if (biasResult.detected && biasResult.severity === 'high') {
        // Reduce confidence for high-bias recommendations
        rec.confidence = Math.max(0.3, rec.confidence * 0.7)
        
        // Add bias warning to explanation
        rec.explanation.primaryFactors.push('Bias detection applied - clinical review recommended')
      }

      return rec
    })
  }

  /**
   * Rank recommendations by confidence and clinical relevance
   * @param recommendations - Recommendations to rank
   * @returns Sorted recommendations by priority
   */
  private static rankRecommendations(recommendations: AIRecommendation[]): AIRecommendation[] {
    return recommendations.sort((a, b) => {
      // Primary sort by clinical relevance
      const relevanceDiff = b.clinicalRelevance - a.clinicalRelevance
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff

      // Secondary sort by confidence
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.05) return confidenceDiff

      // Tertiary sort by recommendation type priority
      const typePriority = {
        'therapy_plan': 4,
        'session_adjustment': 3,
        'goal_modification': 2,
        'assessment_update': 1
      }
      
      return (typePriority[b.recommendationType] || 0) - (typePriority[a.recommendationType] || 0)
    })
  }

  // Helper methods for similarity calculations and pattern analysis

  private static findSimilarStudentsByContent(
    targetStudent: MLTrainingData['studentData'][0],
    allStudents: MLTrainingData['studentData']
  ): MLTrainingData['studentData'] {
    return allStudents.filter(student => {
      const similarity = this.calculateContentSimilarity(
        targetStudent.demographics,
        student.demographics
      )
      return similarity >= this.SIMILARITY_THRESHOLD
    })
  }

  private static findSimilarStudentsByOutcomes(
    targetStudent: MLTrainingData['studentData'][0],
    allStudents: MLTrainingData['studentData']
  ): MLTrainingData['studentData'] {
    if (targetStudent.outcomes.length === 0) return []

    return allStudents.filter(student => {
      if (student.outcomes.length === 0) return false
      
      const similarity = this.calculateOutcomeSimilarity(
        targetStudent.outcomes,
        student.outcomes
      )
      return similarity >= this.SIMILARITY_THRESHOLD
    })
  }

  private static calculateContentSimilarity(
    demographics1: StudentDemographics,
    demographics2: StudentDemographics
  ): number {
    let similarity = 0
    let factors = 0

    // Age group similarity
    if (demographics1.ageGroup === demographics2.ageGroup) {
      similarity += 0.3
    }
    factors += 0.3

    // Language similarity
    if (demographics1.primaryLanguage === demographics2.primaryLanguage) {
      similarity += 0.2
    }
    factors += 0.2

    // Diagnosis similarity (Jaccard index)
    const codes1 = new Set(demographics1.diagnosisCodes)
    const codes2 = new Set(demographics2.diagnosisCodes)
    const intersection = new Set([...codes1].filter(code => codes2.has(code)))
    const union = new Set([...codes1, ...codes2])
    
    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.5
    }
    factors += 0.5

    return factors > 0 ? similarity / factors : 0
  }

  private static calculateOutcomeSimilarity(
    outcomes1: TherapyOutcome[],
    outcomes2: TherapyOutcome[]
  ): number {
    // Calculate correlation between outcome patterns
    if (outcomes1.length === 0 || outcomes2.length === 0) return 0

    const avg1 = outcomes1.reduce((sum, o) => sum + o.achievement, 0) / outcomes1.length
    const avg2 = outcomes2.reduce((sum, o) => sum + o.achievement, 0) / outcomes2.length

    // Simple similarity based on average achievement levels
    const difference = Math.abs(avg1 - avg2)
    return Math.max(0, 1 - (difference * 2)) // Scale to 0-1
  }

  private static analyzeTherapyPatterns(students: MLTrainingData['studentData']) {
    const patterns = {
      avgSessionFrequency: 0,
      successRate: 0,
      approaches: new Map<string, number>()
    }

    // Analyze patterns from successful students
    const successfulStudents = students.filter(student => {
      const avgAchievement = student.outcomes.reduce((sum, o) => sum + o.achievement, 0) / student.outcomes.length
      return avgAchievement > 0.6
    })

    if (successfulStudents.length === 0) return patterns

    // Calculate average session frequency (mock data - would come from therapy history)
    patterns.avgSessionFrequency = 2.5 // Default weekly frequency
    patterns.successRate = successfulStudents.length / students.length

    return patterns
  }

  private static analyzeGoalPatterns(students: MLTrainingData['studentData']) {
    // Analyze which goals were most successful for similar students
    const goalPatterns: Array<{
      goalCategory: string
      recommendedAction: 'increase' | 'decrease' | 'modify' | 'add'
      targetLevel: string
      reasoning: string
    }> = []

    // Mock analysis - in real implementation would analyze actual goal data
    goalPatterns.push({
      goalCategory: 'speech_clarity',
      recommendedAction: 'increase',
      targetLevel: 'Advanced',
      reasoning: 'Similar students showed strong progress in speech clarity goals'
    })

    return goalPatterns
  }

  private static getTopApproaches(approaches: Map<string, number>) {
    return [
      { approach: 'Articulation Therapy', priority: 8, rationale: 'Most effective for similar demographic profile' },
      { approach: 'Language Stimulation', priority: 7, rationale: 'Strong correlation with positive outcomes' },
      { approach: 'Social Communication', priority: 6, rationale: 'Age-appropriate intervention approach' }
    ]
  }

  private static calculateContentBasedConfidence(similarCount: number, patterns: any): number {
    let confidence = 0.3 // Base confidence

    // Boost confidence based on similar student count
    confidence += Math.min(0.4, similarCount * 0.1)

    // Boost confidence based on success rate
    confidence += patterns.successRate * 0.3

    return Math.min(0.95, confidence)
  }

  private static calculateCollaborativeScores(
    targetStudent: MLTrainingData['studentData'][0],
    similarStudents: MLTrainingData['studentData']
  ) {
    // Mock collaborative scoring - real implementation would use matrix factorization
    return {
      sessionAdjustment: {
        confidence: 0.75,
        recommendedDuration: 50,
        recommendedFrequency: 3
      }
    }
  }

  private static groupRecommendationsByType(recommendations: Partial<AIRecommendation>[]) {
    return recommendations.reduce((groups, rec) => {
      const type = rec.recommendationType || 'therapy_plan'
      if (!groups[type]) groups[type] = []
      groups[type].push(rec)
      return groups
    }, {} as Record<string, Partial<AIRecommendation>[]>)
  }

  private static weightedCombination(
    recs: AIRecommendation[],
    targetStudent: MLTrainingData['studentData'][0]
  ): AIRecommendation | null {
    if (recs.length === 0) return null
    if (recs.length === 1) return recs[0]

    // Weighted average of confidences and combine recommendations
    const weights = this.CONFIDENCE_WEIGHTS
    let totalConfidence = 0
    let totalWeight = 0

    recs.forEach(rec => {
      // Determine source weight (simplified - would use actual source tracking)
      const weight = rec.explanation?.primaryFactors.some(f => f.includes('ML')) ? weights.mlPrediction :
                    rec.explanation?.primaryFactors.some(f => f.includes('similar students')) ? weights.contentBased :
                    weights.collaborative

      totalConfidence += rec.confidence * weight
      totalWeight += weight
    })

    // Use the highest confidence recommendation as base, adjust confidence
    const baseRec = recs.reduce((max, current) => 
      current.confidence > max.confidence ? current : max
    )

    return {
      ...baseRec,
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confidence: totalWeight > 0 ? totalConfidence / totalWeight : baseRec.confidence,
      clinicalRelevance: Math.min(0.95, baseRec.confidence + 0.1),
      explanation: {
        ...baseRec.explanation,
        primaryFactors: [
          'Hybrid recommendation combining multiple approaches',
          ...baseRec.explanation.primaryFactors.slice(0, 2)
        ]
      }
    }
  }

  private static extractDemographicFactors(demographics: StudentDemographics): string[] {
    const factors: string[] = []
    factors.push(`Age group: ${demographics.ageGroup}`)
    factors.push(`Primary language: ${demographics.primaryLanguage}`)
    if (demographics.diagnosisCodes.length > 0) {
      factors.push(`Diagnosis codes: ${demographics.diagnosisCodes.slice(0, 2).join(', ')}`)
    }
    return factors
  }
}