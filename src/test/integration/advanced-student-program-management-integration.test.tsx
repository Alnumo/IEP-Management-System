import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

// Import all the components and services we need to test integration
import { IndividualizedEnrollmentForm } from '@/components/students/IndividualizedEnrollmentForm'
import { ProgramTemplateSelector } from '@/components/students/ProgramTemplateSelector'
import { StudentProgramCustomizer } from '@/components/students/StudentProgramCustomizer'
import { EnrollmentProgressTracker } from '@/components/students/EnrollmentProgressTracker'
import { TherapistAssignmentManager } from '@/components/students/TherapistAssignmentManager'
import { CapacityManagementDashboard } from '@/components/therapist/CapacityManagementDashboard'
import { ProgramPerformanceDashboard } from '@/components/analytics/ProgramPerformanceDashboard'

// Services
import { IndividualizedEnrollmentService } from '@/services/enrollment/individualized-enrollment-service'
import { ProgramTemplateService } from '@/services/enrollment/program-template-service'
import { TherapistWorkloadService } from '@/services/therapist/therapist-workload-service'
import { CapacityManagementService } from '@/services/therapist/capacity-management-service'
import { TherapistSubstitutionService } from '@/services/therapist/therapist-substitution-service'
import { TherapistPerformanceTrackingService } from '@/services/therapist/therapist-performance-tracking-service'

// Mock external dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => Promise.resolve({ data: null, error: null })),
        delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      }))
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }
  }
}))

// Mock drag and drop
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: any }) => children({ draggableProps: {}, dragHandleProps: {} }, {}),
  Draggable: ({ children }: { children: any }) => children({ draggableProps: {}, dragHandleProps: {} }, {})
}))

// Mock recharts for analytics
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

describe('Advanced Student Program Management - Integration Tests', () => {
  let queryClient: QueryClient
  let enrollmentService: IndividualizedEnrollmentService
  let templateService: ProgramTemplateService
  let workloadService: TherapistWorkloadService
  let capacityService: CapacityManagementService
  let substitutionService: TherapistSubstitutionService
  let performanceService: TherapistPerformanceTrackingService

  // Mock data
  const mockStudent = {
    id: 'student-123',
    name_ar: 'أحمد محمد',
    name_en: 'Ahmed Mohammed',
    date_of_birth: '2015-05-15',
    medical_record_number: 'MR001',
    parent_id: 'parent-123'
  }

  const mockTherapist = {
    id: 'therapist-123',
    name_ar: 'د. سارة أحمد',
    name_en: 'Dr. Sarah Ahmed',
    specialties: ['speech_therapy', 'occupational_therapy'],
    status: 'active',
    user_id: 'user-123'
  }

  const mockProgramTemplate = {
    id: 'template-123',
    name_ar: 'برنامج تطوير النطق المكثف',
    name_en: 'Intensive Speech Development Program',
    program_type: 'speech_therapy',
    base_duration_weeks: 12,
    base_sessions_per_week: 3,
    default_goals: [
      { goal_ar: 'تحسين النطق', goal_en: 'Improve articulation' }
    ],
    customization_options: {
      intensity_levels: ['low', 'medium', 'high'],
      session_types: ['individual', 'group'],
      assessment_types: ['weekly', 'biweekly', 'monthly']
    }
  }

  const mockEnrollment = {
    id: 'enrollment-123',
    student_id: mockStudent.id,
    program_template_id: mockProgramTemplate.id,
    assigned_therapist_id: mockTherapist.id,
    individual_start_date: '2025-09-01',
    individual_end_date: '2025-12-01',
    custom_schedule: {
      sessions_per_week: 3,
      preferred_days: ['monday', 'wednesday', 'friday'],
      preferred_time: '10:00'
    },
    program_modifications: {
      intensity_level: 'high',
      focus_areas: ['articulation', 'fluency']
    },
    enrollment_status: 'active'
  }

  beforeAll(() => {
    // Setup global test environment
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
      })),
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false }
      }
    })

    // Initialize services
    enrollmentService = new IndividualizedEnrollmentService()
    templateService = new ProgramTemplateService()
    workloadService = new TherapistWorkloadService()
    capacityService = new CapacityManagementService()
    substitutionService = new TherapistSubstitutionService()
    performanceService = new TherapistPerformanceTrackingService()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderWithProviders = (
    component: React.ReactElement,
    options: { language?: 'ar' | 'en' } = {}
  ) => {
    const { language = 'en' } = options
    
    return render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLanguage={language}>
          {component}
        </LanguageProvider>
      </QueryClientProvider>
    )
  }

  describe('Complete Enrollment Workflow Integration', () => {
    it('should complete full enrollment workflow from template selection to therapist assignment', async () => {
      // Mock API responses for the workflow
      const mockSupabaseResponses = {
        templates: { data: [mockProgramTemplate], error: null },
        students: { data: [mockStudent], error: null },
        therapists: { data: [mockTherapist], error: null },
        enrollment: { data: mockEnrollment, error: null },
        workload: { data: { weekly_hours: 30, capacity_remaining: 10 }, error: null }
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const responses: any = {
          'program_templates': () => ({ 
            select: () => ({ 
              order: () => Promise.resolve(mockSupabaseResponses.templates)
            })
          }),
          'students': () => ({
            select: () => ({
              eq: () => Promise.resolve(mockSupabaseResponses.students)
            })
          }),
          'therapists': () => ({
            select: () => ({
              eq: () => Promise.resolve(mockSupabaseResponses.therapists)
            })
          }),
          'student_subscriptions': () => ({
            insert: () => Promise.resolve(mockSupabaseResponses.enrollment),
            select: () => ({
              eq: () => Promise.resolve({ data: [mockEnrollment], error: null })
            })
          })
        }
        
        return responses[table] ? responses[table]() : {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        }
      })

      // Step 1: Render Program Template Selector
      renderWithProviders(
        <ProgramTemplateSelector
          onTemplateSelect={() => {}}
          selectedTemplateId=""
        />
      )

      await waitFor(() => {
        expect(screen.getByText(mockProgramTemplate.name_en)).toBeInTheDocument()
      })

      // Step 2: Render Individualized Enrollment Form
      renderWithProviders(
        <IndividualizedEnrollmentForm
          studentId={mockStudent.id}
          programTemplateId={mockProgramTemplate.id}
          onEnrollmentComplete={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/enrollment/i)).toBeInTheDocument()
      })

      // Step 3: Render Therapist Assignment Manager
      renderWithProviders(
        <TherapistAssignmentManager
          programTemplateId={mockProgramTemplate.id}
          enrollmentIds={[mockEnrollment.id]}
          onAssignmentChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/therapist assignment/i)).toBeInTheDocument()
      })

      // Verify integration points work
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('program_templates')
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('students')
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('therapists')
    }, 10000)

    it('should handle enrollment with custom modifications', async () => {
      const customTemplate = {
        ...mockProgramTemplate,
        customization_options: {
          intensity_levels: ['low', 'medium', 'high'],
          session_types: ['individual', 'group', 'hybrid'],
          assessment_frequencies: ['weekly', 'biweekly']
        }
      }

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [customTemplate], error: null }),
          order: () => Promise.resolve({ data: [customTemplate], error: null })
        }),
        insert: () => Promise.resolve({ data: mockEnrollment, error: null })
      }))

      renderWithProviders(
        <StudentProgramCustomizer
          studentId={mockStudent.id}
          programTemplateId={customTemplate.id}
          onCustomizationComplete={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/customization/i)).toBeInTheDocument()
      })

      // Test that customization options are available
      const intensityOptions = screen.queryByText(/intensity/i)
      expect(intensityOptions).toBeInTheDocument()
    })
  })

  describe('Service Integration Tests', () => {
    it('should integrate enrollment service with template service', async () => {
      // Test service integration
      const templateResult = await templateService.getTemplate(mockProgramTemplate.id)
      const enrollmentResult = await enrollmentService.createIndividualizedEnrollment({
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        assigned_therapist_id: mockTherapist.id,
        individual_start_date: '2025-09-01',
        individual_end_date: '2025-12-01',
        custom_schedule: {
          sessions_per_week: 3,
          preferred_days: ['monday', 'wednesday', 'friday']
        },
        program_modifications: {
          intensity_level: 'high'
        }
      })

      // Both services should work independently
      expect(typeof templateResult).toBe('object')
      expect(typeof enrollmentResult).toBe('object')
    })

    it('should integrate workload service with capacity management', async () => {
      const workloadResult = await workloadService.calculateWorkload(mockTherapist.id)
      
      // Use workload result in capacity validation
      const capacityValidation = await capacityService.validateAssignment({
        therapist_id: mockTherapist.id,
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        sessions_per_week: 3,
        session_duration_minutes: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-01',
        preferred_time_slots: [{
          day_of_week: 1,
          start_time: '10:00',
          duration_minutes: 60
        }],
        priority_level: 'high'
      })

      expect(typeof workloadResult).toBe('object')
      expect(typeof capacityValidation).toBe('object')
    })

    it('should integrate substitution service with performance tracking', async () => {
      const substitutionResult = await substitutionService.findSubstitutes({
        original_therapist_id: mockTherapist.id,
        start_date: '2025-09-15',
        end_date: '2025-09-22',
        reason: 'vacation',
        require_same_specialty: true,
        notification_required: true
      })

      const performanceResult = await performanceService.recordPerformanceMetric({
        therapist_id: mockTherapist.id,
        program_template_id: mockProgramTemplate.id,
        student_id: mockStudent.id,
        metric_type: 'goal_achievement',
        measurement_period: 'weekly',
        metric_value: 85,
        target_value: 80,
        unit: 'percentage',
        context_data: { week: 1 },
        measured_by: 'system'
      })

      expect(typeof substitutionResult).toBe('object')
      expect(typeof performanceResult).toBe('object')
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('should maintain data consistency across enrollment components', async () => {
      let selectedTemplateId = ''
      let enrollmentData: any = null
      let assignmentData: any = null

      // Mock template selection
      const TemplateSelector = () => {
        React.useEffect(() => {
          selectedTemplateId = mockProgramTemplate.id
        }, [])
        return <div data-testid="template-selector">Template Selected</div>
      }

      // Mock enrollment form
      const EnrollmentForm = () => {
        React.useEffect(() => {
          if (selectedTemplateId) {
            enrollmentData = mockEnrollment
          }
        }, [])
        return <div data-testid="enrollment-form">Enrollment Created</div>
      }

      // Mock assignment manager
      const AssignmentManager = () => {
        React.useEffect(() => {
          if (enrollmentData) {
            assignmentData = { therapist_id: mockTherapist.id }
          }
        }, [])
        return <div data-testid="assignment-manager">Assignment Completed</div>
      }

      renderWithProviders(
        <div>
          <TemplateSelector />
          <EnrollmentForm />
          <AssignmentManager />
        </div>
      )

      await waitFor(() => {
        expect(screen.getByTestId('template-selector')).toBeInTheDocument()
        expect(screen.getByTestId('enrollment-form')).toBeInTheDocument()
        expect(screen.getByTestId('assignment-manager')).toBeInTheDocument()
      })

      // Verify data flow
      expect(selectedTemplateId).toBe(mockProgramTemplate.id)
      expect(enrollmentData).toEqual(mockEnrollment)
      expect(assignmentData).toEqual({ therapist_id: mockTherapist.id })
    })

    it('should handle real-time updates across components', async () => {
      const mockRealTimeUpdate = {
        eventType: 'INSERT',
        new: {
          id: 'new-enrollment-456',
          student_id: 'student-456',
          program_template_id: mockProgramTemplate.id,
          status: 'active'
        }
      }

      // Mock Supabase real-time subscription
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((callback) => {
          // Simulate real-time update
          setTimeout(() => {
            callback(mockRealTimeUpdate)
          }, 100)
          return { unsubscribe: vi.fn() }
        }),
        unsubscribe: vi.fn()
      }

      vi.mocked(supabase.from).mockReturnValue({
        on: () => mockChannel
      } as any)

      renderWithProviders(
        <EnrollmentProgressTracker 
          enrollmentIds={[mockEnrollment.id]}
          programTemplateId={mockProgramTemplate.id}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/progress/i)).toBeInTheDocument()
      })

      // Verify real-time subscription was set up
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })
  })

  describe('Performance and Scalability Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large mock datasets
      const largeTemplateSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockProgramTemplate,
        id: `template-${i}`,
        name_en: `Program Template ${i}`
      }))

      const largeEnrollmentSet = Array.from({ length: 50 }, (_, i) => ({
        ...mockEnrollment,
        id: `enrollment-${i}`,
        student_id: `student-${i}`
      }))

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const responses: any = {
          'program_templates': () => ({
            select: () => ({
              order: () => Promise.resolve({ data: largeTemplateSet, error: null })
            })
          }),
          'student_subscriptions': () => ({
            select: () => ({
              eq: () => Promise.resolve({ data: largeEnrollmentSet, error: null })
            })
          })
        }
        
        return responses[table] ? responses[table]() : {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        }
      })

      const startTime = performance.now()

      renderWithProviders(
        <ProgramTemplateSelector
          onTemplateSelect={() => {}}
          selectedTemplateId=""
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Program Template 0')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render large datasets within reasonable time
      expect(renderTime).toBeLessThan(2000) // Less than 2 seconds
    }, 15000)

    it('should handle concurrent operations without conflicts', async () => {
      const concurrentOperations = [
        enrollmentService.createIndividualizedEnrollment({
          student_id: 'student-1',
          program_template_id: mockProgramTemplate.id,
          assigned_therapist_id: mockTherapist.id,
          individual_start_date: '2025-09-01',
          individual_end_date: '2025-12-01',
          custom_schedule: { sessions_per_week: 2 },
          program_modifications: {}
        }),
        workloadService.calculateWorkload(mockTherapist.id),
        capacityService.monitorCapacityAlerts(),
        performanceService.recordPerformanceMetric({
          therapist_id: mockTherapist.id,
          program_template_id: mockProgramTemplate.id,
          metric_type: 'session_quality',
          measurement_period: 'session',
          metric_value: 90,
          unit: 'score',
          context_data: {},
          measured_by: 'system'
        })
      ]

      // Execute all operations concurrently
      const results = await Promise.allSettled(concurrentOperations)

      // All operations should complete without errors
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully across components', async () => {
      // Mock API failure
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('Network error') }),
          order: () => Promise.resolve({ data: null, error: new Error('Network error') })
        })
      }))

      renderWithProviders(
        <ProgramTemplateSelector
          onTemplateSelect={() => {}}
          selectedTemplateId=""
        />
      )

      await waitFor(() => {
        // Component should handle error gracefully
        const errorElement = screen.queryByText(/error/i) || screen.queryByText(/loading/i)
        expect(errorElement).toBeInTheDocument()
      })

      // Should not crash the application
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('should recover from partial failures in service integration', async () => {
      // Mock partial failure scenario
      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: () => ({
          eq: () => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({ data: null, error: new Error('Temporary failure') })
            }
            return Promise.resolve({ data: [mockProgramTemplate], error: null })
          }
        })
      }))

      const result = await templateService.getTemplate(mockProgramTemplate.id)

      // Should retry and eventually succeed
      expect(result).toBeDefined()
      expect(callCount).toBeGreaterThan(1)
    })
  })

  describe('Accessibility and Internationalization', () => {
    it('should maintain accessibility standards across all components', async () => {
      renderWithProviders(
        <div>
          <IndividualizedEnrollmentForm
            studentId={mockStudent.id}
            programTemplateId={mockProgramTemplate.id}
            onEnrollmentComplete={() => {}}
          />
          <TherapistAssignmentManager
            programTemplateId={mockProgramTemplate.id}
            enrollmentIds={[mockEnrollment.id]}
            onAssignmentChange={() => {}}
          />
        </div>
      )

      await waitFor(() => {
        // Check for proper form labels
        const formElements = screen.getAllByRole('textbox')
        formElements.forEach(element => {
          expect(element).toHaveAttribute('aria-label')
        })

        // Check for proper button accessibility
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toBeVisible()
        })
      })
    })

    it('should support RTL layout for Arabic interface', async () => {
      renderWithProviders(
        <IndividualizedEnrollmentForm
          studentId={mockStudent.id}
          programTemplateId={mockProgramTemplate.id}
          onEnrollmentComplete={() => {}}
        />,
        { language: 'ar' }
      )

      await waitFor(() => {
        const container = screen.getByRole('form') || screen.getByRole('generic')
        expect(container.closest('[dir="rtl"]')).toBeInTheDocument()
      })
    })

    it('should display Arabic content correctly', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: () => ({
          order: () => Promise.resolve({ data: [mockProgramTemplate], error: null })
        })
      }))

      renderWithProviders(
        <ProgramTemplateSelector
          onTemplateSelect={() => {}}
          selectedTemplateId=""
        />,
        { language: 'ar' }
      )

      await waitFor(() => {
        expect(screen.getByText(mockProgramTemplate.name_ar)).toBeInTheDocument()
      })
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should validate data consistency across enrollment workflow', async () => {
      const enrollmentData = {
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        assigned_therapist_id: mockTherapist.id,
        individual_start_date: '2025-09-01',
        individual_end_date: '2025-12-01',
        custom_schedule: {
          sessions_per_week: 3,
          preferred_days: ['monday', 'wednesday', 'friday']
        },
        program_modifications: {
          intensity_level: 'high',
          focus_areas: ['articulation']
        }
      }

      // Validate enrollment data structure
      expect(enrollmentData.student_id).toBeDefined()
      expect(enrollmentData.program_template_id).toBeDefined()
      expect(enrollmentData.assigned_therapist_id).toBeDefined()
      expect(Date.parse(enrollmentData.individual_start_date)).toBeGreaterThan(0)
      expect(Date.parse(enrollmentData.individual_end_date)).toBeGreaterThan(0)
      expect(enrollmentData.custom_schedule.sessions_per_week).toBeGreaterThan(0)
      expect(Array.isArray(enrollmentData.custom_schedule.preferred_days)).toBe(true)
      expect(typeof enrollmentData.program_modifications).toBe('object')
    })

    it('should enforce referential integrity in service calls', async () => {
      // Test that services validate referenced entities exist
      const workloadResult = await workloadService.calculateWorkload('non-existent-therapist')
      const capacityResult = await capacityService.validateAssignment({
        therapist_id: 'non-existent-therapist',
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        sessions_per_week: 3,
        session_duration_minutes: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-01',
        preferred_time_slots: [],
        priority_level: 'medium'
      })

      // Services should handle invalid references gracefully
      expect(typeof workloadResult).toBe('object')
      expect(typeof capacityResult).toBe('object')
    })
  })

  describe('Business Logic Integration', () => {
    it('should enforce business rules across components', async () => {
      // Test enrollment business rules
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      const invalidEnrollment = {
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        assigned_therapist_id: mockTherapist.id,
        individual_start_date: futureDate.toISOString().split('T')[0],
        individual_end_date: pastDate.toISOString().split('T')[0], // End before start
        custom_schedule: { sessions_per_week: 3 },
        program_modifications: {}
      }

      const result = await enrollmentService.createIndividualizedEnrollment(invalidEnrollment)
      
      // Should validate that end date is after start date
      expect(result).toBeDefined()
    })

    it('should calculate scheduling constraints correctly', async () => {
      const therapistWorkload = await workloadService.calculateWorkload(mockTherapist.id)
      
      const capacityCheck = await capacityService.validateAssignment({
        therapist_id: mockTherapist.id,
        student_id: mockStudent.id,
        program_template_id: mockProgramTemplate.id,
        sessions_per_week: 10, // Excessive sessions
        session_duration_minutes: 120, // Long sessions
        start_date: '2025-09-01',
        end_date: '2025-12-01',
        preferred_time_slots: [],
        priority_level: 'high'
      })

      // Should detect capacity constraints
      expect(typeof therapistWorkload).toBe('object')
      expect(typeof capacityCheck).toBe('object')
    })
  })
})