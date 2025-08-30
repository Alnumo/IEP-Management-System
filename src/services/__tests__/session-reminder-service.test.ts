import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sessionReminderService } from '../session-reminder-service'
import { supabase } from '@/lib/supabase'
import * as notificationService from '../notification-service'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('../notification-service', () => ({
  notificationService: {
    sendNotification: vi.fn(),
  },
}))

vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn(),
  },
}))

const mockSessionData = {
  id: 'session-123',
  student_id: 'student-123',
  therapist_id: 'therapist-123',
  course_id: 'course-123',
  session_date: '2024-01-15',
  session_time: '14:00',
  session_type: 'Speech Therapy',
  status: 'scheduled',
  duration_minutes: 60,
  room_number: '101',
  notes: 'Regular session',
  student: {
    id: 'student-123',
    first_name_ar: 'أحمد',
    last_name_ar: 'محمد',
    first_name_en: 'Ahmed',
    last_name_en: 'Mohammed',
    parent_phone: '+966501234567',
    parent_email: 'parent@example.com',
  },
  therapist: {
    id: 'therapist-123',
    name_ar: 'د. سارة أحمد',
    name_en: 'Dr. Sarah Ahmed',
    phone: '+966501234568',
    email: 'therapist@example.com',
  },
}

const mockSessionReminder = {
  id: 'reminder-123',
  session_id: 'session-123',
  student_id: 'student-123',
  therapist_id: 'therapist-123',
  session_date: '2024-01-15',
  session_time: '14:00',
  session_type: 'Speech Therapy',
  reminder_type: 'hour_before',
  reminder_minutes: 60,
  sent_at: null,
  created_at: new Date().toISOString(),
}

describe('SessionReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    sessionReminderService.stop()
  })

  describe('scheduleSessionReminders', () => {
    it('schedules reminders for a valid session', async () => {
      const mockInsertResponse = { data: [], error: null }
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue(mockInsertResponse),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.scheduleSessionReminders('session-123')

      const insertCall = vi.mocked(supabase.from).mock.calls.find(call => call[0] === 'session_reminders')
      expect(insertCall).toBeDefined()
    })

    it('skips scheduling for cancelled sessions', async () => {
      const cancelledSessionData = { ...mockSessionData, status: 'cancelled' }
      const mockSessionResponse = { data: cancelledSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.scheduleSessionReminders('session-123')

      // Insert should not be called for cancelled sessions
      const insertFn = vi.mocked(supabase.from('session_reminders').insert)
      expect(insertFn).not.toHaveBeenCalled()
    })

    it('skips scheduling for past sessions', async () => {
      // Set a past date
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      const pastSessionData = {
        ...mockSessionData,
        session_date: pastDate.toISOString().split('T')[0],
        session_time: '09:00'
      }
      const mockSessionResponse = { data: pastSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.scheduleSessionReminders('session-123')

      const insertFn = vi.mocked(supabase.from('session_reminders').insert)
      expect(insertFn).not.toHaveBeenCalled()
    })

    it('handles session not found error', async () => {
      const mockSessionResponse = { data: null, error: { code: 'PGRST116' } }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      // Should handle gracefully without throwing
      await expect(sessionReminderService.scheduleSessionReminders('nonexistent-session'))
        .resolves.not.toThrow()
    })

    it('creates correct reminder types and timings', async () => {
      const mockInsertResponse = { data: [], error: null }
      const mockSessionResponse = { data: mockSessionData, error: null }

      let insertedReminders: any[] = []
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data) => {
            if (table === 'session_reminders') {
              insertedReminders = data
            }
            return Promise.resolve(mockInsertResponse)
          }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.scheduleSessionReminders('session-123')

      expect(insertedReminders).toHaveLength(3)
      expect(insertedReminders.find(r => r.reminder_type === 'day_before')).toBeDefined()
      expect(insertedReminders.find(r => r.reminder_type === 'hour_before')).toBeDefined()
      expect(insertedReminders.find(r => r.reminder_type === 'now')).toBeDefined()
    })
  })

  describe('cancelSessionReminders', () => {
    it('cancels unsent reminders for a session', async () => {
      const mockDeleteResponse = { data: [], error: null }

      let deleteQuery: any = {}
      vi.mocked(supabase.from).mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((column, value) => {
            deleteQuery[column] = value
            return chain
          }),
          is: vi.fn().mockImplementation((column, value) => {
            deleteQuery[column] = value
            return Promise.resolve(mockDeleteResponse)
          }),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.cancelSessionReminders('session-123')

      expect(deleteQuery.session_id).toBe('session-123')
      expect(deleteQuery.sent_at).toBe(null)
    })

    it('handles cancel reminders errors gracefully', async () => {
      const mockError = new Error('Delete failed')
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockRejectedValue({ error: mockError }),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }))

      // Should handle error gracefully
      await expect(sessionReminderService.cancelSessionReminders('session-123'))
        .resolves.not.toThrow()
    })
  })

  describe('processReminders', () => {
    it('processes due reminders', async () => {
      const dueReminders = [mockSessionReminder]
      const mockRemindersResponse = { data: dueReminders, error: null }
      const mockSessionResponse = { data: mockSessionData, error: null }
      const mockUpdateResponse = { data: [], error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockResolvedValue(mockUpdateResponse),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        }

        if (table === 'session_reminders') {
          chain.select().is().lte = vi.fn().mockResolvedValue(mockRemindersResponse)
        } else if (table === 'sessions') {
          chain.select().eq().single = vi.fn().mockResolvedValue(mockSessionResponse)
        }

        return chain
      })

      vi.mocked(notificationService.notificationService.sendNotification).mockResolvedValue('notification-id')

      // Call the private method via reflection
      await (sessionReminderService as any).processReminders()

      expect(notificationService.notificationService.sendNotification).toHaveBeenCalled()
    })

    it('skips processing for cancelled sessions', async () => {
      const dueReminders = [mockSessionReminder]
      const cancelledSessionData = { ...mockSessionData, status: 'cancelled' }
      
      const mockRemindersResponse = { data: dueReminders, error: null }
      const mockSessionResponse = { data: cancelledSessionData, error: null }
      const mockUpdateResponse = { data: [], error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockResolvedValue(mockUpdateResponse),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        }

        if (table === 'session_reminders') {
          chain.select().is().lte = vi.fn().mockResolvedValue(mockRemindersResponse)
        } else if (table === 'sessions') {
          chain.select().eq().single = vi.fn().mockResolvedValue(mockSessionResponse)
        }

        return chain
      })

      await (sessionReminderService as any).processReminders()

      // Should not send notification for cancelled session
      expect(notificationService.notificationService.sendNotification).not.toHaveBeenCalled()
    })
  })

  describe('sendManualReminder', () => {
    it('sends manual reminder successfully', async () => {
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      vi.mocked(notificationService.notificationService.sendNotification).mockResolvedValue('notification-id')

      await sessionReminderService.sendManualReminder('session-123', 'hour_before')

      expect(notificationService.notificationService.sendNotification).toHaveBeenCalledTimes(3) // Parent, therapist, admin
    })

    it('throws error for nonexistent session', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue({ data: null, error: null }) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await expect(sessionReminderService.sendManualReminder('nonexistent', 'now'))
        .rejects.toThrow('Session not found: nonexistent')
    })

    it('sends different notifications based on reminder type', async () => {
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      vi.mocked(notificationService.notificationService.sendNotification).mockResolvedValue('notification-id')

      // Test 'now' type
      await sessionReminderService.sendManualReminder('session-123', 'now')

      const sendNotificationCalls = vi.mocked(notificationService.notificationService.sendNotification).mock.calls
      
      // Check that session_started notification is sent for 'now' type
      expect(sendNotificationCalls.some(call => call[2] === 'session_started')).toBe(true)
    })
  })

  describe('getUpcomingSessions', () => {
    it('fetches upcoming scheduled sessions', async () => {
      const upcomingSessions = [mockSessionData]
      const mockResponse = { data: upcomingSessions, error: null }

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse),
        single: vi.fn().mockReturnThis(),
      }))

      const sessions = await sessionReminderService.getUpcomingSessions()

      expect(sessions).toEqual(upcomingSessions)
    })

    it('handles fetch errors gracefully', async () => {
      const mockError = new Error('Database error')
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(mockError),
        single: vi.fn().mockReturnThis(),
      }))

      await expect(sessionReminderService.getUpcomingSessions())
        .rejects.toThrow('Database error')
    })
  })

  describe('rescheduleReminders', () => {
    it('cancels and reschedules reminders', async () => {
      const mockDeleteResponse = { data: [], error: null }
      const mockInsertResponse = { data: [], error: null }
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue(mockInsertResponse),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue(mockDeleteResponse),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      await sessionReminderService.rescheduleReminders('session-123')

      // Should call both cancel and schedule operations
      const fromCalls = vi.mocked(supabase.from).mock.calls
      expect(fromCalls.some(call => call[0] === 'session_reminders')).toBe(true)
      expect(fromCalls.some(call => call[0] === 'sessions')).toBe(true)
    })
  })

  describe('Service Lifecycle', () => {
    it('initializes and starts the service', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      sessionReminderService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith('📅 Session Reminder Service initialized')
      
      consoleSpy.mockRestore()
    })

    it('stops the service', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      sessionReminderService.initialize()
      sessionReminderService.stop()

      expect(consoleSpy).toHaveBeenCalledWith('📅 Session Reminder Service stopped')
      
      consoleSpy.mockRestore()
    })

    it('processes reminders at regular intervals', () => {
      const processSpy = vi.spyOn(sessionReminderService as any, 'processReminders').mockImplementation(() => {})
      
      sessionReminderService.initialize()
      
      // Fast forward time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000)

      expect(processSpy).toHaveBeenCalledTimes(1)
      
      sessionReminderService.stop()
      processSpy.mockRestore()
    })
  })

  describe('Notification Content', () => {
    it('generates correct notification content for different languages', async () => {
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      vi.mocked(notificationService.notificationService.sendNotification).mockResolvedValue('notification-id')

      await sessionReminderService.sendManualReminder('session-123', 'day_before')

      const sendCalls = vi.mocked(notificationService.notificationService.sendNotification).mock.calls

      // Check that Arabic names are used
      const parentNotificationCall = sendCalls.find(call => call[1] === 'parent')
      expect(parentNotificationCall?.[3]).toMatchObject({
        student_name: 'أحمد محمد',
        therapist_name: 'د. سارة أحمد',
      })
    })

    it('includes session details in notification data', async () => {
      const mockSessionResponse = { data: mockSessionData, error: null }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: table === 'sessions' ? vi.fn().mockResolvedValue(mockSessionResponse) : vi.fn().mockReturnThis(),
        }
        return chain
      })

      vi.mocked(notificationService.notificationService.sendNotification).mockResolvedValue('notification-id')

      await sessionReminderService.sendManualReminder('session-123', 'hour_before')

      const sendCalls = vi.mocked(notificationService.notificationService.sendNotification).mock.calls
      const notificationData = sendCalls[0]?.[3]

      expect(notificationData).toMatchObject({
        session_type: 'Speech Therapy',
        room: '101',
        duration: 60,
      })
    })
  })
})