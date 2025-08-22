// Medical Foundation Types
// Phase 1: Medical records, consultants, and clinical documentation

export interface MedicalRecord {
  id: string
  student_id: string
  
  // Medical Identification
  medical_record_number: string
  primary_diagnosis_code: string[]
  secondary_diagnosis_codes: string[]
  
  // Medical History (encrypted)
  medical_history: Record<string, any>
  current_medications: Record<string, any>
  allergies: string[]
  emergency_protocol: string
  
  // Vital Information
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  weight_kg?: number
  height_cm?: number
  bmi?: number // Generated field
  
  // Medical Team Information
  primary_physician_ar?: string
  primary_physician_en?: string
  primary_physician_phone?: string
  primary_physician_email?: string
  hospital_clinic_ar?: string
  hospital_clinic_en?: string
  
  // Insurance Information
  insurance_provider_ar?: string
  insurance_provider_en?: string
  policy_number?: string
  insurance_expiry_date?: string
  coverage_details: Record<string, any>
  
  // Emergency Contacts (Medical)
  emergency_medical_contact_name_ar?: string
  emergency_medical_contact_name_en?: string
  emergency_medical_contact_phone?: string
  emergency_medical_contact_relationship_ar?: string
  emergency_medical_contact_relationship_en?: string
  
  // Medical Restrictions and Precautions
  activity_restrictions_ar?: string
  activity_restrictions_en?: string
  dietary_restrictions_ar?: string
  dietary_restrictions_en?: string
  medication_allergies: string[]
  environmental_allergies: string[]
  
  // Therapy-Related Medical Information
  contraindications_ar?: string
  contraindications_en?: string
  special_accommodations_ar?: string
  special_accommodations_en?: string
  therapy_clearance_date?: string
  therapy_clearance_notes_ar?: string
  therapy_clearance_notes_en?: string
  
  // Compliance and Security
  last_medical_review_date?: string
  next_review_due_date?: string
  is_encrypted: boolean
  encryption_key_id?: string
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
  
  // Audit Fields
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  audit_log: any[]
}

export interface MedicalConsultant {
  id: string
  therapist_id?: string
  
  // Professional Information
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  title_ar?: string
  title_en?: string
  
  // Medical Credentials
  license_number: string
  license_type: string
  license_expiry_date?: string
  license_issuing_authority_ar?: string
  license_issuing_authority_en?: string
  
  // Specialization Information
  primary_specialization_ar: string
  primary_specialization_en?: string
  secondary_specializations: string[]
  board_certifications: string[]
  fellowship_training: string[]
  
  // Practice Information
  years_of_experience?: number
  education_background: Record<string, any>
  professional_memberships: string[]
  
  // Contact Information
  primary_phone?: string
  secondary_phone?: string
  email?: string
  whatsapp_number?: string
  
  // Practice Address
  clinic_name_ar?: string
  clinic_name_en?: string
  address_ar?: string
  address_en?: string
  city_ar?: string
  city_en?: string
  postal_code?: string
  
  // Supervision Details
  supervision_level: 'attending_physician' | 'consulting_physician' | 'supervising_specialist' | 'medical_director' | 'clinical_consultant' | 'external_consultant'
  supervision_scope_ar?: string
  supervision_scope_en?: string
  available_hours: Record<string, any>
  
  // Center-Specific Information
  start_date: string
  end_date?: string
  contract_type: 'full_time' | 'part_time' | 'consultant' | 'on_call' | 'contractual'
  hourly_rate?: number
  consultation_fee?: number
  
  // Emergency Availability
  emergency_contact: boolean
  emergency_phone?: string
  emergency_availability_notes_ar?: string
  emergency_availability_notes_en?: string
  
  // Performance and Quality
  patient_satisfaction_rating?: number
  clinical_performance_notes: Record<string, any>
  
  // Status and Compliance
  status: 'active' | 'inactive' | 'suspended' | 'on_leave' | 'terminated'
  background_check_date?: string
  background_check_status?: string
  insurance_coverage: Record<string, any>
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface ClinicalDocumentation {
  id: string
  session_id?: string
  student_id: string
  medical_consultant_id?: string
  
  // Documentation Type
  documentation_type: 'soap_note' | 'progress_note' | 'assessment_note' | 'consultation_note' | 'incident_report' | 'medical_review' | 'discharge_summary'
  
  // SOAP Notes Structure (Encrypted JSONB)
  soap_notes: Record<string, any>
  
  // Subjective (Patient/Parent Report)
  subjective_ar?: string
  subjective_en?: string
  parent_report_ar?: string
  parent_report_en?: string
  patient_mood_ar?: string
  patient_mood_en?: string
  recent_events_ar?: string
  recent_events_en?: string
  
  // Objective (Clinical Observations)
  objective_ar?: string
  objective_en?: string
  observed_behaviors: string[]
  vital_signs: Record<string, any>
  physical_observations_ar?: string
  physical_observations_en?: string
  
  // Assessment (Clinical Analysis)
  assessment_ar: string
  assessment_en?: string
  clinical_impression_ar?: string
  clinical_impression_en?: string
  progress_toward_goals_ar?: string
  progress_toward_goals_en?: string
  concerns_identified: string[]
  risk_factors: string[]
  
  // Plan (Treatment Plan)
  plan_ar: string
  plan_en?: string
  next_session_focus_ar?: string
  next_session_focus_en?: string
  home_program_ar?: string
  home_program_en?: string
  recommendations: string[]
  referrals_needed: string[]
  
  // Behavioral Data (Quantitative)
  behavioral_data: Record<string, any>
  frequency_data: Record<string, any>
  duration_data: Record<string, any>
  intensity_scores: Record<string, any>
  
  // Progress Metrics (Quantitative)
  progress_metrics: Record<string, any>
  goal_achievement_percentage?: number
  session_effectiveness_rating?: number
  
  // Interventions Used
  interventions_used: string[]
  materials_utilized: string[]
  modifications_made_ar?: string
  modifications_made_en?: string
  
  // Session Details
  session_date: string
  session_duration_minutes?: number
  session_location_ar?: string
  session_location_en?: string
  attendees: string[]
  
  // Medical Considerations
  medical_observations_ar?: string
  medical_observations_en?: string
  medication_effects_noted_ar?: string
  medication_effects_noted_en?: string
  side_effects_observed: string[]
  contraindications_noted: string[]
  
  // Follow-up Requirements
  follow_up_needed: boolean
  follow_up_timeframe?: string
  follow_up_type?: string
  urgency_level: 'routine' | 'urgent' | 'immediate' | 'scheduled'
  
  // Quality and Compliance
  is_encrypted: boolean
  requires_medical_review: boolean
  reviewed_by_medical_consultant?: string
  medical_review_date?: string
  medical_review_notes_ar?: string
  medical_review_notes_en?: string
  
  // Digital Signatures
  therapist_signature: Record<string, any>
  medical_consultant_signature: Record<string, any>
  parent_acknowledgment: Record<string, any>
  
  // Status and Workflow
  status: 'draft' | 'pending_review' | 'reviewed' | 'approved' | 'finalized'
  approval_workflow: Record<string, any>
  
  // Metadata
  created_at: string
  updated_at: string
  finalized_at?: string
  created_by?: string
  updated_by?: string
}

export interface MedicalSupervisionAssignment {
  id: string
  medical_consultant_id: string
  student_id?: string
  therapist_id?: string
  therapy_plan_id?: string
  
  // Supervision Details
  supervision_type: 'direct_patient_care' | 'therapist_supervision' | 'program_oversight' | 'case_consultation' | 'emergency_consultation' | 'periodic_review'
  
  // Schedule Information
  supervision_frequency?: string
  scheduled_days: string[]
  supervision_duration_minutes: number
  
  // Supervision Scope
  scope_description_ar?: string
  scope_description_en?: string
  responsibilities: string[]
  authority_level: 'advisory' | 'oversight' | 'direct_supervision' | 'full_authority'
  
  // Communication Preferences
  communication_method: 'in_person' | 'video_call' | 'phone' | 'written_reports' | 'combination'
  emergency_contact_required: boolean
  
  // Assignment Dates
  assignment_start_date: string
  assignment_end_date?: string
  
  // Status
  status: 'active' | 'inactive' | 'paused' | 'completed' | 'terminated'
  
  // Metadata
  created_at: string
  updated_at: string
  assigned_by?: string
}

// Create/Update types
export interface CreateMedicalRecordData {
  student_id: string
  primary_diagnosis_code?: string[]
  secondary_diagnosis_codes?: string[]
  medical_history?: Record<string, any>
  current_medications?: Record<string, any>
  allergies?: string[]
  emergency_protocol?: string
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  weight_kg?: number
  height_cm?: number
  insurance_provider_ar?: string
  insurance_provider_en?: string
  policy_number?: string
  insurance_expiry_date?: string
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface UpdateMedicalRecordData extends Partial<CreateMedicalRecordData> {
  id: string
}

export interface CreateMedicalConsultantData {
  first_name_ar: string
  last_name_ar: string
  first_name_en?: string
  last_name_en?: string
  license_number: string
  license_type: string
  primary_specialization_ar: string
  primary_specialization_en?: string
  supervision_level: 'attending_physician' | 'consulting_physician' | 'supervising_specialist' | 'medical_director' | 'clinical_consultant' | 'external_consultant'
  contract_type: 'full_time' | 'part_time' | 'consultant' | 'on_call' | 'contractual'
  email?: string
  primary_phone?: string
}

export interface UpdateMedicalConsultantData extends Partial<CreateMedicalConsultantData> {
  id: string
  status?: 'active' | 'inactive' | 'suspended' | 'on_leave' | 'terminated'
}

// Filter and search types
export interface MedicalRecordFilters {
  student_id?: string
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
  has_allergies?: boolean
  has_medications?: boolean
  review_overdue?: boolean
}

export interface MedicalConsultantFilters {
  status?: 'active' | 'inactive' | 'suspended' | 'on_leave' | 'terminated'
  supervision_level?: 'attending_physician' | 'consulting_physician' | 'supervising_specialist' | 'medical_director' | 'clinical_consultant' | 'external_consultant'
  specialization?: string
  contract_type?: 'full_time' | 'part_time' | 'consultant' | 'on_call' | 'contractual'
}

export interface ClinicalDocumentationFilters {
  student_id?: string
  documentation_type?: 'soap_note' | 'progress_note' | 'assessment_note' | 'consultation_note' | 'incident_report' | 'medical_review' | 'discharge_summary'
  status?: 'draft' | 'pending_review' | 'reviewed' | 'approved' | 'finalized'
  urgency_level?: 'routine' | 'urgent' | 'immediate' | 'scheduled'
  date_from?: string
  date_to?: string
}