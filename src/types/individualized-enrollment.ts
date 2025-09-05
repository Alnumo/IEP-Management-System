// Story 6.1: TypeScript interfaces for individualized enrollment

export interface CustomSchedule {
  sessions_per_week: number
  preferred_days: string[]
  preferred_times: string[]
  session_duration_minutes: number
  break_preferences?: {
    between_sessions: number
    seasonal_breaks?: Array<{
      start_date: string
      end_date: string
      reason: string
    }>
  }
}

export interface ProgramModification {
  field: string
  original_value: any
  modified_value: any
  reason: string
  modified_at: string
  modified_by: string
}

export interface ChangeLogEntry {
  timestamp: string
  user_id: string
  changes: {
    custom_schedule?: CustomSchedule
    assigned_therapist_id?: string
    enrollment_status?: string
    [key: string]: any
  }
}

export interface ProgramModifications {
  modifications: ProgramModification[]
  change_log: ChangeLogEntry[]
  notes?: string
}

export interface IndividualizedEnrollment {
  id: string
  student_id: string
  therapy_plan_id: string
  individual_start_date: string
  individual_end_date: string
  custom_schedule: CustomSchedule
  assigned_therapist_id: string
  program_modifications: ProgramModifications
  enrollment_status: 'active' | 'paused' | 'completed' | 'cancelled'
  freeze_days_allowed: number
  freeze_days_used: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface EnrollmentFormData {
  student_id: string
  program_template_id: string
  individual_start_date: string
  individual_end_date: string
  assigned_therapist_id: string
  custom_schedule: Partial<CustomSchedule>
  modifications?: Partial<ProgramModifications>
  notes?: string
}

export interface BulkEnrollmentData {
  program_template_id: string
  enrollments: Array<{
    student_id: string
    individual_start_date: string
    individual_end_date: string
    assigned_therapist_id: string
    custom_schedule?: Partial<CustomSchedule>
  }>
  shared_modifications?: Partial<ProgramModifications>
}

export interface EnrollmentAnalytics {
  student_id: string
  program_type: string
  enrollment_duration_weeks: number
  completion_percentage: number
  goals_achieved: number
  total_goals: number
  attendance_rate: number
  therapist_assignments: Array<{
    therapist_id: string
    therapist_name: string
    start_date: string
    end_date?: string
  }>
  modifications_count: number
  last_modified: string
}

export interface ComparativeAnalytics {
  program_type: string
  total_enrollments: number
  active_enrollments: number
  completed_enrollments: number
  average_completion_rate: number
  average_duration_weeks: number
  top_goals_achieved: Array<{
    goal: string
    achievement_rate: number
  }>
  therapist_performance: Array<{
    therapist_id: string
    therapist_name: string
    enrolled_students: number
    average_completion_rate: number
  }>
}