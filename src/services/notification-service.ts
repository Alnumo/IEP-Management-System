/**
 * Comprehensive Notification Service
 * Handles all types of notifications across the application
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'

// =====================================================
// NOTIFICATION TYPES & INTERFACES
// =====================================================

export type NotificationType = 
  // Attendance notifications
  | 'attendance_checkin'
  | 'attendance_checkout' 
  | 'attendance_late'
  | 'attendance_absent'
  // Session notifications
  | 'session_reminder'
  | 'session_started'
  | 'session_completed'
  | 'session_cancelled'
  | 'session_rescheduled'
  // Assessment notifications
  | 'assessment_due'
  | 'assessment_completed'
  | 'assessment_overdue'
  // Progress notifications
  | 'goal_achieved'
  | 'progress_update'
  | 'milestone_reached'
  // Administrative
  | 'payment_due'
  | 'payment_received'
  | 'document_required'
  | 'system_update'
  | 'emergency_contact'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'browser'
export type RecipientType = 'student' | 'parent' | 'therapist' | 'admin' | 'system'

export interface NotificationPreferences {
  user_id: string
  notification_type: NotificationType
  channels: NotificationChannel[]
  enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone?: string
}

export interface Notification {
  id: string
  recipient_id: string
  recipient_type: RecipientType
  notification_type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: Record<string, any>
  channels: NotificationChannel[]
  scheduled_for?: string
  sent_at?: string
  read_at?: string
  is_read: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationTemplate {
  type: NotificationType
  priority: NotificationPriority
  title: {
    ar: string
    en: string
  }
  message: {
    ar: (data: any) => string
    en: (data: any) => string
  }
  default_channels: NotificationChannel[]
  expires_after_hours?: number
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

export const NotificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // Attendance Templates
  attendance_checkin: {
    type: 'attendance_checkin',
    priority: 'medium',
    title: {
      ar: 'تسجيل وصول الطالب',
      en: 'Student Check-in'
    },
    message: {
      ar: (data) => `وصل ${data.student_name} بأمان إلى المركز في ${data.time}${data.room ? ` في الغرفة ${data.room}` : ''}.`,
      en: (data) => `${data.student_name} has checked in safely at ${data.time}${data.room ? ` in room ${data.room}` : ''}.`
    },
    default_channels: ['in_app', 'push'],
    expires_after_hours: 24
  },

  attendance_late: {
    type: 'attendance_late',
    priority: 'high',
    title: {
      ar: 'تأخير في الوصول',
      en: 'Late Arrival'
    },
    message: {
      ar: (data) => `وصل الطالب ${data.student_name} متأخراً ${data.minutes} دقيقة عن موعد جلسة ${data.session_type}.`,
      en: (data) => `${data.student_name} arrived ${data.minutes} minutes late for their ${data.session_type} session.`
    },
    default_channels: ['in_app', 'sms', 'push'],
    expires_after_hours: 6
  },

  attendance_absent: {
    type: 'attendance_absent',
    priority: 'high',
    title: {
      ar: 'غياب الطالب',
      en: 'Student Absence'
    },
    message: {
      ar: (data) => `لم يحضر الطالب ${data.student_name} لجلسة ${data.session_type} المقررة في ${data.scheduled_time}.`,
      en: (data) => `${data.student_name} did not attend their scheduled ${data.session_type} session at ${data.scheduled_time}.`
    },
    default_channels: ['in_app', 'sms', 'email'],
    expires_after_hours: 12
  },

  // Session Templates
  session_reminder: {
    type: 'session_reminder',
    priority: 'medium',
    title: {
      ar: 'تذكير بموعد الجلسة',
      en: 'Session Reminder'
    },
    message: {
      ar: (data) => `تذكير: لديك جلسة ${data.session_type} مع ${data.therapist_name} غداً في ${data.time}.`,
      en: (data) => `Reminder: You have a ${data.session_type} session with ${data.therapist_name} tomorrow at ${data.time}.`
    },
    default_channels: ['in_app', 'sms', 'email'],
    expires_after_hours: 24
  },

  session_cancelled: {
    type: 'session_cancelled',
    priority: 'high',
    title: {
      ar: 'إلغاء الجلسة',
      en: 'Session Cancelled'
    },
    message: {
      ar: (data) => `تم إلغاء جلسة ${data.session_type} المقررة في ${data.scheduled_time}. ${data.reason ? `السبب: ${data.reason}` : ''}`,
      en: (data) => `Your ${data.session_type} session scheduled for ${data.scheduled_time} has been cancelled. ${data.reason ? `Reason: ${data.reason}` : ''}`
    },
    default_channels: ['in_app', 'sms', 'email', 'push'],
    expires_after_hours: 48
  },

  // Assessment Templates
  assessment_due: {
    type: 'assessment_due',
    priority: 'medium',
    title: {
      ar: 'تقييم مطلوب',
      en: 'Assessment Due'
    },
    message: {
      ar: (data) => `يجب إجراء تقييم ${data.assessment_type} للطالب ${data.student_name} بحلول ${data.due_date}.`,
      en: (data) => `${data.assessment_type} assessment for ${data.student_name} is due by ${data.due_date}.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 72
  },

  // Progress Templates
  goal_achieved: {
    type: 'goal_achieved',
    priority: 'low',
    title: {
      ar: '🎉 تحقيق هدف!',
      en: '🎉 Goal Achieved!'
    },
    message: {
      ar: (data) => `تهانينا! حقق ${data.student_name} الهدف: "${data.goal_title}". نسبة التحسن: ${data.progress}%`,
      en: (data) => `Congratulations! ${data.student_name} has achieved the goal: "${data.goal_title}". Progress: ${data.progress}%`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 168 // 1 week
  },

  // Administrative Templates
  payment_due: {
    type: 'payment_due',
    priority: 'high',
    title: {
      ar: 'استحقاق دفع',
      en: 'Payment Due'
    },
    message: {
      ar: (data) => `يستحق دفع مبلغ ${data.amount} ر.س للطالب ${data.student_name} بتاريخ ${data.due_date}.`,
      en: (data) => `Payment of ${data.amount} SAR is due for ${data.student_name} by ${data.due_date}.`
    },
    default_channels: ['in_app', 'email', 'sms'],
    expires_after_hours: 72
  },

  emergency_contact: {
    type: 'emergency_contact',
    priority: 'urgent',
    title: {
      ar: '🚨 اتصال طوارئ',
      en: '🚨 Emergency Contact'
    },
    message: {
      ar: (data) => `يرجى الاتصال بالمركز فوراً بخصوص ${data.student_name}. السبب: ${data.reason}`,
      en: (data) => `Please contact the center immediately regarding ${data.student_name}. Reason: ${data.reason}`
    },
    default_channels: ['in_app', 'sms', 'push', 'email'],
    expires_after_hours: 2
  },

  // Add other notification types with appropriate defaults
  attendance_checkout: {
    type: 'attendance_checkout',
    priority: 'medium',
    title: { ar: 'انتهاء الجلسة', en: 'Session Complete' },
    message: {
      ar: (data) => `انتهت جلسة ${data.session_type} للطالب ${data.student_name} في ${data.time}.`,
      en: (data) => `${data.student_name}'s ${data.session_type} session completed at ${data.time}.`
    },
    default_channels: ['in_app', 'push'],
    expires_after_hours: 24
  },

  session_started: {
    type: 'session_started',
    priority: 'medium',
    title: { ar: 'بدء الجلسة', en: 'Session Started' },
    message: {
      ar: (data) => `بدأت جلسة ${data.session_type} للطالب ${data.student_name}.`,
      en: (data) => `${data.session_type} session has started for ${data.student_name}.`
    },
    default_channels: ['in_app'],
    expires_after_hours: 6
  },

  session_completed: {
    type: 'session_completed',
    priority: 'low',
    title: { ar: 'اكتمال الجلسة', en: 'Session Completed' },
    message: {
      ar: (data) => `تم إكمال جلسة ${data.session_type} للطالب ${data.student_name} بنجاح.`,
      en: (data) => `${data.session_type} session for ${data.student_name} completed successfully.`
    },
    default_channels: ['in_app'],
    expires_after_hours: 48
  },

  session_rescheduled: {
    type: 'session_rescheduled',
    priority: 'high',
    title: { ar: 'إعادة جدولة الجلسة', en: 'Session Rescheduled' },
    message: {
      ar: (data) => `تم إعادة جدولة جلسة ${data.session_type} إلى ${data.new_time}.`,
      en: (data) => `Your ${data.session_type} session has been rescheduled to ${data.new_time}.`
    },
    default_channels: ['in_app', 'sms', 'email'],
    expires_after_hours: 48
  },

  assessment_completed: {
    type: 'assessment_completed',
    priority: 'low',
    title: { ar: 'اكتمال التقييم', en: 'Assessment Completed' },
    message: {
      ar: (data) => `تم إكمال تقييم ${data.assessment_type} للطالب ${data.student_name}.`,
      en: (data) => `${data.assessment_type} assessment for ${data.student_name} has been completed.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 168
  },

  assessment_overdue: {
    type: 'assessment_overdue',
    priority: 'high',
    title: { ar: 'تقييم متأخر', en: 'Assessment Overdue' },
    message: {
      ar: (data) => `تقييم ${data.assessment_type} للطالب ${data.student_name} متأخر ${data.days_overdue} أيام.`,
      en: (data) => `${data.assessment_type} assessment for ${data.student_name} is ${data.days_overdue} days overdue.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 48
  },

  progress_update: {
    type: 'progress_update',
    priority: 'low',
    title: { ar: 'تحديث التقدم', en: 'Progress Update' },
    message: {
      ar: (data) => `تم تحديث تقدم ${data.student_name} في ${data.goal_area}. التقدم الحالي: ${data.progress}%`,
      en: (data) => `Progress update for ${data.student_name} in ${data.goal_area}. Current progress: ${data.progress}%`
    },
    default_channels: ['in_app'],
    expires_after_hours: 168
  },

  milestone_reached: {
    type: 'milestone_reached',
    priority: 'medium',
    title: { ar: '🎯 علامة فارقة', en: '🎯 Milestone Reached' },
    message: {
      ar: (data) => `وصل ${data.student_name} إلى علامة فارقة مهمة في ${data.milestone_title}.`,
      en: (data) => `${data.student_name} has reached an important milestone in ${data.milestone_title}.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 168
  },

  payment_received: {
    type: 'payment_received',
    priority: 'low',
    title: { ar: 'استلام دفع', en: 'Payment Received' },
    message: {
      ar: (data) => `تم استلام دفع بمبلغ ${data.amount} ر.س للطالب ${data.student_name}.`,
      en: (data) => `Payment of ${data.amount} SAR received for ${data.student_name}.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 168
  },

  document_required: {
    type: 'document_required',
    priority: 'medium',
    title: { ar: 'وثيقة مطلوبة', en: 'Document Required' },
    message: {
      ar: (data) => `يرجى تقديم ${data.document_type} للطالب ${data.student_name} قبل ${data.due_date}.`,
      en: (data) => `Please submit ${data.document_type} for ${data.student_name} before ${data.due_date}.`
    },
    default_channels: ['in_app', 'email'],
    expires_after_hours: 168
  },

  system_update: {
    type: 'system_update',
    priority: 'low',
    title: { ar: 'تحديث النظام', en: 'System Update' },
    message: {
      ar: (data) => `تحديث النظام: ${data.update_message}`,
      en: (data) => `System update: ${data.update_message}`
    },
    default_channels: ['in_app'],
    expires_after_hours: 72
  }
}

// =====================================================
// NOTIFICATION SERVICE CLASS
// =====================================================

export class NotificationService {
  private static instance: NotificationService
  private realtimeSubscriptions: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Send a notification
   */
  async sendNotification(
    recipientId: string,
    recipientType: RecipientType,
    notificationType: NotificationType,
    data: Record<string, any> = {},
    options: {
      priority?: NotificationPriority
      channels?: NotificationChannel[]
      scheduledFor?: Date
      language?: 'ar' | 'en'
    } = {}
  ): Promise<string> {
    try {
      const template = NotificationTemplates[notificationType]
      const language = options.language || 'en'
      
      const notification = {
        recipient_id: recipientId,
        recipient_type: recipientType,
        notification_type: notificationType,
        priority: options.priority || template.priority,
        title: template.title[language],
        message: template.message[language](data),
        data: data,
        channels: options.channels || template.default_channels,
        scheduled_for: options.scheduledFor?.toISOString(),
        expires_at: template.expires_after_hours 
          ? new Date(Date.now() + template.expires_after_hours * 60 * 60 * 1000).toISOString()
          : null,
        is_read: false
      }

      const { data: result, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single()

      if (error) {
        console.error('Failed to save notification:', error)
        errorMonitoring.reportError(error, {
          component: 'NotificationService',
          action: 'sendNotification',
          metadata: { recipientId, notificationType }
        })
        throw error
      }

      // Send through different channels
      await this.deliverNotification(result, notification.channels)
      
      return result.id
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  /**
   * Deliver notification through specified channels
   */
  private async deliverNotification(notification: Notification, channels: NotificationChannel[]) {
    const deliveryPromises = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'in_app':
            await this.deliverInApp(notification)
            break
          case 'email':
            await this.deliverEmail(notification)
            break
          case 'sms':
            await this.deliverSMS(notification)
            break
          case 'push':
            await this.deliverPush(notification)
            break
          case 'browser':
            await this.deliverBrowser(notification)
            break
        }
      } catch (error) {
        console.error(`Failed to deliver notification via ${channel}:`, error)
      }
    })

    await Promise.allSettled(deliveryPromises)
  }

  /**
   * Deliver in-app notification (real-time via Supabase)
   */
  private async deliverInApp(notification: Notification) {
    // Real-time delivery is handled by Supabase subscriptions
    // Just log the delivery
    console.log(`📱 In-app notification delivered to ${notification.recipient_id}`)
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(notification: Notification) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Email notification queued for ${notification.recipient_id}`)
    
    // For now, just log - in production, integrate with email service
    if (process.env.NODE_ENV === 'development') {
      console.log('Email notification:', {
        to: notification.recipient_id,
        subject: notification.title,
        body: notification.message
      })
    }
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(notification: Notification) {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS notification queued for ${notification.recipient_id}`)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('SMS notification:', {
        to: notification.recipient_id,
        message: notification.message
      })
    }
  }

  /**
   * Deliver push notification
   */
  private async deliverPush(notification: Notification) {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log(`🔔 Push notification queued for ${notification.recipient_id}`)
  }

  /**
   * Deliver browser notification
   */
  private async deliverBrowser(notification: Notification) {
    // This would be handled on the client side
    console.log(`🌐 Browser notification queued for ${notification.recipient_id}`)
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)

    if (error) {
      throw error
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number
      unreadOnly?: boolean
      types?: NotificationType[]
    } = {}
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })

    if (options.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options.types?.length) {
      query = query.in('notification_type', options.types)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToUserNotifications(
    userId: string, 
    callback: (notification: Notification) => void
  ): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    this.realtimeSubscriptions.set(userId, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeSubscriptions.delete(userId)
    }
  }

  /**
   * Cleanup subscriptions
   */
  cleanup() {
    this.realtimeSubscriptions.forEach(channel => {
      channel.unsubscribe()
    })
    this.realtimeSubscriptions.clear()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
export default notificationService