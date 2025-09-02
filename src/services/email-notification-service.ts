/**
 * Email Notification Service
 * Handles email notifications with template support and bilingual content
 * خدمة إشعارات البريد الإلكتروني مع دعم القوالب والمحتوى ثنائي اللغة
 */

import { supabase } from '@/lib/supabase';

export interface EmailTemplate {
  type: 'parent_notification' | 'appointment_reminder' | 'goal_achieved' | 'session_completed' | 'document_uploaded';
  subject_ar: string;
  subject_en: string;
  template_ar: string;
  template_en: string;
  variables?: string[];
}

export interface EmailQueueItem {
  id: string;
  recipient_email: string;
  subject_ar: string;
  subject_en: string;
  content_ar: string;
  content_en: string;
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

export class EmailNotificationService {
  /**
   * Send email notification by queuing it for n8n processing
   * إرسال إشعار بريد إلكتروني عن طريق وضعه في قائمة الانتظار لمعالجة n8n
   */
  static async sendNotification(data: {
    recipient_email: string;
    template_type: string;
    variables: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    scheduled_for?: string;
    metadata?: any;
  }): Promise<EmailQueueItem> {
    // Get email template
    const template = await this.getTemplate(data.template_type);
    if (!template) {
      throw new Error(`Email template not found: ${data.template_type}`);
    }

    // Render template with variables
    const { subject_ar, subject_en, content_ar, content_en } = this.renderTemplate(
      template,
      data.variables
    );

    // Queue email for processing
    const { data: queueItem, error } = await supabase
      .from('email_queue')
      .insert({
        recipient_email: data.recipient_email,
        subject_ar,
        subject_en,
        content_ar,
        content_en,
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
      console.error('Error queueing email:', error);
      throw new Error(`Failed to queue email: ${error.message}`);
    }

    return queueItem;
  }

  /**
   * Get email template by type
   * الحصول على قالب البريد الإلكتروني حسب النوع
   */
  static async getTemplate(type: string): Promise<EmailTemplate | null> {
    const templates: Record<string, EmailTemplate> = {
      parent_notification: {
        type: 'parent_notification',
        subject_ar: 'إشعار من بوابة ولي الأمر - {{title_ar}}',
        subject_en: 'Parent Portal Notification - {{title_en}}',
        template_ar: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">مركز أركان للنمو</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0;">بوابة ولي الأمر</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">{{title_ar}}</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">{{content_ar}}</p>
              
              {{#if action_url}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{action_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  عرض التفاصيل
                </a>
              </div>
              {{/if}}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  تاريخ الإرسال: {{sent_date}}<br>
                  {{#if student_name_ar}}الطالب: {{student_name_ar}}{{/if}}
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                هذا الإشعار مرسل تلقائياً من نظام إدارة العلاج. لا ترد على هذا البريد الإلكتروني.
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                مركز أركان للنمو | جدة، المملكة العربية السعودية
              </p>
            </div>
          </div>
        `,
        template_en: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Arkan Growth Center</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0;">Parent Portal</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">{{title_en}}</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">{{content_en}}</p>
              
              {{#if action_url}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{action_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Details
                </a>
              </div>
              {{/if}}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  Sent: {{sent_date}}<br>
                  {{#if student_name_en}}Student: {{student_name_en}}{{/if}}
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                This notification is sent automatically from the Therapy Management System. Do not reply to this email.
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                Arkan Growth Center | Jeddah, Saudi Arabia
              </p>
            </div>
          </div>
        `,
        variables: ['title_ar', 'title_en', 'content_ar', 'content_en', 'action_url', 'student_name_ar', 'student_name_en', 'sent_date']
      },

      appointment_reminder: {
        type: 'appointment_reminder',
        subject_ar: 'تذكير: موعد العلاج غداً - {{student_name_ar}}',
        subject_en: 'Reminder: Therapy Appointment Tomorrow - {{student_name_en}}',
        template_ar: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">تذكير بالموعد</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #856404; margin: 0 0 10px 0; font-size: 20px;">موعد العلاج غداً</h2>
                <p style="color: #856404; margin: 0; font-size: 16px;">لديك موعد علاج مهم غداً، يرجى عدم نسيانه!</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 15px 0;">تفاصيل الموعد:</h3>
                <p style="color: #666; margin: 5px 0;"><strong>الطالب:</strong> {{student_name_ar}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>المعالج:</strong> {{therapist_name_ar}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>الوقت:</strong> {{appointment_time}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>نوع الجلسة:</strong> {{session_type_ar}}</p>
                {{#if location}}<p style="color: #666; margin: 5px 0;"><strong>الموقع:</strong> {{location}}</p>{{/if}}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{calendar_url}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  إضافة للتقويم
                </a>
                <a href="{{portal_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  فتح بوابة ولي الأمر
                </a>
              </div>
            </div>
          </div>
        `,
        template_en: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Reminder</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #856404; margin: 0 0 10px 0; font-size: 20px;">Therapy Appointment Tomorrow</h2>
                <p style="color: #856404; margin: 0; font-size: 16px;">You have an important therapy appointment tomorrow, please don't forget!</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Appointment Details:</h3>
                <p style="color: #666; margin: 5px 0;"><strong>Student:</strong> {{student_name_en}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Therapist:</strong> {{therapist_name_en}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Time:</strong> {{appointment_time}}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Session Type:</strong> {{session_type_en}}</p>
                {{#if location}}<p style="color: #666; margin: 5px 0;"><strong>Location:</strong> {{location}}</p>{{/if}}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{calendar_url}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Add to Calendar
                </a>
                <a href="{{portal_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Open Parent Portal
                </a>
              </div>
            </div>
          </div>
        `,
        variables: ['student_name_ar', 'student_name_en', 'therapist_name_ar', 'therapist_name_en', 'appointment_time', 'session_type_ar', 'session_type_en', 'location', 'calendar_url', 'portal_url']
      },

      goal_achieved: {
        type: 'goal_achieved',
        subject_ar: '🎉 تحقيق هدف جديد - {{student_name_ar}}',
        subject_en: '🎉 New Goal Achieved - {{student_name_en}}',
        template_ar: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 مبروك!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0;">تحقيق هدف علاجي جديد</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 22px;">{{student_name_ar}} حقق هدفاً جديداً!</h2>
                <p style="color: #155724; margin: 0; font-size: 18px;">"{{goal_title_ar}}"</p>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
                نهنئكم على هذا الإنجاز الرائع! يُظهر {{student_name_ar}} تقدماً ممتازاً في رحلة العلاج.
                هذا دليل على الجهد المستمر والالتزام بالبرنامج العلاجي.
              </p>
              
              {{#if progress_details}}
              <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 15px 0;">تفاصيل التقدم:</h3>
                <p style="color: #666; line-height: 1.6;">{{progress_details}}</p>
              </div>
              {{/if}}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{progress_url}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  مراجعة التقدم
                </a>
              </div>
            </div>
          </div>
        `,
        template_en: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0;">New therapeutic goal achieved</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 22px;">{{student_name_en}} achieved a new goal!</h2>
                <p style="color: #155724; margin: 0; font-size: 18px;">"{{goal_title_en}}"</p>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
                Congratulations on this wonderful achievement! {{student_name_en}} is showing excellent progress in their therapy journey.
                This is evidence of continuous effort and commitment to the therapeutic program.
              </p>
              
              {{#if progress_details}}
              <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Progress Details:</h3>
                <p style="color: #666; line-height: 1.6;">{{progress_details}}</p>
              </div>
              {{/if}}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{progress_url}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Review Progress
                </a>
              </div>
            </div>
          </div>
        `,
        variables: ['student_name_ar', 'student_name_en', 'goal_title_ar', 'goal_title_en', 'progress_details', 'progress_url']
      }
    };

    return templates[type] || null;
  }

  /**
   * Render template with variables using simple string replacement
   * عرض القالب مع المتغيرات باستخدام استبدال نصي بسيط
   */
  static renderTemplate(template: EmailTemplate, variables: Record<string, any>): {
    subject_ar: string;
    subject_en: string;
    content_ar: string;
    content_en: string;
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
        return vars[varName] ? content : '';
      });
      
      // Add current date if not provided
      if (!vars.sent_date) {
        vars.sent_date = new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return rendered;
    };

    return {
      subject_ar: renderString(template.subject_ar, variables),
      subject_en: renderString(template.subject_en, variables),
      content_ar: renderString(template.template_ar, variables),
      content_en: renderString(template.template_en, variables)
    };
  }

  /**
   * Get email queue status
   * الحصول على حالة قائمة انتظار البريد الإلكتروني
   */
  static async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('email_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      console.error('Error fetching queue status:', error);
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
   * Retry failed emails
   * إعادة محاولة البريدات الإلكترونية المفشلة
   */
  static async retryFailedEmails(): Promise<number> {
    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'pending',
        scheduled_for: new Date().toISOString()
      })
      .eq('status', 'failed')
      .lt('attempts', 3) // Only retry emails with less than 3 attempts
      .select();

    if (error) {
      console.error('Error retrying failed emails:', error);
      throw new Error(`Failed to retry emails: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Cancel scheduled email
   * إلغاء بريد إلكتروني مجدول
   */
  static async cancelEmail(emailId: string): Promise<void> {
    const { error } = await supabase
      .from('email_queue')
      .update({ status: 'cancelled' })
      .eq('id', emailId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling email:', error);
      throw new Error(`Failed to cancel email: ${error.message}`);
    }
  }
}