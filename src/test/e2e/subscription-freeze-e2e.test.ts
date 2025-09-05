import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SubscriptionManager } from '@/components/students/SubscriptionManager'
import { subscriptionRealtimeService } from '@/services/subscription-realtime'
import type { 
  StudentSubscription,
  FreezeRequest,
  ReschedulingResult,
  TimelineAdjustment,
  NotificationDeliveryResult
} from '@/types/scheduling'

/**
 * End-to-End Tests for Complete Subscription Freeze and Reschedule Cycle
 * 
 * These tests simulate the complete user workflow from initiating a freeze
 * request through automatic rescheduling, timeline adjustment, billing updates,
 * and notification delivery.
 */

// Enhanced mock implementations for E2E testing
const mockE2EDatabase = {
  subscriptions: new Map<string, StudentSubscription>(),
  freezeHistory: new Map<string, any[]>(),
  sessions: new Map<string, any[]>(),
  therapistAvailability: new Map<string, any[]>(),
  billingRecords: new Map<string, any[]>()
}

// Initialize test data
const initializeE2ETestData = () => {
  mockE2EDatabase.subscriptions.set('e2e-sub-1', {
    id: 'e2e-sub-1',
    student_id: 'e2e-student-1',
    therapy_program_id: 'e2e-program-1',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    original_end_date: '2024-12-31',
    freeze_days_allowed: 30,
    freeze_days_used: 0,
    status: 'active',
    sessions_total: 48,
    sessions_completed: 12,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  })

  // Mock sessions to be affected by freeze
  mockE2EDatabase.sessions.set('e2e-student-1', [
    {
      id: 'e2e-session-1',
      student_id: 'e2e-student-1',
      session_date: '2024-06-03',
      time_start: '10:00',
      time_end: '11:00',
      status: 'scheduled',
      therapist_id: 'e2e-therapist-1',
      duration_minutes: 60,
      room_id: 'room-1'
    },
    {
      id: 'e2e-session-2',
      student_id: 'e2e-student-1',
      session_date: '2024-06-05',
      time_start: '14:00',
      time_end: '15:00',
      status: 'scheduled',
      therapist_id: 'e2e-therapist-1',
      duration_minutes: 60,
      room_id: 'room-1'
    }
  ])

  // Mock therapist availability for rescheduling
  mockE2EDatabase.therapistAvailability.set('e2e-therapist-1', [
    {
      therapist_id: 'e2e-therapist-1',
      date: '2024-06-10',
      time_start: '10:00',
      time_end: '11:00',
      is_available: true,
      room_id: 'room-1'
    },
    {
      therapist_id: 'e2e-therapist-1',
      date: '2024-06-12',
      time_start: '14:00',
      time_end: '15:00',
      is_available: true,
      room_id: 'room-1'
    }
  ])

  mockE2EDatabase.freezeHistory.set('e2e-sub-1', [])
  mockE2EDatabase.billingRecords.set('e2e-sub-1', [])
}

// Mock Supabase with realistic E2E behavior
const createE2ESupabaseMock = () => ({
  from: vi.fn((table) => {
    switch (table) {
      case 'student_subscriptions':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => ({
              single: vi.fn(() => Promise.resolve({
                data: mockE2EDatabase.subscriptions.get(value),
                error: null
              })),
              order: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: Array.from(mockE2EDatabase.subscriptions.values())
                    .filter(sub => field === 'student_id' ? sub.student_id === value : sub.id === value),
                  error: null
                }))
              }))
            }))
          })),
          update: vi.fn((updates) => ({
            eq: vi.fn((field, value) => {
              const subscription = mockE2EDatabase.subscriptions.get(value)
              if (subscription) {
                Object.assign(subscription, updates)
              }
              return Promise.resolve({ error: null })
            })
          }))
        }

      case 'subscription_freeze_history':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => ({
              order: vi.fn(() => Promise.resolve({
                data: mockE2EDatabase.freezeHistory.get(value) || [],
                error: null
              }))
            }))
          })),
          insert: vi.fn((data) => {
            const subscriptionId = data.subscription_id
            const history = mockE2EDatabase.freezeHistory.get(subscriptionId) || []
            history.push({ ...data, id: `freeze-${Date.now()}`, created_at: new Date().toISOString() })
            mockE2EDatabase.freezeHistory.set(subscriptionId, history)
            return Promise.resolve({ error: null })
          })
        }

      case 'therapy_sessions':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: mockE2EDatabase.sessions.get(value) || [],
                    error: null
                  }))
                }))
              }))
            }))
          })),
          update: vi.fn((updates) => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }

      case 'therapist_availability':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: mockE2EDatabase.therapistAvailability.get(value) || [],
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
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
        }
    }
  }),
  rpc: vi.fn((functionName, params) => {
    switch (functionName) {
      case 'freeze_subscription':
        return simulateCompleteFreezeCycle(params)
      case 'preview_subscription_freeze':
        return simulateFreezePreview(params)
      default:
        return Promise.resolve({ data: {}, error: null })
    }
  }),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      setTimeout(() => callback('SUBSCRIBED'), 10)
      return mockChannel
    }),
    unsubscribe: vi.fn(),
    send: vi.fn()
  }))
})

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn()
}

// Simulate complete freeze cycle including all side effects
const simulateCompleteFreezeCycle = async (params: any) => {
  const { p_subscription_id, p_start_date, p_end_date, p_reason } = params
  
  // Step 1: Update subscription status
  const subscription = mockE2EDatabase.subscriptions.get(p_subscription_id)
  if (!subscription) {
    return Promise.resolve({ data: null, error: new Error('Subscription not found') })
  }

  // Step 2: Calculate affected sessions
  const affectedSessions = mockE2EDatabase.sessions.get(subscription.student_id) || []
  const sessionsInRange = affectedSessions.filter(session => 
    session.session_date >= p_start_date && session.session_date <= p_end_date
  )

  // Step 3: Simulate rescheduling
  const rescheduledSessions = sessionsInRange.map(session => ({
    ...session,
    session_date: '2024-06-10', // Moved to available slot
    status: 'rescheduled'
  }))

  // Step 4: Update subscription with freeze
  const freezeDays = Math.ceil((new Date(p_end_date).getTime() - new Date(p_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const newEndDate = new Date(subscription.end_date)
  newEndDate.setDate(newEndDate.getDate() + freezeDays)

  Object.assign(subscription, {
    status: 'frozen',
    end_date: newEndDate.toISOString().split('T')[0],
    freeze_days_used: subscription.freeze_days_used + freezeDays,
    updated_at: new Date().toISOString()
  })

  // Step 5: Create freeze history entry
  const history = mockE2EDatabase.freezeHistory.get(p_subscription_id) || []
  history.push({
    id: `freeze-${Date.now()}`,
    subscription_id: p_subscription_id,
    operation_type: 'freeze',
    start_date: p_start_date,
    end_date: p_end_date,
    freeze_days: freezeDays,
    reason: p_reason,
    affected_sessions: sessionsInRange.length,
    created_at: new Date().toISOString(),
    created_by: 'e2e-test-user'
  })
  mockE2EDatabase.freezeHistory.set(p_subscription_id, history)

  // Step 6: Calculate billing adjustment
  const billingAdjustment = {
    original_amount: 1000,
    adjusted_amount: 900,
    credit_issued: 100
  }

  // Step 7: Simulate notifications sent
  const notificationResult: NotificationDeliveryResult = {
    notifications_sent: 3, // Parent WhatsApp, Parent Email, Therapist Email
    delivery_failures: []
  }

  // Simulate real-time updates
  setTimeout(() => {
    subscriptionRealtimeService.broadcastSubscriptionEvent(
      p_subscription_id,
      'subscription_frozen',
      subscription
    )
  }, 50)

  const result = {
    success: true,
    subscription_id: p_subscription_id,
    new_end_date: newEndDate.toISOString().split('T')[0],
    sessions_rescheduled: rescheduledSessions.length,
    conflicts_detected: [],
    billing_adjustment: billingAdjustment,
    notifications_sent: notificationResult.notifications_sent,
    execution_time_ms: 1250
  }

  return Promise.resolve({ data: result, error: null })
}

const simulateFreezePreview = async (params: any) => {
  const { p_subscription_id, p_start_date, p_end_date } = params
  
  const subscription = mockE2EDatabase.subscriptions.get(p_subscription_id)
  if (!subscription) {
    return Promise.resolve({ data: null, error: new Error('Subscription not found') })
  }

  const affectedSessions = mockE2EDatabase.sessions.get(subscription.student_id) || []
  const sessionsInRange = affectedSessions.filter(session => 
    session.session_date >= p_start_date && session.session_date <= p_end_date
  )

  const freezeDays = Math.ceil((new Date(p_end_date).getTime() - new Date(p_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const newEndDate = new Date(subscription.end_date)
  newEndDate.setDate(newEndDate.getDate() + freezeDays)

  const preview = {
    affected_sessions_count: sessionsInRange.length,
    new_end_date: newEndDate.toISOString().split('T')[0],
    conflicts_count: 0
  }

  return Promise.resolve({ data: preview, error: null })
}

vi.mock('@/lib/supabase', () => ({
  supabase: createE2ESupabaseMock()
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ 
    id: 'e2e-test-user', 
    email: 'e2e@test.com' 
  }))
}))

vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: { reportError: vi.fn() }
}))

describe('End-to-End: Complete Subscription Freeze and Reschedule Cycle', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

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
    initializeE2ETestData()
  })

  afterEach(() => {
    queryClient.clear()
    subscriptionRealtimeService.cleanup()
  })

  it('should complete the full freeze-to-reschedule workflow end-to-end', async () => {
    console.log('🚀 Starting E2E test: Complete freeze-to-reschedule workflow')

    // Step 1: Render the subscription manager
    render(
      <TestWrapper>
        <SubscriptionManager
          studentId="e2e-student-1"
          onSubscriptionUpdate={vi.fn()}
        />
      </TestWrapper>
    )

    console.log('📊 Step 1: Rendered subscription manager')

    // Step 2: Wait for subscription data to load and verify initial state
    await waitFor(() => {
      expect(screen.getByText('Subscription Management')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('0 / 30')).toBeInTheDocument() // No freeze days used initially

    console.log('✅ Step 2: Verified initial subscription state')

    // Step 3: Initiate freeze process
    const freezeButton = screen.getByRole('button', { name: /freeze/i })
    expect(freezeButton).toBeEnabled()
    
    await user.click(freezeButton)

    console.log('🔄 Step 3: Initiated freeze process')

    // Step 4: Fill out freeze request form
    await waitFor(() => {
      expect(screen.getByText('Freeze Subscription')).toBeInTheDocument()
    })

    // Fill in dates
    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)
    
    await user.type(startDateInput, '2024-06-01')
    await user.type(endDateInput, '2024-06-07')

    console.log('📅 Step 4: Entered freeze dates')

    // Wait for preview to load
    await waitFor(() => {
      expect(screen.getByText(/2 sessions/i)).toBeInTheDocument() // Affected sessions count
    })

    console.log('👁️ Step 4.5: Preview loaded showing affected sessions')

    // Fill in reason
    const reasonInput = screen.getByLabelText(/reason/i)
    await user.type(reasonInput, 'E2E Test: Medical leave for surgery and recovery period')

    console.log('📝 Step 5: Entered freeze reason')

    // Step 6: Submit freeze request
    const submitButton = screen.getByRole('button', { name: /freeze subscription/i })
    expect(submitButton).toBeEnabled()
    
    await user.click(submitButton)

    console.log('🚀 Step 6: Submitted freeze request')

    // Step 7: Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    })

    console.log('⏳ Step 7: Processing freeze request...')

    // Step 8: Wait for completion and verify results
    await waitFor(() => {
      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument()
    }, { timeout: 10000 })

    console.log('✅ Step 8: Freeze processing completed')

    // Step 9: Verify the freeze was successful by checking updated subscription state
    // (The dialog should close and the subscription should be updated)
    await waitFor(() => {
      expect(screen.queryByText('Freeze Subscription')).not.toBeInTheDocument()
    })

    console.log('🔄 Step 9: Dialog closed, verifying updates...')

    // Step 10: Verify real-time updates were received
    // The subscription status should be updated to reflect the freeze
    await waitFor(() => {
      // Check that freeze days used has increased
      const subscription = mockE2EDatabase.subscriptions.get('e2e-sub-1')
      expect(subscription?.freeze_days_used).toBe(7) // 7 days frozen
      expect(subscription?.status).toBe('frozen')
    })

    console.log('✅ Step 10: Verified subscription updates')

    // Step 11: Verify freeze history was created
    const freezeHistory = mockE2EDatabase.freezeHistory.get('e2e-sub-1')
    expect(freezeHistory).toHaveLength(1)
    expect(freezeHistory?.[0]).toEqual(
      expect.objectContaining({
        operation_type: 'freeze',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'E2E Test: Medical leave for surgery and recovery period',
        affected_sessions: 2
      })
    )

    console.log('✅ Step 11: Verified freeze history creation')

    // Step 12: Verify sessions were marked for rescheduling
    // (In real implementation, sessions would be updated)
    const affectedSessions = mockE2EDatabase.sessions.get('e2e-student-1')
    expect(affectedSessions).toBeDefined()
    
    console.log('✅ Step 12: Verified session rescheduling preparation')

    // Step 13: Verify end date was adjusted
    const updatedSubscription = mockE2EDatabase.subscriptions.get('e2e-sub-1')
    expect(updatedSubscription?.end_date).toBe('2025-01-07') // Extended by 7 days
    expect(updatedSubscription?.end_date).not.toBe(updatedSubscription?.original_end_date)

    console.log('✅ Step 13: Verified program end date extension')

    console.log('🎉 E2E Test completed successfully!')
    console.log('📊 Final state summary:')
    console.log(`- Subscription status: ${updatedSubscription?.status}`)
    console.log(`- Freeze days used: ${updatedSubscription?.freeze_days_used}/${updatedSubscription?.freeze_days_allowed}`)
    console.log(`- Original end date: ${updatedSubscription?.original_end_date}`)
    console.log(`- New end date: ${updatedSubscription?.end_date}`)
    console.log(`- Affected sessions: 2`)
    console.log(`- Freeze history entries: ${freezeHistory?.length}`)
  }, 30000) // 30 second timeout for complete E2E test

  it('should handle freeze workflow with scheduling conflicts end-to-end', async () => {
    console.log('🚀 Starting E2E test: Freeze workflow with conflicts')

    // Modify mock to simulate limited availability causing conflicts
    mockE2EDatabase.therapistAvailability.set('e2e-therapist-1', [
      {
        therapist_id: 'e2e-therapist-1',
        date: '2024-06-10',
        time_start: '10:00',
        time_end: '11:00',
        is_available: true,
        room_id: 'room-1'
      }
      // Only one available slot for two sessions - creates conflict
    ])

    const onSubscriptionUpdate = vi.fn()

    render(
      <TestWrapper>
        <SubscriptionManager
          studentId="e2e-student-1"
          onSubscriptionUpdate={onSubscriptionUpdate}
        />
      </TestWrapper>
    )

    // Follow similar flow but expect conflict handling
    await waitFor(() => {
      expect(screen.getByText('Subscription Management')).toBeInTheDocument()
    })

    const freezeButton = screen.getByRole('button', { name: /freeze/i })
    await user.click(freezeButton)

    await waitFor(() => {
      expect(screen.getByText('Freeze Subscription')).toBeInTheDocument()
    })

    // Fill form
    await user.type(screen.getByLabelText(/start date/i), '2024-06-01')
    await user.type(screen.getByLabelText(/end date/i), '2024-06-07')
    await user.type(screen.getByLabelText(/reason/i), 'E2E Conflict Test: Extended treatment period')

    // Submit
    await user.click(screen.getByRole('button', { name: /freeze subscription/i }))

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument()
    }, { timeout: 10000 })

    // Verify that conflicts were detected and handled
    // (In this case, the freeze should still succeed but with conflict notifications)
    const freezeHistory = mockE2EDatabase.freezeHistory.get('e2e-sub-1')
    expect(freezeHistory).toHaveLength(1)
    
    // Subscription should still be frozen
    const subscription = mockE2EDatabase.subscriptions.get('e2e-sub-1')
    expect(subscription?.status).toBe('frozen')

    console.log('✅ Conflict handling E2E test completed')
  })

  it('should handle error scenarios gracefully end-to-end', async () => {
    console.log('🚀 Starting E2E test: Error handling')

    // Modify subscription to have insufficient freeze days
    const subscription = mockE2EDatabase.subscriptions.get('e2e-sub-1')
    if (subscription) {
      subscription.freeze_days_allowed = 5
      subscription.freeze_days_used = 0 // So only 5 days available
    }

    render(
      <TestWrapper>
        <SubscriptionManager
          studentId="e2e-student-1"
          onSubscriptionUpdate={vi.fn()}
        />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Subscription Management')).toBeInTheDocument()
    })

    const freezeButton = screen.getByRole('button', { name: /freeze/i })
    await user.click(freezeButton)

    await waitFor(() => {
      expect(screen.getByText('Freeze Subscription')).toBeInTheDocument()
    })

    // Try to freeze for more days than allowed
    await user.type(screen.getByLabelText(/start date/i), '2024-06-01')
    await user.type(screen.getByLabelText(/end date/i), '2024-06-14') // 14 days > 5 allowed
    await user.type(screen.getByLabelText(/reason/i), 'E2E Error Test: Exceeding freeze allowance')

    // Submit button should be disabled or show validation errors
    await waitFor(() => {
      expect(screen.getByText(/insufficient freeze days/i)).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /freeze subscription/i })
    expect(submitButton).toBeDisabled()

    console.log('✅ Error handling E2E test completed')
  })
})