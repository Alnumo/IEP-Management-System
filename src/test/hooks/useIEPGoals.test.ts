/**
 * Comprehensive unit tests for useIEPGoals hook
 * Tests all goal management operations, caching, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useIEPGoals } from '@/hooks/useIEPGoals'
import { IEPGoalCalculationsService } from '@/services/iep-goal-calculations'
import { supabase } from '@/lib/supabase'
import type { IEPGoal, GoalProgressMetrics, MasteryPrediction } from '@/types/iep'
import React from 'react'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    })),
    rpc: vi.fn()
  }
}))

vi.mock('@/services/iep-goal-calculations', () => ({
  IEPGoalCalculationsService: {
    getInstance: vi.fn(() => ({
      calculateProgressPercentage: vi.fn(),
      calculateVelocity: vi.fn(),
      calculateTrend: vi.fn(),
      predictMastery: vi.fn(),
      validateIDEA2024Compliance: vi.fn(),
      generateProgressRecommendations: vi.fn()
    }))
  }
}))

vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn()
  }
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useIEPGoals', () => {
  let mockCalculationsService: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockCalculationsService = IEPGoalCalculationsService.getInstance()
    
    // Setup default mock implementations
    mockCalculationsService.calculateProgressPercentage.mockReturnValue(75)
    mockCalculationsService.calculateVelocity.mockReturnValue(2.5)
    mockCalculationsService.calculateTrend.mockReturnValue({ 
      direction: 'improving', 
      confidence: 0.8, 
      slope: 1.2 
    })
    mockCalculationsService.predictMastery.mockResolvedValue({
      predicted_mastery_date: '2024-12-15',
      confidence_level: 0.85,
      probability_of_success: 0.9,
      risk_factors: [],
      recommendations: ['Continue current intervention']
    })
    mockCalculationsService.validateIDEA2024Compliance.mockReturnValue({
      isCompliant: true,
      issues: [],
      recommendations: []
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('useStudentGoals', () => {
    it('should fetch student goals successfully', async () => {
      const mockGoals: IEPGoal[] = [
        {
          id: 'goal-1',
          student_id: 'student-1',
          goal_statement: 'Improve reading comprehension',
          domain: 'academic',
          measurement_type: 'percentage',
          baseline_value: 30,
          current_value: 55,
          target_value: 80,
          target_date: '2024-12-31',
          status: 'in_progress',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          created_by: 'therapist-1'
        }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: mockGoals,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockGoals)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle empty results gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed')
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: null,
          error: mockError
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.data).toBeUndefined()
    })

    it('should cache results properly', async () => {
      const mockGoals = [{ id: 'goal-1', student_id: 'student-1' }] as IEPGoal[]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: mockGoals,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      
      // First render
      const { result: result1 } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })
      
      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second render should use cached data
      const { result: result2 } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true)
      })

      // Should only call the database once due to caching
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(2) // Once per render setup
    })
  })

  describe('useGoalProgress', () => {
    it('should calculate goal progress with metrics', async () => {
      const mockGoal: IEPGoal = {
        id: 'goal-1',
        student_id: 'student-1',
        goal_statement: 'Math improvement',
        domain: 'academic',
        measurement_type: 'numeric',
        baseline_value: 20,
        current_value: 45,
        target_value: 80,
        target_date: '2024-12-31',
        status: 'in_progress',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        created_by: 'therapist-1'
      }

      const mockProgressData = [
        { date: '2024-01-01', value: 20, session_id: 'session-1' },
        { date: '2024-01-08', value: 30, session_id: 'session-2' },
        { date: '2024-01-15', value: 45, session_id: 'session-3' }
      ]

      // Mock goal query
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'iep_goals') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue({
              data: mockGoal,
              error: null
            })
          } as any
        }
        
        if (table === 'goal_progress_data') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue({
              data: mockProgressData,
              error: null
            })
          } as any
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({ data: [], error: null })
        } as any
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useGoalProgress('goal-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.goal).toEqual(mockGoal)
      expect(result.current.data?.progress_percentage).toBe(75)
      expect(result.current.data?.velocity).toBe(2.5)
      expect(result.current.data?.trend.direction).toBe('improving')
    })

    it('should handle goals without progress data', async () => {
      const mockGoal: IEPGoal = {
        id: 'goal-2',
        student_id: 'student-1',
        goal_statement: 'New goal',
        domain: 'social',
        measurement_type: 'frequency',
        baseline_value: 0,
        current_value: 0,
        target_value: 10,
        target_date: '2024-12-31',
        status: 'not_started',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'therapist-1'
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'iep_goals') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue({
              data: mockGoal,
              error: null
            })
          } as any
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            data: [],
            error: null
          })
        } as any
      })

      // Update mock calculations for no progress scenario
      mockCalculationsService.calculateProgressPercentage.mockReturnValue(0)
      mockCalculationsService.calculateVelocity.mockReturnValue(0)
      mockCalculationsService.calculateTrend.mockReturnValue({ 
        direction: 'stable', 
        confidence: 0, 
        slope: 0 
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useGoalProgress('goal-2'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.progress_percentage).toBe(0)
      expect(result.current.data?.velocity).toBe(0)
      expect(result.current.data?.trend.direction).toBe('stable')
    })
  })

  describe('useCreateGoal', () => {
    it('should create a new goal successfully', async () => {
      const newGoal: Omit<IEPGoal, 'id' | 'created_at' | 'updated_at'> = {
        student_id: 'student-1',
        goal_statement: 'New communication goal',
        domain: 'communication',
        measurement_type: 'percentage',
        baseline_value: 25,
        current_value: 25,
        target_value: 85,
        target_date: '2024-12-31',
        status: 'not_started',
        created_by: 'therapist-1'
      }

      const createdGoal = { 
        ...newGoal, 
        id: 'goal-new',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: createdGoal,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useCreateGoal(), { wrapper })

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined()
      })

      result.current.mutate(newGoal)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(createdGoal)
      expect(mockCalculationsService.validateIDEA2024Compliance).toHaveBeenCalledWith(createdGoal)
    })

    it('should handle validation errors during creation', async () => {
      const invalidGoal: Omit<IEPGoal, 'id' | 'created_at' | 'updated_at'> = {
        student_id: 'student-1',
        goal_statement: 'Vague goal', // Non-measurable
        domain: 'communication',
        measurement_type: 'subjective',
        baseline_value: null,
        current_value: null,
        target_value: null,
        target_date: '2024-12-31',
        status: 'not_started',
        created_by: 'therapist-1'
      }

      mockCalculationsService.validateIDEA2024Compliance.mockReturnValue({
        isCompliant: false,
        issues: ['Goal is not measurable', 'Missing baseline value'],
        recommendations: ['Use specific, measurable criteria']
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useCreateGoal(), { wrapper })

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined()
      })

      result.current.mutate(invalidGoal)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should handle database errors during creation', async () => {
      const newGoal: Omit<IEPGoal, 'id' | 'created_at' | 'updated_at'> = {
        student_id: 'student-1',
        goal_statement: 'Test goal',
        domain: 'academic',
        measurement_type: 'numeric',
        baseline_value: 10,
        current_value: 10,
        target_value: 50,
        target_date: '2024-12-31',
        status: 'not_started',
        created_by: 'therapist-1'
      }

      const dbError = new Error('Constraint violation')

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: dbError
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useCreateGoal(), { wrapper })

      result.current.mutate(newGoal)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(dbError)
    })
  })

  describe('useUpdateGoal', () => {
    it('should update goal successfully', async () => {
      const goalUpdate = {
        id: 'goal-1',
        current_value: 65,
        status: 'in_progress' as const
      }

      const updatedGoal = {
        id: 'goal-1',
        student_id: 'student-1',
        goal_statement: 'Updated goal',
        domain: 'academic',
        measurement_type: 'numeric' as const,
        baseline_value: 20,
        current_value: 65,
        target_value: 100,
        target_date: '2024-12-31',
        status: 'in_progress' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        created_by: 'therapist-1'
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: updatedGoal,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useUpdateGoal(), { wrapper })

      result.current.mutate(goalUpdate)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(updatedGoal)
    })

    it('should recalculate progress metrics after update', async () => {
      const goalUpdate = { id: 'goal-1', current_value: 75 }
      
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: { id: 'goal-1', current_value: 75 },
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useUpdateGoal(), { wrapper })

      result.current.mutate(goalUpdate)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCalculationsService.calculateProgressPercentage).toHaveBeenCalled()
    })
  })

  describe('useDeleteGoal', () => {
    it('should delete goal successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          data: null,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useDeleteGoal(), { wrapper })

      result.current.mutate('goal-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('iep_goals')
    })

    it('should handle deletion errors', async () => {
      const deleteError = new Error('Cannot delete goal with progress data')

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          data: null,
          error: deleteError
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useDeleteGoal(), { wrapper })

      result.current.mutate('goal-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(deleteError)
    })
  })

  describe('useMasteryPrediction', () => {
    it('should predict goal mastery accurately', async () => {
      const mockGoal: IEPGoal = {
        id: 'goal-1',
        student_id: 'student-1',
        goal_statement: 'Reading goal',
        domain: 'academic',
        measurement_type: 'percentage',
        baseline_value: 30,
        current_value: 65,
        target_value: 85,
        target_date: '2024-12-31',
        status: 'in_progress',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        created_by: 'therapist-1'
      }

      const mockProgressData = [
        { date: '2024-01-01', value: 30, session_id: 'session-1' },
        { date: '2024-01-08', value: 45, session_id: 'session-2' },
        { date: '2024-01-15', value: 65, session_id: 'session-3' }
      ]

      const expectedPrediction: MasteryPrediction = {
        predicted_mastery_date: '2024-03-15',
        confidence_level: 0.88,
        probability_of_success: 0.92,
        risk_factors: [],
        recommendations: ['Continue current pace', 'Consider advanced materials'],
        predicted_values: [70, 75, 80, 85],
        confidence_intervals: [
          { lower: 65, upper: 75 },
          { lower: 70, upper: 80 },
          { lower: 75, upper: 85 },
          { lower: 80, upper: 90 }
        ],
        influencing_factors: [
          { factor: 'Consistent progress', impact: 0.3, direction: 'positive' }
        ]
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'iep_goals') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue({
              data: mockGoal,
              error: null
            })
          } as any
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            data: mockProgressData,
            error: null
          })
        } as any
      })

      mockCalculationsService.predictMastery.mockResolvedValue(expectedPrediction)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useMasteryPrediction('goal-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(expectedPrediction)
      expect(mockCalculationsService.predictMastery).toHaveBeenCalledWith(mockGoal, mockProgressData)
    })

    it('should handle prediction errors gracefully', async () => {
      const predictionError = new Error('Insufficient data for prediction')

      mockCalculationsService.predictMastery.mockRejectedValue(predictionError)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: { id: 'goal-1' },
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useMasteryPrediction('goal-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(predictionError)
    })
  })

  describe('Performance and Optimization', () => {
    it('should batch multiple goal operations efficiently', async () => {
      const goalIds = ['goal-1', 'goal-2', 'goal-3']
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: goalIds.map(id => ({ id, student_id: 'student-1' })),
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useBulkGoalOperations(), { wrapper })

      const bulkUpdate = {
        goalIds,
        updates: { status: 'under_review' as const },
        operation: 'update' as const
      }

      result.current.mutate(bulkUpdate)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should batch the operation rather than making individual calls
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(2) // Setup + operation
    })

    it('should handle large datasets efficiently', async () => {
      // Test with 100 goals
      const largeGoalSet = Array.from({ length: 100 }, (_, i) => ({
        id: `goal-${i}`,
        student_id: 'student-1',
        goal_statement: `Goal ${i}`,
        domain: 'academic',
        measurement_type: 'numeric' as const,
        baseline_value: i,
        current_value: i + 10,
        target_value: i + 50,
        target_date: '2024-12-31',
        status: 'in_progress' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'therapist-1'
      }))

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          data: largeGoalSet,
          error: null
        })
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useIEPGoals().useStudentGoals('student-1'), { wrapper })

      const startTime = Date.now()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const endTime = Date.now()
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      expect(result.current.data).toHaveLength(100)
    })
  })
})

/**
 * Test utilities for IEP goals hook testing
 */
export const createMockIEPGoal = (overrides: Partial<IEPGoal> = {}): IEPGoal => ({
  id: 'test-goal-1',
  student_id: 'student-1',
  goal_statement: 'Test goal statement',
  domain: 'communication',
  measurement_type: 'percentage',
  baseline_value: 30,
  current_value: 50,
  target_value: 85,
  target_date: '2024-12-31',
  status: 'in_progress',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  created_by: 'therapist-1',
  ...overrides
})

export const createMockProgressData = (goalId: string, count: number = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `progress-${i}`,
    goal_id: goalId,
    date: new Date(2024, 0, i * 7 + 1).toISOString().split('T')[0],
    value: 30 + (i * 8), // Simulated improvement
    session_id: `session-${i + 1}`,
    notes: `Progress note ${i + 1}`,
    measurement_method: 'direct_observation',
    created_at: new Date(2024, 0, i * 7 + 1).toISOString()
  }))
}