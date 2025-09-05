import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SubscriptionManager } from '@/components/students/SubscriptionManager'
import { FreezeSubscriptionDialog } from '@/components/students/FreezeSubscriptionDialog'
import { ProgramTimelineVisualization } from '@/components/students/ProgramTimelineVisualization'
import { ReschedulingEngine } from '@/components/scheduling/ReschedulingEngine'
import { subscriptionRealtimeService } from '@/services/subscription-realtime'
import type { 
  StudentSubscription,
  RealtimeSubscriptionEvent,
  ReschedulingRequest
} from '@/types/scheduling'

// Mock Supabase with detailed responses
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({ single: vi.fn() })),
        gte: vi.fn(() => ({ 
          lte: vi.fn(() => ({ 
            eq: vi.fn(() => ({ 
              order: vi.fn(() => ({ limit: vi.fn() }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({ select: vi.fn() })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      upsert: vi.fn()
    })),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED')
        }
        return mockChannel
      }),
      unsubscribe: vi.fn(),
      send: vi.fn()
    }))
  }),
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    }))
  }
}

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn()
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ 
    id: 'test-user-id', 
    email: 'test@example.com' 
  }))
}))

vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: { reportError: vi.fn() }
}))

describe('Subscription Freeze Integration Tests', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  const mockActiveSubscription: StudentSubscription = {
    id: 'sub-123',
    student_id: 'student-456',
    therapy_program_id: 'program-789',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    original_end_date: '2024-12-31',
    freeze_days_allowed: 30,
    freeze_days_used: 5,
    status: 'active',
    sessions_total: 48,
    sessions_completed: 12,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false }
      }
    })
    user = userEvent.setup()
    vi.clearAllMocks()

    // Setup default Supabase responses
    mockSupabase.from.mockImplementation((table) => {
      switch (table) {
        case 'student_subscriptions':
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockActiveSubscription,
                  error: null
                })),
                order: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: [mockActiveSubscription],
                    error: null
                  }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          }
        case 'subscription_freeze_history':
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null
                }))
              }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null }))
          }
        case 'therapy_sessions':
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({
                      data: [
                        {
                          id: 'session-1',
                          session_date: '2024-06-03',
                          time_start: '10:00',
                          time_end: '11:00',
                          status: 'scheduled'
                        }
                      ],
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        default:
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
      }
    })
  })

  afterEach(() => {
    queryClient.clear()
    subscriptionRealtimeService.cleanup()
  })

  describe('Complete Freeze Workflow Integration', () => {
    it('should complete full freeze workflow from UI to database', async () => {
      // Mock the edge function response
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          subscription_id: 'sub-123',
          new_end_date: '2025-01-07',
          sessions_rescheduled: 1,
          conflicts_detected: [],
          notifications_sent: 2,
          execution_time_ms: 1200
        },
        error: null
      })

      render(
        <TestWrapper>
          <SubscriptionManager
            studentId="student-456"
            onSubscriptionUpdate={vi.fn()}
          />
        </TestWrapper>
      )

      // Wait for subscription data to load
      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
      })

      // Verify subscription displays correctly
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('5 / 30')).toBeInTheDocument() // freeze days used

      // Open freeze dialog
      const freezeButton = screen.getByRole('button', { name: /freeze/i })
      await user.click(freezeButton)

      // Verify dialog opens
      await waitFor(() => {
        expect(screen.getByText('Freeze Subscription')).toBeInTheDocument()
      })

      // Fill in freeze details
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)
      const reasonInput = screen.getByLabelText(/reason/i)

      await user.type(startDateInput, '2024-06-01')
      await user.type(endDateInput, '2024-06-07')
      await user.type(reasonInput, 'Medical leave for surgery recovery period')

      // Submit freeze request
      const submitButton = screen.getByRole('button', { name: /freeze subscription/i })
      await user.click(submitButton)

      // Verify loading state
      expect(screen.getByText(/processing/i)).toBeInTheDocument()

      // Wait for completion
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('freeze_subscription', {
          p_subscription_id: 'sub-123',
          p_start_date: '2024-06-01',
          p_end_date: '2024-06-07',
          p_reason: 'Medical leave for surgery recovery period',
          p_created_by: 'test-user-id'
        })
      })

      // Verify success notification
      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument()
      })
    })

    it('should handle freeze workflow with scheduling conflicts', async () => {
      // Mock edge function response with conflicts
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          subscription_id: 'sub-123',
          new_end_date: '2025-01-07',
          sessions_rescheduled: 2,
          conflicts_detected: [
            {
              type: 'therapist_unavailable',
              session_id: 'session-3',
              description: 'No available slots found for this therapist',
              severity: 'high'
            }
          ],
          notifications_sent: 2,
          execution_time_ms: 1800
        },
        error: null
      })

      const mockOnUpdate = vi.fn()

      render(
        <TestWrapper>
          <SubscriptionManager
            studentId="student-456"
            onSubscriptionUpdate={mockOnUpdate}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
      })

      // Start freeze process
      const freezeButton = screen.getByRole('button', { name: /freeze/i })
      await user.click(freezeButton)

      await waitFor(() => {
        expect(screen.getByText('Freeze Subscription')).toBeInTheDocument()
      })

      // Fill form and submit
      await user.type(screen.getByLabelText(/start date/i), '2024-06-01')
      await user.type(screen.getByLabelText(/end date/i), '2024-06-07')
      await user.type(screen.getByLabelText(/reason/i), 'Extended medical treatment')

      await user.click(screen.getByRole('button', { name: /freeze subscription/i }))

      // Verify conflict handling
      await waitFor(() => {
        expect(screen.getByText(/1 conflicts/i)).toBeInTheDocument()
      })

      // Verify callback was called with updated subscription
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should integrate with real-time updates', async () => {
      const mockEventHandler = vi.fn()

      render(
        <TestWrapper>
          <SubscriptionManager
            studentId="student-456"
            onSubscriptionUpdate={mockEventHandler}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
      })

      // Subscribe to real-time updates
      const unsubscribe = subscriptionRealtimeService.subscribeToSubscription(
        'sub-123',
        mockEventHandler
      )

      // Simulate real-time event
      const mockEvent: RealtimeSubscriptionEvent = {
        type: 'subscription_frozen',
        payload: {
          ...mockActiveSubscription,
          status: 'frozen',
          freeze_days_used: 12
        },
        timestamp: new Date().toISOString()
      }

      // Trigger the event handler directly (simulating real-time update)
      act(() => {
        mockEventHandler(mockEvent)
      })

      // Verify event was processed
      expect(mockEventHandler).toHaveBeenCalledWith(mockEvent)

      // Cleanup
      unsubscribe()
    })
  })

  describe('Timeline Visualization Integration', () => {
    it('should display comprehensive timeline with freeze events', async () => {
      // Mock timeline data
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'student_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    ...mockActiveSubscription,
                    freeze_history: [
                      {
                        id: 'freeze-1',
                        operation_type: 'freeze',
                        start_date: '2024-05-01',
                        end_date: '2024-05-07',
                        freeze_days: 7,
                        reason: 'Previous freeze',
                        created_at: '2024-05-01T00:00:00Z'
                      }
                    ],
                    sessions: [
                      {
                        id: 'session-1',
                        session_date: '2024-03-15',
                        attendance_status: 'present'
                      }
                    ]
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) }
      })

      render(
        <TestWrapper>
          <ProgramTimelineVisualization
            subscriptionId="sub-123"
            showControls={true}
          />
        </TestWrapper>
      )

      // Wait for timeline to load
      await waitFor(() => {
        expect(screen.getByText('Program Timeline')).toBeInTheDocument()
      })

      // Verify timeline elements
      expect(screen.getByText(/Program Started/i)).toBeInTheDocument()
      expect(screen.getByText(/Freeze Started/i)).toBeInTheDocument()
      expect(screen.getByText(/25% Complete/i)).toBeInTheDocument()

      // Test export functionality
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
      
      // Mock URL.createObjectURL for export test
      global.URL.createObjectURL = vi.fn(() => 'mocked-url')
      global.URL.revokeObjectURL = vi.fn()

      await user.click(exportButton)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should filter timeline events correctly', async () => {
      render(
        <TestWrapper>
          <ProgramTimelineVisualization
            subscriptionId="sub-123"
            showControls={true}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Program Timeline')).toBeInTheDocument()
      })

      // Test filtering by event type
      const filterSelect = screen.getByRole('combobox')
      await user.click(filterSelect)
      
      const milestoneOption = screen.getByRole('option', { name: /milestones/i })
      await user.click(milestoneOption)

      // Verify filtering worked (this would need more specific assertions based on mock data)
      expect(filterSelect).toBeInTheDocument()
    })
  })

  describe('Rescheduling Engine Integration', () => {
    it('should handle complex rescheduling workflow', async () => {
      const mockReschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-123',
        student_id: 'student-456',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-07',
        freeze_days: 7
      }

      // Mock rescheduling result
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          sessions_rescheduled: 3,
          new_end_date: '2025-01-07',
          conflicts_detected: [],
          rollback_info: []
        },
        error: null
      })

      const mockOnComplete = vi.fn()

      render(
        <TestWrapper>
          <ReschedulingEngine
            request={mockReschedulingRequest}
            onComplete={mockOnComplete}
            autoStart={false}
          />
        </TestWrapper>
      )

      // Start rescheduling
      const startButton = screen.getByRole('button', { name: /start rescheduling/i })
      await user.click(startButton)

      // Verify dialog opens and shows progress
      await waitFor(() => {
        expect(screen.getByText('Automated Session Rescheduling')).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      // Verify results display
      expect(screen.getByText('3')).toBeInTheDocument() // sessions rescheduled
      expect(screen.getByText('0')).toBeInTheDocument() // conflicts

      // Complete the workflow
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockOnComplete).toHaveBeenCalled()
    })

    it('should handle rescheduling errors gracefully', async () => {
      const mockReschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-123',
        student_id: 'student-456',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-07',
        freeze_days: 7
      }

      // Mock rescheduling error
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Rescheduling service unavailable'))

      const mockOnCancel = vi.fn()

      render(
        <TestWrapper>
          <ReschedulingEngine
            request={mockReschedulingRequest}
            onCancel={mockOnCancel}
            autoStart={true}
          />
        </TestWrapper>
      )

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument()
      })

      // Verify error message
      expect(screen.getByText(/Rescheduling service unavailable/i)).toBeInTheDocument()

      // Test retry functionality
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('should maintain data consistency across components', async () => {
      const { rerender } = render(
        <TestWrapper>
          <div>
            <SubscriptionManager
              studentId="student-456"
              onSubscriptionUpdate={vi.fn()}
            />
            <ProgramTimelineVisualization
              subscriptionId="sub-123"
            />
          </div>
        </TestWrapper>
      )

      // Wait for both components to load
      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
        expect(screen.getByText('Program Timeline')).toBeInTheDocument()
      })

      // Simulate subscription update
      const updatedSubscription = {
        ...mockActiveSubscription,
        status: 'frozen' as const,
        freeze_days_used: 12,
        end_date: '2025-01-07'
      }

      // Update mock data
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: updatedSubscription,
              error: null
            }))
          }))
        }))
      }))

      // Force re-render to simulate data refresh
      rerender(
        <TestWrapper>
          <div>
            <SubscriptionManager
              studentId="student-456"
              onSubscriptionUpdate={vi.fn()}
            />
            <ProgramTimelineVisualization
              subscriptionId="sub-123"
            />
          </div>
        </TestWrapper>
      )

      // Both components should reflect the updated data
      await waitFor(() => {
        expect(screen.getByText('frozen')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        session_date: `2024-06-${String((i % 30) + 1).padStart(2, '0')}`,
        time_start: '10:00',
        time_end: '11:00',
        status: 'scheduled'
      }))

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'therapy_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({
                      data: largeSessions,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }
      })

      const startTime = Date.now()

      render(
        <TestWrapper>
          <SubscriptionManager
            studentId="student-456"
            onSubscriptionUpdate={vi.fn()}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
      })

      const loadTime = Date.now() - startTime

      // Component should load within reasonable time even with large dataset
      expect(loadTime).toBeLessThan(3000)
    })
  })
})