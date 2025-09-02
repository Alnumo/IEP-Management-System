/**
 * Comprehensive Notification System Service
 * Handles all notification processing, scheduling, delivery, and management
 */

import { supabase } from '@/lib/supabase';
import type {
  BaseNotification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  NotificationPreferences,
  NotificationDelivery,
  NotificationSchedule,
  NotificationTemplate,
  NotificationQueue,
  NotificationAnalytics,
  CreateNotificationRequest,
  NotificationFilters,
  NotificationListResponse,
  DeadlineNotification,
  ApprovalNotification,
  MeetingNotification,
  ComplianceNotification,
  NotificationSystemHealth
} from '@/types/notification';

export class NotificationSystemService {
  private static instance: NotificationSystemService;
  private processingQueue = new Map<string, boolean>();
  private healthCheckInterval?: NodeJS.Timeout;

  public static getInstance(): NotificationSystemService {
    if (!NotificationSystemService.instance) {
      NotificationSystemService.instance = new NotificationSystemService();
    }
    return NotificationSystemService.instance;
  }

  constructor() {
    this.initializeHealthMonitoring();
  }

  // Core notification creation and management
  async createNotification(request: CreateNotificationRequest): Promise<BaseNotification> {
    const notification: Partial<BaseNotification> = {
      ...request,
      id: crypto.randomUUID(),
      scheduled_at: request.scheduled_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: request.metadata || {}
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;

    // Queue for immediate processing if scheduled for now
    if (!request.scheduled_at || new Date(request.scheduled_at) <= new Date()) {
      await this.queueNotification(data.id, request.channels);
    }

    return data;
  }

  async createDeadlineReminder(
    iepId: string,
    deadlineType: string,
    deadlineDate: string,
    recipientId: string,
    daysUntilDeadline: number
  ): Promise<DeadlineNotification> {
    const priority: NotificationPriority = daysUntilDeadline <= 1 ? 'urgent' :
      daysUntilDeadline <= 3 ? 'high' : 
      daysUntilDeadline <= 7 ? 'medium' : 'low';

    const escalationLevel = daysUntilDeadline <= 0 ? 3 :
      daysUntilDeadline <= 1 ? 2 : 1;

    const notification: CreateNotificationRequest = {
      type: 'deadline_reminder',
      priority,
      title_ar: `تذكير: موعد نهائي قريب - ${deadlineType}`,
      title_en: `Reminder: Upcoming Deadline - ${deadlineType}`,
      message_ar: `لديك موعد نهائي قريب في ${daysUntilDeadline} أيام للبرنامج التعليمي الفردي`,
      message_en: `You have an upcoming deadline in ${daysUntilDeadline} days for the IEP`,
      recipient_id: recipientId,
      related_entity_type: 'iep',
      related_entity_id: iepId,
      channels: this.getChannelsForPriority(priority),
      metadata: {
        deadline_date: deadlineDate,
        days_until_deadline: daysUntilDeadline,
        escalation_level: escalationLevel,
        deadline_type: deadlineType
      }
    };

    return await this.createNotification(notification) as DeadlineNotification;
  }

  async createApprovalRequest(
    iepId: string,
    approvalId: string,
    approvalType: string,
    approverRole: string,
    approverId: string,
    requestedBy: string,
    dueDate: string,
    isUrgent: boolean = false
  ): Promise<ApprovalNotification> {
    const priority: NotificationPriority = isUrgent ? 'urgent' : 'high';

    const notification: CreateNotificationRequest = {
      type: 'approval_request',
      priority,
      title_ar: `طلب موافقة: ${approvalType}`,
      title_en: `Approval Request: ${approvalType}`,
      message_ar: `يتطلب البرنامج التعليمي الفردي موافقتكم`,
      message_en: `An IEP requires your approval`,
      recipient_id: approverId,
      related_entity_type: 'approval',
      related_entity_id: approvalId,
      channels: this.getChannelsForPriority(priority),
      metadata: {
        approval_id: approvalId,
        approval_type: approvalType,
        approver_role: approverRole,
        requested_by: requestedBy,
        due_date: dueDate,
        is_urgent: isUrgent
      }
    };

    return await this.createNotification(notification) as ApprovalNotification;
  }

  async createMeetingReminder(
    meetingId: string,
    attendeeId: string,
    meetingDate: string,
    meetingType: string,
    hoursBeforeMeeting: number
  ): Promise<MeetingNotification> {
    const priority: NotificationPriority = hoursBeforeMeeting <= 2 ? 'high' : 'medium';

    const notification: CreateNotificationRequest = {
      type: 'meeting_reminder',
      priority,
      title_ar: `تذكير باجتماع: ${meetingType}`,
      title_en: `Meeting Reminder: ${meetingType}`,
      message_ar: `لديك اجتماع قريب في ${hoursBeforeMeeting} ساعة`,
      message_en: `You have an upcoming meeting in ${hoursBeforeMeeting} hours`,
      recipient_id: attendeeId,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      channels: ['email', 'in_app'],
      scheduled_at: new Date(Date.now() - hoursBeforeMeeting * 60 * 60 * 1000).toISOString(),
      metadata: {
        meeting_id: meetingId,
        meeting_date: meetingDate,
        hours_before_meeting: hoursBeforeMeeting,
        meeting_type: meetingType
      }
    };

    return await this.createNotification(notification) as MeetingNotification;
  }

  async createComplianceAlert(
    entityId: string,
    entityType: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    complianceArea: string,
    affectedStudents: number,
    correctiveActions: Array<{
      action_ar: string;
      action_en: string;
      deadline: string;
      responsible_party: string;
    }>
  ): Promise<ComplianceNotification> {
    const priority: NotificationPriority = riskLevel === 'critical' ? 'urgent' : 
      riskLevel === 'high' ? 'high' : 'medium';

    // Get compliance officers and administrators
    const { data: recipients } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'compliance_officer', 'manager']);

    const notifications: Promise<ComplianceNotification>[] = (recipients || []).map(recipient => {
      const notification: CreateNotificationRequest = {
        type: 'compliance_warning',
        priority,
        title_ar: `تحذير امتثال: ${complianceArea}`,
        title_en: `Compliance Warning: ${complianceArea}`,
        message_ar: `تم اكتشاف مشكلة امتثال في ${complianceArea} تؤثر على ${affectedStudents} طالب`,
        message_en: `Compliance issue detected in ${complianceArea} affecting ${affectedStudents} students`,
        recipient_id: recipient.id,
        related_entity_type: entityType,
        related_entity_id: entityId,
        channels: this.getChannelsForPriority(priority),
        metadata: {
          compliance_area: complianceArea,
          risk_level: riskLevel,
          affected_students: affectedStudents,
          corrective_actions: correctiveActions
        }
      };

      return this.createNotification(notification) as Promise<ComplianceNotification>;
    });

    const results = await Promise.all(notifications);
    return results[0]; // Return first notification for consistency
  }

  // Notification delivery and queue management
  async queueNotification(notificationId: string, channels: NotificationChannel[]): Promise<void> {
    const queueItems = channels.map(channel => ({
      id: crypto.randomUUID(),
      notification_id: notificationId,
      channel,
      status: 'queued' as NotificationStatus,
      retry_count: 0,
      max_retries: this.getMaxRetriesForChannel(channel),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notification_queue')
      .insert(queueItems);

    if (error) throw error;

    // Process queue immediately for high priority notifications
    this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.processingQueue.get('main')) return;
    this.processingQueue.set('main', true);

    try {
      const { data: queuedItems } = await supabase
        .from('notification_queue')
        .select(`
          *,
          notification:notifications(*)
        `)
        .eq('processing_status', 'queued')
        .order('priority_score', { ascending: false })
        .limit(50);

      if (!queuedItems?.length) return;

      for (const item of queuedItems) {
        try {
          await this.processNotificationDelivery(item);
        } catch (error) {
          console.error(`Failed to process notification ${item.notification_id}:`, error);
          await this.handleDeliveryFailure(item.id, error as Error);
        }
      }
    } finally {
      this.processingQueue.set('main', false);
    }
  }

  private async processNotificationDelivery(queueItem: any): Promise<void> {
    const { notification } = queueItem;
    
    // Update queue item to processing
    await supabase
      .from('notification_queue')
      .update({ 
        processing_status: 'processing',
        processor_id: 'main-processor',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);

    let deliveryResult: NotificationDelivery;

    switch (queueItem.channel) {
      case 'email':
        deliveryResult = await this.deliverEmail(notification, queueItem);
        break;
      case 'sms':
        deliveryResult = await this.deliverSMS(notification, queueItem);
        break;
      case 'whatsapp':
        deliveryResult = await this.deliverWhatsApp(notification, queueItem);
        break;
      case 'in_app':
        deliveryResult = await this.deliverInApp(notification, queueItem);
        break;
      case 'push':
        deliveryResult = await this.deliverPush(notification, queueItem);
        break;
      default:
        throw new Error(`Unsupported channel: ${queueItem.channel}`);
    }

    // Save delivery record
    await supabase
      .from('notification_deliveries')
      .insert(deliveryResult);

    // Update queue item status
    await supabase
      .from('notification_queue')
      .update({
        processing_status: deliveryResult.status === 'failed' ? 'failed' : 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);
  }

  private async deliverEmail(notification: BaseNotification, queueItem: any): Promise<NotificationDelivery> {
    try {
      // Get user email and preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, language')
        .eq('id', notification.recipient_id)
        .single();

      if (!profile?.email) {
        throw new Error('No email address found for recipient');
      }

      const language = profile.language || 'ar';
      const subject = language === 'ar' ? notification.title_ar : notification.title_en;
      const body = language === 'ar' ? notification.message_ar : notification.message_en;

      // Here you would integrate with your email service (e.g., SendGrid, AWS SES)
      // For now, we'll simulate the email delivery
      const emailResult = await this.simulateEmailDelivery({
        to: profile.email,
        subject,
        body,
        metadata: notification.metadata
      });

      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'email',
        status: emailResult.success ? 'delivered' : 'failed',
        delivered_at: emailResult.success ? new Date().toISOString() : undefined,
        failed_at: !emailResult.success ? new Date().toISOString() : undefined,
        failure_reason: emailResult.error,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        external_reference: emailResult.messageId,
        metadata: { email: profile.email, language }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'email',
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: (error as Error).message,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: {}
      };
    }
  }

  private async deliverSMS(notification: BaseNotification, queueItem: any): Promise<NotificationDelivery> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, language')
        .eq('id', notification.recipient_id)
        .single();

      if (!profile?.phone) {
        throw new Error('No phone number found for recipient');
      }

      const language = profile.language || 'ar';
      const message = language === 'ar' ? notification.message_ar : notification.message_en;

      // Simulate SMS delivery
      const smsResult = await this.simulateSMSDelivery({
        to: profile.phone,
        message,
        metadata: notification.metadata
      });

      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'sms',
        status: smsResult.success ? 'delivered' : 'failed',
        delivered_at: smsResult.success ? new Date().toISOString() : undefined,
        failed_at: !smsResult.success ? new Date().toISOString() : undefined,
        failure_reason: smsResult.error,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        external_reference: smsResult.messageId,
        metadata: { phone: profile.phone, language }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'sms',
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: (error as Error).message,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: {}
      };
    }
  }

  private async deliverWhatsApp(notification: BaseNotification, queueItem: any): Promise<NotificationDelivery> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, whatsapp_enabled, language')
        .eq('id', notification.recipient_id)
        .single();

      if (!profile?.phone || !profile.whatsapp_enabled) {
        throw new Error('WhatsApp not available for recipient');
      }

      const language = profile.language || 'ar';
      const message = language === 'ar' ? notification.message_ar : notification.message_en;

      // Simulate WhatsApp delivery
      const whatsappResult = await this.simulateWhatsAppDelivery({
        to: profile.phone,
        message,
        type: notification.type,
        metadata: notification.metadata
      });

      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'whatsapp',
        status: whatsappResult.success ? 'delivered' : 'failed',
        delivered_at: whatsappResult.success ? new Date().toISOString() : undefined,
        failed_at: !whatsappResult.success ? new Date().toISOString() : undefined,
        failure_reason: whatsappResult.error,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        external_reference: whatsappResult.messageId,
        metadata: { phone: profile.phone, language }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'whatsapp',
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: (error as Error).message,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: {}
      };
    }
  }

  private async deliverInApp(notification: BaseNotification, queueItem: any): Promise<NotificationDelivery> {
    try {
      // Store in-app notification
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          id: crypto.randomUUID(),
          user_id: notification.recipient_id,
          notification_id: notification.id,
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send real-time notification via Supabase channels
      await supabase
        .channel(`notifications-${notification.recipient_id}`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            notification_id: notification.id,
            type: notification.type,
            priority: notification.priority,
            title_ar: notification.title_ar,
            title_en: notification.title_en,
            message_ar: notification.message_ar,
            message_en: notification.message_en
          }
        });

      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'in_app',
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: { user_id: notification.recipient_id }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'in_app',
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: (error as Error).message,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: {}
      };
    }
  }

  private async deliverPush(notification: BaseNotification, queueItem: any): Promise<NotificationDelivery> {
    try {
      // Get user's push token
      const { data: pushTokens } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', notification.recipient_id)
        .eq('is_active', true);

      if (!pushTokens?.length) {
        throw new Error('No active push tokens found for recipient');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', notification.recipient_id)
        .single();

      const language = profile?.language || 'ar';
      const title = language === 'ar' ? notification.title_ar : notification.title_en;
      const body = language === 'ar' ? notification.message_ar : notification.message_en;

      // Send push notification to all active tokens
      const pushResults = await Promise.all(
        pushTokens.map(tokenInfo =>
          this.simulatePushDelivery({
            token: tokenInfo.token,
            platform: tokenInfo.platform,
            title,
            body,
            data: {
              notification_id: notification.id,
              type: notification.type,
              entity_type: notification.related_entity_type,
              entity_id: notification.related_entity_id
            }
          })
        )
      );

      const hasSuccess = pushResults.some(result => result.success);
      const allErrors = pushResults.filter(result => !result.success).map(result => result.error);

      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'push',
        status: hasSuccess ? 'delivered' : 'failed',
        delivered_at: hasSuccess ? new Date().toISOString() : undefined,
        failed_at: !hasSuccess ? new Date().toISOString() : undefined,
        failure_reason: allErrors.length > 0 ? allErrors.join('; ') : undefined,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: { token_count: pushTokens.length, success_count: pushResults.filter(r => r.success).length }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        notification_id: notification.id,
        channel: 'push',
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: (error as Error).message,
        retry_count: queueItem.retry_count,
        max_retries: queueItem.max_retries,
        metadata: {}
      };
    }
  }

  // Utility methods for channel management
  private getChannelsForPriority(priority: NotificationPriority): NotificationChannel[] {
    switch (priority) {
      case 'urgent':
        return ['email', 'sms', 'whatsapp', 'in_app', 'push'];
      case 'high':
        return ['email', 'in_app', 'push'];
      case 'medium':
        return ['email', 'in_app'];
      case 'low':
      default:
        return ['in_app'];
    }
  }

  private getMaxRetriesForChannel(channel: NotificationChannel): number {
    switch (channel) {
      case 'email': return 5;
      case 'sms': return 3;
      case 'whatsapp': return 3;
      case 'in_app': return 1;
      case 'push': return 3;
      default: return 1;
    }
  }

  private async handleDeliveryFailure(queueItemId: string, error: Error): Promise<void> {
    await supabase
      .from('notification_queue')
      .update({
        processing_status: 'failed',
        error_details: {
          error_code: 'DELIVERY_FAILED',
          error_message: error.message,
          stack_trace: error.stack
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItemId);
  }

  // Simulation methods (replace with real service integrations)
  private async simulateEmailDelivery(email: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    return {
      success,
      messageId: success ? `email-${crypto.randomUUID()}` : undefined,
      error: success ? undefined : 'Simulated email delivery failure'
    };
  }

  private async simulateSMSDelivery(sms: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const success = Math.random() > 0.1;
    return {
      success,
      messageId: success ? `sms-${crypto.randomUUID()}` : undefined,
      error: success ? undefined : 'Simulated SMS delivery failure'
    };
  }

  private async simulateWhatsAppDelivery(whatsapp: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const success = Math.random() > 0.08;
    return {
      success,
      messageId: success ? `whatsapp-${crypto.randomUUID()}` : undefined,
      error: success ? undefined : 'Simulated WhatsApp delivery failure'
    };
  }

  private async simulatePushDelivery(push: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const success = Math.random() > 0.15;
    return {
      success,
      messageId: success ? `push-${crypto.randomUUID()}` : undefined,
      error: success ? undefined : 'Simulated push delivery failure'
    };
  }

  // System health monitoring
  private initializeHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Check every minute
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      
      // Log critical issues
      if (health.error_rate > 0.1) {
        console.warn(`High notification error rate: ${health.error_rate * 100}%`);
      }
      
      if (health.queue_size > 1000) {
        console.warn(`Large notification queue size: ${health.queue_size}`);
      }
      
      // Store health metrics
      await supabase
        .from('system_health_logs')
        .insert({
          service: 'notification_system',
          health_data: health,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  async getSystemHealth(): Promise<NotificationSystemHealth> {
    const [queueStats, deliveryStats] = await Promise.all([
      supabase
        .from('notification_queue')
        .select('processing_status, channel, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      supabase
        .from('notification_deliveries')
        .select('status, channel, delivered_at, failed_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    const queueSize = queueStats.data?.filter(item => item.processing_status === 'queued').length || 0;
    const pendingNotifications = queueStats.data?.filter(item => 
      ['queued', 'processing'].includes(item.processing_status)
    ).length || 0;
    
    const failedNotifications = deliveryStats.data?.filter(item => item.status === 'failed').length || 0;
    const totalNotifications = deliveryStats.data?.length || 1;
    const errorRate = failedNotifications / totalNotifications;

    const channelStatus: Record<NotificationChannel, any> = {
      email: { is_operational: true, last_success: new Date().toISOString(), error_count_24h: 0 },
      sms: { is_operational: true, last_success: new Date().toISOString(), error_count_24h: 0 },
      whatsapp: { is_operational: true, last_success: new Date().toISOString(), error_count_24h: 0 },
      in_app: { is_operational: true, last_success: new Date().toISOString(), error_count_24h: 0 },
      push: { is_operational: true, last_success: new Date().toISOString(), error_count_24h: 0 }
    };

    return {
      queue_size: queueSize,
      average_processing_time: 2.5, // seconds
      error_rate: errorRate,
      channel_status: channelStatus,
      pending_notifications: pendingNotifications,
      failed_notifications: failedNotifications,
      system_load: {
        cpu_usage: 0.25,
        memory_usage: 0.30,
        disk_usage: 0.15
      },
      last_health_check: new Date().toISOString()
    };
  }

  // Cleanup and shutdown
  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const notificationService = NotificationSystemService.getInstance();