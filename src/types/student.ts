export interface Student {
  id: string
  
  // Basic Information (Bilingual)
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  
  // Admission Information
  child_id?: string
  admission_date?: string
  admission_fee?: number
  
  // Personal Details
  date_of_birth: string
  place_of_birth?: string
  gender: 'male' | 'female'
  nationality_ar?: string
  nationality_en?: string
  national_id?: string
  diagnosis_source?: string
  diagnosis_age?: number
  diagnosis_file_url?: string
  
  // Physical Information
  height?: number
  weight?: number
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  
  // Parents & Family Information
  // Father Information
  father_full_name?: string
  father_national_id?: string
  father_mobile?: string
  father_education?: string
  father_job?: string
  father_workplace?: string
  father_alive?: boolean
  
  // Mother Information
  mother_full_name?: string
  mother_national_id?: string
  mother_mobile?: string
  mother_education?: string
  mother_job?: string
  mother_workplace?: string
  mother_alive?: boolean
  
  // Siblings Information
  siblings_count?: number
  child_order?: number
  
  // Parents Marital Status
  parents_marital_status?: 'married' | 'separated'
  
  // Guardian Information (legacy)
  guardian_first_name?: string
  guardian_last_name?: string
  guardian_relation?: 'father' | 'mother' | 'other'
  guardian_relation_other?: string
  
  // Housing Information
  housing_type?: 'palace' | 'villa' | 'floor' | 'apartment'
  housing_ownership?: 'owned' | 'rented'
  housing_condition?: 'new' | 'good' | 'old'
  family_income?: 'under_3000' | '3000_to_5000' | 'over_5000'
  
  // Social & Educational Information (remaining fields)
  custody_responsible?: 'both_parents' | 'mother' | 'father' | 'other'
  
  // Developmental History
  pregnancy_condition?: 'normal' | 'abnormal'
  birth_type?: 'natural' | 'cesarean'
  weight_height_appropriate?: 'appropriate' | 'underweight' | 'overweight'
  developmental_progress?: 'normal' | 'delayed'
  birth_problems?: string
  
  // Health Information
  health_conditions?: string[]
  takes_medication?: boolean
  medications_list?: Array<{name: string, type: string, dosage: string}>
  
  // Family Health Status
  father_health_status?: 'healthy' | 'sick'
  father_illness?: string
  mother_health_status?: 'healthy' | 'sick'
  mother_illness?: string
  siblings_health_status?: 'healthy' | 'sick'
  siblings_illness?: string
  hereditary_developmental_disorders?: boolean
  hereditary_developmental_info?: string
  autism_family_history?: boolean
  autism_family_info?: string
  adhd_family_history?: boolean
  adhd_family_info?: string
  
  // Guardian Detailed Information
  guardian_full_name?: string
  guardian_national_id?: string
  guardian_title?: string
  guardian_mobile?: string
  guardian_nationality?: string
  guardian_workplace?: string
  has_insurance?: boolean
  insurance_company?: string
  guardian_email?: string
  guardian_phone?: string
  
  // Address Information
  address_district?: string
  address_building_number?: string
  address_street?: string
  address_contact_number?: string
  
  // Interview Data
  interview_date?: string
  interview_time?: string
  interview_notes?: string
  
  // Registration Status
  registration_completed?: boolean
  registration_not_completed_reason?: string
  fees_paid?: boolean
  fees_not_paid_reason?: string
  
  // Contact Information (existing)
  phone?: string
  email?: string
  address_ar?: string
  address_en?: string
  city_ar?: string
  city_en?: string
  postal_code?: string
  
  // Medical Information (existing)
  diagnosis_ar?: string
  diagnosis_en?: string
  severity_level?: 'mild' | 'moderate' | 'severe'
  allergies_ar?: string
  allergies_en?: string
  medications_ar?: string
  medications_en?: string
  special_needs_ar?: string
  special_needs_en?: string
  
  // Special Needs Types & Difficulties
  special_needs_types?: string[]
  learning_difficulties?: string[]
  behavioral_difficulties?: string[]
  communication_difficulties?: string[]
  motor_difficulties?: string[]
  sensory_difficulties?: string[]
  
  // Educational Information (existing)
  school_name_ar?: string
  school_name_en?: string
  grade_level?: string
  educational_support_ar?: string
  educational_support_en?: string
  
  // Therapy Information (existing)
  referral_source_ar?: string
  referral_source_en?: string
  therapy_goals_ar?: string
  therapy_goals_en?: string
  therapy_program_id?: string  // Link to TherapyPlan
  
  // System Fields
  registration_number: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  enrollment_date: string
  last_assessment_date?: string
  next_review_date?: string
  
  // File Attachments
  profile_photo_url?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateStudentData {
  // Basic Information (Bilingual)
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  
  // Admission Information
  child_id?: string
  admission_date?: string
  admission_fee?: number
  
  // Personal Details
  date_of_birth: string
  place_of_birth?: string
  gender: 'male' | 'female'
  nationality_ar?: string
  nationality_en?: string
  national_id?: string
  diagnosis_source?: string
  diagnosis_age?: number
  diagnosis_file_url?: string
  
  // Physical Information
  height?: number
  weight?: number
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  
  // Parents & Family Information
  // Father Information
  father_full_name?: string
  father_national_id?: string
  father_mobile?: string
  father_education?: string
  father_job?: string
  father_workplace?: string
  father_alive?: boolean
  
  // Mother Information
  mother_full_name?: string
  mother_national_id?: string
  mother_mobile?: string
  mother_education?: string
  mother_job?: string
  mother_workplace?: string
  mother_alive?: boolean
  
  // Siblings Information
  siblings_count?: number
  child_order?: number
  
  // Parents Marital Status
  parents_marital_status?: 'married' | 'separated'
  
  // Guardian Information (legacy)
  guardian_first_name?: string
  guardian_last_name?: string
  guardian_relation?: 'father' | 'mother' | 'other'
  guardian_relation_other?: string
  
  // Housing Information
  housing_type?: 'palace' | 'villa' | 'floor' | 'apartment'
  housing_ownership?: 'owned' | 'rented'
  housing_condition?: 'new' | 'good' | 'old'
  family_income?: 'under_3000' | '3000_to_5000' | 'over_5000'
  
  // Social & Educational Information (remaining fields)
  custody_responsible?: 'both_parents' | 'mother' | 'father' | 'other'
  
  // Developmental History
  pregnancy_condition?: 'normal' | 'abnormal'
  birth_type?: 'natural' | 'cesarean'
  weight_height_appropriate?: 'appropriate' | 'underweight' | 'overweight'
  developmental_progress?: 'normal' | 'delayed'
  birth_problems?: string
  
  // Health Information
  health_conditions?: string[]
  takes_medication?: boolean
  medications_list?: Array<{name: string, type: string, dosage: string}>
  
  // Family Health Status
  father_health_status?: 'healthy' | 'sick'
  father_illness?: string
  mother_health_status?: 'healthy' | 'sick'
  mother_illness?: string
  siblings_health_status?: 'healthy' | 'sick'
  siblings_illness?: string
  hereditary_developmental_disorders?: boolean
  hereditary_developmental_info?: string
  autism_family_history?: boolean
  autism_family_info?: string
  adhd_family_history?: boolean
  adhd_family_info?: string
  
  // Guardian Detailed Information
  guardian_full_name?: string
  guardian_national_id?: string
  guardian_title?: string
  guardian_mobile?: string
  guardian_nationality?: string
  guardian_workplace?: string
  has_insurance?: boolean
  insurance_company?: string
  guardian_email?: string
  guardian_phone?: string
  
  // Address Information
  address_district?: string
  address_building_number?: string
  address_street?: string
  address_contact_number?: string
  
  // Interview Data
  interview_date?: string
  interview_time?: string
  interview_notes?: string
  
  // Registration Status
  registration_completed?: boolean
  registration_not_completed_reason?: string
  fees_paid?: boolean
  fees_not_paid_reason?: string
  
  // Contact Information (existing)
  phone?: string
  email?: string
  address_ar?: string
  address_en?: string
  city_ar?: string
  city_en?: string
  postal_code?: string
  
  // Medical Information (existing)
  diagnosis_ar?: string
  diagnosis_en?: string
  severity_level?: 'mild' | 'moderate' | 'severe'
  allergies_ar?: string
  allergies_en?: string
  medications_ar?: string
  medications_en?: string
  special_needs_ar?: string
  special_needs_en?: string
  
  // Special Needs Types & Difficulties
  special_needs_types?: string[]
  learning_difficulties?: string[]
  behavioral_difficulties?: string[]
  communication_difficulties?: string[]
  motor_difficulties?: string[]
  sensory_difficulties?: string[]
  
  // Educational Information (existing)
  school_name_ar?: string
  school_name_en?: string
  grade_level?: string
  educational_support_ar?: string
  educational_support_en?: string
  
  // Therapy Information (existing)
  referral_source_ar?: string
  referral_source_en?: string
  therapy_goals_ar?: string
  therapy_goals_en?: string
  therapy_program_id?: string  // Link to TherapyPlan
  
  // File Attachments
  profile_photo_url?: string
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  id: string
  status?: 'active' | 'inactive' | 'graduated' | 'suspended'
  last_assessment_date?: string
  next_review_date?: string
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