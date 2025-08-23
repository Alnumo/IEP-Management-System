import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  TherapyProgram, 
  ProgramEnrollment,
  AssessmentTool,
  ABADataCollection,
  SpeechTherapyData,
  OccupationalTherapyData,
  CreateTherapyProgramData,
  UpdateTherapyProgramData,
  CreateProgramEnrollmentData,
  TherapyProgramFilters,
  ProgramEnrollmentFilters,
  AssessmentToolFilters
} from '@/types/therapy-programs'

// Therapy Programs Hooks
export const useTherapyPrograms = (filters?: TherapyProgramFilters) => {
  return useQuery({
    queryKey: ['therapy-programs', filters],
    queryFn: async (): Promise<TherapyProgram[]> => {
      let query = supabase
        .from('therapy_programs')
        .select('*')
        .order('name_ar', { ascending: true })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.intensity_level) {
        query = query.eq('intensity_level', filters.intensity_level)
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.is_available_for_new_patients !== undefined) {
        query = query.eq('is_available_for_new_patients', filters.is_available_for_new_patients)
      }
      if (filters?.age_range) {
        if (filters.age_range.min) {
          query = query.gte('minimum_age_months', filters.age_range.min)
        }
        if (filters.age_range.max) {
          query = query.lte('maximum_age_months', filters.age_range.max)
        }
      }
      if (filters?.requires_medical_clearance !== undefined) {
        query = query.eq('requires_medical_clearance', filters.requires_medical_clearance)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching therapy programs:', error)
        throw error
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useTherapyProgram = (id: string) => {
  return useQuery({
    queryKey: ['therapy-programs', id],
    queryFn: async (): Promise<TherapyProgram> => {
      const { data, error } = await supabase
        .from('therapy_programs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching therapy program:', error)
        throw error
      }

      return data
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

export const useCreateTherapyProgram = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTherapyProgramData): Promise<TherapyProgram> => {
      const { data: newProgram, error } = await supabase
        .from('therapy_programs')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating therapy program:', error)
        throw error
      }

      return newProgram
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy-programs'] })
    },
  })
}

export const useUpdateTherapyProgram = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTherapyProgramData }): Promise<TherapyProgram> => {
      const { ...updateFields } = data
      const updateData = {
        ...updateFields,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedProgram, error } = await supabase
        .from('therapy_programs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating therapy program:', error)
        throw error
      }

      return updatedProgram
    },
    onSuccess: (updatedProgram) => {
      queryClient.invalidateQueries({ queryKey: ['therapy-programs'] })
      queryClient.invalidateQueries({ queryKey: ['therapy-programs', updatedProgram.id] })
    },
  })
}

// Program Enrollments Hooks
export const useProgramEnrollments = (filters?: ProgramEnrollmentFilters) => {
  return useQuery({
    queryKey: ['program-enrollments', filters],
    queryFn: async (): Promise<ProgramEnrollment[]> => {
      let query = supabase
        .from('program_enrollments')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          therapy_programs(name_ar, name_en, program_code),
          therapists:primary_therapist_id(first_name_ar, last_name_ar)
        `)
        .order('enrollment_date', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.therapy_program_id) {
        query = query.eq('therapy_program_id', filters.therapy_program_id)
      }
      if (filters?.enrollment_status) {
        query = query.eq('enrollment_status', filters.enrollment_status)
      }
      if (filters?.primary_therapist_id) {
        query = query.eq('primary_therapist_id', filters.primary_therapist_id)
      }
      if (filters?.date_from) {
        query = query.gte('enrollment_date', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('enrollment_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching program enrollments:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateProgramEnrollment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProgramEnrollmentData): Promise<ProgramEnrollment> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const enrollmentData = {
        ...data,
        created_by: user?.id,
      }

      const { data: newEnrollment, error } = await supabase
        .from('program_enrollments')
        .insert([enrollmentData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating program enrollment:', error)
        throw error
      }

      return newEnrollment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-enrollments'] })
    },
  })
}

// Assessment Tools Hooks
export const useAssessmentTools = (filters?: AssessmentToolFilters) => {
  return useQuery({
    queryKey: ['assessment-tools', filters],
    queryFn: async (): Promise<AssessmentTool[]> => {
      let query = supabase
        .from('assessment_tools')
        .select('*')
        .order('name_ar', { ascending: true })

      if (filters?.assessment_type) {
        query = query.eq('assessment_type', filters.assessment_type)
      }
      if (filters?.domain) {
        query = query.eq('domain', filters.domain)
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.is_approved_for_use !== undefined) {
        query = query.eq('is_approved_for_use', filters.is_approved_for_use)
      }
      if (filters?.age_range) {
        if (filters.age_range.min) {
          query = query.gte('minimum_age_months', filters.age_range.min)
        }
        if (filters.age_range.max) {
          query = query.lte('maximum_age_months', filters.age_range.max)
        }
      }
      if (filters?.requires_training !== undefined) {
        query = query.eq('requires_training', filters.requires_training)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching assessment tools:', error)
        throw error
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ABA Data Collection Hooks
export const useABADataCollection = (studentId?: string, dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: ['aba-data-collection', studentId, dateFrom, dateTo],
    queryFn: async (): Promise<ABADataCollection[]> => {
      let query = supabase
        .from('aba_data_collection')
        .select('*')
        .order('observation_date', { ascending: false })

      if (studentId) {
        query = query.eq('student_id', studentId)
      }
      if (dateFrom) {
        query = query.gte('observation_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('observation_date', dateTo)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching ABA data collection:', error)
        throw error
      }

      return data || []
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateABADataCollection = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any): Promise<ABADataCollection> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const abaData = {
        ...data,
        observer_id: user?.id,
      }

      const { data: newRecord, error } = await supabase
        .from('aba_data_collection')
        .insert([abaData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating ABA data collection:', error)
        throw error
      }

      return newRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aba-data-collection'] })
    },
  })
}

// Speech Therapy Data Hooks
export const useSpeechTherapyData = (studentId?: string, dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: ['speech-therapy-data', studentId, dateFrom, dateTo],
    queryFn: async (): Promise<SpeechTherapyData[]> => {
      let query = supabase
        .from('speech_therapy_data')
        .select('*')
        .order('session_date', { ascending: false })

      if (studentId) {
        query = query.eq('student_id', studentId)
      }
      if (dateFrom) {
        query = query.gte('session_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('session_date', dateTo)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching speech therapy data:', error)
        throw error
      }

      return data || []
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  })
}

// Occupational Therapy Data Hooks
export const useOccupationalTherapyData = (studentId?: string, dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: ['occupational-therapy-data', studentId, dateFrom, dateTo],
    queryFn: async (): Promise<OccupationalTherapyData[]> => {
      let query = supabase
        .from('occupational_therapy_data')
        .select('*')
        .order('session_date', { ascending: false })

      if (studentId) {
        query = query.eq('student_id', studentId)
      }
      if (dateFrom) {
        query = query.gte('session_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('session_date', dateTo)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching occupational therapy data:', error)
        throw error
      }

      return data || []
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  })
}