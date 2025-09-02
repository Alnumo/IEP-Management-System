import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createClient } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '@/contexts/I18nContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { SchedulingDashboard } from '@/components/scheduling/SchedulingDashboard'
import { TherapistAvailabilityManager } from '@/components/scheduling/TherapistAvailabilityManager'
import { BulkReschedulingManager } from '@/components/scheduling/BulkReschedulingManager'
import { SchedulingIntegrationService } from '@/services/scheduling-integration-service'
import { SubscriptionFreezeService } from '@/services/subscription-freeze-service'
import { ProgramModificationService } from '@/services/program-modification-service'
import { BulkReschedulingService } from '@/services/bulk-rescheduling-service'
import type { 
  ScheduledSession, 
  TherapistAvailability, 
  StudentEnrollment, 
  SubscriptionFreeze,
  ProgramModification,
  BulkReschedulingOperation,
  IntegrationValidationResult 
} from '@/types/scheduling'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn(),
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn()
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Mock services with comprehensive functionality
vi.mock('@/services/scheduling-integration-service', () => ({
  SchedulingIntegrationService: vi.fn().mockImplementation(() => ({
    syncWithEnrollmentSystem: vi.fn(),
    validateTherapistAvailability: vi.fn(),
    checkRoomConflicts: vi.fn(),
    processBillingValidation: vi.fn(),
    resolveSchedulingConflicts: vi.fn(),
    generateIntegrationReport: vi.fn()
  }))
}))

vi.mock('@/services/subscription-freeze-service', () => ({
  SubscriptionFreezeService: vi.fn().mockImplementation(() => ({
    freezeSubscription: vi.fn(),
    unfreezeSubscription: vi.fn(),
    calculateImpactAnalysis: vi.fn(),
    processRescheduling: vi.fn(),
    notifyStakeholders: vi.fn()
  }))
}))

vi.mock('@/services/program-modification-service', () => ({
  ProgramModificationService: vi.fn().mockImplementation(() => ({
    analyzeModificationImpact: vi.fn(),
    calculateCostImplications: vi.fn(),
    assessTherapistWorkload: vi.fn(),
    generateModificationPlan: vi.fn(),
    executeModification: vi.fn()
  }))
}))

vi.mock('@/services/bulk-rescheduling-service', () => ({
  BulkReschedulingService: vi.fn().mockImplementation(() => ({
    processBulkOperation: vi.fn(),
    trackProgress: vi.fn(),
    handleConflicts: vi.fn(),
    rollbackChanges: vi.fn(),
    generateReport: vi.fn()
  }))
}))

// Mock data for integration testing
const mockStudentEnrollment: StudentEnrollment = {
  id: 'enrollment-1',
  student_id: 'student-1',
  therapy_program_id: 'program-1',
  enrollment_date: '2025-08-01',
  program_start_date: '2025-09-01',
  program_end_date: '2025-12-31',
  status: 'active',
  sessions_per_week: 2,
  session_duration_minutes: 45,
  preferred_times: ['09:00-12:00', '14:00-16:00'],
  special_requirements: [],
  created_at: '2025-08-01T10:00:00Z',
  updated_at: '2025-08-01T10:00:00Z'
}

const mockTherapistAvailability: TherapistAvailability = {
  id: 'availability-1',
  therapist_id: 'therapist-1',
  availability_date: '2025-09-01',
  start_time: '09:00',
  end_time: '17:00',
  status: 'available',
  max_sessions: 8,
  break_times: [{ start: '12:00', end: '13:00' }],
  special_notes: '',
  created_at: '2025-08-15T10:00:00Z',
  updated_at: '2025-08-15T10:00:00Z'
}

const mockScheduledSessions: ScheduledSession[] = [
  {
    id: 'session-1',
    student_id: 'student-1',
    therapist_id: 'therapist-1',
    therapy_program_id: 'program-1',
    session_date: '2025-09-01',
    start_time: '09:00',
    end_time: '09:45',
    session_type: 'speech_therapy',
    status: 'scheduled',
    room_id: 'room-1',
    notes: 'Initial assessment session',
    created_at: '2025-08-15T14:00:00Z',
    updated_at: '2025-08-15T14:00:00Z'
  },
  {
    id: 'session-2',
    student_id: 'student-2',
    therapist_id: 'therapist-1',
    therapy_program_id: 'program-2',
    session_date: '2025-09-01',
    start_time: '10:00',
    end_time: '10:45',
    session_type: 'occupational_therapy',
    status: 'scheduled',
    room_id: 'room-2',
    notes: 'Follow-up session',
    created_at: '2025-08-15T14:30:00Z',
    updated_at: '2025-08-15T14:30:00Z'
  }
]

const mockSubscriptionFreeze: SubscriptionFreeze = {
  id: 'freeze-1',
  subscription_id: 'enrollment-1',
  freeze_reason: 'medical',
  freeze_start_date: '2025-09-15',
  freeze_end_date: '2025-09-30',
  freeze_strategy: 'extend_program',
  impact_analysis: {
    affected_sessions: 4,
    cost_adjustments: { refund_amount: 0, additional_cost: 0 },
    new_end_date: '2025-01-15',
    therapist_impact: { workload_reduction: 4, availability_freed: ['09:00-09:45', '10:00-10:45'] }
  },
  status: 'active',
  created_at: '2025-09-01T10:00:00Z'
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false }
    }
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('Scheduling Workflow Integration Tests', () => {
  let integrationService: SchedulingIntegrationService
  let freezeService: SubscriptionFreezeService
  let modificationService: ProgramModificationService
  let bulkService: BulkReschedulingService

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup service mocks with default return values
    integrationService = new SchedulingIntegrationService()
    freezeService = new SubscriptionFreezeService()
    modificationService = new ProgramModificationService()
    bulkService = new BulkReschedulingService()

    // Default successful responses
    vi.mocked(integrationService.syncWithEnrollmentSystem).mockResolvedValue({
      success: true,
      data: mockStudentEnrollment,
      conflicts: [],
      warnings: []
    })

    vi.mocked(integrationService.validateTherapistAvailability).mockResolvedValue({
      success: true,
      available: true,
      conflicts: [],
      alternative_slots: []
    })

    vi.mocked(integrationService.checkRoomConflicts).mockResolvedValue({
      success: true,
      available: true,
      conflicts: [],
      alternative_rooms: []
    })

    vi.mocked(integrationService.processBillingValidation).mockResolvedValue({
      success: true,
      payment_validated: true,
      billing_conflicts: [],
      cost_breakdown: { base_cost: 100, taxes: 15, total: 115 }
    })

    // Mock successful database responses
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: mockScheduledSessions, error: null }),
      update: vi.fn().mockResolvedValue({ data: mockScheduledSessions[0], error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockScheduledSessions[0], error: null })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('End-to-End Scheduling Workflow', () => {
    it('completes full scheduling workflow from enrollment to session creation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // 1. Verify dashboard loads with existing sessions
      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      // 2. Create new session via scheduling interface
      const createButton = screen.getByRole('button', { name: /create.*session/i })
      await user.click(createButton)

      // 3. Fill in session details
      const sessionForm = screen.getByTestId('session-creation-form')
      expect(sessionForm).toBeInTheDocument()

      const studentSelect = within(sessionForm).getByLabelText(/student/i)
      await user.click(studentSelect)
      await user.click(screen.getByText('Student 1'))

      const dateInput = within(sessionForm).getByLabelText(/date/i)
      await user.clear(dateInput)
      await user.type(dateInput, '2025-09-02')

      const timeInput = within(sessionForm).getByLabelText(/time/i)
      await user.clear(timeInput)
      await user.type(timeInput, '10:00')

      // 4. Submit form and verify integration validations
      const submitButton = within(sessionForm).getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // 5. Verify integration service calls
      await waitFor(() => {
        expect(integrationService.syncWithEnrollmentSystem).toHaveBeenCalled()
        expect(integrationService.validateTherapistAvailability).toHaveBeenCalled()
        expect(integrationService.checkRoomConflicts).toHaveBeenCalled()
        expect(integrationService.processBillingValidation).toHaveBeenCalled()
      })

      // 6. Verify session appears in calendar
      await waitFor(() => {
        expect(screen.getByText('Student 1')).toBeInTheDocument()
        expect(screen.getByText('10:00')).toBeInTheDocument()
      })

      // 7. Verify success notification
      expect(screen.getByText(/session.*created.*successfully/i)).toBeInTheDocument()
    })

    it('handles scheduling conflicts during session creation', async () => {
      // Setup conflict scenario
      vi.mocked(integrationService.validateTherapistAvailability).mockResolvedValue({
        success: false,
        available: false,
        conflicts: [{
          type: 'therapist_busy',
          conflicting_session_id: 'session-existing',
          time_slot: { start: '10:00', end: '10:45' },
          message: 'Therapist already has a session at this time'
        }],
        alternative_slots: [
          { start: '11:00', end: '11:45', therapist_id: 'therapist-1' },
          { start: '14:00', end: '14:45', therapist_id: 'therapist-1' }
        ]
      })

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Attempt to create conflicting session
      const createButton = screen.getByRole('button', { name: /create.*session/i })
      await user.click(createButton)

      const sessionForm = screen.getByTestId('session-creation-form')
      const studentSelect = within(sessionForm).getByLabelText(/student/i)
      await user.click(studentSelect)
      await user.click(screen.getByText('Student 1'))

      const timeInput = within(sessionForm).getByLabelText(/time/i)
      await user.clear(timeInput)
      await user.type(timeInput, '10:00')

      const submitButton = within(sessionForm).getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify conflict detection and alternative suggestions
      await waitFor(() => {
        expect(screen.getByText(/conflict.*detected/i)).toBeInTheDocument()
        expect(screen.getByText(/therapist.*already.*session/i)).toBeInTheDocument()
      })

      // Verify alternative time slots are displayed
      expect(screen.getByText('11:00')).toBeInTheDocument()
      expect(screen.getByText('14:00')).toBeInTheDocument()

      // Select alternative time slot
      const alternativeSlot = screen.getByText('11:00')
      await user.click(alternativeSlot)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Verify session is created with alternative time
      await waitFor(() => {
        expect(screen.getByText('Student 1')).toBeInTheDocument()
        expect(screen.getByText('11:00')).toBeInTheDocument()
      })
    })

    it('processes subscription freeze workflow with automatic rescheduling', async () => {
      vi.mocked(freezeService.freezeSubscription).mockResolvedValue({
        success: true,
        freeze_id: 'freeze-1',
        affected_sessions: [
          { session_id: 'session-1', original_date: '2025-09-15', action: 'reschedule' },
          { session_id: 'session-2', original_date: '2025-09-16', action: 'reschedule' }
        ],
        rescheduling_plan: {
          strategy: 'extend_program',
          new_end_date: '2025-01-15',
          rescheduled_sessions: [
            { session_id: 'session-1', new_date: '2025-10-01' },
            { session_id: 'session-2', new_date: '2025-10-02' }
          ]
        }
      })

      vi.mocked(freezeService.calculateImpactAnalysis).mockResolvedValue({
        affected_sessions: 4,
        cost_impact: { refund_amount: 0, additional_cost: 0 },
        program_extension: { original_end: '2025-12-31', new_end: '2025-01-15' },
        therapist_impact: { freed_slots: 4, workload_reduction: '10%' }
      })

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Navigate to student subscription management
      const manageButton = screen.getByRole('button', { name: /manage.*subscription/i })
      await user.click(manageButton)

      // Select freeze subscription option
      const freezeButton = screen.getByRole('button', { name: /freeze.*subscription/i })
      await user.click(freezeButton)

      // Fill freeze details
      const freezeForm = screen.getByTestId('subscription-freeze-form')
      const reasonSelect = within(freezeForm).getByLabelText(/reason/i)
      await user.click(reasonSelect)
      await user.click(screen.getByText('Medical'))

      const startDateInput = within(freezeForm).getByLabelText(/start.*date/i)
      await user.clear(startDateInput)
      await user.type(startDateInput, '2025-09-15')

      const endDateInput = within(freezeForm).getByLabelText(/end.*date/i)
      await user.clear(endDateInput)
      await user.type(endDateInput, '2025-09-30')

      // Submit freeze request
      const submitFreezeButton = within(freezeForm).getByRole('button', { name: /freeze/i })
      await user.click(submitFreezeButton)

      // Verify impact analysis display
      await waitFor(() => {
        expect(screen.getByText(/impact.*analysis/i)).toBeInTheDocument()
        expect(screen.getByText(/4.*sessions.*affected/i)).toBeInTheDocument()
        expect(screen.getByText(/extend.*program/i)).toBeInTheDocument()
      })

      // Confirm freeze with rescheduling
      const confirmFreezeButton = screen.getByRole('button', { name: /confirm.*freeze/i })
      await user.click(confirmFreezeButton)

      // Verify service calls
      await waitFor(() => {
        expect(freezeService.calculateImpactAnalysis).toHaveBeenCalled()
        expect(freezeService.freezeSubscription).toHaveBeenCalled()
      })

      // Verify success notification and updated schedule
      expect(screen.getByText(/subscription.*frozen.*successfully/i)).toBeInTheDocument()
      expect(screen.getByText(/sessions.*rescheduled/i)).toBeInTheDocument()
    })

    it('handles bulk rescheduling operations with progress tracking', async () => {
      const mockBulkOperation: BulkReschedulingOperation = {
        id: 'bulk-op-1',
        operation_type: 'reschedule_range',
        parameters: {
          date_range: { start: '2025-09-15', end: '2025-09-20' },
          new_date_range: { start: '2025-10-01', end: '2025-10-06' },
          affected_session_ids: ['session-1', 'session-2', 'session-3']
        },
        status: 'in_progress',
        progress: {
          total_sessions: 3,
          processed: 0,
          successful: 0,
          failed: 0,
          conflicts: []
        },
        created_at: '2025-09-01T10:00:00Z'
      }

      vi.mocked(bulkService.processBulkOperation).mockResolvedValue({
        success: true,
        operation_id: 'bulk-op-1',
        progress: {
          total_sessions: 3,
          processed: 3,
          successful: 3,
          failed: 0,
          conflicts: []
        }
      })

      vi.mocked(bulkService.trackProgress).mockResolvedValue({
        operation_id: 'bulk-op-1',
        status: 'completed',
        progress: {
          total_sessions: 3,
          processed: 3,
          successful: 3,
          failed: 0,
          conflicts: []
        },
        estimated_completion: null
      })

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <BulkReschedulingManager />
        </TestWrapper>
      )

      // Select bulk reschedule operation
      const bulkButton = screen.getByRole('button', { name: /bulk.*reschedule/i })
      await user.click(bulkButton)

      // Configure bulk operation
      const bulkForm = screen.getByTestId('bulk-reschedule-form')
      const operationSelect = within(bulkForm).getByLabelText(/operation.*type/i)
      await user.click(operationSelect)
      await user.click(screen.getByText('Reschedule Date Range'))

      const fromDateInput = within(bulkForm).getByLabelText(/from.*date/i)
      await user.clear(fromDateInput)
      await user.type(fromDateInput, '2025-09-15')

      const toDateInput = within(bulkForm).getByLabelText(/to.*date/i)
      await user.clear(toDateInput)
      await user.type(toDateInput, '2025-09-20')

      const newFromDateInput = within(bulkForm).getByLabelText(/new.*from.*date/i)
      await user.clear(newFromDateInput)
      await user.type(newFromDateInput, '2025-10-01')

      // Submit bulk operation
      const submitBulkButton = within(bulkForm).getByRole('button', { name: /start.*bulk/i })
      await user.click(submitBulkButton)

      // Verify progress tracking display
      await waitFor(() => {
        expect(screen.getByText(/bulk.*operation.*progress/i)).toBeInTheDocument()
        expect(screen.getByText(/3.*sessions/i)).toBeInTheDocument()
      })

      // Wait for operation completion
      await waitFor(() => {
        expect(screen.getByText(/operation.*completed/i)).toBeInTheDocument()
        expect(screen.getByText(/3.*successful/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify service calls
      expect(bulkService.processBulkOperation).toHaveBeenCalled()
      expect(bulkService.trackProgress).toHaveBeenCalled()
    })

    it('validates program modification impact across multiple systems', async () => {
      const mockModification: ProgramModification = {
        id: 'modification-1',
        enrollment_id: 'enrollment-1',
        modification_type: 'increase_frequency',
        current_parameters: { sessions_per_week: 2, session_duration: 45 },
        new_parameters: { sessions_per_week: 3, session_duration: 45 },
        effective_date: '2025-10-01',
        impact_analysis: {
          cost_implications: {
            additional_cost: 200,
            payment_plan_adjustment: true,
            billing_cycle_change: false
          },
          scheduling_impact: {
            additional_sessions_needed: 4,
            therapist_capacity_check: 'sufficient',
            room_availability: 'available'
          },
          therapist_workload: {
            current_load: 85,
            new_load: 95,
            capacity_status: 'within_limits'
          }
        },
        status: 'pending_approval',
        created_at: '2025-09-01T10:00:00Z'
      }

      vi.mocked(modificationService.analyzeModificationImpact).mockResolvedValue({
        success: true,
        impact: mockModification.impact_analysis,
        recommendations: [
          'Consider therapist workload distribution',
          'Update billing cycle for next period',
          'Reserve additional room slots'
        ],
        risks: [
          'High therapist utilization may affect quality'
        ]
      })

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      // Navigate to program modification
      const modifyButton = screen.getByRole('button', { name: /modify.*program/i })
      await user.click(modifyButton)

      // Select modification type
      const modificationForm = screen.getByTestId('program-modification-form')
      const typeSelect = within(modificationForm).getByLabelText(/modification.*type/i)
      await user.click(typeSelect)
      await user.click(screen.getByText('Increase Frequency'))

      // Set new parameters
      const frequencyInput = within(modificationForm).getByLabelText(/sessions.*per.*week/i)
      await user.clear(frequencyInput)
      await user.type(frequencyInput, '3')

      const effectiveDateInput = within(modificationForm).getByLabelText(/effective.*date/i)
      await user.clear(effectiveDateInput)
      await user.type(effectiveDateInput, '2025-10-01')

      // Analyze impact
      const analyzeButton = within(modificationForm).getByRole('button', { name: /analyze.*impact/i })
      await user.click(analyzeButton)

      // Verify impact analysis display
      await waitFor(() => {
        expect(screen.getByText(/impact.*analysis/i)).toBeInTheDocument()
        expect(screen.getByText(/additional.*cost.*200/i)).toBeInTheDocument()
        expect(screen.getByText(/4.*additional.*sessions/i)).toBeInTheDocument()
        expect(screen.getByText(/therapist.*capacity.*sufficient/i)).toBeInTheDocument()
      })

      // Verify recommendations and risks
      expect(screen.getByText(/consider.*therapist.*workload/i)).toBeInTheDocument()
      expect(screen.getByText(/high.*therapist.*utilization/i)).toBeInTheDocument()

      // Confirm modification
      const confirmButton = screen.getByRole('button', { name: /confirm.*modification/i })
      await user.click(confirmButton)

      // Verify service calls
      expect(modificationService.analyzeModificationImpact).toHaveBeenCalled()
      expect(screen.getByText(/modification.*submitted/i)).toBeInTheDocument()
    })
  })

  describe('Bilingual Workflow Support', () => {
    it('handles complete scheduling workflow in Arabic RTL', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <I18nProvider initialLanguage="ar">
            <SchedulingDashboard />
          </I18nProvider>
        </TestWrapper>
      )

      // Verify Arabic RTL layout
      const dashboard = screen.getByTestId('scheduling-dashboard')
      expect(dashboard).toHaveAttribute('dir', 'rtl')

      // Create session with Arabic interface
      const createButton = screen.getByRole('button', { name: /إنشاء.*جلسة/i })
      await user.click(createButton)

      const sessionForm = screen.getByTestId('session-creation-form')
      expect(sessionForm).toHaveAttribute('dir', 'rtl')

      // Verify Arabic labels and validation messages
      expect(screen.getByLabelText(/الطالب/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/التاريخ/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/الوقت/i)).toBeInTheDocument()

      // Test form validation with Arabic error messages
      const submitButton = within(sessionForm).getByRole('button', { name: /إنشاء/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/هذا الحقل مطلوب/i)).toBeInTheDocument()
      })
    })

    it('handles freeze workflow in English LTR with proper formatting', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <I18nProvider initialLanguage="en">
            <SchedulingDashboard />
          </I18nProvider>
        </TestWrapper>
      )

      // Verify English LTR layout
      const dashboard = screen.getByTestId('scheduling-dashboard')
      expect(dashboard).toHaveAttribute('dir', 'ltr')

      // Navigate to freeze functionality
      const manageButton = screen.getByRole('button', { name: /manage subscription/i })
      await user.click(manageButton)

      const freezeButton = screen.getByRole('button', { name: /freeze subscription/i })
      await user.click(freezeButton)

      const freezeForm = screen.getByTestId('subscription-freeze-form')
      expect(freezeForm).toHaveAttribute('dir', 'ltr')

      // Verify English labels and formatting
      expect(screen.getByLabelText(/freeze reason/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('handles network failures during scheduling operations', async () => {
      // Setup network failure scenario
      vi.mocked(integrationService.syncWithEnrollmentSystem).mockRejectedValue(
        new Error('Network Error: Unable to connect to enrollment system')
      )

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      const createButton = screen.getByRole('button', { name: /create.*session/i })
      await user.click(createButton)

      const sessionForm = screen.getByTestId('session-creation-form')
      const studentSelect = within(sessionForm).getByLabelText(/student/i)
      await user.click(studentSelect)
      await user.click(screen.getByText('Student 1'))

      const submitButton = within(sessionForm).getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/network.*error/i)).toBeInTheDocument()
        expect(screen.getByText(/unable.*connect.*enrollment/i)).toBeInTheDocument()
      })

      // Verify retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()

      // Test retry functionality
      vi.mocked(integrationService.syncWithEnrollmentSystem).mockResolvedValue({
        success: true,
        data: mockStudentEnrollment,
        conflicts: [],
        warnings: []
      })

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/session.*created.*successfully/i)).toBeInTheDocument()
      })
    })

    it('handles partial failure during bulk operations with rollback', async () => {
      // Setup partial failure scenario
      vi.mocked(bulkService.processBulkOperation).mockResolvedValue({
        success: false,
        operation_id: 'bulk-op-1',
        progress: {
          total_sessions: 5,
          processed: 3,
          successful: 2,
          failed: 1,
          conflicts: [{
            session_id: 'session-3',
            error: 'Therapist unavailable',
            recommended_action: 'manual_reschedule'
          }]
        }
      })

      vi.mocked(bulkService.rollbackChanges).mockResolvedValue({
        success: true,
        rolled_back_sessions: ['session-1', 'session-2'],
        rollback_summary: 'Successfully reverted 2 sessions to original state'
      })

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <BulkReschedulingManager />
        </TestWrapper>
      )

      // Start bulk operation
      const bulkButton = screen.getByRole('button', { name: /bulk.*reschedule/i })
      await user.click(bulkButton)

      const bulkForm = screen.getByTestId('bulk-reschedule-form')
      const submitBulkButton = within(bulkForm).getByRole('button', { name: /start.*bulk/i })
      await user.click(submitBulkButton)

      // Verify partial failure handling
      await waitFor(() => {
        expect(screen.getByText(/partial.*failure/i)).toBeInTheDocument()
        expect(screen.getByText(/2.*successful.*1.*failed/i)).toBeInTheDocument()
        expect(screen.getByText(/therapist.*unavailable/i)).toBeInTheDocument()
      })

      // Test rollback functionality
      const rollbackButton = screen.getByRole('button', { name: /rollback/i })
      await user.click(rollbackButton)

      await waitFor(() => {
        expect(screen.getByText(/rollback.*completed/i)).toBeInTheDocument()
        expect(screen.getByText(/reverted.*2.*sessions/i)).toBeInTheDocument()
      })

      expect(bulkService.rollbackChanges).toHaveBeenCalled()
    })
  })

  describe('Performance and Accessibility', () => {
    it('maintains performance standards during large dataset operations', async () => {
      // Mock large dataset
      const largeSessions = Array.from({ length: 500 }, (_, i) => ({
        ...mockScheduledSessions[0],
        id: `session-${i + 1}`,
        session_date: `2025-09-${String(i % 28 + 1).padStart(2, '0')}`,
        start_time: `${String(9 + (i % 8))}:00`
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: largeSessions, error: null }),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: largeSessions[0], error: null })
      })

      const startTime = performance.now()

      render(
        <TestWrapper>
          <SchedulingDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('scheduling-dashboard')).toBeInTheDocument()
      })

      const loadTime = performance.now() - startTime

      // Verify performance target (< 2 seconds for large datasets)
      expect(loadTime).toBeLessThan(2000)

      // Verify virtualization for large lists
      const sessionsList = screen.getByTestId('sessions-list')
      expect(sessionsList).toBeInTheDocument()
      
      // Should not render all 500 sessions at once (virtualization)
      const renderedSessions = screen.getAllByTestId(/session-item-/)
      expect(renderedSessions.length).toBeLessThan(100) // Virtual scrolling should limit rendered items
    })

    it('meets accessibility standards for Arabic RTL scheduling interface', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <I18nProvider initialLanguage="ar">
            <SchedulingDashboard />
          </I18nProvider>
        </TestWrapper>
      )

      // Verify ARIA labels in Arabic
      const dashboard = screen.getByTestId('scheduling-dashboard')
      expect(dashboard).toHaveAttribute('aria-label', expect.stringMatching(/لوحة.*الجدولة/i))

      // Verify keyboard navigation
      const createButton = screen.getByRole('button', { name: /إنشاء.*جلسة/i })
      createButton.focus()
      expect(document.activeElement).toBe(createButton)

      // Navigate with keyboard
      await user.keyboard('{Tab}')
      const nextFocusableElement = document.activeElement
      expect(nextFocusableElement).toBeInstanceOf(HTMLElement)

      // Verify focus management in forms
      await user.click(createButton)
      const sessionForm = screen.getByTestId('session-creation-form')
      
      const firstInput = within(sessionForm).getAllByRole('textbox')[0]
      expect(firstInput).toHaveFocus()

      // Verify color contrast and screen reader support
      expect(dashboard).toHaveAttribute('role', 'main')
      
      // Check for proper heading hierarchy
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()

      // Verify proper ARIA relationships
      const sessionsList = screen.getByTestId('sessions-list')
      expect(sessionsList).toHaveAttribute('aria-live', 'polite')
    })
  })
})