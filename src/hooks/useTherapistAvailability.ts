/**
 * useTherapistAvailability Hook
 * Story 3.1: Automated Scheduling Engine
 * 
 * React Query hooks for therapist availability management
 * Supports Arabic/English bilingual operations and intelligent caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  getTherapistAvailability,
  upsertTherapistAvailability,
  deleteTherapistAvailability,
  getAvailabilityTemplates,
  createAvailabilityTemplate,
  applyAvailabilityTemplate,
  createAvailabilityException,
  getAvailabilityExceptions,
  checkAvailabilityConflicts,
  findAlternativeTimeSlots,
  calculateWorkloadMetrics
} from '../services/availability-service'
import type {
  TherapistAvailability,
  AvailabilityTemplate,
  AvailabilityException,
  TimeSlot,
  ConflictType,
  SchedulingMetrics
} from '../types/scheduling'
import { useLanguage } from '../contexts/LanguageContext'

// =====================================================
// Query Keys
// =====================================================

export const availabilityKeys = {
  all: ['availability'] as const,
  therapist: (therapistId: string) => [...availabilityKeys.all, 'therapist', therapistId] as const,
  availability: (therapistId: string, startDate: string, endDate: string) => 
    [...availabilityKeys.therapist(therapistId), 'availability', startDate, endDate] as const,
  templates: (therapistId: string) => 
    [...availabilityKeys.therapist(therapistId), 'templates'] as const,
  exceptions: (therapistId: string, startDate: string, endDate: string) => 
    [...availabilityKeys.therapist(therapistId), 'exceptions', startDate, endDate] as const,
  workload: (therapistId: string, date: string) => 
    [...availabilityKeys.therapist(therapistId), 'workload', date] as const,
  conflicts: (therapistId: string, date: string, startTime: string, endTime: string) =>
    [...availabilityKeys.therapist(therapistId), 'conflicts', date, startTime, endTime] as const
}

// =====================================================
// Main Availability Hook
// =====================================================

export function useTherapistAvailability(
  therapistId: string,
  startDate: string,
  endDate: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  const { language } = useLanguage()
  const queryClient = useQueryClient()

  // Fetch availability data
  const {
    data: availability = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: availabilityKeys.availability(therapistId, startDate, endDate),
    queryFn: () => getTherapistAvailability(therapistId, startDate, endDate),
    enabled: options?.enabled ?? Boolean(therapistId && startDate && endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: options?.refetchInterval,
    retry: (failureCount, error) => {
      console.error('Availability fetch error:', error)
      return failureCount < 2
    }
  })

  // Create or update availability
  const createOrUpdateMutation = useMutation({
    mutationFn: upsertTherapistAvailability,
    onSuccess: (data) => {
      // Update the availability cache
      queryClient.setQueryData(
        availabilityKeys.availability(therapistId, startDate, endDate),
        (old: TherapistAvailability[] = []) => {
          const existingIndex = old.findIndex(item => item.id === data.id)
          if (existingIndex >= 0) {
            return old.map((item, index) => index === existingIndex ? data : item)
          }
          return [...old, data]
        }
      )
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })

      toast.success(
        language === 'ar' 
          ? 'تم حفظ التوفر بنجاح'
          : 'Availability saved successfully'
      )
    },
    onError: (error) => {
      console.error('Availability save error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في حفظ التوفر: ${error.message}`
          : `Failed to save availability: ${error.message}`
      )
    }
  })

  // Delete availability
  const deleteMutation = useMutation({
    mutationFn: deleteTherapistAvailability,
    onSuccess: (_, deletedId) => {
      // Update the availability cache by removing the deleted item
      queryClient.setQueryData(
        availabilityKeys.availability(therapistId, startDate, endDate),
        (old: TherapistAvailability[] = []) => 
          old.filter(item => item.id !== deletedId)
      )
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })

      toast.success(
        language === 'ar'
          ? 'تم حذف التوفر بنجاح'
          : 'Availability deleted successfully'
      )
    },
    onError: (error) => {
      console.error('Availability delete error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في حذف التوفر: ${error.message}`
          : `Failed to delete availability: ${error.message}`
      )
    }
  })

  return {
    // Data
    availability,
    isLoading,
    error,
    
    // Actions
    createOrUpdate: createOrUpdateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    refetch,
    
    // States
    isSaving: createOrUpdateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

// =====================================================
// Availability Templates Hook
// =====================================================

export function useAvailabilityTemplates(therapistId: string) {
  const { language } = useLanguage()
  const queryClient = useQueryClient()

  // Fetch templates
  const {
    data: templates = [],
    isLoading,
    error
  } = useQuery({
    queryKey: availabilityKeys.templates(therapistId),
    queryFn: () => getAvailabilityTemplates(therapistId),
    enabled: Boolean(therapistId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000 // 15 minutes
  })

  // Create template
  const createTemplateMutation = useMutation({
    mutationFn: ({ 
      name, 
      description 
    }: {
      name: { en: string; ar: string }
      description?: { en: string; ar: string }
    }) => createAvailabilityTemplate(therapistId, name, description),
    onSuccess: (newTemplate) => {
      // Update templates cache
      queryClient.setQueryData(
        availabilityKeys.templates(therapistId),
        (old: AvailabilityTemplate[] = []) => [...old, newTemplate]
      )

      toast.success(
        language === 'ar'
          ? 'تم إنشاء القالب بنجاح'
          : 'Template created successfully'
      )
    },
    onError: (error) => {
      console.error('Template creation error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في إنشاء القالب: ${error.message}`
          : `Failed to create template: ${error.message}`
      )
    }
  })

  // Apply template
  const applyTemplateMutation = useMutation({
    mutationFn: ({ 
      templateId, 
      startDate 
    }: {
      templateId: string
      startDate: string
    }) => applyAvailabilityTemplate(templateId, startDate),
    onSuccess: (result) => {
      // Invalidate availability data to refetch updated schedule
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })

      const message = result.conflicts.length > 0
        ? language === 'ar'
          ? `تم تطبيق القالب مع ${result.conflicts.length} تعارض`
          : `Template applied with ${result.conflicts.length} conflicts`
        : language === 'ar'
          ? 'تم تطبيق القالب بنجاح'
          : 'Template applied successfully'

      toast.success(message)
    },
    onError: (error) => {
      console.error('Template application error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في تطبيق القالب: ${error.message}`
          : `Failed to apply template: ${error.message}`
      )
    }
  })

  return {
    // Data
    templates,
    isLoading,
    error,
    
    // Actions
    createTemplate: createTemplateMutation.mutateAsync,
    applyTemplate: applyTemplateMutation.mutateAsync,
    
    // States
    isCreatingTemplate: createTemplateMutation.isPending,
    isApplyingTemplate: applyTemplateMutation.isPending
  }
}

// =====================================================
// Availability Exceptions Hook
// =====================================================

export function useAvailabilityExceptions(
  therapistId: string,
  startDate: string,
  endDate: string
) {
  const { language } = useLanguage()
  const queryClient = useQueryClient()

  // Fetch exceptions
  const {
    data: exceptions = [],
    isLoading,
    error
  } = useQuery({
    queryKey: availabilityKeys.exceptions(therapistId, startDate, endDate),
    queryFn: () => getAvailabilityExceptions(therapistId, startDate, endDate),
    enabled: Boolean(therapistId && startDate && endDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  // Create exception
  const createExceptionMutation = useMutation({
    mutationFn: createAvailabilityException,
    onSuccess: (newException) => {
      // Update exceptions cache
      queryClient.setQueryData(
        availabilityKeys.exceptions(therapistId, startDate, endDate),
        (old: AvailabilityException[] = []) => [...old, newException]
      )
      
      // Invalidate availability to reflect changes
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })

      toast.success(
        language === 'ar'
          ? 'تم إنشاء الاستثناء بنجاح'
          : 'Exception created successfully'
      )
    },
    onError: (error) => {
      console.error('Exception creation error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في إنشاء الاستثناء: ${error.message}`
          : `Failed to create exception: ${error.message}`
      )
    }
  })

  return {
    // Data
    exceptions,
    isLoading,
    error,
    
    // Actions
    createException: createExceptionMutation.mutateAsync,
    
    // States
    isCreatingException: createExceptionMutation.isPending
  }
}

// =====================================================
// Conflict Detection Hook
// =====================================================

export function useAvailabilityConflicts(
  therapistId: string,
  date: string,
  startTime: string,
  endTime: string,
  options?: {
    enabled?: boolean
  }
) {
  const { language } = useLanguage()

  return useQuery({
    queryKey: availabilityKeys.conflicts(therapistId, date, startTime, endTime),
    queryFn: () => checkAvailabilityConflicts(therapistId, date, startTime, endTime),
    enabled: options?.enabled ?? Boolean(therapistId && date && startTime && endTime),
    staleTime: 2 * 60 * 1000, // 2 minutes (conflicts change quickly)
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      console.error('Conflict check error:', error)
      return failureCount < 1 // Only retry once for conflict checks
    }
  })
}

// =====================================================
// Alternative Time Slots Hook  
// =====================================================

export function useAlternativeTimeSlots(
  therapistId: string,
  preferredDate: string,
  durationMinutes: number,
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...availabilityKeys.therapist(therapistId), 'alternatives', preferredDate, durationMinutes],
    queryFn: () => findAlternativeTimeSlots(therapistId, preferredDate, durationMinutes),
    enabled: options?.enabled ?? Boolean(therapistId && preferredDate && durationMinutes > 0),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })
}

// =====================================================
// Workload Metrics Hook
// =====================================================

export function useWorkloadMetrics(
  therapistId: string,
  date: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: availabilityKeys.workload(therapistId, date),
    queryFn: () => calculateWorkloadMetrics(therapistId, date),
    enabled: options?.enabled ?? Boolean(therapistId && date),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000 // Refresh every 5 minutes
  })
}

// =====================================================
// Bulk Availability Operations Hook
// =====================================================

export function useBulkAvailabilityOperations(therapistId: string) {
  const { language } = useLanguage()
  const queryClient = useQueryClient()

  // Bulk update availability
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Partial<TherapistAvailability>[]) => {
      const results = []
      for (const update of updates) {
        const result = await upsertTherapistAvailability(update)
        results.push(result)
      }
      return results
    },
    onSuccess: (results) => {
      // Invalidate all availability queries for this therapist
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })

      toast.success(
        language === 'ar'
          ? `تم تحديث ${results.length} فترة زمنية`
          : `Updated ${results.length} availability slots`
      )
    },
    onError: (error) => {
      console.error('Bulk update error:', error)
      toast.error(
        language === 'ar'
          ? `خطأ في التحديث الجماعي: ${error.message}`
          : `Bulk update failed: ${error.message}`
      )
    }
  })

  return {
    bulkUpdate: bulkUpdateMutation.mutateAsync,
    isBulkUpdating: bulkUpdateMutation.isPending
  }
}

// =====================================================
// Computed Availability Data Hook
// =====================================================

export function useAvailabilitySummary(
  therapistId: string,
  startDate: string,
  endDate: string
) {
  const { availability, isLoading } = useTherapistAvailability(therapistId, startDate, endDate)
  const { exceptions } = useAvailabilityExceptions(therapistId, startDate, endDate)

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!availability.length) {
      return {
        totalSlots: 0,
        availableSlots: 0,
        bookedSlots: 0,
        timeOffSlots: 0,
        utilizationRate: 0,
        totalCapacity: 0,
        remainingCapacity: 0,
        exceptionsCount: exceptions.length
      }
    }

    const totalSlots = availability.length
    const availableSlots = availability.filter(slot => slot.is_available && !slot.is_time_off).length
    const bookedSlots = availability.reduce((sum, slot) => sum + slot.current_bookings, 0)
    const timeOffSlots = availability.filter(slot => slot.is_time_off).length
    const totalCapacity = availability.reduce((sum, slot) => sum + slot.max_sessions_per_slot, 0)
    const remainingCapacity = totalCapacity - bookedSlots
    const utilizationRate = totalCapacity > 0 ? (bookedSlots / totalCapacity) * 100 : 0

    return {
      totalSlots,
      availableSlots,
      bookedSlots,
      timeOffSlots,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      totalCapacity,
      remainingCapacity,
      exceptionsCount: exceptions.length
    }
  }, [availability, exceptions])

  return {
    summary,
    isLoading,
    availability,
    exceptions
  }
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Hook to invalidate all availability-related caches
 */
export function useInvalidateAvailability() {
  const queryClient = useQueryClient()

  return {
    invalidateTherapist: (therapistId: string) => {
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.therapist(therapistId)
      })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.all
      })
    }
  }
}

/**
 * Hook for prefetching availability data
 */
export function usePrefetchAvailability() {
  const queryClient = useQueryClient()

  return {
    prefetchAvailability: (therapistId: string, startDate: string, endDate: string) => {
      queryClient.prefetchQuery({
        queryKey: availabilityKeys.availability(therapistId, startDate, endDate),
        queryFn: () => getTherapistAvailability(therapistId, startDate, endDate),
        staleTime: 5 * 60 * 1000
      })
    },
    prefetchTemplates: (therapistId: string) => {
      queryClient.prefetchQuery({
        queryKey: availabilityKeys.templates(therapistId),
        queryFn: () => getAvailabilityTemplates(therapistId),
        staleTime: 10 * 60 * 1000
      })
    }
  }
}