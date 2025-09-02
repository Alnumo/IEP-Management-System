/**
 * Service Hour Tracking Hooks
 * خطافات تتبع ساعات الخدمة
 * 
 * @description React Query hooks for service hour tracking and compliance management
 * خطافات React Query لتتبع ساعات الخدمة وإدارة الامتثال
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import { ServiceHourTrackingService } from '@/services/service-hour-tracking'
import { 
  ServiceDeliverySession,
  ServiceSessionFormData,
  ServiceHourSummary,
  ServiceComplianceCalculation,
  ServiceSessionFilters,
  ServiceComplianceAlert,
  ComplianceAlertFilters,
  ServiceTrackingStats,
  SummaryPeriodType,
  CreateComplianceAlertData
} from '@/types/service-tracking'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const SERVICE_TRACKING_QUERY_KEYS = {
  all: ['service-tracking'] as const,
  sessions: (filters?: ServiceSessionFilters) => ['service-tracking', 'sessions', filters] as const,
  session: (id: string) => ['service-tracking', 'session', id] as const,
  summaries: (serviceId?: string, period?: SummaryPeriodType) => 
    ['service-tracking', 'summaries', serviceId, period] as const,
  summary: (id: string) => ['service-tracking', 'summary', id] as const,
  compliance: (serviceId: string, startDate: Date, endDate: Date) => 
    ['service-tracking', 'compliance', serviceId, startDate.toISOString(), endDate.toISOString()] as const,
  alerts: (filters?: ComplianceAlertFilters) => ['service-tracking', 'alerts', filters] as const,
  alert: (id: string) => ['service-tracking', 'alert', id] as const,
  stats: () => ['service-tracking', 'stats'] as const,
} as const

// =============================================================================
// SERVICE SESSION HOOKS
// =============================================================================

/**
 * Hook to fetch service delivery sessions with filtering
 * خطاف لجلب جلسات تقديم الخدمة مع التصفية
 */
export function useServiceSessions(filters: ServiceSessionFilters = {}) {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.sessions(filters),
    queryFn: () => ServiceHourTrackingService.getServiceSessions(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get a single service session by ID
 * خطاف للحصول على جلسة خدمة واحدة بالمعرف
 */
export function useServiceSession(sessionId: string) {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.session(sessionId),
    queryFn: async () => {
      const sessions = await ServiceHourTrackingService.getServiceSessions()
      return sessions.find(session => session.id === sessionId) || null
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to create a new service session
 * خطاف لإنشاء جلسة خدمة جديدة
 */
export function useCreateServiceSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serviceId,
      studentId,
      sessionData
    }: {
      serviceId: string
      studentId: string
      sessionData: ServiceSessionFormData
    }) => {
      return ServiceHourTrackingService.createSession(serviceId, studentId, sessionData)
    },
    onSuccess: (newSession) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.sessions() 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.summaries(newSession.service_id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم إنشاء الجلسة بنجاح',
        description: 'تم حفظ بيانات جلسة الخدمة الجديدة',
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في إنشاء الجلسة',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to update an existing service session
 * خطاف لتحديث جلسة خدمة موجودة
 */
export function useUpdateServiceSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      sessionData
    }: {
      sessionId: string
      sessionData: Partial<ServiceSessionFormData>
    }) => {
      return ServiceHourTrackingService.updateSession(sessionId, sessionData)
    },
    onMutate: async ({ sessionId, sessionData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.session(sessionId) 
      })

      // Snapshot previous value
      const previousSession = queryClient.getQueryData(
        SERVICE_TRACKING_QUERY_KEYS.session(sessionId)
      )

      // Optimistically update session
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.session(sessionId),
        (old: ServiceDeliverySession | undefined) => {
          if (!old) return old
          return { ...old, ...sessionData }
        }
      )

      return { previousSession }
    },
    onSuccess: (updatedSession) => {
      // Update the session cache
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.session(updatedSession.id),
        updatedSession
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.sessions() 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.summaries(updatedSession.service_id) 
      })

      toast({
        title: 'تم تحديث الجلسة بنجاح',
        description: 'تم حفظ تغييرات جلسة الخدمة',
        variant: 'default'
      })
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousSession) {
        queryClient.setQueryData(
          SERVICE_TRACKING_QUERY_KEYS.session(variables.sessionId),
          context.previousSession
        )
      }

      toast({
        title: 'فشل في تحديث الجلسة',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// SERVICE HOUR SUMMARY HOOKS
// =============================================================================

/**
 * Hook to fetch service hour summaries
 * خطاف لجلب ملخصات ساعات الخدمة
 */
export function useServiceHourSummaries(
  serviceId?: string,
  periodType?: SummaryPeriodType
) {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.summaries(serviceId, periodType),
    queryFn: async (): Promise<ServiceHourSummary[]> => {
      // This would be implemented with a proper service method
      // For now, returning empty array as placeholder
      return []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to update service hour summary
 * خطاف لتحديث ملخص ساعات الخدمة
 */
export function useUpdateServiceHourSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serviceId,
      studentId,
      periodType = 'weekly'
    }: {
      serviceId: string
      studentId: string
      periodType?: SummaryPeriodType
    }) => {
      return ServiceHourTrackingService.updateServiceHourSummary(
        serviceId, 
        studentId, 
        periodType
      )
    },
    onSuccess: (updatedSummary) => {
      // Update cache with new summary
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.summary(updatedSummary.id),
        updatedSummary
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.summaries() 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم تحديث ملخص الساعات',
        description: 'تم إعادة حساب ساعات الخدمة والامتثال',
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تحديث ملخص الساعات',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// COMPLIANCE CALCULATION HOOKS
// =============================================================================

/**
 * Hook to calculate service compliance for a specific period
 * خطاف لحساب امتثال الخدمة لفترة محددة
 */
export function useServiceCompliance(
  serviceId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.compliance(serviceId, periodStart, periodEnd),
    queryFn: () => ServiceHourTrackingService.calculateServiceCompliance(
      serviceId,
      periodStart,
      periodEnd
    ),
    enabled: !!serviceId && !!periodStart && !!periodEnd,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to recalculate compliance for a service
 * خطاف لإعادة حساب الامتثال للخدمة
 */
export function useRecalculateCompliance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serviceId,
      periodStart,
      periodEnd
    }: {
      serviceId: string
      periodStart: Date
      periodEnd: Date
    }) => {
      return ServiceHourTrackingService.calculateServiceCompliance(
        serviceId,
        periodStart,
        periodEnd
      )
    },
    onSuccess: (compliance, variables) => {
      // Update compliance cache
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.compliance(
          variables.serviceId,
          variables.periodStart,
          variables.periodEnd
        ),
        compliance
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.summaries(variables.serviceId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.alerts() 
      })

      toast({
        title: 'تم إعادة حساب الامتثال',
        description: `حالة الامتثال: ${compliance.compliance_status} (${compliance.compliance_percentage}%)`,
        variant: compliance.compliance_status === 'compliant' ? 'default' : 'destructive'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في إعادة حساب الامتثال',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// COMPLIANCE ALERT HOOKS
// =============================================================================

/**
 * Hook to fetch compliance alerts with filtering
 * خطاف لجلب تنبيهات الامتثال مع التصفية
 */
export function useComplianceAlerts(filters: ComplianceAlertFilters = {}) {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.alerts(filters),
    queryFn: async (): Promise<ServiceComplianceAlert[]> => {
      // This would be implemented with a proper service method
      // For now, returning empty array as placeholder
      return []
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to create a compliance alert
 * خطاف لإنشاء تنبيه امتثال
 */
export function useCreateComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertData: CreateComplianceAlertData) => {
      return ServiceHourTrackingService.createComplianceAlert(alertData)
    },
    onSuccess: (newAlert) => {
      // Add to alerts cache
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.alert(newAlert.id),
        newAlert
      )

      // Invalidate alerts list
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.alerts() 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم إنشاء تنبيه جديد',
        description: newAlert.alert_title_ar,
        variant: newAlert.priority_level === 'high' || newAlert.priority_level === 'critical' 
          ? 'destructive' 
          : 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في إنشاء التنبيه',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to resolve a compliance alert
 * خطاف لحل تنبيه امتثال
 */
export function useResolveComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      alertId,
      resolutionNotes
    }: {
      alertId: string
      resolutionNotes: { ar?: string; en?: string }
    }) => {
      // This would update the alert status to 'resolved' and add resolution notes
      // Placeholder implementation
      return { id: alertId, alert_status: 'resolved' as const }
    },
    onSuccess: (resolvedAlert) => {
      // Update alert cache
      queryClient.setQueryData(
        SERVICE_TRACKING_QUERY_KEYS.alert(resolvedAlert.id),
        (old: ServiceComplianceAlert | undefined) => {
          if (!old) return old
          return { ...old, alert_status: 'resolved', resolved_date: new Date().toISOString() }
        }
      )

      // Invalidate alerts list
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.alerts() 
      })
      queryClient.invalidateQueries({ 
        queryKey: SERVICE_TRACKING_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم حل التنبيه',
        description: 'تم وضع علامة على التنبيه كمحلول',
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في حل التنبيه',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// STATISTICS HOOKS
// =============================================================================

/**
 * Hook to fetch service tracking statistics
 * خطاف لجلب إحصائيات تتبع الخدمة
 */
export function useServiceTrackingStats() {
  return useQuery({
    queryKey: SERVICE_TRACKING_QUERY_KEYS.stats(),
    queryFn: () => ServiceHourTrackingService.getServiceTrackingStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to get sessions for a specific service and date range
 * خطاف للحصول على جلسات خدمة محددة ونطاق تاريخ
 */
export function useServiceSessionsForPeriod(
  serviceId: string,
  startDate: Date,
  endDate: Date
) {
  const filters: ServiceSessionFilters = {
    service_id: serviceId,
    date_range: { start: startDate, end: endDate }
  }

  return useServiceSessions(filters)
}

/**
 * Hook to get active compliance alerts for a service
 * خطاف للحصول على تنبيهات الامتثال النشطة لخدمة
 */
export function useActiveServiceAlerts(serviceId: string) {
  const filters: ComplianceAlertFilters = {
    service_id: serviceId,
    alert_status: ['active', 'acknowledged']
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook to check if session documentation is overdue
 * خطاف للتحقق من تأخر توثيق الجلسة
 */
export function useOverdueDocumentation() {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  return useServiceSessions({
    session_status: ['completed'],
    documentation_complete: false,
    date_range: {
      start: new Date(2020, 0, 1), // Far past date
      end: threeDaysAgo
    }
  })
}

/**
 * Hook to get sessions requiring makeup
 * خطاف للحصول على الجلسات التي تتطلب تعويض
 */
export function useSessionsRequiringMakeup() {
  return useServiceSessions({
    requires_makeup: true,
    session_status: ['cancelled', 'no_show']
  })
}