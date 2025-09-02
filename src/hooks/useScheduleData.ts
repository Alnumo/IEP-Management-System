import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import type { 
  ScheduledSession, 
  TherapistAvailability, 
  ScheduleView,
  ScheduleFilter,
  ScheduleStats,
  ReschedulingConflict
} from '@/types/scheduling'

/**
 * Custom hook for managing schedule data with real-time updates
 * 
 * Provides comprehensive schedule management with caching, optimistic updates,
 * and real-time subscriptions for the scheduling dashboard.
 */

interface UseScheduleDataOptions {
  filters: ScheduleFilter
  view: ScheduleView
  selectedDate: Date
  enableRealTime?: boolean
  staleTime?: number
  refetchInterval?: number
}

export function useScheduleData({
  filters,
  view,
  selectedDate,
  enableRealTime = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  refetchInterval
}: UseScheduleDataOptions) {
  const queryClient = useQueryClient()
  const { language } = useLanguage()

  // Generate query keys
  const sessionsQueryKey = ['scheduled-sessions', filters, view, selectedDate.toISOString()]
  const availabilityQueryKey = ['therapist-availability', filters.date_range]
  const conflictsQueryKey = ['schedule-conflicts', filters.date_range]
  const statsQueryKey = ['schedule-stats', filters.date_range]

  // Fetch scheduled sessions
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsErrorData,
    refetch: refetchSessions
  } = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      let query = supabase
        .from('scheduled_sessions')
        .select(`
          *,
          students (*),
          therapists (*),
          therapy_rooms (*),
          student_enrollments (*)
        `)
        .gte('session_date', filters.date_range.start.toISOString().split('T')[0])
        .lte('session_date', filters.date_range.end.toISOString().split('T')[0])

      // Apply filters
      if (filters.therapist_ids.length > 0) {
        query = query.in('therapist_id', filters.therapist_ids)
      }

      if (filters.student_ids.length > 0) {
        query = query.in('student_id', filters.student_ids)
      }

      if (filters.session_statuses.length > 0) {
        query = query.in('session_status', filters.session_statuses)
      }

      const { data, error } = await query.order('session_date').order('start_time')

      if (error) throw error
      return data as ScheduledSession[]
    },
    staleTime,
    refetchInterval: enableRealTime ? refetchInterval : undefined,
    refetchOnWindowFocus: enableRealTime,
    refetchOnReconnect: enableRealTime
  })

  // Fetch therapist availability
  const {
    data: availability = [],
    isLoading: availabilityLoading,
    refetch: refetchAvailability
  } = useQuery({
    queryKey: availabilityQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapist_availability')
        .select(`
          *,
          therapists (*)
        `)
        .gte('available_date', filters.date_range.start.toISOString().split('T')[0])
        .lte('available_date', filters.date_range.end.toISOString().split('T')[0])
        .eq('is_available', true)
        .order('available_date')
        .order('start_time')

      if (error) throw error
      return data as TherapistAvailability[]
    },
    staleTime,
    refetchInterval: enableRealTime ? refetchInterval : undefined
  })

  // Fetch schedule conflicts
  const {
    data: conflicts = [],
    isLoading: conflictsLoading,
    refetch: refetchConflicts
  } = useQuery({
    queryKey: conflictsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_conflicts')
        .select(`
          *,
          scheduled_sessions (*)
        `)
        .gte('conflict_date', filters.date_range.start.toISOString().split('T')[0])
        .lte('conflict_date', filters.date_range.end.toISOString().split('T')[0])
        .eq('resolution_status', 'unresolved')
        .order('conflict_severity', { ascending: false })

      if (error) throw error
      return data as ReschedulingConflict[]
    },
    staleTime,
    refetchInterval: enableRealTime ? refetchInterval : undefined
  })

  // Fetch schedule statistics
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: statsQueryKey,
    queryFn: async () => {
      // This would typically call a database function or computed view
      const { data, error } = await supabase
        .rpc('get_schedule_statistics', {
          start_date: filters.date_range.start.toISOString().split('T')[0],
          end_date: filters.date_range.end.toISOString().split('T')[0],
          therapist_ids: filters.therapist_ids.length > 0 ? filters.therapist_ids : null
        })

      if (error) {
        console.warn('Failed to fetch schedule statistics:', error)
        // Return computed stats from sessions data if RPC fails
        return computeStatsFromSessions(sessions)
      }
      
      return data as ScheduleStats
    },
    staleTime: staleTime * 2, // Stats can be stale longer
    enabled: sessions.length > 0 // Only fetch stats when we have sessions
  })

  // Optimistic update mutation
  const optimisticUpdateMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string, updates: Partial<ScheduledSession> }) => {
      const { data, error } = await supabase
        .from('scheduled_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      return data as ScheduledSession
    },
    onMutate: async ({ sessionId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: sessionsQueryKey })

      // Snapshot previous value
      const previousSessions = queryClient.getQueryData<ScheduledSession[]>(sessionsQueryKey)

      // Optimistically update
      if (previousSessions) {
        queryClient.setQueryData<ScheduledSession[]>(sessionsQueryKey, old => 
          old?.map(session => 
            session.id === sessionId 
              ? { ...session, ...updates }
              : session
          ) || []
        )
      }

      return { previousSessions }
    },
    onSuccess: (updatedSession) => {
      // Update the cache with server response
      queryClient.setQueryData<ScheduledSession[]>(sessionsQueryKey, old => 
        old?.map(session => 
          session.id === updatedSession.id 
            ? updatedSession
            : session
        ) || []
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: statsQueryKey })
      queryClient.invalidateQueries({ queryKey: conflictsQueryKey })

      toast.success(
        language === 'ar' ? 'تم تحديث الجلسة بنجاح' : 'Session updated successfully'
      )
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(sessionsQueryKey, context.previousSessions)
      }

      console.error('Session update failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشل في تحديث الجلسة' 
          : 'Failed to update session'
      )
    }
  })

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ sessionIds, updates }: { sessionIds: string[], updates: Partial<ScheduledSession> }) => {
      const { data, error } = await supabase
        .from('scheduled_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', sessionIds)
        .select()

      if (error) throw error
      return data as ScheduledSession[]
    },
    onSuccess: (updatedSessions) => {
      // Update cache with server response
      queryClient.setQueryData<ScheduledSession[]>(sessionsQueryKey, old => {
        if (!old) return []
        
        const updatedSessionsMap = new Map(updatedSessions.map(s => [s.id, s]))
        
        return old.map(session => 
          updatedSessionsMap.has(session.id) 
            ? updatedSessionsMap.get(session.id)!
            : session
        )
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: statsQueryKey })
      queryClient.invalidateQueries({ queryKey: conflictsQueryKey })

      toast.success(
        language === 'ar' 
          ? `تم تحديث ${updatedSessions.length} جلسة بنجاح`
          : `Successfully updated ${updatedSessions.length} sessions`
      )
    },
    onError: (error) => {
      console.error('Bulk update failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشل في التحديث الجماعي'
          : 'Bulk update failed'
      )
    }
  })

  // Real-time subscription setup
  React.useEffect(() => {
    if (!enableRealTime) return

    const channel = supabase
      .channel('schedule_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_sessions'
        },
        (payload) => {
          console.log('Schedule change detected:', payload)
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
          queryClient.invalidateQueries({ queryKey: conflictsQueryKey })
          queryClient.invalidateQueries({ queryKey: statsQueryKey })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'therapist_availability'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: availabilityQueryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    enableRealTime, 
    queryClient, 
    sessionsQueryKey, 
    availabilityQueryKey, 
    conflictsQueryKey, 
    statsQueryKey
  ])

  // Computed values
  const isLoading = sessionsLoading || availabilityLoading || conflictsLoading || statsLoading
  const isError = sessionsError
  const error = sessionsErrorData

  // Refetch all data
  const refetch = React.useCallback(async () => {
    await Promise.all([
      refetchSessions(),
      refetchAvailability(),
      refetchConflicts(),
      refetchStats()
    ])
  }, [refetchSessions, refetchAvailability, refetchConflicts, refetchStats])

  return {
    // Data
    sessions,
    availability,
    conflicts,
    stats,
    
    // Loading states
    isLoading,
    isError,
    error,
    
    // Actions
    refetch,
    optimisticUpdate: optimisticUpdateMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutateAsync,
    
    // Mutation states
    isUpdating: optimisticUpdateMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending
  }
}

// Helper function to compute basic stats from sessions when RPC is not available
function computeStatsFromSessions(sessions: ScheduledSession[]): ScheduleStats {
  const totalSessions = sessions.length
  const confirmedSessions = sessions.filter(s => s.session_status === 'confirmed').length
  const completedSessions = sessions.filter(s => s.session_status === 'completed').length
  const cancelledSessions = sessions.filter(s => s.session_status === 'cancelled').length
  
  const uniqueTherapists = new Set(sessions.map(s => s.therapist_id).filter(Boolean))
  const activeTherapists = uniqueTherapists.size
  
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 60), 0)
  const totalTherapyHours = totalMinutes / 60
  
  const averageSessionsPerTherapist = activeTherapists > 0 ? totalSessions / activeTherapists : 0
  
  // Basic utilization calculation (would be more sophisticated in real implementation)
  const utilizationPercentage = totalSessions > 0 ? (confirmedSessions + completedSessions) / totalSessions * 100 : 0
  
  return {
    total_sessions: totalSessions,
    confirmed_sessions: confirmedSessions,
    completed_sessions: completedSessions,
    cancelled_sessions: cancelledSessions,
    active_therapists: activeTherapists,
    total_therapy_hours: totalTherapyHours,
    average_sessions_per_therapist: averageSessionsPerTherapist,
    utilization_percentage: utilizationPercentage,
    utilized_slots: confirmedSessions + completedSessions,
    total_available_slots: totalSessions,
    conflicts_count: 0, // Would be computed from conflicts table
    overbooked_therapists: 0,
    room_conflicts: 0,
    attendance_rate: completedSessions > 0 ? (completedSessions / (completedSessions + cancelledSessions)) * 100 : 0,
    cancellation_rate: totalSessions > 0 ? (cancelledSessions / totalSessions) * 100 : 0,
    average_session_duration: totalSessions > 0 ? totalMinutes / totalSessions : 0
  }
}