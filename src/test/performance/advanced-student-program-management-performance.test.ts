import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'

// Import services for performance testing
import { IndividualizedEnrollmentService } from '@/services/enrollment/individualized-enrollment-service'
import { ProgramTemplateService } from '@/services/enrollment/program-template-service'
import { TherapistWorkloadService } from '@/services/therapist/therapist-workload-service'
import { CapacityManagementService } from '@/services/therapist/capacity-management-service'
import { TherapistSubstitutionService } from '@/services/therapist/therapist-substitution-service'
import { TherapistPerformanceTrackingService } from '@/services/therapist/therapist-performance-tracking-service'

// Mock Supabase for consistent performance testing
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
        delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}))

describe('Advanced Student Program Management - Performance Tests', () => {
  let enrollmentService: IndividualizedEnrollmentService
  let templateService: ProgramTemplateService
  let workloadService: TherapistWorkloadService
  let capacityService: CapacityManagementService
  let substitutionService: TherapistSubstitutionService
  let performanceService: TherapistPerformanceTrackingService

  const performanceThresholds = {
    enrollmentCreation: 500, // ms
    workloadCalculation: 200, // ms
    capacityValidation: 300, // ms
    substitutionPlanning: 1000, // ms
    performanceTracking: 150, // ms
    bulkOperations: 5000, // ms
    memoryUsage: 50 * 1024 * 1024 // 50MB
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    enrollmentService = new IndividualizedEnrollmentService()
    templateService = new ProgramTemplateService()
    workloadService = new TherapistWorkloadService()
    capacityService = new CapacityManagementService()
    substitutionService = new TherapistSubstitutionService()
    performanceService = new TherapistPerformanceTrackingService()
  })

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  const measurePerformance = async <T>(
    operation: () => Promise<T>,
    description: string
  ): Promise<{ result: T; duration: number; memory?: number }> => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    const startTime = performance.now()
    
    const result = await operation()
    
    const endTime = performance.now()
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const duration = endTime - startTime
    const memoryUsed = finalMemory - initialMemory

    console.log(`${description}: ${duration.toFixed(2)}ms${memoryUsed > 0 ? `, ${(memoryUsed / 1024 / 1024).toFixed(2)}MB` : ''}`)
    
    return {
      result,
      duration,
      memory: memoryUsed > 0 ? memoryUsed : undefined
    }
  }

  describe('Individual Service Performance', () => {
    it('should create individualized enrollment within performance threshold', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        program_template_id: 'template-123',
        assigned_therapist_id: 'therapist-123',
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

      const { duration } = await measurePerformance(
        () => enrollmentService.createIndividualizedEnrollment(enrollmentData),
        'Individual enrollment creation'
      )

      expect(duration).toBeLessThan(performanceThresholds.enrollmentCreation)
    })

    it('should calculate therapist workload within performance threshold', async () => {
      const { duration } = await measurePerformance(
        () => workloadService.calculateWorkload('therapist-123'),
        'Therapist workload calculation'
      )

      expect(duration).toBeLessThan(performanceThresholds.workloadCalculation)
    })

    it('should validate capacity assignment within performance threshold', async () => {
      const assignmentRequest = {
        therapist_id: 'therapist-123',
        student_id: 'student-123',
        program_template_id: 'template-123',
        sessions_per_week: 3,
        session_duration_minutes: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-01',
        preferred_time_slots: [{
          day_of_week: 1,
          start_time: '10:00',
          duration_minutes: 60
        }],
        priority_level: 'high' as const
      }

      const { duration } = await measurePerformance(
        () => capacityService.validateAssignment(assignmentRequest),
        'Capacity assignment validation'
      )

      expect(duration).toBeLessThan(performanceThresholds.capacityValidation)
    })

    it('should find substitutes within performance threshold', async () => {
      const substitutionRequest = {
        original_therapist_id: 'therapist-123',
        start_date: '2025-09-15',
        end_date: '2025-09-22',
        reason: 'vacation' as const,
        require_same_specialty: true
      }

      const { duration } = await measurePerformance(
        () => substitutionService.findSubstitutes(substitutionRequest),
        'Substitute finding'
      )

      expect(duration).toBeLessThan(performanceThresholds.substitutionPlanning)
    })

    it('should record performance metric within performance threshold', async () => {
      const performanceMetric = {
        therapist_id: 'therapist-123',
        program_template_id: 'template-123',
        student_id: 'student-123',
        metric_type: 'goal_achievement' as const,
        measurement_period: 'weekly' as const,
        metric_value: 85,
        target_value: 80,
        unit: 'percentage',
        context_data: { week: 1 },
        measured_by: 'system'
      }

      const { duration } = await measurePerformance(
        () => performanceService.recordPerformanceMetric(performanceMetric),
        'Performance metric recording'
      )

      expect(duration).toBeLessThan(performanceThresholds.performanceTracking)
    })
  })

  describe('Bulk Operation Performance', () => {
    it('should handle bulk enrollment creation efficiently', async () => {
      const bulkEnrollments = Array.from({ length: 50 }, (_, i) => ({
        student_id: `student-${i}`,
        program_template_id: 'template-123',
        assigned_therapist_id: 'therapist-123',
        individual_start_date: '2025-09-01',
        individual_end_date: '2025-12-01',
        custom_schedule: {
          sessions_per_week: 2 + (i % 3),
          preferred_days: ['monday', 'wednesday']
        },
        program_modifications: {
          intensity_level: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high'
        }
      }))

      const { duration } = await measurePerformance(
        async () => {
          const results = await Promise.all(
            bulkEnrollments.map(enrollment =>
              enrollmentService.createIndividualizedEnrollment(enrollment)
            )
          )
          return results
        },
        'Bulk enrollment creation (50 enrollments)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations)
    })

    it('should handle bulk workload calculations efficiently', async () => {
      const therapistIds = Array.from({ length: 25 }, (_, i) => `therapist-${i}`)

      const { duration } = await measurePerformance(
        async () => {
          const results = await Promise.all(
            therapistIds.map(id => workloadService.calculateWorkload(id))
          )
          return results
        },
        'Bulk workload calculations (25 therapists)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations)
    })

    it('should handle bulk capacity validations efficiently', async () => {
      const assignments = Array.from({ length: 30 }, (_, i) => ({
        therapist_id: `therapist-${i % 10}`,
        student_id: `student-${i}`,
        program_template_id: 'template-123',
        sessions_per_week: 2 + (i % 3),
        session_duration_minutes: 60,
        start_date: '2025-09-01',
        end_date: '2025-12-01',
        preferred_time_slots: [{
          day_of_week: 1 + (i % 5),
          start_time: '10:00',
          duration_minutes: 60
        }],
        priority_level: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high'
      }))

      const { duration } = await measurePerformance(
        async () => {
          const results = await Promise.all(
            assignments.map(assignment =>
              capacityService.validateAssignment(assignment)
            )
          )
          return results
        },
        'Bulk capacity validations (30 assignments)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations)
    })

    it('should process bulk assignment requests efficiently', async () => {
      const bulkAssignmentRequest = {
        assignments: Array.from({ length: 20 }, (_, i) => ({
          therapist_id: `therapist-${i % 5}`,
          student_id: `student-${i}`,
          program_template_id: 'template-123',
          sessions_per_week: 2 + (i % 3),
          session_duration_minutes: 60,
          start_date: '2025-09-01',
          end_date: '2025-12-01',
          preferred_time_slots: [{
            day_of_week: 1 + (i % 5),
            start_time: '10:00',
            duration_minutes: 60
          }],
          priority_level: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high'
        })),
        optimization_strategy: 'balance_all' as const,
        allow_partial_assignments: true,
        max_processing_time_seconds: 30
      }

      const { duration } = await measurePerformance(
        () => capacityService.processBulkAssignments(bulkAssignmentRequest),
        'Bulk assignment processing (20 assignments)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not leak memory during service operations', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await enrollmentService.createIndividualizedEnrollment({
          student_id: `student-${i}`,
          program_template_id: 'template-123',
          assigned_therapist_id: 'therapist-123',
          individual_start_date: '2025-09-01',
          individual_end_date: '2025-12-01',
          custom_schedule: { sessions_per_week: 3 },
          program_modifications: {}
        })

        await workloadService.calculateWorkload(`therapist-${i % 3}`)
        
        await performanceService.recordPerformanceMetric({
          therapist_id: `therapist-${i % 3}`,
          program_template_id: 'template-123',
          metric_type: 'goal_achievement',
          measurement_period: 'session',
          metric_value: 80 + i,
          unit: 'percentage',
          context_data: {},
          measured_by: 'system'
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(performanceThresholds.memoryUsage)
      }
    })

    it('should handle large datasets without excessive memory usage', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Generate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        data: `data-${i}`.repeat(100), // Some bulk data
        metrics: Array.from({ length: 10 }, (_, j) => ({
          metric_id: `metric-${i}-${j}`,
          value: Math.random() * 100
        }))
      }))

      // Process large dataset
      await measurePerformance(
        async () => {
          // Simulate processing large dataset
          const processed = largeDataset.map(item => ({
            ...item,
            processed: true,
            summary: item.metrics.reduce((sum, m) => sum + m.value, 0) / item.metrics.length
          }))
          
          return processed.length
        },
        'Large dataset processing (1000 items)'
      )

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(performanceThresholds.memoryUsage * 2) // Allow some leeway for large datasets
      }
    })
  })

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent enrollments efficiently', async () => {
      const concurrentOperations = Array.from({ length: 20 }, (_, i) =>
        enrollmentService.createIndividualizedEnrollment({
          student_id: `student-${i}`,
          program_template_id: 'template-123',
          assigned_therapist_id: `therapist-${i % 5}`,
          individual_start_date: '2025-09-01',
          individual_end_date: '2025-12-01',
          custom_schedule: { sessions_per_week: 2 + (i % 3) },
          program_modifications: {}
        })
      )

      const { duration } = await measurePerformance(
        () => Promise.all(concurrentOperations),
        'Concurrent enrollment creation (20 concurrent)'
      )

      // Concurrent operations should be faster than sequential
      expect(duration).toBeLessThan(performanceThresholds.bulkOperations / 2)
    })

    it('should handle concurrent workload calculations efficiently', async () => {
      const concurrentCalculations = Array.from({ length: 15 }, (_, i) =>
        workloadService.calculateWorkload(`therapist-${i}`)
      )

      const { duration } = await measurePerformance(
        () => Promise.all(concurrentCalculations),
        'Concurrent workload calculations (15 concurrent)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations / 3)
    })

    it('should handle mixed concurrent operations efficiently', async () => {
      const mixedOperations = [
        ...Array.from({ length: 5 }, (_, i) =>
          enrollmentService.createIndividualizedEnrollment({
            student_id: `student-${i}`,
            program_template_id: 'template-123',
            assigned_therapist_id: 'therapist-123',
            individual_start_date: '2025-09-01',
            individual_end_date: '2025-12-01',
            custom_schedule: { sessions_per_week: 3 },
            program_modifications: {}
          })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          workloadService.calculateWorkload(`therapist-${i}`)
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          capacityService.validateAssignment({
            therapist_id: `therapist-${i}`,
            student_id: `student-${i}`,
            program_template_id: 'template-123',
            sessions_per_week: 3,
            session_duration_minutes: 60,
            start_date: '2025-09-01',
            end_date: '2025-12-01',
            preferred_time_slots: [],
            priority_level: 'medium'
          })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          performanceService.recordPerformanceMetric({
            therapist_id: `therapist-${i}`,
            program_template_id: 'template-123',
            metric_type: 'session_quality',
            measurement_period: 'session',
            metric_value: 85 + i,
            unit: 'score',
            context_data: {},
            measured_by: 'system'
          })
        )
      ]

      const { duration } = await measurePerformance(
        () => Promise.all(mixedOperations),
        'Mixed concurrent operations (20 mixed operations)'
      )

      expect(duration).toBeLessThan(performanceThresholds.bulkOperations)
    })
  })

  describe('Scalability Performance', () => {
    it('should maintain performance with increasing data size', async () => {
      const dataSizes = [10, 50, 100, 200]
      const performanceTrend: number[] = []

      for (const size of dataSizes) {
        const operations = Array.from({ length: size }, (_, i) =>
          workloadService.calculateWorkload(`therapist-${i % 10}`)
        )

        const { duration } = await measurePerformance(
          () => Promise.all(operations),
          `Workload calculations (${size} operations)`
        )

        performanceTrend.push(duration)
      }

      // Performance should scale sub-linearly (not grow proportionally to data size)
      const firstRatio = performanceTrend[1] / performanceTrend[0]
      const lastRatio = performanceTrend[3] / performanceTrend[2]
      
      // Last ratio should not be significantly worse than first ratio
      expect(lastRatio).toBeLessThan(firstRatio * 1.5)
    })

    it('should handle therapist pool scaling efficiently', async () => {
      const therapistCounts = [5, 15, 30, 50]
      const scalingResults: number[] = []

      for (const count of therapistCounts) {
        const assignmentRequest = {
          assignments: [{
            therapist_id: 'therapist-target',
            student_id: 'student-123',
            program_template_id: 'template-123',
            sessions_per_week: 3,
            session_duration_minutes: 60,
            start_date: '2025-09-01',
            end_date: '2025-12-01',
            preferred_time_slots: [],
            priority_level: 'high' as const
          }],
          optimization_strategy: 'maximize_compatibility' as const,
          allow_partial_assignments: true,
          max_processing_time_seconds: 30
        }

        // Mock different pool sizes by varying the complexity
        const { duration } = await measurePerformance(
          () => capacityService.processBulkAssignments(assignmentRequest),
          `Assignment with ${count} therapist pool`
        )

        scalingResults.push(duration)
      }

      // Should scale reasonably with therapist pool size
      const maxDuration = Math.max(...scalingResults)
      const minDuration = Math.min(...scalingResults)
      
      // Even with large pools, shouldn't be more than 5x slower
      expect(maxDuration / minDuration).toBeLessThan(5)
    })
  })

  describe('Performance Under Load', () => {
    it('should maintain performance under sustained load', async () => {
      const loadTestDuration = 2000 // 2 seconds
      const startTime = performance.now()
      let operationCount = 0
      const operations: Promise<any>[] = []

      // Generate sustained load
      while (performance.now() - startTime < loadTestDuration) {
        operations.push(
          workloadService.calculateWorkload(`therapist-${operationCount % 10}`)
            .then(() => operationCount++)
        )
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const { duration } = await measurePerformance(
        () => Promise.all(operations),
        `Sustained load test (${operations.length} operations)`
      )

      // Should complete all operations within reasonable time
      expect(duration).toBeLessThan(loadTestDuration * 2)
      expect(operationCount).toBeGreaterThan(0)
    })

    it('should handle peak load bursts efficiently', async () => {
      // Simulate peak load burst
      const burstSize = 100
      const burstOperations = Array.from({ length: burstSize }, (_, i) => {
        const operationType = i % 4
        
        switch (operationType) {
          case 0:
            return enrollmentService.createIndividualizedEnrollment({
              student_id: `student-${i}`,
              program_template_id: 'template-123',
              assigned_therapist_id: `therapist-${i % 10}`,
              individual_start_date: '2025-09-01',
              individual_end_date: '2025-12-01',
              custom_schedule: { sessions_per_week: 3 },
              program_modifications: {}
            })
          
          case 1:
            return workloadService.calculateWorkload(`therapist-${i % 10}`)
          
          case 2:
            return capacityService.validateAssignment({
              therapist_id: `therapist-${i % 10}`,
              student_id: `student-${i}`,
              program_template_id: 'template-123',
              sessions_per_week: 3,
              session_duration_minutes: 60,
              start_date: '2025-09-01',
              end_date: '2025-12-01',
              preferred_time_slots: [],
              priority_level: 'medium'
            })
          
          default:
            return performanceService.recordPerformanceMetric({
              therapist_id: `therapist-${i % 10}`,
              program_template_id: 'template-123',
              metric_type: 'goal_achievement',
              measurement_period: 'session',
              metric_value: 80 + (i % 20),
              unit: 'percentage',
              context_data: {},
              measured_by: 'system'
            })
        }
      })

      const { duration } = await measurePerformance(
        () => Promise.allSettled(burstOperations),
        `Peak load burst (${burstSize} mixed operations)`
      )

      // Should handle burst within reasonable time
      expect(duration).toBeLessThan(performanceThresholds.bulkOperations * 2)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in core operations', async () => {
      const baselineOperations = [
        () => enrollmentService.createIndividualizedEnrollment({
          student_id: 'student-baseline',
          program_template_id: 'template-123',
          assigned_therapist_id: 'therapist-123',
          individual_start_date: '2025-09-01',
          individual_end_date: '2025-12-01',
          custom_schedule: { sessions_per_week: 3 },
          program_modifications: {}
        }),
        () => workloadService.calculateWorkload('therapist-baseline'),
        () => capacityService.validateAssignment({
          therapist_id: 'therapist-baseline',
          student_id: 'student-baseline',
          program_template_id: 'template-123',
          sessions_per_week: 3,
          session_duration_minutes: 60,
          start_date: '2025-09-01',
          end_date: '2025-12-01',
          preferred_time_slots: [],
          priority_level: 'medium'
        }),
        () => performanceService.recordPerformanceMetric({
          therapist_id: 'therapist-baseline',
          program_template_id: 'template-123',
          metric_type: 'session_quality',
          measurement_period: 'session',
          metric_value: 85,
          unit: 'score',
          context_data: {},
          measured_by: 'system'
        })
      ]

      const baselines = []

      // Establish baselines
      for (const operation of baselineOperations) {
        const { duration } = await measurePerformance(
          operation,
          'Baseline operation'
        )
        baselines.push(duration)
      }

      // Re-run operations and compare
      for (let i = 0; i < baselineOperations.length; i++) {
        const { duration } = await measurePerformance(
          baselineOperations[i],
          `Regression test operation ${i + 1}`
        )

        // Should not be significantly slower than baseline (allow 50% variance)
        expect(duration).toBeLessThan(baselines[i] * 1.5)
      }
    })
  })
})