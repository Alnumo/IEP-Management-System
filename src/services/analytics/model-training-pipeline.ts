import { DataPreprocessingService, PreprocessedFeatures } from './data-preprocessing-service'
import { FeatureEngineeringService, EngineeringResult } from './feature-engineering-service'
import { supabase } from '@/lib/supabase'

export interface TrainingDataset {
  features: number[][]
  labels: number[]
  studentIds: string[]
  featureNames: string[]
  metadata: {
    datasetSize: number
    featureCount: number
    createdAt: Date
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  }
}

export interface ModelTrainingConfig {
  modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast'
  trainingParams: {
    epochs: number
    batchSize: number
    learningRate: number
    validationSplit: number
  }
  privacyConfig: {
    useKAnonymity: boolean
    kValue: number
    useDifferentialPrivacy: boolean
    epsilonValue: number
  }
}

export interface TrainingResult {
  modelId: string
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  lossHistory: number[]
  validationLoss: number[]
  trainingTime: number
  modelArtifacts: {
    weights: ArrayBuffer
    architecture: any
    preprocessingConfig: any
  }
}

export class ModelTrainingPipeline {
  private static readonly MIN_TRAINING_SAMPLES = 100
  private static readonly PRIVACY_K_VALUE = 5
  private static readonly DIFFERENTIAL_PRIVACY_EPSILON = 1.0

  /**
   * Prepare training dataset with privacy-preserving techniques
   */
  static async prepareTrainingDataset(
    modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast',
    privacyConfig?: ModelTrainingConfig['privacyConfig']
  ): Promise<TrainingDataset> {
    try {
      console.log(`Preparing training dataset for ${modelType}`)

      // Extract and preprocess raw data
      const rawData = await DataPreprocessingService.extractTrainingData()
      if (rawData.length < this.MIN_TRAINING_SAMPLES) {
        throw new Error(`Insufficient training data: ${rawData.length} samples (minimum: ${this.MIN_TRAINING_SAMPLES})`)
      }

      // Apply privacy-preserving techniques
      const privacyProtectedData = privacyConfig?.useKAnonymity 
        ? await this.applyKAnonymity(rawData, privacyConfig.kValue || this.PRIVACY_K_VALUE)
        : rawData

      // Preprocess features
      const preprocessedFeatures = await DataPreprocessingService.preprocessFeatures(privacyProtectedData)
      
      // Validate data quality
      const validation = DataPreprocessingService.validatePreprocessedData(preprocessedFeatures)
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.issues.join(', ')}`)
      }

      // Engineer additional features in batches
      const studentIds = preprocessedFeatures.map(f => f.student_id)
      const engineeredFeatures = await FeatureEngineeringService.engineerBatchFeatures(studentIds)

      // Combine preprocessed and engineered features
      const combinedDataset = await this.combineFeatures(preprocessedFeatures, engineeredFeatures)

      // Generate labels based on model type
      const labels = await this.generateLabels(modelType, studentIds)

      // Apply differential privacy if enabled
      const finalFeatures = privacyConfig?.useDifferentialPrivacy
        ? this.applyDifferentialPrivacy(combinedDataset.features, privacyConfig.epsilonValue || this.DIFFERENTIAL_PRIVACY_EPSILON)
        : combinedDataset.features

      const dataset: TrainingDataset = {
        features: finalFeatures,
        labels,
        studentIds: combinedDataset.studentIds,
        featureNames: combinedDataset.featureNames,
        metadata: {
          datasetSize: finalFeatures.length,
          featureCount: finalFeatures[0]?.length || 0,
          createdAt: new Date(),
          dataQuality: this.assessDataQuality(finalFeatures, labels)
        }
      }

      await this.cacheTrainingDataset(modelType, dataset)
      console.log(`Training dataset prepared: ${dataset.metadata.datasetSize} samples, ${dataset.metadata.featureCount} features`)
      
      return dataset
    } catch (error) {
      console.error('Error preparing training dataset:', error)
      throw new Error(`Failed to prepare training dataset: ${error}`)
    }
  }

  /**
   * Apply k-anonymity to protect individual privacy
   */
  private static async applyKAnonymity(data: any[], kValue: number): Promise<any[]> {
    // Group similar records and ensure each group has at least k members
    const groups: { [key: string]: any[] } = {}
    
    data.forEach(record => {
      // Create anonymization key based on quasi-identifiers
      const key = this.createAnonymizationKey(record)
      if (!groups[key]) groups[key] = []
      groups[key].push(record)
    })

    // Filter out groups with less than k members
    const anonymizedData: any[] = []
    Object.values(groups).forEach(group => {
      if (group.length >= kValue) {
        // Generalize values within the group for anonymization
        const generalizedGroup = this.generalizeGroup(group)
        anonymizedData.push(...generalizedGroup)
      }
    })

    console.log(`K-anonymity applied: ${data.length} -> ${anonymizedData.length} records (k=${kValue})`)
    return anonymizedData
  }

  /**
   * Create anonymization key from quasi-identifiers
   */
  private static createAnonymizationKey(record: any): string {
    const ageRange = this.getAgeRange(record.enrollment_date)
    const sessionRange = this.getSessionRange(record.total_sessions)
    const difficultyLevel = record.difficulty_level || 'unknown'
    
    return `${ageRange}-${sessionRange}-${difficultyLevel}`
  }

  /**
   * Get age range for anonymization
   */
  private static getAgeRange(enrollmentDate: string): string {
    const enrollmentAge = Math.floor((Date.now() - new Date(enrollmentDate).getTime()) / (1000 * 60 * 60 * 24))
    
    if (enrollmentAge < 90) return '0-3months'
    if (enrollmentAge < 180) return '3-6months'
    if (enrollmentAge < 365) return '6-12months'
    return '12months+'
  }

  /**
   * Get session range for anonymization
   */
  private static getSessionRange(totalSessions: number): string {
    if (totalSessions < 10) return '0-10'
    if (totalSessions < 25) return '10-25'
    if (totalSessions < 50) return '25-50'
    return '50+'
  }

  /**
   * Generalize group values for k-anonymity
   */
  private static generalizeGroup(group: any[]): any[] {
    if (group.length <= 1) return group

    // Calculate group averages for numerical values
    const avgSessions = group.reduce((sum, r) => sum + (r.total_sessions || 0), 0) / group.length
    const avgAttendance = group.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / group.length
    const avgAssessment = group.reduce((sum, r) => sum + (r.avg_assessment_score || 0), 0) / group.length

    // Return generalized records
    return group.map(record => ({
      ...record,
      total_sessions: Math.round(avgSessions),
      attendance_rate: Number(avgAttendance.toFixed(2)),
      avg_assessment_score: Number(avgAssessment.toFixed(2))
    }))
  }

  /**
   * Apply differential privacy noise to features
   */
  private static applyDifferentialPrivacy(features: number[][], epsilon: number): number[][] {
    const sensitivity = 1.0 // Assumed sensitivity for normalized features
    const noiseScale = sensitivity / epsilon

    return features.map(featureVector => 
      featureVector.map(feature => {
        // Add Laplace noise
        const noise = this.sampleLaplaceNoise(0, noiseScale)
        return feature + noise
      })
    )
  }

  /**
   * Sample from Laplace distribution for differential privacy
   */
  private static sampleLaplaceNoise(location: number, scale: number): number {
    const uniform1 = Math.random()
    const uniform2 = Math.random()
    
    const sign = uniform1 < 0.5 ? -1 : 1
    const exponential = -Math.log(uniform2)
    
    return location + sign * scale * exponential
  }

  /**
   * Combine preprocessed and engineered features
   */
  private static async combineFeatures(
    preprocessed: PreprocessedFeatures[],
    engineered: EngineeringResult[]
  ) {
    const engineeredMap = new Map(engineered.map(e => [e.student_id, e]))
    
    const combinedFeatures: number[][] = []
    const validStudentIds: string[] = []
    
    preprocessed.forEach(prep => {
      const eng = engineeredMap.get(prep.student_id)
      if (eng) {
        const combined = [...prep.normalized_data, ...eng.composite_features]
        combinedFeatures.push(combined)
        validStudentIds.push(prep.student_id)
      }
    })

    const featureNames = [
      ...DataPreprocessingService['FEATURE_NAMES'],
      'age_group_encoded',
      'enrollment_duration_encoded',
      'medical_complexity_encoded',
      'comorbidity_count_normalized',
      'session_completion_rate',
      'goal_achievement_velocity',
      'therapy_engagement_score',
      'assessment_trend_encoded',
      'response_pattern_encoded',
      'attendance_consistency',
      'social_interaction_level',
      'family_engagement_score',
      'duration_preference_encoded',
      'peak_time_encoded',
      'dropout_risk_score',
      'plan_modification_likelihood',
      'external_support_adequacy',
      'resource_utilization_efficiency',
      'intervention_urgency_encoded'
    ]

    return {
      features: combinedFeatures,
      studentIds: validStudentIds,
      featureNames
    }
  }

  /**
   * Generate labels based on model type
   */
  private static async generateLabels(
    modelType: 'therapy_outcome' | 'risk_assessment' | 'operational_forecast',
    studentIds: string[]
  ): Promise<number[]> {
    const labels: number[] = []

    for (const studentId of studentIds) {
      let label: number

      switch (modelType) {
        case 'therapy_outcome':
          label = await this.generateTherapyOutcomeLabel(studentId)
          break
        case 'risk_assessment':
          label = await this.generateRiskAssessmentLabel(studentId)
          break
        case 'operational_forecast':
          label = await this.generateOperationalForecastLabel(studentId)
          break
        default:
          throw new Error(`Unknown model type: ${modelType}`)
      }

      labels.push(label)
    }

    return labels
  }

  /**
   * Generate therapy outcome label (0-1 success rate)
   */
  private static async generateTherapyOutcomeLabel(studentId: string): Promise<number> {
    const { data: outcomes } = await supabase
      .from('clinical_outcomes')
      .select('outcome_type')
      .eq('student_id', studentId)

    if (!outcomes?.length) return 0.5 // Neutral for unknown outcomes

    const totalOutcomes = outcomes.length
    const positiveOutcomes = outcomes.filter(o => 
      ['goal_achieved', 'goal_progress'].includes(o.outcome_type)
    ).length

    return positiveOutcomes / totalOutcomes
  }

  /**
   * Generate risk assessment label (0-1 risk score)
   */
  private static async generateRiskAssessmentLabel(studentId: string): Promise<number> {
    const { data: sessions } = await supabase
      .from('therapy_sessions')
      .select('attendance_status')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(10)

    if (!sessions?.length) return 0.5

    const attendanceRate = sessions.filter(s => s.attendance_status === 'present').length / sessions.length
    
    // Inverse relationship: lower attendance = higher risk
    return 1 - attendanceRate
  }

  /**
   * Generate operational forecast label (normalized metric)
   */
  private static async generateOperationalForecastLabel(studentId: string): Promise<number> {
    // This would be based on historical operational metrics
    // For now, return a normalized value based on student activity
    const { data: sessions } = await supabase
      .from('therapy_sessions')
      .select('id')
      .eq('student_id', studentId)

    const sessionCount = sessions?.length || 0
    return Math.min(sessionCount / 100, 1.0) // Normalize to max 100 sessions
  }

  /**
   * Assess data quality of prepared dataset
   */
  private static assessDataQuality(features: number[][], labels: number[]): 'excellent' | 'good' | 'fair' | 'poor' {
    if (features.length < 50) return 'poor'
    
    // Check for missing values
    const missingValueRate = features.reduce((acc, row) => 
      acc + row.filter(val => isNaN(val) || !isFinite(val)).length, 0
    ) / (features.length * features[0].length)
    
    // Check label distribution
    const labelMean = labels.reduce((sum, label) => sum + label, 0) / labels.length
    const labelVariance = labels.reduce((sum, label) => sum + Math.pow(label - labelMean, 2), 0) / labels.length
    
    if (missingValueRate < 0.01 && labelVariance > 0.1 && features.length > 500) return 'excellent'
    if (missingValueRate < 0.05 && labelVariance > 0.05 && features.length > 200) return 'good'
    if (missingValueRate < 0.1 && features.length > 100) return 'fair'
    
    return 'poor'
  }

  /**
   * Cache training dataset for reuse
   */
  private static async cacheTrainingDataset(modelType: string, dataset: TrainingDataset): Promise<void> {
    try {
      const cacheKey = `training_dataset_${modelType}_${dataset.metadata.createdAt.getTime()}`
      
      // Store in Supabase storage (in production, consider using a dedicated ML storage service)
      const datasetBlob = new Blob([JSON.stringify(dataset)], { type: 'application/json' })
      
      const { error } = await supabase.storage
        .from('ml-datasets')
        .upload(`${cacheKey}.json`, datasetBlob)
      
      if (error) {
        console.warn('Failed to cache dataset:', error)
      } else {
        console.log(`Dataset cached: ${cacheKey}`)
      }
    } catch (error) {
      console.warn('Error caching dataset:', error)
    }
  }

  /**
   * Load cached training dataset
   */
  static async loadCachedDataset(modelType: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<TrainingDataset | null> {
    try {
      const { data: files } = await supabase.storage
        .from('ml-datasets')
        .list('', {
          search: `training_dataset_${modelType}`
        })

      if (!files?.length) return null

      // Find most recent dataset within max age
      const recentFile = files
        .filter(file => {
          const timestamp = parseInt(file.name.match(/\d+/)?.[0] || '0')
          return Date.now() - timestamp < maxAge
        })
        .sort((a, b) => {
          const aTimestamp = parseInt(a.name.match(/\d+/)?.[0] || '0')
          const bTimestamp = parseInt(b.name.match(/\d+/)?.[0] || '0')
          return bTimestamp - aTimestamp
        })[0]

      if (!recentFile) return null

      const { data: fileData } = await supabase.storage
        .from('ml-datasets')
        .download(recentFile.name)

      if (!fileData) return null

      const datasetText = await fileData.text()
      const dataset = JSON.parse(datasetText) as TrainingDataset
      
      console.log(`Loaded cached dataset: ${recentFile.name}`)
      return dataset
    } catch (error) {
      console.warn('Error loading cached dataset:', error)
      return null
    }
  }

  /**
   * Validate training dataset before model training
   */
  static validateTrainingDataset(dataset: TrainingDataset): { 
    isValid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check dataset size
    if (dataset.metadata.datasetSize < this.MIN_TRAINING_SAMPLES) {
      issues.push(`Dataset too small: ${dataset.metadata.datasetSize} samples (minimum: ${this.MIN_TRAINING_SAMPLES})`)
      recommendations.push('Collect more training data or reduce model complexity')
    }

    // Check feature consistency
    if (dataset.features.some(row => row.length !== dataset.metadata.featureCount)) {
      issues.push('Inconsistent feature count across samples')
      recommendations.push('Ensure all samples have the same number of features')
    }

    // Check label distribution
    const labelStats = this.calculateLabelStatistics(dataset.labels)
    if (labelStats.variance < 0.01) {
      issues.push('Labels have insufficient variance for meaningful training')
      recommendations.push('Ensure diverse outcomes in training data')
    }

    // Check for data quality
    if (dataset.metadata.dataQuality === 'poor') {
      issues.push('Poor data quality detected')
      recommendations.push('Review data preprocessing and feature engineering steps')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Calculate label statistics
   */
  private static calculateLabelStatistics(labels: number[]) {
    const mean = labels.reduce((sum, label) => sum + label, 0) / labels.length
    const variance = labels.reduce((sum, label) => sum + Math.pow(label - mean, 2), 0) / labels.length
    
    return { mean, variance, min: Math.min(...labels), max: Math.max(...labels) }
  }
}