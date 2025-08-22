// Specialized Therapy Programs Types
// Phase 2: 12 specialized therapy programs with program-specific features

export interface TherapyProgram {
  id: string
  
  // Program Identification
  program_code: string
  name_ar: string
  name_en: string
  
  // Program Classification
  category: 'intensive' | 'therapeutic' | 'educational' | 'behavioral' | 'developmental' | 'sensory' | 'communication' | 'motor'
  intensity_level: 'low' | 'moderate' | 'high' | 'intensive'
  
  // Program Configuration
  default_sessions_per_week: number
  default_session_duration_minutes: number
  minimum_age_months: number
  maximum_age_months: number
  
  // Assessment and Documentation
  assessment_tools: string[]
  documentation_template: Record<string, any>
  intervention_protocols: Record<string, any>
  
  // Billing and Pricing
  billing_codes: string[]
  default_price_per_session?: number
  group_session_multiplier: number
  
  // Medical Requirements
  requires_medical_clearance: boolean
  contraindications: string[]
  precautions_ar?: string
  precautions_en?: string
  
  // Program Description
  description_ar?: string
  description_en?: string
  objectives_ar: string[]
  objectives_en: string[]
  target_conditions: string[]
  
  // Resource Requirements
  required_materials: string[]
  required_space_type?: string
  equipment_needed: string[]
  staff_qualifications: string[]
  
  // Quality Metrics
  success_metrics: Record<string, any>
  typical_duration_weeks?: number
  graduation_criteria_ar?: string
  graduation_criteria_en?: string
  
  // Status and Availability
  is_active: boolean
  is_available_for_new_patients: boolean
  waitlist_limit: number
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ABADataCollection {
  id: string
  student_id: string
  session_id?: string
  clinical_doc_id?: string
  
  // ABC Data (Antecedent, Behavior, Consequence)
  antecedent_ar?: string
  antecedent_en?: string
  behavior_description_ar: string
  behavior_description_en?: string
  consequence_ar?: string
  consequence_en?: string
  
  // Behavior Measurement
  behavior_frequency: number
  behavior_duration_seconds?: number
  behavior_intensity?: number // 1-5 scale
  intervention_used?: string
  
  // Discrete Trial Data
  trial_number?: number
  target_skill_ar?: string
  target_skill_en?: string
  prompt_level?: 'independent' | 'gestural' | 'verbal' | 'physical'
  response_accuracy?: boolean
  response_latency_seconds?: number
  
  // Reinforcement Data
  reinforcer_used?: string
  reinforcement_schedule?: string
  reinforcement_effectiveness?: number // 1-5 scale
  
  // Environmental Factors
  environment_description?: string
  distractors_present: string[]
  staff_present: string[]
  
  // Observation Details
  observation_start_time?: string
  observation_end_time?: string
  observation_date: string
  observer_id?: string
  
  // Data Quality
  data_reliability_score?: number
  notes_ar?: string
  notes_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface SpeechTherapyData {
  id: string
  student_id: string
  session_id?: string
  clinical_doc_id?: string
  
  // Articulation Data
  target_sounds: string[]
  sound_accuracy_percentage: Record<string, number>
  sound_position?: 'initial' | 'medial' | 'final' | 'blends'
  
  // Language Development
  vocabulary_introduced: string[]
  vocabulary_mastered: string[]
  sentence_length_words?: number
  grammatical_structures: string[]
  
  // Communication Data
  communication_attempts: number
  successful_communications: number
  communication_modality?: 'verbal' | 'gestural' | 'aac' | 'signs'
  
  // Fluency Measures (if applicable)
  words_per_minute?: number
  stuttering_frequency?: number
  stuttering_severity?: 'mild' | 'moderate' | 'severe'
  
  // Voice Quality (if applicable)
  vocal_quality?: 'normal' | 'hoarse' | 'breathy' | 'strained'
  vocal_pitch?: 'appropriate' | 'too_high' | 'too_low'
  vocal_volume?: 'appropriate' | 'too_loud' | 'too_quiet'
  
  // Pragmatic Skills
  eye_contact_rating?: number // 1-5 scale
  turn_taking_rating?: number // 1-5 scale
  topic_maintenance_rating?: number // 1-5 scale
  
  // Session Activities
  activities_completed: string[]
  materials_used: string[]
  home_practice_assigned?: string
  
  // Progress Notes
  strengths_observed_ar?: string
  strengths_observed_en?: string
  challenges_noted_ar?: string
  challenges_noted_en?: string
  recommendations_ar?: string
  recommendations_en?: string
  
  // Assessment Scores
  assessment_type?: string
  assessment_score?: number
  assessment_percentile?: number
  
  // Metadata
  session_date: string
  created_at: string
  updated_at: string
  recorded_by?: string
}

export interface OccupationalTherapyData {
  id: string
  student_id: string
  session_id?: string
  clinical_doc_id?: string
  
  // Fine Motor Skills
  fine_motor_tasks: Record<string, any>
  grip_strength_kg?: number
  pincer_grasp_quality?: number // 1-5 scale
  handwriting_quality?: number // 1-5 scale
  
  // Gross Motor Skills
  gross_motor_tasks: Record<string, any>
  balance_score?: number // 1-5 scale
  coordination_score?: number // 1-5 scale
  
  // Sensory Processing
  sensory_profile: Record<string, any>
  sensory_seeking_behaviors: string[]
  sensory_avoiding_behaviors: string[]
  sensory_diet_activities: string[]
  
  // Activities of Daily Living (ADL)
  dressing_independence?: number // 1-5 scale
  feeding_independence?: number // 1-5 scale
  toileting_independence?: number // 1-5 scale
  grooming_independence?: number // 1-5 scale
  
  // Cognitive-Motor Integration
  visual_motor_integration?: number // 1-5 scale
  visual_perceptual_skills?: number // 1-5 scale
  motor_planning_ability?: number // 1-5 scale
  
  // Environmental Modifications
  adaptations_used: string[]
  assistive_technology: string[]
  environmental_supports: string[]
  
  // Goal Progress
  short_term_goals: any[]
  goal_progress_percentage: Record<string, number>
  mastered_skills: string[]
  emerging_skills: string[]
  
  // Intervention Data
  intervention_techniques: string[]
  equipment_used: string[]
  session_focus_areas: string[]
  
  // Family Training
  caregiver_training_provided?: string
  home_program_activities: string[]
  caregiver_competency_level?: number // 1-5 scale
  
  // Metadata
  session_date: string
  created_at: string
  updated_at: string
  recorded_by?: string
}

export interface AssessmentTool {
  id: string
  
  // Tool Identification
  tool_code: string
  name_ar: string
  name_en: string
  
  // Tool Classification
  assessment_type: 'screening' | 'diagnostic' | 'progress_monitoring' | 'outcome_measurement'
  domain: 'autism' | 'speech_language' | 'occupational' | 'behavioral' | 'cognitive' | 'social' | 'motor' | 'sensory' | 'academic'
  
  // Age and Population
  minimum_age_months?: number
  maximum_age_months?: number
  target_population_ar?: string
  target_population_en?: string
  
  // Administration Details
  administration_time_minutes?: number
  requires_training: boolean
  certification_required: boolean
  can_be_parent_reported: boolean
  
  // Scoring and Interpretation
  scoring_method?: 'manual' | 'automated' | 'mixed'
  score_range_min?: number
  score_range_max?: number
  interpretation_guide: Record<string, any>
  
  // Tool Structure
  sections: any[]
  total_items?: number
  completion_criteria?: string
  
  // Validity and Reliability
  validity_studies: string[]
  reliability_coefficient?: number
  normative_sample_size?: number
  cultural_adaptations: string[]
  
  // Digital Implementation
  digital_version_available: boolean
  scoring_algorithm: Record<string, any>
  report_template: Record<string, any>
  
  // Usage and Licensing
  is_free: boolean
  license_cost?: number
  license_expiry_date?: string
  usage_restrictions?: string
  
  // Quality Assurance
  last_updated_version?: string
  evidence_base_strength?: 'strong' | 'moderate' | 'limited'
  
  // Status
  is_active: boolean
  is_approved_for_use: boolean
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface InterventionProtocol {
  id: string
  therapy_program_id?: string
  
  // Protocol Identification
  protocol_name_ar: string
  protocol_name_en: string
  protocol_code?: string
  
  // Protocol Details
  description_ar?: string
  description_en?: string
  target_skills: string[]
  prerequisites: string[]
  
  // Implementation Guidelines
  step_by_step_instructions: any[]
  materials_required: string[]
  environmental_setup_ar?: string
  environmental_setup_en?: string
  
  // Measurement and Data Collection
  data_collection_method?: string
  frequency_of_measurement?: string
  success_criteria: Record<string, any>
  mastery_criteria_ar?: string
  mastery_criteria_en?: string
  
  // Progression and Modification
  progression_steps: any[]
  modification_guidelines: string[]
  troubleshooting_tips: Record<string, any>
  
  // Evidence Base
  research_evidence: string[]
  evidence_quality?: 'high' | 'moderate' | 'low'
  recommended_age_range?: string
  
  // Safety and Contraindications
  safety_considerations: string[]
  contraindications: string[]
  precautions: string[]
  
  // Training Requirements
  staff_training_required: boolean
  training_duration_hours?: number
  competency_requirements: string[]
  
  // Approval and Quality
  approval_status: 'pending' | 'approved' | 'under_review' | 'rejected'
  approved_by?: string
  approval_date?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ProgramEnrollment {
  id: string
  student_id: string
  therapy_program_id: string
  
  // Enrollment Details
  enrollment_date: string
  start_date: string
  expected_end_date?: string
  actual_end_date?: string
  
  // Program Configuration for Student
  sessions_per_week: number
  session_duration_minutes: number
  total_sessions_planned?: number
  
  // Goals and Objectives
  individual_goals: any[]
  modified_protocols: any[]
  accommodation_needs: string[]
  
  // Progress Tracking
  sessions_completed: number
  sessions_missed: number
  current_mastery_level?: number // Percentage
  
  // Status and Outcomes
  enrollment_status: 'active' | 'paused' | 'completed' | 'withdrawn' | 'transferred'
  completion_reason?: string
  outcome_summary_ar?: string
  outcome_summary_en?: string
  
  // Team Assignment
  primary_therapist_id?: string
  secondary_therapist_id?: string
  supervising_consultant_id?: string
  
  // Billing and Payments
  total_cost?: number
  payment_plan?: string
  insurance_coverage_percentage?: number
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

// Create/Update types
export interface CreateTherapyProgramData {
  program_code: string
  name_ar: string
  name_en: string
  category: 'intensive' | 'therapeutic' | 'educational' | 'behavioral' | 'developmental' | 'sensory' | 'communication' | 'motor'
  intensity_level: 'low' | 'moderate' | 'high' | 'intensive'
  default_sessions_per_week?: number
  default_session_duration_minutes?: number
  minimum_age_months?: number
  maximum_age_months?: number
  description_ar?: string
  description_en?: string
  objectives_ar?: string[]
  objectives_en?: string[]
  target_conditions?: string[]
  requires_medical_clearance?: boolean
}

export interface UpdateTherapyProgramData extends Partial<CreateTherapyProgramData> {
  id: string
  is_active?: boolean
  is_available_for_new_patients?: boolean
}

export interface CreateProgramEnrollmentData {
  student_id: string
  therapy_program_id: string
  start_date: string
  expected_end_date?: string
  sessions_per_week?: number
  session_duration_minutes?: number
  individual_goals?: any[]
  accommodation_needs?: string[]
  primary_therapist_id?: string
}

export interface UpdateProgramEnrollmentData extends Partial<CreateProgramEnrollmentData> {
  id: string
  enrollment_status?: 'active' | 'paused' | 'completed' | 'withdrawn' | 'transferred'
  sessions_completed?: number
  sessions_missed?: number
  current_mastery_level?: number
}

// Filter and search types
export interface TherapyProgramFilters {
  category?: 'intensive' | 'therapeutic' | 'educational' | 'behavioral' | 'developmental' | 'sensory' | 'communication' | 'motor'
  intensity_level?: 'low' | 'moderate' | 'high' | 'intensive'
  is_active?: boolean
  is_available_for_new_patients?: boolean
  age_range?: { min: number; max: number }
  requires_medical_clearance?: boolean
}

export interface ProgramEnrollmentFilters {
  student_id?: string
  therapy_program_id?: string
  enrollment_status?: 'active' | 'paused' | 'completed' | 'withdrawn' | 'transferred'
  primary_therapist_id?: string
  date_from?: string
  date_to?: string
}

export interface AssessmentToolFilters {
  assessment_type?: 'screening' | 'diagnostic' | 'progress_monitoring' | 'outcome_measurement'
  domain?: 'autism' | 'speech_language' | 'occupational' | 'behavioral' | 'cognitive' | 'social' | 'motor' | 'sensory' | 'academic'
  is_active?: boolean
  is_approved_for_use?: boolean
  age_range?: { min: number; max: number }
  requires_training?: boolean
}