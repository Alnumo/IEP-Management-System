import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  Therapist, 
  CreateTherapistData, 
  UpdateTherapistData,
  TherapistFilters,
  TherapistStats,
  CourseAssignment,
  CreateCourseAssignmentData
} from '@/types/therapist'

// Therapist Management Hooks

// Fetch all therapists
export const useTherapists = (filters?: TherapistFilters) => {
  return useQuery({
    queryKey: ['therapists', filters],
    queryFn: async (): Promise<Therapist[]> => {
      console.log('🔍 Fetching therapists with filters:', filters)
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Authentication error:', authError)
        throw new Error('Authentication failed')
      }
      if (!user) {
        console.error('❌ No user found - authentication required')
        throw new Error('User not authenticated')
      }
      
      let query = supabase
        .from('therapists')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.employment_type) {
          query = query.eq('employment_type', filters.employment_type)
        }
        if (filters.specialization) {
          query = query.or(`specialization_ar.ilike.%${filters.specialization}%,specialization_en.ilike.%${filters.specialization}%`)
        }
        if (filters.search) {
          query = query.or(`first_name_ar.ilike.%${filters.search}%,last_name_ar.ilike.%${filters.search}%,first_name_en.ilike.%${filters.search}%,last_name_en.ilike.%${filters.search}%`)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching therapists:', error)
        throw error
      }

      console.log('✅ Therapists fetched successfully:', data?.length || 0, 'therapists')
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch single therapist by ID
export const useTherapist = (id: string) => {
  return useQuery({
    queryKey: ['therapists', id],
    queryFn: async (): Promise<Therapist> => {
      console.log('🔍 Fetching therapist:', id)

      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching therapist:', error)
        throw error
      }

      console.log('✅ Therapist fetched successfully:', data)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Create new therapist
export const useCreateTherapist = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTherapistData): Promise<Therapist> => {
      console.log('🔍 Creating therapist with:', data)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const therapistData = {
        ...data,
        hire_date: data.hire_date || new Date().toISOString().split('T')[0],
        employment_type: data.employment_type || 'full_time',
        experience_years: data.experience_years || 0,
        status: 'active',
        created_by: user?.id,
        updated_by: user?.id,
      }

      const { data: result, error } = await supabase
        .from('therapists')
        .insert([therapistData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating therapist:', error)
        throw error
      }

      console.log('✅ Therapist created successfully:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] })
    },
  })
}

// Update therapist
export const useUpdateTherapist = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTherapistData & { id: string }): Promise<Therapist> => {
      console.log('🔍 Updating therapist:', id, 'with:', data)

      const { data: { user } } = await supabase.auth.getUser()

      const updateData = {
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }

      const { data: result, error } = await supabase
        .from('therapists')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error updating therapist:', error)
        throw error
      }

      console.log('✅ Therapist updated successfully:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] })
    },
  })
}

// Delete therapist
export const useDeleteTherapist = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 Deleting therapist:', id)

      const { error } = await supabase
        .from('therapists')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting therapist:', error)
        throw error
      }

      console.log('✅ Therapist deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] })
    },
  })
}

// Therapist statistics
export const useTherapistStats = () => {
  return useQuery({
    queryKey: ['therapist-stats'],
    queryFn: async (): Promise<TherapistStats> => {
      console.log('🔍 Fetching therapist statistics')

      const { data: therapists, error } = await supabase
        .from('therapists')
        .select('status, employment_type, experience_years, specialization_ar')

      if (error) {
        console.error('❌ Error fetching therapist stats:', error)
        throw error
      }

      const total = therapists.length
      const active = therapists.filter(t => t.status === 'active').length
      const inactive = therapists.filter(t => t.status === 'inactive').length
      const on_leave = therapists.filter(t => t.status === 'on_leave').length
      const terminated = therapists.filter(t => t.status === 'terminated').length

      const full_time = therapists.filter(t => t.employment_type === 'full_time').length
      const part_time = therapists.filter(t => t.employment_type === 'part_time').length
      const contract = therapists.filter(t => t.employment_type === 'contract').length
      const volunteer = therapists.filter(t => t.employment_type === 'volunteer').length

      const average_experience = total > 0 
        ? therapists.reduce((sum, t) => sum + (t.experience_years || 0), 0) / total 
        : 0

      // Count specializations
      const specializations: { [key: string]: number } = {}
      therapists.forEach(therapist => {
        if (therapist.specialization_ar) {
          specializations[therapist.specialization_ar] = (specializations[therapist.specialization_ar] || 0) + 1
        }
      })

      // Get course assignments count
      const { data: courseAssignments } = await supabase
        .from('courses')
        .select('therapist_id')
        .not('therapist_id', 'is', null)

      const total_courses_assigned = courseAssignments?.length || 0

      console.log('✅ Therapist statistics calculated successfully')
      return {
        total,
        active,
        inactive,
        on_leave,
        terminated,
        full_time,
        part_time,
        contract,
        volunteer,
        average_experience,
        total_courses_assigned,
        specializations
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Course Assignment Hooks

// Get course assignments for a therapist
export const useTherapistCourseAssignments = (therapistId: string) => {
  return useQuery({
    queryKey: ['therapist-course-assignments', therapistId],
    queryFn: async (): Promise<CourseAssignment[]> => {
      console.log('🔍 Fetching course assignments for therapist:', therapistId)

      const { data, error } = await supabase
        .from('course_assignments')
        .select(`
          *,
          course:courses(
            id,
            course_code,
            name_ar,
            name_en,
            start_date,
            end_date,
            status
          )
        `)
        .eq('therapist_id', therapistId)
        .order('assignment_date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching course assignments:', error)
        throw error
      }

      console.log('✅ Course assignments fetched successfully:', data?.length || 0)
      return data || []
    },
    enabled: !!therapistId,
    staleTime: 5 * 60 * 1000,
  })
}

// Create course assignment
export const useCreateCourseAssignment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCourseAssignmentData): Promise<CourseAssignment> => {
      console.log('🔍 Creating course assignment:', data)

      const { data: { user } } = await supabase.auth.getUser()

      const assignmentData = {
        ...data,
        assignment_date: data.assignment_date || new Date().toISOString().split('T')[0],
        assignment_type: data.assignment_type || 'primary',
        status: 'active',
        created_by: user?.id,
        updated_by: user?.id,
      }

      const { data: result, error } = await supabase
        .from('course_assignments')
        .insert([assignmentData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating course assignment:', error)
        throw error
      }

      console.log('✅ Course assignment created successfully:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-course-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}