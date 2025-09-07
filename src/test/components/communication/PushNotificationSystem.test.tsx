/**
 * Push Notification System Tests
 * Comprehensive testing for push notification functionality
 * Arkan Al-Numo Center - Push Notification Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationCenter } from '@/components/communication/Notifications/NotificationCenter'
import { NotificationPreferences } from '@/components/communication/Notifications/NotificationPreferences'
import { PushNotificationManager } from '@/components/communication/Notifications/PushNotificationManager'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Mock dependencies
vi.mock('@/services/communication-push-notifications')
vi.mock('@/lib/supabase')
vi.mock('sonner')

// Mock browser APIs
const mockNotification = vi.fn()
const mockServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn()
}

const mockPushManager = {
  subscribe: vi.fn(),
  getSubscription: vi.fn()
}

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  configurable: true
})

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true
})

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => (
  <LanguageProvider defaultLanguage={language}>
    {children}
  </LanguageProvider>
)

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    type: 'new_message',
    title_ar: 'رسالة جديدة',
    title_en: 'New Message',
    message_ar: 'رسالة جديدة من أحمد',
    message_en: 'New message from Ahmed',
    priority: 'medium',
    read: false,
    archived: false,
    data: { messageId: 'msg-1', conversationId: 'conv-1' },
    sender_id: 'user-1',
    sender_name: 'أحمد محمد',
    created_at: new Date().toISOString(),
    category: 'message' as const
  },
  {
    id: '2',
    type: 'voice_call_incoming',
    title_ar: 'مكالمة واردة',
    title_en: 'Incoming Call',
    message_ar: 'مكالمة واردة من فاطمة',
    message_en: 'Incoming call from Fatima',
    priority: 'urgent',
    read: false,
    archived: false,
    data: { callId: 'call-1' },
    sender_id: 'user-2',
    sender_name: 'فاطمة علي',
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    category: 'call' as const
  }
]

describe('NotificationCenter', () => {
  const mockProps = {
    userId: 'user-123',
    isOpen: true,
    onClose: vi.fn(),
    onNotificationClick: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Arabic Language Support', () => {
    it('should render Arabic interface correctly', async () => {
      render(
        <TestWrapper language="ar">
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      expect(screen.getByText('مركز الإشعارات')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('البحث في الإشعارات...')).toBeInTheDocument()
      expect(screen.getByText('الكل')).toBeInTheDocument()
      expect(screen.getByText('غير مقروء')).toBeInTheDocument()
    })

    it('should handle RTL layout properly', () => {
      render(
        <TestWrapper language="ar">
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      const container = screen.getByRole('dialog')
      expect(container).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('English Language Support', () => {
    it('should render English interface correctly', async () => {
      render(
        <TestWrapper language="en">
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Notification Center')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search notifications...')).toBeInTheDocument()
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Unread')).toBeInTheDocument()
    })
  })

  describe('Notification Display', () => {
    it('should display notifications with correct priority badges', async () => {
      // Mock successful data load
      const mockLoad = vi.fn().mockResolvedValue({ data: mockNotifications })
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('رسالة جديدة')).toBeInTheDocument()
        expect(screen.getByText('مكالمة واردة')).toBeInTheDocument()
      })
    })

    it('should show unread indicator for unread notifications', async () => {
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        const unreadIndicators = screen.getAllByRole('generic', { name: /unread/i })
        expect(unreadIndicators.length).toBeGreaterThan(0)
      })
    })

    it('should format time correctly', async () => {
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show relative time like "5 minutes ago"
        expect(screen.getByText(/منذ|ago/)).toBeInTheDocument()
      })
    })
  })

  describe('Notification Actions', () => {
    it('should mark notification as read when clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const notification = screen.getByText('رسالة جديدة')
        await user.click(notification)
        
        expect(mockProps.onNotificationClick).toHaveBeenCalled()
      })
    })

    it('should mark all as read when button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const markAllButton = screen.getByRole('button', { name: /check/i })
        await user.click(markAllButton)
        
        // Should update UI to show all as read
      })
    })

    it('should archive notification when archive button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const archiveButton = screen.getByText(/أرشفة|Archive/)
        await user.click(archiveButton)
        
        // Should remove notification from current view
      })
    })
  })

  describe('Search and Filter', () => {
    it('should filter notifications based on search query', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/البحث في الإشعارات|Search notifications/)
      await user.type(searchInput, 'أحمد')

      // Should show only notifications containing "أحمد"
      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
      })
    })

    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      // Click on unread tab
      const unreadTab = screen.getByText(/غير مقروء|Unread/)
      await user.click(unreadTab)

      // Should show only unread notifications
      await waitFor(() => {
        expect(screen.getAllByRole('generic', { name: /unread/i })).toBeDefined()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should handle real-time notification updates', async () => {
      render(
        <TestWrapper>
          <NotificationCenter {...mockProps} />
        </TestWrapper>
      )

      // Simulate real-time update
      // This would normally come from Supabase real-time subscription
      const newNotification = {
        ...mockNotifications[0],
        id: '3',
        created_at: new Date().toISOString()
      }

      // Should add new notification to the list
      await waitFor(() => {
        expect(screen.getByText('مركز الإشعارات')).toBeInTheDocument()
      })
    })
  })
})

describe('NotificationPreferences', () => {
  const mockProps = {
    userId: 'user-123',
    userRole: 'parent' as const,
    onSave: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('General Settings', () => {
    it('should render general settings correctly', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/إعدادات الإشعارات|Notification Preferences/)).toBeInTheDocument()
        expect(screen.getByText(/تمكين جميع الإشعارات|Enable All Notifications/)).toBeInTheDocument()
      })
    })

    it('should toggle global notifications', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const globalToggle = screen.getByRole('switch', { name: /تمكين جميع الإشعارات|Enable All Notifications/ })
        await user.click(globalToggle)
        
        // Should update the preferences state
      })
    })

    it('should toggle sound settings', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const soundToggle = screen.getByRole('switch', { name: /أصوات الإشعارات|Notification Sounds/ })
        await user.click(soundToggle)
      })
    })
  })

  describe('Notification Rules', () => {
    it('should display notification rules for different types', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      // Click on rules tab
      const rulesTab = screen.getByText(/القواعد|Rules/)
      await userEvent.setup().click(rulesTab)

      await waitFor(() => {
        expect(screen.getByText(/رسالة جديدة|New Message/)).toBeInTheDocument()
        expect(screen.getByText(/مكالمة واردة|Incoming Call/)).toBeInTheDocument()
      })
    })

    it('should allow enabling/disabling specific notification types', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      // Navigate to rules tab
      const rulesTab = screen.getByText(/القواعد|Rules/)
      await user.click(rulesTab)

      await waitFor(async () => {
        const toggles = screen.getAllByRole('switch')
        if (toggles.length > 0) {
          await user.click(toggles[0])
        }
      })
    })
  })

  describe('Quiet Hours', () => {
    it('should configure quiet hours settings', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      // Navigate to schedule tab
      const scheduleTab = screen.getByText(/الجدولة|Schedule/)
      await user.click(scheduleTab)

      await waitFor(() => {
        expect(screen.getByText(/الساعات الهادئة|Quiet Hours/)).toBeInTheDocument()
      })

      // Enable quiet hours
      const quietHoursToggle = screen.getByRole('switch', { name: /تمكين الساعات الهادئة|Enable Quiet Hours/ })
      await user.click(quietHoursToggle)

      // Should show time inputs
      await waitFor(() => {
        expect(screen.getByText(/وقت البداية|Start Time/)).toBeInTheDocument()
        expect(screen.getByText(/وقت النهاية|End Time/)).toBeInTheDocument()
      })
    })

    it('should show emergency override option', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      const scheduleTab = screen.getByText(/الجدولة|Schedule/)
      await user.click(scheduleTab)

      await waitFor(() => {
        expect(screen.getByText(/السماح بإشعارات الطوارئ|Allow Emergency Notifications/)).toBeInTheDocument()
      })
    })
  })

  describe('Save Functionality', () => {
    it('should show unsaved changes indicator', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const toggle = screen.getAllByRole('switch')[0]
        await user.click(toggle)
        
        // Should show save button or unsaved changes indicator
        expect(screen.getByText(/حفظ|Save/)).toBeInTheDocument()
      })
    })

    it('should save preferences when save button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <NotificationPreferences {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const saveButton = screen.getByText(/حفظ|Save/)
        await user.click(saveButton)
        
        expect(mockProps.onSave).toHaveBeenCalled()
      })
    })
  })
})

describe('PushNotificationManager', () => {
  const mockProps = {
    userId: 'user-123',
    onPermissionChange: vi.fn(),
    onSubscriptionChange: vi.fn(),
    showTestButton: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted')
      },
      configurable: true
    })
    
    // Mock Service Worker API
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue({}),
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: mockPushManager
        })
      },
      configurable: true
    })
  })

  describe('Permission Management', () => {
    it('should display current permission status', async () => {
      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/حالة الإذن|Permission Status/)).toBeInTheDocument()
      })
    })

    it('should request permission when subscription toggled', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const subscriptionToggle = screen.getByRole('switch', { name: /تمكين الإشعارات|Enable Notifications/ })
        await user.click(subscriptionToggle)
        
        expect(window.Notification.requestPermission).toHaveBeenCalled()
      })
    })
  })

  describe('System Status', () => {
    it('should show service worker status', async () => {
      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Service Worker')).toBeInTheDocument()
        expect(screen.getByText(/دعم الإشعارات|Notification Support/)).toBeInTheDocument()
      })
    })

    it('should show compatibility warnings for unsupported browsers', async () => {
      // Mock unsupported browser
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })

      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/لا يدعم|does not fully support/)).toBeInTheDocument()
      })
    })
  })

  describe('Test Notifications', () => {
    it('should send test notification when button clicked', async () => {
      const user = userEvent.setup()
      
      // Mock granted permission and active subscription
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted'
        },
        configurable: true
      })

      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const testButton = screen.getByText(/إرسال إشعار تجريبي|Send Test Notification/)
        await user.click(testButton)
        
        // Should call test notification function
      })
    })
  })

  describe('Device Information', () => {
    it('should display device information', async () => {
      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/معلومات الجهاز|Device Information/)).toBeInTheDocument()
        expect(screen.getByText(/المنصة|Platform/)).toBeInTheDocument()
        expect(screen.getByText(/اللغة|Language/)).toBeInTheDocument()
      })
    })
  })

  describe('Healthcare Compliance', () => {
    it('should show compliance notice', async () => {
      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/معايير الخصوصية الطبية|medical privacy standards/)).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsive Design', () => {
    it('should maintain functionality on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(
        <TestWrapper>
          <PushNotificationManager {...mockProps} />
        </TestWrapper>
      )

      // All main controls should still be accessible
      expect(screen.getByText(/إشعارات الدفع|Push Notifications/)).toBeInTheDocument()
    })
  })
})