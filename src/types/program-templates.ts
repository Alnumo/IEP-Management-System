// Story 6.1: TypeScript interfaces for program templates

export interface ProgramGoal {
  goal_ar: string
  goal_en: string
  priority: 'low' | 'medium' | 'high'
  category?: string
  measurable_outcome?: string
}

export interface CustomizationOptions {
  schedule_flexibility: boolean
  therapist_rotation: boolean
  intensity_levels: Array<'low' | 'medium' | 'high'>
  assessment_frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly'
  goal_customization: boolean
  duration_flexibility: boolean
  session_count_flexibility: boolean
}

export interface ProgramTemplate {
  id: string
  program_type: string
  program_name_ar: string
  program_name_en: string
  description_ar?: string
  description_en?: string
  base_duration_weeks: number
  base_sessions_per_week: number
  default_goals: ProgramGoal[]
  customization_options: CustomizationOptions
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  metadata: Record<string, any>
}

export interface ProgramTemplateFormData {
  program_type: string
  program_name_ar: string
  program_name_en: string
  description_ar?: string
  description_en?: string
  base_duration_weeks: number
  base_sessions_per_week: number
  default_goals: ProgramGoal[]
  customization_options: CustomizationOptions
  is_active?: boolean
}

export interface ProgramTemplateSelector {
  id: string
  program_type: string
  program_name_ar: string
  program_name_en: string
  base_duration_weeks: number
  base_sessions_per_week: number
  customization_options: CustomizationOptions
  is_recommended?: boolean
  compatibility_score?: number
}

export interface TemplateCustomization {
  template_id: string
  duration_weeks: number
  sessions_per_week: number
  selected_goals: ProgramGoal[]
  additional_goals: ProgramGoal[]
  intensity_level: 'low' | 'medium' | 'high'
  assessment_frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly'
  special_requirements?: string[]
  notes?: string
}

export interface TemplateStatistics {
  template_id: string
  program_type: string
  total_enrollments: number
  active_enrollments: number
  completion_rate: number
  average_duration_weeks: number
  most_customized_aspects: Array<{
    aspect: string
    customization_frequency: number
  }>
  goal_achievement_rates: Array<{
    goal_ar: string
    goal_en: string
    achievement_rate: number
  }>
}

export interface TemplateComparisonData {
  templates: ProgramTemplate[]
  enrollments_by_template: Record<string, number>
  success_rates: Record<string, number>
  customization_patterns: Record<string, {
    aspect: string
    frequency: number
    common_values: any[]
  }>
}