// AI Analytics Hooks - Phase 6 Implementation
// React hooks for AI-powered therapy management features

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAnalyticsService } from '@/services/ai-analytics'
import type {
  AIAnalyticsFilters
} from '@/types/ai-analytics'

// Treatment Recommendations Hooks
export const useAIRecommendations = (studentId?: string) => {
  return useQuery({
    queryKey: ['ai-recommendations', studentId],
    queryFn: async () => {
      if (!studentId) return []
      
      // Mock student data for demonstration
      const mockStudentData = {
        id: studentId,
        age: 6,
        birthDate: '2018-03-15',
        primaryDiagnosis: 'autism spectrum disorder',
        speechDelays: true,
        motorSkillsDelays: false,
        previousTherapyHistory: []
      }
      
      return await aiAnalyticsService.generateTreatmentRecommendations(studentId, mockStudentData)
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

export const useGenerateRecommendations = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ studentId, studentData }: { studentId: string; studentData: any }) => {
      return await aiAnalyticsService.generateTreatmentRecommendations(studentId, studentData)
    },
    onSuccess: (data, variables) => {
      // Update the recommendations cache
      queryClient.setQueryData(['ai-recommendations', variables.studentId], data)
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
    }
  })
}

// Progress Predictions Hooks
export const useProgressPredictions = (studentId?: string) => {
  return useQuery({
    queryKey: ['progress-predictions', studentId],
    queryFn: async () => {
      if (!studentId) return []
      
      // Mock current progress and therapy history
      const mockCurrentProgress = {
        recentTrend: 'improving',
        attendanceRate: 0.92,
        goalAchievementRate: 0.78
      }
      
      const mockTherapyHistory = [
        { outcome: 'successful', duration: 6 },
        { outcome: 'partial', duration: 3 }
      ]
      
      return await aiAnalyticsService.generateProgressPredictions(
        studentId, 
        mockCurrentProgress, 
        mockTherapyHistory
      )
    },
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  })
}

// Intelligent Alerts Hooks
export const useIntelligentAlerts = (filters?: AIAnalyticsFilters) => {
  return useQuery({
    queryKey: ['intelligent-alerts', filters],
    queryFn: async () => {
      const alerts = await aiAnalyticsService.generateIntelligentAlerts()
      
      // Apply filters if provided
      if (!filters) return alerts
      
      return alerts.filter(alert => {
        if (filters.studentId && alert.studentId !== filters.studentId) return false
        if (filters.severity && alert.severity !== filters.severity) return false
        if (filters.status && alert.status !== filters.status) return false
        return true
      })
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for alerts
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true
  })
}

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      // Mock acknowledgment - in real implementation, this would call API
      console.log(`Alert ${alertId} acknowledged by ${userId}`)
      return { success: true, alertId, acknowledgedAt: new Date().toISOString() }
    },
    onSuccess: () => {
      // Invalidate alerts queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['intelligent-alerts'] })
    }
  })
}

// Dashboard Insights Hooks
export const useDashboardInsights = (scope?: 'individual' | 'program' | 'center' | 'system') => {
  return useQuery({
    queryKey: ['dashboard-insights', scope],
    queryFn: async () => {
      const insights = await aiAnalyticsService.generateDashboardInsights()
      
      // Filter by scope if provided
      if (scope) {
        return insights.filter(insight => insight.scope === scope)
      }
      
      return insights
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  })
}

// Therapy Effectiveness Hooks
export const useTherapyEffectiveness = (
  therapyProgramId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['therapy-effectiveness', therapyProgramId, startDate, endDate],
    queryFn: async () => {
      if (!therapyProgramId || !startDate || !endDate) return null
      
      return await aiAnalyticsService.calculateTherapyEffectiveness(
        therapyProgramId,
        startDate,
        endDate
      )
    },
    enabled: !!(therapyProgramId && startDate && endDate),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  })
}

// Schedule Optimization Hooks
export const useScheduleOptimization = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ constraints, objectives }: { constraints: any; objectives: any }) => {
      return await aiAnalyticsService.optimizeSchedule(constraints, objectives)
    },
    onSuccess: () => {
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    }
  })
}

// AI Session Notes Hooks
export const useGenerateSessionNotes = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ sessionId, sessionData }: { sessionId: string; sessionData: any }) => {
      return await aiAnalyticsService.generateSessionNotes(sessionId, sessionData)
    },
    onSuccess: (_data, variables) => {
      // Update session-related queries
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-notes'] })
    }
  })
}

// System Health Hook
export const useAISystemHealth = () => {
  return useQuery({
    queryKey: ['ai-system-health'],
    queryFn: () => aiAnalyticsService.systemHealthCheck(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    refetchOnWindowFocus: true
  })
}

// AI Models Hook
export const useAIModels = () => {
  return useQuery({
    queryKey: ['ai-models'],
    queryFn: () => aiAnalyticsService.getActiveModels(),
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false
  })
}

// Comprehensive AI Analytics Dashboard Hook
export const useAIAnalyticsDashboard = () => {
  const alertsQuery = useIntelligentAlerts()
  const insightsQuery = useDashboardInsights()
  const systemHealthQuery = useAISystemHealth()
  const modelsQuery = useAIModels()

  return {
    alerts: alertsQuery.data || [],
    insights: insightsQuery.data || [],
    systemHealth: systemHealthQuery.data,
    models: modelsQuery.data || [],
    isLoading: alertsQuery.isLoading || insightsQuery.isLoading || systemHealthQuery.isLoading,
    error: alertsQuery.error || insightsQuery.error || systemHealthQuery.error,
    refetch: () => {
      alertsQuery.refetch()
      insightsQuery.refetch()
      systemHealthQuery.refetch()
      modelsQuery.refetch()
    }
  }
}

// Analytics Filters Hook
export const useAnalyticsFilters = () => {
  const queryClient = useQueryClient()

  const applyFilters = (_filters: AIAnalyticsFilters) => {
    // Invalidate queries with new filters
    queryClient.invalidateQueries({ queryKey: ['intelligent-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
    queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
  }

  const clearFilters = () => {
    // Reset all filter-dependent queries
    queryClient.invalidateQueries({ queryKey: ['intelligent-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
    queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
  }

  return {
    applyFilters,
    clearFilters
  }
}

// Real-time Updates Hook (for WebSocket integration)
export const useAIRealTimeUpdates = (enabled: boolean = true) => {
  // Mock real-time updates - in real implementation, this would use WebSocket
  return useQuery({
    queryKey: ['ai-realtime-updates'],
    queryFn: async () => {
      // Simulate real-time data updates
      return {
        timestamp: new Date().toISOString(),
        updates: [
          { type: 'alert', count: 1 },
          { type: 'recommendation', count: 2 }
        ]
      }
    },
    enabled,
    refetchInterval: 30 * 1000, // 30 seconds
  })
}

// Export hook utilities
export const aiAnalyticsHooks = {
  useAIRecommendations,
  useProgressPredictions,
  useIntelligentAlerts,
  useDashboardInsights,
  useTherapyEffectiveness,
  useAISystemHealth,
  useAIModels,
  useAIAnalyticsDashboard,
  useGenerateRecommendations,
  useAcknowledgeAlert,
  useScheduleOptimization,
  useGenerateSessionNotes,
  useAnalyticsFilters,
  useAIRealTimeUpdates
}