import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '@/contexts/I18nContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { SchedulingDashboard } from '@/components/scheduling/SchedulingDashboard'
import { CalendarView } from '@/components/scheduling/CalendarView'
import { DragDropScheduleEditor } from '@/components/scheduling/DragDropScheduleEditor'
import { SessionDetailsPopover } from '@/components/scheduling/SessionDetailsPopover'
import { TherapistAvailabilityManager } from '@/components/scheduling/TherapistAvailabilityManager'
import { BulkReschedulingManager } from '@/components/scheduling/BulkReschedulingManager'
import type { ScheduledSession, TherapistAvailability } from '@/types/scheduling'

// Extend expect with jest-axe
expect.extend(toHaveNoViolations)

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Arabic test data
const arabicMockSessions: ScheduledSession[] = [
  {
    id: 'session-arabic-1',
    student_id: 'student-1',
    therapist_id: 'therapist-1',
    therapy_program_id: 'program-1',
    session_date: '2025-09-01',
    start_time: '09:00',
    end_time: '09:45',
    session_type: 'speech_therapy',
    status: 'scheduled',
    room_id: 'room-1',
    notes: 'جلسة علاج النطق للطالب أحمد - تقييم أولي',
    student_name_ar: 'أحمد محمد السعيد',
    student_name_en: 'Ahmed Mohammed Al-Saeed',
    therapist_name_ar: 'د. فاطمة الزهراني',
    therapist_name_en: 'Dr. Fatima Al-Zahrani',
    therapy_type_ar: 'علاج النطق والتخاطب',
    therapy_type_en: 'Speech and Language Therapy',
    created_at: '2025-08-15T10:00:00Z',
    updated_at: '2025-08-15T10:00:00Z'
  },
  {
    id: 'session-arabic-2',
    student_id: 'student-2',
    therapist_id: 'therapist-2',
    therapy_program_id: 'program-2',
    session_date: '2025-09-01',
    start_time: '10:00',
    end_time: '10:45',
    session_type: 'occupational_therapy',
    status: 'in_progress',
    room_id: 'room-2',
    notes: 'جلسة علاج وظيفي للطالبة نورا - تطوير المهارات الحركية',
    student_name_ar: 'نورا عبدالله القحطاني',
    student_name_en: 'Nora Abdullah Al-Qahtani',
    therapist_name_ar: 'أ. خالد الشمري',
    therapist_name_en: 'Mr. Khalid Al-Shamari',
    therapy_type_ar: 'العلاج الوظيفي',
    therapy_type_en: 'Occupational Therapy',
    created_at: '2025-08-15T11:00:00Z',
    updated_at: '2025-08-15T11:00:00Z'
  }
]

const arabicTherapistAvailability: TherapistAvailability[] = [
  {
    id: 'availability-arabic-1',
    therapist_id: 'therapist-1',
    therapist_name_ar: 'د. فاطمة الزهراني',
    therapist_name_en: 'Dr. Fatima Al-Zahrani',
    availability_date: '2025-09-01',
    start_time: '08:00',
    end_time: '16:00',
    status: 'available',
    max_sessions: 8,
    break_times: [
      { start: '12:00', end: '13:00', label_ar: 'وقت الغداء', label_en: 'Lunch Break' }
    ],
    special_notes: 'متاحة لجلسات علاج النطق والتخاطب فقط',
    created_at: '2025-08-15T08:00:00Z',
    updated_at: '2025-08-15T08:00:00Z'
  }
]

// Test wrapper with Arabic context
const ArabicTestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false }
    }
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLanguage={language}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

// Accessibility testing utilities
const checkColorContrast = async (element: HTMLElement): Promise<void> => {
  const computedStyles = window.getComputedStyle(element)
  const backgroundColor = computedStyles.backgroundColor
  const color = computedStyles.color
  
  // Simple contrast check (actual implementation would use more sophisticated color analysis)
  expect(backgroundColor).not.toBe(color)
  expect(backgroundColor).not.toBe('transparent')
  expect(color).not.toBe('transparent')
}

const checkRTLLayout = (element: HTMLElement): void => {
  expect(element).toHaveAttribute('dir', 'rtl')
  
  const computedStyles = window.getComputedStyle(element)
  expect(computedStyles.direction).toBe('rtl')
  expect(computedStyles.textAlign).toMatch(/right|start/)
}

const checkFocusManagement = async (container: HTMLElement): Promise<void> => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  expect(focusableElements.length).toBeGreaterThan(0)
  
  // Check tab order
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
  
  firstElement.focus()
  expect(document.activeElement).toBe(firstElement)
  
  // Simulate tab navigation
  fireEvent.keyDown(firstElement, { key: 'Tab' })
  await waitFor(() => {
    expect(document.activeElement).not.toBe(firstElement)
  })
}

const checkScreenReaderSupport = (element: HTMLElement): void => {
  // Check for proper ARIA labels
  const ariaLabel = element.getAttribute('aria-label')
  const ariaLabelledBy = element.getAttribute('aria-labelledby')
  const ariaDescribedBy = element.getAttribute('aria-describedby')
  
  expect(
    ariaLabel || ariaLabelledBy || element.textContent?.trim()
  ).toBeTruthy()
  
  // Check for proper roles
  if (element.tagName.toLowerCase() === 'div') {
    const role = element.getAttribute('role')
    if (role) {
      expect(['button', 'link', 'tab', 'tabpanel', 'dialog', 'alert', 'status', 'main', 'region']).toContain(role)
    }
  }
}

describe('Arabic RTL Scheduling Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful data fetching
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: arabicMockSessions[0], error: null })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('meets WCAG 2.1 AA standards for Arabic scheduling dashboard', async () => {
      const { container } = render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // Run axe accessibility checks
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Additional WCAG checks
      const dashboard = screen.getByTestId('scheduling-dashboard')
      checkRTLLayout(dashboard)
      await checkColorContrast(dashboard)
      checkScreenReaderSupport(dashboard)
    })

    it('maintains accessibility in Arabic calendar view', async () => {
      const { container } = render(
        <ArabicTestWrapper language="ar">
          <CalendarView 
            sessions={arabicMockSessions}
            view="monthly"
            currentDate={new Date('2025-09-01')}
            onSessionClick={() => {}}
            onDateClick={() => {}}
          />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check calendar-specific accessibility
      const calendarGrid = screen.getByRole('grid')
      expect(calendarGrid).toBeInTheDocument()
      expect(calendarGrid).toHaveAttribute('aria-label', expect.stringContaining('تقويم'))

      // Check date cells
      const dateCells = screen.getAllByRole('gridcell')
      expect(dateCells.length).toBeGreaterThan(0)
      dateCells.forEach(cell => {
        expect(cell).toHaveAttribute('aria-selected')
        expect(cell).toHaveAttribute('tabindex')
      })

      // Check RTL layout for calendar
      const calendarContainer = screen.getByTestId('calendar-view')
      checkRTLLayout(calendarContainer)
    })

    it('ensures accessibility in Arabic session forms', async () => {
      const user = userEvent.setup()
      
      const { container } = render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      // Open session creation form
      const createButton = await screen.findByRole('button', { name: /إنشاء.*جلسة/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('session-creation-form')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check form accessibility
      const form = screen.getByTestId('session-creation-form')
      checkRTLLayout(form)

      // Check form labels and inputs
      const studentLabel = screen.getByLabelText(/الطالب/i)
      expect(studentLabel).toBeInTheDocument()
      expect(studentLabel).toHaveAttribute('aria-required')

      const dateLabel = screen.getByLabelText(/التاريخ/i)
      expect(dateLabel).toBeInTheDocument()
      expect(dateLabel).toHaveAttribute('aria-required')

      const timeLabel = screen.getByLabelText(/الوقت/i)
      expect(timeLabel).toBeInTheDocument()
      expect(timeLabel).toHaveAttribute('aria-required')

      // Check error message accessibility
      const submitButton = screen.getByRole('button', { name: /إنشاء/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/هذا الحقل مطلوب/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('role', 'alert')
        expect(errorMessage).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('validates accessibility in drag-and-drop scheduling editor', async () => {
      const { container } = render(
        <ArabicTestWrapper language="ar">
          <DragDropScheduleEditor 
            sessions={arabicMockSessions}
            availabilities={arabicTherapistAvailability}
            onSessionMove={() => {}}
            onConflictDetected={() => {}}
          />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-editor')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check drag-and-drop accessibility
      const draggableItems = screen.getAllByRole('button', { name: /جلسة/i })
      expect(draggableItems.length).toBeGreaterThan(0)

      draggableItems.forEach(item => {
        expect(item).toHaveAttribute('draggable', 'true')
        expect(item).toHaveAttribute('aria-label', expect.stringContaining('جلسة'))
        expect(item).toHaveAttribute('aria-describedby')
      })

      // Check keyboard navigation for drag-and-drop
      const firstDraggable = draggableItems[0]
      firstDraggable.focus()
      expect(document.activeElement).toBe(firstDraggable)

      // Test keyboard drag simulation
      fireEvent.keyDown(firstDraggable, { key: 'Space' })
      await waitFor(() => {
        expect(firstDraggable).toHaveAttribute('aria-grabbed', 'true')
      })

      // Check drop zones
      const dropZones = screen.getAllByTestId(/drop-zone-/)
      dropZones.forEach(zone => {
        expect(zone).toHaveAttribute('role', 'region')
        expect(zone).toHaveAttribute('aria-label', expect.stringContaining('منطقة'))
        expect(zone).toHaveAttribute('aria-dropeffect', 'move')
      })
    })
  })

  describe('Keyboard Navigation and Focus Management', () => {
    it('supports full keyboard navigation in Arabic interface', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      const dashboard = screen.getByTestId('scheduling-dashboard')
      await checkFocusManagement(dashboard)

      // Test tab navigation through main controls
      const createButton = screen.getByRole('button', { name: /إنشاء.*جلسة/i })
      const viewToggle = screen.getByRole('button', { name: /عرض/i })
      const filterButton = screen.getByRole('button', { name: /تصفية/i })

      // Navigate with Tab
      createButton.focus()
      await user.keyboard('{Tab}')
      expect(document.activeElement).toBe(viewToggle)

      await user.keyboard('{Tab}')
      expect(document.activeElement).toBe(filterButton)

      // Test Shift+Tab for reverse navigation
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(viewToggle)

      // Test Enter/Space activation
      await user.keyboard('{Enter}')
      // Should activate the button (mock implementation)
      expect(viewToggle).toHaveAttribute('aria-pressed')
    })

    it('maintains focus order in RTL layout', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <TherapistAvailabilityManager />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('therapist-availability-manager')).toBeInTheDocument()
      })

      // In RTL layout, focus order should still be logical (top to bottom, right to left)
      const focusableElements = screen.getAllByRole('button')
      expect(focusableElements.length).toBeGreaterThan(0)

      // Test sequential focus
      let currentIndex = 0
      focusableElements[currentIndex].focus()

      for (let i = 1; i < Math.min(focusableElements.length, 5); i++) {
        await user.keyboard('{Tab}')
        currentIndex++
        expect(document.activeElement).toBe(focusableElements[currentIndex])
      }
    })

    it('handles keyboard shortcuts in Arabic context', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // Test keyboard shortcuts
      const dashboard = screen.getByTestId('scheduling-dashboard')
      dashboard.focus()

      // Ctrl+N for new session
      await user.keyboard('{Control>}n{/Control}')
      await waitFor(() => {
        expect(screen.getByTestId('session-creation-form')).toBeInTheDocument()
      })

      // Escape to close
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByTestId('session-creation-form')).not.toBeInTheDocument()
      })

      // Ctrl+F for search/filter
      await user.keyboard('{Control>}f{/Control}')
      await waitFor(() => {
        const searchInput = screen.getByRole('textbox', { name: /بحث/i })
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveFocus()
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('provides proper ARIA labels for Arabic content', async () => {
      render(
        <ArabicTestWrapper language="ar">
          <SessionDetailsPopover 
            session={arabicMockSessions[0]}
            isOpen={true}
            onClose={() => {}}
          />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
      expect(dialog).toHaveAttribute('dir', 'rtl')

      // Check session details with Arabic labels
      expect(screen.getByText('اسم الطالب:')).toBeInTheDocument()
      expect(screen.getByText('أحمد محمد السعيد')).toBeInTheDocument()
      
      expect(screen.getByText('المعالج:')).toBeInTheDocument()
      expect(screen.getByText('د. فاطمة الزهراني')).toBeInTheDocument()

      expect(screen.getByText('نوع العلاج:')).toBeInTheDocument()
      expect(screen.getByText('علاج النطق والتخاطب')).toBeInTheDocument()

      // Check that all text elements have proper screen reader attributes
      const studentName = screen.getByText('أحمد محمد السعيد')
      const label = screen.getByText('اسم الطالب:')
      expect(studentName.getAttribute('aria-labelledby')).toBe(label.id)
    })

    it('announces dynamic content changes in Arabic', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <BulkReschedulingManager />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('bulk-rescheduling-manager')).toBeInTheDocument()
      })

      // Start bulk operation
      const startButton = screen.getByRole('button', { name: /بدء.*العملية/i })
      await user.click(startButton)

      // Check for live region announcements
      await waitFor(() => {
        const statusRegion = screen.getByRole('status')
        expect(statusRegion).toBeInTheDocument()
        expect(statusRegion).toHaveAttribute('aria-live', 'polite')
        expect(statusRegion.textContent).toMatch(/جاري.*المعالجة/i)
      })

      // Check for progress announcements
      const progressRegion = screen.getByRole('progressbar')
      expect(progressRegion).toBeInTheDocument()
      expect(progressRegion).toHaveAttribute('aria-valuemin', '0')
      expect(progressRegion).toHaveAttribute('aria-valuemax', '100')
      expect(progressRegion).toHaveAttribute('aria-valuenow')
      expect(progressRegion).toHaveAttribute('aria-label', expect.stringContaining('تقدم العملية'))
    })

    it('handles error announcements in Arabic', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      // Simulate error scenario
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Network error'))
      })

      // Try to create a session that will fail
      const createButton = await screen.findByRole('button', { name: /إنشاء.*جلسة/i })
      await user.click(createButton)

      const form = await screen.findByTestId('session-creation-form')
      const submitButton = within(form).getByRole('button', { name: /إنشاء/i })
      await user.click(submitButton)

      // Check error announcement
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive')
        expect(errorAlert.textContent).toMatch(/خطأ.*في.*الشبكة/i)
      })
    })
  })

  describe('Color and Contrast Accessibility', () => {
    it('maintains sufficient color contrast in Arabic interface', async () => {
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // Check primary text elements
      const headings = screen.getAllByRole('heading')
      for (const heading of headings) {
        await checkColorContrast(heading)
      }

      // Check buttons
      const buttons = screen.getAllByRole('button')
      for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
        await checkColorContrast(button)
      }

      // Check status indicators
      const statusElements = screen.getAllByTestId(/status-/)
      for (const status of statusElements) {
        await checkColorContrast(status)
      }
    })

    it('supports high contrast mode for Arabic text', async () => {
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <ArabicTestWrapper language="ar">
          <CalendarView 
            sessions={arabicMockSessions}
            view="weekly"
            currentDate={new Date('2025-09-01')}
            onSessionClick={() => {}}
            onDateClick={() => {}}
          />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
      })

      const calendarContainer = screen.getByTestId('calendar-view')
      
      // In high contrast mode, check for enhanced visual indicators
      const sessions = screen.getAllByTestId(/session-item-/)
      sessions.forEach(session => {
        const computedStyles = window.getComputedStyle(session)
        // High contrast mode should have stronger borders
        expect(computedStyles.borderWidth).not.toBe('0px')
        expect(computedStyles.borderStyle).toBe('solid')
      })
    })

    it('handles color-blind accessibility with Arabic content', async () => {
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // Check that status indicators don't rely solely on color
      const statusElements = screen.getAllByTestId(/status-/)
      statusElements.forEach(element => {
        // Should have text indicators, not just colors
        expect(element.textContent?.trim()).toBeTruthy()
        
        // Should have icons or patterns
        const icon = within(element).queryByRole('img')
        const symbol = element.querySelector('[data-symbol]')
        expect(icon || symbol).toBeTruthy()
      })

      // Check session status indicators
      const sessions = screen.getAllByTestId(/session-item-/)
      sessions.forEach(session => {
        const statusText = within(session).getByTestId('session-status-text')
        expect(statusText).toBeInTheDocument()
        expect(statusText.textContent).toMatch(/(مجدولة|جارية|مكتملة)/i)
      })
    })
  })

  describe('Mobile and Responsive Accessibility', () => {
    it('maintains accessibility on mobile viewport with Arabic RTL', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 })

      const { container } = render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check touch targets are appropriately sized (minimum 44px)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const height = parseInt(styles.height)
        const width = parseInt(styles.width)
        
        expect(height).toBeGreaterThanOrEqual(44)
        expect(width).toBeGreaterThanOrEqual(44)
      })

      // Check RTL layout on mobile
      const dashboard = screen.getByTestId('scheduling-dashboard')
      checkRTLLayout(dashboard)
    })

    it('handles touch gestures accessibility in Arabic interface', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <DragDropScheduleEditor 
            sessions={arabicMockSessions}
            availabilities={arabicTherapistAvailability}
            onSessionMove={() => {}}
            onConflictDetected={() => {}}
          />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-editor')).toBeInTheDocument()
      })

      // Check that draggable items have touch-friendly alternatives
      const draggableItems = screen.getAllByRole('button', { name: /جلسة/i })
      
      // Should have context menu for touch devices
      const firstItem = draggableItems[0]
      
      // Long press simulation (touchstart + touchend after delay)
      fireEvent.touchStart(firstItem, { touches: [{ clientX: 100, clientY: 100 }] })
      
      await waitFor(() => {
        const contextMenu = screen.getByRole('menu')
        expect(contextMenu).toBeInTheDocument()
        expect(contextMenu).toHaveAttribute('aria-label', expect.stringContaining('خيارات الجلسة'))
      }, { timeout: 1000 })

      // Check menu options
      const moveOption = screen.getByRole('menuitem', { name: /نقل/i })
      expect(moveOption).toBeInTheDocument()
      
      const editOption = screen.getByRole('menuitem', { name: /تعديل/i })
      expect(editOption).toBeInTheDocument()
    })
  })

  describe('Cognitive and Learning Accessibility', () => {
    it('provides clear navigation and orientation cues in Arabic', async () => {
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // Check for breadcrumb navigation
      const breadcrumb = screen.getByRole('navigation', { name: /مسار التنقل/i })
      expect(breadcrumb).toBeInTheDocument()

      // Check for page title and description
      const pageTitle = screen.getByRole('heading', { level: 1 })
      expect(pageTitle.textContent).toMatch(/لوحة.*الجدولة/i)

      // Check for help text and instructions
      const helpButton = screen.getByRole('button', { name: /مساعدة/i })
      expect(helpButton).toBeInTheDocument()
      expect(helpButton).toHaveAttribute('aria-describedby')

      // Check for current state indicators
      const currentView = screen.getByTestId('current-view-indicator')
      expect(currentView).toBeInTheDocument()
      expect(currentView).toHaveAttribute('aria-label', expect.stringContaining('العرض الحالي'))
    })

    it('supports simplified navigation mode for cognitive accessibility', async () => {
      // Enable simplified mode
      localStorage.setItem('accessibility-simplified-mode', 'true')

      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // In simplified mode, should have reduced cognitive load
      const mainActions = screen.getAllByRole('button', { name: /رئيسي/i })
      expect(mainActions.length).toBeLessThanOrEqual(5) // Limited main actions

      // Should have clear, descriptive labels
      const createButton = screen.getByRole('button', { name: /إنشاء جلسة علاجية جديدة/i })
      expect(createButton).toBeInTheDocument()

      // Should have progress indicators
      const steps = screen.getAllByTestId(/step-indicator-/)
      expect(steps.length).toBeGreaterThan(0)
      
      steps.forEach(step => {
        expect(step).toHaveAttribute('aria-label')
        expect(step).toHaveAttribute('aria-current')
      })

      localStorage.removeItem('accessibility-simplified-mode')
    })

    it('provides error prevention and recovery in Arabic', async () => {
      const user = userEvent.setup()
      
      render(
        <ArabicTestWrapper language="ar">
          <SchedulingDashboard />
        </ArabicTestWrapper>
      )

      const createButton = await screen.findByRole('button', { name: /إنشاء.*جلسة/i })
      await user.click(createButton)

      const form = await screen.findByTestId('session-creation-form')

      // Check for validation hints before submission
      const requiredFields = within(form).getAllByAttribute('aria-required', 'true')
      requiredFields.forEach(field => {
        const hint = screen.getById(field.getAttribute('aria-describedby') || '')
        expect(hint).toBeInTheDocument()
        expect(hint.textContent).toMatch(/مطلوب/i)
      })

      // Check for confirmation dialogs on destructive actions
      const submitButton = within(form).getByRole('button', { name: /إنشاء/i })
      
      // Fill in conflicting data
      const dateInput = within(form).getByLabelText(/التاريخ/i)
      await user.type(dateInput, '2025-09-01')
      
      const timeInput = within(form).getByLabelText(/الوقت/i)
      await user.type(timeInput, '09:00') // Conflicts with existing session

      await user.click(submitButton)

      // Should show confirmation dialog for conflicts
      await waitFor(() => {
        const confirmDialog = screen.getByRole('dialog', { name: /تأكيد/i })
        expect(confirmDialog).toBeInTheDocument()
        expect(confirmDialog).toHaveAttribute('aria-describedby')
        
        const warningText = screen.getByText(/تعارض.*في.*المواعيد/i)
        expect(warningText).toBeInTheDocument()
      })
    })
  })
})