/**
 * Comprehensive unit tests for IEP Goal Calculations Service
 * Tests all calculation algorithms, statistical methods, and data validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IEPGoalCalculationsService } from '@/services/iep-goal-calculations'
import type { 
  IEPGoalWithData,
  ProgressDataPoint,
  GoalCalculationResult,
  MasteryPrediction,
  TrendAnalysis,
  StatisticalSummary
} from '@/types/iep'

describe('IEPGoalCalculationsService', () => {
  let service: IEPGoalCalculationsService

  beforeEach(() => {
    service = IEPGoalCalculationsService.getInstance()
    vi.clearAllMocks()
  })

  describe('Progress Percentage Calculation', () => {
    it('should calculate correct progress percentage for numeric goals', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 10,
        current_value: 15,
        target_value: 20,
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(50) // (15-10)/(20-10) * 100 = 50%
    })

    it('should handle zero baseline values', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 0,
        current_value: 5,
        target_value: 10,
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(50) // (5-0)/(10-0) * 100 = 50%
    })

    it('should handle percentage goals correctly', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 30,
        current_value: 65,
        target_value: 80,
        measurement_type: 'percentage'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(70) // (65-30)/(80-30) * 100 = 70%
    })

    it('should cap progress at 100%', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 10,
        current_value: 25,
        target_value: 20,
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(100)
    })

    it('should handle frequency goals with different units', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 2,
        current_value: 6,
        target_value: 10,
        measurement_type: 'frequency',
        frequency_unit: 'per_session'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(50) // (6-2)/(10-2) * 100 = 50%
    })

    it('should handle invalid values gracefully', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: null,
        current_value: undefined,
        target_value: 0,
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(0)
    })
  })

  describe('Velocity Calculation', () => {
    it('should calculate velocity from progress data points', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' },
        { date: '2024-01-08', value: 12, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' },
        { date: '2024-01-22', value: 18, session_id: '4' }
      ]

      const velocity = service.calculateVelocity(progressData)
      
      // Expected: approximately 8 improvement over 3 weeks = ~2.67 per week
      expect(velocity).toBeCloseTo(2.67, 1)
    })

    it('should handle single data point', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' }
      ]

      const velocity = service.calculateVelocity(progressData)
      expect(velocity).toBe(0)
    })

    it('should handle empty data array', () => {
      const velocity = service.calculateVelocity([])
      expect(velocity).toBe(0)
    })

    it('should handle data points with same dates', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' },
        { date: '2024-01-01', value: 12, session_id: '2' }
      ]

      const velocity = service.calculateVelocity(progressData)
      expect(velocity).toBe(0) // No time difference
    })

    it('should handle negative velocity (declining performance)', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 20, session_id: '1' },
        { date: '2024-01-08', value: 18, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' }
      ]

      const velocity = service.calculateVelocity(progressData)
      expect(velocity).toBeLessThan(0)
    })
  })

  describe('Trend Analysis', () => {
    it('should identify improving trend', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' },
        { date: '2024-01-08', value: 12, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' },
        { date: '2024-01-22', value: 18, session_id: '4' }
      ]

      const trend = service.calculateTrend(progressData)
      expect(trend.direction).toBe('improving')
      expect(trend.confidence).toBeGreaterThan(0.7)
      expect(trend.slope).toBeGreaterThan(0)
    })

    it('should identify declining trend', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 20, session_id: '1' },
        { date: '2024-01-08', value: 18, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' },
        { date: '2024-01-22', value: 12, session_id: '4' }
      ]

      const trend = service.calculateTrend(progressData)
      expect(trend.direction).toBe('declining')
      expect(trend.confidence).toBeGreaterThan(0.7)
      expect(trend.slope).toBeLessThan(0)
    })

    it('should identify stable trend', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 15, session_id: '1' },
        { date: '2024-01-08', value: 16, session_id: '2' },
        { date: '2024-01-15', value: 14, session_id: '3' },
        { date: '2024-01-22', value: 15, session_id: '4' }
      ]

      const trend = service.calculateTrend(progressData)
      expect(trend.direction).toBe('stable')
      expect(Math.abs(trend.slope)).toBeLessThan(0.5)
    })

    it('should handle insufficient data for trend analysis', () => {
      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' }
      ]

      const trend = service.calculateTrend(progressData)
      expect(trend.direction).toBe('stable')
      expect(trend.confidence).toBe(0)
    })
  })

  describe('Statistical Summary', () => {
    it('should calculate complete statistical summary', () => {
      const values = [10, 12, 15, 18, 20, 16, 14, 19, 21, 17]
      
      const summary = service.calculateStatisticalSummary(values)
      
      expect(summary.mean).toBeCloseTo(16.2, 1)
      expect(summary.median).toBe(16.5)
      expect(summary.mode).toBeUndefined() // No repeated values
      expect(summary.standardDeviation).toBeGreaterThan(0)
      expect(summary.variance).toBeGreaterThan(0)
      expect(summary.min).toBe(10)
      expect(summary.max).toBe(21)
      expect(summary.range).toBe(11)
    })

    it('should handle empty array', () => {
      const summary = service.calculateStatisticalSummary([])
      
      expect(summary.mean).toBe(0)
      expect(summary.median).toBe(0)
      expect(summary.count).toBe(0)
    })

    it('should calculate mode correctly', () => {
      const values = [10, 12, 15, 15, 15, 18, 20]
      
      const summary = service.calculateStatisticalSummary(values)
      expect(summary.mode).toBe(15)
    })

    it('should handle single value', () => {
      const values = [15]
      
      const summary = service.calculateStatisticalSummary(values)
      expect(summary.mean).toBe(15)
      expect(summary.median).toBe(15)
      expect(summary.standardDeviation).toBe(0)
    })
  })

  describe('Mastery Prediction', () => {
    it('should predict mastery date with improving trend', async () => {
      const goal: Partial<IEPGoalWithData> = {
        id: 'goal-1',
        baseline_value: 10,
        current_value: 15,
        target_value: 20,
        measurement_type: 'numeric',
        mastery_criteria: { consecutive_sessions: 3, accuracy_threshold: 80 }
      }

      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 10, session_id: '1' },
        { date: '2024-01-08', value: 12, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' },
        { date: '2024-01-22', value: 18, session_id: '4' }
      ]

      const prediction = await service.predictMastery(goal as IEPGoalWithData, progressData)
      
      expect(prediction.predicted_mastery_date).toBeTruthy()
      expect(prediction.confidence_level).toBeGreaterThan(0.5)
      expect(prediction.risk_factors).toBeDefined()
      expect(prediction.probability_of_success).toBeGreaterThan(0.6)
    })

    it('should identify high risk with declining trend', async () => {
      const goal: Partial<IEPGoalWithData> = {
        id: 'goal-1',
        baseline_value: 20,
        current_value: 15,
        target_value: 25,
        measurement_type: 'numeric'
      }

      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 20, session_id: '1' },
        { date: '2024-01-08', value: 18, session_id: '2' },
        { date: '2024-01-15', value: 15, session_id: '3' },
        { date: '2024-01-22', value: 12, session_id: '4' }
      ]

      const prediction = await service.predictMastery(goal as IEPGoalWithData, progressData)
      
      expect(prediction.risk_factors.length).toBeGreaterThan(0)
      expect(prediction.probability_of_success).toBeLessThan(0.5)
      expect(prediction.risk_factors.some(rf => rf.factor.includes('declining'))).toBe(true)
    })

    it('should handle goals near completion', async () => {
      const goal: Partial<IEPGoalWithData> = {
        id: 'goal-1',
        baseline_value: 10,
        current_value: 19,
        target_value: 20,
        measurement_type: 'numeric'
      }

      const progressData: ProgressDataPoint[] = [
        { date: '2024-01-01', value: 15, session_id: '1' },
        { date: '2024-01-08', value: 17, session_id: '2' },
        { date: '2024-01-15', value: 19, session_id: '3' }
      ]

      const prediction = await service.predictMastery(goal as IEPGoalWithData, progressData)
      
      expect(prediction.probability_of_success).toBeGreaterThan(0.8)
      expect(prediction.confidence_level).toBeGreaterThan(0.7)
    })
  })

  describe('Goal Comparison and Benchmarking', () => {
    it('should compare goals across domains', () => {
      const goals: Partial<IEPGoalWithData>[] = [
        {
          id: 'goal-1',
          domain: 'communication',
          baseline_value: 10,
          current_value: 15,
          target_value: 20
        },
        {
          id: 'goal-2',
          domain: 'communication',
          baseline_value: 5,
          current_value: 12,
          target_value: 15
        },
        {
          id: 'goal-3',
          domain: 'social_skills',
          baseline_value: 8,
          current_value: 10,
          target_value: 16
        }
      ]

      const comparison = service.compareGoalsAcrossDomains(goals as IEPGoalWithData[])
      
      expect(comparison.communication).toBeDefined()
      expect(comparison.social_skills).toBeDefined()
      expect(comparison.communication.average_progress).toBeCloseTo(62.5, 1) // (50+70)/2
      expect(comparison.social_skills.average_progress).toBeCloseTo(25, 1) // (10-8)/(16-8)*100
    })

    it('should generate peer comparison insights', () => {
      const studentGoals: Partial<IEPGoalWithData>[] = [
        { id: 'goal-1', baseline_value: 10, current_value: 15, target_value: 20 }
      ]

      const peerData = {
        averageProgress: 45,
        percentile: 75,
        sampleSize: 50
      }

      const insights = service.generatePeerComparisonInsights(
        studentGoals as IEPGoalWithData[],
        peerData
      )

      expect(insights.length).toBeGreaterThan(0)
      expect(insights[0]).toContain('above average') // 50% > 45%
    })
  })

  describe('IDEA 2024 Compliance Validation', () => {
    it('should validate measurable goals', () => {
      const goal: Partial<IEPGoalWithData> = {
        goal_statement: 'Student will read 100 sight words with 80% accuracy',
        measurement_type: 'percentage',
        baseline_value: 20,
        target_value: 80,
        mastery_criteria: {
          accuracy_threshold: 80,
          consecutive_sessions: 3
        }
      }

      const validation = service.validateIDEA2024Compliance(goal as IEPGoalWithData)
      
      expect(validation.isCompliant).toBe(true)
      expect(validation.issues).toHaveLength(0)
      expect(validation.recommendations).toBeDefined()
    })

    it('should identify non-measurable goals', () => {
      const goal: Partial<IEPGoalWithData> = {
        goal_statement: 'Student will improve behavior',
        measurement_type: 'subjective',
        baseline_value: null,
        target_value: null
      }

      const validation = service.validateIDEA2024Compliance(goal as IEPGoalWithData)
      
      expect(validation.isCompliant).toBe(false)
      expect(validation.issues.some(issue => issue.includes('measurable'))).toBe(true)
    })

    it('should validate time-bound requirements', () => {
      const goal: Partial<IEPGoalWithData> = {
        goal_statement: 'Student will complete math problems',
        measurement_type: 'numeric',
        baseline_value: 5,
        target_value: 15,
        target_date: '2024-12-31'
      }

      const validation = service.validateIDEA2024Compliance(goal as IEPGoalWithData)
      
      expect(validation.issues.every(issue => !issue.includes('time-bound'))).toBe(true)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset: ProgressDataPoint[] = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value: Math.random() * 100,
        session_id: `session-${i}`
      }))

      const start = performance.now()
      const velocity = service.calculateVelocity(largeDataset)
      const end = performance.now()

      expect(end - start).toBeLessThan(100) // Should complete in under 100ms
      expect(velocity).toBeDefined()
    })

    it('should handle malformed data gracefully', () => {
      const malformedData: any[] = [
        { date: 'invalid-date', value: 'not-a-number' },
        { date: null, value: undefined },
        { date: '2024-01-01', value: NaN }
      ]

      expect(() => {
        service.calculateVelocity(malformedData)
      }).not.toThrow()

      expect(() => {
        service.calculateTrend(malformedData)
      }).not.toThrow()
    })

    it('should maintain precision in calculations', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 1/3,
        current_value: 2/3,
        target_value: 1,
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBeCloseTo(50, 5) // High precision
    })

    it('should handle concurrent calculations', async () => {
      const goals = Array.from({ length: 10 }, (_, i) => ({
        id: `goal-${i}`,
        baseline_value: i * 2,
        current_value: i * 3,
        target_value: i * 5,
        measurement_type: 'numeric' as const
      }))

      const calculations = goals.map(goal => 
        Promise.resolve(service.calculateProgressPercentage(goal as IEPGoalWithData))
      )

      const results = await Promise.all(calculations)
      expect(results).toHaveLength(10)
      expect(results.every(r => typeof r === 'number')).toBe(true)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should validate input parameters', () => {
      expect(() => {
        service.calculateProgressPercentage(null as any)
      }).toThrow()

      expect(() => {
        service.calculateVelocity(null as any)
      }).toThrow()
    })

    it('should provide meaningful error messages', () => {
      try {
        service.calculateProgressPercentage({} as IEPGoalWithData)
      } catch (error) {
        expect(error.message).toContain('Invalid goal data')
      }
    })

    it('should handle division by zero scenarios', () => {
      const goal: Partial<IEPGoalWithData> = {
        baseline_value: 10,
        current_value: 15,
        target_value: 10, // Same as baseline
        measurement_type: 'numeric'
      }

      const result = service.calculateProgressPercentage(goal as IEPGoalWithData)
      expect(result).toBe(100) // Should handle gracefully
    })
  })
})

/**
 * Integration test helper functions
 */
export const createMockGoal = (overrides: Partial<IEPGoalWithData> = {}): IEPGoalWithData => ({
  id: 'test-goal-1',
  student_id: 'student-1',
  goal_statement: 'Test goal statement',
  domain: 'communication',
  measurement_type: 'numeric',
  baseline_value: 10,
  current_value: 15,
  target_value: 20,
  target_date: '2024-12-31',
  status: 'in_progress',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'therapist-1',
  ...overrides
})

export const createMockProgressData = (count: number = 5): ProgressDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(2024, 0, i * 7 + 1).toISOString().split('T')[0],
    value: 10 + (i * 2) + (Math.random() * 3), // Simulated progress with noise
    session_id: `session-${i + 1}`,
    notes: `Progress note for session ${i + 1}`,
    measurement_method: 'direct_observation'
  }))
}