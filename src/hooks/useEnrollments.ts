import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CourseEnrollment } from '@/types/course'

export interface CreateEnrollmentData {
  student_id: string
  course_id: string
  enrollment_date?: string
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded'
  amount_paid?: number
  notes?: string
}

export interface UpdateEnrollmentData extends Partial<CreateEnrollmentData> {
  status?: 'enrolled' | 'completed' | 'dropped' | 'pending'
  grade?: string
  completion_date?: string
}

export interface EnrollmentFilters {
  student_id?: string
  course_id?: string
  status?: 'enrolled' | 'completed' | 'dropped' | 'pending'
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded'
  enrollment_date_from?: string
  enrollment_date_to?: string
  search?: string
}

// Get enrollments with optional filters
export const useEnrollments = (filters?: EnrollmentFilters) => {
  return useQuery({
    queryKey: ['enrollments', filters],
    queryFn: async () => {
      let query = supabase
        .from('course_enrollments')
        .select(`
          *,
          student:students(
            id,
            student_code,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            phone,
            email
          ),
          course:courses(
            id,
            course_code,
            name_ar,
            name_en,
            start_date,
            end_date,
            price,
            max_students
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      
      if (filters?.course_id) {
        query = query.eq('course_id', filters.course_id)
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status)
      }
      
      if (filters?.enrollment_date_from) {
        query = query.gte('enrollment_date', filters.enrollment_date_from)
      }
      
      if (filters?.enrollment_date_to) {
        query = query.lte('enrollment_date', filters.enrollment_date_to)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch enrollments: ${error.message}`)
      }

      return data as CourseEnrollment[]
    },
  })
}

// Get single enrollment by ID
export const useEnrollment = (id: string) => {
  return useQuery({
    queryKey: ['enrollment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          student:students(
            id,
            student_code,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            phone,
            email,
            date_of_birth,
            address_city,
            guardian_name
          ),
          course:courses(
            id,
            course_code,
            name_ar,
            name_en,
            description_ar,
            description_en,
            start_date,
            end_date,
            schedule_days,
            schedule_time,
            price,
            max_students,
            enrolled_students,
            instructor_name,
            location
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch enrollment: ${error.message}`)
      }

      return data as CourseEnrollment
    },
    enabled: !!id,
  })
}

// Get enrollments for a specific student
export const useStudentEnrollments = (studentId: string) => {
  return useEnrollments({ student_id: studentId })
}

// Get enrollments for a specific course
export const useCourseEnrollments = (courseId: string) => {
  return useEnrollments({ course_id: courseId })
}

// Create enrollment
export const useCreateEnrollment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enrollmentData: CreateEnrollmentData) => {
      // Check if student is already enrolled in this course
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', enrollmentData.student_id)
        .eq('course_id', enrollmentData.course_id)
        .single()

      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this course')
      }

      // Check course capacity
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('max_students, enrolled_students')
        .eq('id', enrollmentData.course_id)
        .single()

      if (courseError) {
        throw new Error(`Failed to check course capacity: ${courseError.message}`)
      }

      if (course.enrolled_students >= course.max_students) {
        throw new Error('Course is at maximum capacity')
      }

      const { data, error } = await supabase
        .from('course_enrollments')
        .insert([enrollmentData])
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create enrollment: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Update enrollment
export const useUpdateEnrollment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateEnrollmentData & { id: string }) => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update enrollment: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Delete enrollment
export const useDeleteEnrollment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete enrollment: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Enrollment statistics
export const useEnrollmentStats = () => {
  return useQuery({
    queryKey: ['enrollment-stats'],
    queryFn: async () => {
      // Get basic counts
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('status, payment_status, amount_paid')

      if (error) {
        throw new Error(`Failed to fetch enrollment stats: ${error.message}`)
      }

      const total = enrollments.length
      const enrolled = enrollments.filter(e => e.status === 'enrolled').length
      const completed = enrollments.filter(e => e.status === 'completed').length
      const dropped = enrollments.filter(e => e.status === 'dropped').length
      const pending = enrollments.filter(e => e.status === 'pending').length

      const paidFull = enrollments.filter(e => e.payment_status === 'paid').length
      const partial = enrollments.filter(e => e.payment_status === 'partial').length
      const pendingPayment = enrollments.filter(e => e.payment_status === 'pending').length
      const refunded = enrollments.filter(e => e.payment_status === 'refunded').length

      const totalRevenue = enrollments
        .filter(e => e.payment_status !== 'refunded')
        .reduce((sum, e) => sum + (e.amount_paid || 0), 0)

      const completionRate = total > 0 ? (completed / total) * 100 : 0
      const paymentCompletionRate = total > 0 ? (paidFull / total) * 100 : 0

      return {
        total,
        enrolled,
        completed,
        dropped,
        pending,
        paidFull,
        partial,
        pendingPayment,
        refunded,
        totalRevenue,
        completionRate,
        paymentCompletionRate
      }
    },
  })
}

// Bulk enrollment operations
export const useBulkEnrollment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enrollments: CreateEnrollmentData[]) => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert(enrollments)
        .select('*')

      if (error) {
        throw new Error(`Failed to create bulk enrollments: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}