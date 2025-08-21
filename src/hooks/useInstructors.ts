import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  Instructor, 
  CreateInstructorData, 
  UpdateInstructorData,
  InstructorFilters,
  InstructorStats,
  CourseAssignment,
  CreateCourseAssignmentData
} from '@/types/instructor'

// Instructor Management Hooks

// Fetch all instructors
export const useInstructors = (filters?: InstructorFilters) => {
  return useQuery({
    queryKey: ['instructors', filters],
    queryFn: async (): Promise<Instructor[]> => {
      console.log('🔍 Fetching instructors with filters:', filters)
      
      let query = supabase
        .from('instructors')
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
        console.error('❌ Error fetching instructors:', error)
        throw error
      }

      console.log('✅ Instructors fetched successfully:', data?.length || 0, 'instructors')
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Fetch single instructor by ID
export const useInstructor = (id: string) => {
  return useQuery({
    queryKey: ['instructors', id],
    queryFn: async (): Promise<Instructor> => {
      console.log('🔍 Fetching instructor:', id)

      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching instructor:', error)
        throw error
      }

      console.log('✅ Instructor fetched successfully:', data)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Create new instructor
export const useCreateInstructor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInstructorData): Promise<Instructor> => {
      console.log('🔍 Creating instructor with:', data)
      
      // Temporarily disable auth check for testing
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const instructorData = {
        ...data,
        qualifications: data.qualifications || [],
        experience_years: data.experience_years || 0,
        employment_type: data.employment_type || 'part_time',
        hire_date: data.hire_date || new Date().toISOString().split('T')[0],
        status: 'active',
        created_by: user?.id || null,
        updated_by: user?.id || null,
      }

      const { data: newInstructor, error } = await supabase
        .from('instructors')
        .insert([instructorData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating instructor:', error)
        throw error
      }

      console.log('✅ Instructor created successfully:', newInstructor)
      return newInstructor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
    },
  })
}

// Update instructor
export const useUpdateInstructor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInstructorData }): Promise<Instructor> => {
      console.log('🔍 Updating instructor:', id, 'with:', data)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('⚠️ Auth error (continuing anyway for testing):', authError)
      }
      if (!user) {
        console.log('⚠️ No user found (continuing anyway for testing)')
      }

      const updateData = {
        ...data,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedInstructor, error } = await supabase
        .from('instructors')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error updating instructor:', error)
        throw error
      }

      console.log('✅ Instructor updated successfully:', updatedInstructor)
      return updatedInstructor
    },
    onSuccess: (updatedInstructor) => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
      queryClient.invalidateQueries({ queryKey: ['instructors', updatedInstructor.id] })
    },
  })
}

// Delete instructor
export const useDeleteInstructor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 Deleting instructor:', id)

      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting instructor:', error)
        throw error
      }

      console.log('✅ Instructor deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
    },
  })
}

// Fetch instructor statistics
export const useInstructorStats = () => {
  return useQuery({
    queryKey: ['instructor-stats'],
    queryFn: async (): Promise<InstructorStats> => {
      console.log('🔍 Fetching instructor statistics...')

      const { data: instructors, error } = await supabase
        .from('instructors')
        .select('status, employment_type, experience_years, hourly_rate')

      if (error) {
        console.error('❌ Error fetching instructor stats:', error)
        throw error
      }

      // Calculate statistics
      const total_instructors = instructors?.length || 0
      const active_instructors = instructors?.filter(i => i.status === 'active').length || 0
      const inactive_instructors = instructors?.filter(i => i.status === 'inactive').length || 0
      const on_leave_instructors = instructors?.filter(i => i.status === 'on_leave').length || 0
      const full_time_instructors = instructors?.filter(i => i.employment_type === 'full_time').length || 0
      const part_time_instructors = instructors?.filter(i => i.employment_type === 'part_time').length || 0
      
      const average_experience = total_instructors > 0 
        ? Math.round(instructors.reduce((sum, i) => sum + (i.experience_years || 0), 0) / total_instructors)
        : 0
      
      const instructorsWithRate = instructors?.filter(i => i.hourly_rate && i.hourly_rate > 0) || []
      const average_hourly_rate = instructorsWithRate.length > 0
        ? Math.round(instructorsWithRate.reduce((sum, i) => sum + (i.hourly_rate || 0), 0) / instructorsWithRate.length)
        : 0

      const stats: InstructorStats = {
        total_instructors,
        active_instructors,
        inactive_instructors,
        on_leave_instructors,
        full_time_instructors,
        part_time_instructors,
        average_experience,
        average_hourly_rate,
      }

      console.log('✅ Instructor statistics calculated:', stats)
      return stats
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Course Assignment Hooks

// Fetch course assignments
export const useCourseAssignments = (filters?: { instructor_id?: string; course_id?: string }) => {
  return useQuery({
    queryKey: ['course-assignments', filters],
    queryFn: async (): Promise<CourseAssignment[]> => {
      console.log('🔍 Fetching course assignments with filters:', filters)
      
      let query = supabase
        .from('courses')
        .select(`
          id,
          instructor_id,
          instructor_name,
          name_ar,
          name_en,
          course_code,
          start_date,
          end_date,
          status,
          created_at,
          updated_at,
          instructor:instructors(
            id,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            email,
            phone,
            specialization_ar,
            specialization_en
          )
        `)
        .not('instructor_id', 'is', null)
        .order('created_at', { ascending: false })

      if (filters) {
        if (filters.instructor_id) {
          query = query.eq('instructor_id', filters.instructor_id)
        }
        if (filters.course_id) {
          query = query.eq('id', filters.course_id)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching course assignments:', error)
        throw error
      }

      // Transform the data to match CourseAssignment interface
      const assignments: CourseAssignment[] = (data || []).map(course => ({
        id: `assignment-${course.id}`,
        instructor_id: course.instructor_id,
        course_id: course.id,
        assigned_date: course.created_at,
        status: course.status === 'active' ? 'active' : 'completed',
        created_at: course.created_at,
        updated_at: course.updated_at,
        instructor: Array.isArray(course.instructor) ? course.instructor[0] : course.instructor,
        course: {
          id: course.id,
          name_ar: course.name_ar,
          name_en: course.name_en,
          course_code: course.course_code,
          start_date: course.start_date,
          end_date: course.end_date
        }
      }))

      console.log('✅ Course assignments fetched successfully:', assignments.length, 'assignments')
      return assignments
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Assign instructor to course
export const useAssignInstructorToCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCourseAssignmentData): Promise<void> => {
      console.log('🔍 Assigning instructor to course:', data)

      const { error } = await supabase
        .from('courses')
        .update({ 
          instructor_id: data.instructor_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.course_id)

      if (error) {
        console.error('❌ Error assigning instructor to course:', error)
        throw error
      }

      console.log('✅ Instructor assigned to course successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

// Remove instructor from course
export const useRemoveInstructorFromCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (courseId: string): Promise<void> => {
      console.log('🔍 Removing instructor from course:', courseId)

      const { error } = await supabase
        .from('courses')
        .update({ 
          instructor_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)

      if (error) {
        console.error('❌ Error removing instructor from course:', error)
        throw error
      }

      console.log('✅ Instructor removed from course successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}