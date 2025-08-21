export interface Instructor {
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

export interface CreateInstructorData {
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  email?: string
  phone?: string
  address?: string
  specialization_ar?: string
  specialization_en?: string
  qualifications?: string[]
  experience_years?: number
  hourly_rate?: number
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  hire_date?: string
}

export interface UpdateInstructorData extends Partial<CreateInstructorData> {
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
}

export interface InstructorFilters {
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  search?: string
  specialization?: string
}

export interface InstructorStats {
  total_instructors: number
  active_instructors: number
  inactive_instructors: number
  on_leave_instructors: number
  full_time_instructors: number
  part_time_instructors: number
  average_experience: number
  average_hourly_rate: number
}

export interface InstructorSortOptions {
  field: 'first_name_ar' | 'last_name_ar' | 'hire_date' | 'experience_years' | 'status'
  direction: 'asc' | 'desc'
}

// Course assignment types
export interface CourseAssignment {
  id: string
  instructor_id: string
  course_id: string
  assigned_date: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  instructor?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    email?: string
    phone?: string
    specialization_ar?: string
    specialization_en?: string
  }
  course?: {
    id: string
    name_ar: string
    name_en?: string
    course_code: string
    start_date: string
    end_date: string
  }
}

export interface CreateCourseAssignmentData {
  instructor_id: string
  course_id: string
  assigned_date?: string
}

export interface UpdateCourseAssignmentData extends Partial<CreateCourseAssignmentData> {
  status?: 'active' | 'completed' | 'cancelled'
}