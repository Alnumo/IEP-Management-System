/**
 * Comprehensive Analytics Service
 * Handles all analytics, reporting, and dashboard functionality
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import type {
  StudentProgressSummary,
  GoalProgressMetrics,
  TherapyDomainProgress,
  AttendanceMetrics,
  AnalyticsDashboard,
  DashboardWidget,
  ProgressReport,
  ProgressComparison,
  ProgressPrediction
} from '@/types/progress-analytics'

export interface AnalyticsQuery {
  student_ids?: string[]
  therapist_ids?: string[]
  program_ids?: string[]
  date_range?: {
    start: string
    end: string
  }
  metrics?: string[]
  grouping?: string[]
  filters?: Record<string, any>
}

export interface AnalyticsResult {
  data: any[]
  metadata: {
    total_records: number
    date_range: { start: string; end: string }
    generated_at: string
    query_time_ms: number
  }
  insights: {
    key_findings: string[]
    recommendations: string[]
    trends: string[]
    alerts: string[]
  }
}

export interface ReportOptions {
  format: 'pdf' | 'html' | 'json' | 'csv'
  template: 'standard' | 'detailed' | 'summary' | 'custom'
  language: 'ar' | 'en' | 'both'
  include_charts: boolean
  include_raw_data: boolean
  delivery_method: 'download' | 'email' | 'portal'
  recipients?: string[]
}

class AnalyticsService {
  private static instance: AnalyticsService
  private cacheTimeout = 15 * 60 * 1000 // 15 minutes
  private cache = new Map<string, { data: any; timestamp: number }>()

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  // =====================================================
  // STUDENT PROGRESS ANALYTICS
  // =====================================================

  /**
   * Get comprehensive progress summary for a student
   */
  async getStudentProgressSummary(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<StudentProgressSummary> {
    try {
      const cacheKey = `student_progress_${studentId}_${periodStart}_${periodEnd}`
      const cached = this.getCachedData(cacheKey)
      if (cached) return cached

      // Get student basic info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      // Get therapy domains progress
      const therapyDomains = await this.getTherapyDomainsProgress(studentId, periodStart, periodEnd)

      // Get goal metrics
      const goalMetrics = await this.getGoalProgressMetrics(studentId, periodStart, periodEnd)

      // Get attendance metrics
      const attendanceMetrics = await this.getAttendanceMetrics(studentId, periodStart, periodEnd)

      // Get behavioral trends
      const behavioralTrends = await this.getBehavioralTrends(studentId, periodStart, periodEnd)

      // Get skill acquisition metrics
      const skillAcquisitionRate = await this.getSkillAcquisitionMetrics(studentId, periodStart, periodEnd)

      // Generate recommendations
      const recommendations = await this.generateProgressRecommendations(
        studentId,
        goalMetrics,
        attendanceMetrics,
        behavioralTrends
      )

      const progressSummary: StudentProgressSummary = {
        student_id: studentId,
        student_name: `${student.first_name_ar} ${student.last_name_ar}`,
        assessment_period: {
          start_date: periodStart,
          end_date: periodEnd
        },
        overall_progress_score: this.calculateOverallProgressScore(goalMetrics, attendanceMetrics),
        therapy_domains: therapyDomains,
        goal_metrics: goalMetrics,
        session_attendance: attendanceMetrics,
        behavioral_trends: behavioralTrends,
        skill_acquisition_rate: skillAcquisitionRate,
        recommendations: recommendations,
        next_review_date: this.calculateNextReviewDate(periodEnd)
      }

      this.setCachedData(cacheKey, progressSummary)
      return progressSummary

    } catch (error) {
      console.error('Error getting student progress summary:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'AnalyticsService',
        action: 'getStudentProgressSummary',
        metadata: { studentId, periodStart, periodEnd }
      })
      throw error
    }
  }

  /**
   * Get therapy domains progress for a student
   */
  async getTherapyDomainsProgress(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<TherapyDomainProgress[]> {
    try {
      const { data: domains, error } = await supabase
        .rpc('get_therapy_domains_progress', {
          p_student_id: studentId,
          p_start_date: periodStart,
          p_end_date: periodEnd
        })

      if (error) throw error

      return domains || []
    } catch (error) {
      console.error('Error getting therapy domains progress:', error)
      return []
    }
  }

  /**
   * Get goal progress metrics for a student
   */
  async getGoalProgressMetrics(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<GoalProgressMetrics[]> {
    try {
      const { data: goals, error } = await supabase
        .from('student_goals')
        .select(`
          *,
          progress_data:goal_progress_data(*),
          milestones:goal_milestones(*)
        `)
        .eq('student_id', studentId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)

      if (error) throw error

      return this.processGoalMetrics(goals || [])
    } catch (error) {
      console.error('Error getting goal progress metrics:', error)
      return []
    }
  }

  /**
   * Get attendance metrics for a student
   */
  async getAttendanceMetrics(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<AttendanceMetrics> {
    try {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', studentId)
        .gte('session_date', periodStart)
        .lte('session_date', periodEnd)

      if (error) throw error

      return this.calculateAttendanceMetrics(sessions || [], periodStart, periodEnd)
    } catch (error) {
      console.error('Error getting attendance metrics:', error)
      return this.getDefaultAttendanceMetrics()
    }
  }

  // =====================================================
  // DASHBOARD MANAGEMENT
  // =====================================================

  /**
   * Create a new analytics dashboard
   */
  async createDashboard(dashboard: Omit<AnalyticsDashboard, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .insert({
          ...dashboard,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) throw error

      console.log('📊 Analytics dashboard created:', data.id)
      return data.id
    } catch (error) {
      console.error('Error creating dashboard:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'AnalyticsService',
        action: 'createDashboard'
      })
      throw error
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string): Promise<AnalyticsDashboard | null> {
    try {
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting dashboard:', error)
      return null
    }
  }

  /**
   * Get dashboards for a user type
   */
  async getDashboardsByUserType(userType: string): Promise<AnalyticsDashboard[]> {
    try {
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('user_type', userType)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting dashboards by user type:', error)
      return []
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(dashboardId: string, updates: Partial<AnalyticsDashboard>): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_dashboards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', dashboardId)

      if (error) throw error

      console.log('📊 Dashboard updated:', dashboardId)
    } catch (error) {
      console.error('Error updating dashboard:', error)
      throw error
    }
  }

  /**
   * Get widget data
   */
  async getWidgetData(widget: DashboardWidget, filters?: Record<string, any>): Promise<any> {
    try {
      const cacheKey = `widget_${widget.id}_${JSON.stringify(filters)}`
      const cached = this.getCachedData(cacheKey)
      if (cached) return cached

      let data: any = null

      switch (widget.widget_type) {
        case 'chart':
          data = await this.getChartData(widget.data_config, filters)
          break
        case 'metric':
          data = await this.getMetricData(widget.data_config, filters)
          break
        case 'table':
          data = await this.getTableData(widget.data_config, filters)
          break
        case 'progress_bar':
          data = await this.getProgressData(widget.data_config, filters)
          break
        case 'gauge':
          data = await this.getGaugeData(widget.data_config, filters)
          break
        default:
          throw new Error(`Unsupported widget type: ${widget.widget_type}`)
      }

      this.setCachedData(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error getting widget data:', error)
      return null
    }
  }

  // =====================================================
  // REPORT GENERATION
  // =====================================================

  /**
   * Generate comprehensive progress report
   */
  async generateProgressReport(
    studentId: string,
    reportType: 'weekly' | 'monthly' | 'quarterly' | 'annual',
    options: ReportOptions = {
      format: 'pdf',
      template: 'standard',
      language: 'ar',
      include_charts: true,
      include_raw_data: false,
      delivery_method: 'download'
    }
  ): Promise<ProgressReport> {
    try {
      const periodDates = this.calculateReportPeriod(reportType)
      const progressSummary = await this.getStudentProgressSummary(
        studentId,
        periodDates.start,
        periodDates.end
      )

      const report: ProgressReport = {
        id: `report_${Date.now()}`,
        report_type: reportType,
        student_id: studentId,
        reporting_period: periodDates,
        executive_summary: await this.generateExecutiveSummary(progressSummary),
        progress_highlights: await this.extractProgressHighlights(progressSummary),
        areas_of_concern: await this.identifyAreasOfConcern(progressSummary),
        goal_status_summary: await this.createGoalStatusSummary(progressSummary.goal_metrics),
        behavioral_analysis: await this.generateBehavioralAnalysis(progressSummary.behavioral_trends),
        skill_development: await this.generateSkillDevelopmentReport(progressSummary),
        recommendations: progressSummary.recommendations,
        next_steps: await this.generateNextSteps(progressSummary),
        attachments: [],
        generated_at: new Date().toISOString(),
        generated_by: 'system'
      }

      // Save report to database
      await this.saveReport(report)

      console.log('📋 Progress report generated:', report.id)
      return report
    } catch (error) {
      console.error('Error generating progress report:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'AnalyticsService',
        action: 'generateProgressReport',
        metadata: { studentId, reportType }
      })
      throw error
    }
  }

  /**
   * Generate automated reports for all students
   */
  async generateAutomatedReports(
    reportType: 'weekly' | 'monthly' | 'quarterly',
    filters: { therapy_programs?: string[]; therapists?: string[] } = {}
  ): Promise<{ success: number; failed: number; reports: string[] }> {
    try {
      console.log(`🤖 Starting automated ${reportType} report generation...`)
      
      // Get eligible students
      let query = supabase
        .from('students')
        .select('id, first_name_ar, last_name_ar')
        .eq('status', 'active')

      if (filters.therapy_programs?.length) {
        query = query.in('therapy_program_id', filters.therapy_programs)
      }

      const { data: students, error } = await query

      if (error) throw error

      const results = {
        success: 0,
        failed: 0,
        reports: [] as string[]
      }

      // Generate reports for each student
      for (const student of students || []) {
        try {
          const report = await this.generateProgressReport(student.id, reportType)
          results.success++
          results.reports.push(report.id)
          
          // Send notification about report completion
          await this.notifyReportCompletion(student.id, report.id, reportType)
        } catch (error) {
          console.error(`Failed to generate report for student ${student.id}:`, error)
          results.failed++
        }
      }

      console.log(`📊 Automated report generation completed: ${results.success} success, ${results.failed} failed`)
      return results
    } catch (error) {
      console.error('Error in automated report generation:', error)
      throw error
    }
  }

  // =====================================================
  // COMPARATIVE ANALYTICS
  // =====================================================

  /**
   * Compare student progress across different periods
   */
  async compareProgress(
    studentId: string,
    baselinePeriod: { start: string; end: string },
    comparisonPeriod: { start: string; end: string },
    comparisonType: 'historical_self' | 'peer_group' = 'historical_self'
  ): Promise<ProgressComparison> {
    try {
      const baselineData = await this.getStudentProgressSummary(
        studentId,
        baselinePeriod.start,
        baselinePeriod.end
      )

      const comparisonData = await this.getStudentProgressSummary(
        studentId,
        comparisonPeriod.start,
        comparisonPeriod.end
      )

      return this.calculateProgressComparison(baselineData, comparisonData, comparisonType)
    } catch (error) {
      console.error('Error comparing progress:', error)
      throw error
    }
  }

  /**
   * Get peer group comparison data
   */
  async getPeerGroupComparison(
    studentId: string,
    criteria: {
      age_range?: [number, number]
      diagnosis_categories?: string[]
      therapy_programs?: string[]
      session_count_range?: [number, number]
    }
  ): Promise<ProgressComparison> {
    try {
      // Get peer group students matching criteria
      const peerStudents = await this.findPeerGroupStudents(studentId, criteria)
      
      // Get aggregate metrics for peer group
      const peerGroupMetrics = await this.calculatePeerGroupMetrics(peerStudents)
      
      // Get target student metrics
      const periodEnd = new Date().toISOString().split('T')[0]
      const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const studentMetrics = await this.getStudentProgressSummary(studentId, periodStart, periodEnd)

      return this.compareToPeerGroup(studentMetrics, peerGroupMetrics)
    } catch (error) {
      console.error('Error getting peer group comparison:', error)
      throw error
    }
  }

  // =====================================================
  // PREDICTIVE ANALYTICS
  // =====================================================

  /**
   * Predict progress trajectory for a student
   */
  async predictProgressTrajectory(
    studentId: string,
    goalId: string,
    timeHorizon: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<ProgressPrediction> {
    try {
      // Get historical progress data
      const historicalData = await this.getHistoricalProgressData(studentId, goalId)
      
      // Apply prediction algorithm
      const prediction = await this.applyPredictionModel(historicalData, timeHorizon)
      
      return prediction
    } catch (error) {
      console.error('Error predicting progress trajectory:', error)
      throw error
    }
  }

  /**
   * Identify at-risk students
   */
  async identifyAtRiskStudents(
    criteria: {
      progress_threshold?: number
      attendance_threshold?: number
      behavioral_concerns?: boolean
      goal_completion_rate?: number
    } = {}
  ): Promise<Array<{ student_id: string; risk_factors: string[]; risk_level: 'low' | 'medium' | 'high' | 'critical' }>> {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, first_name_ar, last_name_ar')
        .eq('status', 'active')

      if (error) throw error

      const atRiskStudents = []

      for (const student of students || []) {
        const riskAssessment = await this.assessStudentRisk(student.id, criteria)
        if (riskAssessment.risk_level !== 'low') {
          atRiskStudents.push({
            student_id: student.id,
            risk_factors: riskAssessment.risk_factors,
            risk_level: riskAssessment.risk_level
          })
        }
      }

      return atRiskStudents
    } catch (error) {
      console.error('Error identifying at-risk students:', error)
      return []
    }
  }

  // =====================================================
  // FINANCIAL ANALYTICS
  // =====================================================

  /**
   * Get financial analytics for therapy programs
   */
  async getFinancialAnalytics(
    dateRange: { start: string; end: string },
    filters: {
      therapy_programs?: string[]
      students?: string[]
      payment_status?: string[]
    } = {}
  ): Promise<any> {
    try {
      // This would integrate with billing system
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          *,
          student:students(*),
          therapy_program:therapy_programs(*)
        `)
        .gte('session_date', dateRange.start)
        .lte('session_date', dateRange.end)

      if (error) throw error

      return this.calculateFinancialMetrics(sessions || [], filters)
    } catch (error) {
      console.error('Error getting financial analytics:', error)
      throw error
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private getCachedData(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private processGoalMetrics(goals: any[]): GoalProgressMetrics[] {
    return goals.map(goal => ({
      goal_id: goal.id,
      goal_name: goal.goal_description,
      therapy_type: goal.therapy_type || 'aba',
      baseline_value: goal.baseline_value || 0,
      current_value: goal.current_value || 0,
      target_value: goal.target_value || 100,
      progress_percentage: this.calculateProgressPercentage(goal),
      trend: this.calculateTrend(goal.progress_data || []),
      velocity: this.calculateVelocity(goal.progress_data || []),
      data_points: this.processProgressDataPoints(goal.progress_data || []),
      milestones_achieved: goal.milestones || [],
      projected_completion_date: this.calculateProjectedCompletion(goal),
      status: goal.status || 'in_progress'
    }))
  }

  private calculateOverallProgressScore(
    goalMetrics: GoalProgressMetrics[],
    attendanceMetrics: AttendanceMetrics
  ): number {
    if (goalMetrics.length === 0) return 0

    const avgGoalProgress = goalMetrics.reduce((sum, goal) => sum + goal.progress_percentage, 0) / goalMetrics.length
    const attendanceScore = attendanceMetrics.attendance_percentage
    
    // Weight: 70% goal progress, 30% attendance
    return Math.round((avgGoalProgress * 0.7 + attendanceScore * 0.3))
  }

  private calculateAttendanceMetrics(sessions: any[], periodStart: string, periodEnd: string): AttendanceMetrics {
    const scheduled = sessions.length
    const attended = sessions.filter(s => s.status === 'completed').length
    const cancelled = sessions.filter(s => s.status === 'cancelled').length
    const makeup = sessions.filter(s => s.session_type?.includes('makeup')).length

    return {
      total_scheduled_sessions: scheduled,
      attended_sessions: attended,
      cancelled_sessions: cancelled,
      makeup_sessions: makeup,
      attendance_percentage: scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0,
      consistency_score: this.calculateConsistencyScore(sessions),
      attendance_trend: this.calculateAttendanceTrend(sessions),
      monthly_breakdown: this.calculateMonthlyBreakdown(sessions, periodStart, periodEnd)
    }
  }

  private getDefaultAttendanceMetrics(): AttendanceMetrics {
    return {
      total_scheduled_sessions: 0,
      attended_sessions: 0,
      cancelled_sessions: 0,
      makeup_sessions: 0,
      attendance_percentage: 0,
      consistency_score: 0,
      attendance_trend: 'stable',
      monthly_breakdown: []
    }
  }

  private calculateProgressPercentage(goal: any): number {
    if (!goal.target_value || goal.target_value === 0) return 0
    const progress = ((goal.current_value || 0) - (goal.baseline_value || 0)) / 
                    ((goal.target_value || 1) - (goal.baseline_value || 0))
    return Math.max(0, Math.min(100, Math.round(progress * 100)))
  }

  private calculateTrend(dataPoints: any[]): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable'
    
    const recent = dataPoints.slice(-5) // Last 5 data points
    const firstValue = recent[0]?.value || 0
    const lastValue = recent[recent.length - 1]?.value || 0
    
    const changeThreshold = 0.05 // 5% threshold
    const change = (lastValue - firstValue) / (firstValue || 1)
    
    if (change > changeThreshold) return 'improving'
    if (change < -changeThreshold) return 'declining'
    return 'stable'
  }

  private calculateVelocity(dataPoints: any[]): number {
    if (dataPoints.length < 2) return 0
    
    const recent = dataPoints.slice(-10) // Last 10 data points
    if (recent.length < 2) return 0
    
    const firstPoint = recent[0]
    const lastPoint = recent[recent.length - 1]
    
    const timeDiff = new Date(lastPoint.date).getTime() - new Date(firstPoint.date).getTime()
    const valueDiff = lastPoint.value - firstPoint.value
    const weeksDiff = timeDiff / (7 * 24 * 60 * 60 * 1000) // Convert to weeks
    
    return weeksDiff > 0 ? valueDiff / weeksDiff : 0
  }

  private processProgressDataPoints(dataPoints: any[]): any[] {
    return dataPoints.map(point => ({
      date: point.date,
      value: point.value,
      session_id: point.session_id,
      notes: point.notes,
      context: point.context
    }))
  }

  private calculateProjectedCompletion(goal: any): string | undefined {
    if (!goal.progress_data || goal.progress_data.length < 3) return undefined
    
    const velocity = this.calculateVelocity(goal.progress_data)
    if (velocity <= 0) return undefined
    
    const remainingProgress = (goal.target_value || 100) - (goal.current_value || 0)
    const weeksToComplete = remainingProgress / velocity
    
    const projectedDate = new Date()
    projectedDate.setDate(projectedDate.getDate() + (weeksToComplete * 7))
    
    return projectedDate.toISOString().split('T')[0]
  }

  private calculateConsistencyScore(sessions: any[]): number {
    // Implementation for consistency score calculation
    return 85 // Placeholder
  }

  private calculateAttendanceTrend(sessions: any[]): 'improving' | 'stable' | 'declining' {
    // Implementation for attendance trend calculation
    return 'stable' // Placeholder
  }

  private calculateMonthlyBreakdown(sessions: any[], periodStart: string, periodEnd: string): any[] {
    // Implementation for monthly breakdown
    return [] // Placeholder
  }

  // Additional helper methods would be implemented here...
}

export const analyticsService = AnalyticsService.getInstance()
export default analyticsService