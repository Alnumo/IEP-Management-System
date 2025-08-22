import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  SOAPTemplate,
  AssessmentResult,
  ProgressTracking,
  TherapeuticGoal,
  DevelopmentalMilestone,
  StudentMilestoneProgress,
  RegressionMonitoring,
  CreateAssessmentResultData,
  UpdateAssessmentResultData,
  CreateTherapeuticGoalData,
  UpdateTherapeuticGoalData,
  CreateProgressTrackingData,
  AssessmentResultFilters,
  TherapeuticGoalFilters,
  ProgressTrackingFilters,
  MilestoneProgressFilters,
  RegressionMonitoringFilters
} from '@/types/assessment'

// SOAP Templates Hooks
export const useSOAPTemplates = (therapyProgramId?: string) => {
  return useQuery({
    queryKey: ['soap-templates', therapyProgramId],
    queryFn: async (): Promise<SOAPTemplate[]> => {
      let query = supabase
        .from('soap_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name_ar', { ascending: true })

      if (therapyProgramId) {
        query = query.eq('therapy_program_id', therapyProgramId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching SOAP templates:', error)
        throw error
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Assessment Results Hooks
export const useAssessmentResults = (filters?: AssessmentResultFilters) => {
  return useQuery({
    queryKey: ['assessment-results', filters],
    queryFn: async (): Promise<AssessmentResult[]> => {
      let query = supabase
        .from('assessment_results')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          assessment_tools(name_ar, name_en, tool_code)
        `)
        .order('assessment_date', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.assessment_tool_id) {
        query = query.eq('assessment_tool_id', filters.assessment_tool_id)
      }
      if (filters?.assessment_purpose) {
        query = query.eq('assessment_purpose', filters.assessment_purpose)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.assessor_id) {
        query = query.eq('assessor_id', filters.assessor_id)
      }
      if (filters?.date_from) {
        query = query.gte('assessment_date', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('assessment_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching assessment results:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useAssessmentResult = (id: string) => {
  return useQuery({
    queryKey: ['assessment-results', id],
    queryFn: async (): Promise<AssessmentResult> => {
      const { data, error } = await supabase
        .from('assessment_results')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          assessment_tools(name_ar, name_en, tool_code)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error fetching assessment result:', error)
        throw error
      }

      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateAssessmentResult = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAssessmentResultData): Promise<AssessmentResult> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const assessmentData = {
        ...data,
        assessor_id: data.assessor_id || user?.id,
      }

      const { data: newResult, error } = await supabase
        .from('assessment_results')
        .insert([assessmentData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating assessment result:', error)
        throw error
      }

      return newResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-results'] })
    },
  })
}

export const useUpdateAssessmentResult = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssessmentResultData }): Promise<AssessmentResult> => {
      const { id: dataId, ...updateFields } = data
      const updateData = {
        ...updateFields,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedResult, error } = await supabase
        .from('assessment_results')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating assessment result:', error)
        throw error
      }

      return updatedResult
    },
    onSuccess: (updatedResult) => {
      queryClient.invalidateQueries({ queryKey: ['assessment-results'] })
      queryClient.invalidateQueries({ queryKey: ['assessment-results', updatedResult.id] })
    },
  })
}

// Therapeutic Goals Hooks
export const useTherapeuticGoals = (filters?: TherapeuticGoalFilters) => {
  return useQuery({
    queryKey: ['therapeutic-goals', filters],
    queryFn: async (): Promise<TherapeuticGoal[]> => {
      let query = supabase
        .from('therapeutic_goals')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          therapy_programs(name_ar, name_en, program_code)
        `)
        .order('goal_number', { ascending: true })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.therapy_program_id) {
        query = query.eq('therapy_program_id', filters.therapy_program_id)
      }
      if (filters?.goal_category) {
        query = query.eq('goal_category', filters.goal_category)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.primary_therapist_id) {
        query = query.eq('primary_therapist_id', filters.primary_therapist_id)
      }
      if (filters?.deadline_from) {
        query = query.gte('time_bound_deadline', filters.deadline_from)
      }
      if (filters?.deadline_to) {
        query = query.lte('time_bound_deadline', filters.deadline_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching therapeutic goals:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateTherapeuticGoal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTherapeuticGoalData): Promise<TherapeuticGoal> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const goalData = {
        ...data,
        created_by: user?.id,
        date_initiated: new Date().toISOString().split('T')[0],
      }

      const { data: newGoal, error } = await supabase
        .from('therapeutic_goals')
        .insert([goalData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating therapeutic goal:', error)
        throw error
      }

      return newGoal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapeutic-goals'] })
    },
  })
}

export const useUpdateTherapeuticGoal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTherapeuticGoalData }): Promise<TherapeuticGoal> => {
      const { id: dataId, ...updateFields } = data
      const updateData = {
        ...updateFields,
        updated_at: new Date().toISOString(),
      }

      // If goal is being marked as achieved, set achievement date
      if (updateFields.status === 'achieved' && !updateFields.date_achieved) {
        updateData.date_achieved = new Date().toISOString().split('T')[0]
      }

      const { data: updatedGoal, error } = await supabase
        .from('therapeutic_goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating therapeutic goal:', error)
        throw error
      }

      return updatedGoal
    },
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: ['therapeutic-goals'] })
      queryClient.invalidateQueries({ queryKey: ['therapeutic-goals', updatedGoal.id] })
    },
  })
}

// Progress Tracking Hooks
export const useProgressTracking = (filters?: ProgressTrackingFilters) => {
  return useQuery({
    queryKey: ['progress-tracking', filters],
    queryFn: async (): Promise<ProgressTracking[]> => {
      let query = supabase
        .from('progress_tracking')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          therapy_programs(name_ar, name_en, program_code)
        `)
        .order('tracking_period_start', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.therapy_program_id) {
        query = query.eq('therapy_program_id', filters.therapy_program_id)
      }
      if (filters?.tracking_period_from) {
        query = query.gte('tracking_period_start', filters.tracking_period_from)
      }
      if (filters?.tracking_period_to) {
        query = query.lte('tracking_period_end', filters.tracking_period_to)
      }
      if (filters?.trend_direction) {
        query = query.eq('trend_direction', filters.trend_direction)
      }
      if (filters?.regression_alerts !== undefined) {
        query = query.eq('regression_alerts', filters.regression_alerts)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching progress tracking:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateProgressTracking = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProgressTrackingData): Promise<ProgressTracking> => {
      const { data: { user } } = await supabase.auth.getUser()
      
      const progressData = {
        ...data,
        created_by: user?.id,
      }

      const { data: newProgress, error } = await supabase
        .from('progress_tracking')
        .insert([progressData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating progress tracking:', error)
        throw error
      }

      return newProgress
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-tracking'] })
    },
  })
}

// Developmental Milestones Hooks
export const useDevelopmentalMilestones = (domain?: string, ageRange?: { min: number; max: number }) => {
  return useQuery({
    queryKey: ['developmental-milestones', domain, ageRange],
    queryFn: async (): Promise<DevelopmentalMilestone[]> => {
      let query = supabase
        .from('developmental_milestones')
        .select('*')
        .eq('is_active', true)
        .order('typical_age_months_min', { ascending: true })

      if (domain) {
        query = query.eq('developmental_domain', domain)
      }
      if (ageRange?.min) {
        query = query.gte('typical_age_months_min', ageRange.min)
      }
      if (ageRange?.max) {
        query = query.lte('typical_age_months_max', ageRange.max)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching developmental milestones:', error)
        throw error
      }

      return data || []
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - milestones don't change often
  })
}

// Student Milestone Progress Hooks
export const useStudentMilestoneProgress = (filters?: MilestoneProgressFilters) => {
  return useQuery({
    queryKey: ['student-milestone-progress', filters],
    queryFn: async (): Promise<StudentMilestoneProgress[]> => {
      let query = supabase
        .from('student_milestone_progress')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          developmental_milestones(milestone_name_ar, milestone_name_en, developmental_domain)
        `)
        .order('created_at', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.milestone_id) {
        query = query.eq('milestone_id', filters.milestone_id)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.developmental_domain) {
        query = query.eq('developmental_milestones.developmental_domain', filters.developmental_domain)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching student milestone progress:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Regression Monitoring Hooks
export const useRegressionMonitoring = (filters?: RegressionMonitoringFilters) => {
  return useQuery({
    queryKey: ['regression-monitoring', filters],
    queryFn: async (): Promise<RegressionMonitoring[]> => {
      let query = supabase
        .from('regression_monitoring')
        .select(`
          *,
          students(first_name_ar, last_name_ar, first_name_en, last_name_en)
        `)
        .order('detection_date', { ascending: false })

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.severity_level) {
        query = query.eq('severity_level', filters.severity_level)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.detection_date_from) {
        query = query.gte('detection_date', filters.detection_date_from)
      }
      if (filters?.detection_date_to) {
        query = query.lte('detection_date', filters.detection_date_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching regression monitoring:', error)
        throw error
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}