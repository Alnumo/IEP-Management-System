/**
 * Provider Scheduling Hooks
 * خطافات جدولة مقدم الخدمة
 * 
 * @description React Query hooks for provider scheduling and assignment management
 * خطافات React Query لجدولة مقدم الخدمة وإدارة التعيين
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import { ProviderSchedulingService } from '@/services/provider-scheduling-service'
import { 
  ServiceProvider,
  ProviderAvailability,
  ProviderAssignment,
  SchedulingRequest,
  ProviderWorkload,
  ProviderStudentMatch,
  SchedulingResult,
  ProviderFilters,
  AvailabilityFilters,
  AssignmentFilters,
  SchedulingConstraints,
  SchedulingOptions
} from '@/types/provider-scheduling'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const PROVIDER_SCHEDULING_QUERY_KEYS = {
  all: ['provider-scheduling'] as const,
  providers: (filters?: ProviderFilters) => ['provider-scheduling', 'providers', filters] as const,
  provider: (id: string) => ['provider-scheduling', 'provider', id] as const,
  availability: (filters?: AvailabilityFilters) => ['provider-scheduling', 'availability', filters] as const,
  assignments: (filters?: AssignmentFilters) => ['provider-scheduling', 'assignments', filters] as const,
  assignment: (id: string) => ['provider-scheduling', 'assignment', id] as const,
  workload: (providerId: string, period?: string) => ['provider-scheduling', 'workload', providerId, period] as const,
  matches: (serviceId: string, studentId: string) => ['provider-scheduling', 'matches', serviceId, studentId] as const,
  scheduling: (requestId: string) => ['provider-scheduling', 'scheduling', requestId] as const,
} as const

// =============================================================================
// PROVIDER MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook to fetch service providers with filtering and sorting
 * خطاف لجلب مقدمي الخدمة مع التصفية والترتيب
 */
export function useProviders(filters: ProviderFilters = {}) {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.providers(filters),
    queryFn: () => ProviderSchedulingService.getProviders(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get a single provider by ID
 * خطاف للحصول على مقدم خدمة واحد بالمعرف
 */
export function useProvider(providerId: string) {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.provider(providerId),
    queryFn: async () => {
      const providers = await ProviderSchedulingService.getProviders()
      return providers.find(p => p.id === providerId) || null
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get available providers for a specific service
 * خطاف للحصول على مقدمي الخدمة المتاحين لخدمة محددة
 */
export function useAvailableProviders(
  serviceCategory: string,
  targetDate: Date,
  preferredTimes: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }> = []
) {
  return useQuery({
    queryKey: ['provider-scheduling', 'available-providers', serviceCategory, targetDate.toISOString(), preferredTimes],
    queryFn: async () => {
      const filters: ProviderFilters = {
        service_categories: [serviceCategory as any],
        assignment_status: ['active'],
        max_workload_percentage: 85
      }
      return ProviderSchedulingService.getProviders(filters)
    },
    enabled: !!serviceCategory,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to create or update a provider
 * خطاف لإنشاء أو تحديث مقدم خدمة
 */
export function useUpsertProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (providerData: Partial<ServiceProvider>) => {
      return ProviderSchedulingService.upsertProvider(providerData)
    },
    onSuccess: (provider) => {
      // Update provider cache
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.provider(provider.id),
        provider
      )

      // Invalidate provider lists
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.providers() 
      })

      toast({
        title: 'تم حفظ بيانات مقدم الخدمة',
        description: `${provider.name_ar} - ${provider.name_en}`,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في حفظ بيانات مقدم الخدمة',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// AVAILABILITY MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook to fetch provider availability with filtering
 * خطاف لجلب توفر مقدم الخدمة مع التصفية
 */
export function useProviderAvailability(filters: AvailabilityFilters = {}) {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.availability(filters),
    queryFn: () => ProviderSchedulingService.getProviderAvailability(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get availability for a specific provider
 * خطاف للحصول على توفر مقدم خدمة محدد
 */
export function useProviderAvailabilityByProvider(providerId: string, dateRange?: { start: Date; end: Date }) {
  const filters: AvailabilityFilters = {
    provider_ids: [providerId],
    ...(dateRange && { date_range: dateRange })
  }

  return useProviderAvailability(filters)
}

/**
 * Hook to create recurring availability slots
 * خطاف لإنشاء فتحات توفر متكررة
 */
export function useCreateRecurringAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      providerId,
      template
    }: {
      providerId: string
      template: {
        start_date: Date
        end_date: Date
        days_of_week: number[]
        time_slots: Array<{ start_time: string; end_time: string }>
        available_services: any[]
        available_locations: any[]
        capacity: number
      }
    }) => {
      return ProviderSchedulingService.createRecurringAvailability(providerId, template)
    },
    onSuccess: (availabilitySlots, variables) => {
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.availability() 
      })

      toast({
        title: 'تم إنشاء جدول التوفر',
        description: `تم إنشاء ${availabilitySlots.length} فترة توفر متكررة`,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في إنشاء جدول التوفر',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to update availability slot
 * خطاف لتحديث فترة التوفر
 */
export function useUpdateAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      availabilityId,
      updates
    }: {
      availabilityId: string
      updates: Partial<ProviderAvailability>
    }) => {
      // Implementation would call service to update availability
      return { id: availabilityId, ...updates } // Placeholder
    },
    onSuccess: (updatedAvailability) => {
      // Update availability cache
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.availability() 
      })

      toast({
        title: 'تم تحديث التوفر',
        description: 'تم حفظ التغييرات في جدول التوفر',
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تحديث التوفر',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// ASSIGNMENT MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook to fetch provider assignments with filtering
 * خطاف لجلب تعيينات مقدم الخدمة مع التصفية
 */
export function useProviderAssignments(filters: AssignmentFilters = {}) {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.assignments(filters),
    queryFn: () => ProviderSchedulingService.getProviderAssignments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get assignments for a specific provider
 * خطاف للحصول على تعيينات مقدم خدمة محدد
 */
export function useProviderAssignmentsByProvider(providerId: string) {
  const filters: AssignmentFilters = {
    provider_ids: [providerId],
    assignment_status: ['active', 'pending']
  }

  return useProviderAssignments(filters)
}

/**
 * Hook to get assignments for a specific student
 * خطاف للحصول على تعيينات طالب محدد
 */
export function useProviderAssignmentsByStudent(studentId: string) {
  const filters: AssignmentFilters = {
    student_ids: [studentId],
    assignment_status: ['active', 'pending']
  }

  return useProviderAssignments(filters)
}

/**
 * Hook to create a provider assignment
 * خطاف لإنشاء تعيين مقدم خدمة
 */
export function useCreateProviderAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentData: Partial<ProviderAssignment>) => {
      return ProviderSchedulingService.createProviderAssignment(assignmentData)
    },
    onMutate: async (newAssignment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.assignments() 
      })

      // Create optimistic assignment
      const optimisticAssignment: Partial<ProviderAssignment> = {
        id: `temp-${Date.now()}`,
        ...newAssignment,
        assignment_status: 'pending',
        assigned_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      // Optimistically update assignments cache
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignments(),
        (old: ProviderAssignment[] | undefined) => {
          return old ? [optimisticAssignment as ProviderAssignment, ...old] : [optimisticAssignment as ProviderAssignment]
        }
      )

      return { optimisticAssignment }
    },
    onSuccess: (newAssignment, variables, context) => {
      // Replace optimistic assignment with real assignment
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignments(),
        (old: ProviderAssignment[] | undefined) => {
          if (!old) return [newAssignment]
          return old.map(assignment => 
            assignment.id === context?.optimisticAssignment.id ? newAssignment : assignment
          )
        }
      )

      // Update single assignment cache
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignment(newAssignment.id),
        newAssignment
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.workload(newAssignment.provider_id) 
      })

      toast({
        title: 'تم إنشاء التعيين بنجاح',
        description: `تم تعيين مقدم الخدمة للطالب`,
        variant: 'default'
      })
    },
    onError: (error: Error, variables, context) => {
      // Remove optimistic assignment on error
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignments(),
        (old: ProviderAssignment[] | undefined) => {
          return old?.filter(assignment => assignment.id !== context?.optimisticAssignment.id) || []
        }
      )

      toast({
        title: 'فشل في إنشاء التعيين',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to update an assignment
 * خطاف لتحديث تعيين
 */
export function useUpdateProviderAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assignmentId,
      updates
    }: {
      assignmentId: string
      updates: Partial<ProviderAssignment>
    }) => {
      // Implementation would call service to update assignment
      return { id: assignmentId, ...updates } as ProviderAssignment
    },
    onSuccess: (updatedAssignment) => {
      // Update assignment caches
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignment(updatedAssignment.id),
        updatedAssignment
      )

      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.assignments(),
        (old: ProviderAssignment[] | undefined) => {
          return old?.map(assignment => 
            assignment.id === updatedAssignment.id ? updatedAssignment : assignment
          ) || []
        }
      )

      toast({
        title: 'تم تحديث التعيين',
        description: 'تم حفظ التغييرات على التعيين',
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تحديث التعيين',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// INTELLIGENT MATCHING HOOKS
// =============================================================================

/**
 * Hook to find optimal provider matches for a student service
 * خطاف للعثور على أفضل مطابقات مقدم الخدمة للطالب
 */
export function useOptimalProviderMatches(
  serviceId: string,
  studentId: string,
  requirements: {
    service_category: string
    qualification_requirements?: string[]
    language_preferences?: string[]
    location_preferences?: any[]
    schedule_preferences?: Array<{
      day_of_week: number
      time_range: { start: string; end: string }
    }>
  }
) {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.matches(serviceId, studentId),
    queryFn: () => ProviderSchedulingService.findOptimalProviderMatches(
      serviceId,
      studentId,
      requirements as any,
      5 // max matches
    ),
    enabled: !!serviceId && !!studentId && !!requirements.service_category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to recalculate provider matches
 * خطاف لإعادة حساب مطابقات مقدم الخدمة
 */
export function useRecalculateMatches() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serviceId,
      studentId,
      requirements
    }: {
      serviceId: string
      studentId: string
      requirements: any
    }) => {
      return ProviderSchedulingService.findOptimalProviderMatches(
        serviceId,
        studentId,
        requirements,
        5
      )
    },
    onSuccess: (matches, variables) => {
      // Update matches cache
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.matches(variables.serviceId, variables.studentId),
        matches
      )

      toast({
        title: 'تم إعادة حساب المطابقات',
        description: `تم العثور على ${matches.length} مطابقة محتملة`,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في إعادة حساب المطابقات',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// SCHEDULING ALGORITHM HOOKS
// =============================================================================

/**
 * Hook to process a scheduling request
 * خطاف لمعالجة طلب الجدولة
 */
export function useProcessSchedulingRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      request,
      constraints,
      options
    }: {
      request: Partial<SchedulingRequest>
      constraints?: SchedulingConstraints
      options?: SchedulingOptions
    }) => {
      return ProviderSchedulingService.processSchedulingRequest(request, constraints, options)
    },
    onSuccess: (result, variables) => {
      // Cache scheduling result
      if (variables.request.id) {
        queryClient.setQueryData(
          PROVIDER_SCHEDULING_QUERY_KEYS.scheduling(variables.request.id),
          result
        )
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.assignments() 
      })
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.availability() 
      })

      const successMessage = result.success 
        ? `تم جدولة ${result.scheduled_sessions.length} جلسة بنجح`
        : 'لم يتم العثور على جدولة مناسبة'

      toast({
        title: result.success ? 'نجحت الجدولة' : 'فشلت الجدولة',
        description: successMessage,
        variant: result.success ? 'default' : 'destructive'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في معالجة طلب الجدولة',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// WORKLOAD MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook to get provider workload data
 * خطاف للحصول على بيانات عبء العمل لمقدم الخدمة
 */
export function useProviderWorkload(providerId: string, period: string = 'weekly') {
  return useQuery({
    queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.workload(providerId, period),
    queryFn: () => ProviderSchedulingService.updateProviderWorkload(providerId),
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to update provider workload
 * خطاف لتحديث عبء العمل لمقدم الخدمة
 */
export function useUpdateProviderWorkload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (providerId: string) => {
      return ProviderSchedulingService.updateProviderWorkload(providerId)
    },
    onSuccess: (workload, providerId) => {
      // Update workload cache
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.workload(providerId),
        workload
      )

      // Update provider cache with new workload data
      queryClient.setQueryData(
        PROVIDER_SCHEDULING_QUERY_KEYS.provider(providerId),
        (old: ServiceProvider | undefined) => {
          if (!old) return old
          return {
            ...old,
            current_workload_percentage: workload.utilization_percentage,
            workload_status: workload.workload_status,
            updated_at: new Date().toISOString()
          }
        }
      )

      // Invalidate provider list
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.providers() 
      })

      toast({
        title: 'تم تحديث عبء العمل',
        description: `معدل الاستغلال: ${workload.utilization_percentage}%`,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تحديث عبء العمل',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to get overloaded providers
 * خطاف للحصول على مقدمي الخدمة المحملين بالعمل
 */
export function useOverloadedProviders() {
  return useProviders({
    workload_status: ['overloaded', 'critical'],
    assignment_status: ['active']
  })
}

/**
 * Hook to get underutilized providers
 * خطاف للحصول على مقدمي الخدمة المستغلين بشكل ناقص
 */
export function useUnderutilizedProviders() {
  return useProviders({
    workload_status: ['underutilized'],
    assignment_status: ['active']
  })
}

/**
 * Hook to get providers available today
 * خطاف للحصول على مقدمي الخدمة المتاحين اليوم
 */
export function useProvidersAvailableToday() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return useProviderAvailability({
    date_range: { start: today, end: tomorrow },
    availability_status: ['available', 'partially_booked']
  })
}

/**
 * Hook to get upcoming assignments for a provider
 * خطاف للحصول على التعيينات القادمة لمقدم خدمة
 */
export function useUpcomingAssignments(providerId: string, days: number = 7) {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)

  return useProviderAssignments({
    provider_ids: [providerId],
    assignment_status: ['active'],
    date_range: { start: startDate, end: endDate }
  })
}

/**
 * Hook for bulk operations on provider assignments
 * خطاف للعمليات المجمعة على تعيينات مقدم الخدمة
 */
export function useBulkUpdateAssignments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assignmentIds,
      updates
    }: {
      assignmentIds: string[]
      updates: Partial<ProviderAssignment>
    }) => {
      // Implementation would update multiple assignments
      return assignmentIds.map(id => ({ id, ...updates }))
    },
    onSuccess: (updatedAssignments) => {
      // Invalidate assignments cache
      queryClient.invalidateQueries({ 
        queryKey: PROVIDER_SCHEDULING_QUERY_KEYS.assignments() 
      })

      toast({
        title: 'تم تحديث التعيينات',
        description: `تم تحديث ${updatedAssignments.length} تعيين`,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تحديث التعيينات',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}