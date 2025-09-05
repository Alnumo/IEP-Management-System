/**
 * AI Recommendations API Service
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * RESTful API endpoints for AI recommendation system
 * Follows existing service patterns and authentication
 */

import { supabase } from '../lib/supabase'
import { AIRecommendationsService } from './ai-recommendations'
import { AdaptiveLearningService } from '../lib/ml/adaptive-learning'
import { ConfidenceScoring } from '../lib/ml/confidence-scoring'
import { RecommendationEngine } from '../lib/ml/recommendation-engine'
import { MLDataManagementService } from './ml-data-management'
import type {
  AIRecommendation,
  AIRecommendationCreateInput,
  GenerateRecommendationRequest,
  GenerateRecommendationResponse,
  TherapistFeedback,
  AIServiceResult,
  AIServiceError,
  RecommendationType,
  MLTrainingData
} from '../types/ai-recommendations'

/**
 * AI Recommendations API Service
 * Provides RESTful endpoints for AI recommendation management
 */
export class AIRecommendationsAPI {
  private static readonly API_VERSION = 'v1'
  private static readonly RATE_LIMIT_REQUESTS = 100
  private static readonly RATE_LIMIT_WINDOW = 3600000 // 1 hour in ms

  /**
   * Generate AI recommendations for a student
   * POST /api/v1/ai-recommendations/generate
   */
  static async generateRecommendations(
    request: GenerateRecommendationRequest & { userId: string }
  ): Promise<AIServiceResult<GenerateRecommendationResponse>> {
    try {
      // Authentication and authorization check
      const authResult = await this.checkPermissions(request.userId, 'generate_recommendations')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to generate recommendations',
            messageAr: 'صلاحيات غير كافية لتوليد التوصيات'
          }
        }
      }

      // Rate limiting check
      const rateLimitResult = await this.checkRateLimit(request.userId, 'generate')
      if (!rateLimitResult.allowed) {
        return {
          data: null,
          error: {
            code: 'UNKNOWN_ERROR',
            messageEn: `Rate limit exceeded. Try again in ${rateLimitResult.resetTimeMinutes} minutes`,
            messageAr: `تم تجاوز حد المعدل. حاول مرة أخرى خلال ${rateLimitResult.resetTimeMinutes} دقيقة`
          }
        }
      }

      // Generate recommendations using the main service
      const result = await AIRecommendationsService.generateRecommendations(request)
      
      // Log API usage
      await this.logApiUsage({
        userId: request.userId,
        endpoint: 'generate_recommendations',
        studentId: request.studentId,
        success: result.error === null,
        responseTime: Date.now()
      })

      return result

    } catch (error) {
      console.error('API Error generating recommendations:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  /**
   * Get recommendation by ID
   * GET /api/v1/ai-recommendations/:id
   */
  static async getRecommendation(
    recommendationId: string,
    userId: string
  ): Promise<AIServiceResult<AIRecommendation>> {
    try {
      // Check permissions
      const authResult = await this.checkPermissions(userId, 'view_recommendations')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to view recommendations',
            messageAr: 'صلاحيات غير كافية لعرض التوصيات'
          }
        }
      }

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select(`
          id,
          student_id,
          session_id,
          recommendation_type,
          confidence,
          clinical_relevance,
          recommendations,
          explanation,
          status,
          created_at,
          updated_at
        `)
        .eq('id', recommendationId)
        .single()

      if (error) {
        return {
          data: null,
          error: {
            code: 'UNKNOWN_ERROR',
            messageEn: `Failed to fetch recommendation: ${error.message}`,
            messageAr: `فشل في استرجاع التوصية: ${error.message}`
          }
        }
      }

      if (!data) {
        return {
          data: null,
          error: {
            code: 'INSUFFICIENT_DATA',
            messageEn: 'Recommendation not found',
            messageAr: 'التوصية غير موجودة'
          }
        }
      }

      // Transform database response to API format
      const recommendation: AIRecommendation = {
        id: data.id,
        studentId: data.student_id,
        sessionId: data.session_id,
        recommendationType: data.recommendation_type,
        confidence: data.confidence,
        clinicalRelevance: data.clinical_relevance,
        recommendations: data.recommendations,
        explanation: data.explanation,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return {
        data: recommendation,
        error: null
      }

    } catch (error) {
      console.error('API Error fetching recommendation:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  /**
   * List recommendations for a student
   * GET /api/v1/ai-recommendations?studentId=:studentId
   */
  static async listRecommendations(
    params: {
      studentId?: string
      status?: string[]
      type?: RecommendationType[]
      limit?: number
      offset?: number
    },
    userId: string
  ): Promise<AIServiceResult<{
    recommendations: AIRecommendation[]
    totalCount: number
    hasMore: boolean
  }>> {
    try {
      // Check permissions
      const authResult = await this.checkPermissions(userId, 'list_recommendations')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to list recommendations',
            messageAr: 'صلاحيات غير كافية لسرد التوصيات'
          }
        }
      }

      let query = supabase
        .from('ai_recommendations')
        .select(`
          id,
          student_id,
          session_id,
          recommendation_type,
          confidence,
          clinical_relevance,
          recommendations,
          explanation,
          status,
          created_at,
          updated_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (params.studentId) {
        query = query.eq('student_id', params.studentId)
      }

      if (params.status?.length) {
        query = query.in('status', params.status)
      }

      if (params.type?.length) {
        query = query.in('recommendation_type', params.type)
      }

      // Apply pagination
      const limit = Math.min(params.limit || 20, 100) // Cap at 100
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return {
          data: null,
          error: {
            code: 'UNKNOWN_ERROR',
            messageEn: `Failed to list recommendations: ${error.message}`,
            messageAr: `فشل في سرد التوصيات: ${error.message}`
          }
        }
      }

      // Transform database responses to API format
      const recommendations: AIRecommendation[] = (data || []).map(item => ({
        id: item.id,
        studentId: item.student_id,
        sessionId: item.session_id,
        recommendationType: item.recommendation_type,
        confidence: item.confidence,
        clinicalRelevance: item.clinical_relevance,
        recommendations: item.recommendations,
        explanation: item.explanation,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))

      return {
        data: {
          recommendations,
          totalCount: count || 0,
          hasMore: (offset + limit) < (count || 0)
        },
        error: null
      }

    } catch (error) {
      console.error('API Error listing recommendations:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  /**
   * Submit therapist feedback on recommendation
   * POST /api/v1/ai-recommendations/:id/feedback
   */
  static async submitFeedback(
    recommendationId: string,
    feedback: Omit<TherapistFeedback, 'id' | 'recommendationId' | 'createdAt'>,
    userId: string
  ): Promise<AIServiceResult<TherapistFeedback>> {
    try {
      // Check permissions
      const authResult = await this.checkPermissions(userId, 'submit_feedback')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to submit feedback',
            messageAr: 'صلاحيات غير كافية لتقديم التقييم'
          }
        }
      }

      // Submit feedback using the main service
      const feedbackData = {
        ...feedback,
        recommendationId,
        therapistId: userId
      }
      
      const result = await AIRecommendationsService.recordTherapistFeedback(feedbackData)
      
      if (result.data) {
        // Trigger adaptive learning
        await AdaptiveLearningService.learnFromFeedback(result.data)
        
        // Update recommendation status
        await this.updateRecommendationStatus(recommendationId, feedback.decision)
      }

      return result

    } catch (error) {
      console.error('API Error submitting feedback:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  /**
   * Get confidence analysis for recommendation
   * GET /api/v1/ai-recommendations/:id/confidence
   */
  static async getConfidenceAnalysis(
    recommendationId: string,
    userId: string
  ): Promise<AIServiceResult<ReturnType<typeof ConfidenceScoring.calculateConfidenceScore>>> {
    try {
      // Check permissions
      const authResult = await this.checkPermissions(userId, 'view_confidence')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to view confidence analysis',
            messageAr: 'صلاحيات غير كافية لعرض تحليل الثقة'
          }
        }
      }

      // Get recommendation and student data
      const recResult = await this.getRecommendation(recommendationId, userId)
      if (!recResult.data) {
        return {
          data: null,
          error: recResult.error
        }
      }

      // Get student data for confidence calculation
      const studentResult = await this.getStudentDataForConfidence(recResult.data.studentId)
      if (!studentResult.data) {
        return {
          data: null,
          error: studentResult.error
        }
      }

      // Calculate confidence analysis
      const confidenceAnalysis = ConfidenceScoring.calculateConfidenceScore(
        recResult.data.recommendations,
        studentResult.data
      )

      return {
        data: confidenceAnalysis,
        error: null
      }

    } catch (error) {
      console.error('API Error getting confidence analysis:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  /**
   * Trigger adaptive learning update
   * POST /api/v1/ai-recommendations/adaptive-learning
   */
  static async triggerAdaptiveLearning(
    params: {
      studentId: string
      includeOutcomes?: boolean
      includeFeedback?: boolean
    },
    userId: string
  ): Promise<AIServiceResult<{
    learningTriggered: boolean
    adaptationsApplied: number
    insights: string[]
  }>> {
    try {
      // Check admin permissions
      const authResult = await this.checkPermissions(userId, 'trigger_learning')
      if (!authResult.authorized) {
        return {
          data: null,
          error: {
            code: 'PRIVACY_VIOLATION',
            messageEn: 'Insufficient permissions to trigger adaptive learning',
            messageAr: 'صلاحيات غير كافية لتشغيل التعلم التكيفي'
          }
        }
      }

      const insights: string[] = []
      let totalAdaptations = 0

      // Process recent outcomes if requested
      if (params.includeOutcomes) {
        const outcomes = await this.getRecentOutcomes(params.studentId)
        if (outcomes.length > 0) {
          const studentData = await this.getStudentDataForConfidence(params.studentId)
          if (studentData.data) {
            const outcomeResult = await AdaptiveLearningService.processOutcomeData(
              outcomes,
              studentData.data
            )
            if (outcomeResult.data) {
              totalAdaptations += outcomeResult.data.adaptationsApplied
              insights.push(...outcomeResult.data.learningInsights)
            }
          }
        }
      }

      // Trigger progress-based adaptations
      const progressResult = await AdaptiveLearningService.adaptToProgressData(
        params.studentId,
        await this.getRecentOutcomes(params.studentId)
      )
      
      if (progressResult.data) {
        insights.push(`${progressResult.data.adaptiveAdjustments.length} progress-based adaptations identified`)
      }

      return {
        data: {
          learningTriggered: true,
          adaptationsApplied: totalAdaptations,
          insights
        },
        error: null
      }

    } catch (error) {
      console.error('API Error triggering adaptive learning:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `API error: ${error.message}`,
          messageAr: `خطأ في الواجهة البرمجية: ${error.message}`
        }
      }
    }
  }

  // Private helper methods

  private static async checkPermissions(
    userId: string,
    action: string
  ): Promise<{ authorized: boolean; role?: string }> {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (!profile) {
        return { authorized: false }
      }

      // Define permission matrix
      const permissions: Record<string, string[]> = {
        'generate_recommendations': ['admin', 'manager', 'therapist_lead'],
        'view_recommendations': ['admin', 'manager', 'therapist_lead'],
        'list_recommendations': ['admin', 'manager', 'therapist_lead'],
        'submit_feedback': ['admin', 'manager', 'therapist_lead'],
        'view_confidence': ['admin', 'manager', 'therapist_lead'],
        'trigger_learning': ['admin', 'manager'],
        'export_training_data': ['admin']
      }

      const allowedRoles = permissions[action] || []
      return {
        authorized: allowedRoles.includes(profile.role),
        role: profile.role
      }

    } catch (error) {
      console.error('Error checking permissions:', error)
      return { authorized: false }
    }
  }

  private static async checkRateLimit(
    userId: string,
    action: string
  ): Promise<{ allowed: boolean; resetTimeMinutes?: number }> {
    try {
      // Simple rate limiting implementation
      const now = Date.now()
      const windowStart = now - this.RATE_LIMIT_WINDOW

      const { data: requests } = await supabase
        .from('api_usage_log')
        .select('created_at')
        .eq('user_id', userId)
        .eq('action', action)
        .gte('created_at', new Date(windowStart).toISOString())

      const requestCount = requests?.length || 0
      
      if (requestCount >= this.RATE_LIMIT_REQUESTS) {
        const resetTime = Math.ceil((this.RATE_LIMIT_WINDOW - (now - windowStart)) / 60000)
        return { allowed: false, resetTimeMinutes: resetTime }
      }

      return { allowed: true }

    } catch (error) {
      console.error('Error checking rate limit:', error)
      return { allowed: true } // Allow on error
    }
  }

  private static async logApiUsage(params: {
    userId: string
    endpoint: string
    studentId?: string
    success: boolean
    responseTime: number
  }): Promise<void> {
    try {
      await supabase.from('api_usage_log').insert({
        user_id: params.userId,
        endpoint: params.endpoint,
        action: params.endpoint,
        student_id: params.studentId,
        success: params.success,
        response_time_ms: params.responseTime,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error logging API usage:', error)
      // Don't fail the main request on logging error
    }
  }

  private static async updateRecommendationStatus(
    recommendationId: string,
    decision: string
  ): Promise<void> {
    try {
      const statusMap: Record<string, string> = {
        'accept': 'accepted',
        'reject': 'rejected',
        'modify': 'modified'
      }

      await supabase
        .from('ai_recommendations')
        .update({
          status: statusMap[decision] || 'reviewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', recommendationId)

    } catch (error) {
      console.error('Error updating recommendation status:', error)
    }
  }

  private static async getStudentDataForConfidence(
    studentId: string
  ): Promise<AIServiceResult<MLTrainingData['studentData'][0]>> {
    // This would gather comprehensive student data like in ai-recommendations.ts
    // Simplified implementation for now
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (error) {
        throw error
      }

      // Mock student data structure - would be fully implemented
      const studentData: MLTrainingData['studentData'][0] = {
        demographics: {
          ageGroup: student.age < 6 ? 'preschool' : 'elementary',
          primaryLanguage: student.primary_language || 'ar',
          diagnosisCodes: student.diagnosis_codes || [],
          culturalBackground: student.cultural_background
        },
        assessmentHistory: [], // Would populate from assessments
        therapyHistory: [], // Would populate from therapy sessions
        outcomes: await this.getRecentOutcomes(studentId)
      }

      return { data: studentData, error: null }

    } catch (error) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error getting student data: ${error.message}`,
          messageAr: `خطأ في الحصول على بيانات الطالب: ${error.message}`
        }
      }
    }
  }

  private static async getRecentOutcomes(studentId: string): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('therapy_outcomes')
        .select('*')
        .eq('student_id', studentId)
        .order('measurement_date', { ascending: false })
        .limit(20)

      return data || []
    } catch (error) {
      console.error('Error getting recent outcomes:', error)
      return []
    }
  }
}