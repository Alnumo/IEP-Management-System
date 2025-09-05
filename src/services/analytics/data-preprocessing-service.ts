import { supabase } from '@/lib/supabase'

export interface MLTrainingData {
  student_id: string
  enrollment_date: string
  medical_records: any
  total_sessions: number
  attendance_rate: number
  avg_assessment_score: number
  assessment_variety: number
  avg_session_hours: number
  goals_achieved: number
  dropout_events: number
  difficulty_level: string
  duration_weeks: number
  sessions_per_week: number
}

export interface PreprocessedFeatures {
  student_id: string
  demographic_features: number[]
  therapy_features: number[]
  progress_features: number[]
  engagement_features: number[]
  normalized_data: number[]
  feature_names: string[]
}

export class DataPreprocessingService {
  private static readonly FEATURE_NAMES = [
    'enrollment_age_days',
    'difficulty_level_encoded',
    'duration_weeks_normalized',
    'sessions_per_week_normalized',
    'total_sessions_normalized',
    'avg_assessment_score_normalized', 
    'assessment_variety_normalized',
    'goals_achieved_rate',
    'attendance_rate',
    'avg_session_hours_normalized',
    'medical_complexity_score'
  ]

  /**
   * Extract raw training data from database for ML pipeline
   */
  static async extractTrainingData(): Promise<MLTrainingData[]> {
    try {
      const { data, error } = await supabase
        .from('ml_training_data')
        .select('*')
        .order('enrollment_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error extracting training data:', error)
      throw new Error('Failed to extract ML training data')
    }
  }

  /**
   * Extract data for specific student predictions
   */
  static async extractStudentData(studentId: string): Promise<MLTrainingData | null> {
    try {
      const { data, error } = await supabase
        .from('ml_training_data')
        .select('*')
        .eq('student_id', studentId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Error extracting student data:', error)
      throw new Error(`Failed to extract data for student ${studentId}`)
    }
  }

  /**
   * Preprocess raw data into ML-ready features
   */
  static async preprocessFeatures(rawData: MLTrainingData[]): Promise<PreprocessedFeatures[]> {
    if (!rawData.length) return []

    // Calculate normalization constants
    const stats = this.calculateDataStatistics(rawData)

    return rawData.map(record => {
      const demographicFeatures = this.extractDemographicFeatures(record, stats)
      const therapyFeatures = this.extractTherapyFeatures(record, stats)
      const progressFeatures = this.extractProgressFeatures(record, stats)
      const engagementFeatures = this.extractEngagementFeatures(record, stats)

      const normalizedData = [
        ...demographicFeatures,
        ...therapyFeatures,
        ...progressFeatures,
        ...engagementFeatures
      ]

      return {
        student_id: record.student_id,
        demographic_features: demographicFeatures,
        therapy_features: therapyFeatures,
        progress_features: progressFeatures,
        engagement_features: engagementFeatures,
        normalized_data: normalizedData,
        feature_names: this.FEATURE_NAMES
      }
    })
  }

  /**
   * Preprocess single student data for real-time prediction
   */
  static async preprocessSingleStudent(studentId: string): Promise<PreprocessedFeatures | null> {
    try {
      const studentData = await this.extractStudentData(studentId)
      if (!studentData) return null

      // Get recent data for normalization context
      const recentData = await this.extractTrainingData()
      const contextData = recentData.slice(0, 100) // Use recent 100 records for normalization

      if (!contextData.length) {
        throw new Error('Insufficient data for feature normalization')
      }

      const stats = this.calculateDataStatistics([studentData, ...contextData])
      const preprocessed = await this.preprocessFeatures([studentData])
      
      return preprocessed[0] || null
    } catch (error) {
      console.error('Error preprocessing single student:', error)
      throw error
    }
  }

  /**
   * Calculate statistical measures for normalization
   */
  private static calculateDataStatistics(data: MLTrainingData[]) {
    const values = {
      total_sessions: data.map(d => d.total_sessions).filter(v => v != null),
      avg_assessment_score: data.map(d => d.avg_assessment_score).filter(v => v != null),
      assessment_variety: data.map(d => d.assessment_variety).filter(v => v != null),
      avg_session_hours: data.map(d => d.avg_session_hours).filter(v => v != null),
      duration_weeks: data.map(d => d.duration_weeks).filter(v => v != null),
      sessions_per_week: data.map(d => d.sessions_per_week).filter(v => v != null)
    }

    return {
      total_sessions: { 
        mean: this.mean(values.total_sessions), 
        std: this.standardDeviation(values.total_sessions)
      },
      avg_assessment_score: { 
        mean: this.mean(values.avg_assessment_score), 
        std: this.standardDeviation(values.avg_assessment_score)
      },
      assessment_variety: { 
        mean: this.mean(values.assessment_variety), 
        std: this.standardDeviation(values.assessment_variety)
      },
      avg_session_hours: { 
        mean: this.mean(values.avg_session_hours), 
        std: this.standardDeviation(values.avg_session_hours)
      },
      duration_weeks: { 
        mean: this.mean(values.duration_weeks), 
        std: this.standardDeviation(values.duration_weeks)
      },
      sessions_per_week: { 
        mean: this.mean(values.sessions_per_week), 
        std: this.standardDeviation(values.sessions_per_week)
      }
    }
  }

  /**
   * Extract demographic-based features
   */
  private static extractDemographicFeatures(record: MLTrainingData, stats: any): number[] {
    const enrollmentAge = this.daysSinceEnrollment(record.enrollment_date)

    return [
      this.normalize(enrollmentAge, 0, 730) // Normalize to 2-year max
    ]
  }

  /**
   * Extract therapy program features
   */
  private static extractTherapyFeatures(record: MLTrainingData, stats: any): number[] {
    const difficultyEncoded = this.encodeDifficultyLevel(record.difficulty_level)
    const durationNormalized = this.zScoreNormalize(record.duration_weeks, stats.duration_weeks)
    const frequencyNormalized = this.zScoreNormalize(record.sessions_per_week, stats.sessions_per_week)

    return [
      difficultyEncoded,
      durationNormalized,
      frequencyNormalized
    ]
  }

  /**
   * Extract progress and outcome features
   */
  private static extractProgressFeatures(record: MLTrainingData, stats: any): number[] {
    const sessionsNormalized = this.zScoreNormalize(record.total_sessions, stats.total_sessions)
    const assessmentNormalized = this.zScoreNormalize(record.avg_assessment_score, stats.avg_assessment_score)
    const assessmentVarietyNormalized = this.zScoreNormalize(record.assessment_variety, stats.assessment_variety)
    const goalsAchievedRate = record.total_sessions > 0 ? record.goals_achieved / record.total_sessions : 0

    return [
      sessionsNormalized,
      assessmentNormalized,
      assessmentVarietyNormalized,
      goalsAchievedRate
    ]
  }

  /**
   * Extract engagement and attendance features
   */
  private static extractEngagementFeatures(record: MLTrainingData, stats: any): number[] {
    const attendanceRate = Math.max(0, Math.min(1, record.attendance_rate || 0))
    const sessionHoursNormalized = this.zScoreNormalize(record.avg_session_hours, stats.avg_session_hours)
    const medicalComplexity = this.calculateMedicalComplexityScore(record.medical_records)

    return [
      attendanceRate,
      sessionHoursNormalized,
      medicalComplexity
    ]
  }

  /**
   * Calculate medical complexity score from medical records
   */
  private static calculateMedicalComplexityScore(medicalRecords: any): number {
    if (!medicalRecords) return 0

    let complexity = 0
    
    // Count diagnosis codes (higher count = more complex)
    if (medicalRecords.diagnosis_codes && Array.isArray(medicalRecords.diagnosis_codes)) {
      complexity += Math.min(medicalRecords.diagnosis_codes.length * 0.2, 0.6)
    }

    // Factor in medications
    if (medicalRecords.medications && Array.isArray(medicalRecords.medications)) {
      complexity += Math.min(medicalRecords.medications.length * 0.1, 0.3)
    }

    // Factor in allergies
    if (medicalRecords.allergies && Array.isArray(medicalRecords.allergies)) {
      complexity += Math.min(medicalRecords.allergies.length * 0.05, 0.1)
    }

    return Math.min(complexity, 1.0) // Cap at 1.0
  }

  /**
   * Encode difficulty level as numeric value
   */
  private static encodeDifficultyLevel(difficulty: string): number {
    const mapping: { [key: string]: number } = {
      'beginner': 0.2,
      'intermediate': 0.5,
      'advanced': 0.8,
      'complex': 1.0
    }
    return mapping[difficulty?.toLowerCase()] || 0.5
  }

  /**
   * Calculate days since enrollment
   */
  private static daysSinceEnrollment(enrollmentDate: string): number {
    const enrollment = new Date(enrollmentDate)
    const now = new Date()
    return Math.floor((now.getTime() - enrollment.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Normalize value to [0, 1] range
   */
  private static normalize(value: number, min: number, max: number): number {
    if (max === min) return 0
    return Math.max(0, Math.min(1, (value - min) / (max - min)))
  }

  /**
   * Z-score normalization
   */
  private static zScoreNormalize(value: number, stats: { mean: number; std: number }): number {
    if (stats.std === 0) return 0
    return (value - stats.mean) / stats.std
  }

  /**
   * Calculate mean of array
   */
  private static mean(values: number[]): number {
    if (!values.length) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Calculate standard deviation of array
   */
  private static standardDeviation(values: number[]): number {
    if (values.length < 2) return 1
    const avg = this.mean(values)
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2))
    return Math.sqrt(this.mean(squaredDiffs))
  }

  /**
   * Validate preprocessed data quality
   */
  static validatePreprocessedData(features: PreprocessedFeatures[]): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    if (!features.length) {
      issues.push('No preprocessed features found')
      return { isValid: false, issues }
    }

    features.forEach((feature, index) => {
      // Check for NaN values
      if (feature.normalized_data.some(val => isNaN(val))) {
        issues.push(`Student ${feature.student_id}: Contains NaN values`)
      }

      // Check for infinite values
      if (feature.normalized_data.some(val => !isFinite(val))) {
        issues.push(`Student ${feature.student_id}: Contains infinite values`)
      }

      // Check expected feature count
      if (feature.normalized_data.length !== this.FEATURE_NAMES.length) {
        issues.push(`Student ${feature.student_id}: Feature count mismatch`)
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}