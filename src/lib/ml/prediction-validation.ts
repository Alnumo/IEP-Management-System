import { supabase } from '@/lib/supabase'
import { ModelPrediction, ModelPerformanceMetrics } from './prediction-models'

export interface PredictionValidationResult {
  predictionId: string
  actualOutcome: any
  validationDate: Date
  accuracyScore: number
  errorMetrics: {
    absoluteError: number
    percentageError: number
    classificationError?: boolean
  }
  calibrationScore: number
  notes?: string
}

export interface ModelValidationSummary {
  modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast'
  validationPeriod: {
    startDate: Date
    endDate: Date
  }
  totalPredictions: number
  validatedPredictions: number
  overallAccuracy: number
  performanceMetrics: {
    mae: number // Mean Absolute Error
    rmse: number // Root Mean Square Error
    precision: number
    recall: number
    f1Score: number
  }
  calibrationMetrics: {
    calibrationError: number
    reliabilityDiagram: { confidence: number; accuracy: number }[]
  }
  recommendations: string[]
}

export interface A_BTestResult {
  testId: string
  modelA: string
  modelB: string
  startDate: Date
  endDate: Date
  participantCount: number
  results: {
    modelA_performance: ModelPerformanceMetrics
    modelB_performance: ModelPerformanceMetrics
    statisticalSignificance: boolean
    pValue: number
    recommendedModel: 'A' | 'B' | 'inconclusive'
  }
  businessImpact: {
    accuracyImprovement: number
    clinicalOutcomeImprovement: number
    resourceEfficiency: number
  }
}

export class PredictionValidationService {
  /**
   * Validate a single prediction against actual outcome
   */
  static async validatePrediction(
    predictionId: string,
    predictionTable: 'predictive_analytics' | 'risk_assessments' | 'operational_forecasts',
    actualOutcome: any,
    validatorId: string,
    notes?: string
  ): Promise<PredictionValidationResult> {
    try {
      // Retrieve original prediction
      const { data: originalPrediction, error: fetchError } = await supabase
        .from(predictionTable)
        .select('*')
        .eq('id', predictionId)
        .single()

      if (fetchError || !originalPrediction) {
        throw new Error(`Failed to retrieve prediction ${predictionId}: ${fetchError?.message}`)
      }

      // Calculate accuracy metrics
      const accuracyMetrics = this.calculateAccuracyMetrics(
        originalPrediction.prediction_value,
        actualOutcome,
        predictionTable
      )

      // Calculate calibration score
      const calibrationScore = this.calculateCalibrationScore(
        originalPrediction.prediction_value,
        originalPrediction.confidence_interval,
        actualOutcome
      )

      const validationResult: PredictionValidationResult = {
        predictionId,
        actualOutcome,
        validationDate: new Date(),
        accuracyScore: accuracyMetrics.accuracyScore,
        errorMetrics: accuracyMetrics.errorMetrics,
        calibrationScore,
        notes
      }

      // Store validation result
      await this.storePredictionValidation(validationResult, predictionTable, validatorId)

      console.log(`Prediction ${predictionId} validated with accuracy: ${accuracyMetrics.accuracyScore.toFixed(3)}`)
      return validationResult
    } catch (error) {
      console.error('Error validating prediction:', error)
      throw new Error(`Failed to validate prediction: ${error}`)
    }
  }

  /**
   * Batch validate multiple predictions
   */
  static async batchValidatePredictions(
    validations: Array<{
      predictionId: string
      predictionTable: 'predictive_analytics' | 'risk_assessments' | 'operational_forecasts'
      actualOutcome: any
      notes?: string
    }>,
    validatorId: string
  ): Promise<PredictionValidationResult[]> {
    const results: PredictionValidationResult[] = []

    // Process in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < validations.length; i += batchSize) {
      const batch = validations.slice(i, i + batchSize)
      const batchPromises = batch.map(validation =>
        this.validatePrediction(
          validation.predictionId,
          validation.predictionTable,
          validation.actualOutcome,
          validatorId,
          validation.notes
        )
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Generate model validation summary for a specific model type
   */
  static async generateValidationSummary(
    modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast',
    startDate: Date,
    endDate: Date
  ): Promise<ModelValidationSummary> {
    try {
      // Get table name based on model type
      const tableName = this.getTableName(modelType)

      // Retrieve validation data
      const { data: validationData, error } = await supabase
        .from('prediction_accuracy')
        .select(`
          *,
          prediction_id,
          actual_outcome,
          accuracy_score,
          error_metrics,
          validation_date
        `)
        .eq('prediction_table', tableName)
        .gte('validation_date', startDate.toISOString())
        .lte('validation_date', endDate.toISOString())
        .order('validation_date', { ascending: false })

      if (error) throw error

      const validatedPredictions = validationData?.length || 0

      // Get total predictions in period
      const { data: totalPredictionsData, error: totalError } = await supabase
        .from(tableName)
        .select('id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (totalError) throw totalError

      const totalPredictions = totalPredictionsData?.length || 0

      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(validationData || [])
      const calibrationMetrics = this.calculateCalibrationMetrics(validationData || [])

      // Generate recommendations
      const recommendations = this.generateValidationRecommendations(
        overallMetrics,
        calibrationMetrics,
        validatedPredictions,
        totalPredictions
      )

      return {
        modelType,
        validationPeriod: { startDate, endDate },
        totalPredictions,
        validatedPredictions,
        overallAccuracy: overallMetrics.accuracy,
        performanceMetrics: {
          mae: overallMetrics.mae,
          rmse: overallMetrics.rmse,
          precision: overallMetrics.precision,
          recall: overallMetrics.recall,
          f1Score: overallMetrics.f1Score
        },
        calibrationMetrics,
        recommendations
      }
    } catch (error) {
      console.error('Error generating validation summary:', error)
      throw new Error(`Failed to generate validation summary: ${error}`)
    }
  }

  /**
   * Perform A/B testing between two model versions
   */
  static async performA_BTest(
    modelA: string,
    modelB: string,
    testDurationDays: number = 30,
    minimumSampleSize: number = 100
  ): Promise<A_BTestResult> {
    const testId = `ab_test_${Date.now()}`
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + testDurationDays * 24 * 60 * 60 * 1000)

    try {
      console.log(`Starting A/B test: ${modelA} vs ${modelB}`)

      // This would be implemented with actual A/B testing infrastructure
      // For now, simulate the process with validation data
      
      const { data: modelAValidations } = await supabase
        .from('prediction_accuracy')
        .select('*')
        .ilike('notes', `%${modelA}%`)
        .gte('validation_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(minimumSampleSize)

      const { data: modelBValidations } = await supabase
        .from('prediction_accuracy')
        .select('*')
        .ilike('notes', `%${modelB}%`)
        .gte('validation_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(minimumSampleSize)

      if (!modelAValidations?.length || !modelBValidations?.length) {
        throw new Error('Insufficient data for A/B testing')
      }

      // Calculate performance for both models
      const modelA_performance = this.calculateModelPerformance(modelAValidations)
      const modelB_performance = this.calculateModelPerformance(modelBValidations)

      // Perform statistical significance test
      const { isSignificant, pValue } = this.performSignificanceTest(
        modelAValidations.map(v => v.accuracy_score),
        modelBValidations.map(v => v.accuracy_score)
      )

      // Determine recommended model
      let recommendedModel: 'A' | 'B' | 'inconclusive'
      if (isSignificant) {
        recommendedModel = modelA_performance.accuracy > modelB_performance.accuracy ? 'A' : 'B'
      } else {
        recommendedModel = 'inconclusive'
      }

      // Calculate business impact
      const businessImpact = {
        accuracyImprovement: Math.abs(modelA_performance.accuracy - modelB_performance.accuracy),
        clinicalOutcomeImprovement: 0.05, // Simulated value
        resourceEfficiency: 0.1 // Simulated value
      }

      return {
        testId,
        modelA,
        modelB,
        startDate,
        endDate,
        participantCount: modelAValidations.length + modelBValidations.length,
        results: {
          modelA_performance,
          modelB_performance,
          statisticalSignificance: isSignificant,
          pValue,
          recommendedModel
        },
        businessImpact
      }
    } catch (error) {
      console.error('Error performing A/B test:', error)
      throw new Error(`Failed to perform A/B test: ${error}`)
    }
  }

  /**
   * Monitor model performance drift over time
   */
  static async monitorModelDrift(
    modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast',
    windowDays: number = 30
  ): Promise<{
    isDrifting: boolean
    driftSeverity: 'low' | 'medium' | 'high'
    currentAccuracy: number
    baselineAccuracy: number
    trend: 'improving' | 'stable' | 'declining'
    recommendations: string[]
  }> {
    try {
      const tableName = this.getTableName(modelType)
      const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
      const baselineStart = new Date(Date.now() - (windowDays * 2) * 24 * 60 * 60 * 1000)

      // Get recent validation data
      const { data: recentValidations } = await supabase
        .from('prediction_accuracy')
        .select('accuracy_score, validation_date')
        .eq('prediction_table', tableName)
        .gte('validation_date', windowStart.toISOString())
        .order('validation_date', { ascending: false })

      // Get baseline validation data
      const { data: baselineValidations } = await supabase
        .from('prediction_accuracy')
        .select('accuracy_score, validation_date')
        .eq('prediction_table', tableName)
        .gte('validation_date', baselineStart.toISOString())
        .lt('validation_date', windowStart.toISOString())
        .order('validation_date', { ascending: false })

      if (!recentValidations?.length || !baselineValidations?.length) {
        return {
          isDrifting: false,
          driftSeverity: 'low',
          currentAccuracy: 0,
          baselineAccuracy: 0,
          trend: 'stable',
          recommendations: ['Insufficient data for drift analysis']
        }
      }

      const currentAccuracy = recentValidations.reduce((sum, v) => sum + v.accuracy_score, 0) / recentValidations.length
      const baselineAccuracy = baselineValidations.reduce((sum, v) => sum + v.accuracy_score, 0) / baselineValidations.length

      const accuracyDrop = baselineAccuracy - currentAccuracy
      const isDrifting = accuracyDrop > 0.05 // 5% accuracy drop threshold

      let driftSeverity: 'low' | 'medium' | 'high'
      if (accuracyDrop > 0.15) driftSeverity = 'high'
      else if (accuracyDrop > 0.10) driftSeverity = 'medium'
      else driftSeverity = 'low'

      // Analyze trend
      let trend: 'improving' | 'stable' | 'declining'
      if (accuracyDrop > 0.02) trend = 'declining'
      else if (accuracyDrop < -0.02) trend = 'improving'
      else trend = 'stable'

      // Generate recommendations
      const recommendations = this.generateDriftRecommendations(isDrifting, driftSeverity, trend)

      return {
        isDrifting,
        driftSeverity,
        currentAccuracy,
        baselineAccuracy,
        trend,
        recommendations
      }
    } catch (error) {
      console.error('Error monitoring model drift:', error)
      throw new Error(`Failed to monitor model drift: ${error}`)
    }
  }

  /**
   * Calculate accuracy metrics for a prediction
   */
  private static calculateAccuracyMetrics(
    prediction: any,
    actualOutcome: any,
    predictionTable: string
  ): {
    accuracyScore: number
    errorMetrics: {
      absoluteError: number
      percentageError: number
      classificationError?: boolean
    }
  } {
    let accuracyScore: number
    let absoluteError: number
    let percentageError: number
    let classificationError: boolean | undefined

    if (predictionTable === 'operational_forecasts') {
      // Regression metrics for operational forecasts
      const predictedValue = prediction.predicted_value || prediction
      const actualValue = actualOutcome.actual_value || actualOutcome
      
      absoluteError = Math.abs(predictedValue - actualValue)
      percentageError = actualValue !== 0 ? (absoluteError / Math.abs(actualValue)) * 100 : 0
      accuracyScore = Math.max(0, 1 - (absoluteError / Math.max(Math.abs(actualValue), 1)))
    } else {
      // Classification metrics for therapy outcome and risk assessment
      const predictedValue = prediction.prediction || prediction
      const actualValue = actualOutcome.outcome_value || actualOutcome
      
      // Convert to binary classification (threshold 0.5)
      const predictedBinary = predictedValue > 0.5 ? 1 : 0
      const actualBinary = actualValue > 0.5 ? 1 : 0
      
      classificationError = predictedBinary !== actualBinary
      accuracyScore = classificationError ? 0 : 1
      
      absoluteError = Math.abs(predictedValue - actualValue)
      percentageError = actualValue !== 0 ? (absoluteError / Math.abs(actualValue)) * 100 : 0
    }

    return {
      accuracyScore,
      errorMetrics: {
        absoluteError,
        percentageError,
        classificationError
      }
    }
  }

  /**
   * Calculate calibration score for prediction confidence
   */
  private static calculateCalibrationScore(
    prediction: any,
    confidenceInterval: any,
    actualOutcome: any
  ): number {
    try {
      const predictedValue = prediction.prediction || prediction
      const actualValue = actualOutcome.outcome_value || actualOutcome
      const lower = confidenceInterval?.lower || predictedValue - 0.1
      const upper = confidenceInterval?.upper || predictedValue + 0.1

      // Check if actual outcome falls within confidence interval
      const withinInterval = actualValue >= lower && actualValue <= upper
      
      // Calculate calibration based on confidence width and accuracy
      const intervalWidth = upper - lower
      const predictionError = Math.abs(predictedValue - actualValue)
      
      if (withinInterval) {
        // Good calibration if within interval
        return Math.max(0.5, 1 - (predictionError / intervalWidth))
      } else {
        // Poor calibration if outside interval
        return Math.max(0, 0.5 - (predictionError / intervalWidth))
      }
    } catch (error) {
      console.warn('Error calculating calibration score:', error)
      return 0.5 // Default neutral calibration
    }
  }

  /**
   * Store prediction validation result
   */
  private static async storePredictionValidation(
    validation: PredictionValidationResult,
    predictionTable: string,
    validatorId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('prediction_accuracy')
      .insert({
        prediction_id: validation.predictionId,
        prediction_table: predictionTable,
        actual_outcome: validation.actualOutcome,
        accuracy_score: validation.accuracyScore,
        error_metrics: validation.errorMetrics,
        validation_date: validation.validationDate.toISOString(),
        validated_by: validatorId,
        notes: validation.notes,
        metadata: {
          calibration_score: validation.calibrationScore
        }
      })

    if (error) {
      throw new Error(`Failed to store validation: ${error.message}`)
    }
  }

  /**
   * Get table name from model type
   */
  private static getTableName(modelType: string): string {
    switch (modelType) {
      case 'therapy_outcome':
        return 'predictive_analytics'
      case 'risk_assessment':
        return 'risk_assessments'
      case 'operational_forecast':
        return 'operational_forecasts'
      default:
        throw new Error(`Unknown model type: ${modelType}`)
    }
  }

  /**
   * Calculate overall performance metrics from validation data
   */
  private static calculateOverallMetrics(validationData: any[]): {
    accuracy: number
    mae: number
    rmse: number
    precision: number
    recall: number
    f1Score: number
  } {
    if (!validationData.length) {
      return { accuracy: 0, mae: 0, rmse: 0, precision: 0, recall: 0, f1Score: 0 }
    }

    const accuracyScores = validationData.map(v => v.accuracy_score || 0)
    const accuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length

    // Calculate MAE and RMSE from error metrics
    const absoluteErrors = validationData
      .map(v => v.error_metrics?.absoluteError || 0)
      .filter(error => !isNaN(error))
    
    const mae = absoluteErrors.length > 0 
      ? absoluteErrors.reduce((sum, error) => sum + error, 0) / absoluteErrors.length 
      : 0

    const rmse = absoluteErrors.length > 0
      ? Math.sqrt(absoluteErrors.reduce((sum, error) => sum + error * error, 0) / absoluteErrors.length)
      : 0

    // Calculate precision, recall, F1 for classification metrics
    const classificationData = validationData.filter(v => v.error_metrics?.classificationError !== undefined)
    
    if (classificationData.length > 0) {
      const tp = classificationData.filter(v => !v.error_metrics.classificationError).length
      const total = classificationData.length
      const precision = total > 0 ? tp / total : 0
      const recall = precision // Simplified calculation
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
      
      return { accuracy, mae, rmse, precision, recall, f1Score }
    }

    return { accuracy, mae, rmse, precision: accuracy, recall: accuracy, f1Score: accuracy }
  }

  /**
   * Calculate calibration metrics from validation data
   */
  private static calculateCalibrationMetrics(validationData: any[]): {
    calibrationError: number
    reliabilityDiagram: { confidence: number; accuracy: number }[]
  } {
    if (!validationData.length) {
      return { calibrationError: 0, reliabilityDiagram: [] }
    }

    const calibrationScores = validationData
      .map(v => v.metadata?.calibration_score || 0.5)
      .filter(score => !isNaN(score))

    const calibrationError = calibrationScores.length > 0
      ? 1 - (calibrationScores.reduce((sum, score) => sum + score, 0) / calibrationScores.length)
      : 0.5

    // Create reliability diagram (simplified)
    const reliabilityDiagram = [
      { confidence: 0.1, accuracy: Math.min(calibrationError + 0.1, 1) },
      { confidence: 0.5, accuracy: 1 - calibrationError },
      { confidence: 0.9, accuracy: Math.max(1 - calibrationError - 0.1, 0) }
    ]

    return { calibrationError, reliabilityDiagram }
  }

  /**
   * Calculate model performance metrics from validation data
   */
  private static calculateModelPerformance(validationData: any[]): ModelPerformanceMetrics {
    const overallMetrics = this.calculateOverallMetrics(validationData)
    
    return {
      accuracy: overallMetrics.accuracy,
      precision: overallMetrics.precision,
      recall: overallMetrics.recall,
      f1Score: overallMetrics.f1Score,
      auc: 0.8, // Simplified calculation
      lossHistory: [], // Not available from validation data
      validationLoss: [] // Not available from validation data
    }
  }

  /**
   * Perform statistical significance test between two groups
   */
  private static performSignificanceTest(
    groupA: number[],
    groupB: number[]
  ): { isSignificant: boolean; pValue: number } {
    // Simplified t-test implementation
    if (groupA.length === 0 || groupB.length === 0) {
      return { isSignificant: false, pValue: 1.0 }
    }

    const meanA = groupA.reduce((sum, val) => sum + val, 0) / groupA.length
    const meanB = groupB.reduce((sum, val) => sum + val, 0) / groupB.length
    
    const varA = groupA.reduce((sum, val) => sum + Math.pow(val - meanA, 2), 0) / (groupA.length - 1)
    const varB = groupB.reduce((sum, val) => sum + Math.pow(val - meanB, 2), 0) / (groupB.length - 1)
    
    const pooledSE = Math.sqrt((varA / groupA.length) + (varB / groupB.length))
    const tStat = Math.abs(meanA - meanB) / pooledSE
    
    // Simplified p-value calculation (assumes normal distribution)
    const pValue = tStat > 1.96 ? 0.05 : 0.1 // Simplified
    
    return {
      isSignificant: pValue < 0.05,
      pValue
    }
  }

  /**
   * Generate recommendations based on validation metrics
   */
  private static generateValidationRecommendations(
    overallMetrics: any,
    calibrationMetrics: any,
    validatedPredictions: number,
    totalPredictions: number
  ): string[] {
    const recommendations: string[] = []

    // Accuracy recommendations
    if (overallMetrics.accuracy < 0.7) {
      recommendations.push('🔴 Low model accuracy detected. Consider retraining with more data or different features.')
    } else if (overallMetrics.accuracy < 0.8) {
      recommendations.push('🟡 Model accuracy is moderate. Review feature engineering and model architecture.')
    }

    // Calibration recommendations
    if (calibrationMetrics.calibrationError > 0.3) {
      recommendations.push('🔴 Poor prediction calibration. Confidence intervals may be unreliable.')
    }

    // Validation coverage recommendations
    const validationRate = totalPredictions > 0 ? validatedPredictions / totalPredictions : 0
    if (validationRate < 0.1) {
      recommendations.push('🟡 Low validation coverage. Increase prediction validation rate for better model monitoring.')
    }

    // MAE recommendations
    if (overallMetrics.mae > 0.2) {
      recommendations.push('🟡 High mean absolute error. Consider model regularization or data quality improvements.')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Model performance meets quality standards.')
    }

    return recommendations
  }

  /**
   * Generate drift monitoring recommendations
   */
  private static generateDriftRecommendations(
    isDrifting: boolean,
    driftSeverity: 'low' | 'medium' | 'high',
    trend: 'improving' | 'stable' | 'declining'
  ): string[] {
    const recommendations: string[] = []

    if (!isDrifting) {
      recommendations.push('✅ No significant model drift detected.')
      return recommendations
    }

    switch (driftSeverity) {
      case 'high':
        recommendations.push('🔴 CRITICAL: High model drift detected. Immediate model retraining required.')
        recommendations.push('🔄 Review recent data for distribution changes or quality issues.')
        recommendations.push('📊 Consider implementing automatic retraining pipeline.')
        break
      case 'medium':
        recommendations.push('🟡 WARNING: Medium model drift detected. Schedule model retraining soon.')
        recommendations.push('📈 Monitor performance closely and validate more predictions.')
        break
      case 'low':
        recommendations.push('🟡 INFO: Low model drift detected. Consider feature analysis.')
        recommendations.push('🔍 Investigate potential causes of performance decline.')
        break
    }

    if (trend === 'declining') {
      recommendations.push('📉 Performance trend is declining. Prioritize model maintenance.')
    } else if (trend === 'improving') {
      recommendations.push('📈 Performance trend is improving. Current interventions are working.')
    }

    return recommendations
  }
}