import { EngineeringResult } from '@/services/analytics/feature-engineering-service'

export interface RiskScore {
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskComponents: {
    attendanceRisk: number
    progressRisk: number
    engagementRisk: number
    medicalComplexityRisk: number
    familySupportRisk: number
  }
  interventionRecommendations: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  alertTriggers: {
    shouldAlert: boolean
    alertLevel: 'info' | 'warning' | 'critical'
    alertMessage: {
      ar: string
      en: string
    }
  }
}

export interface RiskThresholds {
  attendance: {
    critical: number
    high: number
    medium: number
  }
  progress: {
    critical: number
    high: number
    medium: number
  }
  engagement: {
    critical: number
    high: number
    medium: number
  }
  overall: {
    critical: number
    high: number
    medium: number
  }
}

export class RiskScoringEngine {
  private static readonly DEFAULT_THRESHOLDS: RiskThresholds = {
    attendance: {
      critical: 0.3,
      high: 0.5,
      medium: 0.7
    },
    progress: {
      critical: 0.2,
      high: 0.4,
      medium: 0.6
    },
    engagement: {
      critical: 0.25,
      high: 0.45,
      medium: 0.65
    },
    overall: {
      critical: 0.8,
      high: 0.6,
      medium: 0.4
    }
  }

  /**
   * Calculate comprehensive risk score for a student
   */
  static calculateRiskScore(
    features: EngineeringResult,
    thresholds: RiskThresholds = this.DEFAULT_THRESHOLDS
  ): RiskScore {
    // Calculate individual risk components
    const attendanceRisk = this.calculateAttendanceRisk(features)
    const progressRisk = this.calculateProgressRisk(features)
    const engagementRisk = this.calculateEngagementRisk(features)
    const medicalComplexityRisk = this.calculateMedicalComplexityRisk(features)
    const familySupportRisk = this.calculateFamilySupportRisk(features)

    // Calculate weighted overall risk score
    const overallRiskScore = this.calculateWeightedRiskScore({
      attendanceRisk,
      progressRisk,
      engagementRisk,
      medicalComplexityRisk,
      familySupportRisk
    })

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallRiskScore, thresholds)

    // Generate intervention recommendations
    const interventionRecommendations = this.generateInterventionRecommendations(
      riskLevel,
      { attendanceRisk, progressRisk, engagementRisk, medicalComplexityRisk, familySupportRisk }
    )

    // Generate alert triggers
    const alertTriggers = this.generateAlertTriggers(riskLevel, overallRiskScore, features)

    return {
      overallRiskScore,
      riskLevel,
      riskComponents: {
        attendanceRisk,
        progressRisk,
        engagementRisk,
        medicalComplexityRisk,
        familySupportRisk
      },
      interventionRecommendations,
      alertTriggers
    }
  }

  /**
   * Calculate attendance-based risk score
   */
  private static calculateAttendanceRisk(features: EngineeringResult): number {
    const { attendance_consistency } = features.behavioral_patterns
    
    // Invert consistency score to get risk score
    let attendanceRisk = 1 - attendance_consistency

    // Additional factors from composite features
    const attendanceRateFeature = features.composite_features[9] // attendance_consistency in composite
    if (attendanceRateFeature < 0.5) {
      attendanceRisk += 0.2 // Penalty for low attendance rate
    }

    return Math.min(attendanceRisk, 1.0)
  }

  /**
   * Calculate progress-based risk score
   */
  private static calculateProgressRisk(features: EngineeringResult): number {
    const { session_completion_rate, goal_achievement_velocity, assessment_improvement_trend } = features.progress_features

    let progressRisk = 0

    // Session completion risk
    if (session_completion_rate < 0.5) {
      progressRisk += 0.4
    } else if (session_completion_rate < 0.7) {
      progressRisk += 0.2
    }

    // Goal achievement risk
    if (goal_achievement_velocity < 0.3) {
      progressRisk += 0.3
    } else if (goal_achievement_velocity < 0.6) {
      progressRisk += 0.1
    }

    // Assessment trend risk
    if (assessment_improvement_trend === 'declining') {
      progressRisk += 0.3
    } else if (assessment_improvement_trend === 'stable') {
      progressRisk += 0.1
    }

    return Math.min(progressRisk, 1.0)
  }

  /**
   * Calculate engagement-based risk score
   */
  private static calculateEngagementRisk(features: EngineeringResult): number {
    const { therapy_engagement_score, social_interaction_level, family_engagement_score } = features.behavioral_patterns
    const { intervention_response_pattern } = features.progress_features

    let engagementRisk = 0

    // Therapy engagement risk
    engagementRisk += (1 - therapy_engagement_score) * 0.4

    // Social interaction risk
    engagementRisk += (1 - social_interaction_level) * 0.2

    // Family engagement risk
    engagementRisk += (1 - family_engagement_score) * 0.3

    // Response pattern risk
    if (intervention_response_pattern === 'resistant') {
      engagementRisk += 0.1
    }

    return Math.min(engagementRisk, 1.0)
  }

  /**
   * Calculate medical complexity risk score
   */
  private static calculateMedicalComplexityRisk(features: EngineeringResult): number {
    const { medical_complexity_level, comorbidity_count } = features.demographic_features

    let medicalRisk = 0

    // Base risk from medical complexity
    switch (medical_complexity_level) {
      case 'high':
        medicalRisk += 0.6
        break
      case 'medium':
        medicalRisk += 0.3
        break
      case 'low':
        medicalRisk += 0.1
        break
    }

    // Additional risk from comorbidities
    if (comorbidity_count > 3) {
      medicalRisk += 0.2
    } else if (comorbidity_count > 1) {
      medicalRisk += 0.1
    }

    return Math.min(medicalRisk, 1.0)
  }

  /**
   * Calculate family support risk score
   */
  private static calculateFamilySupportRisk(features: EngineeringResult): number {
    const { family_engagement_score } = features.behavioral_patterns
    const { external_support_adequacy } = features.risk_factors

    // Combine family engagement and external support
    const familyRisk = (1 - family_engagement_score) * 0.6 + (1 - external_support_adequacy) * 0.4

    return Math.min(familyRisk, 1.0)
  }

  /**
   * Calculate weighted overall risk score
   */
  private static calculateWeightedRiskScore(components: {
    attendanceRisk: number
    progressRisk: number
    engagementRisk: number
    medicalComplexityRisk: number
    familySupportRisk: number
  }): number {
    const weights = {
      attendance: 0.25,
      progress: 0.30,
      engagement: 0.25,
      medical: 0.10,
      family: 0.10
    }

    const weightedScore = 
      components.attendanceRisk * weights.attendance +
      components.progressRisk * weights.progress +
      components.engagementRisk * weights.engagement +
      components.medicalComplexityRisk * weights.medical +
      components.familySupportRisk * weights.family

    return Math.min(weightedScore, 1.0)
  }

  /**
   * Determine risk level based on overall score
   */
  private static determineRiskLevel(score: number, thresholds: RiskThresholds): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= thresholds.overall.critical) return 'critical'
    if (score >= thresholds.overall.high) return 'high'
    if (score >= thresholds.overall.medium) return 'medium'
    return 'low'
  }

  /**
   * Generate intervention recommendations based on risk assessment
   */
  private static generateInterventionRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    riskComponents: {
      attendanceRisk: number
      progressRisk: number
      engagementRisk: number
      medicalComplexityRisk: number
      familySupportRisk: number
    }
  ): {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  } {
    const immediate: string[] = []
    const shortTerm: string[] = []
    const longTerm: string[] = []

    // Immediate interventions based on critical risks
    if (riskLevel === 'critical') {
      immediate.push('Schedule immediate case review meeting')
      immediate.push('Contact family for urgent consultation')
      
      if (riskComponents.attendanceRisk > 0.8) {
        immediate.push('Implement attendance recovery plan')
      }
      
      if (riskComponents.progressRisk > 0.8) {
        immediate.push('Reassess therapy goals and methods')
      }
    }

    // High risk immediate actions
    if (riskLevel === 'high' || riskLevel === 'critical') {
      if (riskComponents.engagementRisk > 0.6) {
        immediate.push('Schedule therapist consultation to improve engagement')
      }
      
      if (riskComponents.familySupportRisk > 0.6) {
        immediate.push('Arrange family support meeting')
      }
    }

    // Short-term interventions
    if (riskLevel !== 'low') {
      if (riskComponents.attendanceRisk > 0.5) {
        shortTerm.push('Implement attendance monitoring system')
        shortTerm.push('Consider flexible scheduling options')
      }

      if (riskComponents.progressRisk > 0.5) {
        shortTerm.push('Review and adjust therapy plan')
        shortTerm.push('Increase session frequency if needed')
      }

      if (riskComponents.engagementRisk > 0.5) {
        shortTerm.push('Introduce motivation enhancement strategies')
        shortTerm.push('Consider therapy approach modifications')
      }
    }

    // Long-term interventions
    if (riskComponents.medicalComplexityRisk > 0.4) {
      longTerm.push('Coordinate with medical team for comprehensive care')
      longTerm.push('Consider specialized therapy approaches')
    }

    if (riskComponents.familySupportRisk > 0.4) {
      longTerm.push('Implement family education program')
      longTerm.push('Establish regular family progress meetings')
    }

    // General long-term strategies for medium+ risk
    if (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical') {
      longTerm.push('Establish regular progress monitoring checkpoints')
      longTerm.push('Consider peer support group participation')
    }

    return { immediate, shortTerm, longTerm }
  }

  /**
   * Generate alert triggers and messages
   */
  private static generateAlertTriggers(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    overallRiskScore: number,
    features: EngineeringResult
  ): {
    shouldAlert: boolean
    alertLevel: 'info' | 'warning' | 'critical'
    alertMessage: { ar: string; en: string }
  } {
    const shouldAlert = riskLevel !== 'low'
    
    let alertLevel: 'info' | 'warning' | 'critical'
    if (riskLevel === 'critical') alertLevel = 'critical'
    else if (riskLevel === 'high') alertLevel = 'critical'
    else if (riskLevel === 'medium') alertLevel = 'warning'
    else alertLevel = 'info'

    // Generate localized alert messages
    const alertMessage = {
      ar: this.generateArabicAlertMessage(riskLevel, overallRiskScore, features),
      en: this.generateEnglishAlertMessage(riskLevel, overallRiskScore, features)
    }

    return { shouldAlert, alertLevel, alertMessage }
  }

  /**
   * Generate Arabic alert message
   */
  private static generateArabicAlertMessage(
    riskLevel: string,
    score: number,
    features: EngineeringResult
  ): string {
    const studentName = features.student_id.substring(0, 8) // Use partial ID for privacy
    const scorePercent = (score * 100).toFixed(0)

    switch (riskLevel) {
      case 'critical':
        return `تحذير عاجل: الطالب ${studentName} يواجه مخاطر عالية لانقطاع العلاج (${scorePercent}%). يتطلب تدخل فوري.`
      case 'high':
        return `تحذير: الطالب ${studentName} يواجه مخاطر عالية (${scorePercent}%). يُنصح بالمتابعة المكثفة.`
      case 'medium':
        return `تنبيه: الطالب ${studentName} يواجه مخاطر متوسطة (${scorePercent}%). يُنصح بالمراقبة الإضافية.`
      default:
        return `معلومات: الطالب ${studentName} يواصل العلاج بشكل مناسب (${scorePercent}%).`
    }
  }

  /**
   * Generate English alert message
   */
  private static generateEnglishAlertMessage(
    riskLevel: string,
    score: number,
    features: EngineeringResult
  ): string {
    const studentName = features.student_id.substring(0, 8) // Use partial ID for privacy
    const scorePercent = (score * 100).toFixed(0)

    switch (riskLevel) {
      case 'critical':
        return `URGENT: Student ${studentName} at critical risk for therapy discontinuation (${scorePercent}%). Immediate intervention required.`
      case 'high':
        return `WARNING: Student ${studentName} at high risk (${scorePercent}%). Intensive monitoring recommended.`
      case 'medium':
        return `ALERT: Student ${studentName} at moderate risk (${scorePercent}%). Additional monitoring advised.`
      default:
        return `INFO: Student ${studentName} maintaining appropriate therapy progress (${scorePercent}%).`
    }
  }

  /**
   * Calculate risk trend over time
   */
  static calculateRiskTrend(
    currentScore: RiskScore,
    historicalScores: RiskScore[]
  ): {
    trend: 'improving' | 'stable' | 'worsening'
    trendStrength: number
    recommendation: string
  } {
    if (historicalScores.length < 2) {
      return {
        trend: 'stable',
        trendStrength: 0,
        recommendation: 'Insufficient historical data for trend analysis'
      }
    }

    const recentScores = [currentScore, ...historicalScores.slice(0, 4)]
      .map(score => score.overallRiskScore)

    // Calculate trend using linear regression
    const n = recentScores.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = recentScores

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const trendStrength = Math.abs(slope)

    let trend: 'improving' | 'stable' | 'worsening'
    if (slope > 0.05) trend = 'worsening'
    else if (slope < -0.05) trend = 'improving'
    else trend = 'stable'

    let recommendation: string
    switch (trend) {
      case 'improving':
        recommendation = 'Risk is decreasing. Continue current interventions and monitor progress.'
        break
      case 'worsening':
        recommendation = 'Risk is increasing. Review and intensify intervention strategies.'
        break
      default:
        recommendation = 'Risk is stable. Maintain current monitoring and intervention approach.'
    }

    return { trend, trendStrength, recommendation }
  }

  /**
   * Validate risk scoring inputs
   */
  static validateRiskInputs(features: EngineeringResult): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // Validate demographic features
    if (!features.demographic_features) {
      issues.push('Missing demographic features')
    }

    // Validate progress features
    if (!features.progress_features) {
      issues.push('Missing progress features')
    } else {
      const { session_completion_rate, goal_achievement_velocity } = features.progress_features
      if (isNaN(session_completion_rate) || session_completion_rate < 0 || session_completion_rate > 1) {
        issues.push('Invalid session completion rate')
      }
      if (isNaN(goal_achievement_velocity) || goal_achievement_velocity < 0) {
        issues.push('Invalid goal achievement velocity')
      }
    }

    // Validate behavioral patterns
    if (!features.behavioral_patterns) {
      issues.push('Missing behavioral patterns')
    } else {
      const { attendance_consistency, family_engagement_score } = features.behavioral_patterns
      if (isNaN(attendance_consistency) || attendance_consistency < 0 || attendance_consistency > 1) {
        issues.push('Invalid attendance consistency')
      }
      if (isNaN(family_engagement_score) || family_engagement_score < 0 || family_engagement_score > 1) {
        issues.push('Invalid family engagement score')
      }
    }

    // Validate composite features
    if (!features.composite_features || features.composite_features.length === 0) {
      issues.push('Missing composite features')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}