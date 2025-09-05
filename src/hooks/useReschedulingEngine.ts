import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reschedulingEngine } from '@/services/rescheduling-engine'
import { errorMonitoring } from '@/lib/error-monitoring'
import type {
  ReschedulingRequest,
  ReschedulingResult,
  ScheduleConflict
} from '@/types/scheduling'

/**
 * Rescheduling Engine Hook
 * 
 * Provides state management and execution capabilities for:
 * - Automated session rescheduling operations
 * - Real-time progress tracking
 * - Conflict detection and resolution
 * - Error handling and recovery
 */

interface ReschedulingProgress {
  current: number
  total: number
  percentage: number
}

interface UseReschedulingEngineReturn {
  executeRescheduling: (request: ReschedulingRequest) => Promise<void>
  isLoading: boolean
  progress: ReschedulingProgress | null
  currentStep: string | null
  result: ReschedulingResult | null
  conflicts: ScheduleConflict[]
  isComplete: boolean
  error: string | null
  reset: () => void
}

const RESCHEDULING_STEPS = [
  'rescheduling.step.analyzing', 
  'rescheduling.step.finding_slots',
  'rescheduling.step.validating',
  'rescheduling.step.executing',
  'rescheduling.step.finalizing'
]

export function useReschedulingEngine(): UseReschedulingEngineReturn {
  const [progress, setProgress] = useState<ReschedulingProgress | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [result, setResult] = useState<ReschedulingResult | null>(null)
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [error, setError] = useState<string | null>(null)

  const reschedulingMutation = useMutation({
    mutationFn: async (request: ReschedulingRequest): Promise<ReschedulingResult> => {
      setError(null)
      setResult(null)
      setConflicts([])
      setProgress({ current: 0, total: RESCHEDULING_STEPS.length, percentage: 0 })

      // Simulate progress through steps
      for (let i = 0; i < RESCHEDULING_STEPS.length; i++) {
        setCurrentStep(RESCHEDULING_STEPS[i])
        setProgress(prev => ({
          current: i + 1,
          total: RESCHEDULING_STEPS.length,
          percentage: ((i + 1) / RESCHEDULING_STEPS.length) * 100
        }))
        
        // Add realistic delays for UX
        if (i < RESCHEDULING_STEPS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
        }
      }

      // Execute the actual rescheduling
      return await reschedulingEngine.rescheduleSessionsForFreeze(request)
    },
    onSuccess: (data: ReschedulingResult) => {
      console.log('✅ Rescheduling completed:', data)
      setResult(data)
      setConflicts(data.conflicts_detected || [])
      setCurrentStep('rescheduling.step.completed')
    },
    onError: (error: Error) => {
      console.error('❌ Rescheduling failed:', error)
      setError(error.message)
      setCurrentStep('rescheduling.step.failed')
      
      errorMonitoring.reportError(error, {
        component: 'useReschedulingEngine',
        action: 'executeRescheduling'
      })
    }
  })

  const executeRescheduling = useCallback(async (request: ReschedulingRequest) => {
    await reschedulingMutation.mutateAsync(request)
  }, [reschedulingMutation])

  const reset = useCallback(() => {
    setProgress(null)
    setCurrentStep(null)
    setResult(null)
    setConflicts([])
    setError(null)
    reschedulingMutation.reset()
  }, [reschedulingMutation])

  return {
    executeRescheduling,
    isLoading: reschedulingMutation.isPending,
    progress,
    currentStep,
    result,
    conflicts,
    isComplete: reschedulingMutation.isSuccess || reschedulingMutation.isError,
    error,
    reset
  }
}

/**
 * Hook for batch rescheduling operations
 */
export function useBatchRescheduling() {
  const [batchProgress, setBatchProgress] = useState<{
    completed: number
    total: number
    current?: ReschedulingRequest
  } | null>(null)

  const batchMutation = useMutation({
    mutationFn: async (requests: ReschedulingRequest[]): Promise<ReschedulingResult[]> => {
      const results: ReschedulingResult[] = []
      
      setBatchProgress({ completed: 0, total: requests.length })

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i]
        setBatchProgress(prev => ({
          ...prev!,
          current: request,
          completed: i
        }))

        try {
          const result = await reschedulingEngine.rescheduleSessionsForFreeze(request)
          results.push(result)
        } catch (error) {
          console.error(`Failed to reschedule batch item ${i}:`, error)
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            sessions_rescheduled: 0,
            conflicts_detected: [],
            execution_time_ms: 0
          })
        }
      }

      setBatchProgress(prev => ({
        ...prev!,
        completed: requests.length,
        current: undefined
      }))

      return results
    }
  })

  const executeBatchRescheduling = useCallback(async (requests: ReschedulingRequest[]) => {
    return await batchMutation.mutateAsync(requests)
  }, [batchMutation])

  return {
    executeBatchRescheduling,
    isLoading: batchMutation.isPending,
    batchProgress,
    results: batchMutation.data,
    error: batchMutation.error?.message,
    reset: () => {
      setBatchProgress(null)
      batchMutation.reset()
    }
  }
}

/**
 * Hook for rescheduling analytics and metrics
 */
export function useReschedulingAnalytics(timeRange: 'week' | 'month' | 'quarter' = 'month') {
  return {
    // This would fetch analytics data from the database
    // Including success rates, common conflicts, performance metrics, etc.
    // Implementation depends on analytics requirements
  }
}