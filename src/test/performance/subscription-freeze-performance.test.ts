import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'
import { subscriptionValidationService } from '@/services/subscription-validation'
import { programTimelineManager } from '@/services/program-timeline-management'
import { reschedulingEngine } from '@/services/rescheduling-engine'
import { subscriptionRealtimeService } from '@/services/subscription-realtime'
import type { 
  StudentSubscription, 
  FreezeRequest, 
  ReschedulingRequest,
  ValidationContext
} from '@/types/scheduling'

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  validation: 200, // ms
  timelineCalculation: 500, // ms
  singleSessionRescheduling: 100, // ms
  batchRescheduling: 2000, // ms for 50 sessions
  realtimeSubscription: 50, // ms
  memoryLeak: 1000000 // bytes (1MB)
}

// Mock implementations for performance testing
vi.mock('@/lib/supabase', () => {
  const mockResponse = (data: any, delay = 10) => 
    new Promise(resolve => 
      setTimeout(() => resolve({ data, error: null }), delay)
    )

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => mockResponse(mockSubscriptionData)),
            order: vi.fn(() => ({ single: vi.fn(() => mockResponse([mockSubscriptionData])) })),
            gte: vi.fn(() => ({ 
              lte: vi.fn(() => ({ 
                eq: vi.fn(() => mockResponse(mockSessionsData))
              }))
            }))
          })),
          insert: vi.fn(() => mockResponse({ id: 'new-id' })),
          update: vi.fn(() => ({ eq: vi.fn(() => mockResponse({})) }))
        })),
        upsert: vi.fn(() => mockResponse({}))
      })),
      rpc: vi.fn(() => mockResponse({
        success: true,
        sessions_rescheduled: 10,
        conflicts_detected: [],
        execution_time_ms: 100
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          setTimeout(() => callback('SUBSCRIBED'), 5)
          return mockChannel
        }),
        unsubscribe: vi.fn(),
        send: vi.fn()
      }))
    }
  }
})

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn()
}

const mockSubscriptionData: StudentSubscription = {
  id: 'sub-perf-test',
  student_id: 'student-perf',
  therapy_program_id: 'program-perf',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  original_end_date: '2024-12-31',
  freeze_days_allowed: 30,
  freeze_days_used: 0,
  status: 'active',
  sessions_total: 48,
  sessions_completed: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockSessionsData = Array.from({ length: 50 }, (_, i) => ({
  id: `session-${i}`,
  session_date: `2024-06-${String((i % 30) + 1).padStart(2, '0')}`,
  time_start: '10:00',
  time_end: '11:00',
  status: 'scheduled',
  therapist_id: 'therapist-1',
  duration_minutes: 60
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ 
    id: 'perf-test-user', 
    email: 'perf@test.com' 
  }))
}))

vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: { reportError: vi.fn() }
}))

describe('Subscription Freeze Performance Tests', () => {
  const measureExecutionTime = async <T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; executionTime: number }> => {
    const startTime = performance.now()
    const result = await operation()
    const executionTime = performance.now() - startTime
    
    console.log(`${label}: ${executionTime.toFixed(2)}ms`)
    
    return { result, executionTime }
  }

  const measureMemoryUsage = (): number => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  describe('Validation Performance', () => {
    it('should validate freeze request within performance threshold', async () => {
      const freezeRequest: FreezeRequest = {
        subscription_id: 'sub-perf-test',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Performance test validation case with sufficient detail',
        freeze_days: 7
      }

      const context: ValidationContext = {
        subscription: mockSubscriptionData,
        currentUser: { id: 'perf-test-user' }
      }

      const { result, executionTime } = await measureExecutionTime(
        () => subscriptionValidationService.validateFreezeRequest(freezeRequest, context),
        'Freeze request validation'
      )

      expect(result.valid).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.validation)
    })

    it('should handle batch validation efficiently', async () => {
      const batchSize = 20
      const requests = Array.from({ length: batchSize }, (_, i) => ({
        subscription_id: `sub-perf-${i}`,
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: `Performance test batch validation case ${i}`,
        freeze_days: 7
      }))

      const context: ValidationContext = {
        subscription: mockSubscriptionData,
        currentUser: { id: 'perf-test-user' }
      }

      const startTime = performance.now()

      const results = await Promise.all(
        requests.map(request => 
          subscriptionValidationService.validateFreezeRequest(request, context)
        )
      )

      const totalTime = performance.now() - startTime
      const averageTime = totalTime / batchSize

      expect(results).toHaveLength(batchSize)
      expect(results.every(r => r.valid)).toBe(true)
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.validation)

      console.log(`Batch validation (${batchSize} requests): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`)
    })

    it('should maintain performance under concurrent validation load', async () => {
      const concurrentRequests = 10
      const freezeRequest: FreezeRequest = {
        subscription_id: 'sub-perf-test',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        reason: 'Concurrent performance test validation case',
        freeze_days: 7
      }

      const context: ValidationContext = {
        subscription: mockSubscriptionData,
        currentUser: { id: 'perf-test-user' }
      }

      const { result: results, executionTime } = await measureExecutionTime(
        () => Promise.all(
          Array(concurrentRequests).fill(null).map(() =>
            subscriptionValidationService.validateFreezeRequest(freezeRequest, context)
          )
        ),
        `Concurrent validation (${concurrentRequests} requests)`
      )

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every(r => r.valid)).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.validation * 2) // Allow 2x threshold for concurrent
    })
  })

  describe('Timeline Calculation Performance', () => {
    it('should calculate timeline adjustments efficiently', async () => {
      const { result, executionTime } = await measureExecutionTime(
        () => programTimelineManager.calculateNewEndDate('sub-perf-test', 14),
        'Timeline calculation'
      )

      expect(result.subscription_id).toBe('sub-perf-test')
      expect(result.freeze_days).toBe(14)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.timelineCalculation)
    })

    it('should handle complex timeline calculations with multiple adjustments', async () => {
      const freezeDays = [7, 14, 21, 30] // Multiple freeze periods

      const { result: results, executionTime } = await measureExecutionTime(
        () => Promise.all(
          freezeDays.map(days =>
            programTimelineManager.calculateNewEndDate('sub-perf-test', days, {
              exclude_holidays: ['2024-12-25', '2024-01-01', '2024-07-04'],
              include_weekends: false
            })
          )
        ),
        'Complex timeline calculations'
      )

      expect(results).toHaveLength(freezeDays.length)
      expect(results.every(r => r.adjustment_days > 0)).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.timelineCalculation * 2)
    })

    it('should maintain performance with large date ranges', async () => {
      // Test with subscription spanning multiple years
      const longTermSubscription = {
        ...mockSubscriptionData,
        start_date: '2024-01-01',
        end_date: '2027-12-31' // 4-year program
      }

      const { result, executionTime } = await measureExecutionTime(
        () => programTimelineManager.calculateNewEndDate('sub-perf-test', 365), // 1 year freeze
        'Long-term timeline calculation'
      )

      expect(result.freeze_days).toBe(365)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.timelineCalculation)
    })
  })

  describe('Rescheduling Engine Performance', () => {
    it('should reschedule single session efficiently', async () => {
      const reschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-perf-test',
        student_id: 'student-perf',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-01', // Single day
        freeze_days: 1
      }

      const { result, executionTime } = await measureExecutionTime(
        () => reschedulingEngine.rescheduleSessionsForFreeze(reschedulingRequest),
        'Single session rescheduling'
      )

      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleSessionRescheduling)
    })

    it('should handle batch session rescheduling within threshold', async () => {
      const batchReschedulingRequest: ReschedulingRequest = {
        subscription_id: 'sub-perf-test',
        student_id: 'student-perf',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-30', // 30 days with 50 sessions
        freeze_days: 30
      }

      const { result, executionTime } = await measureExecutionTime(
        () => reschedulingEngine.rescheduleSessionsForFreeze(batchReschedulingRequest),
        'Batch session rescheduling (50 sessions)'
      )

      expect(result.success).toBe(true)
      expect(result.sessions_rescheduled).toBeGreaterThanOrEqual(10)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchRescheduling)
    })

    it('should optimize rescheduling algorithm performance', async () => {
      // Test with complex scheduling constraints
      const complexRequest: ReschedulingRequest = {
        subscription_id: 'sub-perf-test',
        student_id: 'student-perf',
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-07-31', // 2 months
        freeze_days: 60
      }

      const memoryBefore = measureMemoryUsage()

      const { result, executionTime } = await measureExecutionTime(
        () => reschedulingEngine.rescheduleSessionsForFreeze(complexRequest),
        'Complex rescheduling optimization'
      )

      const memoryAfter = measureMemoryUsage()
      const memoryIncrease = memoryAfter - memoryBefore

      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchRescheduling * 2)
      
      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeak)
        console.log(`Memory increase: ${(memoryIncrease / 1024).toFixed(2)} KB`)
      }
    })

    it('should handle concurrent rescheduling requests efficiently', async () => {
      const concurrentRequests = 5
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        subscription_id: `sub-perf-${i}`,
        student_id: `student-perf-${i}`,
        freeze_start_date: '2024-06-01',
        freeze_end_date: '2024-06-07',
        freeze_days: 7
      }))

      const { result: results, executionTime } = await measureExecutionTime(
        () => Promise.all(
          requests.map(request => 
            reschedulingEngine.rescheduleSessionsForFreeze(request)
          )
        ),
        `Concurrent rescheduling (${concurrentRequests} requests)`
      )

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every(r => r.success)).toBe(true)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchRescheduling)
    })
  })

  describe('Real-time Service Performance', () => {
    it('should establish real-time subscriptions quickly', async () => {
      const { executionTime } = await measureExecutionTime(
        () => new Promise<void>((resolve) => {
          const unsubscribe = subscriptionRealtimeService.subscribeToSubscription(
            'sub-perf-test',
            () => {}
          )
          setTimeout(() => {
            unsubscribe()
            resolve()
          }, 10)
        }),
        'Real-time subscription setup'
      )

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.realtimeSubscription)
    })

    it('should handle multiple concurrent subscriptions efficiently', async () => {
      const subscriptionCount = 20
      const subscriptionIds = Array.from({ length: subscriptionCount }, (_, i) => `sub-perf-${i}`)

      const { executionTime } = await measureExecutionTime(
        () => new Promise<void>((resolve) => {
          const unsubscribes = subscriptionIds.map(id =>
            subscriptionRealtimeService.subscribeToSubscription(id, () => {})
          )

          setTimeout(() => {
            unsubscribes.forEach(unsub => unsub())
            resolve()
          }, 50)
        }),
        `Multiple real-time subscriptions (${subscriptionCount})`
      )

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.realtimeSubscription * 5)
    })

    it('should handle high-frequency events efficiently', async () => {
      const eventCount = 100
      const eventHandler = vi.fn()
      
      const unsubscribe = subscriptionRealtimeService.subscribeToSubscription(
        'sub-perf-test',
        eventHandler
      )

      const { executionTime } = await measureExecutionTime(
        async () => {
          // Simulate rapid events
          for (let i = 0; i < eventCount; i++) {
            await subscriptionRealtimeService.broadcastSubscriptionEvent(
              'sub-perf-test',
              'subscription_updated',
              { update_count: i }
            )
          }
          
          // Wait for events to be processed
          await new Promise(resolve => setTimeout(resolve, 100))
        },
        `High-frequency events (${eventCount} events)`
      )

      unsubscribe()

      expect(executionTime).toBeLessThan(1000) // 1 second for 100 events
      expect(eventHandler).toHaveBeenCalledTimes(eventCount)
    })
  })

  describe('Memory Management and Cleanup', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 50
      const memoryBefore = measureMemoryUsage()

      // Perform repeated freeze validations
      for (let i = 0; i < iterations; i++) {
        const request: FreezeRequest = {
          subscription_id: `sub-${i}`,
          start_date: '2024-06-01',
          end_date: '2024-06-07',
          reason: `Memory test iteration ${i}`,
          freeze_days: 7
        }

        const context: ValidationContext = {
          subscription: { ...mockSubscriptionData, id: `sub-${i}` },
          currentUser: { id: 'memory-test-user' }
        }

        await subscriptionValidationService.validateFreezeRequest(request, context)

        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc()
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc()
      }

      const memoryAfter = measureMemoryUsage()
      const memoryIncrease = memoryAfter - memoryBefore

      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeak)
        console.log(`Memory increase after ${iterations} iterations: ${(memoryIncrease / 1024).toFixed(2)} KB`)
      }
    })

    it('should cleanup real-time subscriptions properly', async () => {
      const subscriptionCount = 10
      const memoryBefore = measureMemoryUsage()

      // Create and cleanup subscriptions repeatedly
      for (let cycle = 0; cycle < 5; cycle++) {
        const unsubscribes = []

        // Create subscriptions
        for (let i = 0; i < subscriptionCount; i++) {
          const unsubscribe = subscriptionRealtimeService.subscribeToSubscription(
            `sub-cleanup-${i}`,
            () => {}
          )
          unsubscribes.push(unsubscribe)
        }

        // Cleanup subscriptions
        unsubscribes.forEach(unsub => unsub())
        
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Final cleanup
      subscriptionRealtimeService.cleanup()

      if (global.gc) {
        global.gc()
      }

      const memoryAfter = measureMemoryUsage()
      const memoryIncrease = memoryAfter - memoryBefore

      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeak / 2)
        console.log(`Memory increase after subscription cleanup: ${(memoryIncrease / 1024).toFixed(2)} KB`)
      }
    })
  })

  describe('Scalability Tests', () => {
    it('should maintain linear performance scaling', async () => {
      const testSizes = [10, 50, 100, 200]
      const results: Array<{ size: number; timePerItem: number }> = []

      for (const size of testSizes) {
        const requests = Array.from({ length: size }, (_, i) => ({
          subscription_id: `scale-test-${i}`,
          start_date: '2024-06-01',
          end_date: '2024-06-07',
          reason: `Scalability test ${i}`,
          freeze_days: 7
        }))

        const context: ValidationContext = {
          subscription: mockSubscriptionData,
          currentUser: { id: 'scale-test-user' }
        }

        const { executionTime } = await measureExecutionTime(
          () => Promise.all(
            requests.map(request => 
              subscriptionValidationService.validateFreezeRequest(request, context)
            )
          ),
          `Scalability test (${size} requests)`
        )

        const timePerItem = executionTime / size
        results.push({ size, timePerItem })

        console.log(`Size: ${size}, Time per item: ${timePerItem.toFixed(2)}ms`)
      }

      // Check that performance doesn't degrade significantly with size
      const firstTimePerItem = results[0].timePerItem
      const lastTimePerItem = results[results.length - 1].timePerItem
      const degradationFactor = lastTimePerItem / firstTimePerItem

      expect(degradationFactor).toBeLessThan(3) // Allow up to 3x degradation for largest size
    })
  })
})