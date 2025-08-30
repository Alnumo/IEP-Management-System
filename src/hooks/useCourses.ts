import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Course, CreateCourseData, UpdateCourseData, CourseFilters, CourseStats } from '@/types/course'

// Fetch all courses
export const useCourses = (filters?: CourseFilters) => {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: async (): Promise<Course[]> => {
      console.log('🔍 Fetching courses with filters:', filters)
      
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
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.therapist_id) {
          query = query.eq('therapist_id', filters.therapist_id)
        }
        if (filters.start_date_from) {
          query = query.gte('start_date', filters.start_date_from)
        }
        if (filters.start_date_to) {
          query = query.lte('start_date', filters.start_date_to)
        }
        if (filters.search) {
          query = query.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,course_code.ilike.%${filters.search}%,therapist_name.ilike.%${filters.search}%`)
        }
        if (filters.price_min !== undefined) {
          query = query.gte('price', filters.price_min)
        }
        if (filters.price_max !== undefined) {
          query = query.lte('price', filters.price_max)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching courses:', error)
        throw error
      }

      console.log('✅ Courses fetched successfully:', data?.length || 0, 'courses')
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch single course by ID
export const useCourse = (id: string) => {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: async (): Promise<Course> => {
      console.log('🔍 Fetching course:', id)

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

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching course:', error)
        throw error
      }

      console.log('✅ Course fetched successfully:', data)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Create new course
export const useCreateCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCourseData): Promise<Course> => {
      console.log('🔍 Creating course with:', data)
      
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

      // Generate course code if not provided
      const courseCode = `CRS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
      
      const courseData = {
        ...data,
        course_code: courseCode,
        status: 'planned', // Default status for new courses
        enrolled_students: 0, // Initialize enrolled students
        created_by: user?.id || null,
        updated_by: user?.id || null,
      }

      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert([courseData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating course:', error)
        throw error
      }

      console.log('✅ Course created successfully:', newCourse)
      return newCourse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

// Update course
export const useUpdateCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCourseData }): Promise<Course> => {
      console.log('🔍 Updating course:', id, 'with:', data)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
        throw new Error('User not authenticated')
      }

      const updateData = {
        ...data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedCourse, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating course:', error)
        throw error
      }

      console.log('✅ Course updated successfully:', updatedCourse)
      return updatedCourse
    },
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses', updatedCourse.id] })
    },
  })
}

// Delete course
export const useDeleteCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 Deleting course:', id)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting course:', error)
        throw error
      }

      console.log('✅ Course deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

// Fetch course statistics
export const useCourseStats = () => {
  return useQuery({
    queryKey: ['courses', 'stats'],
    queryFn: async (): Promise<CourseStats> => {
      console.log('🔍 Fetching course statistics...')

      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          id,
          status,
          price,
          enrolled_students,
          max_students
        `)

      if (error) {
        console.error('❌ Error fetching course stats:', error)
        throw error
      }

      // Calculate statistics
      const total = courses?.length || 0
      const planned = courses?.filter(c => c.status === 'planned').length || 0
      const active = courses?.filter(c => c.status === 'active').length || 0
      const completed = courses?.filter(c => c.status === 'completed').length || 0
      const cancelled = courses?.filter(c => c.status === 'cancelled').length || 0
      
      const totalEnrollments = courses?.reduce((sum, c) => sum + (c.enrolled_students || 0), 0) || 0
      const totalRevenue = courses?.reduce((sum, c) => sum + ((c.price || 0) * (c.enrolled_students || 0)), 0) || 0
      
      const totalCapacity = courses?.reduce((sum, c) => sum + (c.max_students || 0), 0) || 0
      const occupancyRate = totalCapacity > 0 ? Math.round((totalEnrollments / totalCapacity) * 100) : 0

      const stats: CourseStats = {
        total,
        planned,
        active,
        completed,
        cancelled,
        totalEnrollments,
        totalRevenue,
        occupancyRate
      }

      console.log('✅ Course statistics calculated:', stats)
      return stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}