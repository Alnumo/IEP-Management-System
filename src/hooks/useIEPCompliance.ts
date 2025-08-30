import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import type { Database } from '@/types/supabase'
import type { IEPComplianceAlert } from '@/types/iep'

export interface ComplianceDeadline {
  id: string
  iep_id: string
  deadline_type: 'annual_review' | 'triennial_evaluation' | 'progress_report' | 'meeting_notice' | 'goal_review'
  due_date: string
  status: 'upcoming' | 'overdue' | 'completed'
  days_until_due: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  required_actions: string[]
  assigned_to?: string
  notification_sent: boolean
  created_at: string
  updated_at: string
}

export interface ComplianceMetrics {
  total_ieps: number
  compliant_ieps: number
  overdue_reviews: number
  upcoming_deadlines: number
  critical_alerts: number
  compliance_rate: number
  average_days_to_completion: number
  trend_direction: 'improving' | 'declining' | 'stable'
}

export interface ComplianceNotification {
  id: string
  type: 'deadline_approaching' | 'deadline_overdue' | 'compliance_violation' | 'documentation_missing'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  iep_id?: string
  student_name?: string
  due_date?: string
  actions_required: string[]
  dismissed: boolean
  created_at: string
}

const COMPLIANCE_RULES = {
  ANNUAL_REVIEW_DAYS: 365,
  TRIENNIAL_EVALUATION_DAYS: 1095, // 3 years
  PROGRESS_REPORT_FREQUENCY: 90, // quarterly
  MEETING_NOTICE_DAYS: 10,
  GOAL_REVIEW_FREQUENCY: 180, // bi-annual
  WARNING_THRESHOLD_DAYS: 30,
  CRITICAL_THRESHOLD_DAYS: 7
}

export const useIEPCompliance = (iepId?: string) => {
  const supabase = useSupabaseClient<Database>()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<ComplianceNotification[]>([])

  // Get compliance alerts for specific IEP or all IEPs
  const {
    data: complianceAlerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['iep-compliance-alerts', iepId],
    queryFn: async () => {
      let query = supabase
        .from('iep_compliance_alerts')
        .select(`
          *,
          iep:ieps!inner(
            id,
            student_id,
            students!inner(first_name, last_name, student_id)
          )
        `)
        .order('due_date', { ascending: true })

      if (iepId) {
        query = query.eq('iep_id', iepId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as (IEPComplianceAlert & {
        iep: {
          id: string
          student_id: string
          students: {
            first_name: string
            last_name: string
            student_id: string
          }
        }
      })[]
    },
    refetchInterval: 60000 // Check every minute for updates
  })

  // Get compliance deadlines with enhanced calculations
  const {
    data: complianceDeadlines,
    isLoading: deadlinesLoading,
    error: deadlinesError
  } = useQuery({
    queryKey: ['compliance-deadlines', iepId],
    queryFn: async (): Promise<ComplianceDeadline[]> => {
      // Query active IEPs to calculate compliance deadlines
      let iepQuery = supabase
        .from('ieps')
        .select(`
          id,
          student_id,
          start_date,
          end_date,
          last_annual_review,
          last_triennial_evaluation,
          status,
          students!inner(first_name, last_name, student_id),
          iep_progress_data(collection_date, status)
        `)
        .eq('status', 'active')

      if (iepId) {
        iepQuery = iepQuery.eq('id', iepId)
      }

      const { data: ieps, error } = await iepQuery

      if (error) throw error

      const deadlines: ComplianceDeadline[] = []
      const now = new Date()

      ieps?.forEach((iep) => {
        const startDate = new Date(iep.start_date)
        const lastAnnualReview = iep.last_annual_review ? new Date(iep.last_annual_review) : startDate
        const lastTriennialEval = iep.last_triennial_evaluation ? new Date(iep.last_triennial_evaluation) : startDate

        // Calculate next annual review deadline
        const nextAnnualReview = new Date(lastAnnualReview)
        nextAnnualReview.setDate(nextAnnualReview.getDate() + COMPLIANCE_RULES.ANNUAL_REVIEW_DAYS)
        
        const daysToAnnualReview = Math.ceil((nextAnnualReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${iep.id}-annual-review`,
          iep_id: iep.id,
          deadline_type: 'annual_review',
          due_date: nextAnnualReview.toISOString(),
          status: daysToAnnualReview < 0 ? 'overdue' : 'upcoming',
          days_until_due: daysToAnnualReview,
          priority: daysToAnnualReview < 0 ? 'critical' : 
                   daysToAnnualReview <= COMPLIANCE_RULES.CRITICAL_THRESHOLD_DAYS ? 'critical' :
                   daysToAnnualReview <= COMPLIANCE_RULES.WARNING_THRESHOLD_DAYS ? 'high' : 'medium',
          required_actions: [
            'Schedule annual review meeting',
            'Send meeting notices to team',
            'Review current IEP goals and progress',
            'Prepare evaluation materials'
          ],
          notification_sent: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })

        // Calculate next triennial evaluation deadline
        const nextTriennialEval = new Date(lastTriennialEval)
        nextTriennialEval.setDate(nextTriennialEval.getDate() + COMPLIANCE_RULES.TRIENNIAL_EVALUATION_DAYS)
        
        const daysToTriennialEval = Math.ceil((nextTriennialEval.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${iep.id}-triennial-eval`,
          iep_id: iep.id,
          deadline_type: 'triennial_evaluation',
          due_date: nextTriennialEval.toISOString(),
          status: daysToTriennialEval < 0 ? 'overdue' : 'upcoming',
          days_until_due: daysToTriennialEval,
          priority: daysToTriennialEval < 0 ? 'critical' :
                   daysToTriennialEval <= COMPLIANCE_RULES.CRITICAL_THRESHOLD_DAYS ? 'critical' :
                   daysToTriennialEval <= COMPLIANCE_RULES.WARNING_THRESHOLD_DAYS ? 'high' : 'low',
          required_actions: [
            'Conduct comprehensive evaluation',
            'Schedule eligibility determination meeting',
            'Complete assessment reports',
            'Review educational placement'
          ],
          notification_sent: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })

        // Check for overdue progress reports
        const lastProgressReport = iep.iep_progress_data?.length > 0 ? 
          new Date(Math.max(...iep.iep_progress_data.map(p => new Date(p.collection_date).getTime()))) :
          startDate
        
        const daysSinceProgress = Math.ceil((now.getTime() - lastProgressReport.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceProgress > COMPLIANCE_RULES.PROGRESS_REPORT_FREQUENCY) {
          deadlines.push({
            id: `${iep.id}-progress-report`,
            iep_id: iep.id,
            deadline_type: 'progress_report',
            due_date: new Date(lastProgressReport.getTime() + COMPLIANCE_RULES.PROGRESS_REPORT_FREQUENCY * 24 * 60 * 60 * 1000).toISOString(),
            status: 'overdue',
            days_until_due: -(daysSinceProgress - COMPLIANCE_RULES.PROGRESS_REPORT_FREQUENCY),
            priority: 'high',
            required_actions: [
              'Collect current progress data',
              'Complete progress summary report',
              'Send report to parents/guardians',
              'Update goal status if needed'
            ],
            notification_sent: false,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
        }
      })

      return deadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    },
    refetchInterval: 300000 // Check every 5 minutes
  })

  // Get overall compliance metrics
  const {
    data: complianceMetrics,
    isLoading: metricsLoading,
    error: metricsError
  } = useQuery({
    queryKey: ['compliance-metrics'],
    queryFn: async (): Promise<ComplianceMetrics> => {
      // Get all active IEPs
      const { data: ieps, error: iepError } = await supabase
        .from('ieps')
        .select('id, status, start_date, last_annual_review')
        .eq('status', 'active')

      if (iepError) throw iepError

      // Get compliance alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('iep_compliance_alerts')
        .select('alert_type, severity, resolved_date')

      if (alertsError) throw alertsError

      const totalIeps = ieps?.length || 0
      const now = new Date()
      
      let compliantIeps = 0
      let overdueReviews = 0
      let upcomingDeadlines = 0
      let totalDaysToCompletion = 0
      let completedReviews = 0

      ieps?.forEach((iep) => {
        const startDate = new Date(iep.start_date)
        const lastReview = iep.last_annual_review ? new Date(iep.last_annual_review) : startDate
        const daysSinceReview = Math.ceil((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceReview <= COMPLIANCE_RULES.ANNUAL_REVIEW_DAYS) {
          compliantIeps++
        } else {
          overdueReviews++
        }

        const nextReviewDue = new Date(lastReview.getTime() + COMPLIANCE_RULES.ANNUAL_REVIEW_DAYS * 24 * 60 * 60 * 1000)
        const daysUntilDue = Math.ceil((nextReviewDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilDue > 0 && daysUntilDue <= 30) {
          upcomingDeadlines++
        }

        if (iep.last_annual_review) {
          totalDaysToCompletion += daysSinceReview
          completedReviews++
        }
      })

      const criticalAlerts = alerts?.filter(alert => 
        alert.severity === 'critical' && !alert.resolved_date
      ).length || 0

      const complianceRate = totalIeps > 0 ? (compliantIeps / totalIeps) * 100 : 100
      const avgDaysToCompletion = completedReviews > 0 ? totalDaysToCompletion / completedReviews : 0

      // Simple trend calculation based on recent compliance rate
      const trendDirection: 'improving' | 'declining' | 'stable' = 
        complianceRate >= 90 ? 'improving' :
        complianceRate >= 75 ? 'stable' : 'declining'

      return {
        total_ieps: totalIeps,
        compliant_ieps: compliantIeps,
        overdue_reviews: overdueReviews,
        upcoming_deadlines: upcomingDeadlines,
        critical_alerts: criticalAlerts,
        compliance_rate: Math.round(complianceRate * 100) / 100,
        average_days_to_completion: Math.round(avgDaysToCompletion),
        trend_direction: trendDirection
      }
    },
    refetchInterval: 600000 // Check every 10 minutes
  })

  // Create compliance alert
  const createComplianceAlert = useMutation({
    mutationFn: async (alertData: {
      iep_id: string
      alert_type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      due_date?: string
      required_actions?: string[]
    }) => {
      const { data, error } = await supabase
        .from('iep_compliance_alerts')
        .insert([{
          ...alertData,
          created_date: new Date().toISOString(),
          resolved: false
        }])
        .select()

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iep-compliance-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-metrics'] })
    }
  })

  // Resolve compliance alert
  const resolveComplianceAlert = useMutation({
    mutationFn: async ({ alertId, resolutionNotes }: { alertId: string; resolutionNotes?: string }) => {
      const { data, error } = await supabase
        .from('iep_compliance_alerts')
        .update({
          resolved: true,
          resolved_date: new Date().toISOString(),
          resolution_notes: resolutionNotes
        })
        .eq('id', alertId)
        .select()

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iep-compliance-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-metrics'] })
    }
  })

  // Generate compliance notifications
  useEffect(() => {
    if (!complianceDeadlines) return

    const newNotifications: ComplianceNotification[] = []
    
    complianceDeadlines.forEach((deadline) => {
      if (deadline.status === 'overdue') {
        newNotifications.push({
          id: `notification-${deadline.id}`,
          type: 'deadline_overdue',
          severity: 'critical',
          title: `${deadline.deadline_type.replace('_', ' ').toUpperCase()} Overdue`,
          message: `This ${deadline.deadline_type.replace('_', ' ')} was due ${Math.abs(deadline.days_until_due)} days ago.`,
          iep_id: deadline.iep_id,
          due_date: deadline.due_date,
          actions_required: deadline.required_actions,
          dismissed: false,
          created_at: new Date().toISOString()
        })
      } else if (deadline.priority === 'critical' || deadline.priority === 'high') {
        newNotifications.push({
          id: `notification-${deadline.id}`,
          type: 'deadline_approaching',
          severity: deadline.priority === 'critical' ? 'critical' : 'warning',
          title: `${deadline.deadline_type.replace('_', ' ').toUpperCase()} Due Soon`,
          message: `This ${deadline.deadline_type.replace('_', ' ')} is due in ${deadline.days_until_due} days.`,
          iep_id: deadline.iep_id,
          due_date: deadline.due_date,
          actions_required: deadline.required_actions,
          dismissed: false,
          created_at: new Date().toISOString()
        })
      }
    })

    setNotifications(newNotifications)
  }, [complianceDeadlines])

  // Dismiss notification
  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, dismissed: true }
          : notification
      )
    )
  }

  // Auto-monitoring for real-time updates
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('compliance_monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'iep_compliance_alerts' },
        () => {
          refetchAlerts()
          queryClient.invalidateQueries({ queryKey: ['compliance-metrics'] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ieps' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['compliance-deadlines'] })
          queryClient.invalidateQueries({ queryKey: ['compliance-metrics'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, refetchAlerts, queryClient])

  return {
    // Data
    complianceAlerts,
    complianceDeadlines,
    complianceMetrics,
    notifications: notifications.filter(n => !n.dismissed),
    
    // Loading states
    alertsLoading,
    deadlinesLoading,
    metricsLoading,
    
    // Errors
    alertsError,
    deadlinesError,
    metricsError,
    
    // Actions
    createComplianceAlert: createComplianceAlert.mutate,
    resolveComplianceAlert: resolveComplianceAlert.mutate,
    dismissNotification,
    refetchAlerts,
    
    // Loading states for mutations
    isCreatingAlert: createComplianceAlert.isPending,
    isResolvingAlert: resolveComplianceAlert.isPending
  }
}

export default useIEPCompliance