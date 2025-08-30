import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationCenter } from '../NotificationCenter'
import * as notificationService from '@/services/notification-service'

// Mock the notification service
vi.mock('@/services/notification-service', () => ({
  notificationService: {
    getUserNotifications: vi.fn(),
    markAsRead: vi.fn(),
    subscribeToUserNotifications: vi.fn(),
  },
}))

// Mock auth utils
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
}))

// Mock language context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => key,
  }),
}))

const mockNotifications = [
  {
    id: '1',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'attendance_checkin',
    priority: 'medium',
    title: 'Student Check-in',
    message: 'Ahmed has checked in safely at 9:00 AM',
    data: { student_name: 'Ahmed', time: '9:00 AM' },
    channels: ['in_app', 'push'],
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'session_reminder',
    priority: 'high',
    title: 'Session Reminder',
    message: 'Therapy session with Dr. Sarah tomorrow at 2:00 PM',
    data: { therapist_name: 'Dr. Sarah', time: '2:00 PM' },
    channels: ['in_app', 'sms'],
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    recipient_id: 'user-1',
    recipient_type: 'parent',
    notification_type: 'emergency_contact',
    priority: 'urgent',
    title: '🚨 Emergency Contact',
    message: 'Please contact the center immediately regarding Ahmed',
    data: { student_name: 'Ahmed', reason: 'Medical attention needed' },
    channels: ['in_app', 'sms', 'push', 'email'],
    is_read: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    read_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful notifications fetch
    vi.mocked(notificationService.notificationService.getUserNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notificationService.notificationService.subscribeToUserNotifications).mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dropdown Mode', () => {
    it('renders notification dropdown button with unread count', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      
      // Should show unread count (2 unread notifications)
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('opens dropdown when clicked', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Student Check-in')).toBeInTheDocument()
        expect(screen.getByText('Session Reminder')).toBeInTheDocument()
      })
    })

    it('filters notifications by search term', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i)
        fireEvent.change(searchInput, { target: { value: 'session' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Session Reminder')).toBeInTheDocument()
        expect(screen.queryByText('Student Check-in')).not.toBeInTheDocument()
      })
    })

    it('filters notifications by priority', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const priorityFilter = screen.getByDisplayValue(/all/i)
        fireEvent.change(priorityFilter, { target: { value: 'urgent' } })
      })

      await waitFor(() => {
        expect(screen.getByText('🚨 Emergency Contact')).toBeInTheDocument()
        expect(screen.queryByText('Student Check-in')).not.toBeInTheDocument()
      })
    })
  })

  describe('Panel Mode', () => {
    it('renders full notification panel', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={false}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument()
        expect(screen.getByText('Student Check-in')).toBeInTheDocument()
        expect(screen.getByText('Session Reminder')).toBeInTheDocument()
      })
    })

    it('shows notification statistics', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={false}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/2.*unread/i)).toBeInTheDocument()
        expect(screen.getByText(/1.*urgent/i)).toBeInTheDocument()
      })
    })
  })

  describe('Notification Interactions', () => {
    it('marks notification as read when clicked', async () => {
      vi.mocked(notificationService.notificationService.markAsRead).mockResolvedValue()

      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
          onNotificationClick={vi.fn()}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const notification = screen.getByText('Student Check-in').closest('div')
        fireEvent.click(notification!)
      })

      expect(notificationService.notificationService.markAsRead).toHaveBeenCalledWith('1')
    })

    it('calls onNotificationClick when notification is clicked', async () => {
      const onNotificationClick = vi.fn()
      
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
          onNotificationClick={onNotificationClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const notification = screen.getByText('Student Check-in').closest('div')
        fireEvent.click(notification!)
      })

      expect(onNotificationClick).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        title: 'Student Check-in',
      }))
    })

    it('marks all notifications as read', async () => {
      vi.mocked(notificationService.notificationService.markAsRead).mockResolvedValue()

      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={false}
        />
      )

      await waitFor(() => {
        const markAllButton = screen.getByText(/mark all as read/i)
        fireEvent.click(markAllButton)
      })

      expect(notificationService.notificationService.markAsRead).toHaveBeenCalledTimes(2) // 2 unread notifications
    })
  })

  describe('Real-time Updates', () => {
    it('subscribes to real-time notifications', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      expect(notificationService.notificationService.subscribeToUserNotifications).toHaveBeenCalledWith(
        'user-1',
        expect.any(Function)
      )
    })

    it('handles new notifications from subscription', async () => {
      let subscriptionCallback: (notification: any) => void = () => {}
      
      vi.mocked(notificationService.notificationService.subscribeToUserNotifications).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback
          return () => {}
        }
      )

      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      // Simulate new notification
      const newNotification = {
        id: '4',
        recipient_id: 'user-1',
        recipient_type: 'parent',
        notification_type: 'session_completed',
        priority: 'medium',
        title: 'Session Completed',
        message: 'Therapy session has been completed successfully',
        data: {},
        channels: ['in_app'],
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      subscriptionCallback(newNotification)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Updated unread count
      })
    })
  })

  describe('Priority Styling', () => {
    it('applies correct styling for urgent notifications', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const urgentNotification = screen.getByText('🚨 Emergency Contact').closest('div')
        expect(urgentNotification).toHaveClass('border-red-200')
      })
    })

    it('applies correct styling for high priority notifications', async () => {
      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const highPriorityNotification = screen.getByText('Session Reminder').closest('div')
        expect(highPriorityNotification).toHaveClass('border-orange-200')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles notification fetch errors gracefully', async () => {
      vi.mocked(notificationService.notificationService.getUserNotifications).mockRejectedValue(
        new Error('Failed to fetch notifications')
      )

      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      // Should not crash and should show empty state
      await waitFor(() => {
        const button = screen.getByRole('button')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
      })
    })

    it('handles mark as read errors gracefully', async () => {
      vi.mocked(notificationService.notificationService.markAsRead).mockRejectedValue(
        new Error('Failed to mark as read')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithQueryClient(
        <NotificationCenter
          userId="user-1"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const notification = screen.getByText('Student Check-in').closest('div')
        fireEvent.click(notification!)
      })

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error marking notification as read:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })
})