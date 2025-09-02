import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'
import { ScheduleOptimizationService } from '@/services/schedule-optimization-service'
import { ScheduleAdjustmentService } from '@/services/schedule-adjustment-algorithms'
import { BulkReschedulingService } from '@/services/bulk-rescheduling-service'
import { SchedulingIntegrationService } from '@/services/scheduling-integration-service'
import type {
  ScheduledSession,
  TherapistAvailability,
  OptimizationConstraints,
  PerformanceMetrics,
  OptimizationResult,
  BulkReschedulingOperation,
  GeneticAlgorithmConfig,
  SimulatedAnnealingConfig,
  ConstraintSatisfactionConfig
} from '@/types/scheduling'

// Performance test configurations
const PERFORMANCE_TARGETS = {
  SMALL_DATASET: { sessions: 50, maxTime: 1000 }, // 1 second
  MEDIUM_DATASET: { sessions: 200, maxTime: 3000 }, // 3 seconds
  LARGE_DATASET: { sessions: 500, maxTime: 8000 }, // 8 seconds
  XLARGE_DATASET: { sessions: 1000, maxTime: 15000 }, // 15 seconds
  OPTIMIZATION_TARGET: 5000, // 5 seconds for optimization algorithms
  BULK_OPERATION_TARGET: 10000, // 10 seconds for bulk operations
  CONFLICT_RESOLUTION_TARGET: 2000, // 2 seconds for conflict detection
  MEMORY_LIMIT: 100 * 1024 * 1024 // 100MB memory limit
}

// Mock data generators for performance testing
const generateMockSessions = (count: number): ScheduledSession[] => {
  const sessions: ScheduledSession[] = []
  const startDate = new Date('2025-09-01')
  
  for (let i = 0; i < count; i++) {
    const sessionDate = new Date(startDate)
    sessionDate.setDate(startDate.getDate() + Math.floor(i / 10))
    
    sessions.push({
      id: `session-${i + 1}`,
      student_id: `student-${(i % 50) + 1}`,
      therapist_id: `therapist-${(i % 10) + 1}`,
      therapy_program_id: `program-${(i % 20) + 1}`,
      session_date: sessionDate.toISOString().split('T')[0],
      start_time: `${String(9 + (i % 8)).padStart(2, '0')}:00`,
      end_time: `${String(9 + (i % 8) + 1).padStart(2, '0')}:00`,
      session_type: ['speech_therapy', 'occupational_therapy', 'physical_therapy'][i % 3] as any,
      status: ['scheduled', 'in_progress', 'completed'][i % 3] as any,
      room_id: `room-${(i % 15) + 1}`,
      notes: `Performance test session ${i + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
  
  return sessions
}

const generateMockAvailabilities = (therapistCount: number, dayCount: number): TherapistAvailability[] => {
  const availabilities: TherapistAvailability[] = []
  const startDate = new Date('2025-09-01')
  
  for (let t = 1; t <= therapistCount; t++) {
    for (let d = 0; d < dayCount; d++) {
      const availabilityDate = new Date(startDate)
      availabilityDate.setDate(startDate.getDate() + d)
      
      availabilities.push({
        id: `availability-${t}-${d}`,
        therapist_id: `therapist-${t}`,
        availability_date: availabilityDate.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        status: 'available',
        max_sessions: 8,
        break_times: [{ start: '12:00', end: '13:00' }],
        special_notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }
  
  return availabilities
}

const generateOptimizationConstraints = (sessionCount: number): OptimizationConstraints => ({
  therapist_constraints: {
    max_sessions_per_day: 8,
    break_duration_minutes: 60,
    preferred_session_types: [],
    avoid_back_to_back: false
  },
  student_constraints: {
    preferred_times: ['09:00-12:00', '14:00-17:00'],
    avoid_times: ['12:00-13:00'],
    max_sessions_per_day: 2,
    minimum_break_between_sessions: 30
  },
  facility_constraints: {
    room_capacity: 15,
    equipment_requirements: {},
    accessibility_needs: []
  },
  optimization_goals: {
    minimize_therapist_travel: true,
    maximize_room_utilization: true,
    balance_therapist_workload: true,
    minimize_gaps: true,
    priority_weights: {
      therapist_preference: 0.3,
      student_preference: 0.4,
      efficiency: 0.2,
      cost: 0.1
    }
  }
})

// Memory usage monitoring utility
class MemoryMonitor {
  private initialMemory: number
  private peakMemory: number

  constructor() {
    this.initialMemory = this.getCurrentMemoryUsage()
    this.peakMemory = this.initialMemory
  }

  getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    // Fallback for browser environment
    return (performance as any).memory?.usedJSHeapSize || 0
  }

  updatePeakMemory(): void {
    const current = this.getCurrentMemoryUsage()
    if (current > this.peakMemory) {
      this.peakMemory = current
    }
  }

  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.initialMemory
  }

  getPeakMemoryUsage(): number {
    return this.peakMemory
  }

  reset(): void {
    this.initialMemory = this.getCurrentMemoryUsage()
    this.peakMemory = this.initialMemory
  }
}

// Performance measurement utility
class PerformanceMeasurement {
  private startTime: number
  private endTime?: number
  private memoryMonitor: MemoryMonitor

  constructor() {
    this.startTime = performance.now()
    this.memoryMonitor = new MemoryMonitor()
  }

  finish(): PerformanceMetrics {
    this.endTime = performance.now()
    this.memoryMonitor.updatePeakMemory()

    return {
      execution_time_ms: this.endTime - this.startTime,
      memory_usage_mb: this.memoryMonitor.getMemoryDelta() / (1024 * 1024),
      peak_memory_mb: this.memoryMonitor.getPeakMemoryUsage() / (1024 * 1024),
      cpu_usage_percent: 0, // Would need process.cpuUsage() for accurate measurement
      success_rate: 1.0
    }
  }
}

describe('Scheduling Optimization Performance Tests', () => {
  let optimizationService: ScheduleOptimizationService
  let adjustmentService: ScheduleAdjustmentService
  let bulkService: BulkReschedulingService
  let integrationService: SchedulingIntegrationService

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Initialize services
    optimizationService = new ScheduleOptimizationService()
    adjustmentService = new ScheduleAdjustmentService()
    bulkService = new BulkReschedulingService()
    integrationService = new SchedulingIntegrationService()

    // Force garbage collection if available
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Schedule Generation Performance', () => {
    it('generates schedules for small datasets within 1 second', async () => {
      const sessions = generateMockSessions(PERFORMANCE_TARGETS.SMALL_DATASET.sessions)
      const availabilities = generateMockAvailabilities(5, 7)
      const constraints = generateOptimizationConstraints(sessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions,
        therapist_availabilities: availabilities,
        constraints,
        optimization_algorithm: 'genetic_algorithm'
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.SMALL_DATASET.maxTime)
      expect(metrics.memory_usage_mb).toBeLessThan(50) // 50MB limit for small datasets
      expect(result.optimized_sessions).toBeDefined()
      expect(result.optimization_score).toBeGreaterThan(0.7) // Minimum quality threshold
    })

    it('generates schedules for medium datasets within 3 seconds', async () => {
      const sessions = generateMockSessions(PERFORMANCE_TARGETS.MEDIUM_DATASET.sessions)
      const availabilities = generateMockAvailabilities(10, 14)
      const constraints = generateOptimizationConstraints(sessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions,
        therapist_availabilities: availabilities,
        constraints,
        optimization_algorithm: 'simulated_annealing'
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.MEDIUM_DATASET.maxTime)
      expect(metrics.memory_usage_mb).toBeLessThan(75) // 75MB limit for medium datasets
      expect(result.optimized_sessions).toBeDefined()
      expect(result.optimization_score).toBeGreaterThan(0.6) // Slightly lower threshold for larger datasets
    })

    it('generates schedules for large datasets within 8 seconds', async () => {
      const sessions = generateMockSessions(PERFORMANCE_TARGETS.LARGE_DATASET.sessions)
      const availabilities = generateMockAvailabilities(20, 21)
      const constraints = generateOptimizationConstraints(sessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions,
        therapist_availabilities: availabilities,
        constraints,
        optimization_algorithm: 'constraint_satisfaction'
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.LARGE_DATASET.maxTime)
      expect(metrics.memory_usage_mb).toBeLessThan(100) // 100MB limit for large datasets
      expect(result.optimized_sessions).toBeDefined()
      expect(result.optimization_score).toBeGreaterThan(0.5) // Lower threshold for very large datasets
    })

    it('handles extra-large datasets within acceptable limits', async () => {
      const sessions = generateMockSessions(PERFORMANCE_TARGETS.XLARGE_DATASET.sessions)
      const availabilities = generateMockAvailabilities(30, 30)
      const constraints = generateOptimizationConstraints(sessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions,
        therapist_availabilities: availabilities,
        constraints,
        optimization_algorithm: 'hybrid_approach',
        performance_mode: 'high_performance' // Enable performance optimizations
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.XLARGE_DATASET.maxTime)
      expect(metrics.memory_usage_mb).toBeLessThan(150) // 150MB limit for extra-large datasets
      expect(result.optimized_sessions).toBeDefined()
      expect(result.optimization_score).toBeGreaterThan(0.4) // Minimum acceptable quality
    })
  })

  describe('Algorithm-Specific Performance', () => {
    it('genetic algorithm meets performance targets with quality optimization', async () => {
      const sessions = generateMockSessions(300)
      const availabilities = generateMockAvailabilities(15, 14)
      const constraints = generateOptimizationConstraints(sessions.length)

      const geneticConfig: GeneticAlgorithmConfig = {
        population_size: 50,
        generations: 100,
        mutation_rate: 0.1,
        crossover_rate: 0.8,
        elite_percentage: 0.2,
        convergence_threshold: 0.001
      }

      const measurement = new PerformanceMeasurement()

      const result = await adjustmentService.optimizeWithGeneticAlgorithm({
        sessions,
        availabilities,
        constraints,
        config: geneticConfig
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.OPTIMIZATION_TARGET)
      expect(result.optimization_score).toBeGreaterThan(0.7)
      expect(result.generations_run).toBeLessThanOrEqual(geneticConfig.generations)
      expect(result.convergence_achieved).toBe(true)
    })

    it('simulated annealing algorithm balances speed and quality', async () => {
      const sessions = generateMockSessions(250)
      const availabilities = generateMockAvailabilities(12, 14)
      const constraints = generateOptimizationConstraints(sessions.length)

      const annealingConfig: SimulatedAnnealingConfig = {
        initial_temperature: 1000,
        cooling_rate: 0.95,
        min_temperature: 1,
        iterations_per_temperature: 100,
        max_iterations: 10000
      }

      const measurement = new PerformanceMeasurement()

      const result = await adjustmentService.optimizeWithSimulatedAnnealing({
        sessions,
        availabilities,
        constraints,
        config: annealingConfig
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.OPTIMIZATION_TARGET)
      expect(result.optimization_score).toBeGreaterThan(0.6)
      expect(result.final_temperature).toBeLessThanOrEqual(annealingConfig.min_temperature)
      expect(result.iterations_completed).toBeLessThanOrEqual(annealingConfig.max_iterations)
    })

    it('constraint satisfaction algorithm handles complex constraints efficiently', async () => {
      const sessions = generateMockSessions(200)
      const availabilities = generateMockAvailabilities(10, 14)
      const complexConstraints = {
        ...generateOptimizationConstraints(sessions.length),
        advanced_constraints: {
          therapist_specialization_matching: true,
          student_progress_continuity: true,
          equipment_sharing_rules: true,
          regulatory_compliance_checks: true
        }
      }

      const cspConfig: ConstraintSatisfactionConfig = {
        max_iterations: 1000,
        constraint_propagation: true,
        backtracking_enabled: true,
        heuristic_ordering: 'most_constrained_first',
        consistency_checks: 'arc_consistency'
      }

      const measurement = new PerformanceMeasurement()

      const result = await adjustmentService.optimizeWithConstraintSatisfaction({
        sessions,
        availabilities,
        constraints: complexConstraints,
        config: cspConfig
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.OPTIMIZATION_TARGET)
      expect(result.constraints_satisfied_percent).toBeGreaterThan(0.95)
      expect(result.backtracking_steps).toBeLessThan(1000)
      expect(result.constraint_violations).toEqual([])
    })
  })

  describe('Bulk Operations Performance', () => {
    it('processes bulk reschedule operations within time limits', async () => {
      const sessions = generateMockSessions(200)
      const bulkOperation: BulkReschedulingOperation = {
        id: 'bulk-op-performance-test',
        operation_type: 'reschedule_range',
        parameters: {
          date_range: { start: '2025-09-15', end: '2025-09-20' },
          new_date_range: { start: '2025-10-01', end: '2025-10-06' },
          affected_session_ids: sessions.slice(0, 50).map(s => s.id)
        },
        status: 'pending',
        progress: {
          total_sessions: 50,
          processed: 0,
          successful: 0,
          failed: 0,
          conflicts: []
        },
        created_at: new Date().toISOString()
      }

      const measurement = new PerformanceMeasurement()

      const result = await bulkService.processBulkOperation(bulkOperation)

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.BULK_OPERATION_TARGET)
      expect(result.progress.processed).toBe(50)
      expect(result.progress.successful).toBeGreaterThan(40) // 80% success rate minimum
      expect(result.progress.conflicts.length).toBeLessThan(10) // Maximum 10 conflicts
    })

    it('handles concurrent bulk operations without performance degradation', async () => {
      const sessions = generateMockSessions(300)
      const operations = Array.from({ length: 3 }, (_, i) => ({
        id: `bulk-op-concurrent-${i}`,
        operation_type: 'reschedule_therapist',
        parameters: {
          therapist_id: `therapist-${i + 1}`,
          date_range: { start: '2025-09-01', end: '2025-09-07' },
          affected_session_ids: sessions.slice(i * 30, (i + 1) * 30).map(s => s.id)
        },
        status: 'pending',
        progress: {
          total_sessions: 30,
          processed: 0,
          successful: 0,
          failed: 0,
          conflicts: []
        },
        created_at: new Date().toISOString()
      }))

      const measurement = new PerformanceMeasurement()

      const results = await Promise.all(
        operations.map(op => bulkService.processBulkOperation(op))
      )

      const metrics = measurement.finish()

      expect(results.every(r => r.success)).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.BULK_OPERATION_TARGET * 1.5) // 50% overhead allowance
      expect(results.every(r => r.progress.processed === 30)).toBe(true)
      expect(results.every(r => r.progress.successful >= 25)).toBe(true) // 83% success rate minimum
    })
  })

  describe('Conflict Resolution Performance', () => {
    it('detects conflicts in large datasets within 2 seconds', async () => {
      const sessions = generateMockSessions(500)
      const availabilities = generateMockAvailabilities(20, 21)

      // Introduce deliberate conflicts
      const conflictingSessions = sessions.slice(0, 50).map((session, index) => ({
        ...session,
        therapist_id: 'therapist-1', // Force all sessions to same therapist
        session_date: '2025-09-01', // Same date
        start_time: '10:00', // Same time - guaranteed conflicts
        end_time: '11:00'
      }))

      const allSessions = [...conflictingSessions, ...sessions.slice(50)]

      const measurement = new PerformanceMeasurement()

      const conflicts = await integrationService.resolveSchedulingConflicts({
        sessions: allSessions,
        therapist_availabilities: availabilities,
        validation_mode: 'comprehensive'
      })

      const metrics = measurement.finish()

      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.CONFLICT_RESOLUTION_TARGET)
      expect(conflicts.detected_conflicts.length).toBeGreaterThan(40) // Should detect most conflicts
      expect(conflicts.resolution_suggestions).toBeDefined()
      expect(conflicts.resolution_suggestions.length).toBeGreaterThan(0)
      expect(conflicts.resolution_success_rate).toBeGreaterThan(0.8)
    })

    it('resolves complex multi-constraint conflicts efficiently', async () => {
      const sessions = generateMockSessions(300)
      const availabilities = generateMockAvailabilities(15, 14)

      // Create complex conflict scenario
      const complexConflicts = {
        therapist_conflicts: 25,
        room_conflicts: 15,
        student_conflicts: 10,
        equipment_conflicts: 5,
        regulatory_conflicts: 3
      }

      const measurement = new PerformanceMeasurement()

      const resolution = await integrationService.resolveSchedulingConflicts({
        sessions,
        therapist_availabilities: availabilities,
        conflict_types: Object.keys(complexConflicts),
        resolution_strategy: 'optimal_redistribution',
        max_iterations: 1000
      })

      const metrics = measurement.finish()

      expect(metrics.execution_time_ms).toBeLessThan(PERFORMANCE_TARGETS.CONFLICT_RESOLUTION_TARGET * 2) // 4 seconds for complex conflicts
      expect(resolution.resolution_success_rate).toBeGreaterThan(0.7)
      expect(resolution.iterations_required).toBeLessThan(1000)
      expect(resolution.unresolvable_conflicts.length).toBeLessThan(10)
    })
  })

  describe('Memory Usage and Resource Management', () => {
    it('maintains memory usage within limits during large optimizations', async () => {
      const sessions = generateMockSessions(1000)
      const availabilities = generateMockAvailabilities(30, 30)
      const constraints = generateOptimizationConstraints(sessions.length)

      const memoryMonitor = new MemoryMonitor()

      const result = await optimizationService.generateOptimalSchedule({
        sessions,
        therapist_availabilities: availabilities,
        constraints,
        optimization_algorithm: 'memory_efficient',
        memory_limit_mb: 100
      })

      memoryMonitor.updatePeakMemory()
      const peakMemoryMB = memoryMonitor.getPeakMemoryUsage() / (1024 * 1024)

      expect(result.success).toBe(true)
      expect(peakMemoryMB).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_LIMIT / (1024 * 1024))
      expect(result.memory_usage_stats).toBeDefined()
      expect(result.memory_usage_stats.peak_usage_mb).toBeLessThan(100)
      expect(result.memory_usage_stats.gc_collections).toBeGreaterThanOrEqual(0)
    })

    it('properly cleans up resources after optimization', async () => {
      const initialMemory = new MemoryMonitor().getCurrentMemoryUsage()
      const iterations = 5

      for (let i = 0; i < iterations; i++) {
        const sessions = generateMockSessions(200)
        const availabilities = generateMockAvailabilities(10, 14)
        const constraints = generateOptimizationConstraints(sessions.length)

        const result = await optimizationService.generateOptimalSchedule({
          sessions,
          therapist_availabilities: availabilities,
          constraints,
          optimization_algorithm: 'genetic_algorithm'
        })

        expect(result.success).toBe(true)

        // Force cleanup
        if (typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc()
        }
      }

      const finalMemory = new MemoryMonitor().getCurrentMemoryUsage()
      const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024)

      // Memory growth should be minimal after multiple iterations
      expect(memoryGrowth).toBeLessThan(50) // Less than 50MB growth after 5 iterations
    })
  })

  describe('Scalability and Load Testing', () => {
    it('maintains linear performance scaling with dataset size', async () => {
      const testSizes = [50, 100, 200, 400]
      const performanceResults: { size: number; time: number }[] = []

      for (const size of testSizes) {
        const sessions = generateMockSessions(size)
        const availabilities = generateMockAvailabilities(Math.ceil(size / 20), 14)
        const constraints = generateOptimizationConstraints(sessions.length)

        const startTime = performance.now()

        const result = await optimizationService.generateOptimalSchedule({
          sessions,
          therapist_availabilities: availabilities,
          constraints,
          optimization_algorithm: 'constraint_satisfaction'
        })

        const executionTime = performance.now() - startTime

        expect(result.success).toBe(true)
        performanceResults.push({ size, time: executionTime })
      }

      // Verify that performance scaling is reasonable (not exponential)
      for (let i = 1; i < performanceResults.length; i++) {
        const currentRatio = performanceResults[i].time / performanceResults[i-1].time
        const sizeRatio = performanceResults[i].size / performanceResults[i-1].size
        
        // Time increase should not be more than 3x the size increase
        expect(currentRatio).toBeLessThan(sizeRatio * 3)
      }
    })

    it('handles peak load scenarios with graceful degradation', async () => {
      const peakLoadSessions = generateMockSessions(800)
      const peakLoadAvailabilities = generateMockAvailabilities(25, 21)
      const constraints = generateOptimizationConstraints(peakLoadSessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions: peakLoadSessions,
        therapist_availabilities: peakLoadAvailabilities,
        constraints,
        optimization_algorithm: 'adaptive_hybrid',
        performance_mode: 'peak_load',
        quality_vs_speed_tradeoff: 0.3 // Favor speed over quality
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(20000) // 20 seconds max for peak load
      expect(result.optimization_score).toBeGreaterThan(0.3) // Minimum acceptable quality
      expect(result.degradation_applied).toBe(true)
      expect(result.performance_mode_used).toBe('peak_load')
    })
  })

  describe('Real-World Performance Scenarios', () => {
    it('handles typical daily scheduling workload efficiently', async () => {
      // Simulate typical daily workload: 150 sessions, 12 therapists, 5 rooms
      const dailySessions = generateMockSessions(150)
      const dailyAvailabilities = generateMockAvailabilities(12, 1) // Single day
      const constraints = generateOptimizationConstraints(dailySessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions: dailySessions,
        therapist_availabilities: dailyAvailabilities,
        constraints,
        optimization_algorithm: 'daily_optimization',
        optimization_mode: 'real_time'
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(3000) // 3 seconds for daily scheduling
      expect(result.optimization_score).toBeGreaterThan(0.8) // High quality for daily use
      expect(result.therapist_utilization_rate).toBeGreaterThan(0.75)
      expect(result.room_utilization_rate).toBeGreaterThan(0.70)
    })

    it('processes weekly scheduling batch with acceptable performance', async () => {
      // Simulate weekly batch: 750 sessions across 7 days
      const weeklySessions = generateMockSessions(750)
      const weeklyAvailabilities = generateMockAvailabilities(15, 7) // Week schedule
      const constraints = generateOptimizationConstraints(weeklySessions.length)

      const measurement = new PerformanceMeasurement()

      const result = await optimizationService.generateOptimalSchedule({
        sessions: weeklySessions,
        therapist_availabilities: weeklyAvailabilities,
        constraints,
        optimization_algorithm: 'weekly_batch',
        optimization_mode: 'batch_processing'
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(12000) // 12 seconds for weekly batch
      expect(result.optimization_score).toBeGreaterThan(0.7)
      expect(result.weekly_efficiency_score).toBeGreaterThan(0.75)
      expect(result.conflict_resolution_rate).toBeGreaterThan(0.9)
    })

    it('handles emergency rescheduling with minimal latency', async () => {
      // Simulate emergency scenario: reschedule 20 sessions immediately
      const emergencySessions = generateMockSessions(20)
      const availabilities = generateMockAvailabilities(8, 3) // 3-day window
      
      const measurement = new PerformanceMeasurement()

      const result = await bulkService.processBulkOperation({
        id: 'emergency-reschedule',
        operation_type: 'emergency_reschedule',
        parameters: {
          reason: 'therapist_sick',
          affected_session_ids: emergencySessions.map(s => s.id),
          priority_level: 'urgent',
          max_reschedule_distance_days: 3
        },
        status: 'pending',
        progress: {
          total_sessions: 20,
          processed: 0,
          successful: 0,
          failed: 0,
          conflicts: []
        },
        created_at: new Date().toISOString()
      })

      const metrics = measurement.finish()

      expect(result.success).toBe(true)
      expect(metrics.execution_time_ms).toBeLessThan(1000) // 1 second for emergency
      expect(result.progress.successful).toBeGreaterThan(15) // 75% success rate minimum
      expect(result.emergency_handling_time_ms).toBeLessThan(500)
    })
  })
})