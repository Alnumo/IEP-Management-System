import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useUserNotifications,
  useUnreadNotificationCount,
  useUrgentNotificationCount,
  useSendNotification,
  useMarkNotificationRead,
  useRealTimeNotifications,
  useNotificationPermissions,
  useNotificationSounds,
} from '../useNotifications'
import * as notificationService from '@/services/notification-service'
import type { Notification } from '@/services/notification-service'

// Mock the notification service
vi.mock('@/services/notification-service', () => ({
  notificationService: {
    getUserNotifications: vi.fn(),
    sendNotification: vi.fn(),
    markAsRead: vi.fn(),
    subscribeToUserNotifications: vi.fn(),
  },
}))

// Mock auth utils
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
}))

// Mock error monitoring
vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn(),
  },
}))

const mockNotifications: Notification[] = [
  {
    id: '1',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'attendance_checkin',
    priority: 'medium',
    title: 'Student Check-in',
    message: 'Ahmed has checked in safely',
    data: { student_name: 'Ahmed' },
    channels: ['in_app'],
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scheduled_for: null,
    sent_at: null,
    read_at: null,
    expires_at: null,
    created_by: null,
  },
  {
    id: '2',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'session_reminder',
    priority: 'high',
    title: 'Session Reminder',
    message: 'Session tomorrow at 2 PM',
    data: { time: '2 PM' },
    channels: ['in_app', 'sms'],
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scheduled_for: null,
    sent_at: null,
    read_at: null,
    expires_at: null,
    created_by: null,
  },
  {
    id: '3',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'emergency_contact',
    priority: 'urgent',
    title: 'Emergency Contact',
    message: 'Please contact immediately',
    data: { reason: 'Medical' },
    channels: ['in_app', 'sms', 'email'],
    is_read: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scheduled_for: null,
    sent_at: null,
    read_at: new Date().toISOString(),
    expires_at: null,
    created_by: null,
  },
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useUserNotifications', () => {
    it('fetches user notifications successfully', async () => {
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockResolvedValue(mockNotifications)

      const { result } = renderHook(
        () => useUserNotifications('user-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockNotifications)
      expect(notificationService.notificationService.getUserNotifications)
        .toHaveBeenCalledWith('user-1', { limit: 50 })
    })

    it('applies filters correctly', async () => {
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockResolvedValue(mockNotifications.filter(n => !n.is_read))

      const { result } = renderHook(
        () => useUserNotifications('user-1', {
          limit: 10,
          unreadOnly: true,
          types: ['attendance_checkin']
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(notificationService.notificationService.getUserNotifications)
        .toHaveBeenCalledWith('user-1', {
          limit: 10,
          unreadOnly: true,
          types: ['attendance_checkin']
        })
    })

    it('handles fetch errors gracefully', async () => {
      const error = new Error('Network error')
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockRejectedValue(error)

      const { result } = renderHook(
        () => useUserNotifications('user-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })

    it('can be disabled', () => {
      const { result } = renderHook(
        () => useUserNotifications('user-1', { enabled: false }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isIdle).toBe(true)
      expect(notificationService.notificationService.getUserNotifications)
        .not.toHaveBeenCalled()
    })
  })

  describe('useUnreadNotificationCount', () => {
    it('returns correct unread count', async () => {
      const unreadNotifications = mockNotifications.filter(n => !n.is_read)
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockResolvedValue(unreadNotifications)

      const { result } = renderHook(
        () => useUnreadNotificationCount('user-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(2) // 2 unread notifications
      expect(notificationService.notificationService.getUserNotifications)
        .toHaveBeenCalledWith('user-1', { unreadOnly: true, limit: 100 })
    })

    it('returns 0 on error', async () => {
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(
        () => useUnreadNotificationCount('user-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(0)
    })
  })

  describe('useUrgentNotificationCount', () => {
    it('returns correct urgent count', async () => {
      const unreadNotifications = mockNotifications.filter(n => !n.is_read)
      vi.mocked(notificationService.notificationService.getUserNotifications)
        .mockResolvedValue(unreadNotifications)

      const { result } = renderHook(
        () => useUrgentNotificationCount('user-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(1) // 1 high priority notification
    })
  })

  describe('useSendNotification', () => {
    it('sends notification successfully', async () => {
      vi.mocked(notificationService.notificationService.sendNotification)
        .mockResolvedValue('new-notification-id')

      const { result } = renderHook(
        () => useSendNotification(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        const notificationId = await result.current.mutateAsync({
          recipientId: 'user-1',
          recipientType: 'parent',
          notificationType: 'attendance_checkin',
          data: { student_name: 'Ahmed' }
        })

        expect(notificationId).toBe('new-notification-id')
      })

      expect(notificationService.notificationService.sendNotification)
        .toHaveBeenCalledWith(
          'user-1',
          'parent',
          'attendance_checkin',
          { student_name: 'Ahmed' },
          {}
        )
    })

    it('handles send errors', async () => {
      const error = new Error('Send failed')
      vi.mocked(notificationService.notificationService.sendNotification)
        .mockRejectedValue(error)

      const { result } = renderHook(
        () => useSendNotification(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        try {
          await result.current.mutateAsync({
            recipientId: 'user-1',
            recipientType: 'parent',
            notificationType: 'attendance_checkin'
          })
        } catch (e) {
          expect(e).toBe(error)
        }
      })
    })
  })

  describe('useMarkNotificationRead', () => {
    it('marks notification as read successfully', async () => {
      vi.mocked(notificationService.notificationService.markAsRead)
        .mockResolvedValue()

      const { result } = renderHook(
        () => useMarkNotificationRead(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        await result.current.mutateAsync('notification-1')
      })

      expect(notificationService.notificationService.markAsRead)
        .toHaveBeenCalledWith('notification-1')
    })

    it('handles mark as read errors', async () => {
      const error = new Error('Mark as read failed')
      vi.mocked(notificationService.notificationService.markAsRead)
        .mockRejectedValue(error)

      const { result } = renderHook(
        () => useMarkNotificationRead(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        try {
          await result.current.mutateAsync('notification-1')
        } catch (e) {
          expect(e).toBe(error)
        }
      })
    })
  })

  describe('useRealTimeNotifications', () => {
    it('sets up subscription correctly', () => {
      const mockUnsubscribe = vi.fn()
      const mockOnNewNotification = vi.fn()

      vi.mocked(notificationService.notificationService.subscribeToUserNotifications)
        .mockReturnValue(mockUnsubscribe)

      const { result, unmount } = renderHook(
        () => useRealTimeNotifications('user-1', mockOnNewNotification),
        { wrapper: createWrapper() }
      )

      expect(result.current.isConnected).toBe(true)
      expect(notificationService.notificationService.subscribeToUserNotifications)
        .toHaveBeenCalledWith('user-1', expect.any(Function))

      unmount()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('handles new notifications from subscription', () => {
      let subscriptionCallback: (notification: Notification) => void = () => {}
      const mockOnNewNotification = vi.fn()

      vi.mocked(notificationService.notificationService.subscribeToUserNotifications)
        .mockImplementation((userId, callback) => {
          subscriptionCallback = callback
          return vi.fn()
        })

      const { result } = renderHook(
        () => useRealTimeNotifications('user-1', mockOnNewNotification),
        { wrapper: createWrapper() }
      )

      const newNotification = {
        ...mockNotifications[0],
        id: 'new-notification',
        title: 'New Notification'
      }

      act(() => {
        subscriptionCallback(newNotification)
      })

      expect(result.current.lastNotification).toEqual(newNotification)
      expect(mockOnNewNotification).toHaveBeenCalledWith(newNotification)
    })

    it('does not subscribe when userId is empty', () => {
      const { result } = renderHook(
        () => useRealTimeNotifications('', vi.fn()),
        { wrapper: createWrapper() }
      )

      expect(result.current.isConnected).toBe(false)
      expect(notificationService.notificationService.subscribeToUserNotifications)
        .not.toHaveBeenCalled()
    })
  })

  describe('useNotificationPermissions', () => {
    it('gets current permission status', () => {
      // Mock Notification API
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        configurable: true,
      })

      const { result } = renderHook(() => useNotificationPermissions())

      expect(result.current.permission).toBe('granted')
      expect(result.current.isSupported).toBe(true)
    })

    it('requests permission successfully', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        configurable: true,
      })

      const { result } = renderHook(() => useNotificationPermissions())

      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('granted')
      })

      expect(mockRequestPermission).toHaveBeenCalled()
      expect(result.current.permission).toBe('granted')
    })

    it('handles unsupported browsers', () => {
      delete (window as any).Notification

      const { result } = renderHook(() => useNotificationPermissions())

      expect(result.current.isSupported).toBe(false)
      expect(result.current.permission).toBe('default')
    })

    it('handles permission denial', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('denied')
      
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        configurable: true,
      })

      const { result } = renderHook(() => useNotificationPermissions())

      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('denied')
      })
    })
  })

  describe('useNotificationSounds', () => {
    it('plays sound with correct frequency for priority', () => {
      const mockOscillator = {
        frequency: { value: 0 },
        type: 'sine',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }

      const mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }

      const mockAudioContext = {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGainNode),
        currentTime: 0,
        destination: {},
      }

      Object.defineProperty(window, 'AudioContext', {
        value: vi.fn().mockImplementation(() => mockAudioContext),
        configurable: true,
      })

      const { result } = renderHook(() => useNotificationSounds())

      act(() => {
        result.current.playSound('urgent')
      })

      expect(mockOscillator.frequency.value).toBe(800) // Urgent frequency
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('handles audio context creation errors gracefully', () => {
      Object.defineProperty(window, 'AudioContext', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('AudioContext creation failed')
        }),
        configurable: true,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() => useNotificationSounds())

      act(() => {
        result.current.playSound('medium')
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Could not play notification sound:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('uses correct frequencies for different priorities', () => {
      const mockOscillator = {
        frequency: { value: 0 },
        type: 'sine',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }

      const mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }

      const mockAudioContext = {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGainNode),
        currentTime: 0,
        destination: {},
      }

      Object.defineProperty(window, 'AudioContext', {
        value: vi.fn().mockImplementation(() => mockAudioContext),
        configurable: true,
      })

      const { result } = renderHook(() => useNotificationSounds())

      // Test different priorities
      const priorities = {
        urgent: 800,
        high: 600,
        medium: 400,
        low: 300,
      }

      Object.entries(priorities).forEach(([priority, expectedFreq]) => {
        mockOscillator.frequency.value = 0 // Reset

        act(() => {
          result.current.playSound(priority as any)
        })

        expect(mockOscillator.frequency.value).toBe(expectedFreq)
      })
    })
  })
})