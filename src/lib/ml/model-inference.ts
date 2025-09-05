/**
 * Model Inference Utilities
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Client-side ML inference utilities using TensorFlow.js
 * Provides recommendation generation and confidence scoring
 */

import type {
  AIRecommendation,
  TherapyRecommendation,
  RecommendationExplanation,
  MLTrainingData,
  StudentDemographics,
  AssessmentAnalysis,
  TherapyOutcome
} from '../../types/ai-recommendations'

// Mock TensorFlow.js types (would be imported from @tensorflow/tfjs in real implementation)
interface TensorflowModel {
  predict(input: any): any
  dispose(): void
}

/**
 * ML Model Inference Service
 * Handles client-side recommendation generation using TensorFlow.js
 */
export class ModelInferenceService {
  private static model: TensorflowModel | null = null
  private static modelVersion: string = '1.0.0'
  private static readonly FEATURE_DIMENSIONS = 50 // Would be determined by training

  /**
   * Load the trained ML model for inference
   * @param modelUrl - URL to the trained model
   * @returns Success status
   */
  static async loadModel(modelUrl?: string): Promise<boolean> {
    try {
      // In real implementation, would use tf.loadLayersModel()
      console.log('Loading ML model from:', modelUrl || 'default model path')
      
      // Mock model loading
      this.model = {
        predict: (input: any) => {
          // Mock prediction returning random but reasonable values
          return {
            confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
            sessionFrequency: Math.random() * 2 + 2, // 2-4 sessions
            sessionDuration: Math.random() * 30 + 45, // 45-75 minutes
            approachScores: [
              Math.random(), Math.random(), Math.random()
            ]
          }
        },
        dispose: () => console.log('Model disposed')
      }
      
      return true
    } catch (error) {
      console.error('Failed to load ML model:', error)
      return false
    }
  }

  /**
   * Generate therapy recommendations using the loaded ML model
   * @param studentData - Complete student data for inference
   * @returns AI-generated therapy recommendations
   */
  static async generateRecommendations(
    studentData: MLTrainingData['studentData'][0]
  ): Promise<AIRecommendation[]> {
    if (!this.model) {
      throw new Error('ML model not loaded. Call loadModel() first.')
    }

    try {
      // Prepare feature vector from student data
      const features = this.prepareFeatureVector(studentData)
      
      // Run inference
      const predictions = this.model.predict(features)
      
      // Convert model output to structured recommendations
      const recommendations = this.interpretPredictions(predictions, studentData)
      
      return recommendations
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw new Error(`Inference failed: ${error.message}`)
    }
  }

  /**
   * Calculate confidence score for a specific recommendation
   * @param recommendation - Therapy recommendation to score
   * @param studentData - Student context data
   * @returns Confidence score between 0-1
   */
  static calculateConfidenceScore(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0]
  ): number {
    let confidence = 0.5 // Base confidence
    
    // Boost confidence based on data quality
    if (studentData.assessmentHistory.length >= 2) {
      confidence += 0.2
    }
    
    if (studentData.outcomes.length >= 5) {
      confidence += 0.2
    }
    
    // Boost confidence for well-represented demographics
    const demographics = studentData.demographics
    if (demographics.primaryLanguage === 'ar' || demographics.primaryLanguage === 'en') {
      confidence += 0.1
    }
    
    // Reduce confidence for complex cases
    if (demographics.diagnosisCodes.length > 2) {
      confidence -= 0.1
    }
    
    // Ensure confidence stays within bounds
    return Math.max(0.1, Math.min(0.99, confidence))
  }

  /**
   * Generate explanation for a recommendation
   * @param recommendation - The therapy recommendation
   * @param studentData - Student context data
   * @param confidence - Calculated confidence score
   * @returns Detailed explanation of the recommendation
   */
  static generateExplanation(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0],
    confidence: number
  ): RecommendationExplanation {
    const primaryFactors = this.identifyPrimaryFactors(studentData)
    const supportingData = this.extractSupportingData(studentData)
    
    return {
      primaryFactors,
      supportingData,
      clinicalEvidence: this.generateClinicalEvidence(recommendation, studentData),
      textAr: this.generateArabicExplanation(recommendation, primaryFactors, confidence),
      textEn: this.generateEnglishExplanation(recommendation, primaryFactors, confidence)
    }
  }

  /**
   * Validate model predictions against clinical guidelines
   * @param recommendations - Generated recommendations
   * @param studentData - Student context
   * @returns Validation results with safety flags
   */
  static validateRecommendations(
    recommendations: AIRecommendation[],
    studentData: MLTrainingData['studentData'][0]
  ): {
    isValid: boolean
    warnings: string[]
    safetyFlags: string[]
  } {
    const warnings: string[] = []
    const safetyFlags: string[] = []
    
    recommendations.forEach(rec => {
      // Validate session frequency
      const frequency = rec.recommendations.sessionFrequency
      if (frequency && frequency.recommended > 5) {
        warnings.push('Unusually high session frequency recommended')
      }
      
      // Validate session duration
      const duration = rec.recommendations.sessionDuration
      if (duration && duration.recommended > 90) {
        warnings.push('Unusually long session duration recommended')
      }
      
      // Safety check for age-appropriate recommendations
      const ageGroup = studentData.demographics.ageGroup
      if (ageGroup === 'early_intervention' && duration && duration.recommended > 45) {
        safetyFlags.push('Session duration may be too long for early intervention age group')
      }
      
      // Check confidence thresholds
      if (rec.confidence < 0.4) {
        safetyFlags.push('Low confidence recommendation - clinical review required')
      }
    })
    
    return {
      isValid: safetyFlags.length === 0,
      warnings,
      safetyFlags
    }
  }

  // Private helper methods

  private static prepareFeatureVector(studentData: MLTrainingData['studentData'][0]): number[] {
    const features: number[] = []
    
    // Demographic features
    const demographics = studentData.demographics
    features.push(
      // Age group encoding
      demographics.ageGroup === 'early_intervention' ? 0.1 :
      demographics.ageGroup === 'preschool' ? 0.3 :
      demographics.ageGroup === 'elementary' ? 0.5 :
      demographics.ageGroup === 'adolescent' ? 0.7 : 0.9,
      
      // Language encoding
      demographics.primaryLanguage === 'ar' ? 0.33 :
      demographics.primaryLanguage === 'en' ? 0.66 : 1.0,
      
      // Diagnosis complexity
      demographics.diagnosisCodes.length / 5 // Normalize to 0-1 scale
    )
    
    // Assessment features (latest assessment)
    if (studentData.assessmentHistory.length > 0) {
      const latestAssessment = studentData.assessmentHistory[0]
      const rawScores = latestAssessment.scores.raw
      
      // Extract key assessment scores (normalized)
      features.push(
        (rawScores.celf_core || 75) / 150, // Normalize CELF to 0-1
        (rawScores.vbmapp_total || 85) / 170, // Normalize VB-MAPP to 0-1
        Object.keys(rawScores).length / 10 // Assessment completeness
      )
    } else {
      features.push(0.5, 0.5, 0) // Default values for missing assessments
    }
    
    // Progress features
    if (studentData.outcomes.length > 0) {
      const avgAchievement = studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      const recentAchievement = studentData.outcomes.slice(0, 5).reduce((sum, o) => sum + o.achievement, 0) / Math.min(5, studentData.outcomes.length)
      
      features.push(
        avgAchievement,
        recentAchievement,
        studentData.outcomes.length / 20 // Session count (normalized)
      )
    } else {
      features.push(0.5, 0.5, 0) // Default values for no outcomes
    }
    
    // Pad or truncate to expected dimensions
    while (features.length < this.FEATURE_DIMENSIONS) {
      features.push(0)
    }
    
    return features.slice(0, this.FEATURE_DIMENSIONS)
  }

  private static interpretPredictions(
    predictions: any,
    studentData: MLTrainingData['studentData'][0]
  ): AIRecommendation[] {
    const recommendation: TherapyRecommendation = {
      sessionFrequency: {
        current: 2, // Would come from current therapy plan
        recommended: Math.round(predictions.sessionFrequency),
        unit: 'weekly'
      },
      sessionDuration: {
        current: 60, // Would come from current therapy plan
        recommended: Math.round(predictions.sessionDuration),
        unit: 'minutes'
      },
      therapeuticApproaches: this.interpretApproaches(predictions.approachScores)
    }
    
    const confidence = this.calculateConfidenceScore(recommendation, studentData)
    const explanation = this.generateExplanation(recommendation, studentData, confidence)
    
    return [{
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: studentData.demographics.ageGroup, // Anonymized
      recommendationType: 'therapy_plan',
      confidence,
      clinicalRelevance: Math.min(0.95, confidence + 0.1),
      recommendations: recommendation,
      explanation,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  }

  private static interpretApproaches(approachScores: number[]): TherapyRecommendation['therapeuticApproaches'] {
    const approaches = [
      { name: 'Speech Sound Production', nameAr: 'إنتاج الأصوات الكلامية' },
      { name: 'Language Comprehension', nameAr: 'فهم اللغة' },
      { name: 'Social Communication', nameAr: 'التواصل الاجتماعي' }
    ]
    
    return approachScores.map((score, index) => ({
      approach: approaches[index]?.name || `Approach ${index + 1}`,
      priority: Math.round(score * 10),
      rationale: `Model confidence: ${(score * 100).toFixed(1)}% based on assessment data and progress patterns`
    }))
  }

  private static identifyPrimaryFactors(studentData: MLTrainingData['studentData'][0]): string[] {
    const factors: string[] = []
    
    // Assessment-based factors
    if (studentData.assessmentHistory.length > 0) {
      factors.push('Recent assessment results')
    }
    
    // Progress-based factors
    if (studentData.outcomes.length > 0) {
      const avgAchievement = studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      if (avgAchievement > 0.7) {
        factors.push('Strong therapy progress')
      } else if (avgAchievement < 0.4) {
        factors.push('Slower therapy progress')
      }
    }
    
    // Demographic factors
    if (studentData.demographics.primaryLanguage === 'bilingual') {
      factors.push('Bilingual language profile')
    }
    
    return factors
  }

  private static extractSupportingData(studentData: MLTrainingData['studentData'][0]): RecommendationExplanation['supportingData'] {
    const supportingData: RecommendationExplanation['supportingData'] = {}
    
    // Assessment scores
    if (studentData.assessmentHistory.length > 0) {
      const latest = studentData.assessmentHistory[0]
      supportingData.assessmentScores = latest.scores.raw
    }
    
    // Progress trends
    if (studentData.outcomes.length >= 3) {
      const recent = studentData.outcomes.slice(0, 5)
      const older = studentData.outcomes.slice(-5)
      
      const recentAvg = recent.reduce((sum, o) => sum + o.achievement, 0) / recent.length
      const olderAvg = older.reduce((sum, o) => sum + o.achievement, 0) / older.length
      
      supportingData.progressTrends = [{
        metric: 'Overall Achievement',
        trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
        significance: Math.abs(recentAvg - olderAvg)
      }]
    }
    
    return supportingData
  }

  private static generateClinicalEvidence(
    recommendation: TherapyRecommendation,
    studentData: MLTrainingData['studentData'][0]
  ): string {
    const evidence: string[] = []
    
    // Evidence based on age group
    const ageGroup = studentData.demographics.ageGroup
    if (ageGroup === 'early_intervention') {
      evidence.push('Early intervention research supports intensive, short-duration sessions')
    } else if (ageGroup === 'elementary') {
      evidence.push('School-age children benefit from structured, goal-oriented therapy sessions')
    }
    
    // Evidence based on diagnosis
    const diagnoses = studentData.demographics.diagnosisCodes
    if (diagnoses.includes('F80.0')) {
      evidence.push('Speech sound disorders respond well to targeted phonological intervention')
    }
    
    return evidence.join('. ')
  }

  private static generateArabicExplanation(
    recommendation: TherapyRecommendation,
    factors: string[],
    confidence: number
  ): string {
    const confidenceText = confidence > 0.8 ? 'عالية الثقة' : confidence > 0.6 ? 'متوسطة الثقة' : 'منخفضة الثقة'
    
    return `توصية ${confidenceText} بناءً على: ${factors.join('، ')}. ` +
           `يُنصح بـ ${recommendation.sessionFrequency?.recommended} جلسات أسبوعياً ` +
           `لمدة ${recommendation.sessionDuration?.recommended} دقيقة لكل جلسة.`
  }

  private static generateEnglishExplanation(
    recommendation: TherapyRecommendation,
    factors: string[],
    confidence: number
  ): string {
    const confidenceText = confidence > 0.8 ? 'High confidence' : confidence > 0.6 ? 'Medium confidence' : 'Low confidence'
    
    return `${confidenceText} recommendation based on: ${factors.join(', ')}. ` +
           `Recommends ${recommendation.sessionFrequency?.recommended} sessions per week ` +
           `for ${recommendation.sessionDuration?.recommended} minutes each.`
  }
}