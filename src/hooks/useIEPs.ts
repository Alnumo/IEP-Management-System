/**
 * IEP Management Hooks
 * React Query hooks for IEP data management with optimistic updates
 * Following useStudents.ts patterns for consistency
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { requireAuth } from '@/lib/auth-utils'
import {
  createIEP,
  getIEPs,
  getIEP,
  updateIEP,
  createIEPGoal,
  updateIEPGoalProgress,
  getIEPStats,
  validateIEPCompliance
} from '@/services/iep-service'
import type {
  IEP,
  CreateIEPData,
  UpdateIEPData,
  IEPGoal,
  CreateIEPGoalData,
  UpdateIEPGoalData,
  IEPProgressData,
  IEPFilters
} from '@/types/iep'

// =============================================================================
// IEP DOCUMENT HOOKS
// =============================================================================

/**
 * Fetch all IEPs with enhanced error handling and filtering
 */
export const useIEPs = (filters: IEPFilters = {}) => {
  return useQuery({
    queryKey: ['ieps', filters],
    queryFn: async (): Promise<IEP[]> => {
      return retryApiCall(async () => {
        console.log('🔍 useIEPs: Fetching IEPs with filters:', filters)
        
        // Use centralized auth checking
        const user = await requireAuth()
        
        const data = await getIEPs(filters)
        
        console.log('✅ useIEPs: IEPs fetched successfully:', data?.length, 'records')
        return data || []
      }, {
        context: 'Fetching IEPs',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (IEPs change frequently)
  })
}

/**
 * Fetch single IEP by ID with complete related data
 */
export const useIEP = (id: string) => {
  return useQuery({
    queryKey: ['ieps', id],
    queryFn: async (): Promise<IEP> => {
      console.log('🔍 useIEP: Fetching IEP:', id)
      
      // Check authentication
      const user = await requireAuth()
      
      const data = await getIEP(id)
      
      console.log('✅ useIEP: IEP fetched successfully:', data.id)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Create new IEP with compliance validation
 */
export const useCreateIEP = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateIEPData): Promise<IEP> => {
      console.log('🔍 useCreateIEP: Creating IEP with:', data)
      
      const user = await requireAuth()
      
      // Pre-validate compliance
      const validationResult = validateIEPCompliance(data)
      if (!validationResult.isValid) {
        const criticalIssues = validationResult.issues.filter(i => i.severity === 'critical')
        if (criticalIssues.length > 0) {
          throw new Error(`Critical IEP compliance issues: ${criticalIssues.map(i => i.description_en).join(', ')}`)
        }
      }
      
      const newIEP = await createIEP(data)
      
      console.log('✅ useCreateIEP: IEP created successfully:', newIEP.id)
      return newIEP
    },
    onSuccess: async (data, variables) => {
      // Invalidate and refetch IEP queries
      queryClient.invalidateQueries({ queryKey: ['ieps'] })
      queryClient.invalidateQueries({ queryKey: ['iep-stats'] })
      
      // Set the new IEP in the cache
      queryClient.setQueryData(['ieps', data.id], data)
      
      console.log('✅ useCreateIEP: Cache updated successfully')
    },
    onError: (error, variables) => {
      console.error('❌ useCreateIEP: Error creating IEP:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useCreateIEP',
        action: 'create_iep',
        metadata: { 
          student_id: variables.student_id,
          academic_year: variables.academic_year 
        }
      })
    }
  })
}

/**
 * Update existing IEP with version management
 */
export const useUpdateIEP = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIEPData }): Promise<IEP> => {
      console.log('🔍 useUpdateIEP: Updating IEP:', id, 'with:', data)
      
      const user = await requireAuth()
      
      const updatedIEP = await updateIEP({ id, data })
      
      console.log('✅ useUpdateIEP: IEP updated successfully:', updatedIEP.id)
      return updatedIEP
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['ieps', id] })
      
      // Snapshot the previous value
      const previousIEP = queryClient.getQueryData<IEP>(['ieps', id])
      
      // Optimistically update to the new value
      if (previousIEP) {
        const optimisticIEP = {
          ...previousIEP,
          ...data,
          updated_at: new Date().toISOString()
        }
        queryClient.setQueryData(['ieps', id], optimisticIEP)
      }
      
      // Return context with previous and optimistic values
      return { previousIEP, id }
    },
    onError: (error, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousIEP) {
        queryClient.setQueryData(['ieps', id], context.previousIEP)
      }
      
      console.error('❌ useUpdateIEP: Error updating IEP:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useUpdateIEP',
        action: 'update_iep',
        metadata: { iep_id: id }
      })
    },
    onSuccess: (updatedIEP, { id }) => {
      // Update the cache with the server response
      queryClient.setQueryData(['ieps', id], updatedIEP)
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['ieps'] })
      queryClient.invalidateQueries({ queryKey: ['iep-stats'] })
      
      console.log('✅ useUpdateIEP: Cache updated successfully')
    },
  })
}

/**
 * Delete IEP (soft delete - archives the IEP)
 */
export const useDeleteIEP = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 useDeleteIEP: Archiving IEP:', id)
      
      const user = await requireAuth()
      
      // Soft delete by updating status to archived
      await updateIEP({ 
        id, 
        data: { 
          status: 'archived',
          workflow_stage: 'expired'
        } 
      })
      
      console.log('✅ useDeleteIEP: IEP archived successfully')
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate queries
      queryClient.removeQueries({ queryKey: ['ieps', id] })
      queryClient.invalidateQueries({ queryKey: ['ieps'] })
      queryClient.invalidateQueries({ queryKey: ['iep-stats'] })
    },
    onError: (error, id) => {
      console.error('❌ useDeleteIEP: Error archiving IEP:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useDeleteIEP',
        action: 'archive_iep',
        metadata: { iep_id: id }
      })
    }
  })
}

// =============================================================================
// IEP GOALS HOOKS
// =============================================================================

/**
 * Fetch IEP goals for a specific IEP
 */
export const useIEPGoals = (iepId: string) => {
  return useQuery({
    queryKey: ['iep-goals', iepId],
    queryFn: async (): Promise<IEPGoal[]> => {
      console.log('🔍 useIEPGoals: Fetching goals for IEP:', iepId)
      
      const user = await requireAuth()
      
      // Goals are fetched as part of the IEP data, but we can also fetch them separately
      const iep = await getIEP(iepId)
      
      console.log('✅ useIEPGoals: Goals fetched successfully:', iep.goals?.length || 0, 'goals')
      return iep.goals || []
    },
    enabled: !!iepId,
    staleTime: 2 * 60 * 1000, // 2 minutes (goals change more frequently)
  })
}

/**
 * Create new IEP goal
 */
export const useCreateIEPGoal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateIEPGoalData): Promise<IEPGoal> => {
      console.log('🔍 useCreateIEPGoal: Creating goal:', data)
      
      const user = await requireAuth()
      
      const newGoal = await createIEPGoal(data)
      
      console.log('✅ useCreateIEPGoal: Goal created successfully:', newGoal.id)
      return newGoal
    },
    onSuccess: (data, variables) => {
      // Invalidate IEP and goals queries
      queryClient.invalidateQueries({ queryKey: ['ieps', variables.iep_id] })
      queryClient.invalidateQueries({ queryKey: ['iep-goals', variables.iep_id] })
      queryClient.invalidateQueries({ queryKey: ['ieps'] }) // For goals count in list
      
      console.log('✅ useCreateIEPGoal: Cache updated successfully')
    },
    onError: (error, variables) => {
      console.error('❌ useCreateIEPGoal: Error creating goal:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useCreateIEPGoal',
        action: 'create_goal',
        metadata: { 
          iep_id: variables.iep_id,
          domain: variables.domain 
        }
      })
    }
  })
}

/**
 * Update IEP goal progress with data
 */
export const useUpdateIEPGoalProgress = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, progressData }: { goalId: string; progressData: IEPProgressData[] }): Promise<IEPGoal> => {
      console.log('🔍 useUpdateIEPGoalProgress: Updating progress for goal:', goalId)
      
      const user = await requireAuth()
      
      const updatedGoal = await updateIEPGoalProgress(goalId, progressData)
      
      console.log('✅ useUpdateIEPGoalProgress: Progress updated successfully:', updatedGoal.id)
      return updatedGoal
    },
    onSuccess: (updatedGoal) => {
      // Update the specific goal in cache if we have it
      const iepData = queryClient.getQueryData<IEP>(['ieps', updatedGoal.iep_id])
      if (iepData && iepData.goals) {
        const updatedGoals = iepData.goals.map(goal => 
          goal.id === updatedGoal.id ? updatedGoal : goal
        )
        const updatedIEP = { ...iepData, goals: updatedGoals }
        queryClient.setQueryData(['ieps', updatedGoal.iep_id], updatedIEP)
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['iep-goals', updatedGoal.iep_id] })
      
      console.log('✅ useUpdateIEPGoalProgress: Cache updated successfully')
    },
    onError: (error, { goalId }) => {
      console.error('❌ useUpdateIEPGoalProgress: Error updating progress:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useUpdateIEPGoalProgress',
        action: 'update_progress',
        metadata: { goal_id: goalId }
      })
    }
  })
}

// =============================================================================
// STATISTICS AND DASHBOARD HOOKS
// =============================================================================

/**
 * Get IEP statistics for dashboard
 */
export const useIEPStats = () => {
  return useQuery({
    queryKey: ['iep-stats'],
    queryFn: async () => {
      console.log('🔍 useIEPStats: Fetching IEP statistics')
      
      const user = await requireAuth()
      
      const stats = await getIEPStats()
      
      console.log('✅ useIEPStats: Statistics fetched successfully:', stats)
      return stats
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (stats don't change frequently)
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// =============================================================================
// SEARCH AND FILTERING HOOKS
// =============================================================================

/**
 * Search IEPs with debounced query
 */
export const useSearchIEPs = (searchTerm: string, additionalFilters: Partial<IEPFilters> = {}) => {
  return useQuery({
    queryKey: ['ieps', 'search', searchTerm, additionalFilters],
    queryFn: async (): Promise<IEP[]> => {
      if (!searchTerm.trim()) {
        return []
      }

      console.log('🔍 useSearchIEPs: Searching IEPs with term:', searchTerm)
      
      const user = await requireAuth()
      
      const filters: IEPFilters = {
        search: searchTerm,
        ...additionalFilters
      }
      
      const data = await getIEPs(filters)
      
      console.log('✅ useSearchIEPs: Search completed:', data?.length || 0, 'results')
      return data || []
    },
    enabled: !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get IEPs due for review (within 30 days)
 */
export const useIEPsDueForReview = () => {
  return useQuery({
    queryKey: ['ieps', 'due-for-review'],
    queryFn: async (): Promise<IEP[]> => {
      console.log('🔍 useIEPsDueForReview: Fetching IEPs due for review')
      
      const user = await requireAuth()
      
      const filters: IEPFilters = {
        due_for_review: true,
        status: 'active'
      }
      
      const data = await getIEPs(filters)
      
      console.log('✅ useIEPsDueForReview: IEPs due for review:', data?.length || 0)
      return data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  })
}

/**
 * Get IEPs with compliance issues
 */
export const useIEPsWithComplianceIssues = () => {
  return useQuery({
    queryKey: ['ieps', 'compliance-issues'],
    queryFn: async (): Promise<IEP[]> => {
      console.log('🔍 useIEPsWithComplianceIssues: Fetching IEPs with compliance issues')
      
      const user = await requireAuth()
      
      const filters: IEPFilters = {
        compliance_issues: true
      }
      
      const data = await getIEPs(filters)
      
      console.log('✅ useIEPsWithComplianceIssues: IEPs with issues:', data?.length || 0)
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Check if IEP can be edited by current user
 */
export const useCanEditIEP = (iep?: IEP) => {
  return useQuery({
    queryKey: ['iep-permissions', iep?.id],
    queryFn: async (): Promise<boolean> => {
      if (!iep) return false
      
      const user = await requireAuth()
      
      // Only draft and review status can be edited
      if (!['draft', 'review'].includes(iep.status)) {
        return false
      }
      
      // Check if user is part of IEP team or has appropriate role
      // This would typically check against user permissions/roles
      // For now, assuming authenticated users can edit draft/review IEPs
      return true
    },
    enabled: !!iep?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Validate IEP compliance in real-time
 */
export const useIEPValidation = (iepData?: Partial<IEP | CreateIEPData>) => {
  return useQuery({
    queryKey: ['iep-validation', iepData],
    queryFn: async () => {
      if (!iepData) return null
      
      return validateIEPCompliance(iepData as CreateIEPData)
    },
    enabled: !!iepData,
    staleTime: 0, // Always fresh for validation
  })
}