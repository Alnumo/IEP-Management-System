/**
 * Comprehensive Scheduling Engine Hook
 * Story 3.1: Automated Scheduling Engine - React Integration
 * 
 * Main hook that integrates all scheduling services and provides a unified
 * interface for React components. Supports Arabic RTL/English LTR.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { schedulingEngine, generateOptimizedSchedule } from '@/services/scheduling/scheduling-engine'
import { conflictDetector, detectSessionConflicts } from '@/services/scheduling/conflict-detector'
import { optimizationRuleEngine, executeOptimizationRules } from '@/services/scheduling/optimization-rule-engine'
import { bulkReschedulingEngine, executeBulkReschedule } from '@/services/scheduling/bulk-rescheduling-engine'
import { supabase } from '@/lib/supabase'
import type {
  SchedulingRequest,
  SchedulingResult,
  ScheduledSession,
  ScheduleConflict,
  ScheduleTemplate,
  TherapistAvailability,
  OptimizationRule,
  BulkReschedulingRequest,
  BulkReschedulingResult,
  SchedulingSuggestion,
  SchedulingMetrics
} from '@/types/scheduling'

// =====================================================
// Main Scheduling Engine Hook
// =====================================================

export function useSchedulingEngine() {
  const { language } = useLanguage()
  const queryClient = useQueryClient()
  
  // State management
  const [activeOperations, setActiveOperations] = useState<Map<string, any>>(new Map())
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    avgGenerationTime: number
    successRate: number
    conflictRate: number
  }>({
    avgGenerationTime: 0,
    successRate: 0,
    conflictRate: 0
  })

  // =====================================================
  // Schedule Generation
  // =====================================================

  const generateScheduleMutation = useMutation({
    mutationFn: async (request: SchedulingRequest) => {
      const startTime = Date.now()
      const result = await generateOptimizedSchedule(request)
      
      // Update performance metrics
      const generationTime = Date.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        avgGenerationTime: (prev.avgGenerationTime + generationTime) / 2
      }))
      
      return result
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-conflicts'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-metrics'] })
      
      toast.success(
        language === 'ar' 
          ? `تم إنشاء ${result.generated_sessions.length} جلسة بنجاح`
          : `Successfully generated ${result.generated_sessions.length} sessions`
      )
    },
    onError: (error) => {
      console.error('Schedule generation failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشل في إنشاء الجدول'
          : 'Schedule generation failed'
      )
    }
  })

  // =====================================================
  // Conflict Management
  // =====================================================

  const detectConflictsMutation = useMutation({
    mutationFn: async (params: {
      session: ScheduledSession
      context?: {
        existingSessions?: ScheduledSession[]
        availability?: TherapistAvailability[]
        checkResources?: boolean
      }
    }) => {
      return detectSessionConflicts(params.session, params.context)
    },
    onSuccess: (conflicts, variables) => {
      if (conflicts.length > 0) {
        toast.warning(
          language === 'ar' 
            ? `تم اكتشاف ${conflicts.length} تضارب`
            : `${conflicts.length} conflicts detected`
        )
      }
    }
  })

  const batchConflictDetection = useMutation({
    mutationFn: async (params: {
      sessions: ScheduledSession[]
      options?: {
        parallelProcessing?: boolean
        maxConcurrency?: number
        includeResources?: boolean
      }
    }) => {
      return conflictDetector.detectBatchConflicts(params.sessions, params.options)
    },
    onSuccess: (conflictMap) => {
      const totalConflicts = Array.from(conflictMap.values()).reduce(
        (sum, conflicts) => sum + conflicts.length, 
        0
      )
      
      setPerformanceMetrics(prev => ({
        ...prev,
        conflictRate: (totalConflicts / conflictMap.size) * 100
      }))
      
      if (totalConflicts > 0) {
        toast.warning(
          language === 'ar' 
            ? `تم اكتشاف ${totalConflicts} تضارب في ${conflictMap.size} جلسة`
            : `${totalConflicts} conflicts detected across ${conflictMap.size} sessions`
        )
      }
    }
  })

  // =====================================================
  // Optimization Rules
  // =====================================================

  const executeRulesMutation = useMutation({
    mutationFn: async (params: {
      sessions: ScheduledSession[]
      request: SchedulingRequest
      context?: {
        availability?: TherapistAvailability[]
        existingSessions?: ScheduledSession[]
        ruleSet?: string
      }
    }) => {
      return executeOptimizationRules(params.sessions, params.request, params.context)
    },
    onSuccess: (result) => {
      toast.success(
        language === 'ar' 
          ? `تم تطبيق ${result.appliedRules.length} قاعدة تحسين بنجاح`
          : `Successfully applied ${result.appliedRules.length} optimization rules`
      )
    }
  })

  // =====================================================
  // Bulk Operations
  // =====================================================

  const bulkRescheduleMutation = useMutation({
    mutationFn: async (request: BulkReschedulingRequest) => {
      const operationId = `bulk_${Date.now()}`
      setActiveOperations(prev => new Map(prev).set(operationId, {
        status: 'starting',
        progress: 0,
        type: request.operation_type
      }))
      
      return executeBulkReschedule(request)
    },
    onSuccess: (result) => {
      // Remove from active operations
      setActiveOperations(prev => {
        const updated = new Map(prev)
        updated.delete(result.operation_id)
        return updated
      })
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-conflicts'] })
      
      toast.success(
        language === 'ar' 
          ? `تمت العملية الجماعية بنجاح: ${result.successful_operations} من ${result.total_requested}`
          : `Bulk operation completed: ${result.successful_operations}/${result.total_requested} successful`
      )
    },
    onError: (error) => {
      console.error('Bulk rescheduling failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشلت العملية الجماعية'
          : 'Bulk operation failed'
      )
    }
  })

  // =====================================================
  // Data Fetching Queries
  // =====================================================

  // Fetch schedule templates
  const {
    data: scheduleTemplates = [],
    isLoading: templatesLoading,
    refetch: refetchTemplates
  } = useQuery({
    queryKey: ['schedule-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('is_active', true)
        .order('name_ar', { ascending: true })

      if (error) throw error
      return data as ScheduleTemplate[]
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  })

  // Fetch optimization rules
  const {
    data: optimizationRules = [],
    isLoading: rulesLoading,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['optimization-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimization_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      if (error) throw error
      return data as OptimizationRule[]
    },
    staleTime: 15 * 60 * 1000 // 15 minutes
  })

  // Fetch scheduling metrics
  const {
    data: schedulingMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['scheduling-metrics', new Date().toDateString()],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data, error } = await supabase.rpc('get_schedule_statistics', {
        start_date: weekAgo,
        end_date: today
      })

      if (error) throw error
      return data as SchedulingMetrics
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // 30 seconds
  })

  // =====================================================
  // Utility Functions
  // =====================================================

  const validateSchedulingRequest = useCallback((request: SchedulingRequest) => {
    const errors: string[] = []

    if (!request.student_subscription_id) {
      errors.push(language === 'ar' ? 'معرف اشتراك الطالب مطلوب' : 'Student subscription ID is required')
    }

    if (!request.start_date || !request.end_date) {
      errors.push(language === 'ar' ? 'تواريخ البداية والنهاية مطلوبة' : 'Start and end dates are required')
    }

    if (request.start_date && request.end_date && new Date(request.start_date) >= new Date(request.end_date)) {
      errors.push(language === 'ar' ? 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' : 'Start date must be before end date')
    }

    if (!request.total_sessions || request.total_sessions <= 0) {
      errors.push(language === 'ar' ? 'عدد الجلسات يجب أن يكون أكبر من صفر' : 'Total sessions must be greater than zero')
    }

    if (!request.session_duration || request.session_duration <= 0) {
      errors.push(language === 'ar' ? 'مدة الجلسة يجب أن تكون أكبر من صفر' : 'Session duration must be greater than zero')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [language])

  const generateConflictResolutions = useCallback(async (
    conflicts: ScheduleConflict[],
    session: ScheduledSession,
    availability?: TherapistAvailability[]
  ): Promise<SchedulingSuggestion[]> => {
    return conflictDetector.generateResolutionSuggestions(conflicts, session, availability)
  }, [])

  const getOperationStatus = useCallback((operationId: string) => {
    return bulkReschedulingEngine.getOperationStatus(operationId)
  }, [])

  const cancelOperation = useCallback(async (operationId: string) => {
    const result = await bulkReschedulingEngine.cancelOperation(operationId)
    
    if (result.success) {
      setActiveOperations(prev => {
        const updated = new Map(prev)
        updated.delete(operationId)
        return updated
      })
      
      toast.success(
        language === 'ar' ? 'تم إلغاء العملية بنجاح' : 'Operation cancelled successfully'
      )
    }
    
    return result
  }, [language])

  const rollbackOperation = useCallback(async (operationId: string) => {
    const result = await bulkReschedulingEngine.rollbackOperation(operationId)
    
    if (result.success) {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-conflicts'] })
      
      toast.success(
        language === 'ar' ? 'تم التراجع عن العملية بنجاح' : 'Operation rolled back successfully'
      )
    }
    
    return result
  }, [language, queryClient])

  // =====================================================
  // Performance Monitoring
  // =====================================================

  const updatePerformanceMetrics = useCallback(() => {
    const ruleStats = optimizationRuleEngine.getRuleStatistics()
    const avgSuccessRate = Array.from(ruleStats.values()).reduce((sum, stats) => {
      if (!stats) return sum
      return sum + (stats.successes / stats.executions) * 100
    }, 0) / ruleStats.size || 100

    setPerformanceMetrics(prev => ({
      ...prev,
      successRate: avgSuccessRate
    }))
  }, [])

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(updatePerformanceMetrics, 60000) // Every minute
    return () => clearInterval(interval)
  }, [updatePerformanceMetrics])

  // =====================================================
  // Return Hook Interface
  // =====================================================

  return {
    // Core scheduling operations
    generateSchedule: generateScheduleMutation.mutateAsync,
    isGenerating: generateScheduleMutation.isPending,
    
    // Conflict management
    detectConflicts: detectConflictsMutation.mutateAsync,
    detectBatchConflicts: batchConflictDetection.mutateAsync,
    generateConflictResolutions,
    isDetectingConflicts: detectConflictsMutation.isPending || batchConflictDetection.isPending,
    
    // Optimization
    executeOptimizationRules: executeRulesMutation.mutateAsync,
    isOptimizing: executeRulesMutation.isPending,
    
    // Bulk operations
    executeBulkReschedule: bulkRescheduleMutation.mutateAsync,
    isBulkProcessing: bulkRescheduleMutation.isPending,
    activeOperations: Array.from(activeOperations.entries()).map(([id, op]) => ({ id, ...op })),
    getOperationStatus,
    cancelOperation,
    rollbackOperation,
    
    // Data
    scheduleTemplates,
    optimizationRules,
    schedulingMetrics,
    performanceMetrics,
    
    // Loading states
    isLoading: templatesLoading || rulesLoading || metricsLoading,
    templatesLoading,
    rulesLoading,
    metricsLoading,
    
    // Utilities
    validateSchedulingRequest,
    refetchTemplates,
    refetchRules,
    refetchMetrics,
    
    // Performance monitoring
    updatePerformanceMetrics
  }
}

// =====================================================
// Specialized Hooks for Specific Use Cases
// =====================================================

/**
 * Hook specifically for conflict resolution workflows
 */
export function useConflictResolution() {
  const { language } = useLanguage()
  
  const resolveMutation = useMutation({
    mutationFn: async (params: {
      conflictId: string
      resolution: {
        method: string
        newSessionData?: Partial<ScheduledSession>
        notes?: string
      }
    }) => {
      const { error } = await supabase
        .from('schedule_conflicts')
        .update({
          resolution_status: 'resolved',
          resolution_method: params.resolution.method,
          resolution_notes: params.resolution.notes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', params.conflictId)

      if (error) throw error

      // Update session if new data provided
      if (params.resolution.newSessionData) {
        const { error: sessionError } = await supabase
          .from('therapy_sessions')
          .update(params.resolution.newSessionData)
          .eq('id', params.resolution.newSessionData.id)

        if (sessionError) throw sessionError
      }
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم حل التضارب بنجاح' : 'Conflict resolved successfully'
      )
    }
  })

  return {
    resolveConflict: resolveMutation.mutateAsync,
    isResolving: resolveMutation.isPending
  }
}

/**
 * Hook for template management
 */
export function useScheduleTemplates() {
  const { language } = useLanguage()
  const queryClient = useQueryClient()

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<ScheduleTemplate>) => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .insert(templateData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully'
      )
    }
  })

  const updateTemplateMutation = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<ScheduleTemplate> }) => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .update(params.updates)
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم تحديث القالب بنجاح' : 'Template updated successfully'
      )
    }
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('schedule_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم حذف القالب بنجاح' : 'Template deleted successfully'
      )
    }
  })

  return {
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending
  }
}

/**
 * Hook for monitoring scheduling performance
 */
export function useSchedulingPerformance() {
  const [performanceData, setPerformanceData] = useState({
    throughput: 0, // sessions per minute
    efficiency: 0, // percentage
    errorRate: 0, // percentage
    avgResponseTime: 0 // milliseconds
  })

  const { data: recentMetrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduling_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7)

      if (error) throw error
      return data
    },
    refetchInterval: 30 * 1000, // 30 seconds
    onSuccess: (data) => {
      if (data && data.length > 0) {
        // Calculate performance metrics
        const avgOptimizationScore = data.reduce((sum, metric) => 
          sum + (metric.schedule_optimization_score || 0), 0
        ) / data.length

        const avgGenerationTime = data.reduce((sum, metric) => 
          sum + (metric.average_generation_time || 0), 0
        ) / data.length

        setPerformanceData({
          throughput: data[0]?.total_schedules_generated || 0,
          efficiency: avgOptimizationScore,
          errorRate: 100 - ((data[0]?.successful_generations || 0) / Math.max(1, data[0]?.total_schedules_generated || 1)) * 100,
          avgResponseTime: avgGenerationTime
        })
      }
    }
  })

  return {
    performanceData,
    recentMetrics,
    isLoading: !recentMetrics
  }
}