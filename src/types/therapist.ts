// Therapist Management Types
// Renamed from instructor.ts to reflect therapy specialist terminology

export interface Therapist {
  id: string
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  email?: string
  phone?: string
  address?: string
  specialization_ar?: string
  specialization_en?: string
  qualifications: string[]
  experience_years: number
  hourly_rate?: number
  employment_type: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  hire_date: string
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  user_id?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateTherapistData {
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  email?: string
  phone?: string
  address?: string
  specialization_ar?: string
  specialization_en?: string
  qualifications: string[]
  experience_years?: number
  hourly_rate?: number
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  hire_date?: string
}

export interface UpdateTherapistData extends Partial<CreateTherapistData> {
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
}

export interface TherapistFilters {
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  specialization?: string
  experience_min?: number
  experience_max?: number
  search?: string
}

export interface TherapistStats {
  total: number
  active: number
  inactive: number
  on_leave: number
  terminated: number
  full_time: number
  part_time: number
  contract: number
  volunteer: number
  average_experience: number
  total_courses_assigned: number
  specializations: {
    [key: string]: number
  }
}

// Course Assignment Types for Therapists
export interface CourseAssignment {
  id: string
  therapist_id: string
  course_id: string
  assignment_date: string
  assignment_type: 'primary' | 'assistant' | 'substitute'
  status: 'active' | 'completed' | 'cancelled'
  hourly_rate?: number
  total_hours?: number
  total_payment?: number
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Joined data
  therapist?: Therapist
  course?: {
    id: string
    course_code: string
    name_ar: string
    name_en?: string
    start_date: string
    end_date: string
    status: string
  }
}

export interface CreateCourseAssignmentData {
  therapist_id: string
  course_id: string
  assignment_date?: string
  assignment_type?: 'primary' | 'assistant' | 'substitute'
  hourly_rate?: number
  notes?: string
}

export interface UpdateCourseAssignmentData extends Partial<CreateCourseAssignmentData> {
  status?: 'active' | 'completed' | 'cancelled'
  total_hours?: number
  total_payment?: number
}

// Therapist Performance and Analytics
export interface TherapistPerformance {
  therapist_id: string
  total_courses: number
  total_students: number
  total_sessions: number
  completed_courses: number
  active_courses: number
  average_rating?: number
  total_earnings: number
  hours_worked: number
  completion_rate: number
  student_satisfaction_rate?: number
}

// Specialization Categories for Therapy
export const THERAPY_SPECIALIZATIONS = [
  {
    value: 'speech_therapy',
    label_ar: 'العلاج النطقي',
    label_en: 'Speech Therapy'
  },
  {
    value: 'occupational_therapy',
    label_ar: 'العلاج الوظيفي',
    label_en: 'Occupational Therapy'
  },
  {
    value: 'physical_therapy',
    label_ar: 'العلاج الطبيعي',
    label_en: 'Physical Therapy'
  },
  {
    value: 'behavioral_therapy',
    label_ar: 'العلاج السلوكي',
    label_en: 'Behavioral Therapy'
  },
  {
    value: 'developmental_therapy',
    label_ar: 'العلاج التطويري',
    label_en: 'Developmental Therapy'
  },
  {
    value: 'sensory_integration',
    label_ar: 'التكامل الحسي',
    label_en: 'Sensory Integration'
  },
  {
    value: 'art_therapy',
    label_ar: 'العلاج بالفن',
    label_en: 'Art Therapy'
  },
  {
    value: 'music_therapy',
    label_ar: 'العلاج بالموسيقى',
    label_en: 'Music Therapy'
  },
  {
    value: 'play_therapy',
    label_ar: 'العلاج باللعب',
    label_en: 'Play Therapy'
  },
  {
    value: 'cognitive_therapy',
    label_ar: 'العلاج المعرفي',
    label_en: 'Cognitive Therapy'
  }
] as const

export type TherapySpecialization = typeof THERAPY_SPECIALIZATIONS[number]['value']