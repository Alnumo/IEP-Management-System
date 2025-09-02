/**
 * WhatsApp Notification Service
 * Handles WhatsApp notifications via n8n workflow integration
 * خدمة إشعارات الواتساب عبر تكامل n8n
 */

import { supabase } from '@/lib/supabase';

export interface WhatsAppTemplate {
  type: 'parent_notification' | 'appointment_reminder' | 'goal_achieved' | 'session_completed';
  template_ar: string;
  template_en: string;
  variables?: string[];
  media_type?: 'text' | 'image' | 'document';
}

export interface WhatsAppQueueItem {
  id: string;
  recipient_phone: string;
  message_ar: string;
  message_en: string;
  template_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  processed_at?: string;
  metadata?: any;
  error_message?: string;
  created_at: string;
}

export class WhatsAppNotificationService {
  /**
   * Send WhatsApp notification by queuing it for n8n processing
   * إرسال إشعار واتساب عن طريق وضعه في قائمة الانتظار لمعالجة n8n
   */
  static async sendNotification(data: {
    recipient_phone: string;
    template_type: string;
    variables: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    scheduled_for?: string;
    metadata?: any;
  }): Promise<WhatsAppQueueItem> {
    // Get WhatsApp template
    const template = await this.getTemplate(data.template_type);
    if (!template) {
      throw new Error(`WhatsApp template not found: ${data.template_type}`);
    }

    // Render template with variables
    const { message_ar, message_en } = this.renderTemplate(template, data.variables);

    // Validate phone number format
    const phoneNumber = this.formatPhoneNumber(data.recipient_phone);
    if (!phoneNumber) {
      throw new Error('Invalid phone number format');
    }

    // Queue WhatsApp message for processing
    const { data: queueItem, error } = await supabase
      .from('whatsapp_queue')
      .insert({
        recipient_phone: phoneNumber,
        message_ar,
        message_en,
        template_type: data.template_type,
        priority: data.priority || 'medium',
        scheduled_for: data.scheduled_for || new Date().toISOString(),
        metadata: {
          ...data.metadata,
          variables: data.variables,
          template_id: template.type
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error queueing WhatsApp message:', error);
      throw new Error(`Failed to queue WhatsApp message: ${error.message}`);
    }

    return queueItem;
  }

  /**
   * Get WhatsApp template by type
   * الحصول على قالب الواتساب حسب النوع
   */
  static async getTemplate(type: string): Promise<WhatsAppTemplate | null> {
    const templates: Record<string, WhatsAppTemplate> = {
      parent_notification: {
        type: 'parent_notification',
        template_ar: `🔔 إشعار من مركز أركان للنمو

{{title_ar}}

{{content_ar}}

{{#if action_url}}
للمزيد من التفاصيل: {{action_url}}
{{/if}}

{{#if student_name_ar}}الطالب: {{student_name_ar}}{{/if}}
التاريخ: {{sent_date}}

---
بوابة ولي الأمر | مركز أركان للنمو`,
        template_en: `🔔 Arkan Growth Center Notification

{{title_en}}

{{content_en}}

{{#if action_url}}
For more details: {{action_url}}
{{/if}}

{{#if student_name_en}}Student: {{student_name_en}}{{/if}}
Date: {{sent_date}}

---
Parent Portal | Arkan Growth Center`,
        variables: ['title_ar', 'title_en', 'content_ar', 'content_en', 'action_url', 'student_name_ar', 'student_name_en', 'sent_date'],
        media_type: 'text'
      },

      appointment_reminder: {
        type: 'appointment_reminder',
        template_ar: `⏰ تذكير بموعد العلاج

مرحباً! لديك موعد علاج مهم غداً:

👤 الطالب: {{student_name_ar}}
👨‍⚕️ المعالج: {{therapist_name_ar}}
🕐 الوقت: {{appointment_time}}
📍 الموقع: {{location}}

يرجى الحضور في الوقت المحدد.

{{#if preparation_notes}}
ملاحظات للتحضير:
{{preparation_notes}}
{{/if}}

للاستفسار: {{center_phone}}

---
مركز أركان للنمو 🌱`,
        template_en: `⏰ Therapy Appointment Reminder

Hello! You have an important therapy appointment tomorrow:

👤 Student: {{student_name_en}}
👨‍⚕️ Therapist: {{therapist_name_en}}
🕐 Time: {{appointment_time}}
📍 Location: {{location}}

Please arrive on time.

{{#if preparation_notes}}
Preparation notes:
{{preparation_notes}}
{{/if}}

For inquiries: {{center_phone}}

---
Arkan Growth Center 🌱`,
        variables: ['student_name_ar', 'student_name_en', 'therapist_name_ar', 'therapist_name_en', 'appointment_time', 'location', 'preparation_notes', 'center_phone'],
        media_type: 'text'
      },

      goal_achieved: {
        type: 'goal_achieved',
        template_ar: `🎉 مبروك! تحقيق هدف جديد

{{student_name_ar}} حقق هدفاً علاجياً جديداً!

🎯 الهدف المحقق: {{goal_title_ar}}

هذا إنجاز رائع يُظهر التقدم المستمر في رحلة العلاج. نهنئكم على هذا النجاح!

{{#if progress_percentage}}
نسبة التقدم الإجمالية: {{progress_percentage}}%
{{/if}}

{{#if next_goal}}
الهدف التالي: {{next_goal}}
{{/if}}

للمزيد من التفاصيل في بوابة ولي الأمر: {{progress_url}}

---
مركز أركان للنمو 🌟`,
        template_en: `🎉 Congratulations! New Goal Achieved

{{student_name_en}} has achieved a new therapeutic goal!

🎯 Goal Achieved: {{goal_title_en}}

This is a wonderful achievement showing continuous progress in the therapy journey. Congratulations on this success!

{{#if progress_percentage}}
Overall Progress: {{progress_percentage}}%
{{/if}}

{{#if next_goal}}
Next Goal: {{next_goal}}
{{/if}}

For more details in Parent Portal: {{progress_url}}

---
Arkan Growth Center 🌟`,
        variables: ['student_name_ar', 'student_name_en', 'goal_title_ar', 'goal_title_en', 'progress_percentage', 'next_goal', 'progress_url'],
        media_type: 'text'
      },

      session_completed: {
        type: 'session_completed',
        template_ar: `✅ تم إكمال جلسة العلاج

تم إكمال جلسة العلاج لـ {{student_name_ar}} بنجاح

📋 تفاصيل الجلسة:
• النوع: {{session_type_ar}}
• المعالج: {{therapist_name_ar}}
• التاريخ: {{session_date}}
• المدة: {{session_duration}} دقيقة

{{#if session_summary}}
ملخص الجلسة:
{{session_summary}}
{{/if}}

{{#if homework_assigned}}
📚 واجب منزلي جديد متوفر في البوابة
{{/if}}

لمراجعة التقرير الكامل: {{session_url}}

---
مركز أركان للنمو`,
        template_en: `✅ Therapy Session Completed

Therapy session for {{student_name_en}} has been completed successfully

📋 Session Details:
• Type: {{session_type_en}}
• Therapist: {{therapist_name_en}}
• Date: {{session_date}}
• Duration: {{session_duration}} minutes

{{#if session_summary}}
Session Summary:
{{session_summary}}
{{/if}}

{{#if homework_assigned}}
📚 New homework is available in the portal
{{/if}}

To review the full report: {{session_url}}

---
Arkan Growth Center`,
        variables: ['student_name_ar', 'student_name_en', 'session_type_ar', 'session_type_en', 'therapist_name_ar', 'therapist_name_en', 'session_date', 'session_duration', 'session_summary', 'homework_assigned', 'session_url'],
        media_type: 'text'
      }
    };

    return templates[type] || null;
  }

  /**
   * Render template with variables
   * عرض القالب مع المتغيرات
   */
  static renderTemplate(template: WhatsAppTemplate, variables: Record<string, any>): {
    message_ar: string;
    message_en: string;
  } {
    const renderString = (str: string, vars: Record<string, any>): string => {
      let rendered = str;
      
      // Simple variable replacement {{variable}}
      Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, vars[key] || '');
      });
      
      // Handle conditionals {{#if variable}}...{{/if}}
      rendered = rendered.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
        return vars[varName] ? content.trim() : '';
      });
      
      // Add current date if not provided
      if (!vars.sent_date) {
        vars.sent_date = new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // Clean up extra newlines
      rendered = rendered.replace(/\n{3,}/g, '\n\n');
      
      return rendered.trim();
    };

    return {
      message_ar: renderString(template.template_ar, variables),
      message_en: renderString(template.template_en, variables)
    };
  }

  /**
   * Format and validate phone number
   * تنسيق والتحقق من رقم الهاتف
   */
  static formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Saudi phone number validation
    // Should be 10 digits starting with 5, or 12 digits starting with 966
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return `966${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('966')) {
      return cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('9665')) {
      return cleaned.substring(1); // Remove leading 9 if it's 9966...
    }
    
    return null;
  }

  /**
   * Get WhatsApp queue status
   * الحصول على حالة قائمة انتظار الواتساب
   */
  static async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('whatsapp_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      console.error('Error fetching WhatsApp queue status:', error);
      return { pending: 0, processing: 0, sent: 0, failed: 0 };
    }

    const counts = data.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      pending: counts.pending || 0,
      processing: counts.processing || 0,
      sent: counts.sent || 0,
      failed: counts.failed || 0
    };
  }

  /**
   * Send bulk WhatsApp notifications
   * إرسال إشعارات واتساب مجمعة
   */
  static async sendBulkNotifications(notifications: {
    recipient_phone: string;
    template_type: string;
    variables: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }[]): Promise<WhatsAppQueueItem[]> {
    const results: WhatsAppQueueItem[] = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push(result);
      } catch (error) {
        console.error('Error sending bulk WhatsApp notification:', error);
        // Continue with other notifications
      }
    }
    
    return results;
  }

  /**
   * Retry failed WhatsApp messages
   * إعادة محاولة رسائل الواتساب المفشلة
   */
  static async retryFailedMessages(): Promise<number> {
    const { data, error } = await supabase
      .from('whatsapp_queue')
      .update({
        status: 'pending',
        scheduled_for: new Date().toISOString()
      })
      .eq('status', 'failed')
      .lt('attempts', 3) // Only retry messages with less than 3 attempts
      .select();

    if (error) {
      console.error('Error retrying failed WhatsApp messages:', error);
      throw new Error(`Failed to retry WhatsApp messages: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Cancel scheduled WhatsApp message
   * إلغاء رسالة واتساب مجدولة
   */
  static async cancelMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_queue')
      .update({ status: 'cancelled' })
      .eq('id', messageId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling WhatsApp message:', error);
      throw new Error(`Failed to cancel WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Get delivery statistics
   * الحصول على إحصائيات التسليم
   */
  static async getDeliveryStats(days: number = 7): Promise<{
    total_sent: number;
    success_rate: number;
    failed_rate: number;
    avg_delivery_time: number; // in minutes
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('whatsapp_queue')
      .select('status, created_at, processed_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching delivery stats:', error);
      return { total_sent: 0, success_rate: 0, failed_rate: 0, avg_delivery_time: 0 };
    }

    const total = data.length;
    const successful = data.filter(item => item.status === 'sent').length;
    const failed = data.filter(item => item.status === 'failed').length;
    
    // Calculate average delivery time
    const deliveryTimes = data
      .filter(item => item.processed_at && item.status === 'sent')
      .map(item => {
        const created = new Date(item.created_at).getTime();
        const processed = new Date(item.processed_at!).getTime();
        return (processed - created) / (1000 * 60); // Convert to minutes
      });
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;

    return {
      total_sent: total,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
      failed_rate: total > 0 ? (failed / total) * 100 : 0,
      avg_delivery_time: Math.round(avgDeliveryTime)
    };
  }
}