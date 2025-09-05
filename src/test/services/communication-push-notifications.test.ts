/**
 * Communication Push Notifications Service Tests
 * Tests push notification functionality for messages and calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { communicationPushNotifications } from '@/services/communication-push-notifications'
import { notificationService } from '@/services/notification-service'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/services/notification-service', () => ({
  notificationService: {
    sendNotification: vi.fn(() => Promise.resolve('notification-id'))
  }
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [{
            subscription_data: { endpoint: 'https://test.com/push' }
          }],
          error: null
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    channel: vi.fn(() => ({
      send: vi.fn(() => Promise.resolve())
    }))
  }
}))

// Mock Web APIs
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: vi.fn(() => Promise.resolve('granted'))
  }
})

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(() => Promise.resolve({
      pushManager: {
        subscribe: vi.fn(() => Promise.resolve({
          endpoint: 'https://test.com/push',
          toJSON: () => ({ endpoint: 'https://test.com/push' })
        })),
        getSubscription: vi.fn(() => Promise.resolve(null))
      }
    }))
  }
})

// Test data
const mockMessage = {
  id: 'message-123',
  conversation_id: 'conv-123',
  sender_id: 'sender-123',
  recipient_id: 'recipient-123',
  content_ar: 'رسالة اختبار',
  content_en: 'Test message',
  message_type: 'text' as const,
  priority_level: 'normal' as const,
  media_attachments: [],
  created_at: new Date().toISOString(),
  sender: {
    id: 'sender-123',
    name: 'أحمد محمد',
    avatar_url: 'https://test.com/avatar.jpg'
  }
}

const mockConversation = {
  id: 'conv-123',
  parent_id: 'parent-123',
  therapist_id: 'therapist-123',
  student_id: 'student-123',
  title_ar: 'محادثة اختبار',
  title_en: 'Test Conversation',
  status: 'active' as const,
  voice_calls_enabled: true,
  media_sharing_enabled: true
}

const mockVoiceCall = {
  id: 'call-123',
  conversation_id: 'conv-123',
  caller_id: 'caller-123',
  callee_id: 'callee-123',
  call_status: 'initiated' as const,
  call_type: 'voice' as const,
  emergency_call: false,
  duration_seconds: 0,
  initiated_at: new Date().toISOString(),
  caller: {
    id: 'caller-123',
    name: 'فاطمة أحمد',
    avatar_url: 'https://test.com/avatar2.jpg'
  },
  callee: {
    id: 'callee-123',
    name: 'محمد علي',
    avatar_url: 'https://test.com/avatar3.jpg'
  }
}

describe('CommunicationPushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize service worker', async () => {
      // Constructor is called when module is imported
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
    })
  })

  describe('Permission Management', () => {
    it('should request notification permission', async () => {
      const permission = await communicationPushNotifications.requestPermission()
      
      expect(permission).toBe('granted')
      expect(window.Notification.requestPermission).toHaveBeenCalled()
    })

    it('should return existing permission if already granted', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted',
        configurable: true
      })

      const permission = await communicationPushNotifications.requestPermission()
      
      expect(permission).toBe('granted')
    })

    it('should return denied permission', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        configurable: true
      })

      const permission = await communicationPushNotifications.requestPermission()
      
      expect(permission).toBe('denied')
    })
  })

  describe('User Subscription', () => {
    it('should subscribe user to push notifications', async () => {
      const subscription = await communicationPushNotifications.subscribeUser('user-123')
      
      expect(subscription).toBeDefined()
      expect(subscription).toHaveProperty('endpoint')
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    })

    it('should handle subscription failures gracefully', async () => {
      vi.mocked(navigator.serviceWorker.register).mockRejectedValue(
        new Error('Service Worker registration failed')
      )

      const subscription = await communicationPushNotifications.subscribeUser('user-123')
      
      expect(subscription).toBeNull()
    })

    it('should use existing subscription if available', async () => {
      const existingSubscription = {
        endpoint: 'https://existing.com/push',
        toJSON: () => ({ endpoint: 'https://existing.com/push' })
      }

      const mockServiceWorker = {
        pushManager: {
          getSubscription: vi.fn(() => Promise.resolve(existingSubscription)),
          subscribe: vi.fn()
        }
      }

      vi.mocked(navigator.serviceWorker.register).mockResolvedValue(mockServiceWorker as any)

      await communicationPushNotifications.subscribeUser('user-123')
      
      expect(mockServiceWorker.pushManager.subscribe).not.toHaveBeenCalled()
      expect(mockServiceWorker.pushManager.getSubscription).toHaveBeenCalled()
    })

    it('should unsubscribe user from push notifications', async () => {
      const result = await communicationPushNotifications.unsubscribeUser('user-123')
      
      expect(result).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    })
  })

  describe('Message Notifications', () => {
    it('should send notification for new message', async () => {
      await communicationPushNotifications.notifyNewMessage(mockMessage, mockConversation)
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'recipient-123',
        'parent',
        'new_message',
        expect.objectContaining({
          sender_name: 'أحمد محمد',
          conversation_title: 'محادثة اختبار',
          message_preview: 'رسالة اختبار',
          message_id: 'message-123',
          conversation_id: 'conv-123'
        }),
        expect.objectContaining({
          priority: 'medium',
          language: 'ar'
        })
      )
    })

    it('should send urgent notification for high priority message', async () => {
      const urgentMessage = { ...mockMessage, priority_level: 'urgent' as const }
      
      await communicationPushNotifications.notifyNewMessage(urgentMessage, mockConversation)
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'recipient-123',
        'parent',
        'message_urgent',
        expect.any(Object),
        expect.objectContaining({ priority: 'urgent' })
      )
    })

    it('should send reply notification for message replies', async () => {
      const replyMessage = { ...mockMessage, reply_to_message_id: 'original-message-id' }
      
      await communicationPushNotifications.notifyNewMessage(replyMessage, mockConversation)
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'recipient-123',
        'parent',
        'message_reply',
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should handle message preview truncation', async () => {
      const longMessage = {
        ...mockMessage,
        content_ar: 'رسالة طويلة جداً ' + 'أ'.repeat(100)
      }
      
      await communicationPushNotifications.notifyNewMessage(longMessage, mockConversation)
      
      const callArgs = vi.mocked(notificationService.sendNotification).mock.calls[0]
      const notificationData = callArgs[2]
      
      expect(notificationData.message_preview.length).toBeLessThanOrEqual(50)
      expect(notificationData.message_preview).toMatch(/\.\.\.$/)
    })
  })

  describe('Voice Call Notifications', () => {
    it('should send incoming call notification', async () => {
      await communicationPushNotifications.notifyVoiceCall(mockVoiceCall, 'incoming')
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'callee-123',
        'parent',
        'voice_call_incoming',
        expect.objectContaining({
          caller_name: 'فاطمة أحمد',
          is_emergency: false,
          call_id: 'call-123'
        }),
        expect.objectContaining({ priority: 'high' })
      )
    })

    it('should send emergency call notification', async () => {
      const emergencyCall = { ...mockVoiceCall, emergency_call: true }
      
      await communicationPushNotifications.notifyVoiceCall(emergencyCall, 'emergency')
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'callee-123',
        'parent',
        'voice_call_emergency',
        expect.objectContaining({
          is_emergency: true
        }),
        expect.objectContaining({ priority: 'urgent' })
      )
    })

    it('should send missed call notification', async () => {
      await communicationPushNotifications.notifyVoiceCall(mockVoiceCall, 'missed')
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'caller-123', // Caller receives missed call notification
        'parent',
        'voice_call_missed',
        expect.objectContaining({
          caller_name: 'فاطمة أحمد',
          time: expect.any(String)
        }),
        expect.any(Object)
      )
    })

    it('should send call ended notification with duration', async () => {
      const endedCall = { ...mockVoiceCall, duration_seconds: 180 }
      
      await communicationPushNotifications.notifyVoiceCall(endedCall, 'ended')
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'caller-123',
        'parent',
        'voice_call_ended',
        expect.objectContaining({
          duration: '3:00' // 3 minutes
        }),
        expect.any(Object)
      )
    })
  })

  describe('Media Sharing Notifications', () => {
    it('should send media shared notification', async () => {
      const mediaAttachment = {
        id: 'attachment-123',
        filename: 'document.pdf',
        mime_type: 'application/pdf',
        file_size: 1024 * 1024 // 1MB
      }

      const mediaMessage = { ...mockMessage, media_attachments: [mediaAttachment] }
      
      await communicationPushNotifications.notifyMediaShared(mediaMessage, mediaAttachment)
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'recipient-123',
        'parent',
        'message_media_shared',
        expect.objectContaining({
          sender_name: 'أحمد محمد',
          media_type: 'PDF',
          file_name: 'document.pdf',
          file_size: '1.00 MB'
        }),
        expect.any(Object)
      )
    })

    it('should identify different media types correctly', async () => {
      const imageAttachment = {
        id: 'img-123',
        filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        file_size: 500000
      }

      await communicationPushNotifications.notifyMediaShared(mockMessage, imageAttachment)
      
      const callArgs = vi.mocked(notificationService.sendNotification).mock.calls[0]
      const notificationData = callArgs[2]
      
      expect(notificationData.media_type).toBe('صورة')
    })
  })

  describe('File Upload Notifications', () => {
    it('should send file upload success notification', async () => {
      await communicationPushNotifications.notifyFileUploadStatus(
        'user-123',
        'document.pdf',
        true
      )
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'user-123',
        'parent',
        'file_upload_complete',
        expect.objectContaining({
          file_name: 'document.pdf'
        }),
        expect.any(Object)
      )
    })

    it('should send file upload failure notification', async () => {
      await communicationPushNotifications.notifyFileUploadStatus(
        'user-123',
        'document.pdf',
        false,
        'File too large'
      )
      
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        'user-123',
        'parent',
        'file_upload_failed',
        expect.objectContaining({
          file_name: 'document.pdf',
          error_reason: 'File too large'
        }),
        expect.any(Object)
      )
    })
  })

  describe('Typing Notifications', () => {
    it('should send typing notification via channel', async () => {
      const mockChannel = {
        send: vi.fn(() => Promise.resolve())
      }
      
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)
      
      await communicationPushNotifications.notifyTyping(
        'conv-123',
        'sender-123',
        'recipient-123',
        true
      )
      
      expect(supabase.channel).toHaveBeenCalledWith('typing-conv-123')
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing_notification',
        payload: expect.objectContaining({
          senderId: 'sender-123',
          recipientId: 'recipient-123',
          isTyping: true
        })
      })
    })

    it('should not send stopped typing notifications', async () => {
      await communicationPushNotifications.notifyTyping(
        'conv-123',
        'sender-123',
        'recipient-123',
        false
      )
      
      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('Immediate Push Notifications', () => {
    beforeEach(() => {
      // Mock Notification constructor
      global.Notification = vi.fn() as any
    })

    it('should send immediate push notification', async () => {
      const mockSendImmediatePush = vi.spyOn(
        communicationPushNotifications as any,
        'sendImmediatePushNotification'
      )

      await mockSendImmediatePush('user-123', {
        title: 'Test Notification',
        body: 'Test body',
        icon: '/icons/test.png'
      })

      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    })

    it('should handle push notification failures gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: new Error('Database error')
          }))
        }))
      } as any)

      const mockSendImmediatePush = vi.spyOn(
        communicationPushNotifications as any,
        'sendImmediatePushNotification'
      )

      // Should not throw error
      await expect(mockSendImmediatePush('user-123', {
        title: 'Test',
        body: 'Test'
      })).resolves.toBeUndefined()
    })
  })

  describe('Test Notifications', () => {
    it('should send test push notification', async () => {
      const mockSendImmediatePush = vi.spyOn(
        communicationPushNotifications as any,
        'sendImmediatePushNotification'
      ).mockResolvedValue(undefined)

      await communicationPushNotifications.testPushNotification('user-123')
      
      expect(mockSendImmediatePush).toHaveBeenCalledWith('user-123', {
        title: 'اختبار الإشعارات',
        body: 'هذا إشعار تجريبي من نظام الرسائل',
        icon: '/icons/test-notification.png',
        data: { type: 'test' }
      })
    })
  })

  describe('Utility Functions', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (communicationPushNotifications as any).formatFileSize
      
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should format call duration correctly', () => {
      const formatDuration = (communicationPushNotifications as any).formatDuration
      
      expect(formatDuration(0)).toBe('0:00')
      expect(formatDuration(59)).toBe('0:59')
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(3661)).toBe('61:01')
    })

    it('should get correct media type labels in Arabic', () => {
      const getMediaTypeLabel = (communicationPushNotifications as any).getMediaTypeLabel
      
      expect(getMediaTypeLabel('image/jpeg')).toBe('صورة')
      expect(getMediaTypeLabel('video/mp4')).toBe('فيديو')
      expect(getMediaTypeLabel('audio/mp3')).toBe('ملف صوتي')
      expect(getMediaTypeLabel('application/pdf')).toBe('PDF')
      expect(getMediaTypeLabel('text/plain')).toBe('ملف')
    })

    it('should truncate message previews correctly', () => {
      const getMessagePreview = (communicationPushNotifications as any).getMessagePreview
      
      const shortMessage = { content_ar: 'رسالة قصيرة' }
      expect(getMessagePreview(shortMessage)).toBe('رسالة قصيرة')
      
      const longMessage = { content_ar: 'رسالة طويلة جداً ' + 'أ'.repeat(100) }
      const preview = getMessagePreview(longMessage)
      expect(preview.length).toBeLessThanOrEqual(50)
      expect(preview).toMatch(/\.\.\.$/)
    })
  })

  describe('Error Handling', () => {
    it('should handle notification service errors gracefully', async () => {
      vi.mocked(notificationService.sendNotification).mockRejectedValue(
        new Error('Notification service error')
      )

      // Should not throw error
      await expect(
        communicationPushNotifications.notifyNewMessage(mockMessage, mockConversation)
      ).resolves.toBeUndefined()
    })

    it('should handle database errors in subscription management', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn(() => ({ error: new Error('Database error') }))
      } as any)

      const subscription = await communicationPushNotifications.subscribeUser('user-123')
      
      // Should still return subscription despite database error
      expect(subscription).toBeDefined()
    })
  })
})