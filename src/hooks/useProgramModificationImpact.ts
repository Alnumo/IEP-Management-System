import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  analyzeModificationImpact,
  validateModificationRequest 
} from '@/services/program-modification-impact-service'
import type {
  ModificationImpactAnalysis,
  ProgramModification,
  ModificationType,
  ScheduledSession,
  TherapistWorkloadAdjustment,
  ResourceReallocation,
  ScheduleAdjustment
} from '@/types/scheduling'

/**
 * Hook for analyzing program modification impacts
 */
export function useModificationImpactAnalysis() {
  const queryClient = useQueryClient()

  const analyzeImpactMutation = useMutation({
    mutationFn: analyzeModificationImpact,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تحليل تأثير التعديل بنجاح / Impact analysis completed successfully')
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['therapist-workload'] })
        queryClient.invalidateQueries({ queryKey: ['resource-availability'] })
      } else {
        toast.error(result.error || 'فشل في تحليل التأثير / Impact analysis failed')
      }
    },
    onError: (error: Error) => {
      console.error('Impact analysis error:', error)
      toast.error('حدث خطأ أثناء تحليل التأثير / Error occurred during impact analysis')
    }
  })

  const validateRequestMutation = useMutation({
    mutationFn: validateModificationRequest,
    onSuccess: (result) => {
      if (result.valid) {
        toast.success('طلب التعديل صالح / Modification request is valid')
      } else {
        toast.error(`أخطاء في الطلب / Request errors: ${result.errors.join(', ')}`)
      }
    },
    onError: (error: Error) => {
      console.error('Validation error:', error)
      toast.error('فشل في التحقق من صحة الطلب / Request validation failed')
    }
  })

  return {
    // Analysis functions
    analyzeImpact: analyzeImpactMutation.mutate,
    analyzeImpactAsync: analyzeImpactMutation.mutateAsync,
    
    // Validation functions
    validateRequest: validateRequestMutation.mutate,
    validateRequestAsync: validateRequestMutation.mutateAsync,
    
    // States
    isAnalyzing: analyzeImpactMutation.isPending,
    isValidating: validateRequestMutation.isPending,
    
    // Results
    analysisResult: analyzeImpactMutation.data,
    validationResult: validateRequestMutation.data,
    
    // Errors
    analysisError: analyzeImpactMutation.error,
    validationError: validateRequestMutation.error,
    
    // Reset functions
    resetAnalysis: analyzeImpactMutation.reset,
    resetValidation: validateRequestMutation.reset
  }
}

/**
 * Hook for fetching historical modification impacts
 */
export function useModificationHistory(enrollmentId?: string) {
  return useQuery({
    queryKey: ['modification-history', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return []
      
      // This would typically fetch from a modifications history table
      // For now, returning empty array as placeholder
      return []
    },
    enabled: !!enrollmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

/**
 * Hook for managing modification impact scenarios
 */
export function useModificationScenarios() {
  const queryClient = useQueryClient()

  // Create multiple impact scenarios for comparison
  const createScenariosMutation = useMutation({
    mutationFn: async (params: {
      enrollment_id: string
      scenarios: Array<{
        name_ar: string
        name_en: string
        modification_types: ModificationType[]
        proposed_changes: any
      }>
    }) => {
      const results = await Promise.all(
        params.scenarios.map(async (scenario) => {
          const result = await analyzeModificationImpact({
            enrollment_id: params.enrollment_id,
            modification_type: scenario.modification_types,
            proposed_changes: {
              ...scenario.proposed_changes,
              effective_date: scenario.proposed_changes.effective_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            analysis_scope: 'all',
            include_alternatives: true
          })
          
          return {
            scenario_name: scenario.name_ar,
            scenario_name_en: scenario.name_en,
            ...result
          }
        })
      )
      
      return results
    },
    onSuccess: () => {
      toast.success('تم إنشاء سيناريوهات التأثير بنجاح / Impact scenarios created successfully')
    },
    onError: (error: Error) => {
      console.error('Scenario creation error:', error)
      toast.error('فشل في إنشاء السيناريوهات / Failed to create scenarios')
    }
  })

  const compareScenariosMutation = useMutation({
    mutationFn: async (scenarios: any[]) => {
      // Compare different scenarios based on multiple criteria
      const comparison = scenarios.map((scenario, index) => {
        const impact = scenario.data?.impact_analysis
        if (!impact) return null

        return {
          scenario_index: index,
          scenario_name: scenario.scenario_name,
          scenario_name_en: scenario.scenario_name_en,
          severity_score: calculateSeverityScore(impact),
          cost_impact: scenario.data?.cost_implications?.net_impact || 0,
          affected_sessions: impact.affected_session_count,
          affected_therapists: impact.affected_therapist_count,
          disruption_percentage: impact.schedule_disruption_percentage,
          adjustment_time: impact.estimated_adjustment_time,
          recommendation_priority: scenario.data?.recommendations?.priority || 'low'
        }
      }).filter(Boolean)

      // Sort by overall score (lower is better)
      comparison.sort((a, b) => {
        const scoreA = (a?.severity_score || 0) + Math.abs(a?.cost_impact || 0) / 1000
        const scoreB = (b?.severity_score || 0) + Math.abs(b?.cost_impact || 0) / 1000
        return scoreA - scoreB
      })

      return {
        scenarios: comparison,
        recommended_scenario: comparison[0],
        comparison_metrics: {
          best_cost_impact: comparison.reduce((min, curr) => 
            (curr?.cost_impact || 0) < (min?.cost_impact || 0) ? curr : min
          ),
          least_disruptive: comparison.reduce((min, curr) => 
            (curr?.disruption_percentage || 0) < (min?.disruption_percentage || 0) ? curr : min
          ),
          fastest_implementation: comparison.reduce((min, curr) => 
            (curr?.adjustment_time || 0) < (min?.adjustment_time || 0) ? curr : min
          )
        }
      }
    },
    onSuccess: () => {
      toast.success('تم مقارنة السيناريوهات بنجاح / Scenarios compared successfully')
    },
    onError: (error: Error) => {
      console.error('Scenario comparison error:', error)
      toast.error('فشل في مقارنة السيناريوهات / Failed to compare scenarios')
    }
  })

  return {
    // Scenario creation
    createScenarios: createScenariosMutation.mutate,
    createScenariosAsync: createScenariosMutation.mutateAsync,
    
    // Scenario comparison
    compareScenarios: compareScenariosMutation.mutate,
    compareScenariosAsync: compareScenariosMutation.mutateAsync,
    
    // States
    isCreatingScenarios: createScenariosMutation.isPending,
    isComparingScenarios: compareScenariosMutation.isPending,
    
    // Results
    scenariosResult: createScenariosMutation.data,
    comparisonResult: compareScenariosMutation.data,
    
    // Errors
    scenariosError: createScenariosMutation.error,
    comparisonError: compareScenariosMutation.error
  }
}

/**
 * Hook for tracking modification implementation progress
 */
export function useModificationImplementation() {
  const queryClient = useQueryClient()

  const implementModificationMutation = useMutation({
    mutationFn: async (params: {
      modification_analysis: ModificationImpactAnalysis
      schedule_adjustments: ScheduleAdjustment[]
      approval_status: 'approved' | 'rejected' | 'pending'
      implementation_notes?: string
    }) => {
      // This would implement the actual modification
      // For now, simulating with a delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return {
        success: true,
        modification_id: params.modification_analysis.modification_id,
        implementation_status: 'completed',
        implemented_at: new Date().toISOString(),
        affected_sessions_updated: params.schedule_adjustments.length,
        notifications_sent: params.modification_analysis.stakeholder_notifications_required.length
      }
    },
    onSuccess: (result) => {
      toast.success('تم تنفيذ التعديل بنجاح / Modification implemented successfully')
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['therapist-availability'] })
      queryClient.invalidateQueries({ queryKey: ['modification-history'] })
    },
    onError: (error: Error) => {
      console.error('Implementation error:', error)
      toast.error('فشل في تنفيذ التعديل / Failed to implement modification')
    }
  })

  const rollbackModificationMutation = useMutation({
    mutationFn: async (modificationId: string) => {
      // This would rollback a modification
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        success: true,
        modification_id: modificationId,
        rollback_status: 'completed',
        rolled_back_at: new Date().toISOString()
      }
    },
    onSuccess: () => {
      toast.success('تم التراجع عن التعديل بنجاح / Modification rolled back successfully')
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['modification-history'] })
    },
    onError: (error: Error) => {
      console.error('Rollback error:', error)
      toast.error('فشل في التراجع عن التعديل / Failed to rollback modification')
    }
  })

  return {
    // Implementation functions
    implementModification: implementModificationMutation.mutate,
    implementModificationAsync: implementModificationMutation.mutateAsync,
    
    // Rollback functions
    rollbackModification: rollbackModificationMutation.mutate,
    rollbackModificationAsync: rollbackModificationMutation.mutateAsync,
    
    // States
    isImplementing: implementModificationMutation.isPending,
    isRollingBack: rollbackModificationMutation.isPending,
    
    // Results
    implementationResult: implementModificationMutation.data,
    rollbackResult: rollbackModificationMutation.data,
    
    // Errors
    implementationError: implementModificationMutation.error,
    rollbackError: rollbackModificationMutation.error
  }
}

/**
 * Hook for bulk modification operations
 */
export function useBulkModificationImpact() {
  const analyzeBulkImpactMutation = useMutation({
    mutationFn: async (params: {
      enrollment_ids: string[]
      bulk_modification: {
        modification_type: ModificationType[]
        proposed_changes: any
        effective_date: string
      }
    }) => {
      const results = await Promise.all(
        params.enrollment_ids.map(enrollmentId =>
          analyzeModificationImpact({
            enrollment_id: enrollmentId,
            modification_type: params.bulk_modification.modification_type,
            proposed_changes: params.bulk_modification.proposed_changes,
            analysis_scope: 'all',
            include_alternatives: true
          })
        )
      )

      // Aggregate results
      const successfulAnalyses = results.filter(r => r.success)
      const failedAnalyses = results.filter(r => !r.success)

      const aggregateImpact = {
        total_enrollments: params.enrollment_ids.length,
        successful_analyses: successfulAnalyses.length,
        failed_analyses: failedAnalyses.length,
        total_affected_sessions: successfulAnalyses.reduce((sum, r) => 
          sum + (r.data?.impact_analysis.affected_session_count || 0), 0
        ),
        total_affected_therapists: new Set(
          successfulAnalyses.flatMap(r => 
            r.data?.therapist_impacts.map(t => t.therapist_id) || []
          )
        ).size,
        total_cost_impact: successfulAnalyses.reduce((sum, r) => 
          sum + (r.data?.cost_implications.net_impact || 0), 0
        ),
        overall_severity: calculateBulkSeverity(successfulAnalyses),
        estimated_total_time: successfulAnalyses.reduce((sum, r) => 
          sum + (r.data?.impact_analysis.estimated_adjustment_time || 0), 0
        )
      }

      return {
        aggregate_impact: aggregateImpact,
        individual_results: results,
        successful_analyses: successfulAnalyses,
        failed_analyses: failedAnalyses
      }
    },
    onSuccess: (result) => {
      toast.success(
        `تم تحليل ${result.successful_analyses.length} من ${result.aggregate_impact.total_enrollments} تسجيل / ` +
        `Analyzed ${result.successful_analyses.length} of ${result.aggregate_impact.total_enrollments} enrollments`
      )
    },
    onError: (error: Error) => {
      console.error('Bulk analysis error:', error)
      toast.error('فشل في التحليل الجماعي / Bulk analysis failed')
    }
  })

  return {
    // Analysis functions
    analyzeBulkImpact: analyzeBulkImpactMutation.mutate,
    analyzeBulkImpactAsync: analyzeBulkImpactMutation.mutateAsync,
    
    // States
    isAnalyzing: analyzeBulkImpactMutation.isPending,
    
    // Results
    bulkAnalysisResult: analyzeBulkImpactMutation.data,
    
    // Errors
    bulkAnalysisError: analyzeBulkImpactMutation.error
  }
}

/**
 * Hook for modification impact notifications
 */
export function useModificationNotifications() {
  const sendImpactNotificationsMutation = useMutation({
    mutationFn: async (params: {
      impact_analysis: ModificationImpactAnalysis
      notification_preferences: {
        include_arabic: boolean
        include_english: boolean
        channels: ('email' | 'whatsapp' | 'sms' | 'in_app')[]
        immediate_notification: boolean
      }
      custom_message?: {
        message_ar?: string
        message_en?: string
      }
    }) => {
      // This would send notifications via various channels
      // For now, simulating with a delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const notificationsSent = params.impact_analysis.stakeholder_notifications_required.length * 
                               params.notification_preferences.channels.length

      return {
        success: true,
        notifications_sent: notificationsSent,
        channels_used: params.notification_preferences.channels,
        stakeholders_notified: params.impact_analysis.stakeholder_notifications_required,
        sent_at: new Date().toISOString()
      }
    },
    onSuccess: (result) => {
      toast.success(
        `تم إرسال ${result.notifications_sent} إشعار / ` +
        `${result.notifications_sent} notifications sent`
      )
    },
    onError: (error: Error) => {
      console.error('Notification error:', error)
      toast.error('فشل في إرسال الإشعارات / Failed to send notifications')
    }
  })

  return {
    // Notification functions
    sendNotifications: sendImpactNotificationsMutation.mutate,
    sendNotificationsAsync: sendImpactNotificationsMutation.mutateAsync,
    
    // States
    isSendingNotifications: sendImpactNotificationsMutation.isPending,
    
    // Results
    notificationResult: sendImpactNotificationsMutation.data,
    
    // Errors
    notificationError: sendImpactNotificationsMutation.error
  }
}

// Helper functions

function calculateSeverityScore(impact: ModificationImpactAnalysis): number {
  let score = 0
  
  // Severity weight
  switch (impact.overall_severity) {
    case 'high': score += 3; break
    case 'medium': score += 2; break
    case 'low': score += 1; break
  }
  
  // Session count weight
  score += Math.min(impact.affected_session_count / 10, 3)
  
  // Therapist count weight
  score += Math.min(impact.affected_therapist_count / 2, 2)
  
  // Disruption percentage weight
  score += impact.schedule_disruption_percentage * 2
  
  return score
}

function calculateBulkSeverity(analyses: any[]): 'low' | 'medium' | 'high' {
  const severityCounts = analyses.reduce((counts, analysis) => {
    const severity = analysis.data?.impact_analysis?.overall_severity || 'low'
    counts[severity] = (counts[severity] || 0) + 1
    return counts
  }, { low: 0, medium: 0, high: 0 })

  const totalAnalyses = analyses.length
  const highPercentage = severityCounts.high / totalAnalyses
  const mediumPercentage = severityCounts.medium / totalAnalyses

  if (highPercentage > 0.3) return 'high'
  if (highPercentage > 0.1 || mediumPercentage > 0.5) return 'medium'
  return 'low'
}

/**
 * Custom hook for real-time modification impact monitoring
 */
export function useModificationImpactMonitoring(modificationId?: string) {
  return useQuery({
    queryKey: ['modification-monitoring', modificationId],
    queryFn: async () => {
      if (!modificationId) return null
      
      // This would fetch real-time monitoring data
      // For now, returning placeholder data
      return {
        modification_id: modificationId,
        current_status: 'in_progress',
        completion_percentage: 45,
        steps_completed: 3,
        total_steps: 7,
        estimated_remaining_time: 120, // minutes
        last_updated: new Date().toISOString(),
        current_step: {
          name_ar: 'تحديث الجلسات المجدولة',
          name_en: 'Updating scheduled sessions',
          progress: 65
        }
      }
    },
    enabled: !!modificationId,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000 // Consider stale after 5 seconds
  })
}