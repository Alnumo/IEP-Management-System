import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationPreferences } from '../NotificationPreferences'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
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

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockPreferences = [
  {
    id: '1',
    user_id: 'user-123',
    notification_type: 'attendance_checkin',
    channels: ['in_app', 'push'],
    enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    timezone: 'Asia/Riyadh',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user-123',
    notification_type: 'session_reminder',
    channels: ['in_app', 'sms', 'email'],
    enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'Asia/Riyadh',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user-123',
    notification_type: 'emergency_contact',
    channels: ['in_app', 'sms', 'push', 'email'],
    enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'Asia/Riyadh',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading and Display', () => {
    it('renders notification preferences successfully', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        expect(screen.getByText(/notification preferences/i)).toBeInTheDocument()
        expect(screen.getByText(/attendance_checkin/i)).toBeInTheDocument()
        expect(screen.getByText(/session_reminder/i)).toBeInTheDocument()
        expect(screen.getByText(/emergency_contact/i)).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('handles error state gracefully', async () => {
      const mockResponse = { data: null, error: new Error('Failed to load') }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        expect(screen.getByText(/error loading preferences/i)).toBeInTheDocument()
      })
    })
  })

  describe('Channel Selection', () => {
    it('displays current channel selections', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        // Check that channels are displayed for each notification type
        const inAppCheckboxes = screen.getAllByLabelText(/in.*app/i)
        expect(inAppCheckboxes.length).toBeGreaterThan(0)
        
        const pushCheckboxes = screen.getAllByLabelText(/push/i)
        expect(pushCheckboxes.length).toBeGreaterThan(0)
      })
    })

    it('allows toggling channel preferences', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let updateCalled = false
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation(() => {
          updateCalled = true
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const emailCheckbox = screen.getAllByLabelText(/email/i)[0]
        fireEvent.click(emailCheckbox)
      })

      await waitFor(() => {
        expect(updateCalled).toBe(true)
      })
    })

    it('validates at least one channel is selected', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        // Try to uncheck all channels for attendance_checkin
        const inAppCheckbox = screen.getAllByLabelText(/in.*app/i)[0]
        const pushCheckbox = screen.getAllByLabelText(/push/i)[0]
        
        fireEvent.click(inAppCheckbox)
        fireEvent.click(pushCheckbox)
      })

      // Should show validation message or prevent unchecking
      await waitFor(() => {
        expect(screen.getByText(/at least one channel/i)).toBeInTheDocument()
      })
    })
  })

  describe('Quiet Hours Settings', () => {
    it('displays quiet hours settings', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        expect(screen.getByText(/quiet hours/i)).toBeInTheDocument()
        expect(screen.getByDisplayValue('22:00')).toBeInTheDocument()
        expect(screen.getByDisplayValue('07:00')).toBeInTheDocument()
      })
    })

    it('allows updating quiet hours', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let updatedQuietHours: any = null
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation((data) => {
          updatedQuietHours = data
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const startTimeInput = screen.getByDisplayValue('22:00')
        fireEvent.change(startTimeInput, { target: { value: '23:00' } })
      })

      await waitFor(() => {
        expect(updatedQuietHours?.quiet_hours_start).toBe('23:00')
      })
    })

    it('validates quiet hours time format', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const startTimeInput = screen.getByDisplayValue('22:00')
        fireEvent.change(startTimeInput, { target: { value: 'invalid-time' } })
        fireEvent.blur(startTimeInput)
      })

      await waitFor(() => {
        expect(screen.getByText(/invalid time format/i)).toBeInTheDocument()
      })
    })
  })

  describe('Timezone Settings', () => {
    it('displays current timezone', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Asia/Riyadh')).toBeInTheDocument()
      })
    })

    it('allows changing timezone', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let updatedTimezone: any = null
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation((data) => {
          updatedTimezone = data
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const timezoneSelect = screen.getByDisplayValue('Asia/Riyadh')
        fireEvent.change(timezoneSelect, { target: { value: 'America/New_York' } })
      })

      await waitFor(() => {
        expect(updatedTimezone?.timezone).toBe('America/New_York')
      })
    })
  })

  describe('Enable/Disable Notifications', () => {
    it('allows enabling/disabling notification types', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let updatedPreference: any = null
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation((data) => {
          updatedPreference = data
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const enabledSwitches = screen.getAllByRole('switch')
        fireEvent.click(enabledSwitches[0]) // Toggle first notification type
      })

      await waitFor(() => {
        expect(updatedPreference?.enabled).toBe(false)
      })
    })

    it('shows disabled state correctly', async () => {
      const disabledPreferences = mockPreferences.map(p => ({ ...p, enabled: false }))
      const mockResponse = { data: disabledPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const enabledSwitches = screen.getAllByRole('switch')
        enabledSwitches.forEach(switchElement => {
          expect(switchElement).not.toBeChecked()
        })
      })
    })
  })

  describe('Bulk Operations', () => {
    it('allows enabling all notification types', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let bulkUpdateCalled = false
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation(() => {
          bulkUpdateCalled = true
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const enableAllButton = screen.getByText(/enable all/i)
        fireEvent.click(enableAllButton)
      })

      await waitFor(() => {
        expect(bulkUpdateCalled).toBe(true)
      })
    })

    it('allows disabling all notification types', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let bulkDisableCalled = false
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation(() => {
          bulkDisableCalled = true
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const disableAllButton = screen.getByText(/disable all/i)
        fireEvent.click(disableAllButton)
      })

      await waitFor(() => {
        expect(bulkDisableCalled).toBe(true)
      })
    })

    it('shows confirmation for bulk disable', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const disableAllButton = screen.getByText(/disable all/i)
        fireEvent.click(disableAllButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })
    })
  })

  describe('Emergency Notifications', () => {
    it('shows special warning for emergency notifications', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        expect(screen.getByText(/emergency notifications cannot be disabled/i)).toBeInTheDocument()
      })
    })

    it('prevents disabling emergency notifications', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        // Find the emergency contact notification switch
        const emergencySwitch = screen.getByRole('switch', { name: /emergency_contact/i })
        expect(emergencySwitch).toBeDisabled()
      })
    })
  })

  describe('Save and Reset', () => {
    it('shows save confirmation after changes', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue(mockUpdateResponse),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const emailCheckbox = screen.getAllByLabelText(/email/i)[0]
        fireEvent.click(emailCheckbox)
      })

      await waitFor(() => {
        expect(screen.getByText(/preferences saved/i)).toBeInTheDocument()
      })
    })

    it('allows resetting preferences to default', async () => {
      const mockResponse = { data: mockPreferences, error: null }
      const mockUpdateResponse = { data: [], error: null }
      
      let resetCalled = false
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockImplementation(() => {
          resetCalled = true
          return Promise.resolve(mockUpdateResponse)
        }),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="user-123" userType="parent" />
      )

      await waitFor(() => {
        const resetButton = screen.getByText(/reset to default/i)
        fireEvent.click(resetButton)
      })

      await waitFor(() => {
        expect(resetCalled).toBe(true)
      })
    })
  })

  describe('User Type Specific Settings', () => {
    it('shows different notification types for different user types', async () => {
      const therapistPreferences = mockPreferences.filter(p => 
        ['session_reminder', 'session_started', 'session_completed'].includes(p.notification_type)
      )
      const mockResponse = { data: therapistPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="therapist-123" userType="therapist" />
      )

      await waitFor(() => {
        expect(screen.getByText(/session_reminder/i)).toBeInTheDocument()
        expect(screen.queryByText(/attendance_checkin/i)).not.toBeInTheDocument()
      })
    })

    it('shows admin-specific notification options', async () => {
      const adminPreferences = mockPreferences
      const mockResponse = { data: adminPreferences, error: null }
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse),
        order: vi.fn().mockReturnThis(),
      }))

      renderWithQueryClient(
        <NotificationPreferences userId="admin-123" userType="admin" />
      )

      await waitFor(() => {
        expect(screen.getByText(/system_update/i)).toBeInTheDocument()
      })
    })
  })
})