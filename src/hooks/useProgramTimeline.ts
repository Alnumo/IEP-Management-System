import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { programTimelineManager } from '@/services/program-timeline-management'
import { errorMonitoring } from '@/lib/error-monitoring'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import type {
  ProgramTimeline,
  TimelineAdjustment,
  BillingAdjustmentResult,
  NotificationDeliveryResult
} from '@/types/scheduling'

/**
 * Program Timeline Management Hooks
 * 
 * Provides data fetching and mutation capabilities for:
 * - Program timeline visualization
 * - End date calculations and adjustments
 * - Billing cycle management
 * - Notification delivery
 */

// Get program timeline visualization data
export const useProgramTimeline = (subscriptionId: string) => {
  return useQuery({
    queryKey: ['program-timeline', subscriptionId],
    queryFn: async (): Promise<ProgramTimeline> => {
      return retryApiCall(async () => {
        console.log('🔍 Fetching program timeline for subscription:', subscriptionId)
        
        const timeline = await programTimelineManager.generateTimelineVisualization(subscriptionId)
        
        console.log('✅ Program timeline fetched successfully')
        return timeline
      }, {
        context: 'Fetching program timeline',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!subscriptionId
  })
}

// Calculate new end date after freeze
export const useCalculateEndDate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string
      freezeDays: number
      options?: {
        include_weekends?: boolean
        exclude_holidays?: string[]
        billing_adjustment_strategy?: 'proportional' | 'defer' | 'credit'
      }
    }): Promise<TimelineAdjustment> => {
      return retryApiCall(async () => {
        console.log('🔄 Calculating new end date:', params)
        
        const user = await requireAuth()
        
        const adjustment = await programTimelineManager.calculateNewEndDate(
          params.subscriptionId,
          params.freezeDays,
          params.options
        )

        console.log('✅ End date calculation completed')
        return adjustment
      }, {
        context: 'Calculating new end date',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['program-timeline', variables.subscriptionId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['subscriptions', variables.subscriptionId] 
      })
      
      console.log('🎉 End date calculation completed successfully')
    },
    onError: (error, variables) => {
      console.error('❌ Failed to calculate end date:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useCalculateEndDate',
        action: 'calculate_end_date',
        subscriptionId: variables.subscriptionId
      })
    }
  })
}

// Adjust billing cycle for freeze period
export const useAdjustBillingCycle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string
      freezeStartDate: string
      freezeEndDate: string
      strategy?: 'proportional' | 'defer' | 'credit'
    }): Promise<BillingAdjustmentResult> => {
      return retryApiCall(async () => {
        console.log('🔄 Adjusting billing cycle:', params)
        
        const user = await requireAuth()
        
        const adjustment = await programTimelineManager.adjustBillingCycle(
          params.subscriptionId,
          params.freezeStartDate,
          params.freezeEndDate,
          params.strategy || 'proportional'
        )

        console.log('✅ Billing adjustment completed')
        return adjustment
      }, {
        context: 'Adjusting billing cycle',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (data, variables) => {
      // Invalidate billing-related queries
      queryClient.invalidateQueries({ 
        queryKey: ['billing', variables.subscriptionId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['subscriptions', variables.subscriptionId] 
      })
      
      console.log('🎉 Billing adjustment completed successfully')
    },
    onError: (error, variables) => {
      console.error('❌ Failed to adjust billing cycle:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useAdjustBillingCycle',
        action: 'adjust_billing_cycle',
        subscriptionId: variables.subscriptionId
      })
    }
  })
}

// Send timeline update notifications
export const useSendTimelineNotifications = () => {
  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string
      adjustment: TimelineAdjustment
      billingAdjustment?: BillingAdjustmentResult
    }): Promise<NotificationDeliveryResult> => {
      return retryApiCall(async () => {
        console.log('🔄 Sending timeline update notifications:', params.subscriptionId)
        
        const user = await requireAuth()
        
        const result = await programTimelineManager.sendTimelineUpdateNotifications(
          params.subscriptionId,
          params.adjustment,
          params.billingAdjustment
        )

        console.log('✅ Timeline notifications sent')
        return result
      }, {
        context: 'Sending timeline notifications',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (data, variables) => {
      console.log(`🎉 Notifications sent successfully: ${data.notifications_sent} delivered`)
      
      if (data.delivery_failures.length > 0) {
        console.warn(`⚠️ ${data.delivery_failures.length} notification deliveries failed`)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Failed to send timeline notifications:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useSendTimelineNotifications',
        action: 'send_notifications',
        subscriptionId: variables.subscriptionId
      })
    }
  })
}

// Combined hook for complete timeline management workflow
export const useCompleteTimelineAdjustment = () => {
  const queryClient = useQueryClient()
  const calculateEndDate = useCalculateEndDate()
  const adjustBilling = useAdjustBillingCycle()
  const sendNotifications = useSendTimelineNotifications()

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string
      freezeStartDate: string
      freezeEndDate: string
      freezeDays: number
      billingStrategy?: 'proportional' | 'defer' | 'credit'
      sendNotifications?: boolean
    }) => {
      console.log('🔄 Starting complete timeline adjustment workflow')
      
      const results = {
        endDateAdjustment: null as TimelineAdjustment | null,
        billingAdjustment: null as BillingAdjustmentResult | null,
        notificationResult: null as NotificationDeliveryResult | null
      }

      try {
        // Step 1: Calculate new end date
        console.log('📅 Step 1: Calculating new end date')
        results.endDateAdjustment = await calculateEndDate.mutateAsync({
          subscriptionId: params.subscriptionId,
          freezeDays: params.freezeDays,
          options: {
            billing_adjustment_strategy: params.billingStrategy
          }
        })

        // Step 2: Adjust billing cycle
        console.log('💰 Step 2: Adjusting billing cycle')
        results.billingAdjustment = await adjustBilling.mutateAsync({
          subscriptionId: params.subscriptionId,
          freezeStartDate: params.freezeStartDate,
          freezeEndDate: params.freezeEndDate,
          strategy: params.billingStrategy
        })

        // Step 3: Send notifications (if requested)
        if (params.sendNotifications !== false) {
          console.log('📬 Step 3: Sending notifications')
          results.notificationResult = await sendNotifications.mutateAsync({
            subscriptionId: params.subscriptionId,
            adjustment: results.endDateAdjustment,
            billingAdjustment: results.billingAdjustment
          })
        }

        console.log('✅ Complete timeline adjustment workflow completed')
        return results

      } catch (error) {
        console.error('❌ Timeline adjustment workflow failed:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ['program-timeline', variables.subscriptionId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['subscriptions', variables.subscriptionId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['billing', variables.subscriptionId] 
      })
      
      console.log('🎉 Complete timeline adjustment workflow completed successfully')
    },
    onError: (error, variables) => {
      console.error('❌ Complete timeline adjustment workflow failed:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useCompleteTimelineAdjustment',
        action: 'complete_workflow',
        subscriptionId: variables.subscriptionId
      })
    }
  })
}

// Hook for timeline analytics and insights
export const useTimelineAnalytics = (timeRange: 'week' | 'month' | 'quarter' = 'month') => {
  return useQuery({
    queryKey: ['timeline-analytics', timeRange],
    queryFn: async () => {
      // This would fetch analytics data about timeline adjustments
      // Including common patterns, success rates, notification delivery rates, etc.
      return retryApiCall(async () => {
        console.log('🔍 Fetching timeline analytics for:', timeRange)
        
        // Placeholder for analytics implementation
        const analytics = {
          total_adjustments: 0,
          average_freeze_days: 0,
          billing_impact: 0,
          notification_delivery_rate: 0,
          common_freeze_reasons: [],
          timeline_trends: []
        }

        console.log('✅ Timeline analytics fetched')
        return analytics
      }, {
        context: 'Fetching timeline analytics',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}