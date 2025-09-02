import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { toast } from 'sonner'
import { TherapistAvailabilityManager } from '../../../components/scheduling/TherapistAvailabilityManager'
import { useTherapistAvailability } from '../../../hooks/useTherapistAvailability'
import type { TherapistAvailability, AvailabilityTemplate } from '../../../types/scheduling'

// Mock dependencies
vi.mock('../../../hooks/useTherapistAvailability')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}))

// Mock i18n context
const mockI18n = {
  language: 'ar' as const,
  isRTL: true,
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'scheduling.therapist_availability': 'إدارة الأوقات المتاحة للمعالج',
      'scheduling.weekly_schedule': 'الجدول الأسبوعي',
      'scheduling.templates': 'القوالب',
      'scheduling.workload_metrics': 'مؤشرات العبء',
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.add': 'إضافة',
      'common.apply': 'تطبيق',
      'scheduling.add_availability': 'إضافة وقت متاح',
      'scheduling.edit_availability': 'تعديل الوقت المتاح',
      'scheduling.delete_availability': 'حذف الوقت المتاح',
      'scheduling.time_from': 'من الساعة',
      'scheduling.time_to': 'إلى الساعة',
      'scheduling.status': 'الحالة',
      'scheduling.available': 'متاح',
      'scheduling.busy': 'مشغول',
      'scheduling.unavailable': 'غير متاح',
      'scheduling.monday': 'الاثنين',
      'scheduling.tuesday': 'الثلاثاء',
      'scheduling.wednesday': 'الأربعاء',
      'scheduling.thursday': 'الخميس',
      'scheduling.friday': 'الجمعة',
      'scheduling.saturday': 'السبت',
      'scheduling.sunday': 'الأحد',
      'scheduling.utilization': 'معدل الاستغلال',
      'scheduling.total_hours': 'إجمالي الساعات',
      'scheduling.scheduled_hours': 'الساعات المجدولة',
      'scheduling.confirm_delete': 'هل أنت متأكد من الحذف؟',
      'scheduling.template_applied': 'تم تطبيق القالب بنجاح'
    }
    return translations[key] || key
  })
}

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => mockI18n
}))

// Mock data
const mockAvailability: TherapistAvailability[] = [
  {
    id: 'avail-1',
    therapist_id: 'therapist-1',
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '17:00',
    status: 'available',
    recurrence_pattern: 'weekly',
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'avail-2',
    therapist_id: 'therapist-1',
    day_of_week: 2, // Tuesday
    start_time: '09:00',
    end_time: '17:00',
    status: 'available',
    recurrence_pattern: 'weekly',
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

const mockTemplates: AvailabilityTemplate[] = [
  {
    id: 'template-1',
    name_ar: 'قالب الصباح',
    name_en: 'Morning Template',
    description_ar: 'ساعات العمل الصباحية',
    description_en: 'Morning working hours',
    schedule_pattern: [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 2, start_time: '08:00', end_time: '12:00' }
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    created_by: 'user-123'
  }
]

const mockWorkloadMetrics = {
  therapist_id: 'therapist-1',
  total_scheduled_minutes: 480,
  total_available_minutes: 2400,
  utilization_percentage: 20,
  sessions_count: 8,
  avg_session_duration: 60,
  peak_hours: ['10:00-11:00', '14:00-15:00'],
  date_range: {
    start_date: '2025-01-01',
    end_date: '2025-01-31'
  }
}

// Mock hook implementations
const mockHooks = {
  useTherapistAvailabilityQuery: vi.fn(),
  useCreateAvailability: vi.fn(),
  useUpdateAvailability: vi.fn(),
  useDeleteAvailability: vi.fn(),
  useBulkUpdateAvailability: vi.fn(),
  useAvailabilityTemplatesQuery: vi.fn(),
  useApplyTemplate: vi.fn(),
  useConflictDetection: vi.fn(),
  useWorkloadMetrics: vi.fn()
}

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <div dir="rtl" className="font-arabic">
        {children}
      </div>
    </QueryClientProvider>
  )
}

describe('TherapistAvailabilityManager', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockHooks.useTherapistAvailabilityQuery.mockReturnValue({
      data: mockAvailability,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    mockHooks.useAvailabilityTemplatesQuery.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null
    })

    mockHooks.useWorkloadMetrics.mockReturnValue({
      data: mockWorkloadMetrics,
      isLoading: false,
      error: null
    })

    mockHooks.useCreateAvailability.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
    })

    mockHooks.useUpdateAvailability.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
    })

    mockHooks.useDeleteAvailability.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
    })

    mockHooks.useBulkUpdateAvailability.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
    })

    mockHooks.useApplyTemplate.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
    })

    vi.mocked(useTherapistAvailability).mockReturnValue(mockHooks as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render component with Arabic RTL layout', () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('إدارة الأوقات المتاحة للمعالج')).toBeInTheDocument()
      expect(screen.getByText('الجدول الأسبوعي')).toBeInTheDocument()
      expect(screen.getByText('القوالب')).toBeInTheDocument()
      expect(screen.getByText('مؤشرات العبء')).toBeInTheDocument()
    })

    it('should render English layout when language is English', () => {
      mockI18n.language = 'en'
      mockI18n.isRTL = false

      render(
        <div dir="ltr" className="font-english">
          <TherapistAvailabilityManager therapistId="therapist-1" />
        </div>,
        { wrapper: createWrapper() }
      )

      // Component should adapt to LTR layout
      const container = screen.getByText('إدارة الأوقات المتاحة للمعالج').closest('div')
      expect(container).toBeInTheDocument()
    })

    it('should show loading state when data is loading', () => {
      mockHooks.useTherapistAvailabilityQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('availability-loading')).toBeInTheDocument()
    })

    it('should show error state when data fetch fails', () => {
      mockHooks.useTherapistAvailabilityQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn()
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('availability-error')).toBeInTheDocument()
    })
  })

  describe('Weekly Schedule View', () => {
    it('should display weekly calendar with availability slots', () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      // Check for day headers
      expect(screen.getByText('الاثنين')).toBeInTheDocument()
      expect(screen.getByText('الثلاثاء')).toBeInTheDocument()

      // Check for time slots
      expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
    })

    it('should handle clicking on time slots to edit', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const timeSlot = screen.getByText('09:00 - 17:00')
      await user.click(timeSlot)

      expect(screen.getByText('تعديل الوقت المتاح')).toBeInTheDocument()
    })

    it('should allow adding new availability slots', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const addButton = screen.getByText('إضافة')
      await user.click(addButton)

      expect(screen.getByText('إضافة وقت متاح')).toBeInTheDocument()
    })

    it('should support drag and drop for time slots', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const timeSlot = screen.getByTestId('availability-slot-avail-1')
      
      // Mock drag and drop events
      fireEvent.dragStart(timeSlot)
      fireEvent.dragOver(timeSlot)
      fireEvent.drop(timeSlot)

      // Should trigger update mutation
      expect(mockHooks.useUpdateAvailability().mutate).toHaveBeenCalled()
    })
  })

  describe('Availability Form', () => {
    it('should open create form when adding new availability', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      await user.click(screen.getByText('إضافة'))

      expect(screen.getByLabelText('من الساعة')).toBeInTheDocument()
      expect(screen.getByLabelText('إلى الساعة')).toBeInTheDocument()
      expect(screen.getByLabelText('الحالة')).toBeInTheDocument()
    })

    it('should validate form inputs', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      await user.click(screen.getByText('إضافة'))

      // Try to save without required fields
      await user.click(screen.getByText('حفظ'))

      expect(screen.getByText(/مطلوب/)).toBeInTheDocument()
    })

    it('should submit form data correctly', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      await user.click(screen.getByText('إضافة'))

      // Fill form
      await user.type(screen.getByLabelText('من الساعة'), '08:00')
      await user.type(screen.getByLabelText('إلى الساعة'), '16:00')
      await user.selectOptions(screen.getByLabelText('الحالة'), 'available')

      await user.click(screen.getByText('حفظ'))

      expect(mockHooks.useCreateAvailability().mutate).toHaveBeenCalledWith({
        therapist_id: 'therapist-1',
        start_time: '08:00',
        end_time: '16:00',
        status: 'available',
        day_of_week: expect.any(Number),
        recurrence_pattern: 'weekly',
        effective_date: expect.any(String)
      })
    })

    it('should close form when cancelled', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      await user.click(screen.getByText('إضافة'))
      expect(screen.getByText('إضافة وقت متاح')).toBeInTheDocument()

      await user.click(screen.getByText('إلغاء'))
      expect(screen.queryByText('إضافة وقت متاح')).not.toBeInTheDocument()
    })
  })

  describe('Template Management', () => {
    it('should display available templates', () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('قالب الصباح')).toBeInTheDocument()
      expect(screen.getByText('ساعات العمل الصباحية')).toBeInTheDocument()
    })

    it('should allow applying templates', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const templateCard = screen.getByText('قالب الصباح').closest('[data-testid="template-card"]')
      const applyButton = within(templateCard!).getByText('تطبيق')
      
      await user.click(applyButton)

      expect(mockHooks.useApplyTemplate().mutate).toHaveBeenCalledWith({
        templateId: 'template-1',
        therapistId: 'therapist-1',
        effectiveDate: expect.any(String)
      })
    })

    it('should show confirmation before applying template', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const templateCard = screen.getByText('قالب الصباح').closest('[data-testid="template-card"]')
      const applyButton = within(templateCard!).getByText('تطبيق')
      
      await user.click(applyButton)

      expect(screen.getByText(/هل أنت متأكد/)).toBeInTheDocument()
    })
  })

  describe('Workload Metrics', () => {
    it('should display workload metrics', () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('20%')).toBeInTheDocument() // Utilization
      expect(screen.getByText('8 ساعات')).toBeInTheDocument() // Scheduled hours
      expect(screen.getByText('40 ساعات')).toBeInTheDocument() // Total hours
    })

    it('should show loading state for metrics', () => {
      mockHooks.useWorkloadMetrics.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('metrics-loading')).toBeInTheDocument()
    })

    it('should handle metrics calculation errors', () => {
      mockHooks.useWorkloadMetrics.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Calculation failed')
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText(/خطأ في حساب المؤشرات/)).toBeInTheDocument()
    })
  })

  describe('Delete Operations', () => {
    it('should show delete confirmation dialog', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const deleteButton = screen.getAllByText('حذف')[0]
      await user.click(deleteButton)

      expect(screen.getByText('هل أنت متأكد من الحذف؟')).toBeInTheDocument()
    })

    it('should delete availability when confirmed', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const deleteButton = screen.getAllByText('حذف')[0]
      await user.click(deleteButton)

      const confirmButton = screen.getByText('تأكيد')
      await user.click(confirmButton)

      expect(mockHooks.useDeleteAvailability().mutate).toHaveBeenCalledWith('avail-1')
    })

    it('should cancel delete operation', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const deleteButton = screen.getAllByText('حذف')[0]
      await user.click(deleteButton)

      const cancelButton = screen.getByText('إلغاء')
      await user.click(cancelButton)

      expect(mockHooks.useDeleteAvailability().mutate).not.toHaveBeenCalled()
      expect(screen.queryByText('هل أنت متأكد من الحذف؟')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Arabic content', () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'إدارة الأوقات المتاحة للمعالج')
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const firstTab = screen.getByRole('tab', { name: /الجدول الأسبوعي/ })
      firstTab.focus()
      
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: /القوالب/ })).toHaveFocus()
    })

    it('should announce changes to screen readers', async () => {
      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      // Simulate successful creation
      mockHooks.useCreateAvailability.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        isSuccess: true
      })

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const container = screen.getByRole('main')
      expect(container).toHaveClass('mobile-layout')
    })

    it('should show compact view on smaller screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('compact-view')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error messages for failed operations', async () => {
      mockHooks.useCreateAvailability.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: { message: 'Creation failed' },
        isError: true
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText(/Creation failed/)).toBeInTheDocument()
    })

    it('should retry failed operations', async () => {
      const retryFn = vi.fn()
      mockHooks.useTherapistAvailabilityQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: retryFn
      })

      render(
        <TherapistAvailabilityManager therapistId="therapist-1" />,
        { wrapper: createWrapper() }
      )

      const retryButton = screen.getByText('إعادة المحاولة')
      await user.click(retryButton)

      expect(retryFn).toHaveBeenCalled()
    })
  })
})