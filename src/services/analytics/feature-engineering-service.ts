import { supabase } from '@/lib/supabase'
import { PreprocessedFeatures } from './data-preprocessing-service'

export interface DemographicFeatures {
  age_group: 'child' | 'adolescent' | 'young_adult'
  enrollment_duration_category: 'new' | 'established' | 'long_term'
  medical_complexity_level: 'low' | 'medium' | 'high'
  primary_diagnosis_category: string
  comorbidity_count: number
}

export interface TherapyProgressFeatures {
  session_completion_rate: number
  goal_achievement_velocity: number
  assessment_improvement_trend: 'improving' | 'stable' | 'declining'
  therapy_engagement_score: number
  intervention_response_pattern: 'responsive' | 'moderate' | 'resistant'
}

export interface BehavioralPatterns {
  attendance_consistency: number
  session_duration_preference: 'short' | 'standard' | 'extended'
  peak_performance_time: 'morning' | 'afternoon' | 'evening'
  social_interaction_level: number
  family_engagement_score: number
}

export interface RiskFactors {
  dropout_risk_score: number
  plan_modification_likelihood: number
  intervention_urgency_level: 'low' | 'medium' | 'high' | 'critical'
  external_support_adequacy: number
  resource_utilization_efficiency: number
}

export interface EngineeringResult {
  student_id: string
  demographic_features: DemographicFeatures
  progress_features: TherapyProgressFeatures
  behavioral_patterns: BehavioralPatterns
  risk_factors: RiskFactors
  composite_features: number[]
  feature_timestamp: Date
}

export class FeatureEngineeringService {
  /**
   * Engineer comprehensive features for a single student
   */
  static async engineerStudentFeatures(studentId: string): Promise<EngineeringResult | null> {
    try {
      const [
        studentData,
        sessionHistory,
        assessmentHistory,
        attendanceData,
        familyEngagement
      ] = await Promise.all([
        this.getStudentBaseData(studentId),
        this.getSessionHistory(studentId),
        this.getAssessmentHistory(studentId),
        this.getAttendanceData(studentId),
        this.getFamilyEngagementData(studentId)
      ])

      if (!studentData) return null

      const demographic = await this.engineerDemographicFeatures(studentData)
      const progress = await this.engineerProgressFeatures(studentData, sessionHistory, assessmentHistory)
      const behavioral = await this.engineerBehavioralPatterns(sessionHistory, attendanceData, familyEngagement)
      const risk = await this.engineerRiskFactors(studentData, sessionHistory, assessmentHistory, attendanceData)

      const compositeFeatures = this.createCompositeFeatures(demographic, progress, behavioral, risk)

      return {
        student_id: studentId,
        demographic_features: demographic,
        progress_features: progress,
        behavioral_patterns: behavioral,
        risk_factors: risk,
        composite_features: compositeFeatures,
        feature_timestamp: new Date()
      }
    } catch (error) {
      console.error('Error engineering student features:', error)
      throw new Error(`Failed to engineer features for student ${studentId}`)
    }
  }

  /**
   * Engineer features for multiple students in batch
   */
  static async engineerBatchFeatures(studentIds: string[]): Promise<EngineeringResult[]> {
    const results: EngineeringResult[] = []
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize)
      const batchPromises = batch.map(id => this.engineerStudentFeatures(id))
      const batchResults = await Promise.all(batchPromises)
      
      results.push(...batchResults.filter(result => result !== null) as EngineeringResult[])
    }

    return results
  }

  /**
   * Get student base data
   */
  private static async getStudentBaseData(studentId: string) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        date_of_birth,
        medical_records,
        created_at,
        student_enrollments (
          therapy_plan:therapy_plans (
            name,
            difficulty_level,
            duration_weeks,
            sessions_per_week
          )
        )
      `)
      .eq('id', studentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  /**
   * Get session history for student
   */
  private static async getSessionHistory(studentId: string) {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .select(`
        id,
        session_date,
        session_duration,
        attendance_status,
        session_goals,
        outcomes,
        therapist_notes,
        session_type,
        created_at
      `)
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(100) // Last 100 sessions

    if (error) throw error
    return data || []
  }

  /**
   * Get assessment history for student
   */
  private static async getAssessmentHistory(studentId: string) {
    const { data, error } = await supabase
      .from('student_assessments')
      .select(`
        id,
        assessment_type,
        score,
        assessment_date,
        assessor_notes,
        improvement_areas
      `)
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
      .limit(50) // Last 50 assessments

    if (error) throw error
    return data || []
  }

  /**
   * Get attendance data for student
   */
  private static async getAttendanceData(studentId: string) {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .select(`
        session_date,
        attendance_status,
        session_duration,
        session_time
      `)
      .eq('student_id', studentId)
      .not('attendance_status', 'is', null)
      .order('session_date', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  }

  /**
   * Get family engagement data
   */
  private static async getFamilyEngagementData(studentId: string) {
    // This would integrate with parent portal data when available
    // For now, return mock engagement metrics
    return {
      portal_login_frequency: 0.7,
      message_response_rate: 0.8,
      goal_review_participation: 0.6,
      home_exercise_compliance: 0.75
    }
  }

  /**
   * Engineer demographic-based features
   */
  private static async engineerDemographicFeatures(studentData: any): Promise<DemographicFeatures> {
    const age = this.calculateAge(studentData.date_of_birth)
    const enrollmentDuration = this.calculateEnrollmentDuration(studentData.created_at)
    const medicalComplexity = this.assessMedicalComplexity(studentData.medical_records)

    return {
      age_group: age < 13 ? 'child' : age < 18 ? 'adolescent' : 'young_adult',
      enrollment_duration_category: enrollmentDuration < 30 ? 'new' : 
                                   enrollmentDuration < 180 ? 'established' : 'long_term',
      medical_complexity_level: medicalComplexity < 0.3 ? 'low' : 
                               medicalComplexity < 0.7 ? 'medium' : 'high',
      primary_diagnosis_category: this.extractPrimaryDiagnosis(studentData.medical_records),
      comorbidity_count: this.countComorbidities(studentData.medical_records)
    }
  }

  /**
   * Engineer therapy progress features
   */
  private static async engineerProgressFeatures(
    studentData: any, 
    sessionHistory: any[], 
    assessmentHistory: any[]
  ): Promise<TherapyProgressFeatures> {
    const completionRate = this.calculateSessionCompletionRate(sessionHistory)
    const goalVelocity = this.calculateGoalAchievementVelocity(sessionHistory)
    const assessmentTrend = this.analyzeAssessmentTrend(assessmentHistory)
    const engagementScore = this.calculateTherapyEngagementScore(sessionHistory)
    const responsePattern = this.determineInterventionResponsePattern(sessionHistory, assessmentHistory)

    return {
      session_completion_rate: completionRate,
      goal_achievement_velocity: goalVelocity,
      assessment_improvement_trend: assessmentTrend,
      therapy_engagement_score: engagementScore,
      intervention_response_pattern: responsePattern
    }
  }

  /**
   * Engineer behavioral pattern features
   */
  private static async engineerBehavioralPatterns(
    sessionHistory: any[], 
    attendanceData: any[], 
    familyEngagement: any
  ): Promise<BehavioralPatterns> {
    const consistency = this.calculateAttendanceConsistency(attendanceData)
    const durationPreference = this.analyzeDurationPreference(sessionHistory)
    const peakTime = this.identifyPeakPerformanceTime(sessionHistory)
    const socialLevel = this.assessSocialInteractionLevel(sessionHistory)
    const familyScore = this.calculateFamilyEngagementScore(familyEngagement)

    return {
      attendance_consistency: consistency,
      session_duration_preference: durationPreference,
      peak_performance_time: peakTime,
      social_interaction_level: socialLevel,
      family_engagement_score: familyScore
    }
  }

  /**
   * Engineer risk factor features
   */
  private static async engineerRiskFactors(
    studentData: any,
    sessionHistory: any[],
    assessmentHistory: any[],
    attendanceData: any[]
  ): Promise<RiskFactors> {
    const dropoutRisk = this.calculateDropoutRiskScore(sessionHistory, attendanceData, assessmentHistory)
    const modificationLikelihood = this.assessPlanModificationLikelihood(sessionHistory, assessmentHistory)
    const urgencyLevel = this.determineInterventionUrgency(dropoutRisk, modificationLikelihood, attendanceData)
    const supportAdequacy = this.assessExternalSupportAdequacy(studentData, sessionHistory)
    const utilization = this.calculateResourceUtilizationEfficiency(sessionHistory)

    return {
      dropout_risk_score: dropoutRisk,
      plan_modification_likelihood: modificationLikelihood,
      intervention_urgency_level: urgencyLevel,
      external_support_adequacy: supportAdequacy,
      resource_utilization_efficiency: utilization
    }
  }

  /**
   * Create composite features from engineered features
   */
  private static createCompositeFeatures(
    demographic: DemographicFeatures,
    progress: TherapyProgressFeatures,
    behavioral: BehavioralPatterns,
    risk: RiskFactors
  ): number[] {
    return [
      // Age encoding
      demographic.age_group === 'child' ? 0.33 : 
      demographic.age_group === 'adolescent' ? 0.67 : 1.0,
      
      // Duration encoding
      demographic.enrollment_duration_category === 'new' ? 0.33 :
      demographic.enrollment_duration_category === 'established' ? 0.67 : 1.0,
      
      // Medical complexity
      demographic.medical_complexity_level === 'low' ? 0.25 :
      demographic.medical_complexity_level === 'medium' ? 0.5 : 
      demographic.medical_complexity_level === 'high' ? 1.0 : 0.75,
      
      // Comorbidity count (normalized)
      Math.min(demographic.comorbidity_count / 5.0, 1.0),
      
      // Progress metrics
      progress.session_completion_rate,
      progress.goal_achievement_velocity,
      progress.therapy_engagement_score,
      
      // Assessment trend encoding
      progress.assessment_improvement_trend === 'improving' ? 1.0 :
      progress.assessment_improvement_trend === 'stable' ? 0.5 : 0.0,
      
      // Response pattern encoding
      progress.intervention_response_pattern === 'responsive' ? 1.0 :
      progress.intervention_response_pattern === 'moderate' ? 0.5 : 0.0,
      
      // Behavioral patterns
      behavioral.attendance_consistency,
      behavioral.social_interaction_level,
      behavioral.family_engagement_score,
      
      // Duration preference encoding
      behavioral.session_duration_preference === 'short' ? 0.33 :
      behavioral.session_duration_preference === 'standard' ? 0.67 : 1.0,
      
      // Peak time encoding (0-1 based on optimal scheduling)
      behavioral.peak_performance_time === 'morning' ? 1.0 :
      behavioral.peak_performance_time === 'afternoon' ? 0.8 : 0.6,
      
      // Risk factors
      risk.dropout_risk_score,
      risk.plan_modification_likelihood,
      risk.external_support_adequacy,
      risk.resource_utilization_efficiency,
      
      // Urgency level encoding
      risk.intervention_urgency_level === 'critical' ? 1.0 :
      risk.intervention_urgency_level === 'high' ? 0.75 :
      risk.intervention_urgency_level === 'medium' ? 0.5 : 0.25
    ]
  }

  // Helper methods for feature calculations

  private static calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth)
    const now = new Date()
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  private static calculateEnrollmentDuration(createdAt: string): number {
    const enrollment = new Date(createdAt)
    const now = new Date()
    return Math.floor((now.getTime() - enrollment.getTime()) / (1000 * 60 * 60 * 24))
  }

  private static assessMedicalComplexity(medicalRecords: any): number {
    if (!medicalRecords) return 0
    
    let complexity = 0
    if (medicalRecords.diagnosis_codes) complexity += medicalRecords.diagnosis_codes.length * 0.2
    if (medicalRecords.medications) complexity += medicalRecords.medications.length * 0.1
    if (medicalRecords.allergies) complexity += medicalRecords.allergies.length * 0.05
    
    return Math.min(complexity, 1.0)
  }

  private static extractPrimaryDiagnosis(medicalRecords: any): string {
    if (!medicalRecords?.diagnosis_codes?.length) return 'unknown'
    return medicalRecords.diagnosis_codes[0].substring(0, 3) // ICD-10 category
  }

  private static countComorbidities(medicalRecords: any): number {
    return medicalRecords?.diagnosis_codes?.length || 0
  }

  private static calculateSessionCompletionRate(sessions: any[]): number {
    if (!sessions.length) return 0
    const attended = sessions.filter(s => s.attendance_status === 'present').length
    return attended / sessions.length
  }

  private static calculateGoalAchievementVelocity(sessions: any[]): number {
    if (!sessions.length) return 0
    
    const recentSessions = sessions.slice(0, 10) // Last 10 sessions
    const goalsAchieved = recentSessions
      .filter(s => s.outcomes?.goals_met)
      .reduce((sum, s) => sum + (s.outcomes.goals_met || 0), 0)
    
    return recentSessions.length > 0 ? goalsAchieved / recentSessions.length : 0
  }

  private static analyzeAssessmentTrend(assessments: any[]): 'improving' | 'stable' | 'declining' {
    if (assessments.length < 2) return 'stable'
    
    const recent = assessments.slice(0, 3)
    const older = assessments.slice(3, 6)
    
    const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, a) => sum + a.score, 0) / older.length : recentAvg
    
    const difference = recentAvg - olderAvg
    
    if (difference > 0.1) return 'improving'
    if (difference < -0.1) return 'declining'
    return 'stable'
  }

  private static calculateTherapyEngagementScore(sessions: any[]): number {
    if (!sessions.length) return 0
    
    const engagementFactors = sessions.map(session => {
      let score = 0.5 // Base score
      
      if (session.attendance_status === 'present') score += 0.3
      if (session.session_duration >= 45 * 60) score += 0.1 // 45+ minutes
      if (session.therapist_notes?.includes('engaged') || 
          session.therapist_notes?.includes('participated')) score += 0.1
      
      return Math.min(score, 1.0)
    })
    
    return engagementFactors.reduce((sum, score) => sum + score, 0) / engagementFactors.length
  }

  private static determineInterventionResponsePattern(
    sessions: any[], 
    assessments: any[]
  ): 'responsive' | 'moderate' | 'resistant' {
    const engagementScore = this.calculateTherapyEngagementScore(sessions)
    const assessmentTrend = this.analyzeAssessmentTrend(assessments)
    
    if (engagementScore > 0.7 && assessmentTrend === 'improving') return 'responsive'
    if (engagementScore < 0.4 || assessmentTrend === 'declining') return 'resistant'
    return 'moderate'
  }

  private static calculateAttendanceConsistency(attendanceData: any[]): number {
    if (!attendanceData.length) return 0
    
    // Calculate variance in attendance patterns
    const attendanceByWeek: { [week: string]: number } = {}
    
    attendanceData.forEach(session => {
      const weekKey = this.getWeekKey(session.session_date)
      attendanceByWeek[weekKey] = (attendanceByWeek[weekKey] || 0) + 
        (session.attendance_status === 'present' ? 1 : 0)
    })
    
    const weeklyRates = Object.values(attendanceByWeek)
    if (weeklyRates.length < 2) return 0.5
    
    const mean = weeklyRates.reduce((sum, rate) => sum + rate, 0) / weeklyRates.length
    const variance = weeklyRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / weeklyRates.length
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - Math.sqrt(variance) / mean)
  }

  private static getWeekKey(date: string): string {
    const d = new Date(date)
    const year = d.getFullYear()
    const week = Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
    return `${year}-W${week}`
  }

  private static analyzeDurationPreference(sessions: any[]): 'short' | 'standard' | 'extended' {
    if (!sessions.length) return 'standard'
    
    const avgDuration = sessions
      .filter(s => s.session_duration)
      .reduce((sum, s) => sum + s.session_duration, 0) / sessions.length
    
    if (avgDuration < 30 * 60) return 'short' // Less than 30 minutes
    if (avgDuration > 60 * 60) return 'extended' // More than 60 minutes
    return 'standard'
  }

  private static identifyPeakPerformanceTime(sessions: any[]): 'morning' | 'afternoon' | 'evening' {
    // This would analyze session outcomes by time of day
    // For now, return a reasonable default
    return 'morning'
  }

  private static assessSocialInteractionLevel(sessions: any[]): number {
    // This would analyze therapist notes for social interaction indicators
    // For now, return a moderate score
    return 0.6
  }

  private static calculateFamilyEngagementScore(engagement: any): number {
    const factors = [
      engagement.portal_login_frequency,
      engagement.message_response_rate,
      engagement.goal_review_participation,
      engagement.home_exercise_compliance
    ]
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length
  }

  private static calculateDropoutRiskScore(
    sessions: any[], 
    attendance: any[], 
    assessments: any[]
  ): number {
    let riskScore = 0
    
    // Attendance risk
    const recentAttendance = this.calculateSessionCompletionRate(attendance.slice(0, 10))
    if (recentAttendance < 0.7) riskScore += 0.3
    
    // Assessment trend risk
    const trend = this.analyzeAssessmentTrend(assessments)
    if (trend === 'declining') riskScore += 0.2
    
    // Engagement risk
    const engagement = this.calculateTherapyEngagementScore(sessions.slice(0, 10))
    if (engagement < 0.5) riskScore += 0.3
    
    // Session frequency risk
    const recentSessions = sessions.filter(s => 
      new Date(s.session_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    if (recentSessions.length < 4) riskScore += 0.2 // Less than weekly
    
    return Math.min(riskScore, 1.0)
  }

  private static assessPlanModificationLikelihood(sessions: any[], assessments: any[]): number {
    // Analyze patterns that suggest plan changes may be needed
    const stagnantProgress = this.analyzeAssessmentTrend(assessments) === 'stable'
    const lowEngagement = this.calculateTherapyEngagementScore(sessions) < 0.6
    
    let likelihood = 0
    if (stagnantProgress) likelihood += 0.4
    if (lowEngagement) likelihood += 0.3
    
    return Math.min(likelihood, 1.0)
  }

  private static determineInterventionUrgency(
    dropoutRisk: number, 
    modificationLikelihood: number, 
    attendance: any[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const recentAttendance = this.calculateSessionCompletionRate(attendance.slice(0, 5))
    const urgencyScore = dropoutRisk + modificationLikelihood + (1 - recentAttendance)
    
    if (urgencyScore > 2.0) return 'critical'
    if (urgencyScore > 1.5) return 'high'
    if (urgencyScore > 1.0) return 'medium'
    return 'low'
  }

  private static assessExternalSupportAdequacy(studentData: any, sessions: any[]): number {
    // This would analyze family involvement, support systems, etc.
    // For now, return a moderate score based on available data
    return 0.7
  }

  private static calculateResourceUtilizationEfficiency(sessions: any[]): number {
    if (!sessions.length) return 0
    
    const utilizedSessions = sessions.filter(s => 
      s.attendance_status === 'present' && s.session_duration >= 30 * 60
    )
    
    return utilizedSessions.length / sessions.length
  }
}