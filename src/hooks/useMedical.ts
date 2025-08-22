import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  MedicalRecord, 
  MedicalConsultant, 
  ClinicalDocumentation,
  CreateMedicalRecordData,
  UpdateMedicalRecordData,
  CreateMedicalConsultantData,
  MedicalRecordFilters,
  MedicalConsultantFilters,
  ClinicalDocumentationFilters
} from '@/types/medical'

// Medical Records Hooks
export const useMedicalRecords = (filters?: MedicalRecordFilters) => {
  return useQuery({
    queryKey: ['medical-records', filters],
    queryFn: async (): Promise<MedicalRecord[]> => {
      let query = supabase
        .from('medical_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.data_classification) {
        query = query.eq('data_classification', filters.data_classification)
      }
      if (filters?.has_allergies) {
        query = query.not('allergies', 'is', null)
      }
      if (filters?.has_medications) {
        query = query.not('current_medications', 'eq', '{}')
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching medical records:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useMedicalRecord = (id: string) => {
  return useQuery({
    queryKey: ['medical-records', id],
    queryFn: async (): Promise<MedicalRecord> => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching medical record:', error)
        throw error
      }

      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMedicalRecordData): Promise<MedicalRecord> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const recordData = {
        ...data,
        created_by: user?.id,
        updated_by: user?.id,
      }

      const { data: newRecord, error } = await supabase
        .from('medical_records')
        .insert([recordData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating medical record:', error)
        throw error
      }

      return newRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
    },
  })
}

export const useUpdateMedicalRecord = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMedicalRecordData }): Promise<MedicalRecord> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { id: dataId, ...updateFields } = data
      const updateData = {
        ...updateFields,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedRecord, error } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating medical record:', error)
        throw error
      }

      return updatedRecord
    },
    onSuccess: (updatedRecord) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      queryClient.invalidateQueries({ queryKey: ['medical-records', updatedRecord.id] })
    },
  })
}

// Medical Consultants Hooks
export const useMedicalConsultants = (filters?: MedicalConsultantFilters) => {
  return useQuery({
    queryKey: ['medical-consultants', filters],
    queryFn: async (): Promise<MedicalConsultant[]> => {
      let query = supabase
        .from('medical_consultants')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.supervision_level) {
        query = query.eq('supervision_level', filters.supervision_level)
      }
      if (filters?.specialization) {
        query = query.ilike('primary_specialization_ar', `%${filters.specialization}%`)
      }
      if (filters?.contract_type) {
        query = query.eq('contract_type', filters.contract_type)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching medical consultants:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateMedicalConsultant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMedicalConsultantData): Promise<MedicalConsultant> => {
      const { data: newConsultant, error } = await supabase
        .from('medical_consultants')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating medical consultant:', error)
        throw error
      }

      return newConsultant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-consultants'] })
    },
  })
}

// Clinical Documentation Hooks
export const useClinicalDocumentation = (filters?: ClinicalDocumentationFilters) => {
  return useQuery({
    queryKey: ['clinical-documentation', filters],
    queryFn: async (): Promise<ClinicalDocumentation[]> => {
      let query = supabase
        .from('clinical_documentation')
        .select('*')
        .order('session_date', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.documentation_type) {
        query = query.eq('documentation_type', filters.documentation_type)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.urgency_level) {
        query = query.eq('urgency_level', filters.urgency_level)
      }
      if (filters?.date_from) {
        query = query.gte('session_date', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('session_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching clinical documentation:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateClinicalDocumentation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any): Promise<ClinicalDocumentation> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const docData = {
        ...data,
        created_by: user?.id,
      }

      const { data: newDoc, error } = await supabase
        .from('clinical_documentation')
        .insert([docData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating clinical documentation:', error)
        throw error
      }

      return newDoc
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-documentation'] })
    },
  })
}