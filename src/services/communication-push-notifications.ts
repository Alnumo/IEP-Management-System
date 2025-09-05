/**
 * Communication Push Notifications Service
 * Specialized push notifications for messaging, voice calls, and media sharing
 * Arkan Al-Numo Center - Real-time Communication Notifications
 */

import { notificationService, NotificationTemplates, type NotificationTemplate, type NotificationType } from './notification-service'
import { supabase } from '@/lib/supabase'
import type { Message, VoiceCall, Conversation } from '@/types/communication'

// =====================================================
// COMMUNICATION NOTIFICATION TYPES
// =====================================================

export type CommunicationNotificationType = 
  | 'new_message'
  | 'message_reply'
  | 'message_priority'
  | 'message_urgent'
  | 'message_media_shared'
  | 'voice_call_incoming'
  | 'voice_call_missed'
  | 'voice_call_ended'
  | 'voice_call_emergency'
  | 'typing_indicator'
  | 'conversation_created'
  | 'conversation_archived'
  | 'file_upload_complete'
  | 'file_upload_failed'
  | 'encryption_enabled'
  | 'user_online'
  | 'user_offline'

// =====================================================
// COMMUNICATION NOTIFICATION TEMPLATES
// =====================================================

const CommunicationNotificationTemplates: Record<CommunicationNotificationType, NotificationTemplate> = {
  new_message: {
    type: 'new_message' as any,
    priority: 'medium',
    title: {
      ar: 'رسالة جديدة',
      en: 'New Message'
    },
    message: {
      ar: (data) => `رسالة جديدة من ${data.sender_name}${data.conversation_title ? ` في ${data.conversation_title}` : ''}`,
      en: (data) => `New message from ${data.sender_name}${data.conversation_title ? ` in ${data.conversation_title}` : ''}`
    },
    default_channels: ['push', 'browser'],
    expires_after_hours: 24
  },

  message_reply: {
    type: 'message_reply' as any,
    priority: 'medium',
    title: {
      ar: 'رد على رسالتك',
      en: 'Reply to your message'
    },
    message: {
      ar: (data) => `رد ${data.sender_name} على رسالتك: "${data.message_preview}"`,
      en: (data) => `${data.sender_name} replied to your message: "${data.message_preview}"`
    },
    default_channels: ['push', 'browser', 'in_app'],
    expires_after_hours: 12
  },

  message_priority: {
    type: 'message_priority' as any,
    priority: 'high',
    title: {
      ar: '⭐ رسالة مهمة',
      en: '⭐ Priority Message'
    },
    message: {
      ar: (data) => `رسالة مهمة من ${data.sender_name}: "${data.message_preview}"`,
      en: (data) => `Priority message from ${data.sender_name}: "${data.message_preview}"`
    },
    default_channels: ['push', 'browser', 'in_app', 'email'],
    expires_after_hours: 6
  },

  message_urgent: {
    type: 'message_urgent' as any,
    priority: 'urgent',
    title: {
      ar: '🚨 رسالة عاجلة',
      en: '🚨 Urgent Message'
    },
    message: {
      ar: (data) => `رسالة عاجلة من ${data.sender_name}: "${data.message_preview}"`,
      en: (data) => `Urgent message from ${data.sender_name}: "${data.message_preview}"`
    },
    default_channels: ['push', 'browser', 'in_app', 'sms', 'email'],
    expires_after_hours: 2
  },

  message_media_shared: {
    type: 'message_media_shared' as any,
    priority: 'medium',
    title: {
      ar: '📎 ملف مشارك',
      en: '📎 File Shared'
    },
    message: {
      ar: (data) => `شارك ${data.sender_name} ${data.media_type} (${data.file_name})`,
      en: (data) => `${data.sender_name} shared ${data.media_type} (${data.file_name})`
    },
    default_channels: ['push', 'in_app'],
    expires_after_hours: 48
  },

  voice_call_incoming: {
    type: 'voice_call_incoming' as any,
    priority: 'urgent',
    title: {
      ar: '📞 مكالمة واردة',
      en: '📞 Incoming Call'
    },
    message: {
      ar: (data) => `مكالمة واردة من ${data.caller_name}${data.is_emergency ? ' - طوارئ' : ''}`,
      en: (data) => `Incoming call from ${data.caller_name}${data.is_emergency ? ' - Emergency' : ''}`
    },
    default_channels: ['push', 'browser'],
    expires_after_hours: 1
  },

  voice_call_missed: {
    type: 'voice_call_missed' as any,
    priority: 'high',
    title: {
      ar: '📞 مكالمة فائتة',
      en: '📞 Missed Call'
    },
    message: {
      ar: (data) => `مكالمة فائتة من ${data.caller_name} في ${data.time}`,
      en: (data) => `Missed call from ${data.caller_name} at ${data.time}`
    },
    default_channels: ['push', 'in_app', 'browser'],
    expires_after_hours: 24
  },

  voice_call_ended: {
    type: 'voice_call_ended' as any,
    priority: 'low',
    title: {
      ar: 'انتهت المكالمة',
      en: 'Call Ended'
    },
    message: {
      ar: (data) => `انتهت المكالمة مع ${data.caller_name}. المدة: ${data.duration}`,
      en: (data) => `Call with ${data.caller_name} ended. Duration: ${data.duration}`
    },
    default_channels: ['in_app'],
    expires_after_hours: 12
  },

  voice_call_emergency: {
    type: 'voice_call_emergency' as any,
    priority: 'urgent',
    title: {
      ar: '🚨 مكالمة طوارئ',
      en: '🚨 Emergency Call'
    },
    message: {
      ar: (data) => `مكالمة طوارئ من ${data.caller_name} - يرجى الرد فوراً`,
      en: (data) => `Emergency call from ${data.caller_name} - Please answer immediately`
    },
    default_channels: ['push', 'browser', 'sms', 'in_app'],
    expires_after_hours: 1
  },

  typing_indicator: {
    type: 'typing_indicator' as any,
    priority: 'low',
    title: {
      ar: 'يكتب...',
      en: 'Typing...'
    },
    message: {
      ar: (data) => `${data.sender_name} يكتب رسالة`,
      en: (data) => `${data.sender_name} is typing`
    },
    default_channels: [], // Real-time only, no persistent notifications
    expires_after_hours: 0.1
  },

  conversation_created: {
    type: 'conversation_created' as any,
    priority: 'medium',
    title: {
      ar: 'محادثة جديدة',
      en: 'New Conversation'
    },
    message: {
      ar: (data) => `تم بدء محادثة جديدة مع ${data.participant_name} حول ${data.student_name}`,
      en: (data) => `New conversation started with ${data.participant_name} about ${data.student_name}`
    },
    default_channels: ['push', 'in_app'],
    expires_after_hours: 48
  },

  conversation_archived: {
    type: 'conversation_archived' as any,
    priority: 'low',
    title: {
      ar: 'تم أرشفة المحادثة',
      en: 'Conversation Archived'
    },
    message: {
      ar: (data) => `تم أرشفة المحادثة مع ${data.participant_name}`,
      en: (data) => `Conversation with ${data.participant_name} has been archived`
    },
    default_channels: ['in_app'],
    expires_after_hours: 168
  },

  file_upload_complete: {
    type: 'file_upload_complete' as any,
    priority: 'low',
    title: {
      ar: '✅ تم رفع الملف',
      en: '✅ File Upload Complete'
    },
    message: {
      ar: (data) => `تم رفع الملف "${data.file_name}" بنجاح`,
      en: (data) => `File "${data.file_name}" uploaded successfully`
    },
    default_channels: ['in_app'],
    expires_after_hours: 6
  },

  file_upload_failed: {
    type: 'file_upload_failed' as any,
    priority: 'medium',
    title: {
      ar: '❌ فشل في رفع الملف',
      en: '❌ File Upload Failed'
    },
    message: {
      ar: (data) => `فشل في رفع الملف "${data.file_name}": ${data.error_reason}`,
      en: (data) => `Failed to upload file "${data.file_name}": ${data.error_reason}`
    },
    default_channels: ['in_app', 'push'],
    expires_after_hours: 24
  },

  encryption_enabled: {
    type: 'encryption_enabled' as any,
    priority: 'medium',
    title: {
      ar: '🔒 تم تمكين التشفير',
      en: '🔒 Encryption Enabled'
    },
    message: {
      ar: (data) => `تم تمكين التشفير للمحادثة مع ${data.participant_name}`,
      en: (data) => `Encryption enabled for conversation with ${data.participant_name}`
    },
    default_channels: ['in_app', 'push'],
    expires_after_hours: 168
  },

  user_online: {
    type: 'user_online' as any,
    priority: 'low',
    title: {
      ar: '🟢 متصل',
      en: '🟢 Online'
    },
    message: {
      ar: (data) => `${data.user_name} متصل الآن`,
      en: (data) => `${data.user_name} is now online`
    },
    default_channels: ['in_app'], // Subtle in-app indicator only
    expires_after_hours: 0.5
  },

  user_offline: {
    type: 'user_offline' as any,
    priority: 'low',
    title: {
      ar: '⚪ غير متصل',
      en: '⚪ Offline'
    },
    message: {
      ar: (data) => `${data.user_name} غير متصل`,
      en: (data) => `${data.user_name} is offline`
    },
    default_channels: [], // No notification for going offline
    expires_after_hours: 0.1
  }
}

// =====================================================
// COMMUNICATION PUSH NOTIFICATION SERVICE
// =====================================================

export class CommunicationPushNotificationService {
  private webPushSubscriptions = new Map<string, PushSubscription>()
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  constructor() {
    this.initializeServiceWorker()
  }

  /**
   * Initialize service worker for push notifications
   */
  private async initializeServiceWorker() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser')
      return
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeUser(userId: string): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      console.error('Service Worker not registered')
      return null
    }

    try {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.log('Push notification permission denied')
        return null
      }

      // Get or create push subscription
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      
      if (!subscription) {
        // Create new subscription
        const vapidKey = process.env.VITE_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        })
      }

      // Store subscription in database
      await this.storePushSubscription(userId, subscription)
      this.webPushSubscriptions.set(userId, subscription)

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Store push subscription in database
   */
  private async storePushSubscription(userId: string, subscription: PushSubscription) {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription_data: subscription.toJSON(),
          endpoint: subscription.endpoint,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to store push subscription:', error)
      }
    } catch (error) {
      console.error('Database error storing push subscription:', error)
    }
  }

  /**
   * Send new message notification
   */
  async notifyNewMessage(message: Message, conversation: Conversation) {
    const template = CommunicationNotificationTemplates.new_message
    const priority = message.priority_level === 'urgent' ? 'urgent' : 
                    message.priority_level === 'high' ? 'high' : 'medium'

    const notificationData = {
      sender_name: message.sender?.name || 'Unknown',
      conversation_title: conversation.title_ar || conversation.title_en,
      message_preview: this.getMessagePreview(message),
      message_id: message.id,
      conversation_id: conversation.id
    }

    // Determine recipient
    const recipientId = message.recipient_id

    // Choose appropriate template based on priority
    let notificationType: CommunicationNotificationType = 'new_message'
    if (message.priority_level === 'urgent') {
      notificationType = 'message_urgent'
    } else if (message.priority_level === 'high') {
      notificationType = 'message_priority'
    }

    // If it's a reply, use reply template
    if (message.reply_to_message_id) {
      notificationType = 'message_reply'
    }

    // Send notification
    await this.sendCommunicationNotification(
      recipientId,
      notificationType,
      notificationData,
      { priority }
    )

    // Send immediate push notification for urgent messages
    if (priority === 'urgent') {
      await this.sendImmediatePushNotification(recipientId, {
        title: template.title.ar,
        body: template.message.ar(notificationData),
        icon: '/icons/urgent-message.png',
        badge: '/icons/badge.png',
        data: {
          type: 'message',
          messageId: message.id,
          conversationId: conversation.id
        }
      })
    }
  }

  /**
   * Send voice call notification
   */
  async notifyVoiceCall(call: VoiceCall, type: 'incoming' | 'missed' | 'ended' | 'emergency') {
    let notificationType: CommunicationNotificationType
    switch (type) {
      case 'incoming':
        notificationType = call.emergency_call ? 'voice_call_emergency' : 'voice_call_incoming'
        break
      case 'missed':
        notificationType = 'voice_call_missed'
        break
      case 'ended':
        notificationType = 'voice_call_ended'
        break
      case 'emergency':
        notificationType = 'voice_call_emergency'
        break
    }

    const notificationData = {
      caller_name: call.caller?.name || 'Unknown',
      callee_name: call.callee?.name || 'Unknown',
      duration: this.formatDuration(call.duration_seconds),
      time: new Date(call.initiated_at).toLocaleTimeString(),
      is_emergency: call.emergency_call,
      call_id: call.id
    }

    // Send to callee for incoming calls, caller for missed calls
    const recipientId = type === 'incoming' || type === 'emergency' ? call.callee_id : call.caller_id

    await this.sendCommunicationNotification(
      recipientId,
      notificationType,
      notificationData,
      { priority: call.emergency_call ? 'urgent' : 'high' }
    )

    // Immediate push for incoming calls
    if (type === 'incoming' || type === 'emergency') {
      const template = CommunicationNotificationTemplates[notificationType]
      await this.sendImmediatePushNotification(recipientId, {
        title: template.title.ar,
        body: template.message.ar(notificationData),
        icon: call.emergency_call ? '/icons/emergency-call.png' : '/icons/voice-call.png',
        badge: '/icons/badge.png',
        tag: `call-${call.id}`, // Replaces previous call notifications
        requireInteraction: true, // Keep notification until user interacts
        data: {
          type: 'voice_call',
          callId: call.id,
          emergency: call.emergency_call,
          action: type
        }
      })
    }
  }

  /**
   * Send media sharing notification
   */
  async notifyMediaShared(message: Message, mediaAttachment: any) {
    const notificationData = {
      sender_name: message.sender?.name || 'Unknown',
      media_type: this.getMediaTypeLabel(mediaAttachment.mime_type),
      file_name: mediaAttachment.filename,
      file_size: this.formatFileSize(mediaAttachment.file_size),
      conversation_id: message.conversation_id
    }

    await this.sendCommunicationNotification(
      message.recipient_id,
      'message_media_shared',
      notificationData
    )
  }

  /**
   * Send typing notification
   */
  async notifyTyping(conversationId: string, senderId: string, recipientId: string, isTyping: boolean) {
    if (!isTyping) return // Don't send "stopped typing" notifications

    // Only send real-time notification, no persistent storage
    const channel = supabase.channel(`typing-${conversationId}`)
    await channel.send({
      type: 'broadcast',
      event: 'typing_notification',
      payload: {
        senderId,
        recipientId,
        isTyping,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Send file upload status notification
   */
  async notifyFileUploadStatus(userId: string, fileName: string, success: boolean, errorReason?: string) {
    const notificationType: CommunicationNotificationType = success ? 'file_upload_complete' : 'file_upload_failed'
    const notificationData = {
      file_name: fileName,
      error_reason: errorReason
    }

    await this.sendCommunicationNotification(userId, notificationType, notificationData)
  }

  /**
   * Send generic communication notification
   */
  private async sendCommunicationNotification(
    recipientId: string,
    type: CommunicationNotificationType,
    data: any,
    options: { priority?: 'low' | 'medium' | 'high' | 'urgent' } = {}
  ) {
    const template = CommunicationNotificationTemplates[type]
    
    try {
      // Use the main notification service with communication-specific templates
      await notificationService.sendNotification(
        recipientId,
        'parent', // Default to parent, could be determined from user profile
        type as any,
        data,
        {
          priority: options.priority || template.priority,
          channels: template.default_channels,
          language: 'ar' // Default to Arabic, could be user preference
        }
      )
    } catch (error) {
      console.error('Failed to send communication notification:', error)
    }
  }

  /**
   * Send immediate push notification (bypasses database)
   */
  private async sendImmediatePushNotification(
    userId: string, 
    notification: {
      title: string
      body: string
      icon?: string
      badge?: string
      tag?: string
      requireInteraction?: boolean
      data?: any
    }
  ) {
    try {
      // Get user's push subscription from database
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('subscription_data')
        .eq('user_id', userId)
        .eq('active', true)

      if (error || !subscriptions?.length) {
        console.log('No active push subscriptions for user:', userId)
        return
      }

      // Send to all user's subscriptions
      const pushPromises = subscriptions.map(async (sub) => {
        try {
          // This would typically be done on the server side
          // For demo purposes, using browser notification API
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: notification.icon,
              badge: notification.badge,
              tag: notification.tag,
              requireInteraction: notification.requireInteraction,
              data: notification.data
            })
          }
        } catch (error) {
          console.error('Failed to send push to subscription:', error)
        }
      })

      await Promise.allSettled(pushPromises)
    } catch (error) {
      console.error('Failed to send immediate push notification:', error)
    }
  }

  /**
   * Utility methods
   */
  private getMessagePreview(message: Message): string {
    const content = message.content_ar || message.content_en || ''
    return content.length > 50 ? content.substring(0, 47) + '...' : content
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private getMediaTypeLabel(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'صورة'
    if (mimeType.startsWith('video/')) return 'فيديو'
    if (mimeType.startsWith('audio/')) return 'ملف صوتي'
    if (mimeType === 'application/pdf') return 'PDF'
    return 'ملف'
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeUser(userId: string): Promise<boolean> {
    try {
      const subscription = this.webPushSubscriptions.get(userId)
      if (subscription) {
        await subscription.unsubscribe()
        this.webPushSubscriptions.delete(userId)
      }

      // Deactivate in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ active: false })
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Failed to unsubscribe user:', error)
      return false
    }
  }

  /**
   * Test push notification
   */
  async testPushNotification(userId: string) {
    await this.sendImmediatePushNotification(userId, {
      title: 'اختبار الإشعارات',
      body: 'هذا إشعار تجريبي من نظام الرسائل',
      icon: '/icons/test-notification.png',
      data: { type: 'test' }
    })
  }
}

// Export singleton instance
export const communicationPushNotifications = new CommunicationPushNotificationService()

// =====================================================
// COMMUNICATION NOTIFICATION HOOKS
// =====================================================

export const useCommunicationNotifications = (userId: string) => {
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [permission, setPermission] = React.useState<NotificationPermission>('default')

  React.useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = async () => {
    const subscription = await communicationPushNotifications.subscribeUser(userId)
    setIsSubscribed(!!subscription)
    setPermission(Notification.permission)
    return !!subscription
  }

  const unsubscribe = async () => {
    const success = await communicationPushNotifications.unsubscribeUser(userId)
    setIsSubscribed(!success)
    return success
  }

  const testNotification = async () => {
    await communicationPushNotifications.testPushNotification(userId)
  }

  return {
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    testNotification
  }
}

export default communicationPushNotifications