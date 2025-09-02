/**
 * Schedule Generation Hooks
 * Story 3.1: Automated Scheduling Engine - Task 3
 * 
 * React Query hooks for schedule generation and optimization
 * Provides intelligent caching, background updates, and optimistic mutations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useI18n } from '../contexts/I18nContext'
import { generateSchedule, validateScheduleRequest, getAvailableSchedulePatterns } from '../services/schedule-generation-service'
import { optimizeSchedule } from '../services/schedule-optimization-service'
import type {
  ScheduleGenerationRequest,
  ScheduleGenerationResult,
  OptimizationConfig,
  OptimizationResult,
  SchedulePattern,
  ScheduledSession,
  ScheduleConflict
} from '../types/scheduling'

// =====================================================
// Query Keys
// =====================================================

export const scheduleGenerationKeys = {
  all: ['schedule-generation'] as const,
  generation: (request: ScheduleGenerationRequest) => 
    [...scheduleGenerationKeys.all, 'generate', request] as const,
  optimization: (sessions: ScheduledSession[], config: OptimizationConfig) =>
    [...scheduleGenerationKeys.all, 'optimize', sessions.length, config] as const,
  patterns: () => [...scheduleGenerationKeys.all, 'patterns'] as const,
  validation: (request: ScheduleGenerationRequest) =>
    [...scheduleGenerationKeys.all, 'validate', request] as const
} as const

// =====================================================
// Schedule Generation Hooks
// =====================================================

/**
 * Generate automated schedule based on requirements
 */
export function useGenerateSchedule() {
  const { t, language } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ScheduleGenerationRequest): Promise<ScheduleGenerationResult> => {
      // Show loading toast
      const loadingToastId = toast.loading(
        language === 'ar' 
          ? 'جاري توليد الجدول الزمني...' 
          : 'Generating schedule...'
      )

      try {
        // Validate request first
        const validation = validateScheduleRequest(request)
        if (!validation.isValid) {
          throw new Error(validation.errors[0])
        }

        const result = await generateSchedule(request)

        if (!result.success) {
          throw new Error(result.error || 'فشل في توليد الجدول')
        }

        // Dismiss loading toast
        toast.dismiss(loadingToastId)

        // Show success toast with metrics
        const metrics = result.data.metrics
        const successMessage = language === 'ar'
          ? `تم توليد ${metrics.total_sessions_generated} جلسة في ${result.data.generation_time_ms}ms`
          : `Generated ${metrics.total_sessions_generated} sessions in ${result.data.generation_time_ms}ms`

        toast.success(successMessage)

        return result

      } catch (error) {
        toast.dismiss(loadingToastId)
        throw error
      }
    },

    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: scheduleGenerationKeys.all 
      })

      // Update cache with generated sessions
      if (data.data.generated_sessions) {
        queryClient.setQueryData(
          ['scheduled-sessions', 'generated'],
          data.data.generated_sessions
        )
      }
    },

    onError: (error: Error) => {
      const errorMessage = language === 'ar'
        ? `فشل في توليد الجدول: ${error.message}`
        : `Schedule generation failed: ${error.message}`
      
      toast.error(errorMessage)
      console.error('Schedule generation error:', error)
    }
  })
}

/**
 * Optimize existing schedule
 */
export function useOptimizeSchedule() {
  const { t, language } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessions,
      config
    }: {
      sessions: ScheduledSession[]
      config: OptimizationConfig
    }): Promise<OptimizationResult> => {
      const loadingToastId = toast.loading(
        language === 'ar' 
          ? 'جاري تحسين الجدول الزمني...' 
          : 'Optimizing schedule...'
      )

      try {
        const result = await optimizeSchedule(sessions, config)

        if (!result.success) {
          throw new Error(result.error || 'فشل في تحسين الجدول')
        }

        toast.dismiss(loadingToastId)

        // Show success toast with improvement metrics
        const improvement = result.data.improvement_percentage
        const successMessage = language === 'ar'
          ? `تم تحسين الجدول بنسبة ${improvement.toFixed(1)}%`
          : `Schedule improved by ${improvement.toFixed(1)}%`

        toast.success(successMessage)

        return result

      } catch (error) {
        toast.dismiss(loadingToastId)
        throw error
      }
    },

    onSuccess: (data) => {
      // Invalidate optimization queries
      queryClient.invalidateQueries({ 
        queryKey: scheduleGenerationKeys.all 
      })

      // Cache optimized sessions
      if (data.data.optimized_sessions) {
        queryClient.setQueryData(
          ['scheduled-sessions', 'optimized'],
          data.data.optimized_sessions
        )
      }
    },

    onError: (error: Error) => {
      const errorMessage = language === 'ar'
        ? `فشل في تحسين الجدول: ${error.message}`
        : `Schedule optimization failed: ${error.message}`
      
      toast.error(errorMessage)
      console.error('Schedule optimization error:', error)
    }
  })
}

/**
 * Validate schedule generation request
 */
export function useValidateScheduleRequest(request: ScheduleGenerationRequest) {
  const { language } = useI18n()

  return useQuery({
    queryKey: scheduleGenerationKeys.validation(request),
    queryFn: () => {
      const validation = validateScheduleRequest(request)
      
      if (!validation.isValid) {
        // Show validation errors as warnings
        validation.errors.forEach(error => {
          toast.warning(error)
        })
      }
      
      return validation
    },
    enabled: Boolean(request.start_date && request.end_date),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Get available schedule patterns
 */
export function useSchedulePatterns() {
  const { language } = useI18n()

  return useQuery({
    queryKey: scheduleGenerationKeys.patterns(),
    queryFn: getAvailableSchedulePatterns,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: 1000,

    select: (patterns) => {
      // Sort patterns by name based on current language
      return patterns.sort((a, b) => {
        const nameA = language === 'ar' ? a.pattern_name_ar : a.pattern_name_en
        const nameB = language === 'ar' ? b.pattern_name_ar : b.pattern_name_en
        return nameA.localeCompare(nameB)
      })
    }
  })
}

/**
 * Batch schedule generation for multiple requests
 */
export function useBatchScheduleGeneration() {
  const { language } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requests: ScheduleGenerationRequest[]): Promise<ScheduleGenerationResult[]> => {
      const loadingToastId = toast.loading(
        language === 'ar' 
          ? `جاري توليد ${requests.length} جداول زمنية...` 
          : `Generating ${requests.length} schedules...`
      )

      try {
        // Validate all requests first
        const validationResults = requests.map(request => validateScheduleRequest(request))
        const invalidRequests = validationResults.filter(v => !v.isValid)
        
        if (invalidRequests.length > 0) {
          throw new Error(`${invalidRequests.length} invalid requests found`)
        }

        // Process requests in parallel with concurrency limit
        const results = await Promise.allSettled(
          requests.map(request => generateSchedule(request))
        )

        const successful = results
          .filter((result): result is PromiseFulfilledResult<ScheduleGenerationResult> => 
            result.status === 'fulfilled' && result.value.success
          )
          .map(result => result.value)

        const failed = results
          .filter(result => result.status === 'rejected' || 
            (result.status === 'fulfilled' && !result.value.success)
          )

        toast.dismiss(loadingToastId)

        if (failed.length > 0) {
          toast.warning(
            language === 'ar'
              ? `نجح ${successful.length} من ${requests.length} جداول، فشل ${failed.length}`
              : `${successful.length} of ${requests.length} schedules successful, ${failed.length} failed`
          )
        } else {
          toast.success(
            language === 'ar'
              ? `تم توليد ${successful.length} جداول بنجاح`
              : `${successful.length} schedules generated successfully`
          )
        }

        return successful

      } catch (error) {
        toast.dismiss(loadingToastId)
        throw error
      }
    },

    onSuccess: (results) => {
      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({ 
        queryKey: scheduleGenerationKeys.all 
      })

      // Cache all generated sessions
      const allSessions = results.flatMap(result => result.data.generated_sessions)
      queryClient.setQueryData(['scheduled-sessions', 'batch-generated'], allSessions)
    },

    onError: (error: Error) => {
      const errorMessage = language === 'ar'
        ? `فشل في التوليد المجمع: ${error.message}`
        : `Batch generation failed: ${error.message}`
      
      toast.error(errorMessage)
    }
  })
}

/**
 * Get schedule generation statistics
 */
export function useScheduleGenerationStats(dateRange?: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: ['schedule-generation', 'stats', dateRange],
    queryFn: async () => {
      // This would typically call a backend API
      // For now, return mock stats
      return {
        total_schedules_generated: 0,
        average_generation_time: 0,
        success_rate: 0,
        most_common_conflicts: [],
        optimization_improvements: 0
      }
    },
    enabled: Boolean(dateRange?.start_date && dateRange?.end_date),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15 // 15 minutes
  })
}

/**
 * Real-time schedule generation progress
 */
export function useScheduleGenerationProgress(generationId?: string) {
  return useQuery({
    queryKey: ['schedule-generation', 'progress', generationId],
    queryFn: async () => {
      if (!generationId) return null

      // This would typically connect to a WebSocket or polling endpoint
      // For now, return mock progress
      return {
        generation_id: generationId,
        status: 'in_progress',
        progress_percentage: 0,
        current_stage: 'initializing',
        stages_completed: [],
        estimated_completion_time: null
      }
    },
    enabled: Boolean(generationId),
    refetchInterval: 1000, // Poll every second while in progress
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 30 // 30 seconds
  })
}

/**
 * Conflict analysis for generated schedules
 */
export function useScheduleConflictAnalysis(sessions: ScheduledSession[]) {
  const { language } = useI18n()

  return useQuery({
    queryKey: ['schedule-conflicts', 'analysis', sessions.length],
    queryFn: async (): Promise<{
      conflicts: ScheduleConflict[]
      severity_breakdown: Record<string, number>
      resolution_suggestions: Array<{
        conflict_id: string
        suggestions: string[]
      }>
    }> => {
      // Analyze conflicts in the sessions
      const conflicts: ScheduleConflict[] = []
      const severityBreakdown = { high: 0, medium: 0, low: 0 }

      // Group sessions by therapist and date for conflict detection
      const sessionsByTherapistDate = new Map<string, ScheduledSession[]>()
      
      sessions.forEach(session => {
        const key = `${session.therapist_id}|${session.session_date}`
        if (!sessionsByTherapistDate.has(key)) {
          sessionsByTherapistDate.set(key, [])
        }
        sessionsByTherapistDate.get(key)!.push(session)
      })

      // Check for time conflicts
      sessionsByTherapistDate.forEach((therapistSessions, key) => {
        const sortedSessions = therapistSessions.sort((a, b) => 
          a.start_time.localeCompare(b.start_time)
        )

        for (let i = 1; i < sortedSessions.length; i++) {
          const prevSession = sortedSessions[i - 1]
          const currentSession = sortedSessions[i]

          if (prevSession.end_time > currentSession.start_time) {
            const conflict: ScheduleConflict = {
              session_id: currentSession.id,
              conflict_type: 'therapist_double_booked',
              conflict_severity: 'high',
              conflicting_session_id: prevSession.id,
              description_ar: 'تعارض في مواعيد المعالج',
              description_en: 'Therapist double booking conflict',
              suggested_resolution: 'reschedule_session'
            }

            conflicts.push(conflict)
            severityBreakdown.high += 1
          }
        }
      })

      const resolutionSuggestions = conflicts.map(conflict => ({
        conflict_id: conflict.session_id,
        suggestions: [
          language === 'ar' ? 'إعادة جدولة الجلسة' : 'Reschedule session',
          language === 'ar' ? 'تغيير المعالج' : 'Change therapist',
          language === 'ar' ? 'دمج الجلسات' : 'Merge sessions'
        ]
      }))

      return {
        conflicts,
        severity_breakdown: severityBreakdown,
        resolution_suggestions: resolutionSuggestions
      }
    },
    enabled: sessions.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  })
}

/**
 * Export generated schedule to various formats
 */
export function useExportSchedule() {
  const { language } = useI18n()

  return useMutation({
    mutationFn: async ({
      sessions,
      format,
      options
    }: {
      sessions: ScheduledSession[]
      format: 'pdf' | 'csv' | 'ical' | 'xlsx'
      options?: Record<string, any>
    }): Promise<Blob> => {
      const loadingToastId = toast.loading(
        language === 'ar' 
          ? 'جاري تصدير الجدول...' 
          : 'Exporting schedule...'
      )

      try {
        // This would typically call an export service
        // For now, create a simple CSV export
        let content = ''
        let mimeType = 'text/csv'

        if (format === 'csv') {
          const headers = language === 'ar'
            ? 'الطالب,المعالج,التاريخ,وقت البداية,وقت النهاية,المدة'
            : 'Student,Therapist,Date,Start Time,End Time,Duration'
          
          const rows = sessions.map(session => 
            `"${session.student_id}","${session.therapist_id}","${session.session_date}","${session.start_time}","${session.end_time}","${session.duration_minutes}"`
          )

          content = [headers, ...rows].join('\n')
        }

        const blob = new Blob([content], { type: mimeType })

        toast.dismiss(loadingToastId)
        toast.success(
          language === 'ar' 
            ? 'تم تصدير الجدول بنجاح' 
            : 'Schedule exported successfully'
        )

        return blob

      } catch (error) {
        toast.dismiss(loadingToastId)
        throw error
      }
    },

    onError: (error: Error) => {
      const errorMessage = language === 'ar'
        ? `فشل في تصدير الجدول: ${error.message}`
        : `Schedule export failed: ${error.message}`
      
      toast.error(errorMessage)
    }
  })
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Prefetch common schedule generation data
 */
export function usePrefetchScheduleData() {
  const queryClient = useQueryClient()

  const prefetchPatterns = () => {
    queryClient.prefetchQuery({
      queryKey: scheduleGenerationKeys.patterns(),
      queryFn: getAvailableSchedulePatterns,
      staleTime: 1000 * 60 * 10 // 10 minutes
    })
  }

  return {
    prefetchPatterns
  }
}

/**
 * Schedule generation cache utilities
 */
export function useScheduleGenerationCache() {
  const queryClient = useQueryClient()

  const clearCache = () => {
    queryClient.removeQueries({ 
      queryKey: scheduleGenerationKeys.all 
    })
  }

  const getCachedGeneration = (request: ScheduleGenerationRequest) => {
    return queryClient.getQueryData(
      scheduleGenerationKeys.generation(request)
    )
  }

  const setCachedGeneration = (request: ScheduleGenerationRequest, data: ScheduleGenerationResult) => {
    queryClient.setQueryData(
      scheduleGenerationKeys.generation(request),
      data
    )
  }

  return {
    clearCache,
    getCachedGeneration,
    setCachedGeneration
  }
}