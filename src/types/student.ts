export interface Student {
  id: string
  student_id: string // Generated unique identifier like STU2024001
  first_name: string
  last_name: string
  birth_date: string
  gender: 'male' | 'female'
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_notes?: string
  enrollment_date: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
  created_at: string
  updated_at: string
}

export interface CreateStudentData {
  first_name: string
  last_name: string
  birth_date: string
  gender: 'male' | 'female'
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_notes?: string
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  status?: 'active' | 'inactive' | 'graduated' | 'suspended'
}

export interface StudentFilters {
  status?: 'active' | 'inactive' | 'graduated' | 'suspended'
  gender?: 'male' | 'female'
  search?: string
  ageMin?: number
  ageMax?: number
}

export interface StudentStats {
  total: number
  active: number
  inactive: number
  graduated: number
  suspended: number
  maleCount: number
  femaleCount: number
  averageAge: number
}