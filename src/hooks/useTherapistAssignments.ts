// Custom hook for managing therapist specialization assignments
// Story 1.2: Advanced Therapist Assignment & Substitute Workflow

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  TherapistSpecializationAssignment,
  CreateTherapistSpecializationAssignmentData,
  UpdateTherapistSpecializationAssignmentData,
  StudentTherapistAssignmentView,
  AvailableSubstituteView,
  AssignmentHistory,
  SubstitutePool,
  AssignmentFilters,
  SubstituteFilters,
  AssignmentHistoryFilters,
  BulkAssignmentRequest,
  BulkAssignmentResult,
  AssignmentValidationResult,
  AssignmentStatistics
} from '@/types/therapist-assignment'

// Query keys for React Query cache management
export const ASSIGNMENT_QUERY_KEYS = {
  all: ['therapist-assignments'] as const,
  lists: () => [...ASSIGNMENT_QUERY_KEYS.all, 'list'] as const,
  list: (filters: AssignmentFilters) => [...ASSIGNMENT_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ASSIGNMENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ASSIGNMENT_QUERY_KEYS.details(), id] as const,
  studentView: () => [...ASSIGNMENT_QUERY_KEYS.all, 'student-view'] as const,
  substitutes: () => [...ASSIGNMENT_QUERY_KEYS.all, 'substitutes'] as const,
  substituteList: (filters: SubstituteFilters) => [...ASSIGNMENT_QUERY_KEYS.substitutes(), filters] as const,
  history: () => [...ASSIGNMENT_QUERY_KEYS.all, 'history'] as const,
  historyList: (filters: AssignmentHistoryFilters) => [...ASSIGNMENT_QUERY_KEYS.history(), filters] as const,
  statistics: () => [...ASSIGNMENT_QUERY_KEYS.all, 'statistics'] as const,
  validation: () => [...ASSIGNMENT_QUERY_KEYS.all, 'validation'] as const,
} as const

// Hook for fetching therapist assignments
export function useTherapistAssignments(filters: AssignmentFilters = {}) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.list(filters),
    queryFn: async (): Promise<TherapistSpecializationAssignment[]> => {
      let query = supabase
        .from('therapist_specialization_assignments')
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          ),
          substitute_therapist:therapists!current_substitute_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en,
            specialization_ar, specialization_en
          )
        `)

      // Apply filters
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters.therapist_id) {
        query = query.eq('primary_therapist_id', filters.therapist_id)
      }
      if (filters.specialization_ar) {
        query = query.eq('specialization_ar', filters.specialization_ar)
      }
      if (filters.specialization_key) {
        query = query.eq('specialization_key', filters.specialization_key)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.has_substitute !== undefined) {
        if (filters.has_substitute) {
          query = query.not('current_substitute_id', 'is', null)
        } else {
          query = query.is('current_substitute_id', null)
        }
      }
      if (filters.date_from) {
        query = query.gte('assigned_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('assigned_date', filters.date_to)
      }

      const { data, error } = await query.order('assigned_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for fetching single assignment
export function useTherapistAssignment(id: string) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<TherapistSpecializationAssignment | null> => {
      const { data, error } = await supabase
        .from('therapist_specialization_assignments')
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          ),
          substitute_therapist:therapists!current_substitute_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en,
            specialization_ar, specialization_en
          )
        `)
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for student-therapist assignment view
export function useStudentTherapistAssignments(studentId?: string) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.studentView(),
    queryFn: async (): Promise<StudentTherapistAssignmentView[]> => {
      let query = supabase.from('student_therapist_assignments').select('*')

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query.order('specialization_ar')

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for available substitutes
export function useAvailableSubstitutes(filters: SubstituteFilters = {}) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.substituteList(filters),
    queryFn: async (): Promise<AvailableSubstituteView[]> => {
      let query = supabase.from('available_substitutes').select('*')

      // Apply filters
      if (filters.specialization_ar) {
        query = query.eq('specialization_ar', filters.specialization_ar)
      }
      if (filters.specialization_key) {
        query = query.eq('specialization_key', filters.specialization_key)
      }
      if (filters.is_available !== undefined) {
        query = query.eq('is_available', filters.is_available)
      }
      if (filters.priority_level) {
        query = query.eq('priority_level', filters.priority_level)
      }
      if (filters.emergency_only !== undefined) {
        query = query.eq('emergency_contact_only', filters.emergency_only)
      }
      if (filters.has_availability) {
        query = query.gt('available_slots', 0)
      }

      const { data, error } = await query
        .order('specialization_ar')
        .order('priority_level')
        .order('current_substitutions_count')

      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for substitute availability
  })
}

// Hook for assignment history
export function useAssignmentHistory(filters: AssignmentHistoryFilters = {}) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.historyList(filters),
    queryFn: async (): Promise<AssignmentHistory[]> => {
      let query = supabase.from('assignment_history').select('*')

      // Apply filters
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters.change_type) {
        query = query.eq('change_type', filters.change_type)
      }
      if (filters.therapist_id) {
        query = query.or(`previous_therapist_id.eq.${filters.therapist_id},new_therapist_id.eq.${filters.therapist_id}`)
      }
      if (filters.specialization_ar) {
        query = query.eq('specialization_ar', filters.specialization_ar)
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters.parent_notified !== undefined) {
        query = query.eq('parent_notified', filters.parent_notified)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for assignment statistics
export function useAssignmentStatistics() {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.statistics(),
    queryFn: async (): Promise<AssignmentStatistics> => {
      // Execute multiple queries for statistics
      const [
        assignmentCounts,
        specializationStats,
        recentChanges
      ] = await Promise.all([
        // Basic assignment counts
        supabase.rpc('get_assignment_statistics'),
        // Specialization breakdown
        supabase.rpc('get_specialization_statistics'),
        // Recent changes
        supabase
          .from('assignment_history')
          .select(`
            change_type,
            specialization_ar,
            created_at,
            student_id,
            new_therapist_id
          `)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Process and combine the results
      return {
        total_assignments: assignmentCounts.data?.total_assignments || 0,
        active_assignments: assignmentCounts.data?.active_assignments || 0,
        students_without_assignments: assignmentCounts.data?.students_without_assignments || 0,
        therapists_overloaded: assignmentCounts.data?.therapists_overloaded || 0,
        substitute_assignments_active: assignmentCounts.data?.substitute_assignments_active || 0,
        conflicts_detected: assignmentCounts.data?.conflicts_detected || 0,
        by_specialization: specializationStats.data || [],
        recent_changes: recentChanges.data?.map(change => ({
          change_type: change.change_type,
          student_name_ar: 'Student Name', // Will be populated from join
          specialization_ar: change.specialization_ar,
          therapist_name_ar: 'Therapist Name', // Will be populated from join
          created_at: change.created_at
        })) || []
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for statistics
  })
}

// Mutation hooks for CRUD operations
export function useCreateTherapistAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTherapistSpecializationAssignmentData): Promise<TherapistSpecializationAssignment> => {
      const { data: result, error } = await supabase
        .from('therapist_specialization_assignments')
        .insert(data)
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          )
        `)
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateTherapistAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTherapistSpecializationAssignmentData }): Promise<TherapistSpecializationAssignment> => {
      const { data: result, error } = await supabase
        .from('therapist_specialization_assignments')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          ),
          substitute_therapist:therapists!current_substitute_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en,
            specialization_ar, specialization_en
          )
        `)
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteTherapistAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('therapist_specialization_assignments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
    },
  })
}

// Bulk assignment operations
export function useBulkAssignTherapists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: BulkAssignmentRequest): Promise<BulkAssignmentResult> => {
      const { data, error } = await supabase.rpc('bulk_assign_therapists', {
        assignment_request: request
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
    },
  })
}

// Assignment validation
export function useValidateAssignment() {
  return useMutation({
    mutationFn: async (data: CreateTherapistSpecializationAssignmentData): Promise<AssignmentValidationResult> => {
      const { data: result, error } = await supabase.rpc('validate_therapist_assignment', {
        assignment_data: data
      })

      if (error) throw error
      return result
    },
  })
}

// Substitute assignment operations
export function useAssignSubstitute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assignmentId, substituteId, reason, startDate, endDate }: {
      assignmentId: string
      substituteId: string
      reason?: string
      startDate?: string
      endDate?: string
    }): Promise<TherapistSpecializationAssignment> => {
      const { data: result, error } = await supabase
        .from('therapist_specialization_assignments')
        .update({
          current_substitute_id: substituteId,
          substitute_start_date: startDate || new Date().toISOString(),
          substitute_end_date: endDate,
          substitute_reason: reason,
          parent_notified: false, // Will trigger notification
          therapist_notified: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          ),
          substitute_therapist:therapists!current_substitute_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en,
            specialization_ar, specialization_en
          )
        `)
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.detail(variables.assignmentId) })
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.substitutes() })
    },
  })
}

export function useRemoveSubstitute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assignmentId: string): Promise<TherapistSpecializationAssignment> => {
      const { data: result, error } = await supabase
        .from('therapist_specialization_assignments')
        .update({
          current_substitute_id: null,
          substitute_start_date: null,
          substitute_end_date: null,
          substitute_reason: null,
          parent_notified: false, // Will trigger notification
          therapist_notified: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select(`
          *,
          student:students(id, first_name_ar, last_name_ar, first_name_en, last_name_en),
          primary_therapist:therapists!primary_therapist_id(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, 
            specialization_ar, specialization_en
          )
        `)
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.detail(assignmentId) })
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.substitutes() })
    },
  })
}