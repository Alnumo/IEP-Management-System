/**
 * Service Hour Tracking Service
 * خدمة تتبع ساعات الخدمة
 * 
 * @description Comprehensive service hour tracking and validation system for IDEA 2024 compliance
 * يوفر نظام شامل لتتبع والتحقق من ساعات الخدمة وفقاً لمعايير IDEA 2024
 */

import { createClient } from '@supabase/supabase-js'
import { 
  ServiceDeliverySession, 
  ServiceSessionFormData,
  ServiceHourSummary,
  ServiceComplianceCalculation,
  ComplianceStatus,
  SessionStatus,
  SummaryPeriodType,
  ServiceSessionFilters,
  ComplianceThresholds,
  ServiceTrackingStats,
  CreateComplianceAlertData,
  ServiceComplianceAlert,
  AlertType,
  AlertPriority
} from '@/types/service-tracking'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =============================================================================
// COMPLIANCE CONFIGURATION
// =============================================================================

export const DEFAULT_COMPLIANCE_THRESHOLDS: ComplianceThresholds = {
  compliant_minimum: 90, // >= 90%
  at_risk_minimum: 70, // >= 70%
  alert_threshold: 70, // < 70%
  critical_threshold: 50, // < 50%
  makeup_session_threshold_days: 7, // 7 days
  documentation_deadline_days: 3, // 3 days
}

// =============================================================================
// SERVICE SESSION MANAGEMENT
// =============================================================================

export class ServiceHourTrackingService {
  /**
   * Create a new service delivery session
   * إنشاء جلسة تقديم خدمة جديدة
   */
  static async createSession(
    serviceId: string,
    studentId: string,
    sessionData: ServiceSessionFormData
  ): Promise<ServiceDeliverySession> {
    try {
      const sessionRecord = {
        service_id: serviceId,
        student_id: studentId,
        session_date: sessionData.session_date.toISOString().split('T')[0],
        session_time: sessionData.session_time,
        planned_duration_minutes: sessionData.planned_duration_minutes,
        actual_duration_minutes: sessionData.actual_duration_minutes,
        provider_id: sessionData.provider_id,
        provider_name: sessionData.provider_name,
        actual_location: sessionData.actual_location,
        location_notes_ar: sessionData.location_notes_ar,
        location_notes_en: sessionData.location_notes_en,
        session_status: sessionData.session_status,
        cancellation_reason_ar: sessionData.cancellation_reason_ar,
        cancellation_reason_en: sessionData.cancellation_reason_en,
        services_delivered_ar: sessionData.services_delivered_ar,
        services_delivered_en: sessionData.services_delivered_en,
        session_objectives_met: sessionData.session_objectives_met,
        student_engagement_level: sessionData.student_engagement_level,
        progress_notes_ar: sessionData.progress_notes_ar,
        progress_notes_en: sessionData.progress_notes_en,
        behavioral_observations_ar: sessionData.behavioral_observations_ar,
        behavioral_observations_en: sessionData.behavioral_observations_en,
        goals_addressed: sessionData.goals_addressed,
        billable_session: sessionData.billable_session,
        billing_code: sessionData.billing_code,
        session_documented: true,
        documentation_complete: this.isSessionDocumentationComplete(sessionData),
        requires_makeup_session: sessionData.session_status === 'cancelled' || sessionData.session_status === 'no_show',
      }

      const { data, error } = await supabase
        .from('service_delivery_sessions')
        .insert([sessionRecord])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`)
      }

      // Trigger compliance calculation update
      await this.updateServiceHourSummary(serviceId, studentId)

      return data as ServiceDeliverySession
    } catch (error) {
      console.error('Error creating service session:', error)
      throw error
    }
  }

  /**
   * Update an existing service delivery session
   * تحديث جلسة تقديم خدمة موجودة
   */
  static async updateSession(
    sessionId: string,
    sessionData: Partial<ServiceSessionFormData>
  ): Promise<ServiceDeliverySession> {
    try {
      const updateData: Partial<ServiceDeliverySession> = {}

      // Map form data to database fields
      if (sessionData.session_date) {
        updateData.session_date = sessionData.session_date.toISOString().split('T')[0]
      }
      if (sessionData.session_time !== undefined) updateData.session_time = sessionData.session_time
      if (sessionData.planned_duration_minutes !== undefined) updateData.planned_duration_minutes = sessionData.planned_duration_minutes
      if (sessionData.actual_duration_minutes !== undefined) updateData.actual_duration_minutes = sessionData.actual_duration_minutes
      if (sessionData.provider_id !== undefined) updateData.provider_id = sessionData.provider_id
      if (sessionData.provider_name !== undefined) updateData.provider_name = sessionData.provider_name
      if (sessionData.actual_location !== undefined) updateData.actual_location = sessionData.actual_location
      if (sessionData.location_notes_ar !== undefined) updateData.location_notes_ar = sessionData.location_notes_ar
      if (sessionData.location_notes_en !== undefined) updateData.location_notes_en = sessionData.location_notes_en
      if (sessionData.session_status !== undefined) updateData.session_status = sessionData.session_status
      if (sessionData.cancellation_reason_ar !== undefined) updateData.cancellation_reason_ar = sessionData.cancellation_reason_ar
      if (sessionData.cancellation_reason_en !== undefined) updateData.cancellation_reason_en = sessionData.cancellation_reason_en
      if (sessionData.services_delivered_ar !== undefined) updateData.services_delivered_ar = sessionData.services_delivered_ar
      if (sessionData.services_delivered_en !== undefined) updateData.services_delivered_en = sessionData.services_delivered_en
      if (sessionData.session_objectives_met !== undefined) updateData.session_objectives_met = sessionData.session_objectives_met
      if (sessionData.student_engagement_level !== undefined) updateData.student_engagement_level = sessionData.student_engagement_level
      if (sessionData.progress_notes_ar !== undefined) updateData.progress_notes_ar = sessionData.progress_notes_ar
      if (sessionData.progress_notes_en !== undefined) updateData.progress_notes_en = sessionData.progress_notes_en
      if (sessionData.behavioral_observations_ar !== undefined) updateData.behavioral_observations_ar = sessionData.behavioral_observations_ar
      if (sessionData.behavioral_observations_en !== undefined) updateData.behavioral_observations_en = sessionData.behavioral_observations_en
      if (sessionData.goals_addressed !== undefined) updateData.goals_addressed = sessionData.goals_addressed
      if (sessionData.billable_session !== undefined) updateData.billable_session = sessionData.billable_session
      if (sessionData.billing_code !== undefined) updateData.billing_code = sessionData.billing_code

      // Update documentation completion status
      if (Object.keys(updateData).length > 0) {
        updateData.documentation_complete = this.isSessionDocumentationComplete(sessionData)
        updateData.updated_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_delivery_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update session: ${error.message}`)
      }

      // Trigger compliance calculation update
      if (data) {
        await this.updateServiceHourSummary(data.service_id, data.student_id)
      }

      return data as ServiceDeliverySession
    } catch (error) {
      console.error('Error updating service session:', error)
      throw error
    }
  }

  /**
   * Get service delivery sessions with filtering
   * الحصول على جلسات تقديم الخدمة مع التصفية
   */
  static async getServiceSessions(
    filters: ServiceSessionFilters = {}
  ): Promise<ServiceDeliverySession[]> {
    try {
      let query = supabase
        .from('service_delivery_sessions')
        .select('*')

      // Apply filters
      if (filters.service_id) {
        query = query.eq('service_id', filters.service_id)
      }
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters.provider_id) {
        query = query.eq('provider_id', filters.provider_id)
      }
      if (filters.session_status && filters.session_status.length > 0) {
        query = query.in('session_status', filters.session_status)
      }
      if (filters.location && filters.location.length > 0) {
        query = query.in('actual_location', filters.location)
      }
      if (filters.requires_makeup !== undefined) {
        query = query.eq('requires_makeup_session', filters.requires_makeup)
      }
      if (filters.documentation_complete !== undefined) {
        query = query.eq('documentation_complete', filters.documentation_complete)
      }
      if (filters.date_range) {
        query = query
          .gte('session_date', filters.date_range.start.toISOString().split('T')[0])
          .lte('session_date', filters.date_range.end.toISOString().split('T')[0])
      }

      query = query.order('session_date', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch sessions: ${error.message}`)
      }

      return data as ServiceDeliverySession[]
    } catch (error) {
      console.error('Error fetching service sessions:', error)
      throw error
    }
  }

  // =============================================================================
  // SERVICE HOUR COMPLIANCE CALCULATIONS
  // =============================================================================

  /**
   * Calculate service compliance for a specific period
   * حساب امتثال الخدمة لفترة محددة
   */
  static async calculateServiceCompliance(
    serviceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ServiceComplianceCalculation> {
    try {
      // Get service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('iep_services')
        .select('frequency_per_week, session_duration_minutes')
        .eq('id', serviceId)
        .single()

      if (serviceError || !serviceData) {
        throw new Error(`Failed to fetch service details: ${serviceError?.message}`)
      }

      // Calculate planned minutes for the period
      const periodDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const periodWeeks = Math.ceil(periodDays / 7)
      const plannedMinutes = serviceData.frequency_per_week * serviceData.session_duration_minutes * periodWeeks

      // Get actual delivered minutes
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('service_delivery_sessions')
        .select('actual_duration_minutes, session_status')
        .eq('service_id', serviceId)
        .gte('session_date', periodStart.toISOString().split('T')[0])
        .lte('session_date', periodEnd.toISOString().split('T')[0])

      if (sessionsError) {
        throw new Error(`Failed to fetch session data: ${sessionsError.message}`)
      }

      // Calculate delivered minutes (only completed sessions)
      const deliveredMinutes = (sessionsData || [])
        .filter(session => session.session_status === 'completed' && session.actual_duration_minutes)
        .reduce((total, session) => total + (session.actual_duration_minutes || 0), 0)

      // Calculate compliance metrics
      const compliancePercentage = plannedMinutes > 0 
        ? Math.round((deliveredMinutes / plannedMinutes) * 100) 
        : 0

      const complianceStatus: ComplianceStatus = this.determineComplianceStatus(compliancePercentage)
      const makeupNeeded = Math.max(0, plannedMinutes - deliveredMinutes)
      const varianceAmount = plannedMinutes - deliveredMinutes

      return {
        planned_minutes: plannedMinutes,
        delivered_minutes: deliveredMinutes,
        compliance_percentage: compliancePercentage,
        compliance_status: complianceStatus,
        makeup_needed: makeupNeeded,
        variance_amount: varianceAmount
      }
    } catch (error) {
      console.error('Error calculating service compliance:', error)
      throw error
    }
  }

  /**
   * Update service hour summary for a service
   * تحديث ملخص ساعات الخدمة
   */
  static async updateServiceHourSummary(
    serviceId: string,
    studentId: string,
    periodType: SummaryPeriodType = 'weekly'
  ): Promise<ServiceHourSummary> {
    try {
      const { start, end } = this.getCurrentPeriodDates(periodType)
      
      // Calculate compliance for the period
      const compliance = await this.calculateServiceCompliance(serviceId, start, end)

      // Get session counts
      const sessions = await this.getServiceSessions({
        service_id: serviceId,
        date_range: { start, end }
      })

      const sessionCounts = {
        total_planned_sessions: this.calculatePlannedSessions(serviceId, start, end),
        total_completed_sessions: sessions.filter(s => s.session_status === 'completed').length,
        total_cancelled_sessions: sessions.filter(s => s.session_status === 'cancelled').length,
        total_no_show_sessions: sessions.filter(s => s.session_status === 'no_show').length,
        total_makeup_sessions: sessions.filter(s => s.makeup_for_session_id).length,
      }

      const summaryData = {
        service_id: serviceId,
        student_id: studentId,
        summary_period_type: periodType,
        period_start_date: start.toISOString().split('T')[0],
        period_end_date: end.toISOString().split('T')[0],
        planned_total_minutes: compliance.planned_minutes,
        delivered_total_minutes: compliance.delivered_minutes,
        missed_total_minutes: compliance.planned_minutes - compliance.delivered_minutes,
        makeup_total_minutes: 0, // Calculate from makeup sessions
        ...sessionCounts,
        compliance_status: compliance.compliance_status,
        below_threshold_alert: compliance.compliance_percentage < DEFAULT_COMPLIANCE_THRESHOLDS.alert_threshold,
        makeup_sessions_needed: Math.ceil(compliance.makeup_needed / 60), // Convert to sessions
        last_calculated: new Date().toISOString()
      }

      // Upsert summary record
      const { data, error } = await supabase
        .from('service_hour_summaries')
        .upsert(summaryData, {
          onConflict: 'service_id,summary_period_type,period_start_date'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update service hour summary: ${error.message}`)
      }

      // Check for compliance alerts
      await this.checkAndCreateComplianceAlerts(serviceId, studentId, compliance)

      return data as ServiceHourSummary
    } catch (error) {
      console.error('Error updating service hour summary:', error)
      throw error
    }
  }

  // =============================================================================
  // COMPLIANCE ALERT SYSTEM
  // =============================================================================

  /**
   * Check for compliance issues and create alerts
   * فحص مسائل الامتثال وإنشاء التنبيهات
   */
  static async checkAndCreateComplianceAlerts(
    serviceId: string,
    studentId: string,
    compliance: ServiceComplianceCalculation
  ): Promise<void> {
    try {
      const alerts: CreateComplianceAlertData[] = []

      // Low service hours alert
      if (compliance.compliance_percentage < DEFAULT_COMPLIANCE_THRESHOLDS.alert_threshold) {
        const priority: AlertPriority = compliance.compliance_percentage < DEFAULT_COMPLIANCE_THRESHOLDS.critical_threshold 
          ? 'high' 
          : 'medium'

        alerts.push({
          service_id: serviceId,
          student_id: studentId,
          alert_type: 'service_hours_below_threshold',
          priority_level: priority,
          alert_title_ar: 'ساعات الخدمة أقل من المطلوب',
          alert_title_en: 'Service Hours Below Required Threshold',
          alert_message_ar: `تم تقديم ${compliance.delivered_minutes} دقيقة من أصل ${compliance.planned_minutes} دقيقة مطلوبة (${compliance.compliance_percentage}%)`,
          alert_message_en: `Delivered ${compliance.delivered_minutes} minutes out of ${compliance.planned_minutes} required minutes (${compliance.compliance_percentage}%)`,
          recommended_action_ar: 'جدولة جلسات تعويضية أو مراجعة خطة الخدمة',
          recommended_action_en: 'Schedule makeup sessions or review service plan',
          threshold_value: DEFAULT_COMPLIANCE_THRESHOLDS.alert_threshold,
          current_value: compliance.compliance_percentage,
          resolution_due_date: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)) // 3 days
        })
      }

      // Create alerts in database
      for (const alertData of alerts) {
        await this.createComplianceAlert(alertData)
      }
    } catch (error) {
      console.error('Error checking compliance alerts:', error)
    }
  }

  /**
   * Create a compliance alert
   * إنشاء تنبيه امتثال
   */
  static async createComplianceAlert(
    alertData: CreateComplianceAlertData
  ): Promise<ServiceComplianceAlert> {
    try {
      // Check if similar alert already exists and is active
      const { data: existingAlerts, error: checkError } = await supabase
        .from('service_compliance_alerts')
        .select('id')
        .eq('service_id', alertData.service_id)
        .eq('student_id', alertData.student_id)
        .eq('alert_type', alertData.alert_type)
        .eq('alert_status', 'active')

      if (checkError) {
        throw new Error(`Failed to check existing alerts: ${checkError.message}`)
      }

      // Don't create duplicate alerts
      if (existingAlerts && existingAlerts.length > 0) {
        return existingAlerts[0] as ServiceComplianceAlert
      }

      const alertRecord = {
        service_id: alertData.service_id,
        student_id: alertData.student_id,
        alert_type: alertData.alert_type,
        priority_level: alertData.priority_level,
        alert_title_ar: alertData.alert_title_ar,
        alert_title_en: alertData.alert_title_en,
        alert_message_ar: alertData.alert_message_ar,
        alert_message_en: alertData.alert_message_en,
        recommended_action_ar: alertData.recommended_action_ar,
        recommended_action_en: alertData.recommended_action_en,
        threshold_value: alertData.threshold_value,
        current_value: alertData.current_value,
        resolution_due_date: alertData.resolution_due_date?.toISOString(),
        assigned_to_user_id: alertData.assigned_to_user_id,
        alert_status: 'active',
        requires_iep_team_review: alertData.alert_type === 'service_hours_below_threshold',
        requires_service_modification: alertData.alert_type === 'service_modification_needed',
        requires_parent_notification: alertData.priority_level === 'high' || alertData.priority_level === 'critical'
      }

      const { data, error } = await supabase
        .from('service_compliance_alerts')
        .insert([alertRecord])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create compliance alert: ${error.message}`)
      }

      return data as ServiceComplianceAlert
    } catch (error) {
      console.error('Error creating compliance alert:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY AND HELPER METHODS
  // =============================================================================

  /**
   * Check if session documentation is complete
   * التحقق من اكتمال توثيق الجلسة
   */
  private static isSessionDocumentationComplete(sessionData: Partial<ServiceSessionFormData>): boolean {
    if (sessionData.session_status === 'completed') {
      return !!(
        sessionData.actual_duration_minutes &&
        sessionData.services_delivered_ar &&
        sessionData.progress_notes_ar &&
        sessionData.session_objectives_met !== undefined
      )
    }
    
    if (sessionData.session_status === 'cancelled' || sessionData.session_status === 'no_show') {
      return !!(sessionData.cancellation_reason_ar || sessionData.cancellation_reason_en)
    }

    return false
  }

  /**
   * Determine compliance status from percentage
   * تحديد حالة الامتثال من النسبة المئوية
   */
  private static determineComplianceStatus(percentage: number): ComplianceStatus {
    if (percentage >= DEFAULT_COMPLIANCE_THRESHOLDS.compliant_minimum) {
      return 'compliant'
    } else if (percentage >= DEFAULT_COMPLIANCE_THRESHOLDS.at_risk_minimum) {
      return 'at_risk'
    } else {
      return 'non_compliant'
    }
  }

  /**
   * Get current period start and end dates
   * الحصول على تواريخ بداية ونهاية الفترة الحالية
   */
  private static getCurrentPeriodDates(periodType: SummaryPeriodType): { start: Date; end: Date } {
    const now = new Date()
    let start: Date
    let end: Date

    switch (periodType) {
      case 'weekly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        end = new Date(start.getTime() + (6 * 24 * 60 * 60 * 1000))
        break
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
        break
      case 'annual':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        end = new Date(start.getTime() + (6 * 24 * 60 * 60 * 1000))
    }

    return { start, end }
  }

  /**
   * Calculate planned sessions for a period
   * حساب الجلسات المخططة لفترة معينة
   */
  private static async calculatePlannedSessions(
    serviceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    try {
      const { data: serviceData, error } = await supabase
        .from('iep_services')
        .select('frequency_per_week')
        .eq('id', serviceId)
        .single()

      if (error || !serviceData) {
        return 0
      }

      const periodDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const periodWeeks = Math.ceil(periodDays / 7)

      return serviceData.frequency_per_week * periodWeeks
    } catch (error) {
      console.error('Error calculating planned sessions:', error)
      return 0
    }
  }

  /**
   * Get service tracking statistics
   * الحصول على إحصائيات تتبع الخدمة
   */
  static async getServiceTrackingStats(): Promise<ServiceTrackingStats> {
    try {
      // Get service counts
      const { data: services, error: servicesError } = await supabase
        .from('iep_services')
        .select('id, service_status')

      if (servicesError) {
        throw new Error(`Failed to fetch services: ${servicesError.message}`)
      }

      const totalServices = services?.length || 0
      const activeServices = services?.filter(s => s.service_status === 'active').length || 0

      // Get compliance summaries
      const { data: summaries, error: summariesError } = await supabase
        .from('service_hour_summaries')
        .select('compliance_status')

      if (summariesError) {
        throw new Error(`Failed to fetch summaries: ${summariesError.message}`)
      }

      const compliantServices = summaries?.filter(s => s.compliance_status === 'compliant').length || 0
      const atRiskServices = summaries?.filter(s => s.compliance_status === 'at_risk').length || 0
      const nonCompliantServices = summaries?.filter(s => s.compliance_status === 'non_compliant').length || 0

      // Get alert counts
      const { data: alerts, error: alertsError } = await supabase
        .from('service_compliance_alerts')
        .select('alert_status, alert_type')
        .eq('alert_status', 'active')

      if (alertsError) {
        throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
      }

      const activeAlerts = alerts?.length || 0

      // Get session counts
      const { data: sessions, error: sessionsError } = await supabase
        .from('service_delivery_sessions')
        .select('session_status, requires_makeup_session, documentation_complete')
        .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (sessionsError) {
        throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
      }

      const overdueSessions = sessions?.filter(s => 
        s.session_status === 'scheduled' && 
        new Date(s.session_date) < new Date()
      ).length || 0

      const pendingDocumentation = sessions?.filter(s => 
        s.session_status === 'completed' && 
        !s.documentation_complete
      ).length || 0

      const makeupSessionsNeeded = sessions?.filter(s => s.requires_makeup_session).length || 0

      return {
        total_services: totalServices,
        active_services: activeServices,
        compliant_services: compliantServices,
        at_risk_services: atRiskServices,
        non_compliant_services: nonCompliantServices,
        active_alerts: activeAlerts,
        overdue_sessions: overdueSessions,
        pending_documentation: pendingDocumentation,
        makeup_sessions_needed: makeupSessionsNeeded
      }
    } catch (error) {
      console.error('Error fetching service tracking stats:', error)
      throw error
    }
  }
}