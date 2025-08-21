export interface Course {
  id: string
  course_code: string // Auto-generated: CRS-2025-001
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  instructor_id?: string
  instructor_name?: string
  start_date: string
  end_date: string
  schedule_days: string[] // ['monday', 'wednesday', 'friday']
  schedule_time: string // '10:00-12:00'
  max_students: number
  enrolled_students: number
  price: number
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  location?: string
  requirements?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateCourseData {
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  instructor_name?: string
  start_date: string
  end_date: string
  schedule_days: string[]
  schedule_time: string
  max_students: number
  price: number
  location?: string
  requirements?: string
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  status?: 'planned' | 'active' | 'completed' | 'cancelled'
}

export interface CourseEnrollment {
  id: string
  student_id: string
  course_id: string
  enrollment_date: string
  status: 'enrolled' | 'completed' | 'dropped' | 'pending'
  grade?: string
  completion_date?: string
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  amount_paid: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface CourseStats {
  total: number
  planned: number
  active: number
  completed: number
  cancelled: number
  totalEnrollments: number
  totalRevenue: number
  occupancyRate: number
}

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

export interface CourseSession {
  id: string
  course_id: string
  session_number: number
  session_date: string
  session_time: string
  duration_minutes: number
  topic_ar?: string
  topic_en?: string
  objectives: string[]
  materials_needed: string[]
  homework_assigned?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  completion_notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CourseAttendance {
  id: string
  course_session_id: string
  student_id: string
  course_id: string
  attendance_status: 'present' | 'absent' | 'late' | 'excused'
  arrival_time?: string
  notes?: string
  created_at: string
  updated_at: string
  recorded_by?: string
}

// Form and API types
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
  qualifications: string[]
  experience_years?: number
  hourly_rate?: number
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  hire_date?: string
}

export interface UpdateInstructorData extends Partial<CreateInstructorData> {
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
}

export interface CreateCourseSessionData {
  course_id: string
  session_number: number
  session_date: string
  session_time: string
  duration_minutes?: number
  topic_ar?: string
  topic_en?: string
  objectives?: string[]
  materials_needed?: string[]
  homework_assigned?: string
}

export interface UpdateCourseSessionData extends Partial<CreateCourseSessionData> {
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  completion_notes?: string
}

// Filter and search types
export interface CourseFilters {
  status?: 'planned' | 'active' | 'completed' | 'cancelled'
  instructor_id?: string
  start_date_from?: string
  start_date_to?: string
  search?: string
  price_min?: number
  price_max?: number
}

export interface CourseSortOptions {
  field: 'name_ar' | 'start_date' | 'price' | 'enrolled_students' | 'created_at'
  direction: 'asc' | 'desc'
}