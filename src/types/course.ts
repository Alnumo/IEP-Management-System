export interface Course {
  id: string
  course_code: string // Generated unique code like CRS2024001
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
}