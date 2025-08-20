import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Course, CreateCourseData, UpdateCourseData } from '@/types/course'

// Fetch all courses
export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<Course[]> => {
      console.log('🔍 Fetching courses...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching courses:', error)
        throw error
      }

      console.log('✅ Courses fetched successfully:', data)
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
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
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
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
        throw new Error('User not authenticated')
      }

      const courseData = {
        ...data,
        created_by: user.id,
        updated_by: user.id,
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

// Search courses
export const useSearchCourses = (searchTerm: string) => {
  return useQuery({
    queryKey: ['courses', 'search', searchTerm],
    queryFn: async (): Promise<Course[]> => {
      if (!searchTerm.trim()) {
        return []
      }

      console.log('🔍 Searching courses with term:', searchTerm)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error('Authentication required')
      }
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .or(`title_ar.ilike.%${searchTerm}%,title_en.ilike.%${searchTerm}%,course_id.ilike.%${searchTerm}%,instructor.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error searching courses:', error)
        throw error
      }

      console.log('✅ Courses search completed:', data)
      return data || []
    },
    enabled: !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}