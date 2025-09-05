import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { subscriptionValidationService } from '@/services/subscription-validation'
import { programTimelineManager } from '@/services/program-timeline-management'
import { reschedulingEngine } from '@/services/rescheduling-engine'
import { SubscriptionManager } from '@/components/students/SubscriptionManager'
import { FreezeSubscriptionDialog } from '@/components/students/FreezeSubscriptionDialog'
import type { 
  StudentSubscription, 
  FreezeRequest, 
  ValidationResult,
  TimelineAdjustment,
  ReschedulingRequest
} from '@/types/scheduling'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({ single: vi.fn() })),
          gte: vi.fn(() => ({ lte: vi.fn(() => ({ eq: vi.fn() })) }))
        })),
        insert: vi.fn(),
        update: vi.fn(() => ({ eq: vi.fn() })),
        delete: vi.fn(() => ({ eq: vi.fn() }))
      })),
      rpc: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({ on: vi.fn() })),
        subscribe: vi.fn()
      }))
    }))
  }
}))

// Mock authentication
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ id: 'test-user-id', email: 'test@example.com' }))
}))

// Mock error monitoring
vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn()
  }
}))

describe('Subscription Freeze Logic', () => {
  const mockSubscription: StudentSubscription = {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Subscription Validation Service', () => {
    it('should validate a valid freeze request', async () => {
      const validRequest: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Medical leave for surgery recovery',
        freeze_days: 7
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(validRequest, context)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.can_proceed).toBe(true)
    })

    it('should reject freeze request with insufficient freeze days', async () => {
      const invalidRequest: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        reason: 'Extended vacation',
        freeze_days: 30 // More than available (25 remaining)
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(invalidRequest, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'freeze_days',
          code: 'INSUFFICIENT_FREEZE_DAYS',
          severity: 'error'
        })
      )
    })

    it('should reject freeze request with invalid date range', async () => {
      const invalidRequest: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-10',
        end_date: '2024-06-05', // End before start
        reason: 'Invalid date range test',
        freeze_days: 5
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(invalidRequest, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'end_date',
          code: 'INVALID_RANGE',
          severity: 'error'
        })
      )
    })

    it('should reject freeze request for non-active subscription', async () => {
      const inactiveSubscription = {
        ...mockSubscription,
        status: 'completed' as const
      }

      const request: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Test freeze on completed subscription',
        freeze_days: 7
      }

      const context = {
        subscription: inactiveSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(request, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'status',
          code: 'INVALID_STATUS',
          severity: 'error'
        })
      )
    })

    it('should validate reason field requirements', async () => {
      const requestWithShortReason: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'sick', // Too short
        freeze_days: 7
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(requestWithShortReason, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'reason',
          code: 'TOO_SHORT',
          severity: 'error'
        })
      )
    })

    it('should validate freeze duration limits', async () => {
      const longFreezeRequest: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-07-15', // 45 days (exceeds max of 30)
        reason: 'Extended medical treatment requiring long freeze period',
        freeze_days: 45
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(longFreezeRequest, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'duration',
          code: 'TOO_LONG',
          severity: 'error'
        })
      )
    })
  })

  describe('Program Timeline Manager', () => {
    it('should calculate new end date correctly', async () => {
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockSubscription,
                therapy_program: {
                  id: 'program-789',
                  name_ar: 'برنامج العلاج',
                  name_en: 'Therapy Program',
                  exclude_weekends: false
                }
              },
              error: null
            })
          })
        })
      })

      const adjustment = await programTimelineManager.calculateNewEndDate('sub-123', 7)

      expect(adjustment).toEqual(
        expect.objectContaining({
          subscription_id: 'sub-123',
          original_end_date: '2024-12-31',
          freeze_days: 7,
          adjustment_days: 7,
          calculation_method: 'calendar_days'
        })
      )
      expect(adjustment.new_end_date).toBe('2025-01-07')
    })

    it('should adjust for business days when weekends excluded', async () => {
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockSubscription,
                therapy_program: {
                  id: 'program-789',
                  name_ar: 'برنامج العلاج',
                  name_en: 'Therapy Program',
                  exclude_weekends: true
                }
              },
              error: null
            })
          })
        })
      })

      const adjustment = await programTimelineManager.calculateNewEndDate('sub-123', 5)

      expect(adjustment.calculation_method).toBe('business_days_only')
      expect(adjustment.adjustment_days).toBeGreaterThan(5) // Should add extra days for weekends
    })

    it('should calculate proportional billing adjustment', async () => {
      const mockSubscriptionWithBilling = {
        ...mockSubscription,
        therapy_program: {
          monthly_price: 1000,
          billing_cycle: 'monthly'
        }
      }

      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSubscriptionWithBilling,
              error: null
            })
          })
        })
      })

      const adjustment = await programTimelineManager.adjustBillingCycle(
        'sub-123',
        '2024-06-01',
        '2024-06-07',
        'proportional'
      )

      expect(adjustment.adjustment_type).toBe('proportional')
      expect(adjustment.original_amount).toBe(1000)
      expect(adjustment.credit_issued).toBeGreaterThan(0)
      expect(adjustment.adjusted_amount).toBeLessThan(1000)
    })
  })

  describe('Rescheduling Engine', () => {
    it('should handle rescheduling request with available slots', async () => {
      const reschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-123',
        student_id: 'student-456',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-07',
        freeze_days: 7
      }

      // Mock affected sessions
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'session-1',
                      session_date: '2024-06-03',
                      time_start: '10:00',
                      time_end: '11:00',
                      therapist_id: 'therapist-1',
                      duration_minutes: 60
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      // Mock therapist availability
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    therapist_id: 'therapist-1',
                    date: '2024-06-10',
                    time_start: '10:00',
                    time_end: '11:00',
                    is_available: true
                  }
                ],
                error: null
              })
            })
          })
        })
      })

      const result = await reschedulingEngine.rescheduleSessionsForFreeze(reschedulingRequest)

      expect(result.success).toBe(true)
      expect(result.sessions_rescheduled).toBe(1)
      expect(result.conflicts_detected).toHaveLength(0)
      expect(result.execution_time_ms).toBeGreaterThan(0)
    })

    it('should detect scheduling conflicts', async () => {
      const reschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-123',
        student_id: 'student-456',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-07',
        freeze_days: 7
      }

      // Mock sessions with no available alternatives
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'session-1',
                      session_date: '2024-06-03',
                      therapist_id: 'therapist-1'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      // Mock no available slots
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [], // No availability
                error: null
              })
            })
          })
        })
      })

      const result = await reschedulingEngine.rescheduleSessionsForFreeze(reschedulingRequest)

      expect(result.success).toBe(true) // Operation completes but with conflicts
      expect(result.conflicts_detected.length).toBeGreaterThan(0)
      expect(result.conflicts_detected[0]).toEqual(
        expect.objectContaining({
          type: 'no_slot_available',
          session_id: 'session-1',
          severity: 'high'
        })
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const request: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Database error test case',
        freeze_days: 7
      }

      // Mock database error
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed')
            })
          })
        })
      })

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(request, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'system',
          code: 'VALIDATION_ERROR'
        })
      )
    })

    it('should handle concurrent freeze requests', async () => {
      const request1: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'First freeze request',
        freeze_days: 7
      }

      const request2: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-05',
        end_date: '2024-06-12',
        reason: 'Overlapping freeze request',
        freeze_days: 8
      }

      // Mock existing freeze in the date range
      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'freeze-1',
                      subscription_id: 'sub-123',
                      operation_type: 'freeze',
                      start_date: '2024-06-01',
                      end_date: '2024-06-07'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const result = await subscriptionValidationService.validateFreezeRequest(request2, context)

      const overlapRule = result.business_rules.find(rule => rule.rule_name === 'no_overlapping_freezes')
      expect(overlapRule?.passed).toBe(false)
    })
  })

  describe('Performance Tests', () => {
    it('should complete validation within performance threshold', async () => {
      const request: FreezeRequest = {
        subscription_id: 'sub-123',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Performance test case',
        freeze_days: 7
      }

      const context = {
        subscription: mockSubscription,
        currentUser: { id: 'user-123' }
      }

      const startTime = Date.now()
      await subscriptionValidationService.validateFreezeRequest(request, context)
      const executionTime = Date.now() - startTime

      // Validation should complete within 500ms
      expect(executionTime).toBeLessThan(500)
    })

    it('should handle batch session rescheduling efficiently', async () => {
      // Mock 20 sessions to reschedule
      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        session_date: `2024-06-${String(i + 1).padStart(2, '0')}`,
        time_start: '10:00',
        time_end: '11:00',
        therapist_id: 'therapist-1',
        duration_minutes: 60
      }))

      vi.mocked(require('@/lib/supabase').supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockSessions,
                  error: null
                })
              })
            })
          })
        })
      })

      const reschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-123',
        student_id: 'student-456',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-20',
        freeze_days: 20
      }

      const startTime = Date.now()
      const result = await reschedulingEngine.rescheduleSessionsForFreeze(reschedulingRequest)
      const executionTime = Date.now() - startTime

      // Batch rescheduling should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000)
      expect(result.execution_time_ms).toBeGreaterThan(0)
    })
  })
})

// Test helper function to create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}