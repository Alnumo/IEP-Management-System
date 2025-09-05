import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  StudentSubscription,
  SubscriptionFreezeHistory,
  FreezeRequest,
  FreezePreview,
  FreezeResult
} from '@/types/scheduling'

/**
 * Subscription Management Hooks
 * 
 * Provides data fetching and mutation capabilities for:
 * - Student subscription management
 * - Freeze/unfreeze operations
 * - Subscription history and audit trails
 * - Preview functionality for freeze operations
 */

// Fetch subscriptions for a specific student
export const useSubscriptions = (studentId: string) => {
  return useQuery({
    queryKey: ['subscriptions', studentId],
    queryFn: async (): Promise<StudentSubscription[]> => {
      return retryApiCall(async () => {
        console.log('🔍 Fetching subscriptions for student:', studentId)
        
        const user = await requireAuth()
        
        const { data, error } = await supabase
          .from('student_subscriptions')
          .select(`
            *,
            student:students(id, name_ar, name_en),
            therapy_program:therapy_programs(id, name_ar, name_en, category_id)
          `)
          .eq('student_id', studentId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Error fetching subscriptions:', error)
          errorMonitoring.reportError(error, {
            component: 'useSubscriptions',
            action: 'fetch_subscriptions',
            userId: user.id,
            studentId
          })
          throw error
        }

        console.log('✅ Subscriptions fetched successfully:', data?.length, 'records')
        return data || []
      }, {
        context: 'Fetching student subscriptions',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!studentId
  })
}

// Fetch subscription history for audit trail
export const useSubscriptionHistory = (subscriptionId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['subscription-history', subscriptionId],
    queryFn: async (): Promise<SubscriptionFreezeHistory[]> => {
      return retryApiCall(async () => {
        console.log('🔍 Fetching subscription history:', subscriptionId)
        
        const user = await requireAuth()
        
        const { data, error } = await supabase
          .from('subscription_freeze_history')
          .select(`
            *,
            created_by_profile:profiles(id, full_name)
          `)
          .eq('subscription_id', subscriptionId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Error fetching subscription history:', error)
          errorMonitoring.reportError(error, {
            component: 'useSubscriptionHistory',
            action: 'fetch_history',
            userId: user.id,
            subscriptionId
          })
          throw error
        }

        // Transform data to include readable names
        const transformedData = data?.map(item => ({
          ...item,
          created_by_name: item.created_by_profile?.full_name || 'System'
        })) || []

        console.log('✅ Subscription history fetched:', transformedData.length, 'records')
        return transformedData
      }, {
        context: 'Fetching subscription history',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false && !!subscriptionId
  })
}

// Get freeze preview (affected sessions, conflicts, new dates)
export const useFreezePreview = (
  subscriptionId: string, 
  startDate: string, 
  endDate: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['freeze-preview', subscriptionId, startDate, endDate],
    queryFn: async (): Promise<FreezePreview> => {
      return retryApiCall(async () => {
        console.log('🔍 Generating freeze preview:', { subscriptionId, startDate, endDate })
        
        const user = await requireAuth()
        
        // Call the database function for freeze preview
        const { data, error } = await supabase
          .rpc('preview_subscription_freeze', {
            p_subscription_id: subscriptionId,
            p_start_date: startDate,
            p_end_date: endDate
          })

        if (error) {
          console.error('❌ Error generating freeze preview:', error)
          errorMonitoring.reportError(error, {
            component: 'useFreezePreview',
            action: 'generate_preview',
            userId: user.id,
            subscriptionId,
            startDate,
            endDate
          })
          throw error
        }

        console.log('✅ Freeze preview generated successfully')
        return data
      }, {
        context: 'Generating freeze preview',
        maxAttempts: 2,
        logErrors: true
      })
    },
    staleTime: 1 * 60 * 1000, // 1 minute (short cache for real-time preview)
    enabled: options?.enabled !== false && !!(subscriptionId && startDate && endDate)
  })
}

// Freeze subscription mutation
export const useFreezeSubscription = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: FreezeRequest): Promise<FreezeResult> => {
      return retryApiCall(async () => {
        console.log('🔄 Freezing subscription:', request)
        
        const user = await requireAuth()
        
        // Call the database function for subscription freeze
        const { data, error } = await supabase
          .rpc('freeze_subscription', {
            p_subscription_id: request.subscription_id,
            p_start_date: request.start_date,
            p_end_date: request.end_date,
            p_reason: request.reason,
            p_created_by: user.id
          })

        if (error) {
          console.error('❌ Error freezing subscription:', error)
          errorMonitoring.reportError(error, {
            component: 'useFreezeSubscription',
            action: 'freeze_subscription',
            userId: user.id,
            request
          })
          throw error
        }

        console.log('✅ Subscription frozen successfully')
        return data
      }, {
        context: 'Freezing subscription',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['subscriptions', variables.subscription_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['subscription-history', variables.subscription_id] 
      })
      
      // Show success notification (if notification system exists)
      console.log('🎉 Subscription freeze completed successfully')
    },
    onError: (error, variables) => {
      console.error('❌ Failed to freeze subscription:', error)
      // Error handling will be done at component level
    }
  })
}

// Unfreeze subscription mutation
export const useUnfreezeSubscription = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subscriptionId: string): Promise<FreezeResult> => {
      return retryApiCall(async () => {
        console.log('🔄 Unfreezing subscription:', subscriptionId)
        
        const user = await requireAuth()
        
        // Call the database function for subscription unfreeze
        const { data, error } = await supabase
          .rpc('unfreeze_subscription', {
            p_subscription_id: subscriptionId,
            p_created_by: user.id
          })

        if (error) {
          console.error('❌ Error unfreezing subscription:', error)
          errorMonitoring.reportError(error, {
            component: 'useUnfreezeSubscription',
            action: 'unfreeze_subscription',
            userId: user.id,
            subscriptionId
          })
          throw error
        }

        console.log('✅ Subscription unfrozen successfully')
        return data
      }, {
        context: 'Unfreezing subscription',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (data, subscriptionId) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['subscriptions'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['subscription-history', subscriptionId] 
      })
      
      console.log('🎉 Subscription unfreeze completed successfully')
    },
    onError: (error, subscriptionId) => {
      console.error('❌ Failed to unfreeze subscription:', error)
    }
  })
}

// Get all subscriptions (admin view)
export const useAllSubscriptions = (filters?: {
  status?: string
  therapyProgramId?: string
  studentId?: string
}) => {
  return useQuery({
    queryKey: ['all-subscriptions', filters],
    queryFn: async (): Promise<StudentSubscription[]> => {
      return retryApiCall(async () => {
        console.log('🔍 Fetching all subscriptions with filters:', filters)
        
        const user = await requireAuth()
        
        let query = supabase
          .from('student_subscriptions')
          .select(`
            *,
            student:students(id, name_ar, name_en),
            therapy_program:therapy_programs(id, name_ar, name_en, category_id)
          `)

        // Apply filters
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.therapyProgramId) {
          query = query.eq('therapy_program_id', filters.therapyProgramId)
        }
        if (filters?.studentId) {
          query = query.eq('student_id', filters.studentId)
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) {
          console.error('❌ Error fetching all subscriptions:', error)
          errorMonitoring.reportError(error, {
            component: 'useAllSubscriptions',
            action: 'fetch_all_subscriptions',
            userId: user.id,
            filters
          })
          throw error
        }

        console.log('✅ All subscriptions fetched:', data?.length, 'records')
        return data || []
      }, {
        context: 'Fetching all subscriptions',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Export all hooks
export {
  useSubscriptions,
  useSubscriptionHistory,
  useFreezePreview,
  useFreezeSubscription,
  useUnfreezeSubscription,
  useAllSubscriptions
}