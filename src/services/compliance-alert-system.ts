/**
 * Compliance Alert System Service
 * خدمة نظام تنبيهات الامتثال
 * 
 * @description Advanced compliance monitoring and automated alert notification system
 * نظام متقدم لمراقبة الامتثال والإشعارات التلقائية للتنبيهات
 */

import { createClient } from '@supabase/supabase-js'
import { 
  ServiceComplianceAlert,
  CreateComplianceAlertData,
  ComplianceAlertFilters,
  AlertType,
  AlertPriority,
  AlertStatus,
  ServiceDeliverySession,
  ServiceHourSummary,
  ComplianceStatus
} from '@/types/service-tracking'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =============================================================================
// ALERT CONFIGURATION AND THRESHOLDS
// =============================================================================

export interface AlertConfiguration {
  enabled: boolean
  threshold: number
  priority: AlertPriority
  notification_channels: NotificationChannel[]
  escalation_days?: number
  auto_resolve?: boolean
}

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app' | 'webhook'

export interface ComplianceThresholdConfig {
  service_hours_below_threshold: AlertConfiguration
  excessive_cancellations: AlertConfiguration
  missed_sessions_requiring_makeup: AlertConfiguration
  provider_unavailable: AlertConfiguration
  documentation_overdue: AlertConfiguration
  compliance_review_required: AlertConfiguration
  service_modification_needed: AlertConfiguration
}

export const DEFAULT_ALERT_CONFIG: ComplianceThresholdConfig = {
  service_hours_below_threshold: {
    enabled: true,
    threshold: 70, // Below 70%
    priority: 'medium',
    notification_channels: ['in_app', 'email'],
    escalation_days: 3,
    auto_resolve: false
  },
  excessive_cancellations: {
    enabled: true,
    threshold: 3, // More than 3 cancellations per week
    priority: 'medium',
    notification_channels: ['in_app', 'email'],
    escalation_days: 7,
    auto_resolve: false
  },
  missed_sessions_requiring_makeup: {
    enabled: true,
    threshold: 2, // More than 2 missed sessions
    priority: 'high',
    notification_channels: ['in_app', 'email', 'sms'],
    escalation_days: 2,
    auto_resolve: false
  },
  provider_unavailable: {
    enabled: true,
    threshold: 1, // Any provider unavailability
    priority: 'high',
    notification_channels: ['in_app', 'email'],
    escalation_days: 1,
    auto_resolve: true
  },
  documentation_overdue: {
    enabled: true,
    threshold: 3, // 3 days overdue
    priority: 'medium',
    notification_channels: ['in_app', 'email'],
    escalation_days: 7,
    auto_resolve: true
  },
  compliance_review_required: {
    enabled: true,
    threshold: 1, // Any compliance review
    priority: 'high',
    notification_channels: ['in_app', 'email'],
    escalation_days: 5,
    auto_resolve: false
  },
  service_modification_needed: {
    enabled: true,
    threshold: 1, // Any modification needed
    priority: 'critical',
    notification_channels: ['in_app', 'email', 'sms'],
    escalation_days: 1,
    auto_resolve: false
  }
}

// =============================================================================
// NOTIFICATION INTERFACE
// =============================================================================

export interface NotificationData {
  id: string
  recipient_user_id: string
  channel: NotificationChannel
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  data_payload: Record<string, any>
  sent_at?: string
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  retry_count: number
  max_retries: number
}

// =============================================================================
// MAIN COMPLIANCE ALERT SERVICE
// =============================================================================

export class ComplianceAlertSystemService {
  /**
   * Get compliance alerts with filtering and sorting
   * الحصول على تنبيهات الامتثال مع التصفية والترتيب
   */
  static async getComplianceAlerts(
    filters: ComplianceAlertFilters = {}
  ): Promise<ServiceComplianceAlert[]> {
    try {
      let query = supabase
        .from('service_compliance_alerts')
        .select(`
          *,
          service:iep_services(service_name_ar, service_name_en, service_category),
          student:students(name_ar, name_en, student_id),
          assigned_user:auth.users(id, name, email),
          resolved_by_user:auth.users(id, name, email)
        `)

      // Apply filters
      if (filters.service_id) {
        query = query.eq('service_id', filters.service_id)
      }
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters.alert_type && filters.alert_type.length > 0) {
        query = query.in('alert_type', filters.alert_type)
      }
      if (filters.priority_level && filters.priority_level.length > 0) {
        query = query.in('priority_level', filters.priority_level)
      }
      if (filters.alert_status && filters.alert_status.length > 0) {
        query = query.in('alert_status', filters.alert_status)
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to_user_id', filters.assigned_to)
      }
      if (filters.date_range) {
        query = query
          .gte('alert_triggered_date', filters.date_range.start.toISOString())
          .lte('alert_triggered_date', filters.date_range.end.toISOString())
      }
      if (filters.requires_action) {
        query = query.in('alert_status', ['active', 'acknowledged'])
      }

      // Order by priority and date
      query = query.order('priority_level', { ascending: false })
      query = query.order('alert_triggered_date', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch compliance alerts: ${error.message}`)
      }

      return data as ServiceComplianceAlert[]
    } catch (error) {
      console.error('Error fetching compliance alerts:', error)
      throw error
    }
  }

  /**
   * Create a new compliance alert with automated notifications
   * إنشاء تنبيه امتثال جديد مع الإشعارات التلقائية
   */
  static async createComplianceAlert(
    alertData: CreateComplianceAlertData,
    config?: AlertConfiguration
  ): Promise<ServiceComplianceAlert> {
    try {
      // Check for existing similar alerts to avoid duplicates
      const { data: existingAlerts, error: checkError } = await supabase
        .from('service_compliance_alerts')
        .select('id, alert_status')
        .eq('service_id', alertData.service_id)
        .eq('student_id', alertData.student_id)
        .eq('alert_type', alertData.alert_type)
        .in('alert_status', ['active', 'acknowledged'])

      if (checkError) {
        throw new Error(`Failed to check existing alerts: ${checkError.message}`)
      }

      // If similar active alert exists, update instead of creating new
      if (existingAlerts && existingAlerts.length > 0) {
        return await this.updateAlert(existingAlerts[0].id, {
          current_value: alertData.current_value,
          alert_message_ar: alertData.alert_message_ar,
          alert_message_en: alertData.alert_message_en,
          updated_at: new Date().toISOString()
        })
      }

      // Create new alert record
      const alertRecord = {
        service_id: alertData.service_id,
        student_id: alertData.student_id,
        alert_type: alertData.alert_type,
        priority_level: alertData.priority_level,
        alert_status: 'active' as AlertStatus,
        alert_title_ar: alertData.alert_title_ar,
        alert_title_en: alertData.alert_title_en,
        alert_message_ar: alertData.alert_message_ar,
        alert_message_en: alertData.alert_message_en,
        recommended_action_ar: alertData.recommended_action_ar,
        recommended_action_en: alertData.recommended_action_en,
        threshold_value: alertData.threshold_value,
        current_value: alertData.current_value,
        variance_amount: alertData.threshold_value && alertData.current_value 
          ? alertData.threshold_value - alertData.current_value 
          : null,
        resolution_due_date: alertData.resolution_due_date?.toISOString(),
        assigned_to_user_id: alertData.assigned_to_user_id,
        requires_iep_team_review: this.requiresIEPTeamReview(alertData.alert_type),
        requires_service_modification: this.requiresServiceModification(alertData.alert_type),
        requires_parent_notification: this.requiresParentNotification(alertData.priority_level),
        alert_triggered_date: new Date().toISOString()
      }

      const { data: newAlert, error } = await supabase
        .from('service_compliance_alerts')
        .insert([alertRecord])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create compliance alert: ${error.message}`)
      }

      // Send automated notifications
      const alertConfig = config || DEFAULT_ALERT_CONFIG[alertData.alert_type]
      if (alertConfig?.enabled) {
        await this.sendAlertNotifications(newAlert, alertConfig)
      }

      return newAlert as ServiceComplianceAlert
    } catch (error) {
      console.error('Error creating compliance alert:', error)
      throw error
    }
  }

  /**
   * Update an existing compliance alert
   * تحديث تنبيه امتثال موجود
   */
  static async updateAlert(
    alertId: string,
    updates: Partial<ServiceComplianceAlert>
  ): Promise<ServiceComplianceAlert> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_compliance_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update alert: ${error.message}`)
      }

      return data as ServiceComplianceAlert
    } catch (error) {
      console.error('Error updating compliance alert:', error)
      throw error
    }
  }

  /**
   * Resolve a compliance alert with resolution notes
   * حل تنبيه امتثال مع ملاحظات الحل
   */
  static async resolveAlert(
    alertId: string,
    resolutionData: {
      resolved_by_user_id: string
      resolution_notes_ar?: string
      resolution_notes_en?: string
      follow_up_required?: boolean
    }
  ): Promise<ServiceComplianceAlert> {
    try {
      const updateData = {
        alert_status: 'resolved' as AlertStatus,
        resolved_date: new Date().toISOString(),
        resolved_by_user_id: resolutionData.resolved_by_user_id,
        resolution_notes_ar: resolutionData.resolution_notes_ar,
        resolution_notes_en: resolutionData.resolution_notes_en,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_compliance_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to resolve alert: ${error.message}`)
      }

      // Send resolution notification
      await this.sendResolutionNotification(data as ServiceComplianceAlert)

      return data as ServiceComplianceAlert
    } catch (error) {
      console.error('Error resolving compliance alert:', error)
      throw error
    }
  }

  /**
   * Acknowledge an alert (mark as seen/acknowledged)
   * الإقرار بالتنبيه (وضع علامة كمشاهد/مقر به)
   */
  static async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<ServiceComplianceAlert> {
    try {
      const updateData = {
        alert_status: 'acknowledged' as AlertStatus,
        updated_at: new Date().toISOString()
      }

      return await this.updateAlert(alertId, updateData)
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      throw error
    }
  }

  /**
   * Escalate an alert to higher priority/assignment
   * تصعيد التنبيه إلى أولوية/تعيين أعلى
   */
  static async escalateAlert(
    alertId: string,
    escalationData: {
      new_priority?: AlertPriority
      new_assignee?: string
      escalation_reason_ar?: string
      escalation_reason_en?: string
    }
  ): Promise<ServiceComplianceAlert> {
    try {
      const updateData: Partial<ServiceComplianceAlert> = {
        alert_status: 'escalated' as AlertStatus,
        updated_at: new Date().toISOString()
      }

      if (escalationData.new_priority) {
        updateData.priority_level = escalationData.new_priority
      }
      if (escalationData.new_assignee) {
        updateData.assigned_to_user_id = escalationData.new_assignee
      }

      const updatedAlert = await this.updateAlert(alertId, updateData)

      // Send escalation notification
      await this.sendEscalationNotification(updatedAlert, escalationData)

      return updatedAlert
    } catch (error) {
      console.error('Error escalating alert:', error)
      throw error
    }
  }

  // =============================================================================
  // AUTOMATED ALERT GENERATION
  // =============================================================================

  /**
   * Run comprehensive compliance monitoring and generate alerts
   * تشغيل مراقبة الامتثال الشاملة وإنشاء التنبيهات
   */
  static async runComplianceMonitoring(): Promise<{
    alerts_generated: number
    alerts_resolved: number
    services_checked: number
  }> {
    try {
      let alertsGenerated = 0
      let alertsResolved = 0
      let servicesChecked = 0

      // Get all active services
      const { data: services, error: servicesError } = await supabase
        .from('iep_services')
        .select('id, student_id, service_name_ar, service_name_en, frequency_per_week, session_duration_minutes')
        .eq('service_status', 'active')

      if (servicesError) {
        throw new Error(`Failed to fetch services: ${servicesError.message}`)
      }

      // Check each service for compliance issues
      for (const service of services || []) {
        servicesChecked++

        // Check service hour compliance
        const hourComplianceAlert = await this.checkServiceHourCompliance(service.id, service.student_id)
        if (hourComplianceAlert) {
          alertsGenerated++
        }

        // Check excessive cancellations
        const cancellationAlert = await this.checkExcessiveCancellations(service.id, service.student_id)
        if (cancellationAlert) {
          alertsGenerated++
        }

        // Check documentation overdue
        const documentationAlert = await this.checkOverdueDocumentation(service.id, service.student_id)
        if (documentationAlert) {
          alertsGenerated++
        }

        // Check missed sessions requiring makeup
        const makeupAlert = await this.checkMissedSessionsRequiringMakeup(service.id, service.student_id)
        if (makeupAlert) {
          alertsGenerated++
        }
      }

      // Auto-resolve alerts that no longer apply
      alertsResolved = await this.autoResolveOutdatedAlerts()

      return {
        alerts_generated: alertsGenerated,
        alerts_resolved: alertsResolved,
        services_checked: servicesChecked
      }
    } catch (error) {
      console.error('Error running compliance monitoring:', error)
      throw error
    }
  }

  /**
   * Check service hour compliance and generate alerts
   * فحص امتثال ساعات الخدمة وإنشاء التنبيهات
   */
  private static async checkServiceHourCompliance(
    serviceId: string,
    studentId: string
  ): Promise<ServiceComplianceAlert | null> {
    try {
      // Calculate current week compliance
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get service details and sessions
      const { data: service, error: serviceError } = await supabase
        .from('iep_services')
        .select('frequency_per_week, session_duration_minutes, service_name_ar, service_name_en')
        .eq('id', serviceId)
        .single()

      if (serviceError || !service) return null

      const plannedMinutes = service.frequency_per_week * service.session_duration_minutes

      const { data: sessions, error: sessionsError } = await supabase
        .from('service_delivery_sessions')
        .select('actual_duration_minutes, session_status')
        .eq('service_id', serviceId)
        .gte('session_date', weekStart.toISOString().split('T')[0])
        .lte('session_date', weekEnd.toISOString().split('T')[0])

      if (sessionsError) return null

      const deliveredMinutes = (sessions || [])
        .filter(s => s.session_status === 'completed' && s.actual_duration_minutes)
        .reduce((total, s) => total + (s.actual_duration_minutes || 0), 0)

      const compliancePercentage = plannedMinutes > 0 
        ? Math.round((deliveredMinutes / plannedMinutes) * 100) 
        : 100

      // Generate alert if below threshold
      if (compliancePercentage < DEFAULT_ALERT_CONFIG.service_hours_below_threshold.threshold) {
        const alertData: CreateComplianceAlertData = {
          service_id: serviceId,
          student_id: studentId,
          alert_type: 'service_hours_below_threshold',
          priority_level: compliancePercentage < 50 ? 'high' : 'medium',
          alert_title_ar: 'ساعات الخدمة أقل من المطلوب',
          alert_title_en: 'Service Hours Below Required Threshold',
          alert_message_ar: `تم تسليم ${deliveredMinutes} دقيقة من أصل ${plannedMinutes} دقيقة مطلوبة هذا الأسبوع (${compliancePercentage}%)`,
          alert_message_en: `Delivered ${deliveredMinutes} minutes out of ${plannedMinutes} required minutes this week (${compliancePercentage}%)`,
          recommended_action_ar: 'جدولة جلسات إضافية أو مراجعة خطة الخدمة',
          recommended_action_en: 'Schedule additional sessions or review service plan',
          threshold_value: DEFAULT_ALERT_CONFIG.service_hours_below_threshold.threshold,
          current_value: compliancePercentage,
          resolution_due_date: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)) // 3 days
        }

        return await this.createComplianceAlert(alertData)
      }

      return null
    } catch (error) {
      console.error('Error checking service hour compliance:', error)
      return null
    }
  }

  /**
   * Check for excessive cancellations
   * فحص الإلغاءات المفرطة
   */
  private static async checkExcessiveCancellations(
    serviceId: string,
    studentId: string
  ): Promise<ServiceComplianceAlert | null> {
    try {
      // Check last 7 days for cancellations
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))

      const { data: cancellations, error } = await supabase
        .from('service_delivery_sessions')
        .select('id')
        .eq('service_id', serviceId)
        .in('session_status', ['cancelled', 'no_show'])
        .gte('session_date', weekAgo.toISOString().split('T')[0])

      if (error) return null

      const cancellationCount = cancellations?.length || 0
      
      if (cancellationCount >= DEFAULT_ALERT_CONFIG.excessive_cancellations.threshold) {
        const alertData: CreateComplianceAlertData = {
          service_id: serviceId,
          student_id: studentId,
          alert_type: 'excessive_cancellations',
          priority_level: 'medium',
          alert_title_ar: 'إلغاءات مفرطة في الجلسات',
          alert_title_en: 'Excessive Session Cancellations',
          alert_message_ar: `تم إلغاء ${cancellationCount} جلسات في الأسبوع الماضي`,
          alert_message_en: `${cancellationCount} sessions were cancelled in the past week`,
          recommended_action_ar: 'مراجعة أسباب الإلغاء وتعديل الجدول',
          recommended_action_en: 'Review cancellation reasons and adjust schedule',
          threshold_value: DEFAULT_ALERT_CONFIG.excessive_cancellations.threshold,
          current_value: cancellationCount,
          resolution_due_date: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
        }

        return await this.createComplianceAlert(alertData)
      }

      return null
    } catch (error) {
      console.error('Error checking excessive cancellations:', error)
      return null
    }
  }

  /**
   * Check for overdue documentation
   * فحص التوثيق المتأخر
   */
  private static async checkOverdueDocumentation(
    serviceId: string,
    studentId: string
  ): Promise<ServiceComplianceAlert | null> {
    try {
      const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000))

      const { data: overdueSessions, error } = await supabase
        .from('service_delivery_sessions')
        .select('id')
        .eq('service_id', serviceId)
        .eq('session_status', 'completed')
        .eq('documentation_complete', false)
        .lte('session_date', threeDaysAgo.toISOString().split('T')[0])

      if (error) return null

      const overdueCount = overdueSessions?.length || 0

      if (overdueCount > 0) {
        const alertData: CreateComplianceAlertData = {
          service_id: serviceId,
          student_id: studentId,
          alert_type: 'documentation_overdue',
          priority_level: 'medium',
          alert_title_ar: 'توثيق الجلسات متأخر',
          alert_title_en: 'Session Documentation Overdue',
          alert_message_ar: `${overdueCount} جلسة تحتاج إلى توثيق كامل`,
          alert_message_en: `${overdueCount} sessions need complete documentation`,
          recommended_action_ar: 'إكمال توثيق الجلسات المتأخرة',
          recommended_action_en: 'Complete overdue session documentation',
          current_value: overdueCount,
          resolution_due_date: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
        }

        return await this.createComplianceAlert(alertData)
      }

      return null
    } catch (error) {
      console.error('Error checking overdue documentation:', error)
      return null
    }
  }

  /**
   * Check for missed sessions requiring makeup
   * فحص الجلسات المفقودة التي تحتاج تعويض
   */
  private static async checkMissedSessionsRequiringMakeup(
    serviceId: string,
    studentId: string
  ): Promise<ServiceComplianceAlert | null> {
    try {
      const { data: missedSessions, error } = await supabase
        .from('service_delivery_sessions')
        .select('id')
        .eq('service_id', serviceId)
        .eq('requires_makeup_session', true)
        .eq('makeup_session_scheduled', false)

      if (error) return null

      const missedCount = missedSessions?.length || 0

      if (missedCount >= DEFAULT_ALERT_CONFIG.missed_sessions_requiring_makeup.threshold) {
        const alertData: CreateComplianceAlertData = {
          service_id: serviceId,
          student_id: studentId,
          alert_type: 'missed_sessions_requiring_makeup',
          priority_level: 'high',
          alert_title_ar: 'جلسات تحتاج إلى تعويض',
          alert_title_en: 'Sessions Requiring Makeup',
          alert_message_ar: `${missedCount} جلسة تحتاج إلى جدولة تعويض`,
          alert_message_en: `${missedCount} sessions need makeup scheduling`,
          recommended_action_ar: 'جدولة جلسات تعويضية',
          recommended_action_en: 'Schedule makeup sessions',
          current_value: missedCount,
          resolution_due_date: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) // 2 days
        }

        return await this.createComplianceAlert(alertData)
      }

      return null
    } catch (error) {
      console.error('Error checking missed sessions requiring makeup:', error)
      return null
    }
  }

  // =============================================================================
  // NOTIFICATION SYSTEM
  // =============================================================================

  /**
   * Send automated notifications for new alerts
   * إرسال الإشعارات التلقائية للتنبيهات الجديدة
   */
  private static async sendAlertNotifications(
    alert: ServiceComplianceAlert,
    config: AlertConfiguration
  ): Promise<void> {
    try {
      // Get recipients (assigned user, service providers, managers)
      const recipients = await this.getAlertRecipients(alert)

      for (const recipient of recipients) {
        for (const channel of config.notification_channels) {
          const notificationData: Omit<NotificationData, 'id'> = {
            recipient_user_id: recipient.user_id,
            channel,
            title_ar: alert.alert_title_ar,
            title_en: alert.alert_title_en,
            message_ar: alert.alert_message_ar,
            message_en: alert.alert_message_en,
            data_payload: {
              alert_id: alert.id,
              alert_type: alert.alert_type,
              priority_level: alert.priority_level,
              service_id: alert.service_id,
              student_id: alert.student_id
            },
            delivery_status: 'pending',
            retry_count: 0,
            max_retries: 3
          }

          await this.sendNotification(notificationData)
        }
      }
    } catch (error) {
      console.error('Error sending alert notifications:', error)
    }
  }

  /**
   * Send notification through specified channel
   * إرسال الإشعار عبر القناة المحددة
   */
  private static async sendNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmailNotification(notification)
          break
        case 'sms':
          await this.sendSMSNotification(notification)
          break
        case 'whatsapp':
          await this.sendWhatsAppNotification(notification)
          break
        case 'in_app':
          await this.sendInAppNotification(notification)
          break
        case 'webhook':
          await this.sendWebhookNotification(notification)
          break
      }
    } catch (error) {
      console.error(`Error sending ${notification.channel} notification:`, error)
      // Update retry count and schedule retry if needed
      if (notification.retry_count < notification.max_retries) {
        // Implementation for retry logic would go here
      }
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get recipients for alert notifications
   * الحصول على مستلمي إشعارات التنبيه
   */
  private static async getAlertRecipients(alert: ServiceComplianceAlert): Promise<Array<{ user_id: string; role: string }>> {
    try {
      const recipients: Array<{ user_id: string; role: string }> = []

      // Add assigned user if specified
      if (alert.assigned_to_user_id) {
        recipients.push({ user_id: alert.assigned_to_user_id, role: 'assigned' })
      }

      // Add service provider
      const { data: service, error: serviceError } = await supabase
        .from('iep_services')
        .select('provider_id')
        .eq('id', alert.service_id)
        .single()

      if (!serviceError && service?.provider_id) {
        recipients.push({ user_id: service.provider_id, role: 'provider' })
      }

      // Add managers and administrators
      const { data: managers, error: managersError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'manager'])

      if (!managersError && managers) {
        managers.forEach(manager => {
          recipients.push({ user_id: manager.user_id, role: 'manager' })
        })
      }

      return recipients
    } catch (error) {
      console.error('Error getting alert recipients:', error)
      return []
    }
  }

  /**
   * Auto-resolve alerts that no longer apply
   * حل التنبيهات التي لم تعد تنطبق تلقائياً
   */
  private static async autoResolveOutdatedAlerts(): Promise<number> {
    try {
      // This would implement logic to automatically resolve alerts
      // that are no longer relevant based on current data
      // For example, resolve "service_hours_below_threshold" alerts
      // if the service is now compliant
      
      const { data: resolvedAlerts, error } = await supabase
        .from('service_compliance_alerts')
        .update({ 
          alert_status: 'resolved', 
          resolved_date: new Date().toISOString(),
          resolution_notes_en: 'Auto-resolved: Issue no longer applies',
          resolution_notes_ar: 'تم الحل تلقائياً: المشكلة لم تعد تنطبق'
        })
        .eq('alert_status', 'active')
        .eq('auto_resolve', true)
        .select('id')

      return resolvedAlerts?.length || 0
    } catch (error) {
      console.error('Error auto-resolving alerts:', error)
      return 0
    }
  }

  // Helper methods for determining alert requirements
  private static requiresIEPTeamReview(alertType: AlertType): boolean {
    return ['service_hours_below_threshold', 'service_modification_needed', 'compliance_review_required'].includes(alertType)
  }

  private static requiresServiceModification(alertType: AlertType): boolean {
    return ['service_modification_needed', 'excessive_cancellations'].includes(alertType)
  }

  private static requiresParentNotification(priority: AlertPriority): boolean {
    return ['high', 'critical'].includes(priority)
  }

  // Placeholder notification methods (would be implemented based on actual services)
  private static async sendEmailNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Email notification sent:', notification.title_en)
  }

  private static async sendSMSNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('SMS notification sent:', notification.title_en)
  }

  private static async sendWhatsAppNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    // Implementation would integrate with WhatsApp Business API
    console.log('WhatsApp notification sent:', notification.title_ar)
  }

  private static async sendInAppNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    // Store in-app notification in database
    const { error } = await supabase
      .from('in_app_notifications')
      .insert([{
        user_id: notification.recipient_user_id,
        title: notification.title_ar,
        message: notification.message_ar,
        data: notification.data_payload,
        read: false,
        created_at: new Date().toISOString()
      }])

    if (error) {
      throw new Error(`Failed to send in-app notification: ${error.message}`)
    }
  }

  private static async sendWebhookNotification(notification: Omit<NotificationData, 'id'>): Promise<void> {
    // Implementation would send to configured webhook endpoints
    console.log('Webhook notification sent:', notification.title_en)
  }

  private static async sendResolutionNotification(alert: ServiceComplianceAlert): Promise<void> {
    // Send notification that alert has been resolved
    console.log('Resolution notification sent for alert:', alert.alert_title_en)
  }

  private static async sendEscalationNotification(
    alert: ServiceComplianceAlert,
    escalationData: any
  ): Promise<void> {
    // Send notification that alert has been escalated
    console.log('Escalation notification sent for alert:', alert.alert_title_en)
  }
}