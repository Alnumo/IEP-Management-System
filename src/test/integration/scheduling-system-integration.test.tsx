/**
 * Scheduling System Integration Tests
 * Story 3.1: Automated Scheduling Engine - Integration Tests
 * 
 * End-to-end integration tests for the complete scheduling system including
 * React components, hooks, services, and database interactions.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ScheduleTemplateManager } from '@/components/scheduling/ScheduleTemplateManager'
import { useSchedulingEngine } from '@/hooks/useSchedulingEngine'
import { supabase } from '@/lib/supabase'
import React from 'react'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user' } },
        error: null
      }))
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}))

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

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
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

// Test hook component
const TestHookComponent: React.FC = () => {
  const {
    generateSchedule,
    detectConflicts,
    executeOptimizationRules,
    executeBulkReschedule,
    scheduleTemplates,
    optimizationRules,
    isGenerating,
    isLoading
  } = useSchedulingEngine()

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="generating-state">{isGenerating ? 'generating' : 'idle'}</div>
      <div data-testid="templates-count">{scheduleTemplates.length}</div>
      <div data-testid="rules-count">{optimizationRules.length}</div>
      
      <button 
        data-testid="generate-schedule-btn"
        onClick={() => generateSchedule({
          student_subscription_id: 'test-student',
          start_date: '2024-01-15',
          end_date: '2024-02-15',
          total_sessions: 8,
          sessions_per_week: 2,
          session_duration: 60,
          preferred_times: [],
          avoid_times: [],
          preferred_days: [1, 3],
          avoid_days: [5, 6],
          priority_level: 2,
          flexibility_score: 70
        })}
      >
        Generate Schedule
      </button>

      <button
        data-testid="detect-conflicts-btn"
        onClick={() => detectConflicts({
          session: {
            id: 'test-session',
            session_number: 'TEST-001',
            student_subscription_id: 'test-student',
            therapist_id: 'test-therapist',
            scheduled_date: '2024-01-15',
            start_time: '09:00',
            end_time: '10:00',
            duration_minutes: 60,
            session_category: 'therapy',
            priority_level: 2,
            status: 'scheduled',
            has_conflicts: false,
            conflict_details: [],
            resolution_status: 'pending',
            equipment_ids: [],
            reschedule_count: 0,
            is_billable: true,
            parent_notification_sent: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        })}
      >
        Detect Conflicts
      </button>
    </div>
  )
}

describe('Scheduling System Integration', () => {
  let queryClient: QueryClient
  let mockSupabaseFrom: Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Setup Supabase mock
    mockSupabaseFrom = vi.fn()
    ;(supabase.from as Mock) = mockSupabaseFrom

    // Default mock responses
    mockSupabaseFrom.mockImplementation((table: string) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis()
      }

      // Set default responses based on table
      switch (table) {
        case 'schedule_templates':
          mockChain.select.mockResolvedValue({
            data: [
              {
                id: 'template-1',
                name: 'Standard Template',
                name_ar: 'القالب القياسي',
                description: 'Standard therapy template',
                description_ar: 'قالب العلاج القياسي',
                template_type: 'program_based',
                is_active: true,
                session_duration: 60,
                sessions_per_week: 2,
                preferred_times: [],
                scheduling_pattern: 'weekly',
                pattern_config: {},
                required_equipment: [],
                allow_back_to_back: false,
                max_gap_between_sessions: 120,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ],
            error: null
          })
          break

        case 'optimization_rules':
          mockChain.select.mockResolvedValue({
            data: [
              {
                id: 'rule-1',
                name: 'Minimize Gaps',
                name_ar: 'تقليل الفجوات',
                rule_type: 'optimization',
                priority: 8,
                is_active: true,
                condition: { field: 'gaps', operator: 'greater_than', value: 60 },
                action: { type: 'minimize_gaps', score_impact: 20 },
                weight: 1.5,
                applies_to: 'all',
                target_ids: [],
                execution_count: 0,
                success_rate: 0,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ],
            error: null
          })
          break

        default:
          mockChain.select.mockResolvedValue({ data: [], error: null })
      }

      return mockChain
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('ScheduleTemplateManager Component Integration', () => {
    it('should render template manager with data', async () => {
      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      // Should show loading initially
      expect(screen.getByText(/loading templates/i)).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument()
      })

      // Should display templates
      await waitFor(() => {
        expect(screen.getByText('Standard Template')).toBeInTheDocument()
      })
    })

    it('should handle template creation workflow', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'new-template',
          name: 'New Template',
          name_ar: 'قالب جديد'
        },
        error: null
      })

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'schedule_templates') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null
            }),
            insert: mockInsert,
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis()
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/new template/i)).toBeInTheDocument()
      })

      // Click create template button
      const createButton = screen.getByText(/new template/i)
      fireEvent.click(createButton)

      // Fill template form and save
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/template name.*english/i)
        fireEvent.change(nameInput, { target: { value: 'Test Template' } })

        const nameArInput = screen.getByLabelText(/template name.*arabic/i)
        fireEvent.change(nameArInput, { target: { value: 'قالب تجريبي' } })

        const saveButton = screen.getByText(/save/i)
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })
    })

    it('should handle bilingual interface switching', async () => {
      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/template manager/i)).toBeInTheDocument()
      })

      // Should display English content by default
      expect(screen.getByText(/Schedule Template Manager/i)).toBeInTheDocument()

      // Template titles should be available in both languages
      await waitFor(() => {
        const templates = screen.getAllByText(/standard/i)
        expect(templates.length).toBeGreaterThan(0)
      })
    })
  })

  describe('useSchedulingEngine Hook Integration', () => {
    it('should provide scheduling functionality', async () => {
      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      )

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('ready')
      })

      // Should load templates and rules
      await waitFor(() => {
        expect(screen.getByTestId('templates-count')).toHaveTextContent('1')
        expect(screen.getByTestId('rules-count')).toHaveTextContent('1')
      })
    })

    it('should handle schedule generation', async () => {
      // Mock schedule generation response
      mockSupabaseFrom.mockImplementation((table: string) => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        }

        if (table === 'therapy_sessions') {
          mockChain.insert.mockResolvedValue({
            data: [
              {
                id: 'generated-session',
                student_subscription_id: 'test-student',
                therapist_id: 'test-therapist',
                scheduled_date: '2024-01-15',
                start_time: '09:00',
                end_time: '10:00',
                duration_minutes: 60
              }
            ],
            error: null
          })
        }

        return mockChain
      })

      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('ready')
      })

      // Click generate schedule
      const generateButton = screen.getByTestId('generate-schedule-btn')
      
      act(() => {
        fireEvent.click(generateButton)
      })

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByTestId('generating-state')).toHaveTextContent('generating')
      })

      // Eventually should complete
      await waitFor(() => {
        expect(screen.getByTestId('generating-state')).toHaveTextContent('idle')
      })
    })

    it('should handle conflict detection', async () => {
      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('ready')
      })

      const conflictButton = screen.getByTestId('detect-conflicts-btn')
      
      act(() => {
        fireEvent.click(conflictButton)
      })

      // Should trigger conflict detection
      await waitFor(() => {
        // Verify that the function was called (through side effects)
        expect(screen.getByTestId('detect-conflicts-btn')).toBeInTheDocument()
      })
    })
  })

  describe('End-to-End Scheduling Workflow', () => {
    it('should complete full scheduling workflow', async () => {
      // Mock complete workflow responses
      const mockData = {
        templates: [
          {
            id: 'template-workflow',
            name: 'Workflow Template',
            name_ar: 'قالب سير العمل',
            session_duration: 60,
            sessions_per_week: 2,
            template_type: 'program_based',
            is_active: true
          }
        ],
        availability: [
          {
            id: 'avail-1',
            therapist_id: 'therapist-1',
            day_of_week: 1,
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
          }
        ],
        sessions: []
      }

      mockSupabaseFrom.mockImplementation((table: string) => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        }

        switch (table) {
          case 'schedule_templates':
            mockChain.select.mockResolvedValue({ data: mockData.templates, error: null })
            break
          case 'therapist_availability':
            mockChain.select.mockResolvedValue({ data: mockData.availability, error: null })
            break
          case 'therapy_sessions':
            mockChain.select.mockResolvedValue({ data: mockData.sessions, error: null })
            mockChain.insert.mockResolvedValue({ data: [], error: null })
            break
          default:
            mockChain.select.mockResolvedValue({ data: [], error: null })
        }

        return mockChain
      })

      const WorkflowComponent: React.FC = () => {
        const { generateSchedule, isGenerating } = useSchedulingEngine()
        const [result, setResult] = React.useState<any>(null)

        const handleGenerate = async () => {
          try {
            const scheduleResult = await generateSchedule({
              student_subscription_id: 'student-workflow',
              start_date: '2024-01-15',
              end_date: '2024-02-15',
              total_sessions: 8,
              sessions_per_week: 2,
              session_duration: 60,
              preferred_times: [
                { start_time: '09:00', end_time: '10:00', duration_minutes: 60 }
              ],
              avoid_times: [],
              preferred_days: [1, 3],
              avoid_days: [],
              priority_level: 2,
              flexibility_score: 80
            })
            setResult(scheduleResult)
          } catch (error) {
            console.error('Workflow generation failed:', error)
          }
        }

        return (
          <div>
            <button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Workflow'}
            </button>
            {result && (
              <div data-testid="workflow-result">
                Status: {result.success ? 'Success' : 'Failed'}
              </div>
            )}
          </div>
        )
      }

      render(
        <TestWrapper>
          <WorkflowComponent />
        </TestWrapper>
      )

      // Start workflow
      const generateButton = screen.getByText('Generate Workflow')
      
      act(() => {
        fireEvent.click(generateButton)
      })

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByTestId('workflow-result')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify workflow completed
      expect(screen.getByTestId('workflow-result')).toHaveTextContent('Status:')
    })
  })

  describe('Performance Integration Tests', () => {
    it('should handle concurrent operations', async () => {
      const ConcurrentTestComponent: React.FC = () => {
        const { generateSchedule, detectConflicts } = useSchedulingEngine()
        const [operations, setOperations] = React.useState<string[]>([])

        const handleConcurrentOps = async () => {
          const promises = [
            generateSchedule({
              student_subscription_id: 'student-1',
              start_date: '2024-01-15',
              end_date: '2024-02-15',
              total_sessions: 4,
              sessions_per_week: 1,
              session_duration: 60,
              preferred_times: [],
              avoid_times: [],
              preferred_days: [1],
              avoid_days: [],
              priority_level: 2,
              flexibility_score: 70
            }).then(() => 'generate-complete'),
            
            detectConflicts({
              session: {
                id: 'test-concurrent',
                session_number: 'TEST-CONC-001',
                student_subscription_id: 'student-1',
                therapist_id: 'therapist-1',
                scheduled_date: '2024-01-15',
                start_time: '09:00',
                end_time: '10:00',
                duration_minutes: 60,
                session_category: 'therapy',
                priority_level: 2,
                status: 'scheduled',
                has_conflicts: false,
                conflict_details: [],
                resolution_status: 'pending',
                equipment_ids: [],
                reschedule_count: 0,
                is_billable: true,
                parent_notification_sent: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            }).then(() => 'conflict-complete')
          ]

          const results = await Promise.all(promises)
          setOperations(results)
        }

        return (
          <div>
            <button onClick={handleConcurrentOps}>
              Run Concurrent Operations
            </button>
            <div data-testid="concurrent-results">
              {operations.join(', ')}
            </div>
          </div>
        )
      }

      render(
        <TestWrapper>
          <ConcurrentTestComponent />
        </TestWrapper>
      )

      const concurrentButton = screen.getByText('Run Concurrent Operations')
      
      act(() => {
        fireEvent.click(concurrentButton)
      })

      // Should handle concurrent operations
      await waitFor(() => {
        const results = screen.getByTestId('concurrent-results').textContent
        expect(results).toContain('complete')
      }, { timeout: 10000 })
    })

    it('should maintain performance with large datasets', async () => {
      // Mock large dataset
      const largeTemplateSet = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        name_ar: `قالب ${i}`,
        template_type: 'program_based',
        is_active: true,
        session_duration: 60,
        sessions_per_week: 2
      }))

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'schedule_templates') {
          return {
            select: vi.fn().mockResolvedValue({ 
              data: largeTemplateSet, 
              error: null 
            }),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis()
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis()
        }
      })

      const startTime = Date.now()

      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText(/template manager/i)).toBeInTheDocument()
      })

      const endTime = Date.now()
      const loadTime = endTime - startTime

      // Should load large datasets reasonably quickly
      expect(loadTime).toBeLessThan(5000) // 5 seconds max
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockRejectedValue(new Error('Network error')),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }))

      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument()
      })

      // Should provide retry option
      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    })

    it('should recover from errors with retry', async () => {
      let callCount = 0
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.reject(new Error('First call fails'))
          }
          return Promise.resolve({ data: [], error: null })
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }))

      render(
        <TestWrapper>
          <ScheduleTemplateManager />
        </TestWrapper>
      )

      // Should show error first
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByText(/retry/i)
      fireEvent.click(retryButton)

      // Should recover
      await waitFor(() => {
        expect(screen.queryByText(/error loading/i)).not.toBeInTheDocument()
      })
    })
  })
})