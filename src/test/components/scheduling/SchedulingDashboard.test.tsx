import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SchedulingDashboard } from '@/components/scheduling/SchedulingDashboard'
import type { ScheduledSession, TherapistAvailability } from '@/types/scheduling'

// Mock the scheduling integration hook
vi.mock('@/hooks/useSchedulingIntegration', () => ({
  useSchedulingIntegration: () => ({
    validation: { isValid: true, errors: [], warnings: [] },
    conflicts: { hasConflicts: false, conflicts: [], resolutionSuggestions: [] },
    isValidating: false,
    isLoading: false,
    validateSession: vi.fn(),
    integrateSystems: vi.fn(),
    resolveConflicts: vi.fn(),
    createSession: vi.fn()
  })
}))

// Mock the schedule data hook
vi.mock('@/hooks/useScheduleData', () => ({
  useScheduleData: () => ({
    sessions: mockSessions,
    availability: mockAvailability,
    conflicts: [],
    stats: mockStats,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    optimisticUpdate: vi.fn(),
    bulkUpdate: vi.fn(),
    isUpdating: false,
    isBulkUpdating: false
  })
}))

// Mock data
const mockSessions: ScheduledSession[] = [
  {
    id: '1',
    student_id: 'student-1',
    therapist_id: 'therapist-1',
    room_id: 'room-1',
    session_date: '2025-09-01',
    start_time: '09:00',
    end_time: '10:00',
    session_type: 'speech_therapy',
    session_category: 'individual',
    session_status: 'scheduled',
    duration_minutes: 60,
    session_goals: ['improve_articulation'],
    student: {
      id: 'student-1',
      name_ar: 'أحمد محمد',
      name_en: 'Ahmed Mohamed',
      age: 8
    },
    therapist: {
      id: 'therapist-1',
      name_ar: 'د. سارة أحمد',
      name_en: 'Dr. Sarah Ahmed'
    },
    room: {
      id: 'room-1',
      name_ar: 'غرفة النطق 1',
      name_en: 'Speech Room 1'
    },
    created_at: '2025-09-01T08:00:00Z',
    updated_at: '2025-09-01T08:00:00Z'
  },
  {
    id: '2',
    student_id: 'student-2',
    therapist_id: 'therapist-2',
    room_id: 'room-2',
    session_date: '2025-09-01',
    start_time: '10:00',
    end_time: '11:00',
    session_type: 'occupational_therapy',
    session_category: 'group',
    session_status: 'confirmed',
    duration_minutes: 60,
    session_goals: ['fine_motor_skills'],
    student: {
      id: 'student-2',
      name_ar: 'فاطمة علي',
      name_en: 'Fatima Ali',
      age: 7
    },
    therapist: {
      id: 'therapist-2',
      name_ar: 'د. محمد خالد',
      name_en: 'Dr. Mohamed Khaled'
    },
    room: {
      id: 'room-2',
      name_ar: 'غرفة العلاج الوظيفي',
      name_en: 'OT Room'
    },
    created_at: '2025-09-01T08:00:00Z',
    updated_at: '2025-09-01T08:00:00Z'
  }
]

const mockAvailability: TherapistAvailability[] = [
  {
    id: '1',
    therapist_id: 'therapist-1',
    available_date: '2025-09-01',
    start_time: '08:00',
    end_time: '17:00',
    is_available: true,
    max_sessions: 8,
    current_bookings: 2,
    availability_type: 'regular'
  }
]

const mockStats = {
  total_sessions: 2,
  confirmed_sessions: 1,
  completed_sessions: 0,
  cancelled_sessions: 0,
  active_therapists: 2,
  total_therapy_hours: 2,
  average_sessions_per_therapist: 1,
  utilization_percentage: 75,
  utilized_slots: 2,
  total_available_slots: 8,
  conflicts_count: 0,
  overbooked_therapists: 0,
  room_conflicts: 0,
  attendance_rate: 95,
  cancellation_rate: 5,
  average_session_duration: 60
}

const TestWrapper = ({ children, language = 'en' }: { children: React.ReactNode, language?: 'en' | 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={language}>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('SchedulingDashboard', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering and Layout', () => {
    it('renders main dashboard components in English', async () => {
      render(
        <TestWrapper language="en">
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check main title
      expect(screen.getByText('Scheduling Dashboard')).toBeInTheDocument()
      
      // Check view toggle buttons
      expect(screen.getByRole('button', { name: /daily/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /weekly/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument()
      
      // Check filter controls
      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument()
    })

    it('renders main dashboard components in Arabic RTL', async () => {
      render(
        <TestWrapper language="ar">
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check Arabic title
      expect(screen.getByText('لوحة تحكم الجدولة')).toBeInTheDocument()
      
      // Check RTL layout
      const dashboard = screen.getByRole('main')
      expect(dashboard).toHaveAttribute('dir', 'rtl')
      
      // Check Arabic search placeholder
      expect(screen.getByPlaceholderText('البحث في الجلسات...')).toBeInTheDocument()
    })

    it('displays session statistics correctly', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check stats display
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // total sessions
        expect(screen.getByText('75%')).toBeInTheDocument() // utilization rate
        expect(screen.getByText('2')).toBeInTheDocument() // active therapists
      })
    })
  })

  describe('View Switching', () => {
    it('switches between different calendar views', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const weeklyButton = screen.getByRole('button', { name: /weekly/i })
      const monthlyButton = screen.getByRole('button', { name: /monthly/i })
      const dailyButton = screen.getByRole('button', { name: /daily/i })

      // Default should be weekly
      expect(weeklyButton).toHaveClass('bg-primary')

      // Switch to monthly
      await user.click(monthlyButton)
      await waitFor(() => {
        expect(monthlyButton).toHaveClass('bg-primary')
        expect(weeklyButton).not.toHaveClass('bg-primary')
      })

      // Switch to daily
      await user.click(dailyButton)
      await waitFor(() => {
        expect(dailyButton).toHaveClass('bg-primary')
        expect(monthlyButton).not.toHaveClass('bg-primary')
      })
    })

    it('updates calendar content when view changes', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Switch to daily view
      const dailyButton = screen.getByRole('button', { name: /daily/i })
      await user.click(dailyButton)

      // Check that daily view specific elements appear
      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toHaveAttribute('data-view', 'daily')
      })
    })
  })

  describe('Filtering Functionality', () => {
    it('filters sessions by search term', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Search sessions...')
      
      // Search for a specific student
      await user.type(searchInput, 'Ahmed')
      
      await waitFor(() => {
        // Should show only sessions matching the search
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
        expect(screen.queryByText('فاطمة علي')).not.toBeInTheDocument()
      })
    })

    it('filters sessions by therapist', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Open therapist filter
      const therapistFilter = screen.getByLabelText(/therapist/i)
      await user.click(therapistFilter)
      
      // Select specific therapist
      const therapistOption = screen.getByText('Dr. Sarah Ahmed')
      await user.click(therapistOption)

      await waitFor(() => {
        // Should show only sessions with selected therapist
        expect(screen.getByText('د. سارة أحمد')).toBeInTheDocument()
        expect(screen.queryByText('د. محمد خالد')).not.toBeInTheDocument()
      })
    })

    it('filters sessions by status', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Open status filter
      const statusFilter = screen.getByLabelText(/status/i)
      await user.click(statusFilter)
      
      // Select confirmed status
      const confirmedOption = screen.getByText('Confirmed')
      await user.click(confirmedOption)

      await waitFor(() => {
        // Should show only confirmed sessions
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument() // confirmed session
        expect(screen.queryByText('أحمد محمد')).not.toBeInTheDocument() // scheduled session
      })
    })

    it('clears all filters when reset button is clicked', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Search sessions...')
      await user.type(searchInput, 'Ahmed')

      // Click reset filters button
      const resetButton = screen.getByRole('button', { name: /reset filters/i })
      await user.click(resetButton)

      await waitFor(() => {
        // All sessions should be visible again
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument()
        expect(searchInput).toHaveValue('')
      })
    })
  })

  describe('Session Management', () => {
    it('opens session details when clicking on a session', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Click on a session card
      const sessionCard = screen.getByText('أحمد محمد').closest('[data-testid="session-card"]')
      expect(sessionCard).toBeInTheDocument()
      
      if (sessionCard) {
        await user.click(sessionCard)
      }

      await waitFor(() => {
        // Session details dialog should open
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Session Details')).toBeInTheDocument()
      })
    })

    it('allows editing session when in edit mode', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard editMode={true} />
        </TestWrapper>
      )

      // Find edit button on session
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0]
      await user.click(editButton)

      await waitFor(() => {
        // Edit dialog should open
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/edit session/i)).toBeInTheDocument()
      })
    })

    it('shows quick actions panel for bulk operations', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard showQuickActions={true} />
        </TestWrapper>
      )

      // Check for quick actions
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add session/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk operations/i })).toBeInTheDocument()
    })
  })

  describe('Date Navigation', () => {
    it('navigates to previous/next date ranges', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const prevButton = screen.getByRole('button', { name: /previous/i })
      const nextButton = screen.getByRole('button', { name: /next/i })

      // Navigate to previous week
      await user.click(prevButton)
      
      // Navigate to next week  
      await user.click(nextButton)

      // Both actions should trigger calendar updates
      expect(prevButton).toBeEnabled()
      expect(nextButton).toBeEnabled()
    })

    it('allows selecting specific date', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Click on date picker
      const datePicker = screen.getByRole('button', { name: /select date/i })
      await user.click(datePicker)

      await waitFor(() => {
        // Calendar popup should open
        expect(screen.getByRole('dialog', { name: /calendar/i })).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check that mobile-specific classes are applied
      const dashboard = screen.getByRole('main')
      expect(dashboard).toHaveClass('mobile-layout')
    })

    it('shows desktop layout on larger screens', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })
      
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check that desktop-specific classes are applied
      const dashboard = screen.getByRole('main')
      expect(dashboard).toHaveClass('desktop-layout')
    })
  })

  describe('Real-time Updates', () => {
    it('updates session data when real-time changes occur', async () => {
      const mockRefetch = vi.fn()
      vi.mocked(require('@/hooks/useScheduleData').useScheduleData).mockReturnValue({
        ...require('@/hooks/useScheduleData').useScheduleData(),
        refetch: mockRefetch
      })

      render(
        <TestWrapper>
          <SchedulingDashboard enableRealTime={true} />
        </TestWrapper>
      )

      // Simulate real-time update
      fireEvent(window, new CustomEvent('schedule-update'))

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when data loading fails', async () => {
      vi.mocked(require('@/hooks/useScheduleData').useScheduleData).mockReturnValue({
        sessions: [],
        availability: [],
        conflicts: [],
        stats: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load schedule data'),
        refetch: vi.fn()
      })

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load schedule data/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('shows loading state while data is being fetched', async () => {
      vi.mocked(require('@/hooks/useScheduleData').useScheduleData).mockReturnValue({
        sessions: [],
        availability: [],
        conflicts: [],
        stats: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn()
      })

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Should show loading skeletons
      expect(screen.getAllByTestId('session-skeleton')).toHaveLength.greaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check ARIA labels
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Scheduling Dashboard')
      expect(screen.getByRole('region', { name: /calendar view/i })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /session filters/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const viewButtons = screen.getAllByRole('button')
      
      // Tab through view buttons
      viewButtons[0].focus()
      expect(viewButtons[0]).toHaveFocus()
      
      // Press Tab to move to next button
      await user.keyboard('{Tab}')
      expect(viewButtons[1]).toHaveFocus()
    })

    it('announces changes to screen readers', async () => {
      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Check for aria-live regions
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
      
      // Switch views and check announcement
      const monthlyButton = screen.getByRole('button', { name: /monthly/i })
      await user.click(monthlyButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/switched to monthly view/i)
      })
    })
  })
})