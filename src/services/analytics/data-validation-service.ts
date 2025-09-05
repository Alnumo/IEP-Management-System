import { supabase } from '@/lib/supabase'
import { TrainingDataset } from './model-training-pipeline'

export interface DataValidationRule {
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  validator: (data: any) => ValidationResult
}

export interface ValidationResult {
  passed: boolean
  message: string
  details?: any
  recommendation?: string
}

export interface DataQualityReport {
  overallScore: number
  validationResults: {
    rule: string
    result: ValidationResult
  }[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  recommendations: string[]
  timestamp: Date
}

export class DataValidationService {
  private static readonly VALIDATION_RULES: DataValidationRule[] = [
    {
      name: 'minimum_sample_size',
      description: 'Ensures dataset has sufficient samples for training',
      severity: 'error',
      validator: (dataset: TrainingDataset) => {
        const minSamples = 100
        const passed = dataset.metadata.datasetSize >= minSamples
        return {
          passed,
          message: passed 
            ? `Dataset size sufficient: ${dataset.metadata.datasetSize} samples`
            : `Dataset size insufficient: ${dataset.metadata.datasetSize} samples (minimum: ${minSamples})`,
          recommendation: passed ? undefined : 'Collect more training data or use data augmentation techniques'
        }
      }
    },
    {
      name: 'feature_completeness',
      description: 'Validates that all features are present and non-null',
      severity: 'error',
      validator: (dataset: TrainingDataset) => {
        const missingFeatures = dataset.features.filter(row => 
          row.some(feature => feature === null || feature === undefined || isNaN(feature))
        ).length
        
        const missingRate = missingFeatures / dataset.features.length
        const passed = missingRate < 0.05 // Allow up to 5% missing
        
        return {
          passed,
          message: passed 
            ? `Feature completeness acceptable: ${(100 - missingRate * 100).toFixed(1)}% complete`
            : `High missing feature rate: ${(missingRate * 100).toFixed(1)}% missing`,
          details: { missingCount: missingFeatures, totalSamples: dataset.features.length },
          recommendation: passed ? undefined : 'Review data collection process and implement feature imputation'
        }
      }
    },
    {
      name: 'label_distribution',
      description: 'Ensures labels have sufficient variance and reasonable distribution',
      severity: 'warning',
      validator: (dataset: TrainingDataset) => {
        const labels = dataset.labels
        const mean = labels.reduce((sum, label) => sum + label, 0) / labels.length
        const variance = labels.reduce((sum, label) => sum + Math.pow(label - mean, 2), 0) / labels.length
        
        const minVariance = 0.01
        const passed = variance > minVariance
        
        return {
          passed,
          message: passed 
            ? `Label distribution adequate: variance = ${variance.toFixed(4)}`
            : `Low label variance: ${variance.toFixed(4)} (minimum: ${minVariance})`,
          details: { mean: mean.toFixed(3), variance: variance.toFixed(4), min: Math.min(...labels), max: Math.max(...labels) },
          recommendation: passed ? undefined : 'Ensure diverse outcomes in training data or consider different labeling strategy'
        }
      }
    },
    {
      name: 'feature_scaling',
      description: 'Validates that features are properly normalized',
      severity: 'warning',
      validator: (dataset: TrainingDataset) => {
        const features = dataset.features.flat()
        const outOfRange = features.filter(f => f < -5 || f > 5).length
        const outOfRangeRate = outOfRange / features.length
        
        const passed = outOfRangeRate < 0.1 // Allow up to 10% out of reasonable range
        
        return {
          passed,
          message: passed 
            ? `Feature scaling acceptable: ${(100 - outOfRangeRate * 100).toFixed(1)}% in range`
            : `Poor feature scaling: ${(outOfRangeRate * 100).toFixed(1)}% out of range`,
          details: { outOfRangeCount: outOfRange, totalFeatures: features.length },
          recommendation: passed ? undefined : 'Review feature normalization and scaling procedures'
        }
      }
    },
    {
      name: 'class_balance',
      description: 'Checks for severe class imbalance in labels',
      severity: 'info',
      validator: (dataset: TrainingDataset) => {
        const labels = dataset.labels
        const bins = Array(10).fill(0) // 10 bins for 0-1 range
        
        labels.forEach(label => {
          const binIndex = Math.min(Math.floor(label * 10), 9)
          bins[binIndex]++
        })
        
        const maxBin = Math.max(...bins)
        const minBin = Math.min(...bins.filter(b => b > 0))
        const imbalanceRatio = maxBin / minBin
        
        const passed = imbalanceRatio < 10 // Flag if ratio exceeds 10:1
        
        return {
          passed,
          message: passed 
            ? `Class balance acceptable: max/min ratio = ${imbalanceRatio.toFixed(2)}`
            : `Class imbalance detected: max/min ratio = ${imbalanceRatio.toFixed(2)}`,
          details: { distribution: bins, imbalanceRatio },
          recommendation: passed ? undefined : 'Consider data resampling, class weights, or stratified sampling'
        }
      }
    },
    {
      name: 'temporal_consistency',
      description: 'Validates temporal ordering and consistency of data',
      severity: 'warning',
      validator: (dataset: TrainingDataset) => {
        // This would validate that temporal features make sense
        // For now, assume consistency based on data creation time
        const dataAge = Date.now() - new Date(dataset.metadata.createdAt).getTime()
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
        
        const passed = dataAge < maxAge
        
        return {
          passed,
          message: passed 
            ? `Data freshness acceptable: ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} days old`
            : `Data may be stale: ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} days old`,
          details: { ageInDays: Math.floor(dataAge / (24 * 60 * 60 * 1000)) },
          recommendation: passed ? undefined : 'Consider refreshing training data with recent samples'
        }
      }
    },
    {
      name: 'privacy_compliance',
      description: 'Validates privacy-preserving measures are applied',
      severity: 'error',
      validator: (dataset: TrainingDataset) => {
        // Check if student IDs are anonymized (no direct PHI)
        const hasDirectIds = dataset.studentIds.some(id => 
          id.includes('@') || id.includes('-') || id.length < 10
        )
        
        const passed = !hasDirectIds
        
        return {
          passed,
          message: passed 
            ? 'Privacy compliance: No direct identifiers detected'
            : 'Privacy risk: Potential direct identifiers found',
          recommendation: passed ? undefined : 'Ensure all personal identifiers are properly anonymized'
        }
      }
    },
    {
      name: 'feature_correlation',
      description: 'Detects highly correlated features that may cause overfitting',
      severity: 'info',
      validator: (dataset: TrainingDataset) => {
        const correlations = this.calculateFeatureCorrelations(dataset.features)
        const highCorrelations = correlations.filter(corr => Math.abs(corr.correlation) > 0.9)
        
        const passed = highCorrelations.length < dataset.metadata.featureCount * 0.1
        
        return {
          passed,
          message: passed 
            ? `Feature correlation acceptable: ${highCorrelations.length} high correlations`
            : `High feature correlation: ${highCorrelations.length} pairs highly correlated`,
          details: { highCorrelations: highCorrelations.slice(0, 5) }, // Show top 5
          recommendation: passed ? undefined : 'Consider feature selection or dimensionality reduction'
        }
      }
    }
  ]

  /**
   * Run comprehensive data validation on training dataset
   */
  static async validateTrainingDataset(dataset: TrainingDataset): Promise<DataQualityReport> {
    console.log('Starting data validation for training dataset...')
    
    const validationResults: { rule: string; result: ValidationResult }[] = []
    let errors = 0
    let warnings = 0
    let infos = 0

    // Execute all validation rules
    for (const rule of this.VALIDATION_RULES) {
      try {
        const result = rule.validator(dataset)
        validationResults.push({ rule: rule.name, result })

        if (!result.passed) {
          switch (rule.severity) {
            case 'error':
              errors++
              break
            case 'warning':
              warnings++
              break
            case 'info':
              infos++
              break
          }
        }
      } catch (error) {
        console.error(`Validation rule ${rule.name} failed:`, error)
        validationResults.push({
          rule: rule.name,
          result: {
            passed: false,
            message: `Validation rule failed: ${error}`,
            recommendation: 'Check validation rule implementation'
          }
        })
        errors++
      }
    }

    // Calculate overall score
    const totalRules = this.VALIDATION_RULES.length
    const errorWeight = 3
    const warningWeight = 1.5
    const infoWeight = 0.5

    const penalty = (errors * errorWeight + warnings * warningWeight + infos * infoWeight)
    const overallScore = Math.max(0, 100 - (penalty / totalRules) * 100)

    // Generate recommendations
    const recommendations = this.generateRecommendations(validationResults, dataset)

    const report: DataQualityReport = {
      overallScore: Math.round(overallScore * 100) / 100,
      validationResults,
      summary: { errors, warnings, infos },
      recommendations,
      timestamp: new Date()
    }

    // Store validation report
    await this.storeValidationReport(dataset, report)

    console.log(`Data validation completed: Score ${report.overallScore}/100 (${errors} errors, ${warnings} warnings, ${infos} info)`)
    return report
  }

  /**
   * Run real-time data validation for incoming predictions
   */
  static async validatePredictionData(
    studentId: string,
    features: number[],
    expectedFeatureCount: number
  ): Promise<ValidationResult> {
    try {
      // Feature count validation
      if (features.length !== expectedFeatureCount) {
        return {
          passed: false,
          message: `Feature count mismatch: ${features.length} received, ${expectedFeatureCount} expected`,
          recommendation: 'Ensure feature preprocessing matches training pipeline'
        }
      }

      // NaN/infinite value validation
      const invalidValues = features.filter(f => !isFinite(f)).length
      if (invalidValues > 0) {
        return {
          passed: false,
          message: `Invalid feature values: ${invalidValues} NaN/infinite values detected`,
          recommendation: 'Review data preprocessing pipeline for this student'
        }
      }

      // Range validation
      const outOfRange = features.filter(f => f < -10 || f > 10).length
      if (outOfRange > features.length * 0.2) { // Allow up to 20% out of range
        return {
          passed: false,
          message: `Feature scaling issue: ${outOfRange} features out of expected range`,
          recommendation: 'Verify feature normalization for this prediction'
        }
      }

      return {
        passed: true,
        message: 'Prediction data validation passed',
        details: { studentId, featureCount: features.length }
      }
    } catch (error) {
      return {
        passed: false,
        message: `Validation error: ${error}`,
        recommendation: 'Check prediction data validation service'
      }
    }
  }

  /**
   * Validate data quality for specific students
   */
  static async validateStudentDataQuality(studentIds: string[]): Promise<{
    [studentId: string]: ValidationResult
  }> {
    const results: { [studentId: string]: ValidationResult } = {}

    for (const studentId of studentIds) {
      try {
        // Check data completeness for student
        const { data: sessions } = await supabase
          .from('therapy_sessions')
          .select('id, attendance_status, session_duration')
          .eq('student_id', studentId)

        const { data: assessments } = await supabase
          .from('student_assessments')
          .select('id, score, assessment_date')
          .eq('student_id', studentId)

        // Validate data sufficiency
        const sessionCount = sessions?.length || 0
        const assessmentCount = assessments?.length || 0
        const attendanceRate = sessions?.filter(s => s.attendance_status === 'present').length / sessionCount

        let issues: string[] = []
        if (sessionCount < 5) issues.push('Insufficient session history')
        if (assessmentCount < 2) issues.push('Insufficient assessment data')
        if (attendanceRate < 0.5) issues.push('Low attendance rate may affect predictions')

        results[studentId] = {
          passed: issues.length === 0,
          message: issues.length === 0 
            ? 'Student data quality acceptable'
            : `Data quality issues: ${issues.join(', ')}`,
          details: {
            sessionCount,
            assessmentCount,
            attendanceRate: attendanceRate?.toFixed(2) || 'N/A'
          },
          recommendation: issues.length === 0 ? undefined : 'Collect more data before making predictions'
        }
      } catch (error) {
        results[studentId] = {
          passed: false,
          message: `Error validating student data: ${error}`,
          recommendation: 'Check student data access and integrity'
        }
      }
    }

    return results
  }

  /**
   * Calculate feature correlations for dataset
   */
  private static calculateFeatureCorrelations(features: number[][]): {
    feature1Index: number
    feature2Index: number
    correlation: number
  }[] {
    const correlations: { feature1Index: number; feature2Index: number; correlation: number }[] = []
    const featureCount = features[0]?.length || 0
    
    for (let i = 0; i < featureCount; i++) {
      for (let j = i + 1; j < featureCount; j++) {
        const feature1 = features.map(row => row[i])
        const feature2 = features.map(row => row[j])
        
        const correlation = this.pearsonCorrelation(feature1, feature2)
        correlations.push({ feature1Index: i, feature2Index: j, correlation })
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length
    if (n !== y.length || n === 0) return 0

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Generate actionable recommendations based on validation results
   */
  private static generateRecommendations(
    validationResults: { rule: string; result: ValidationResult }[],
    dataset: TrainingDataset
  ): string[] {
    const recommendations: string[] = []
    const failedResults = validationResults.filter(vr => !vr.result.passed)

    // Priority recommendations based on failed validations
    if (failedResults.some(vr => vr.rule === 'minimum_sample_size')) {
      recommendations.push('🔴 CRITICAL: Increase dataset size through additional data collection')
    }

    if (failedResults.some(vr => vr.rule === 'feature_completeness')) {
      recommendations.push('🔴 CRITICAL: Implement feature imputation or improve data collection')
    }

    if (failedResults.some(vr => vr.rule === 'privacy_compliance')) {
      recommendations.push('🔴 CRITICAL: Apply proper data anonymization before training')
    }

    if (failedResults.some(vr => vr.rule === 'label_distribution')) {
      recommendations.push('🟡 Consider balanced sampling or class weighting strategies')
    }

    if (failedResults.some(vr => vr.rule === 'feature_scaling')) {
      recommendations.push('🟡 Review and improve feature normalization procedures')
    }

    if (failedResults.some(vr => vr.rule === 'temporal_consistency')) {
      recommendations.push('🟡 Refresh training data with recent samples')
    }

    // General recommendations based on dataset characteristics
    if (dataset.metadata.dataQuality === 'fair' || dataset.metadata.dataQuality === 'poor') {
      recommendations.push('📊 Improve overall data quality through better collection and preprocessing')
    }

    if (dataset.metadata.featureCount > 50) {
      recommendations.push('🎯 Consider feature selection to reduce dimensionality')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Dataset meets quality standards for model training')
    }

    return recommendations
  }

  /**
   * Store validation report for audit trail
   */
  private static async storeValidationReport(
    dataset: TrainingDataset,
    report: DataQualityReport
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prediction_accuracy')
        .insert({
          prediction_id: `validation_${Date.now()}`,
          prediction_table: 'data_validation',
          actual_outcome: {
            report_type: 'data_quality',
            overall_score: report.overallScore,
            summary: report.summary,
            dataset_size: dataset.metadata.datasetSize,
            feature_count: dataset.metadata.featureCount
          },
          accuracy_score: report.overallScore / 100,
          validation_date: new Date().toISOString(),
          notes: `Data validation report: ${report.summary.errors} errors, ${report.summary.warnings} warnings`
        })

      if (error) {
        console.warn('Failed to store validation report:', error)
      }
    } catch (error) {
      console.warn('Error storing validation report:', error)
    }
  }

  /**
   * Get historical validation reports
   */
  static async getValidationHistory(limit: number = 10): Promise<DataQualityReport[]> {
    try {
      const { data, error } = await supabase
        .from('prediction_accuracy')
        .select('*')
        .eq('prediction_table', 'data_validation')
        .order('validation_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(record => ({
        overallScore: record.actual_outcome.overall_score,
        validationResults: [],
        summary: record.actual_outcome.summary,
        recommendations: [],
        timestamp: new Date(record.validation_date)
      }))
    } catch (error) {
      console.error('Error retrieving validation history:', error)
      return []
    }
  }

  /**
   * Monitor data quality over time
   */
  static async monitorDataQualityTrends(): Promise<{
    trend: 'improving' | 'stable' | 'declining'
    currentScore: number
    averageScore: number
    recommendation: string
  }> {
    try {
      const history = await this.getValidationHistory(5)
      
      if (history.length < 2) {
        return {
          trend: 'stable',
          currentScore: history[0]?.overallScore || 0,
          averageScore: history[0]?.overallScore || 0,
          recommendation: 'Insufficient historical data for trend analysis'
        }
      }

      const currentScore = history[0].overallScore
      const averageScore = history.reduce((sum, h) => sum + h.overallScore, 0) / history.length
      const previousScore = history[1].overallScore

      let trend: 'improving' | 'stable' | 'declining'
      if (currentScore > previousScore + 5) trend = 'improving'
      else if (currentScore < previousScore - 5) trend = 'declining'
      else trend = 'stable'

      let recommendation: string
      switch (trend) {
        case 'improving':
          recommendation = 'Data quality is improving. Continue current practices.'
          break
        case 'declining':
          recommendation = 'Data quality is declining. Review data collection and preprocessing.'
          break
        default:
          recommendation = currentScore > 80 
            ? 'Data quality is stable and good.' 
            : 'Data quality is stable but could be improved.'
      }

      return { trend, currentScore, averageScore, recommendation }
    } catch (error) {
      console.error('Error monitoring data quality trends:', error)
      return {
        trend: 'stable',
        currentScore: 0,
        averageScore: 0,
        recommendation: 'Error analyzing data quality trends'
      }
    }
  }
}