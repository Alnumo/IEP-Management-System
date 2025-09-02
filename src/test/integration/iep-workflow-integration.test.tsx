/**
 * Comprehensive Integration Tests for IEP Workflows
 * Tests complete end-to-end IEP management workflows including creation, goal management, and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

// Import components for integration testing
import { IEPCreationWizard } from '@/components/iep/IEPCreationWizard'
import { IEPGoalAnalytics } from '@/components/iep/IEPGoalAnalytics'
import { IEPAnalyticsDashboard } from '@/components/analytics/IEPAnalyticsDashboard'
import { ServiceHourTracking } from '@/components/iep/ServiceHourTracking'
import { ComplianceAlertDashboard } from '@/components/iep/ComplianceAlertDashboard'

// Import services and hooks
import { supabase } from '@/lib/supabase'
import { analyticsService } from '@/services/analytics-service'
import { IEPGoalCalculationsService } from '@/services/iep-goal-calculations'
import { LanguageProvider } from '@/contexts/LanguageContext'

import type { 
  IEPDocument, 
  IEPGoal, 
  StudentProgressSummary,
  ServiceDeliverySession,
  ComplianceAlert
} from '@/types/iep'

// Mock external dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    }
  }
}))

vi.mock('@/services/analytics-service')
vi.mock('@/services/iep-goal-calculations')
vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn()
  }
}))

// Test data factories
const createMockIEP = (overrides: Partial<IEPDocument> = {}): IEPDocument => ({
  id: 'iep-1',
  student_id: 'student-1',
  document_number: 'IEP-2024-001',
  academic_year: '2024-2025',
  effective_date: '2024-01-15',
  next_review_date: '2025-01-15',
  status: 'active',
  student_info: {
    first_name_ar: 'أحمد',
    last_name_ar: 'محمد',
    first_name_en: 'Ahmed',
    last_name_en: 'Mohammed',
    date_of_birth: '2010-05-15',
    grade_level: 'Grade 8',
    primary_language: 'Arabic',
    diagnosis: ['Autism Spectrum Disorder']
  },
  team_members: [
    {
      id: 'member-1',
      name: 'Dr. Sarah Ahmed',
      role: 'Special Education Teacher',
      email: 'sarah.ahmed@example.com'
    }
  ],
  goals: [],
  services: [],
  accommodations: [],
  modifications: [],
  transition_plan: null,
  behavior_plan: null,
  assessment_data: [],
  meeting_notes: [],
  signatures: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'therapist-1',
  version: 1,
  ...overrides
})

const createMockGoal = (overrides: Partial<IEPGoal> = {}): IEPGoal => ({
  id: 'goal-1',
  student_id: 'student-1',
  goal_statement: 'Student will improve reading comprehension by identifying main ideas in grade-level texts with 80% accuracy',
  domain: 'academic',
  measurement_type: 'percentage',
  baseline_value: 30,
  current_value: 55,
  target_value: 80,
  target_date: '2024-12-31',
  status: 'in_progress',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  created_by: 'therapist-1',
  ...overrides
})

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('IEP Workflow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  
  beforeAll(() => {
    // Setup global mocks
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    })
  })

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()

    // Setup default Supabase mocks
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    } as any)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Complete IEP Creation Workflow', () => {
    it('should create a complete IEP from start to finish', async () => {
      // Mock student data
      const mockStudent = {
        id: 'student-1',
        first_name_ar: 'أحمد',
        last_name_ar: 'محمد',
        first_name_en: 'Ahmed',
        last_name_en: 'Mohammed',
        date_of_birth: '2010-05-15',
        grade_level: 'Grade 8'
      }

      // Mock successful database operations
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          order: vi.fn().mockReturnThis()
        }

        if (table === 'students') {
          mockChain.single = vi.fn().mockResolvedValue({ data: mockStudent, error: null })
        } else if (table === 'iep_documents') {
          const mockIEP = createMockIEP({ student_id: 'student-1' })
          mockChain.single = vi.fn().mockResolvedValue({ data: mockIEP, error: null })
        } else if (table === 'therapists') {
          mockChain.order = vi.fn().mockResolvedValue({
            data: [
              { id: 'therapist-1', name: 'Dr. Sarah Ahmed', specialization: 'Speech Therapy' }
            ],
            error: null
          })
        }

        return mockChain as any
      })

      render(
        <TestWrapper>
          <IEPCreationWizard studentId="student-1" />
        </TestWrapper>
      )

      // Step 1: Student Information
      await waitFor(() => {
        expect(screen.getByText(/student information/i)).toBeInTheDocument()
      })

      // Verify student information is loaded and displayed
      expect(screen.getByDisplayValue('أحمد محمد')).toBeInTheDocument()
      
      // Navigate to next step
      const nextButton = screen.getByText(/next/i)
      await user.click(nextButton)

      // Step 2: Team Members
      await waitFor(() => {
        expect(screen.getByText(/team members/i)).toBeInTheDocument()
      })

      // Add a team member
      const addMemberButton = screen.getByText(/add member/i)
      await user.click(addMemberButton)

      const nameInput = screen.getByLabelText(/name/i)
      await user.type(nameInput, 'Dr. Sarah Ahmed')

      const roleSelect = screen.getByLabelText(/role/i)
      await user.selectOptions(roleSelect, 'special_education_teacher')

      const saveMemberButton = screen.getByText(/save member/i)
      await user.click(saveMemberButton)

      // Navigate to next step
      await user.click(screen.getByText(/next/i))

      // Step 3: Goals
      await waitFor(() => {
        expect(screen.getByText(/goals/i)).toBeInTheDocument()
      })

      // Add a goal
      const addGoalButton = screen.getByText(/add goal/i)
      await user.click(addGoalButton)

      const goalStatement = screen.getByLabelText(/goal statement/i)
      await user.type(goalStatement, 'Student will improve reading comprehension')

      const domainSelect = screen.getByLabelText(/domain/i)
      await user.selectOptions(domainSelect, 'academic')

      const baselineValue = screen.getByLabelText(/baseline value/i)
      await user.clear(baselineValue)
      await user.type(baselineValue, '30')

      const targetValue = screen.getByLabelText(/target value/i)
      await user.clear(targetValue)
      await user.type(targetValue, '80')

      const saveGoalButton = screen.getByText(/save goal/i)
      await user.click(saveGoalButton)

      // Navigate to next step
      await user.click(screen.getByText(/next/i))

      // Step 4: Services
      await waitFor(() => {
        expect(screen.getByText(/services/i)).toBeInTheDocument()
      })

      // Add a service
      const addServiceButton = screen.getByText(/add service/i)
      await user.click(addServiceButton)

      const serviceType = screen.getByLabelText(/service type/i)
      await user.selectOptions(serviceType, 'speech_therapy')

      const frequencyInput = screen.getByLabelText(/frequency/i)
      await user.clear(frequencyInput)
      await user.type(frequencyInput, '2')

      const durationInput = screen.getByLabelText(/duration/i)
      await user.clear(durationInput)
      await user.type(durationInput, '45')

      const saveServiceButton = screen.getByText(/save service/i)
      await user.click(saveServiceButton)

      // Navigate to final step
      await user.click(screen.getByText(/next/i))

      // Step 5: Review and Submit
      await waitFor(() => {
        expect(screen.getByText(/review/i)).toBeInTheDocument()
      })

      // Verify all information is displayed correctly
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
      expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument()
      expect(screen.getByText(/reading comprehension/i)).toBeInTheDocument()
      expect(screen.getByText(/speech therapy/i)).toBeInTheDocument()

      // Submit the IEP
      const submitButton = screen.getByText(/create iep/i)
      await user.click(submitButton)

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/iep created successfully/i)).toBeInTheDocument()
      })

      // Verify database operations were called
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('iep_documents')
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('iep_goals')
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('iep_services')
    })

    it('should handle validation errors during IEP creation', async () => {
      render(
        <TestWrapper>
          <IEPCreationWizard studentId="student-1" />
        </TestWrapper>
      )

      // Try to proceed without filling required fields
      await waitFor(() => {
        expect(screen.getByText(/next/i)).toBeInTheDocument()
      })

      const nextButton = screen.getByText(/next/i)
      await user.click(nextButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/required field/i)).toBeInTheDocument()
      })
    })
  })

  describe('Goal Management and Progress Tracking Workflow', () => {
    it('should track goal progress from creation to mastery', async () => {
      const mockGoal = createMockGoal()
      const mockProgressData = [
        { date: '2024-01-01', value: 30, session_id: 'session-1' },
        { date: '2024-01-15', value: 45, session_id: 'session-2' },
        { date: '2024-02-01', value: 55, session_id: 'session-3' }
      ]

      const mockAnalytics = {
        goal_metrics: [{
          goal_id: 'goal-1',
          goal_name: mockGoal.goal_statement,
          therapy_type: 'academic',
          baseline_value: 30,
          current_value: 55,
          target_value: 80,
          progress_percentage: 50,
          trend: 'improving' as const,
          velocity: 2.5,
          data_points: mockProgressData,
          milestones_achieved: [],
          projected_completion_date: '2024-12-15',
          status: 'in_progress' as const
        }]
      }

      // Mock calculations service
      const mockCalculationsService = vi.mocked(IEPGoalCalculationsService.getInstance())
      mockCalculationsService.calculateProgressPercentage.mockReturnValue(50)
      mockCalculationsService.calculateVelocity.mockReturnValue(2.5)
      mockCalculationsService.calculateTrend.mockReturnValue({
        direction: 'improving',
        confidence: 0.8,
        slope: 1.2
      })

      // Mock database responses
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'iep_goals') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockGoal, error: null })
          } as any
        } else if (table === 'goal_progress_data') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockProgressData, error: null })
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        } as any
      })

      render(
        <TestWrapper>
          <IEPGoalAnalytics 
            studentId="student-1"
            goals={[mockGoal]}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for goal analytics to load
      await waitFor(() => {
        expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
      })

      // Verify progress display
      expect(screen.getByText('50%')).toBeInTheDocument() // Progress percentage
      expect(screen.getByText(/improving/i)).toBeInTheDocument() // Trend
      
      // Check for velocity display
      expect(screen.getByText(/2.5/)).toBeInTheDocument() // Velocity

      // Verify progress chart is rendered
      const progressChart = screen.getByTestId('goal-progress-chart')
      expect(progressChart).toBeInTheDocument()

      // Test updating progress
      const updateButton = screen.getByText(/update progress/i)
      await user.click(updateButton)

      const newValueInput = screen.getByLabelText(/current value/i)
      await user.clear(newValueInput)
      await user.type(newValueInput, '65')

      const saveButton = screen.getByText(/save/i)
      await user.click(saveButton)

      // Verify update was processed
      await waitFor(() => {
        expect(mockCalculationsService.calculateProgressPercentage).toHaveBeenCalled()
      })
    })

    it('should generate and display mastery predictions', async () => {
      const mockGoal = createMockGoal()
      const mockPrediction = {
        predicted_mastery_date: '2024-10-15',
        confidence_level: 0.85,
        probability_of_success: 0.92,
        risk_factors: [],
        recommendations: ['Continue current intervention strategy'],
        predicted_values: [60, 65, 70, 75, 80],
        confidence_intervals: [
          { lower: 55, upper: 65 },
          { lower: 60, upper: 70 },
          { lower: 65, upper: 75 },
          { lower: 70, upper: 80 },
          { lower: 75, upper: 85 }
        ],
        influencing_factors: [
          { factor: 'Consistent attendance', impact: 0.3, direction: 'positive' as const }
        ]
      }

      const mockCalculationsService = vi.mocked(IEPGoalCalculationsService.getInstance())
      mockCalculationsService.predictMastery.mockResolvedValue(mockPrediction)

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'iep_goals') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockGoal, error: null })
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        } as any
      })

      render(
        <TestWrapper>
          <IEPGoalAnalytics 
            studentId="student-1"
            goals={[mockGoal]}
            language="en"
          />
        </TestWrapper>
      )

      // Click on predictions tab
      const predictionsTab = screen.getByText(/predictions/i)
      await user.click(predictionsTab)

      // Wait for prediction to load
      await waitFor(() => {
        expect(screen.getByText(/2024-10-15/)).toBeInTheDocument()
      })

      // Verify prediction details
      expect(screen.getByText(/85%/)).toBeInTheDocument() // Confidence level
      expect(screen.getByText(/92%/)).toBeInTheDocument() // Success probability
      expect(screen.getByText(/consistent attendance/i)).toBeInTheDocument()
    })
  })

  describe('Service Delivery and Compliance Workflow', () => {
    it('should track service hours and compliance status', async () => {
      const mockServiceSessions: ServiceDeliverySession[] = [
        {
          id: 'session-1',
          student_id: 'student-1',
          service_type: 'speech_therapy',
          scheduled_date: '2024-01-15',
          scheduled_duration: 45,
          actual_date: '2024-01-15',
          actual_duration: 45,
          status: 'completed',
          therapist_id: 'therapist-1',
          notes: 'Good progress on articulation',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z'
        },
        {
          id: 'session-2',
          student_id: 'student-1',
          service_type: 'speech_therapy',
          scheduled_date: '2024-01-22',
          scheduled_duration: 45,
          actual_date: null,
          actual_duration: null,
          status: 'cancelled',
          therapist_id: 'therapist-1',
          notes: 'Student absent',
          created_at: '2024-01-22T00:00:00Z',
          updated_at: '2024-01-22T00:00:00Z'
        }
      ]

      const mockComplianceAlerts: ComplianceAlert[] = [
        {
          id: 'alert-1',
          student_id: 'student-1',
          alert_type: 'service_hours_low',
          severity: 'medium',
          title: 'Service Hours Below Threshold',
          description: 'Student has received only 80% of required service hours this month',
          created_at: '2024-01-20T00:00:00Z',
          status: 'active',
          due_date: '2024-01-31'
        }
      ]

      // Mock database responses
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'service_delivery_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ 
              data: mockServiceSessions, 
              error: null 
            })
          } as any
        } else if (table === 'service_compliance_alerts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ 
              data: mockComplianceAlerts, 
              error: null 
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        } as any
      })

      render(
        <TestWrapper>
          <ServiceHourTracking 
            studentId="student-1"
            language="en"
          />
        </TestWrapper>
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/service hour tracking/i)).toBeInTheDocument()
      })

      // Verify sessions are displayed
      expect(screen.getByText(/speech therapy/i)).toBeInTheDocument()
      expect(screen.getByText(/completed/i)).toBeInTheDocument()
      expect(screen.getByText(/cancelled/i)).toBeInTheDocument()

      // Check compliance calculation
      expect(screen.getByText(/80%/)).toBeInTheDocument() // Compliance rate

      // Test adding a makeup session
      const addMakeupButton = screen.getByText(/add makeup session/i)
      await user.click(addMakeupButton)

      const dateInput = screen.getByLabelText(/date/i)
      await user.type(dateInput, '2024-01-29')

      const durationInput = screen.getByLabelText(/duration/i)
      await user.clear(durationInput)
      await user.type(durationInput, '45')

      const saveSessionButton = screen.getByText(/save session/i)
      await user.click(saveSessionButton)

      // Verify session was added
      await waitFor(() => {
        expect(screen.getByText(/makeup session added/i)).toBeInTheDocument()
      })
    })

    it('should display and manage compliance alerts', async () => {
      const mockAlerts: ComplianceAlert[] = [
        {
          id: 'alert-1',
          student_id: 'student-1',
          alert_type: 'iep_review_due',
          severity: 'high',
          title: 'IEP Review Due Soon',
          description: 'Annual IEP review is due within 30 days',
          created_at: '2024-01-15T00:00:00Z',
          status: 'active',
          due_date: '2024-02-15'
        },
        {
          id: 'alert-2',
          student_id: 'student-1', 
          alert_type: 'goal_progress_slow',
          severity: 'medium',
          title: 'Goal Progress Below Expected',
          description: 'Reading comprehension goal progress is slower than projected',
          created_at: '2024-01-10T00:00:00Z',
          status: 'active',
          due_date: '2024-02-01'
        }
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'service_compliance_alerts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ 
              data: mockAlerts, 
              error: null 
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        } as any
      })

      render(
        <TestWrapper>
          <ComplianceAlertDashboard 
            studentId="student-1"
            language="en"
          />
        </TestWrapper>
      )

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText(/compliance alerts/i)).toBeInTheDocument()
      })

      // Verify alerts are displayed
      expect(screen.getByText(/iep review due soon/i)).toBeInTheDocument()
      expect(screen.getByText(/goal progress below expected/i)).toBeInTheDocument()

      // Check severity indicators
      expect(screen.getByText(/high/i)).toBeInTheDocument()
      expect(screen.getByText(/medium/i)).toBeInTheDocument()

      // Test resolving an alert
      const resolveButtons = screen.getAllByText(/resolve/i)
      await user.click(resolveButtons[0])

      const resolutionNotes = screen.getByLabelText(/resolution notes/i)
      await user.type(resolutionNotes, 'IEP review scheduled for next week')

      const confirmButton = screen.getByText(/confirm resolution/i)
      await user.click(confirmButton)

      // Verify alert was resolved
      await waitFor(() => {
        expect(screen.getByText(/alert resolved/i)).toBeInTheDocument()
      })
    })
  })

  describe('Analytics and Reporting Workflow', () => {
    it('should display comprehensive analytics dashboard', async () => {
      const mockProgressSummary: StudentProgressSummary = {
        student_id: 'student-1',
        student_name: 'أحمد محمد',
        assessment_period: {
          start_date: '2024-01-01',
          end_date: '2024-03-31'
        },
        overall_progress_score: 78,
        therapy_domains: [
          {
            domain: 'academic',
            progress_percentage: 75,
            trend: 'improving',
            velocity: 2.3,
            goals_count: 3,
            mastered_goals: 1
          }
        ],
        goal_metrics: [
          {
            goal_id: 'goal-1',
            goal_name: 'Reading comprehension',
            therapy_type: 'academic',
            baseline_value: 30,
            current_value: 65,
            target_value: 80,
            progress_percentage: 70,
            trend: 'improving',
            velocity: 2.5,
            data_points: [],
            milestones_achieved: [],
            projected_completion_date: '2024-11-15',
            status: 'in_progress'
          }
        ],
        session_attendance: {
          total_scheduled_sessions: 24,
          attended_sessions: 22,
          cancelled_sessions: 1,
          makeup_sessions: 2,
          attendance_percentage: 92,
          consistency_score: 88,
          attendance_trend: 'improving',
          monthly_breakdown: []
        },
        behavioral_trends: [],
        skill_acquisition_rate: 82,
        recommendations: [
          'Continue current reading intervention',
          'Consider advanced comprehension strategies'
        ],
        next_review_date: '2024-04-15'
      }

      const mockAnalyticsService = vi.mocked(analyticsService)
      mockAnalyticsService.getStudentProgressSummary.mockResolvedValue(mockProgressSummary)
      mockAnalyticsService.getDashboardKPIs.mockResolvedValue([
        {
          id: 'kpi-1',
          title_ar: 'نسبة التقدم الإجمالية',
          title_en: 'Overall Progress Rate',
          value: 78,
          previous_value: 72,
          change_percentage: 8.3,
          trend_direction: 'up',
          format: 'percentage',
          color: 'green',
          icon: 'trending-up',
          description_ar: 'التقدم الإجمالي للطالب',
          description_en: 'Student overall progress',
          last_updated: '2024-01-31T00:00:00Z'
        }
      ])

      render(
        <TestWrapper>
          <IEPAnalyticsDashboard 
            studentId="student-1"
            dateRange={{
              start: '2024-01-01',
              end: '2024-03-31'
            }}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/iep analytics dashboard/i)).toBeInTheDocument()
      })

      // Verify KPIs are displayed
      expect(screen.getByText('78%')).toBeInTheDocument()
      expect(screen.getByText(/8.3%/)).toBeInTheDocument() // Change percentage

      // Verify different tabs are available
      expect(screen.getByText(/overview/i)).toBeInTheDocument()
      expect(screen.getByText(/progress/i)).toBeInTheDocument()
      expect(screen.getByText(/compliance/i)).toBeInTheDocument()

      // Test switching tabs
      const progressTab = screen.getByText(/progress/i)
      await user.click(progressTab)

      await waitFor(() => {
        expect(screen.getByText(/detailed goal analysis/i)).toBeInTheDocument()
      })

      // Verify goal progress is displayed
      expect(screen.getByText(/reading comprehension/i)).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument() // Goal progress

      // Test export functionality
      const exportButton = screen.getByText(/export/i)
      await user.click(exportButton)

      const pdfOption = screen.getByText(/pdf/i)
      await user.click(pdfOption)

      // Verify export was initiated
      await waitFor(() => {
        expect(screen.getByText(/exporting/i)).toBeInTheDocument()
      })
    })
  })

  describe('Multi-language Support Workflow', () => {
    it('should switch between Arabic and English correctly', async () => {
      const mockGoal = createMockGoal({
        goal_statement: 'تحسين مهارات القراءة والفهم',
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockGoal], error: null })
      } as any)

      render(
        <TestWrapper>
          <IEPGoalAnalytics 
            studentId="student-1"
            goals={[mockGoal]}
            language="ar"
          />
        </TestWrapper>
      )

      // Wait for Arabic content to load
      await waitFor(() => {
        expect(screen.getByText(/تحليل الأهداف/)).toBeInTheDocument()
      })

      // Verify Arabic goal text is displayed
      expect(screen.getByText(/تحسين مهارات القراءة والفهم/)).toBeInTheDocument()

      // Test language switching
      const languageToggle = screen.getByLabelText(/language toggle/i)
      await user.click(languageToggle)

      // Verify switch to English
      await waitFor(() => {
        expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
      })
    })

    it('should display RTL layout correctly for Arabic content', async () => {
      render(
        <TestWrapper>
          <IEPAnalyticsDashboard 
            studentId="student-1"
            language="ar"
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/لوحة تحليلات البرامج التعليمية الفردية/)).toBeInTheDocument()
      })

      // Check that container has RTL direction
      const dashboard = screen.getByText(/لوحة تحليلات البرامج التعليمية الفردية/).closest('div')
      expect(dashboard).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('Error Handling and Recovery Workflow', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error('Network error'))
      } as any)

      render(
        <TestWrapper>
          <IEPGoalAnalytics 
            studentId="student-1"
            goals={[]}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument()
      })

      // Test retry functionality
      const retryButton = screen.getByText(/retry/i)
      await user.click(retryButton)

      // Verify retry was attempted
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(4) // Initial + retry calls
    })

    it('should validate data integrity during operations', async () => {
      const invalidGoal = {
        id: 'invalid-goal',
        student_id: '',  // Invalid: empty student ID
        goal_statement: '',  // Invalid: empty statement
        target_value: -10  // Invalid: negative target
      }

      render(
        <TestWrapper>
          <IEPCreationWizard studentId="student-1" />
        </TestWrapper>
      )

      // Try to create invalid goal
      await waitFor(() => {
        expect(screen.getByText(/goals/i)).toBeInTheDocument()
      })

      // Navigate to goals step
      const nextButtons = screen.getAllByText(/next/i)
      for (const button of nextButtons) {
        await user.click(button)
      }

      // Add invalid goal data
      const addGoalButton = screen.getByText(/add goal/i)
      await user.click(addGoalButton)

      // Submit with empty fields
      const saveGoalButton = screen.getByText(/save goal/i)
      await user.click(saveGoalButton)

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/goal statement is required/i)).toBeInTheDocument()
      })
    })
  })
})

describe('Performance Integration Tests', () => {
  it('should handle large datasets efficiently', async () => {
    // Create 100 mock goals
    const largeGoalSet = Array.from({ length: 100 }, (_, i) => 
      createMockGoal({ id: `goal-${i}`, goal_statement: `Goal ${i}` })
    )

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: largeGoalSet, error: null })
    } as any)

    const startTime = performance.now()

    render(
      <TestWrapper>
        <IEPGoalAnalytics 
          studentId="student-1"
          goals={largeGoalSet}
          language="en"
        />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    const endTime = performance.now()
    
    // Should render within reasonable time (less than 2 seconds)
    expect(endTime - startTime).toBeLessThan(2000)
    
    // Verify all goals are displayed or properly paginated
    expect(screen.getByText(/100 goals/i) || screen.getByText(/page 1/i)).toBeInTheDocument()
  })

  it('should optimize re-renders during data updates', async () => {
    let renderCount = 0
    const TestComponent = () => {
      renderCount++
      return (
        <IEPGoalAnalytics 
          studentId="student-1"
          goals={[createMockGoal()]}
          language="en"
        />
      )
    }

    const { rerender } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )

    const initialRenderCount = renderCount

    // Update with same props - should not re-render
    rerender(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )

    // Render count should not increase significantly
    expect(renderCount - initialRenderCount).toBeLessThan(3)
  })
})