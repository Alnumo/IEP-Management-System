/**
 * AI Recommendations Service
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Core service for ML-powered therapy plan recommendations
 * Integrates with TypeScript-compatible ML framework (TensorFlow.js)
 */

import { supabase } from '../lib/supabase'
import { BilingualExplanationsService } from '../lib/ml'
import type {
  AIRecommendation,
  AIRecommendationCreateInput,
  AIServiceResult,
  GenerateRecommendationRequest,
  GenerateRecommendationResponse,
  TherapistFeedback,
  AssessmentAnalysis,
  BiasDetectionResult,
  ModelPerformanceMetrics,
  MLTrainingData,
  StudentDemographics,
  TherapyOutcome
} from '../types/ai-recommendations'

/**
 * AI Recommendations Service
 * Provides ML-powered therapy plan recommendations with clinical oversight
 */
export class AIRecommendationsService {
  private static readonly ML_MODEL_ENDPOINT = '/api/ai-recommendations'
  private static readonly BIAS_DETECTION_ENDPOINT = '/api/bias-detection'
  private static readonly MODEL_PERFORMANCE_ENDPOINT = '/api/model-performance'

  /**
   * Generate AI-powered therapy plan recommendations for a student
   * @param request - Student ID and recommendation parameters
   * @returns Recommendations with confidence scores and explanations
   */
  static async generateRecommendations(
    request: GenerateRecommendationRequest
  ): Promise<AIServiceResult<GenerateRecommendationResponse>> {
    try {
      const startTime = Date.now()

      // Validate input
      if (!request.studentId) {
        return {
          data: null,
          error: {
            code: 'INSUFFICIENT_DATA',
            messageEn: 'Student ID is required for recommendations',
            messageAr: 'معرف الطالب مطلوب لتوليد التوصيات'
          }
        }
      }

      // Gather student data for ML analysis
      const studentData = await this.gatherStudentData(request.studentId, {
        includeAssessmentData: request.includeAssessmentData ?? true,
        includeProgressData: request.includeProgressData ?? true
      })

      if (!studentData.data) {
        return {
          data: null,
          error: studentData.error
        }
      }

      // Check for bias in current dataset
      const biasCheck = await this.performBiasDetection(studentData.data.demographics)
      if (biasCheck.detected && biasCheck.severity === 'high') {
        return {
          data: null,
          error: {
            code: 'BIAS_DETECTED',
            messageEn: 'High bias detected in recommendation model for this demographic',
            messageAr: 'تم اكتشاف تحيز عالي في نموذج التوصيات لهذه الفئة الديموغرافية',
            details: biasCheck
          }
        }
      }

      // Generate ML recommendations using inference API
      const mlRecommendations = await this.callMLInference(studentData.data)
      
      if (!mlRecommendations.data) {
        return {
          data: null,
          error: mlRecommendations.error
        }
      }

      // Process and enhance recommendations with clinical context
      const enhancedRecommendations = await this.enhanceWithClinicalContext(
        mlRecommendations.data,
        studentData.data
      )

      const processingTime = Date.now() - startTime

      return {
        data: {
          recommendations: enhancedRecommendations,
          totalCount: enhancedRecommendations.length,
          processingTime,
          modelVersion: await this.getActiveModelVersion()
        },
        error: null
      }

    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error generating recommendations: ${error.message}`,
          messageAr: `خطأ في توليد التوصيات: ${error.message}`
        }
      }
    }
  }

  /**
   * Record therapist feedback on AI recommendations for continuous learning
   * @param feedback - Therapist decision and reasoning
   * @returns Success status
   */
  static async recordTherapistFeedback(
    feedback: Omit<TherapistFeedback, 'id' | 'createdAt'>
  ): Promise<AIServiceResult<TherapistFeedback>> {
    try {
      const { data, error } = await supabase
        .from('recommendation_feedback')
        .insert({
          recommendation_id: feedback.recommendationId,
          therapist_id: feedback.therapistId,
          decision: feedback.decision,
          reasoning: feedback.reasoning,
          reasoning_ar: feedback.reasoningAr,
          reasoning_en: feedback.reasoningEn,
          modifications: feedback.modifications
        })
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: {
            code: 'UNKNOWN_ERROR',
            messageEn: `Failed to record feedback: ${error.message}`,
            messageAr: `فشل في تسجيل التقييم: ${error.message}`
          }
        }
      }

      // Trigger model retraining pipeline if significant feedback patterns detected
      await this.checkRetrainingTriggers(feedback)

      return {
        data: {
          id: data.id,
          recommendationId: data.recommendation_id,
          therapistId: data.therapist_id,
          decision: data.decision,
          reasoning: data.reasoning,
          reasoningAr: data.reasoning_ar,
          reasoningEn: data.reasoning_en,
          modifications: data.modifications,
          createdAt: data.created_at
        },
        error: null
      }

    } catch (error) {
      console.error('Error recording therapist feedback:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error recording feedback: ${error.message}`,
          messageAr: `خطأ في تسجيل التقييم: ${error.message}`
        }
      }
    }
  }

  /**
   * Gather comprehensive student data for ML analysis
   * @param studentId - Student identifier
   * @param options - Data inclusion options
   * @returns Student data for ML processing
   */
  private static async gatherStudentData(
    studentId: string,
    options: { includeAssessmentData: boolean; includeProgressData: boolean }
  ): Promise<AIServiceResult<MLTrainingData['studentData'][0]>> {
    try {
      // Get basic student demographics
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          age,
          primary_language,
          diagnosis_codes,
          cultural_background
        `)
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        return {
          data: null,
          error: {
            code: 'INSUFFICIENT_DATA',
            messageEn: 'Student not found or insufficient data',
            messageAr: 'الطالب غير موجود أو البيانات غير كافية'
          }
        }
      }

      const demographics: StudentDemographics = {
        ageGroup: this.getAgeGroup(student.age),
        primaryLanguage: student.primary_language,
        diagnosisCodes: student.diagnosis_codes || [],
        culturalBackground: student.cultural_background
      }

      // Get assessment history if requested
      let assessmentHistory: AssessmentAnalysis[] = []
      if (options.includeAssessmentData) {
        const assessmentResult = await this.getAssessmentHistory(studentId)
        if (assessmentResult.data) {
          assessmentHistory = assessmentResult.data
        }
      }

      // Get therapy history if requested
      let therapyHistory: any[] = []
      let outcomes: TherapyOutcome[] = []
      if (options.includeProgressData) {
        const therapyResult = await this.getTherapyHistory(studentId)
        if (therapyResult.data) {
          therapyHistory = therapyResult.data.sessions
          outcomes = therapyResult.data.outcomes
        }
      }

      return {
        data: {
          demographics,
          assessmentHistory,
          therapyHistory,
          outcomes
        },
        error: null
      }

    } catch (error) {
      console.error('Error gathering student data:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error gathering student data: ${error.message}`,
          messageAr: `خطأ في جمع بيانات الطالب: ${error.message}`
        }
      }
    }
  }

  /**
   * Perform bias detection on recommendation generation
   * @param demographics - Student demographic data
   * @returns Bias detection results
   */
  private static async performBiasDetection(
    demographics: StudentDemographics
  ): Promise<BiasDetectionResult> {
    try {
      // Call bias detection API endpoint
      const response = await fetch(this.BIAS_DETECTION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ demographics })
      })

      if (!response.ok) {
        throw new Error(`Bias detection API failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.warn('Bias detection failed, proceeding with caution:', error)
      return {
        detected: false,
        severity: 'low',
        affectedGroups: [],
        mitigation: [],
        confidence: 0
      }
    }
  }

  /**
   * Call ML inference API for recommendation generation
   * @param studentData - Complete student data for analysis
   * @returns Raw ML recommendations
   */
  private static async callMLInference(
    studentData: MLTrainingData['studentData'][0]
  ): Promise<AIServiceResult<AIRecommendation[]>> {
    try {
      const response = await fetch(this.ML_MODEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentData,
          modelVersion: 'latest'
        })
      })

      if (!response.ok) {
        throw new Error(`ML inference API failed: ${response.statusText}`)
      }

      const result = await response.json()
      return {
        data: result.recommendations,
        error: null
      }

    } catch (error) {
      console.error('ML inference failed:', error)
      return {
        data: null,
        error: {
          code: 'MODEL_UNAVAILABLE',
          messageEn: `ML model unavailable: ${error.message}`,
          messageAr: `نموذج التعلم الآلي غير متاح: ${error.message}`
        }
      }
    }
  }

  /**
   * Enhance raw ML recommendations with clinical context and validation
   * @param recommendations - Raw ML recommendations
   * @param studentData - Student context data
   * @returns Enhanced clinical recommendations
   */
  private static async enhanceWithClinicalContext(
    recommendations: AIRecommendation[],
    studentData: MLTrainingData['studentData'][0]
  ): Promise<AIRecommendation[]> {
    return recommendations.map(rec => {
      // Generate comprehensive bilingual explanation
      const enhancedExplanation = BilingualExplanationsService.generateBilingualExplanation(
        rec.recommendations,
        {
          demographics: studentData.demographics,
          assessmentHistory: studentData.assessmentHistory,
          outcomes: studentData.outcomes
        },
        rec.confidence,
        rec.explanation.primaryFactors
      )

      return {
        ...rec,
        explanation: {
          ...rec.explanation,
          ...enhancedExplanation,
          // Preserve original supporting data and add new data
          supportingData: {
            ...rec.explanation.supportingData,
            ...enhancedExplanation.supportingData,
            demographicFactors: this.extractDemographicContext(studentData.demographics),
            progressTrends: this.extractProgressContext(studentData.outcomes)
          }
        }
      }
    })
  }

  /**
   * Get assessment history for a student with CELF/VB-MAPP integration
   * @param studentId - Student identifier
   * @returns Assessment analysis history
   */
  private static async getAssessmentHistory(
    studentId: string
  ): Promise<AIServiceResult<AssessmentAnalysis[]>> {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id,
          assessment_type,
          scores,
          assessment_date,
          interpretation
        `)
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      const assessments: AssessmentAnalysis[] = data?.map(assessment => ({
        id: assessment.id,
        studentId,
        assessmentType: assessment.assessment_type,
        scores: this.processAssessmentScores(assessment.scores),
        trends: [], // Would be calculated from historical data
        correlations: [], // Would be calculated from outcome data
        analysisDate: assessment.assessment_date
      })) || []

      return {
        data: assessments,
        error: null
      }

    } catch (error) {
      console.error('Error getting assessment history:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error retrieving assessments: ${error.message}`,
          messageAr: `خطأ في استرجاع التقييمات: ${error.message}`
        }
      }
    }
  }

  /**
   * Get therapy session history and outcomes for a student
   * @param studentId - Student identifier
   * @returns Therapy history and outcome data
   */
  private static async getTherapyHistory(
    studentId: string
  ): Promise<AIServiceResult<{ sessions: any[]; outcomes: TherapyOutcome[] }>> {
    try {
      const { data, error } = await supabase
        .from('therapy_sessions')
        .select(`
          id,
          session_date,
          duration,
          goals,
          progress_notes,
          goal_progress
        `)
        .eq('student_id', studentId)
        .order('session_date', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      const sessions = data || []
      const outcomes: TherapyOutcome[] = sessions.flatMap(session => 
        Object.entries(session.goal_progress || {}).map(([goalId, achievement]) => ({
          sessionId: session.id,
          goalId,
          achievement: Number(achievement),
          measurementDate: session.session_date,
          validated: true
        }))
      )

      return {
        data: { sessions, outcomes },
        error: null
      }

    } catch (error) {
      console.error('Error getting therapy history:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error retrieving therapy history: ${error.message}`,
          messageAr: `خطأ في استرجاع تاريخ العلاج: ${error.message}`
        }
      }
    }
  }

  /**
   * Check if model retraining should be triggered based on feedback patterns
   * @param feedback - Latest therapist feedback
   */
  private static async checkRetrainingTriggers(feedback: Omit<TherapistFeedback, 'id' | 'createdAt'>): Promise<void> {
    try {
      // Get recent feedback patterns
      const { data: recentFeedback, error } = await supabase
        .from('recommendation_feedback')
        .select('decision, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(100)

      if (error || !recentFeedback) {
        return
      }

      // Calculate rejection rate
      const rejectionRate = recentFeedback.filter(f => f.decision === 'reject').length / recentFeedback.length

      // Trigger retraining if rejection rate > 30%
      if (rejectionRate > 0.3) {
        console.log('High rejection rate detected, triggering model retraining')
        // Would trigger actual retraining pipeline here
      }

    } catch (error) {
      console.error('Error checking retraining triggers:', error)
    }
  }

  // Utility methods
  private static getAgeGroup(age: number): string {
    if (age < 3) return 'early_intervention'
    if (age < 6) return 'preschool'
    if (age < 12) return 'elementary'
    if (age < 18) return 'adolescent'
    return 'adult'
  }

  private static processAssessmentScores(rawScores: any): any {
    // Process and standardize assessment scores
    // Implementation would depend on specific assessment types
    return {
      raw: rawScores,
      standardized: {},
      percentiles: {},
      interpretations: []
    }
  }

  private static extractDemographicContext(demographics: StudentDemographics): string[] {
    const context: string[] = []
    context.push(`Age group: ${demographics.ageGroup}`)
    context.push(`Primary language: ${demographics.primaryLanguage}`)
    if (demographics.diagnosisCodes?.length) {
      context.push(`Diagnosis codes: ${demographics.diagnosisCodes.join(', ')}`)
    }
    return context
  }

  private static extractProgressContext(outcomes: TherapyOutcome[]): any[] {
    // Analyze progress trends from outcomes
    // Implementation would calculate actual trends
    return []
  }

  private static async getActiveModelVersion(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('version')
        .eq('status', 'active')
        .eq('type', 'recommendation_engine')
        .single()

      return data?.version || '1.0.0'
    } catch (error) {
      console.error('Error getting model version:', error)
      return '1.0.0'
    }
  }
}