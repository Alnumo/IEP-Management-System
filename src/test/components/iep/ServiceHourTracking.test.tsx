/**
 * Service Hour Tracking Component Tests
 * اختبارات مكون تتبع ساعات الخدمة
 * 
 * @description Comprehensive test suite for service hour tracking functionality
 * مجموعة اختبارات شاملة لوظائف تتبع ساعات الخدمة
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceHourTracking } from '@/components/iep/ServiceHourTracking'
import { ServiceHourTrackingService } from '@/services/service-hour-tracking'
import { 
  ServiceDeliverySession, 
  ServiceTrackingStats,
  ServiceComplianceCalculation 
} from '@/types/service-tracking'

// =============================================================================
// MOCK DATA
// =============================================================================

const mockServiceStats: ServiceTrackingStats = {
  total_services: 25,
  active_services: 20,
  compliant_services: 15,
  at_risk_services: 3,
  non_compliant_services: 2,
  active_alerts: 5,
  overdue_sessions: 3,
  pending_documentation: 7,
  makeup_sessions_needed: 4
}

const mockServiceSessions: ServiceDeliverySession[] = [
  {
    id: 'session-1',
    service_id: 'service-1',
    student_id: 'student-1',
    session_date: '2024-08-31',
    session_time: '10:00',
    planned_duration_minutes: 60,
    actual_duration_minutes: 55,
    provider_id: 'therapist-1',
    provider_name: 'Dr. Sarah Ahmed',
    is_substitute_session: false,
    actual_location: 'therapy_room',
    location_notes_ar: 'غرفة العلاج الطبيعي',
    location_notes_en: 'Physical therapy room',
    session_status: 'completed',
    services_delivered_ar: 'جلسة علاج طبيعي مكتملة',
    services_delivered_en: 'Complete physical therapy session',
    session_objectives_met: true,
    student_engagement_level: 4,
    progress_notes_ar: 'تقدم ممتاز في التوازن',
    progress_notes_en: 'Excellent progress in balance',
    behavioral_observations_ar: 'تعاون جيد',
    behavioral_observations_en: 'Good cooperation',
    goals_addressed: ['goal-1', 'goal-2'],
    objective_progress: {},
    session_documented: true,
    documentation_complete: true,
    requires_makeup_session: false,
    makeup_session_scheduled: false,
    supervisor_review_required: false,
    billable_session: true,
    billing_code: 'PT-001',
    administrative_notes_ar: 'جلسة عادية',
    administrative_notes_en: 'Regular session',
    created_at: '2024-08-31T10:00:00Z',
    updated_at: '2024-08-31T11:00:00Z',
    created_by: 'therapist-1'
  },
  {
    id: 'session-2',
    service_id: 'service-1',
    student_id: 'student-1',
    session_date: '2024-08-30',
    session_time: '09:00',
    planned_duration_minutes: 45,
    actual_duration_minutes: 30,
    provider_id: 'therapist-2',
    provider_name: 'Ahmad Al-Rashid',
    is_substitute_session: false,
    actual_location: 'home',
    session_status: 'partial',
    cancellation_reason_ar: 'الطفل متعب',
    cancellation_reason_en: 'Child was tired',
    services_delivered_ar: 'جلسة جزئية',
    services_delivered_en: 'Partial session',
    session_objectives_met: false,
    student_engagement_level: 2,
    progress_notes_ar: 'صعوبة في التركيز',
    progress_notes_en: 'Difficulty focusing',
    goals_addressed: ['goal-1'],
    objective_progress: {},
    session_documented: true,
    documentation_complete: true,
    requires_makeup_session: true,
    makeup_session_scheduled: false,
    supervisor_review_required: true,
    billable_session: true,
    created_at: '2024-08-30T09:00:00Z',
    updated_at: '2024-08-30T09:45:00Z',
    created_by: 'therapist-2'
  },
  {
    id: 'session-3',
    service_id: 'service-1',
    student_id: 'student-1',
    session_date: '2024-08-29',
    session_time: '14:00',
    planned_duration_minutes: 60,
    provider_id: 'therapist-1',
    provider_name: 'Dr. Sarah Ahmed',
    is_substitute_session: false,
    actual_location: 'therapy_room',
    session_status: 'cancelled',
    cancellation_reason_ar: 'مرض الطفل',
    cancellation_reason_en: 'Child illness',
    goals_addressed: [],
    objective_progress: {},
    session_documented: true,
    documentation_complete: false,
    requires_makeup_session: true,
    makeup_session_scheduled: false,
    supervisor_review_required: false,
    billable_session: false,
    created_at: '2024-08-29T14:00:00Z',
    updated_at: '2024-08-29T14:05:00Z',
    created_by: 'therapist-1'
  }
]

const mockComplianceCalculation: ServiceComplianceCalculation = {
  planned_minutes: 300,
  delivered_minutes: 240,
  compliance_percentage: 80,
  compliance_status: 'at_risk',
  makeup_needed: 60,
  variance_amount: 60
}

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

// Mock the service module
vi.mock('@/services/service-hour-tracking', () => ({
  ServiceHourTrackingService: {
    getServiceSessions: vi.fn(),
    getServiceTrackingStats: vi.fn(),
    calculateServiceCompliance: vi.fn(),
    updateServiceHourSummary: vi.fn(),
    createComplianceAlert: vi.fn(),
  }
}))

// Mock the hooks module
vi.mock('@/hooks/useServiceHourTracking', () => ({
  useServiceSessions: vi.fn(),
  useServiceTrackingStats: vi.fn(),
  useServiceCompliance: vi.fn(),
  useUpdateServiceHourSummary: vi.fn(),
  useActiveServiceAlerts: vi.fn(),
  useOverdueDocumentation: vi.fn(),
  useSessionsRequiringMakeup: vi.fn(),
}))

// Mock UI components that might not be available in test environment
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}))

// =============================================================================
// TEST UTILITIES
// =============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('ServiceHourTracking Component', () => {
  let mockGetServiceSessions: any
  let mockGetServiceTrackingStats: any
  let mockCalculateServiceCompliance: any
  let mockUpdateServiceHourSummary: any
  
  beforeEach(() => {
    // Setup fresh mocks before each test
    const { 
      useServiceSessions, 
      useServiceTrackingStats, 
      useServiceCompliance,
      useUpdateServiceHourSummary,
      useActiveServiceAlerts,
      useOverdueDocumentation,
      useSessionsRequiringMakeup
    } = require('@/hooks/useServiceHourTracking')

    // Mock hook return values
    useServiceSessions.mockReturnValue({
      data: mockServiceSessions,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue({ data: mockServiceSessions })
    })

    useServiceTrackingStats.mockReturnValue({
      data: mockServiceStats,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue({ data: mockServiceStats })
    })

    useServiceCompliance.mockReturnValue({
      data: mockComplianceCalculation,
      isLoading: false
    })

    useUpdateServiceHourSummary.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false
    })

    useActiveServiceAlerts.mockReturnValue({
      data: [],
      isLoading: false
    })

    useOverdueDocumentation.mockReturnValue({
      data: [mockServiceSessions[2]], // Session with incomplete documentation
      isLoading: false
    })

    useSessionsRequiringMakeup.mockReturnValue({
      data: [mockServiceSessions[1], mockServiceSessions[2]], // Partial and cancelled sessions
      isLoading: false
    })

    // Mock service methods
    mockGetServiceSessions = vi.mocked(ServiceHourTrackingService.getServiceSessions)
    mockGetServiceTrackingStats = vi.mocked(ServiceHourTrackingService.getServiceTrackingStats)
    mockCalculateServiceCompliance = vi.mocked(ServiceHourTrackingService.calculateServiceCompliance)
    mockUpdateServiceHourSummary = vi.mocked(ServiceHourTrackingService.updateServiceHourSummary)

    mockGetServiceSessions.mockResolvedValue(mockServiceSessions)
    mockGetServiceTrackingStats.mockResolvedValue(mockServiceStats)
    mockCalculateServiceCompliance.mockResolvedValue(mockComplianceCalculation)
    mockUpdateServiceHourSummary.mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the main component with Arabic language', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('تتبع ساعات الخدمة')).toBeInTheDocument()
      expect(screen.getByText('مراقبة وتتبع ساعات تقديم الخدمات العلاجية')).toBeInTheDocument()
    })

    it('renders the main component with English language', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="en"
        />
      )

      expect(screen.getByText('Service Hour Tracking')).toBeInTheDocument()
      expect(screen.getByText('Monitor and track therapy service delivery hours')).toBeInTheDocument()
    })

    it('renders all main navigation tabs', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('نظرة عامة')).toBeInTheDocument()
      expect(screen.getByText('الجلسات')).toBeInTheDocument()
      expect(screen.getByText('الامتثال')).toBeInTheDocument()
      expect(screen.getByText('التقارير')).toBeInTheDocument()
    })

    it('renders action buttons in header', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('تحديث')).toBeInTheDocument()
      expect(screen.getByText('إعادة حساب')).toBeInTheDocument()
    })
  })

  describe('Overview Tab Functionality', () => {
    it('displays service statistics correctly', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('25')).toBeInTheDocument() // Total services
      expect(screen.getByText('20')).toBeInTheDocument() // Active services
      expect(screen.getByText('5')).toBeInTheDocument() // Active alerts
      expect(screen.getByText('3')).toBeInTheDocument() // Overdue sessions
    })

    it('calculates compliance rate correctly', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      // Compliance rate: (15 compliant / 25 total) * 100 = 60%
      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('displays compliance breakdown', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument() // Compliant
      expect(screen.getByText('3')).toBeInTheDocument() // At risk
      expect(screen.getByText('2')).toBeInTheDocument() // Non-compliant
      
      expect(screen.getByText('متوافقة')).toBeInTheDocument()
      expect(screen.getByText('معرضة للخطر')).toBeInTheDocument()
      expect(screen.getByText('غير متوافقة')).toBeInTheDocument()
    })

    it('shows alerts for overdue documentation', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('توثيق متأخر')).toBeInTheDocument()
      expect(screen.getByText('1 جلسة تحتاج إلى توثيق')).toBeInTheDocument()
    })

    it('shows alerts for makeup sessions required', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('جلسات تعويضية مطلوبة')).toBeInTheDocument()
      expect(screen.getByText('2 جلسة تحتاج إلى تعويض')).toBeInTheDocument()
    })
  })

  describe('Sessions Tab Functionality', () => {
    beforeEach(async () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )
      
      // Switch to sessions tab
      const sessionsTab = screen.getByText('الجلسات')
      await userEvent.click(sessionsTab)
    })

    it('displays sessions filter interface', () => {
      expect(screen.getByText('تصفية الجلسات')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('ابحث في الجلسات...')).toBeInTheDocument()
      expect(screen.getByText('حالة الجلسة')).toBeInTheDocument()
      expect(screen.getByText('تاريخ البداية')).toBeInTheDocument()
      expect(screen.getByText('تاريخ النهاية')).toBeInTheDocument()
    })

    it('displays sessions table with correct data', () => {
      expect(screen.getByText('جلسات الخدمة')).toBeInTheDocument()
      expect(screen.getByText('(3)')).toBeInTheDocument() // Session count
      
      // Check for session data
      expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument()
      expect(screen.getByText('Ahmad Al-Rashid')).toBeInTheDocument()
    })

    it('displays correct session statuses with Arabic text', () => {
      expect(screen.getByText('مكتملة')).toBeInTheDocument() // Completed
      expect(screen.getByText('جزئية')).toBeInTheDocument() // Partial
      expect(screen.getByText('ملغاة')).toBeInTheDocument() // Cancelled
    })

    it('shows documentation status icons', () => {
      const completedIcons = screen.getAllByTestId('completed-icon') || 
        document.querySelectorAll('[data-testid="completed-icon"], .text-green-600')
      const incompleteIcons = screen.getAllByTestId('incomplete-icon') ||
        document.querySelectorAll('[data-testid="incomplete-icon"], .text-red-600')

      expect(completedIcons.length).toBeGreaterThan(0)
      expect(incompleteIcons.length).toBeGreaterThan(0)
    })

    it('filters sessions by search query', async () => {
      const searchInput = screen.getByPlaceholderText('ابحث في الجلسات...')
      
      await userEvent.type(searchInput, 'Sarah')
      
      // Should show sessions with Dr. Sarah Ahmed
      expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument()
    })

    it('allows selecting session status filter', async () => {
      const statusSelect = screen.getByText('اختر الحالة')
      await userEvent.click(statusSelect)
      
      expect(screen.getByText('مكتملة')).toBeInTheDocument()
      expect(screen.getByText('مجدولة')).toBeInTheDocument()
      expect(screen.getByText('ملغاة')).toBeInTheDocument()
      expect(screen.getByText('لم يحضر')).toBeInTheDocument()
    })

    it('displays new session button', () => {
      expect(screen.getByText('جلسة جديدة')).toBeInTheDocument()
    })
  })

  describe('Data Refresh Functionality', () => {
    it('calls refresh functions when refresh button is clicked', async () => {
      const mockRefetchSessions = vi.fn().mockResolvedValue({ data: mockServiceSessions })
      const mockRefetchStats = vi.fn().mockResolvedValue({ data: mockServiceStats })

      const { useServiceSessions, useServiceTrackingStats } = require('@/hooks/useServiceHourTracking')
      
      useServiceSessions.mockReturnValue({
        data: mockServiceSessions,
        isLoading: false,
        refetch: mockRefetchSessions
      })

      useServiceTrackingStats.mockReturnValue({
        data: mockServiceStats,
        isLoading: false,
        refetch: mockRefetchStats
      })

      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      const refreshButton = screen.getByText('تحديث')
      await userEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockRefetchSessions).toHaveBeenCalled()
        expect(mockRefetchStats).toHaveBeenCalled()
      })
    })

    it('calls update summary when recalculate button is clicked', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      
      const { useUpdateServiceHourSummary } = require('@/hooks/useServiceHourTracking')
      
      useUpdateServiceHourSummary.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      })

      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      const recalculateButton = screen.getByText('إعادة حساب')
      await userEvent.click(recalculateButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          serviceId: 'service-1',
          studentId: 'student-1',
          periodType: 'weekly'
        })
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state when data is being fetched', () => {
      const { useServiceSessions, useServiceTrackingStats } = require('@/hooks/useServiceHourTracking')
      
      useServiceSessions.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn()
      })

      useServiceTrackingStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn()
      })

      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      expect(screen.getByText('جاري تحميل بيانات الخدمة...')).toBeInTheDocument()
    })

    it('disables buttons during loading', () => {
      const { useServiceSessions, useServiceTrackingStats } = require('@/hooks/useServiceHourTracking')
      
      useServiceSessions.mockReturnValue({
        data: mockServiceSessions,
        isLoading: true,
        refetch: vi.fn()
      })

      useServiceTrackingStats.mockReturnValue({
        data: mockServiceStats,
        isLoading: false,
        refetch: vi.fn()
      })

      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      const refreshButton = screen.getByText('تحديث')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('RTL Layout Support', () => {
    it('applies RTL classes for Arabic language', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      // Check if elements have flex-row-reverse class for RTL layout
      const headerElements = document.querySelectorAll('.flex-row-reverse')
      expect(headerElements.length).toBeGreaterThan(0)
    })

    it('uses LTR layout for English language', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="en"
        />
      )

      // Should not have RTL-specific classes when using English
      const rtlElements = document.querySelectorAll('.flex-row-reverse')
      expect(rtlElements.length).toBe(0)
    })
  })

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', () => {
      // Mock small screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      // Check for mobile-specific grid classes
      const gridElements = document.querySelectorAll('.grid-cols-1')
      expect(gridElements.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('handles missing service or student ID gracefully', () => {
      renderWithProviders(
        <ServiceHourTracking language="ar" />
      )

      // Should still render component without IDs
      expect(screen.getByText('تتبع ساعات الخدمة')).toBeInTheDocument()
      
      // Recalculate button should be disabled without IDs
      const recalculateButton = screen.getByText('إعادة حساب')
      expect(recalculateButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      // Check for accessible table structure
      expect(screen.getByRole('button', { name: /تحديث/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /إعادة حساب/ })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <ServiceHourTracking 
          serviceId="service-1"
          studentId="student-1"
          language="ar"
        />
      )

      const refreshButton = screen.getByText('تحديث')
      refreshButton.focus()
      expect(document.activeElement).toBe(refreshButton)
      
      // Tab to next element
      await userEvent.tab()
      const recalculateButton = screen.getByText('إعادة حساب')
      expect(document.activeElement).toBe(recalculateButton)
    })
  })
})

describe('ServiceHourTracking Integration', () => {
  it('integrates correctly with service tracking hooks', () => {
    const { useServiceSessions } = require('@/hooks/useServiceHourTracking')
    
    renderWithProviders(
      <ServiceHourTracking 
        serviceId="service-1"
        studentId="student-1"
        language="ar"
      />
    )

    expect(useServiceSessions).toHaveBeenCalledWith({
      service_id: 'service-1',
      student_id: 'student-1'
    })
  })

  it('passes correct props to child components', () => {
    renderWithProviders(
      <ServiceHourTracking 
        serviceId="service-1"
        studentId="student-1"
        language="ar"
        className="custom-class"
      />
    )

    const mainContainer = document.querySelector('.custom-class')
    expect(mainContainer).toBeInTheDocument()
  })
})