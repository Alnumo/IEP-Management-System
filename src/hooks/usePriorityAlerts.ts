import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'

// =====================================================
// PRIORITY ALERTS HOOK
// =====================================================

interface PriorityAlert {
  id: string
  conversation_id: string
  sender_id: string
  sender_name?: string
  alert_type: 'emergency' | 'urgent' | 'medical' | 'safety'
  severity_score: number
  detected_keywords: string[]
  escalated: boolean
  escalated_to?: string[]
  created_at: string
  resolved_at?: string
  status: 'active' | 'escalated' | 'resolved'
}

export const usePriorityAlerts = () => {
  return useQuery({
    queryKey: ['priority-alerts'],
    queryFn: async (): Promise<PriorityAlert[]> => {
      return retryApiCall(async () => {
        console.log('🚨 Fetching priority alerts...')

        // Use centralized auth checking
        const user = await requireAuth()

        // Fetch active priority alerts
        const { data, error } = await supabase
          .from('priority_alerts')
          .select(`
            id,
            conversation_id,
            sender_id,
            sender_name,
            alert_type,
            severity_score,
            detected_keywords,
            escalated,
            escalated_to,
            created_at,
            resolved_at,
            status
          `)
          .in('status', ['active', 'escalated'])
          .order('severity_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('❌ Error fetching priority alerts:', error)
          throw error
        }

        console.log('✅ Priority alerts fetched:', data?.length || 0, 'alerts')
        return data || []

      }, {
        context: 'Fetching priority alerts',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 1 * 60 * 1000, // 1 minute (alerts are time-sensitive)
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    refetchOnWindowFocus: true,
    retry: 2
  })
}

// Get alerts for specific conversation
export const useConversationAlerts = (conversationId: string) => {
  return useQuery({
    queryKey: ['priority-alerts', 'conversation', conversationId],
    queryFn: async (): Promise<PriorityAlert[]> => {
      return retryApiCall(async () => {
        console.log('🚨 Fetching alerts for conversation:', conversationId)

        const user = await requireAuth()

        const { data, error } = await supabase
          .from('priority_alerts')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })

        if (error) throw error

        return data || []

      }, {
        context: 'Fetching conversation alerts',
        maxAttempts: 2,
        logErrors: true
      })
    },
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true
  })
}

// Get alert statistics
export const usePriorityAlertStats = () => {
  return useQuery({
    queryKey: ['priority-alerts', 'stats'],
    queryFn: async () => {
      return retryApiCall(async () => {
        console.log('📊 Fetching priority alert statistics...')

        const user = await requireAuth()

        // Get counts by status and type
        const { data, error } = await supabase
          .from('priority_alerts')
          .select('alert_type, status, severity_score, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

        if (error) throw error

        const stats = {
          total: data?.length || 0,
          active: data?.filter(alert => alert.status === 'active').length || 0,
          escalated: data?.filter(alert => alert.status === 'escalated').length || 0,
          resolved: data?.filter(alert => alert.status === 'resolved').length || 0,
          byType: {
            emergency: data?.filter(alert => alert.alert_type === 'emergency').length || 0,
            urgent: data?.filter(alert => alert.alert_type === 'urgent').length || 0,
            medical: data?.filter(alert => alert.alert_type === 'medical').length || 0,
            safety: data?.filter(alert => alert.alert_type === 'safety').length || 0
          },
          averageSeverity: data?.length 
            ? data.reduce((sum, alert) => sum + alert.severity_score, 0) / data.length 
            : 0,
          recentCount: data?.filter(alert => 
            new Date(alert.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
          ).length || 0
        }

        console.log('📈 Alert stats calculated:', stats)
        return stats

      }, {
        context: 'Fetching priority alert stats',
        maxAttempts: 2,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: 1
  })
}

// Real-time subscription for priority alerts
export const usePriorityAlertsSubscription = () => {
  const { data: alerts, refetch } = usePriorityAlerts()

  // Set up real-time subscription
  React.useEffect(() => {
    console.log('🔄 Setting up priority alerts real-time subscription...')

    const subscription = supabase
      .channel('priority-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'priority_alerts'
        },
        (payload) => {
          console.log('🚨 Priority alert update received:', payload.eventType)
          
          // Refetch alerts when changes occur
          refetch()
        }
      )
      .subscribe((status) => {
        console.log('🔌 Priority alerts subscription status:', status)
      })

    return () => {
      console.log('🔌 Cleaning up priority alerts subscription')
      subscription.unsubscribe()
    }
  }, [refetch])

  return alerts
}

// Utility to get alert severity color
export const getAlertSeverityColor = (severity: number, alertType: string) => {
  if (alertType === 'emergency' || severity >= 9) {
    return 'bg-red-500 text-white'
  } else if (alertType === 'medical' || severity >= 7) {
    return 'bg-orange-500 text-white'
  } else if (alertType === 'urgent' || severity >= 5) {
    return 'bg-yellow-500 text-black'
  } else {
    return 'bg-blue-500 text-white'
  }
}

// Utility to get alert type label
export const getAlertTypeLabel = (alertType: string, language: 'ar' | 'en') => {
  const labels = {
    emergency: { ar: 'حالة طارئة', en: 'Emergency' },
    urgent: { ar: 'عاجل', en: 'Urgent' },
    medical: { ar: 'طبي', en: 'Medical' },
    safety: { ar: 'أمان', en: 'Safety' }
  }

  return labels[alertType as keyof typeof labels]?.[language] || alertType
}