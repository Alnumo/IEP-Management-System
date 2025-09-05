import { supabase } from '@/lib/supabase'

export interface PredictionRequest {
  studentId: string
  predictionType: 'therapy_outcome' | 'risk_assessment' | 'goal_timeline'
  useCached?: boolean
  parameters?: Record<string, any>
}

export interface PredictionResult {
  predictionId: string
  studentId: string
  predictionType: string
  predictionValue: any
  confidenceInterval: {
    lower: number
    upper: number
  }
  riskFactors?: string[]
  clinicalExplanations: {
    ar: string
    en: string
  }
  modelVersion: string
  createdAt: string
  expiresAt: string
  cached?: boolean
}

export interface BatchPredictionRequest {
  studentIds: string[]
  predictionType: 'therapy_outcome' | 'risk_assessment' | 'goal_timeline'
  parameters?: Record<string, any>
}

export interface RealTimePredictionUpdate {
  predictionId: string
  studentId: string
  updateType: 'new_data' | 'model_retrain' | 'validation_feedback'
  newPrediction?: PredictionResult
}

export class PredictiveAnalyticsService {
  /**
   * Request single prediction for a student
   */
  static async requestPrediction(request: PredictionRequest): Promise<PredictionResult> {
    try {
      console.log(`Requesting ${request.predictionType} prediction for student ${request.studentId}`)

      const { data, error } = await supabase.functions.invoke('predictive-analytics', {
        body: {
          student_id: request.studentId,
          prediction_type: request.predictionType,
          use_cached: request.useCached ?? true,
          parameters: request.parameters
        }
      })

      if (error) {
        throw new Error(`Prediction request failed: ${error.message}`)
      }

      return this.formatPredictionResult(data)
    } catch (error) {
      console.error('Error requesting prediction:', error)
      throw new Error(`Failed to request prediction: ${error}`)
    }
  }

  /**
   * Request batch predictions for multiple students
   */
  static async requestBatchPredictions(request: BatchPredictionRequest): Promise<PredictionResult[]> {
    try {
      if (request.studentIds.length === 0) {
        return []
      }

      if (request.studentIds.length > 50) {
        throw new Error('Batch size too large. Maximum 50 students per batch.')
      }

      console.log(`Requesting batch ${request.predictionType} predictions for ${request.studentIds.length} students`)

      const { data, error } = await supabase.functions.invoke('predictive-analytics', {
        body: {
          endpoint: 'batch',
          student_ids: request.studentIds.join(','),
          prediction_type: request.predictionType,
          parameters: request.parameters
        }
      })

      if (error) {
        throw new Error(`Batch prediction request failed: ${error.message}`)
      }

      return (data.predictions || []).map((pred: any) => 
        pred.error ? pred : this.formatPredictionResult(pred)
      )
    } catch (error) {
      console.error('Error requesting batch predictions:', error)
      throw new Error(`Failed to request batch predictions: ${error}`)
    }
  }

  /**
   * Get existing predictions for a student
   */
  static async getStudentPredictions(studentId: string, limit: number = 10): Promise<PredictionResult[]> {
    try {
      const { data, error } = await supabase
        .from('predictive_analytics')
        .select('*')
        .eq('student_id', studentId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (data || []).map(pred => this.formatPredictionResult(pred))
    } catch (error) {
      console.error('Error getting student predictions:', error)
      throw new Error(`Failed to retrieve student predictions: ${error}`)
    }
  }

  /**
   * Get predictions by type across students
   */
  static async getPredictionsByType(
    predictionType: 'therapy_outcome' | 'risk_assessment' | 'goal_timeline',
    filters: {
      studentIds?: string[]
      dateRange?: { start: Date; end: Date }
      riskLevel?: 'low' | 'medium' | 'high' | 'critical'
      includeExpired?: boolean
    } = {}
  ): Promise<PredictionResult[]> {
    try {
      let query = supabase
        .from('predictive_analytics')
        .select('*')
        .eq('prediction_type', predictionType)

      if (filters.studentIds && filters.studentIds.length > 0) {
        query = query.in('student_id', filters.studentIds)
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString())
      }

      if (!filters.includeExpired) {
        query = query.gt('expires_at', new Date().toISOString())
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      let results = (data || []).map(pred => this.formatPredictionResult(pred))

      // Apply risk level filter for risk assessments
      if (predictionType === 'risk_assessment' && filters.riskLevel) {
        results = results.filter(pred => {
          const riskScore = pred.predictionValue?.dropout_risk || 0
          const level = this.determineRiskLevel(riskScore)
          return level === filters.riskLevel
        })
      }

      return results
    } catch (error) {
      console.error('Error getting predictions by type:', error)
      throw new Error(`Failed to retrieve predictions: ${error}`)
    }
  }

  /**
   * Subscribe to real-time prediction updates
   */
  static subscribeToUpdates(
    callback: (update: RealTimePredictionUpdate) => void,
    filters: {
      studentIds?: string[]
      predictionTypes?: string[]
    } = {}
  ) {
    try {
      let channel = supabase.channel('predictive_analytics_updates')

      // Subscribe to prediction inserts and updates
      channel = channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'predictive_analytics',
            filter: filters.studentIds ? `student_id=in.(${filters.studentIds.join(',')})` : undefined
          },
          (payload) => {
            const prediction = this.formatPredictionResult(payload.new)
            callback({
              predictionId: prediction.predictionId,
              studentId: prediction.studentId,
              updateType: 'new_data',
              newPrediction: prediction
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'predictive_analytics',
            filter: filters.studentIds ? `student_id=in.(${filters.studentIds.join(',')})` : undefined
          },
          (payload) => {
            const prediction = this.formatPredictionResult(payload.new)
            callback({
              predictionId: prediction.predictionId,
              studentId: prediction.studentId,
              updateType: 'model_retrain',
              newPrediction: prediction
            })
          }
        )

      channel.subscribe((status) => {
        console.log('Predictive analytics subscription status:', status)
      })

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('Error subscribing to prediction updates:', error)
      throw new Error(`Failed to subscribe to updates: ${error}`)
    }
  }

  /**
   * Validate prediction accuracy (for feedback loop)
   */
  static async validatePrediction(
    predictionId: string,
    actualOutcome: any,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prediction_accuracy')
        .insert({
          prediction_id: predictionId,
          prediction_table: 'predictive_analytics',
          actual_outcome: actualOutcome,
          validation_date: new Date().toISOString(),
          notes
        })

      if (error) {
        throw error
      }

      console.log(`Prediction ${predictionId} validated successfully`)
    } catch (error) {
      console.error('Error validating prediction:', error)
      throw new Error(`Failed to validate prediction: ${error}`)
    }
  }

  /**
   * Get prediction analytics and metrics
   */
  static async getPredictionAnalytics(
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    totalPredictions: number
    predictionsByType: Record<string, number>
    averageAccuracy: number
    trendsData: Array<{ date: string; count: number; type: string }>
    topRiskFactors: Array<{ factor: string; frequency: number }>
  }> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Get predictions summary
      const { data: predictions } = await supabase
        .from('predictive_analytics')
        .select('prediction_type, risk_factors, created_at')
        .gte('created_at', startDate.toISOString())

      const totalPredictions = predictions?.length || 0

      // Count by type
      const predictionsByType: Record<string, number> = {}
      predictions?.forEach(pred => {
        predictionsByType[pred.prediction_type] = (predictionsByType[pred.prediction_type] || 0) + 1
      })

      // Get accuracy from validation data
      const { data: validations } = await supabase
        .from('prediction_accuracy')
        .select('accuracy_score')
        .eq('prediction_table', 'predictive_analytics')
        .gte('validation_date', startDate.toISOString())

      const averageAccuracy = validations && validations.length > 0
        ? validations.reduce((sum, v) => sum + (v.accuracy_score || 0), 0) / validations.length
        : 0

      // Generate trends data (simplified)
      const trendsData = this.generateTrendsData(predictions || [], days)

      // Extract top risk factors
      const topRiskFactors = this.extractTopRiskFactors(predictions || [])

      return {
        totalPredictions,
        predictionsByType,
        averageAccuracy,
        trendsData,
        topRiskFactors
      }
    } catch (error) {
      console.error('Error getting prediction analytics:', error)
      throw new Error(`Failed to retrieve analytics: ${error}`)
    }
  }

  /**
   * Cache management - clear expired predictions
   */
  static async clearExpiredPredictions(): Promise<{ deletedCount: number }> {
    try {
      const { data, error } = await supabase
        .from('predictive_analytics')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        throw error
      }

      const deletedCount = data?.length || 0
      console.log(`Cleared ${deletedCount} expired predictions`)

      return { deletedCount }
    } catch (error) {
      console.error('Error clearing expired predictions:', error)
      throw new Error(`Failed to clear expired predictions: ${error}`)
    }
  }

  /**
   * Format raw prediction data into standardized result
   */
  private static formatPredictionResult(rawData: any): PredictionResult {
    return {
      predictionId: rawData.prediction_id || rawData.id,
      studentId: rawData.student_id,
      predictionType: rawData.prediction_type,
      predictionValue: rawData.prediction_value,
      confidenceInterval: rawData.confidence_interval,
      riskFactors: rawData.risk_factors,
      clinicalExplanations: rawData.clinical_explanations,
      modelVersion: rawData.model_version,
      createdAt: rawData.created_at,
      expiresAt: rawData.expires_at,
      cached: rawData.cached
    }
  }

  /**
   * Determine risk level from risk score
   */
  private static determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.8) return 'critical'
    if (riskScore >= 0.6) return 'high'
    if (riskScore >= 0.4) return 'medium'
    return 'low'
  }

  /**
   * Generate trends data for analytics
   */
  private static generateTrendsData(
    predictions: any[], 
    days: number
  ): Array<{ date: string; count: number; type: string }> {
    const trendsData: Array<{ date: string; count: number; type: string }> = []
    const dailyCounts: Record<string, Record<string, number>> = {}

    // Initialize daily counts
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      dailyCounts[dateKey] = {}
    }

    // Count predictions by date and type
    predictions.forEach(pred => {
      const date = new Date(pred.created_at).toISOString().split('T')[0]
      if (dailyCounts[date]) {
        dailyCounts[date][pred.prediction_type] = (dailyCounts[date][pred.prediction_type] || 0) + 1
      }
    })

    // Convert to array format
    Object.entries(dailyCounts).forEach(([date, counts]) => {
      Object.entries(counts).forEach(([type, count]) => {
        trendsData.push({ date, type, count })
      })
    })

    return trendsData.sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Extract top risk factors from predictions
   */
  private static extractTopRiskFactors(
    predictions: any[]
  ): Array<{ factor: string; frequency: number }> {
    const factorCounts: Record<string, number> = {}

    predictions.forEach(pred => {
      if (pred.risk_factors && Array.isArray(pred.risk_factors)) {
        pred.risk_factors.forEach((factor: string) => {
          factorCounts[factor] = (factorCounts[factor] || 0) + 1
        })
      }
    })

    return Object.entries(factorCounts)
      .map(([factor, frequency]) => ({ factor, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Top 10 risk factors
  }
}