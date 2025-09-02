import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { schedulingIntegration } from '@/services/scheduling-integration-service'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ScheduledSession, SchedulingIntegrationResult } from '@/types/scheduling'

/**
 * Scheduling Integration Hook
 * 
 * React hook for managing integration between scheduling and core systems.
 * Provides validation, conflict resolution, and synchronized operations
 * across student enrollment, therapist management, room booking, and billing systems.
 */

interface UseSchedulingIntegrationOptions {
  onSuccess?: (result: SchedulingIntegrationResult) => void
  onError?: (error: string) => void
  enableOptimisticUpdates?: boolean
}

interface IntegrationValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  data?: any
}

export function useSchedulingIntegration(options: UseSchedulingIntegrationOptions = {}) {
  const { language } = useLanguage()
  const queryClient = useQueryClient()
  
  const [validationState, setValidationState] = useState<IntegrationValidation>({
    isValid: true,
    errors: [],
    warnings: []
  })

  const [conflictResolution, setConflictResolution] = useState<{
    hasConflicts: boolean
    conflicts: any[]
    resolutionSuggestions: any[]
  }>({
    hasConflicts: false,
    conflicts: [],
    resolutionSuggestions: []
  })

  // Session validation against all systems
  const sessionValidationMutation = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      return await schedulingIntegration.validateSessionIntegration(sessionData)
    },
    onSuccess: (result) => {
      setValidationState({
        isValid: result.success,
        errors: result.success ? [] : [result.error].filter(Boolean),
        warnings: result.warnings || [],
        data: result.data
      })

      if (result.success) {
        toast.success(
          language === 'ar' 
            ? 'تم التحقق من التكامل بنجاح' 
            : 'Integration validation successful'
        )
        options.onSuccess?.(result)
      } else {
        toast.error(
          language === 'ar' 
            ? `فشل في التحقق: ${result.error}` 
            : `Validation failed: ${result.error}`
        )
        options.onError?.(result.error)
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setValidationState({
        isValid: false,
        errors: [errorMessage],
        warnings: []
      })
      
      toast.error(
        language === 'ar' 
          ? 'خطأ في التحقق من التكامل' 
          : 'Integration validation error'
      )
      options.onError?.(errorMessage)
    }
  })

  // Student enrollment system integration
  const enrollmentIntegrationMutation = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      return await schedulingIntegration.syncWithEnrollmentSystem(sessionData)
    },
    onSuccess: (result) => {
      if (result.success) {
        // Update enrollment-related queries
        queryClient.invalidateQueries({ queryKey: ['student-enrollments'] })
        queryClient.invalidateQueries({ queryKey: ['therapy-plans'] })
        
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام التسجيل' 
            : 'Enrollment system integration complete'
        )
      }
    }
  })

  // Therapist system integration
  const therapistIntegrationMutation = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      return await schedulingIntegration.syncWithTherapistSystem(sessionData)
    },
    onSuccess: (result) => {
      if (result.success) {
        // Update therapist-related queries
        queryClient.invalidateQueries({ queryKey: ['therapist-availability'] })
        queryClient.invalidateQueries({ queryKey: ['therapist-workload'] })
        
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام المعالجين' 
            : 'Therapist system integration complete'
        )
      }
    }
  })

  // Room management system integration
  const roomIntegrationMutation = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      return await schedulingIntegration.syncWithRoomSystem(sessionData)
    },
    onSuccess: (result) => {
      if (result.success) {
        // Update room-related queries
        queryClient.invalidateQueries({ queryKey: ['room-availability'] })
        queryClient.invalidateQueries({ queryKey: ['equipment-status'] })
        
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام إدارة الغرف' 
            : 'Room management integration complete'
        )
      }
    }
  })

  // Billing system integration
  const billingIntegrationMutation = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      return await schedulingIntegration.syncWithBillingSystem(sessionData)
    },
    onSuccess: (result) => {
      if (result.success) {
        // Update billing-related queries
        queryClient.invalidateQueries({ queryKey: ['billing-records'] })
        queryClient.invalidateQueries({ queryKey: ['payment-status'] })
        
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام الفوترة' 
            : 'Billing system integration complete'
        )
      }
    }
  })

  // Conflict resolution
  const conflictResolutionMutation = useMutation({
    mutationFn: async ({
      originalSession,
      proposedChanges
    }: {
      originalSession: ScheduledSession
      proposedChanges: Partial<ScheduledSession>
    }) => {
      return await schedulingIntegration.resolveSchedulingConflicts(originalSession, proposedChanges)
    },
    onSuccess: (result) => {
      if (result.success) {
        setConflictResolution({
          hasConflicts: false,
          conflicts: [],
          resolutionSuggestions: []
        })
        
        // Refresh all related queries after conflict resolution
        queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['schedule-conflicts'] })
        
        toast.success(
          language === 'ar' 
            ? 'تم حل التضارب بنجاح' 
            : 'Conflicts resolved successfully'
        )
      } else {
        setConflictResolution({
          hasConflicts: true,
          conflicts: result.data?.conflicts || [],
          resolutionSuggestions: result.data?.suggestedAlternatives || []
        })
        
        toast.error(
          language === 'ar' 
            ? `لا يمكن حل التضارب: ${result.error}` 
            : `Cannot resolve conflicts: ${result.error}`
        )
      }
    }
  })

  // Comprehensive session creation with full integration
  const createSessionWithIntegration = useMutation({
    mutationFn: async (sessionData: Partial<ScheduledSession>) => {
      // First validate against all systems
      const validation = await schedulingIntegration.validateSessionIntegration(sessionData)
      
      if (!validation.success) {
        throw new Error(validation.error)
      }

      // Execute parallel integration with all systems
      const integrationResults = await Promise.allSettled([
        schedulingIntegration.syncWithEnrollmentSystem(sessionData),
        schedulingIntegration.syncWithTherapistSystem(sessionData),
        schedulingIntegration.syncWithRoomSystem(sessionData),
        schedulingIntegration.syncWithBillingSystem(sessionData)
      ])

      // Check for failures
      const failures = integrationResults
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason.message)

      const systemFailures = integrationResults
        .filter((result): result is PromiseFulfilledResult<SchedulingIntegrationResult> => 
          result.status === 'fulfilled' && !result.value.success
        )
        .map(result => result.value.error)

      const allFailures = [...failures, ...systemFailures].filter(Boolean)

      if (allFailures.length > 0) {
        throw new Error(`Integration failures: ${allFailures.join(', ')}`)
      }

      // All integrations successful, create the session
      const { data: newSession, error } = await supabase
        .from('scheduled_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) throw error
      return newSession

    },
    onSuccess: (session) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] })
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['therapist-availability'] })
      queryClient.invalidateQueries({ queryKey: ['room-availability'] })
      queryClient.invalidateQueries({ queryKey: ['billing-records'] })

      toast.success(
        language === 'ar' 
          ? 'تم إنشاء الجلسة مع التكامل الكامل' 
          : 'Session created with full integration'
      )

      options.onSuccess?.({ 
        success: true, 
        data: session, 
        warnings: [] 
      })
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(
        language === 'ar' 
          ? `فشل في إنشاء الجلسة: ${errorMessage}` 
          : `Failed to create session: ${errorMessage}`
      )
      options.onError?.(errorMessage)
    }
  })

  // Utility functions
  const validateSession = useCallback((sessionData: Partial<ScheduledSession>) => {
    sessionValidationMutation.mutate(sessionData)
  }, [sessionValidationMutation])

  const integrateSystems = useCallback(async (sessionData: Partial<ScheduledSession>) => {
    // Run all integrations in parallel
    await Promise.allSettled([
      enrollmentIntegrationMutation.mutateAsync(sessionData),
      therapistIntegrationMutation.mutateAsync(sessionData),
      roomIntegrationMutation.mutateAsync(sessionData),
      billingIntegrationMutation.mutateAsync(sessionData)
    ])
  }, [
    enrollmentIntegrationMutation,
    therapistIntegrationMutation,
    roomIntegrationMutation,
    billingIntegrationMutation
  ])

  const resolveConflicts = useCallback((
    originalSession: ScheduledSession,
    proposedChanges: Partial<ScheduledSession>
  ) => {
    conflictResolutionMutation.mutate({ originalSession, proposedChanges })
  }, [conflictResolutionMutation])

  const createSession = useCallback((sessionData: Partial<ScheduledSession>) => {
    createSessionWithIntegration.mutate(sessionData)
  }, [createSessionWithIntegration])

  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: true,
      errors: [],
      warnings: []
    })
  }, [])

  const clearConflicts = useCallback(() => {
    setConflictResolution({
      hasConflicts: false,
      conflicts: [],
      resolutionSuggestions: []
    })
  }, [])

  return {
    // State
    validation: validationState,
    conflicts: conflictResolution,
    
    // Loading states
    isValidating: sessionValidationMutation.isPending,
    isIntegratingEnrollment: enrollmentIntegrationMutation.isPending,
    isIntegratingTherapist: therapistIntegrationMutation.isPending,
    isIntegratingRoom: roomIntegrationMutation.isPending,
    isIntegratingBilling: billingIntegrationMutation.isPending,
    isResolvingConflicts: conflictResolutionMutation.isPending,
    isCreatingSession: createSessionWithIntegration.isPending,
    
    // Combined loading state
    isLoading: sessionValidationMutation.isPending ||
              enrollmentIntegrationMutation.isPending ||
              therapistIntegrationMutation.isPending ||
              roomIntegrationMutation.isPending ||
              billingIntegrationMutation.isPending ||
              conflictResolutionMutation.isPending ||
              createSessionWithIntegration.isPending,

    // Actions
    validateSession,
    integrateSystems,
    resolveConflicts,
    createSession,
    
    // Utilities
    clearValidation,
    clearConflicts,
    
    // Raw mutations for advanced usage
    mutations: {
      validation: sessionValidationMutation,
      enrollment: enrollmentIntegrationMutation,
      therapist: therapistIntegrationMutation,
      room: roomIntegrationMutation,
      billing: billingIntegrationMutation,
      conflicts: conflictResolutionMutation,
      creation: createSessionWithIntegration
    }
  }
}

// Additional integration hooks for specific systems

export function useEnrollmentIntegration() {
  const { language } = useLanguage()

  return useMutation({
    mutationFn: schedulingIntegration.syncWithEnrollmentSystem,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام التسجيل' 
            : 'Enrollment integration successful'
        )
      }
    }
  })
}

export function useTherapistIntegration() {
  const { language } = useLanguage()

  return useMutation({
    mutationFn: schedulingIntegration.syncWithTherapistSystem,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام المعالجين' 
            : 'Therapist integration successful'
        )
      }
    }
  })
}

export function useRoomIntegration() {
  const { language } = useLanguage()

  return useMutation({
    mutationFn: schedulingIntegration.syncWithRoomSystem,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام الغرف' 
            : 'Room integration successful'
        )
      }
    }
  })
}

export function useBillingIntegration() {
  const { language } = useLanguage()

  return useMutation({
    mutationFn: schedulingIntegration.syncWithBillingSystem,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          language === 'ar' 
            ? 'تم التكامل مع نظام الفوترة' 
            : 'Billing integration successful'
        )
      }
    }
  })
}