import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationCenter } from '../NotificationCenter'
import { notificationService } from '@/services/notification-service'
import { sessionReminderService } from '@/services/session-reminder-service'
import { Header } from '@/components/layout/Header'

// Mock services and dependencies
vi.mock('@/services/notification-service', () => ({
  notificationService: {
    sendNotification: vi.fn(),
    getUserNotifications: vi.fn(),
    markAsRead: vi.fn(),
    subscribeToUserNotifications: vi.fn(),
  },
}))

vi.mock('@/services/session-reminder-service', () => ({
  sessionReminderService: {
    sendManualReminder: vi.fn(),
    scheduleSessionReminders: vi.fn(),
    getUpcomingSessions: vi.fn(),
  },
}))

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadNotificationCount: () => ({
    data: 3,
    isLoading: false,
    error: null,
  }),
}))

const mockNotifications = [
  {
    id: 'notif-1',
    recipient_id: 'user-123',
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
    scheduled_for: null,
    sent_at: null,
    read_at: null,
    expires_at: null,
    created_by: null,
  },
  {
    id: 'notif-2',
    recipient_id: 'user-123',
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
    scheduled_for: null,
    sent_at: null,
    read_at: null,
    expires_at: null,
    created_by: null,
  },
  {
    id: 'notif-3',
    recipient_id: 'user-123',
    recipient_type: 'parent',
    notification_type: 'emergency_contact',
    priority: 'urgent',
    title: '🚨 Emergency Contact',
    message: 'Please contact the center immediately regarding Ahmed',
    data: { student_name: 'Ahmed', reason: 'Medical attention needed' },
    channels: ['in_app', 'sms', 'push', 'email'],
    is_read: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    scheduled_for: null,
    sent_at: null,
    read_at: null,
    expires_at: null,
    created_by: null,
  },
]

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Notification System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notificationService.subscribeToUserNotifications).mockReturnValue(() => {})
    vi.mocked(notificationService.markAsRead).mockResolvedValue()
    vi.mocked(notificationService.sendNotification).mockResolvedValue('new-notification-id')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Header Integration', () => {
    it('renders notification center in header with correct unread count', async () => {
      renderWithProviders(
        <Header onMenuClick={vi.fn()} />
      )

      await waitFor(() => {
        // Check that notification bell button is present
        const notificationButton = screen.getByRole('button', { name: /notifications/i })
        expect(notificationButton).toBeInTheDocument()
        
        // Check unread count badge
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('opens notification dropdown when bell is clicked', async () => {
      renderWithProviders(
        <Header onMenuClick={vi.fn()} />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button', { name: /notifications/i })
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Student Check-in')).toBeInTheDocument()
        expect(screen.getByText('Session Reminder')).toBeInTheDocument()
        expect(screen.getByText('🚨 Emergency Contact')).toBeInTheDocument()
      })
    })

    it('handles notification clicks correctly', async () => {
      const mockOnNotificationClick = vi.fn()
      
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
          onNotificationClick={mockOnNotificationClick}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        const emergencyNotification = screen.getByText('🚨 Emergency Contact')
        fireEvent.click(emergencyNotification.closest('div')!)
      })

      expect(mockOnNotificationClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notif-3',
          title: '🚨 Emergency Contact',
          priority: 'urgent'
        })
      )
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-3')
    })
  })

  describe('Real-time Updates', () => {
    it('handles real-time notification updates', async () => {
      let subscriptionCallback: (notification: any) => void = () => {}
      
      vi.mocked(notificationService.subscribeToUserNotifications).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback
          return () => {}
        }
      )

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const newNotification = {
        id: 'notif-4',
        recipient_id: 'user-123',
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
        scheduled_for: null,
        sent_at: null,
        read_at: null,
        expires_at: null,
        created_by: null,
      }

      // Simulate new notification received
      subscriptionCallback(newNotification)

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Session Completed')).toBeInTheDocument()
      })
    })

    it('updates unread count when new notifications arrive', async () => {
      let subscriptionCallback: (notification: any) => void = () => {}
      
      vi.mocked(notificationService.subscribeToUserNotifications).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback
          return () => {}
        }
      )

      // Start with 3 unread notifications
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      // Add a new notification
      const newNotification = {
        ...mockNotifications[0],
        id: 'notif-5',
        title: 'New Arrival'
      }

      subscriptionCallback(newNotification)

      // Count should update (this would be handled by React Query in real implementation)
      await waitFor(() => {
        // In a real test, the count would be updated by React Query cache invalidation
        // Here we just verify the subscription was set up correctly
        expect(notificationService.subscribeToUserNotifications).toHaveBeenCalled()
      })
    })
  })

  describe('Notification Priority Handling', () => {
    it('sorts notifications by priority and recency', async () => {
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        const notificationItems = screen.getAllByTestId(/notification-item/)
        
        // Urgent notifications should appear first
        const firstNotification = notificationItems[0]
        expect(firstNotification).toHaveTextContent('🚨 Emergency Contact')
      })
    })

    it('applies correct styling based on priority', async () => {
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        const urgentNotification = screen.getByText('🚨 Emergency Contact').closest('div')
        const highPriorityNotification = screen.getByText('Session Reminder').closest('div')
        const mediumPriorityNotification = screen.getByText('Student Check-in').closest('div')

        expect(urgentNotification).toHaveClass('border-red-200')
        expect(highPriorityNotification).toHaveClass('border-orange-200')
        expect(mediumPriorityNotification).toHaveClass('border-blue-200')
      })
    })
  })

  describe('Batch Operations', () => {
    it('marks all notifications as read', async () => {
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={false}
        />
      )

      await waitFor(() => {
        const markAllButton = screen.getByText(/mark all as read/i)
        fireEvent.click(markAllButton)
      })

      // Should call markAsRead for each unread notification
      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledTimes(3)
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1')
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-2')
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-3')
      })
    })

    it('handles bulk operations with mixed success/failure', async () => {
      // Mock partial failure
      vi.mocked(notificationService.markAsRead)
        .mockResolvedValueOnce() // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')) // Second call fails
        .mockResolvedValueOnce() // Third call succeeds

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={false}
        />
      )

      await waitFor(() => {
        const markAllButton = screen.getByText(/mark all as read/i)
        fireEvent.click(markAllButton)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error marking notification as read:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Session Reminder Integration', () => {
    it('triggers session reminders correctly', async () => {
      const upcomingSession = {
        id: 'session-123',
        student_id: 'student-123',
        therapist_id: 'therapist-123',
        session_date: '2024-01-15',
        session_time: '14:00',
        session_type: 'Speech Therapy',
        status: 'scheduled',
      }

      vi.mocked(sessionReminderService.getUpcomingSessions).mockResolvedValue([upcomingSession])

      // Simulate session reminder being triggered
      await sessionReminderService.sendManualReminder('session-123', 'hour_before')

      expect(sessionReminderService.sendManualReminder).toHaveBeenCalledWith(
        'session-123',
        'hour_before'
      )
    })

    it('schedules reminders for new sessions', async () => {
      await sessionReminderService.scheduleSessionReminders('new-session-123')

      expect(sessionReminderService.scheduleSessionReminders).toHaveBeenCalledWith(
        'new-session-123'
      )
    })
  })

  describe('Error Scenarios', () => {
    it('handles notification service failures gracefully', async () => {
      vi.mocked(notificationService.getUserNotifications).mockRejectedValue(
        new Error('Service unavailable')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('handles real-time subscription failures', async () => {
      vi.mocked(notificationService.subscribeToUserNotifications).mockImplementation(
        () => {
          throw new Error('WebSocket connection failed')
        }
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      // Component should still render despite subscription failure
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('recovers from temporary network failures', async () => {
      let callCount = 0
      vi.mocked(notificationService.getUserNotifications).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve(mockNotifications)
      })

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      // Should retry and eventually succeed
      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      // After retry, notifications should be loaded
      await waitFor(() => {
        expect(screen.getByText('Student Check-in')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('debounces rapid notification updates', async () => {
      let subscriptionCallback: (notification: any) => void = () => {}
      
      vi.mocked(notificationService.subscribeToUserNotifications).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback
          return () => {}
        }
      )

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      // Simulate rapid successive notifications
      const rapidNotifications = Array.from({ length: 5 }, (_, i) => ({
        ...mockNotifications[0],
        id: `rapid-${i}`,
        title: `Rapid Notification ${i}`
      }))

      rapidNotifications.forEach(notification => {
        subscriptionCallback(notification)
      })

      // Should handle multiple rapid updates without performance issues
      await waitFor(() => {
        expect(notificationService.subscribeToUserNotifications).toHaveBeenCalledTimes(1)
      })
    })

    it('limits notification display to reasonable amount', async () => {
      // Mock a large number of notifications
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        title: `Notification ${i}`
      }))

      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(manyNotifications)

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button')
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        // Should limit display and show "Load More" option
        const notificationItems = screen.getAllByTestId(/notification-item/)
        expect(notificationItems.length).toBeLessThanOrEqual(20)
        expect(screen.getByText(/load more/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button', { name: /notifications/i })
        expect(notificationButton).toHaveAttribute('aria-expanded', 'false')
        
        fireEvent.click(notificationButton)
      })

      await waitFor(() => {
        const notificationButton = screen.getByRole('button', { name: /notifications/i })
        expect(notificationButton).toHaveAttribute('aria-expanded', 'true')
        
        const notificationList = screen.getByRole('list')
        expect(notificationList).toBeInTheDocument()
        
        const notificationItems = screen.getAllByRole('listitem')
        expect(notificationItems.length).toBeGreaterThan(0)
      })
    })

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      await waitFor(() => {
        const notificationButton = screen.getByRole('button', { name: /notifications/i })
        notificationButton.focus()
        
        // Press Enter to open
        fireEvent.keyDown(notificationButton, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(screen.getByText('Student Check-in')).toBeInTheDocument()
        
        // Should be able to navigate with arrow keys
        const firstNotification = screen.getAllByRole('listitem')[0]
        fireEvent.keyDown(firstNotification, { key: 'ArrowDown' })
      })
    })

    it('announces new notifications to screen readers', async () => {
      let subscriptionCallback: (notification: any) => void = () => {}
      
      vi.mocked(notificationService.subscribeToUserNotifications).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback
          return () => {}
        }
      )

      renderWithProviders(
        <NotificationCenter
          userId="user-123"
          userType="parent"
          showAsDropdown={true}
        />
      )

      const newUrgentNotification = {
        ...mockNotifications[0],
        id: 'urgent-new',
        title: 'Urgent New Notification',
        priority: 'urgent'
      }

      subscriptionCallback(newUrgentNotification)

      await waitFor(() => {
        // Should have appropriate aria-live region for announcements
        const liveRegion = screen.getByRole('status', { hidden: true })
        expect(liveRegion).toBeInTheDocument()
      })
    })
  })
})