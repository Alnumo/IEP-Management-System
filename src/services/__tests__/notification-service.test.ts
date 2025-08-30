import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notificationService } from '../notification-service'
import { supabase } from '@/lib/supabase'
import type { Notification, NotificationType } from '../notification-service'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
  },
}))

// Mock error monitoring
vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn(),
  },
}))

const mockNotification: Notification = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  recipient_id: 'user-123',
  recipient_type: 'parent',
  notification_type: 'attendance_checkin',
  priority: 'medium',
  title: 'Student Check-in',
  message: 'Ahmed has checked in safely at 9:00 AM in room 101.',
  data: {
    student_name: 'Ahmed',
    time: '9:00 AM',
    room: '101'
  },
  channels: ['in_app', 'push'],
  scheduled_for: null,
  sent_at: new Date().toISOString(),
  read_at: null,
  is_read: false,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'system-user'
}

const mockTemplate = {
  id: 'template-123',
  notification_type: 'attendance_checkin',
  language: 'en',
  title_template: 'Student Check-in',
  message_template: '{{student_name}} has checked in safely at {{time}}{{#if room}} in room {{room}}{{/if}}.',
  default_priority: 'medium',
  default_channels: ['in_app', 'push'],
  expires_after_hours: 24,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendNotification', () => {
    it('sends a notification successfully', async () => {
      const mockInsertResponse = {
        data: [{ id: 'new-notification-id' }],
        error: null
      }

      const mockTemplateResponse = {
        data: [mockTemplate],
        error: null
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        } else if (table === 'notifications') {
          chain.insert().select = vi.fn().mockResolvedValue(mockInsertResponse)
        }

        return chain
      })

      const notificationId = await notificationService.sendNotification(
        'user-123',
        'parent',
        'attendance_checkin',
        {
          student_name: 'Ahmed',
          time: '9:00 AM',
          room: '101'
        },
        {
          priority: 'medium',
          channels: ['in_app', 'push'],
          language: 'en'
        }
      )

      expect(notificationId).toBe('new-notification-id')
    })

    it('handles template not found by using fallback', async () => {
      const mockTemplateResponse = {
        data: [],
        error: null
      }

      const mockInsertResponse = {
        data: [{ id: 'fallback-notification-id' }],
        error: null
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        } else if (table === 'notifications') {
          chain.insert().select = vi.fn().mockResolvedValue(mockInsertResponse)
        }

        return chain
      })

      const notificationId = await notificationService.sendNotification(
        'user-123',
        'parent',
        'attendance_checkin',
        {
          student_name: 'Ahmed',
          time: '9:00 AM'
        },
        {
          language: 'en'
        }
      )

      expect(notificationId).toBe('fallback-notification-id')
    })

    it('throws error on database failure', async () => {
      const mockError = new Error('Database connection failed')
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }))

      const templateChain = vi.mocked(supabase.from('notification_templates'))
      templateChain.select().eq().eq = vi.fn().mockRejectedValue(mockError)

      await expect(notificationService.sendNotification(
        'user-123',
        'parent',
        'attendance_checkin',
        {}
      )).rejects.toThrow('Database connection failed')
    })
  })

  describe('getUserNotifications', () => {
    it('fetches user notifications successfully', async () => {
      const mockResponse = {
        data: [mockNotification],
        error: null
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResponse),
      }

      vi.mocked(supabase.from).mockReturnValue(chain)

      const notifications = await notificationService.getUserNotifications('user-123', {
        limit: 10,
        unreadOnly: false
      })

      expect(notifications).toEqual([mockNotification])
      expect(chain.eq).toHaveBeenCalledWith('recipient_id', 'user-123')
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(chain.limit).toHaveBeenCalledWith(10)
    })

    it('filters unread notifications only', async () => {
      const mockResponse = {
        data: [{ ...mockNotification, is_read: false }],
        error: null
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResponse),
      }

      vi.mocked(supabase.from).mockReturnValue(chain)

      await notificationService.getUserNotifications('user-123', {
        unreadOnly: true
      })

      expect(chain.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('filters by notification types', async () => {
      const mockResponse = {
        data: [mockNotification],
        error: null
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResponse),
      }

      vi.mocked(supabase.from).mockReturnValue(chain)

      await notificationService.getUserNotifications('user-123', {
        types: ['attendance_checkin', 'session_reminder']
      })

      expect(chain.in).toHaveBeenCalledWith('notification_type', ['attendance_checkin', 'session_reminder'])
    })
  })

  describe('markAsRead', () => {
    it('marks notification as read successfully', async () => {
      const mockResponse = {
        data: [{ ...mockNotification, is_read: true, read_at: new Date().toISOString() }],
        error: null
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
      }

      vi.mocked(supabase.from).mockReturnValue(chain)

      await notificationService.markAsRead('notification-123')

      expect(chain.update).toHaveBeenCalledWith({
        is_read: true,
        read_at: expect.any(String)
      })
      expect(chain.eq).toHaveBeenCalledWith('id', 'notification-123')
    })

    it('handles mark as read errors', async () => {
      const mockError = new Error('Failed to update')

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(mockError),
      }

      vi.mocked(supabase.from).mockReturnValue(chain)

      await expect(notificationService.markAsRead('notification-123'))
        .rejects.toThrow('Failed to update')
    })
  })

  describe('subscribeToUserNotifications', () => {
    it('sets up real-time subscription successfully', () => {
      const mockCallback = vi.fn()
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel)

      const unsubscribe = notificationService.subscribeToUserNotifications('user-123', mockCallback)

      expect(supabase.channel).toHaveBeenCalledWith('notifications:user-123')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'recipient_id=eq.user-123'
        },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('handles subscription callback correctly', () => {
      const mockCallback = vi.fn()
      let subscriptionCallback: (payload: any) => void = () => {}

      const mockChannel = {
        on: vi.fn().mockImplementation((event, config, callback) => {
          subscriptionCallback = callback
          return mockChannel
        }),
        subscribe: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel)

      notificationService.subscribeToUserNotifications('user-123', mockCallback)

      // Simulate new notification
      const payload = {
        new: mockNotification,
        eventType: 'INSERT'
      }

      subscriptionCallback(payload)

      expect(mockCallback).toHaveBeenCalledWith(mockNotification)
    })
  })

  describe('Template Processing', () => {
    it('processes template variables correctly', async () => {
      const mockTemplateResponse = {
        data: [{
          ...mockTemplate,
          title_template: 'Welcome {{student_name}}',
          message_template: 'Hello {{student_name}}, your session with {{therapist_name}} is at {{time}}.'
        }],
        error: null
      }

      const mockInsertResponse = {
        data: [{ id: 'processed-notification-id' }],
        error: null
      }

      let capturedNotification: any

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data) => {
            capturedNotification = data
            return { select: vi.fn().mockResolvedValue(mockInsertResponse) }
          }),
          eq: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        }

        return chain
      })

      await notificationService.sendNotification(
        'user-123',
        'student',
        'session_reminder',
        {
          student_name: 'Ahmed',
          therapist_name: 'Dr. Sarah',
          time: '2:00 PM'
        }
      )

      expect(capturedNotification.title).toBe('Welcome Ahmed')
      expect(capturedNotification.message).toBe('Hello Ahmed, your session with Dr. Sarah is at 2:00 PM.')
    })

    it('handles missing template variables gracefully', async () => {
      const mockTemplateResponse = {
        data: [{
          ...mockTemplate,
          title_template: 'Notification for {{student_name}}',
          message_template: 'Session with {{therapist_name}} at {{time}} in {{room}}.'
        }],
        error: null
      }

      const mockInsertResponse = {
        data: [{ id: 'graceful-notification-id' }],
        error: null
      }

      let capturedNotification: any

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data) => {
            capturedNotification = data
            return { select: vi.fn().mockResolvedValue(mockInsertResponse) }
          }),
          eq: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        }

        return chain
      })

      await notificationService.sendNotification(
        'user-123',
        'student',
        'session_reminder',
        {
          student_name: 'Ahmed',
          time: '2:00 PM'
          // Missing therapist_name and room
        }
      )

      expect(capturedNotification.title).toBe('Notification for Ahmed')
      expect(capturedNotification.message).toBe('Session with  at 2:00 PM in .') // Empty values for missing variables
    })
  })

  describe('Notification Priorities', () => {
    it('handles urgent priority correctly', async () => {
      const mockTemplateResponse = {
        data: [{
          ...mockTemplate,
          default_priority: 'urgent'
        }],
        error: null
      }

      const mockInsertResponse = {
        data: [{ id: 'urgent-notification-id' }],
        error: null
      }

      let capturedNotification: any

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data) => {
            capturedNotification = data
            return { select: vi.fn().mockResolvedValue(mockInsertResponse) }
          }),
          eq: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        }

        return chain
      })

      await notificationService.sendNotification(
        'user-123',
        'parent',
        'emergency_contact',
        { reason: 'Medical emergency' },
        { priority: 'urgent' }
      )

      expect(capturedNotification.priority).toBe('urgent')
    })
  })

  describe('Channel Configuration', () => {
    it('respects custom channel configuration', async () => {
      const mockTemplateResponse = {
        data: [mockTemplate],
        error: null
      }

      const mockInsertResponse = {
        data: [{ id: 'channel-notification-id' }],
        error: null
      }

      let capturedNotification: any

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data) => {
            capturedNotification = data
            return { select: vi.fn().mockResolvedValue(mockInsertResponse) }
          }),
          eq: vi.fn().mockReturnThis(),
        }

        if (table === 'notification_templates') {
          chain.select().eq().eq = vi.fn().mockResolvedValue(mockTemplateResponse)
        }

        return chain
      })

      await notificationService.sendNotification(
        'user-123',
        'parent',
        'attendance_checkin',
        {},
        {
          channels: ['in_app', 'sms', 'email', 'push']
        }
      )

      expect(capturedNotification.channels).toEqual(['in_app', 'sms', 'email', 'push'])
    })
  })
})