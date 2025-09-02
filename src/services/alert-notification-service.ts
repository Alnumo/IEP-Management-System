/**
 * Alert Notification Service
 * 
 * @description Service for delivering performance alerts through various notification channels
 * Supports email, WhatsApp, SMS, and webhook notifications with retry logic and delivery tracking
 */

import { supabase } from '@/lib/supabase';

interface NotificationChannel {
  id: string;
  channel_name: string;
  channel_type: 'email' | 'whatsapp' | 'sms' | 'webhook' | 'slack';
  enabled: boolean;
  config: {
    recipient?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_pass?: string;
    business_account_id?: string;
    phone_number_id?: string;
    access_token?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  };
  retry_attempts: number;
  retry_delay_seconds: number;
  rate_limit_per_hour: number;
}

interface AlertDelivery {
  id: string;
  alert_id: string;
  rule_id?: string;
  channel_id: string;
  delivery_status: 'pending' | 'sent' | 'failed' | 'retrying';
  delivery_method: string;
  recipient: string;
  retry_count: number;
  message_subject?: string;
  message_body?: string;
  last_error?: string;
  created_at: string;
}

interface PerformanceAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric_name: string;
  threshold_value: number;
  actual_value: number;
  alert_data: Record<string, any>;
  created_at: string;
}

class AlertNotificationService {
  private readonly n8nWebhookUrl: string;

  constructor() {
    this.n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/alerts';
  }

  /**
   * Process pending alert deliveries
   */
  async processPendingDeliveries(): Promise<void> {
    try {
      const { data: pendingDeliveries, error } = await supabase
        .from('alert_deliveries')
        .select(`
          *,
          notification_channels!inner(*),
          performance_alerts!inner(*)
        `)
        .in('delivery_status', ['pending', 'retrying'])
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Failed to fetch pending deliveries:', error);
        return;
      }

      if (!pendingDeliveries || pendingDeliveries.length === 0) {
        return;
      }

      console.log(`Processing ${pendingDeliveries.length} pending alert deliveries`);

      for (const delivery of pendingDeliveries) {
        await this.processDelivery(delivery);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing pending deliveries:', error);
    }
  }

  /**
   * Process a single alert delivery
   */
  private async processDelivery(delivery: any): Promise<void> {
    try {
      const channel = delivery.notification_channels;
      const alert = delivery.performance_alerts;

      if (!channel.enabled) {
        await this.updateDeliveryStatus(delivery.id, 'failed', 'Channel disabled');
        return;
      }

      // Check rate limiting
      if (await this.isRateLimited(channel.id, channel.rate_limit_per_hour)) {
        console.log(`Rate limit reached for channel ${channel.channel_name}, skipping delivery`);
        return;
      }

      // Prepare notification content
      const notificationContent = this.buildNotificationContent(alert, delivery);

      let success = false;
      let errorMessage = '';

      // Deliver based on channel type
      switch (channel.channel_type) {
        case 'email':
          ({ success, errorMessage } = await this.deliverEmail(channel, notificationContent));
          break;
        case 'whatsapp':
          ({ success, errorMessage } = await this.deliverWhatsApp(channel, notificationContent));
          break;
        case 'webhook':
          ({ success, errorMessage } = await this.deliverWebhook(channel, notificationContent));
          break;
        case 'slack':
          ({ success, errorMessage } = await this.deliverSlack(channel, notificationContent));
          break;
        default:
          errorMessage = `Unsupported channel type: ${channel.channel_type}`;
      }

      if (success) {
        await this.updateDeliveryStatus(delivery.id, 'sent', null, {
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString()
        });
        console.log(`Successfully delivered alert ${delivery.alert_id} via ${channel.channel_type}`);
      } else {
        const newRetryCount = delivery.retry_count + 1;
        const maxRetries = channel.retry_attempts;

        if (newRetryCount < maxRetries) {
          // Schedule retry
          await this.updateDeliveryStatus(delivery.id, 'retrying', errorMessage, {
            retry_count: newRetryCount
          });
          console.log(`Delivery failed, scheduling retry ${newRetryCount}/${maxRetries} for alert ${delivery.alert_id}`);
        } else {
          // Max retries reached
          await this.updateDeliveryStatus(delivery.id, 'failed', errorMessage, {
            failed_at: new Date().toISOString(),
            retry_count: newRetryCount
          });
          console.error(`Delivery failed after ${maxRetries} attempts for alert ${delivery.alert_id}: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error(`Error processing delivery ${delivery.id}:`, error);
      await this.updateDeliveryStatus(delivery.id, 'failed', error.message);
    }
  }

  /**
   * Update delivery status in database
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: AlertDelivery['delivery_status'],
    errorMessage?: string | null,
    additionalFields?: Record<string, any>
  ): Promise<void> {
    const updateData: any = {
      delivery_status: status,
      updated_at: new Date().toISOString(),
      ...additionalFields
    };

    if (errorMessage) {
      updateData.last_error = errorMessage;
    }

    const { error } = await supabase
      .from('alert_deliveries')
      .update(updateData)
      .eq('id', deliveryId);

    if (error) {
      console.error(`Failed to update delivery status for ${deliveryId}:`, error);
    }
  }

  /**
   * Check if channel is rate limited
   */
  private async isRateLimited(channelId: string, limitPerHour: number): Promise<boolean> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data, error } = await supabase
      .from('alert_deliveries')
      .select('id')
      .eq('channel_id', channelId)
      .eq('delivery_status', 'sent')
      .gte('sent_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }

    return (data?.length || 0) >= limitPerHour;
  }

  /**
   * Build notification content based on alert data
   */
  private buildNotificationContent(alert: PerformanceAlert, delivery: AlertDelivery): any {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    }[alert.severity];

    const subject = `${severityEmoji} Performance Alert: ${alert.alert_type}`;
    
    const body = `
**Performance Alert Triggered**

${severityEmoji} **Severity:** ${alert.severity.toUpperCase()}
📊 **Metric:** ${alert.metric_name}
📈 **Current Value:** ${alert.actual_value}${this.getMetricUnit(alert.metric_name)}
⚠️ **Threshold:** ${alert.threshold_value}${this.getMetricUnit(alert.metric_name)}
⏰ **Time:** ${new Date(alert.created_at).toLocaleString()}

**Alert Details:**
${alert.alert_data.description || alert.alert_type}

**Additional Information:**
- Rule ID: ${alert.alert_data.rule_id || 'N/A'}
- Evaluation Window: ${alert.alert_data.evaluation_window_minutes || 5} minutes

---
This is an automated alert from the Therapy Plans Manager Performance Monitoring System.
    `.trim();

    return {
      subject,
      body,
      alert,
      delivery,
      severity: alert.severity,
      metric_name: alert.metric_name,
      actual_value: alert.actual_value,
      threshold_value: alert.threshold_value
    };
  }

  /**
   * Get appropriate unit for metric
   */
  private getMetricUnit(metricName: string): string {
    if (metricName.includes('time')) return 'ms';
    if (metricName.includes('rate')) return '%';
    if (metricName.includes('count')) return '';
    return '';
  }

  /**
   * Deliver email notification via n8n workflow
   */
  private async deliverEmail(channel: NotificationChannel, content: any): Promise<{success: boolean, errorMessage: string}> {
    try {
      const response = await fetch(`${this.n8nWebhookUrl}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email',
          channel: channel,
          to: channel.config.recipient,
          subject: content.subject,
          body: content.body,
          alert: content.alert
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, errorMessage: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      return { success: true, errorMessage: '' };
    } catch (error) {
      return { success: false, errorMessage: `Email delivery error: ${error.message}` };
    }
  }

  /**
   * Deliver WhatsApp notification via n8n workflow
   */
  private async deliverWhatsApp(channel: NotificationChannel, content: any): Promise<{success: boolean, errorMessage: string}> {
    try {
      // Format message for WhatsApp
      const whatsappMessage = `${content.subject}\n\n${content.body.replace(/\*\*/g, '*')}`;

      const response = await fetch(`${this.n8nWebhookUrl}/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'whatsapp',
          channel: channel,
          to: channel.config.recipient,
          message: whatsappMessage,
          alert: content.alert
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, errorMessage: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      return { success: true, errorMessage: '' };
    } catch (error) {
      return { success: false, errorMessage: `WhatsApp delivery error: ${error.message}` };
    }
  }

  /**
   * Deliver webhook notification
   */
  private async deliverWebhook(channel: NotificationChannel, content: any): Promise<{success: boolean, errorMessage: string}> {
    try {
      const response = await fetch(channel.config.url, {
        method: channel.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...channel.config.headers
        },
        body: JSON.stringify({
          alert: content.alert,
          severity: content.severity,
          message: content.body,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, errorMessage: `Webhook HTTP ${response.status}: ${errorText}` };
      }

      return { success: true, errorMessage: '' };
    } catch (error) {
      return { success: false, errorMessage: `Webhook delivery error: ${error.message}` };
    }
  }

  /**
   * Deliver Slack notification via n8n workflow
   */
  private async deliverSlack(channel: NotificationChannel, content: any): Promise<{success: boolean, errorMessage: string}> {
    try {
      const slackMessage = {
        text: content.subject,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: content.subject
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Severity:* ${content.severity.toUpperCase()}`
              },
              {
                type: 'mrkdwn', 
                text: `*Metric:* ${content.metric_name}`
              },
              {
                type: 'mrkdwn',
                text: `*Current Value:* ${content.actual_value}`
              },
              {
                type: 'mrkdwn',
                text: `*Threshold:* ${content.threshold_value}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: content.body.replace(/\*\*/g, '*')
            }
          }
        ]
      };

      const response = await fetch(`${this.n8nWebhookUrl}/slack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'slack',
          channel: channel,
          message: slackMessage,
          alert: content.alert
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, errorMessage: `HTTP ${response.status}: ${errorText}` };
      }

      return { success: true, errorMessage: '' };
    } catch (error) {
      return { success: false, errorMessage: `Slack delivery error: ${error.message}` };
    }
  }

  /**
   * Schedule notifications for a new alert
   */
  async scheduleAlertNotifications(alertId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('schedule_alert_notifications', { p_alert_id: alertId });

      if (error) {
        console.error('Failed to schedule alert notifications:', error);
        return 0;
      }

      console.log(`Scheduled ${data} notifications for alert ${alertId}`);
      return data || 0;
    } catch (error) {
      console.error('Error scheduling alert notifications:', error);
      return 0;
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursBack);

    try {
      const { data: deliveries, error } = await supabase
        .from('alert_deliveries')
        .select('delivery_status, delivery_method, created_at')
        .gte('created_at', startTime.toISOString());

      if (error) throw error;

      const stats = {
        total: deliveries?.length || 0,
        sent: 0,
        failed: 0,
        pending: 0,
        retrying: 0,
        by_method: {} as Record<string, number>,
        success_rate: 0
      };

      deliveries?.forEach(delivery => {
        stats[delivery.delivery_status]++;
        stats.by_method[delivery.delivery_method] = (stats.by_method[delivery.delivery_method] || 0) + 1;
      });

      stats.success_rate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const alertNotificationService = new AlertNotificationService();
export default alertNotificationService;