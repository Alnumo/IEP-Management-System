/**
 * Compliance Alert System Hooks
 * خطافات نظام تنبيهات الامتثال
 * 
 * @description React Query hooks for compliance alert management and notifications
 * خطافات React Query لإدارة تنبيهات الامتثال والإشعارات
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import { ComplianceAlertSystemService } from '@/services/compliance-alert-system'
import { 
  ServiceComplianceAlert,
  CreateComplianceAlertData,
  ComplianceAlertFilters,
  AlertType,
  AlertPriority,
  AlertStatus
} from '@/types/service-tracking'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const COMPLIANCE_ALERTS_QUERY_KEYS = {
  all: ['compliance-alerts'] as const,
  alerts: (filters?: ComplianceAlertFilters) => ['compliance-alerts', 'list', filters] as const,
  alert: (id: string) => ['compliance-alerts', 'detail', id] as const,
  stats: () => ['compliance-alerts', 'stats'] as const,
  monitoring: () => ['compliance-alerts', 'monitoring'] as const,
  recipients: (alertId: string) => ['compliance-alerts', 'recipients', alertId] as const,
  userAlerts: (userId: string, filters?: ComplianceAlertFilters) => 
    ['compliance-alerts', 'user', userId, filters] as const,
} as const

// =============================================================================
// COMPLIANCE ALERT MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook to fetch compliance alerts with filtering and sorting
 * خطاف لجلب تنبيهات الامتثال مع التصفية والترتيب
 */
export function useComplianceAlerts(filters: ComplianceAlertFilters = {}) {
  return useQuery({
    queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.alerts(filters),
    queryFn: () => ComplianceAlertSystemService.getComplianceAlerts(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for real-time updates
  })
}

/**
 * Hook to get a single compliance alert by ID
 * خطاف للحصول على تنبيه امتثال واحد بالمعرف
 */
export function useComplianceAlert(alertId: string) {
  return useQuery({
    queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.alert(alertId),
    queryFn: async () => {
      const alerts = await ComplianceAlertSystemService.getComplianceAlerts()
      return alerts.find(alert => alert.id === alertId) || null
    },
    enabled: !!alertId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get active alerts for the current user
 * خطاف للحصول على التنبيهات النشطة للمستخدم الحالي
 */
export function useUserActiveAlerts(userId: string) {
  const filters: ComplianceAlertFilters = {
    assigned_to: userId,
    alert_status: ['active', 'acknowledged'],
    requires_action: true
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook to get high priority alerts requiring immediate attention
 * خطاف للحصول على التنبيهات عالية الأولوية التي تتطلب اهتماماً فورياً
 */
export function useHighPriorityAlerts() {
  const filters: ComplianceAlertFilters = {
    priority_level: ['high', 'critical'],
    alert_status: ['active', 'acknowledged']
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook to get alerts for a specific service
 * خطاف للحصول على تنبيهات خدمة محددة
 */
export function useServiceAlerts(serviceId: string) {
  const filters: ComplianceAlertFilters = {
    service_id: serviceId,
    alert_status: ['active', 'acknowledged', 'resolved']
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook to get alerts for a specific student
 * خطاف للحصول على تنبيهات طالب محدد
 */
export function useStudentAlerts(studentId: string) {
  const filters: ComplianceAlertFilters = {
    student_id: studentId,
    alert_status: ['active', 'acknowledged', 'resolved']
  }

  return useComplianceAlerts(filters)
}

// =============================================================================
// ALERT CREATION AND MANAGEMENT MUTATIONS
// =============================================================================

/**
 * Hook to create a new compliance alert
 * خطاف لإنشاء تنبيه امتثال جديد
 */
export function useCreateComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertData: CreateComplianceAlertData) => {
      return ComplianceAlertSystemService.createComplianceAlert(alertData)
    },
    onMutate: async (newAlertData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.alerts() 
      })

      // Create optimistic alert object
      const optimisticAlert: Partial<ServiceComplianceAlert> = {
        id: `temp-${Date.now()}`,
        service_id: newAlertData.service_id,
        student_id: newAlertData.student_id,
        alert_type: newAlertData.alert_type,
        priority_level: newAlertData.priority_level,
        alert_status: 'active',
        alert_title_ar: newAlertData.alert_title_ar,
        alert_title_en: newAlertData.alert_title_en,
        alert_message_ar: newAlertData.alert_message_ar,
        alert_message_en: newAlertData.alert_message_en,
        alert_triggered_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requires_iep_team_review: false,
        requires_service_modification: false,
        requires_parent_notification: false
      }

      // Optimistically update the alerts cache
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old ? [optimisticAlert as ServiceComplianceAlert, ...old] : [optimisticAlert as ServiceComplianceAlert]
        }
      )

      return { optimisticAlert }
    },
    onSuccess: (newAlert, variables, context) => {
      // Replace optimistic alert with real alert
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          if (!old) return [newAlert]
          return old.map(alert => 
            alert.id === context?.optimisticAlert.id ? newAlert : alert
          )
        }
      )

      // Update single alert cache
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(newAlert.id),
        newAlert
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.alerts() 
      })
      queryClient.invalidateQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم إنشاء التنبيه بنجاح',
        description: newAlert.alert_title_ar,
        variant: newAlert.priority_level === 'high' || newAlert.priority_level === 'critical' 
          ? 'destructive' 
          : 'default'
      })
    },
    onError: (error: Error, variables, context) => {
      // Remove optimistic alert on error
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.filter(alert => alert.id !== context?.optimisticAlert.id) || []
        }
      )

      toast({
        title: 'فشل في إنشاء التنبيه',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to update an existing compliance alert
 * خطاف لتحديث تنبيه امتثال موجود
 */
export function useUpdateComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      alertId,
      updates
    }: {
      alertId: string
      updates: Partial<ServiceComplianceAlert>
    }) => {
      return ComplianceAlertSystemService.updateAlert(alertId, updates)
    },
    onMutate: async ({ alertId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.alert(alertId) 
      })

      // Snapshot previous value
      const previousAlert = queryClient.getQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(alertId)
      )

      // Optimistically update alert
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(alertId),
        (old: ServiceComplianceAlert | undefined) => {
          if (!old) return old
          return { ...old, ...updates, updated_at: new Date().toISOString() }
        }
      )

      // Update in alerts list
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.map(alert => 
            alert.id === alertId 
              ? { ...alert, ...updates, updated_at: new Date().toISOString() }
              : alert
          ) || []
        }
      )

      return { previousAlert, alertId }
    },
    onSuccess: (updatedAlert) => {
      // Update caches with real data
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(updatedAlert.id),
        updatedAlert
      )

      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.map(alert => 
            alert.id === updatedAlert.id ? updatedAlert : alert
          ) || []
        }
      )

      toast({
        title: 'تم تحديث التنبيه بنجاح',
        description: updatedAlert.alert_title_ar,
        variant: 'default'
      })
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAlert && context?.alertId) {
        queryClient.setQueryData(
          COMPLIANCE_ALERTS_QUERY_KEYS.alert(context.alertId),
          context.previousAlert
        )
      }

      toast({
        title: 'فشل في تحديث التنبيه',
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
      resolutionData
    }: {
      alertId: string
      resolutionData: {
        resolved_by_user_id: string
        resolution_notes_ar?: string
        resolution_notes_en?: string
        follow_up_required?: boolean
      }
    }) => {
      return ComplianceAlertSystemService.resolveAlert(alertId, resolutionData)
    },
    onSuccess: (resolvedAlert) => {
      // Update alert caches
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(resolvedAlert.id),
        resolvedAlert
      )

      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.map(alert => 
            alert.id === resolvedAlert.id ? resolvedAlert : alert
          ) || []
        }
      )

      // Invalidate stats to update counts
      queryClient.invalidateQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.stats() 
      })

      toast({
        title: 'تم حل التنبيه بنجاح',
        description: resolvedAlert.alert_title_ar,
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

/**
 * Hook to acknowledge a compliance alert
 * خطاف للإقرار بتنبيه امتثال
 */
export function useAcknowledgeComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      alertId,
      acknowledgedBy
    }: {
      alertId: string
      acknowledgedBy: string
    }) => {
      return ComplianceAlertSystemService.acknowledgeAlert(alertId, acknowledgedBy)
    },
    onSuccess: (acknowledgedAlert) => {
      // Update alert caches
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(acknowledgedAlert.id),
        acknowledgedAlert
      )

      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.map(alert => 
            alert.id === acknowledgedAlert.id ? acknowledgedAlert : alert
          ) || []
        }
      )

      toast({
        title: 'تم الإقرار بالتنبيه',
        description: acknowledgedAlert.alert_title_ar,
        variant: 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في الإقرار بالتنبيه',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

/**
 * Hook to escalate a compliance alert
 * خطاف لتصعيد تنبيه امتثال
 */
export function useEscalateComplianceAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      alertId,
      escalationData
    }: {
      alertId: string
      escalationData: {
        new_priority?: AlertPriority
        new_assignee?: string
        escalation_reason_ar?: string
        escalation_reason_en?: string
      }
    }) => {
      return ComplianceAlertSystemService.escalateAlert(alertId, escalationData)
    },
    onSuccess: (escalatedAlert) => {
      // Update alert caches
      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alert(escalatedAlert.id),
        escalatedAlert
      )

      queryClient.setQueryData(
        COMPLIANCE_ALERTS_QUERY_KEYS.alerts(),
        (old: ServiceComplianceAlert[] | undefined) => {
          return old?.map(alert => 
            alert.id === escalatedAlert.id ? escalatedAlert : alert
          ) || []
        }
      )

      toast({
        title: 'تم تصعيد التنبيه',
        description: escalatedAlert.alert_title_ar,
        variant: 'destructive' // Escalated alerts are serious
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تصعيد التنبيه',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// COMPLIANCE MONITORING HOOKS
// =============================================================================

/**
 * Hook to run compliance monitoring and generate alerts
 * خطاف لتشغيل مراقبة الامتثال وإنشاء التنبيهات
 */
export function useRunComplianceMonitoring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ComplianceAlertSystemService.runComplianceMonitoring(),
    onSuccess: (result) => {
      // Invalidate all alert-related queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.all 
      })

      toast({
        title: 'تم تشغيل مراقبة الامتثال',
        description: `تم إنشاء ${result.alerts_generated} تنبيه جديد وحل ${result.alerts_resolved} تنبيه`,
        variant: result.alerts_generated > 0 ? 'destructive' : 'default'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'فشل في تشغيل مراقبة الامتثال',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// =============================================================================
// ALERT STATISTICS HOOKS
// =============================================================================

/**
 * Hook to get compliance alert statistics
 * خطاف للحصول على إحصائيات تنبيهات الامتثال
 */
export function useComplianceAlertStats() {
  return useQuery({
    queryKey: COMPLIANCE_ALERTS_QUERY_KEYS.stats(),
    queryFn: async () => {
      const alerts = await ComplianceAlertSystemService.getComplianceAlerts()
      
      const stats = {
        total_alerts: alerts.length,
        active_alerts: alerts.filter(a => a.alert_status === 'active').length,
        acknowledged_alerts: alerts.filter(a => a.alert_status === 'acknowledged').length,
        resolved_alerts: alerts.filter(a => a.alert_status === 'resolved').length,
        escalated_alerts: alerts.filter(a => a.alert_status === 'escalated').length,
        critical_alerts: alerts.filter(a => a.priority_level === 'critical').length,
        high_priority_alerts: alerts.filter(a => a.priority_level === 'high').length,
        medium_priority_alerts: alerts.filter(a => a.priority_level === 'medium').length,
        low_priority_alerts: alerts.filter(a => a.priority_level === 'low').length,
        overdue_alerts: alerts.filter(a => 
          a.resolution_due_date && 
          new Date(a.resolution_due_date) < new Date() &&
          !['resolved', 'dismissed'].includes(a.alert_status)
        ).length,
        alerts_requiring_iep_review: alerts.filter(a => a.requires_iep_team_review).length,
        alerts_requiring_parent_notification: alerts.filter(a => a.requires_parent_notification).length,
        alerts_by_type: alerts.reduce((acc, alert) => {
          acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1
          return acc
        }, {} as Record<AlertType, number>)
      }

      return stats
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to get alerts that are overdue for resolution
 * خطاف للحصول على التنبيهات المتأخرة في الحل
 */
export function useOverdueAlerts() {
  return useQuery({
    queryKey: ['compliance-alerts', 'overdue'],
    queryFn: async () => {
      const alerts = await ComplianceAlertSystemService.getComplianceAlerts({
        alert_status: ['active', 'acknowledged']
      })
      
      return alerts.filter(alert => 
        alert.resolution_due_date && 
        new Date(alert.resolution_due_date) < new Date()
      )
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  })
}

/**
 * Hook to get alerts requiring immediate attention
 * خطاف للحصول على التنبيهات التي تتطلب اهتماماً فورياً
 */
export function useUrgentAlerts() {
  const filters: ComplianceAlertFilters = {
    priority_level: ['critical'],
    alert_status: ['active', 'acknowledged']
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook to get recent alert activity
 * خطاف للحصول على نشاط التنبيهات الحديث
 */
export function useRecentAlertActivity(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const filters: ComplianceAlertFilters = {
    date_range: {
      start: startDate,
      end: new Date()
    }
  }

  return useComplianceAlerts(filters)
}

/**
 * Hook for real-time alert notifications (WebSocket or polling)
 * خطاف للإشعارات الفورية للتنبيهات (WebSocket أو الاستطلاع)
 */
export function useRealTimeAlertNotifications(userId?: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['compliance-alerts', 'real-time', userId],
    queryFn: async () => {
      // This would typically connect to a WebSocket or use server-sent events
      // For now, we'll use polling to simulate real-time updates
      if (userId) {
        return await ComplianceAlertSystemService.getComplianceAlerts({
          assigned_to: userId,
          alert_status: ['active']
        })
      }
      return []
    },
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    onSuccess: (newAlerts) => {
      // Show toast for new high-priority alerts
      newAlerts.forEach(alert => {
        if (['high', 'critical'].includes(alert.priority_level)) {
          toast({
            title: 'تنبيه جديد عالي الأولوية',
            description: alert.alert_title_ar,
            variant: 'destructive'
          })
        }
      })
    }
  })
}