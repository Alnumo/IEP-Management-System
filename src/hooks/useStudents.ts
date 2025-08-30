import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Student, CreateStudentData, UpdateStudentData } from '@/types/student'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { createEntityWebhook, createFormSubmissionWebhook } from '@/services/webhooks'
import { initializeN8nWebhooks } from '@/services/n8n-webhook-config'

// Initialize n8n webhook configuration on module load
initializeN8nWebhooks()

// Fetch all students with enhanced error handling
export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: async (): Promise<Student[]> => {
      return retryApiCall(async () => {
        console.log('🔍 Fetching students...')
        
        // Use centralized auth checking
        const user = await requireAuth()
        
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Error fetching students:', error)
          errorMonitoring.reportError(error, {
            component: 'useStudents',
            action: 'fetch_students',
            userId: user.id
          })
          throw error
        }

        console.log('✅ Students fetched successfully:', data?.length, 'records')
        return data || []
      }, {
        context: 'Fetching students',
        maxAttempts: 3,
        logErrors: true
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch single student by ID
export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['students', id],
    queryFn: async (): Promise<Student> => {
      console.log('🔍 Fetching student:', id)
      
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
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching student:', error)
        throw error
      }

      console.log('✅ Student fetched successfully:', data)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Create new student
export const useCreateStudent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateStudentData): Promise<Student> => {
      console.log('🔍 Creating student with:', data)
      
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

      // Filter data to only include fields that exist in the students table
      const validStudentFields = [
        'first_name_ar', 'last_name_ar', 'first_name_en', 'last_name_en',
        'date_of_birth', 'gender', 'nationality_ar', 'nationality_en', 'national_id',
        'phone', 'email', 'address_ar', 'address_en', 'city_ar', 'city_en', 'postal_code',
        'diagnosis_ar', 'diagnosis_en', 'severity_level', 'allergies_ar', 'allergies_en',
        'medications_ar', 'medications_en', 'special_needs_ar', 'special_needs_en',
        'school_name_ar', 'school_name_en', 'grade_level', 'educational_support_ar', 'educational_support_en',
        'referral_source_ar', 'referral_source_en', 'therapy_goals_ar', 'therapy_goals_en',
        'status', 'enrollment_date', 'last_assessment_date', 'next_review_date',
        'profile_photo_url'
      ]
      
      const filteredData: any = {}
      validStudentFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field) && data[field as keyof CreateStudentData] !== undefined) {
          filteredData[field] = data[field as keyof CreateStudentData]
        }
      })

      const studentData = {
        ...filteredData,
        created_by: user?.id,
        updated_by: user?.id,
      }

      console.log('📝 Filtered data being sent to database:', studentData)
      console.log('🔍 Field count:', Object.keys(studentData).length)

      const { data: newStudent, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating student:', error)
        throw error
      }

      console.log('✅ Student created successfully:', newStudent)
      return newStudent
    },
    onSuccess: async (data, variables) => {
      // Trigger n8n webhook for student creation
      try {
        // Trigger webhook for student creation
        await createEntityWebhook('student', 'created', data, {
          student_id: data.id,
          registration_number: data.registration_number,
          workflow: 'student-creation',
          source: 'student-form'
        })

        // Also trigger form submission webhook
        await createFormSubmissionWebhook('student', variables, 'create', {
          student_id: data.id,
          workflow: 'student-creation',
          n8n_webhook: 'student-creation'
        })

        console.log('✅ Student creation webhooks triggered successfully')
        
      } catch (error) {
        console.error('❌ Failed to trigger student creation webhooks:', error)
        // Don't throw - webhook failure shouldn't break the student creation process
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Update student
export const useUpdateStudent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStudentData }): Promise<Student> => {
      console.log('🔍 Updating student:', id, 'with:', data)
      
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

      const { ...updateFields } = data
      const updateData = {
        ...updateFields,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating student:', error)
        throw error
      }

      console.log('✅ Student updated successfully:', updatedStudent)
      return updatedStudent
    },
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['students', updatedStudent.id] })
    },
  })
}

// Delete student
export const useDeleteStudent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('🔍 Deleting student:', id)
      
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

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting student:', error)
        throw error
      }

      console.log('✅ Student deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Search students
export const useSearchStudents = (searchTerm: string) => {
  return useQuery({
    queryKey: ['students', 'search', searchTerm],
    queryFn: async (): Promise<Student[]> => {
      if (!searchTerm.trim()) {
        return []
      }

      console.log('🔍 Searching students with term:', searchTerm)
      
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
        .from('students')
        .select('*')
        .or(`first_name_ar.ilike.%${searchTerm}%,last_name_ar.ilike.%${searchTerm}%,first_name_en.ilike.%${searchTerm}%,last_name_en.ilike.%${searchTerm}%,registration_number.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error searching students:', error)
        throw error
      }

      console.log('✅ Students search completed:', data)
      return data || []
    },
    enabled: !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}