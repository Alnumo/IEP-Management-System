// Therapy Data Collection Types
// Specialized interfaces for different therapy types

export interface BaseTherapySession {
  id: string
  student_id: string
  therapist_id: string
  session_date: string
  session_duration_minutes: number
  session_type: 'aba' | 'speech' | 'occupational' | 'physical'
  session_location: string
  
  // Basic session info
  session_goals: string[]
  materials_used: string[]
  environmental_factors: string[]
  
  // Progress tracking
  overall_performance_rating: number // 1-10
  student_engagement_level: number // 1-10
  session_notes: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

// ABA (Applied Behavior Analysis) Data Collection
export interface ABADataCollection extends BaseTherapySession {
  session_type: 'aba'
  
  // Behavioral Programs
  behavior_programs: ABABehaviorProgram[]
  
  // Trial Data
  trial_data: ABATrialData[]
  
  // Behavior Tracking
  target_behaviors: ABABehaviorTracking[]
  challenging_behaviors: ABABehaviorIncident[]
  
  // Reinforcement Data
  reinforcement_schedule: string
  reinforcers_used: string[]
  reinforcement_effectiveness: number // 1-10
  
  // Prompt Data
  prompting_levels_used: string[]
  prompt_fading_progress: ABAPromptData[]
  
  // Data Analysis
  mastery_criteria_met: string[]
  programs_to_modify: string[]
  next_session_targets: string[]
}

export interface ABABehaviorProgram {
  id: string
  program_name: string
  target_skill: string
  current_phase: string
  trials_run: number
  correct_responses: number
  incorrect_responses: number
  prompted_responses: number
  independent_responses: number
  accuracy_percentage: number
  notes: string
}

export interface ABATrialData {
  program_id: string
  trial_number: number
  stimulus_presented: string
  response_given: string
  prompt_level: 'none' | 'gesture' | 'verbal' | 'model' | 'physical'
  correct: boolean
  latency_seconds?: number
  notes?: string
}

export interface ABABehaviorTracking {
  behavior_name: string
  target_type: 'increase' | 'decrease' | 'maintain'
  measurement_type: 'frequency' | 'duration' | 'intensity' | 'latency'
  baseline_data: number
  session_data: number
  progress_status: 'improving' | 'maintaining' | 'regressing'
  intervention_used: string
}

export interface ABABehaviorIncident {
  behavior_name: string
  time_occurred: string
  duration_minutes: number
  intensity: number // 1-10
  antecedent: string
  consequence_applied: string
  effectiveness_of_intervention: number // 1-10
}

export interface ABAPromptData {
  skill_area: string
  current_prompt_level: string
  independence_percentage: number
  next_fading_step: string
}

// Speech Therapy Data Collection
export interface SpeechTherapyDataCollection extends BaseTherapySession {
  session_type: 'speech'
  
  // Articulation Data
  articulation_targets: ArticulationTarget[]
  
  // Language Data
  language_targets: LanguageTarget[]
  
  // Fluency Data
  fluency_data?: FluencyData
  
  // Voice Data
  voice_data?: VoiceData
  
  // Communication Assessment
  communication_modalities_used: string[]
  aac_device_used?: string
  aac_effectiveness?: number // 1-10
  
  // Progress Measures
  intelligibility_rating: number // 1-10
  communication_attempts: number
  successful_communications: number
  
  // Home Program
  home_practice_assigned: string[]
  parent_training_provided: string[]
}

export interface ArticulationTarget {
  phoneme: string
  position: 'initial' | 'medial' | 'final' | 'clusters'
  word_level: 'isolation' | 'syllable' | 'word' | 'phrase' | 'sentence' | 'conversation'
  trials_attempted: number
  correct_productions: number
  cueing_required: boolean
  accuracy_percentage: number
  notes: string
}

export interface LanguageTarget {
  skill_area: 'vocabulary' | 'grammar' | 'syntax' | 'semantics' | 'pragmatics'
  specific_target: string
  complexity_level: number // 1-5
  trials_attempted: number
  correct_responses: number
  support_level: 'independent' | 'minimal' | 'moderate' | 'maximum'
  generalization_observed: boolean
}

export interface FluencyData {
  speaking_rate_wpm: number
  disfluency_count: number
  disfluency_types: string[]
  secondary_behaviors: string[]
  tension_rating: number // 1-10
  avoidance_behaviors: string[]
}

export interface VoiceData {
  vocal_quality: string[]
  pitch_appropriateness: number // 1-10
  volume_appropriateness: number // 1-10
  resonance_rating: number // 1-10
  breath_support_rating: number // 1-10
}

// Occupational Therapy Data Collection
export interface OccupationalTherapyDataCollection extends BaseTherapySession {
  session_type: 'occupational'
  
  // Fine Motor Skills
  fine_motor_activities: FineMotoractivity[]
  
  // Gross Motor Skills
  gross_motor_activities: GrossMotorActivity[]
  
  // Sensory Integration
  sensory_activities: SensoryActivity[]
  
  // Activities of Daily Living
  adl_activities: ADLActivity[]
  
  // Cognitive Skills
  cognitive_activities: CognitiveActivity[]
  
  // Equipment/Adaptations
  assistive_devices_used: string[]
  environmental_modifications: string[]
  
  // Sensory Profile
  sensory_responses: SensoryResponse[]
}

export interface FineMotoractivity {
  activity_name: string
  skill_targeted: string[]
  tools_materials: string[]
  performance_level: number // 1-10
  assistance_needed: 'independent' | 'minimal' | 'moderate' | 'maximum'
  quality_of_movement: number // 1-10
  endurance_rating: number // 1-10
  notes: string
}

export interface GrossMotorActivity {
  activity_name: string
  movement_patterns: string[]
  balance_component: boolean
  coordination_component: boolean
  strength_component: boolean
  performance_rating: number // 1-10
  safety_concerns: string[]
}

export interface SensoryActivity {
  sensory_system: 'tactile' | 'proprioceptive' | 'vestibular' | 'visual' | 'auditory'
  activity_description: string
  tolerance_level: number // 1-10
  seeking_avoiding_behavior: 'seeking' | 'avoiding' | 'neutral'
  regulation_response: 'calming' | 'alerting' | 'organizing' | 'dysregulating'
}

export interface ADLActivity {
  activity_type: 'feeding' | 'dressing' | 'grooming' | 'toileting' | 'mobility'
  specific_task: string
  independence_level: number // 1-10
  adaptive_strategies_used: string[]
  time_to_complete_minutes: number
  quality_rating: number // 1-10
}

export interface CognitiveActivity {
  cognitive_domain: 'attention' | 'memory' | 'executive_function' | 'problem_solving' | 'visual_processing'
  activity_description: string
  complexity_level: number // 1-5
  success_rate: number // 0-100
  strategies_used: string[]
}

export interface SensoryResponse {
  stimulus_type: string
  response_observed: string
  intensity_rating: number // 1-10
  duration_of_response: string
}

// Physical Therapy Data Collection
export interface PhysicalTherapyDataCollection extends BaseTherapySession {
  session_type: 'physical'
  
  // Range of Motion
  rom_measurements: ROMeasurement[]
  
  // Strength Assessment
  strength_assessments: StrengthAssessment[]
  
  // Balance and Coordination
  balance_activities: BalanceActivity[]
  
  // Gait Training
  gait_data?: GaitData
  
  // Therapeutic Exercises
  therapeutic_exercises: TherapeuticExercise[]
  
  // Pain Assessment
  pain_levels: PainAssessment[]
  
  // Functional Mobility
  mobility_assessments: MobilityAssessment[]
  
  // Equipment Used
  equipment_devices: string[]
  modifications_made: string[]
}

export interface ROMeasurement {
  joint: string
  movement: string
  active_rom_degrees: number
  passive_rom_degrees: number
  pain_during_movement: boolean
  quality_of_movement: number // 1-10
  limitations_noted: string
}

export interface StrengthAssessment {
  muscle_group: string
  manual_muscle_test_grade: string // 0-5 scale
  repetitions_completed: number
  endurance_rating: number // 1-10
  compensation_patterns: string[]
}

export interface BalanceActivity {
  activity_name: string
  surface_type: string
  support_needed: 'none' | 'minimal' | 'moderate' | 'maximum'
  duration_maintained_seconds: number
  fall_risk_level: 'low' | 'moderate' | 'high'
  strategies_used: string[]
}

export interface GaitData {
  distance_walked_meters: number
  assistive_device_used?: string
  gait_speed_mps: number
  step_length_cm: number
  gait_deviations: string[]
  endurance_rating: number // 1-10
  safety_concerns: string[]
}

export interface TherapeuticExercise {
  exercise_name: string
  muscle_groups_targeted: string[]
  sets_completed: number
  repetitions_per_set: number
  resistance_level: string
  form_quality: number // 1-10
  patient_tolerance: number // 1-10
  modifications_made: string[]
}

export interface PainAssessment {
  location: string
  pain_scale_0_10: number
  pain_quality: string[]
  pain_triggers: string[]
  relief_methods_effective: string[]
}

export interface MobilityAssessment {
  task: string
  independence_level: number // 1-10
  time_to_complete_seconds: number
  quality_of_movement: number // 1-10
  safety_level: number // 1-10
  assistive_devices_needed: string[]
}

// Filters and Search Types
export interface TherapyDataFilters {
  session_type?: 'aba' | 'speech' | 'occupational' | 'physical'
  student_id?: string
  therapist_id?: string
  date_from?: string
  date_to?: string
  performance_rating_min?: number
  goals_achieved?: boolean
}

// Goal Tracking Interface
export interface TherapyGoal {
  id: string
  student_id: string
  therapist_id: string
  therapy_type: 'aba' | 'speech' | 'occupational' | 'physical'
  
  // Goal Definition
  goal_category: string
  goal_description: string
  target_behavior: string
  baseline_measurement: GoalMeasurement
  target_criteria: GoalCriteria
  
  // Goal Details
  priority_level: 'high' | 'medium' | 'low'
  goal_status: 'active' | 'achieved' | 'discontinued' | 'modified' | 'paused'
  start_date: string
  target_date: string
  actual_achievement_date?: string
  
  // Progress Tracking
  data_collection_method: string
  measurement_frequency: string
  progress_data: GoalProgressData[]
  
  // Support Information
  strategies_interventions: string[]
  materials_resources: string[]
  environmental_supports: string[]
  
  // Review Information
  review_notes: GoalReviewNote[]
  mastery_criteria_met: boolean
  generalization_settings: string[]
  maintenance_plan: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

export interface GoalMeasurement {
  measurement_type: 'frequency' | 'duration' | 'percentage' | 'rate' | 'level_of_assistance' | 'accuracy'
  baseline_value: number
  baseline_date: string
  measurement_unit: string
  measurement_context: string
}

export interface GoalCriteria {
  target_value: number
  target_unit: string
  success_criteria: string
  consecutive_sessions_required: number
  generalization_required: boolean
  maintenance_period_days: number
}

export interface GoalProgressData {
  id: string
  measurement_date: string
  session_id?: string
  measured_value: number
  measurement_context: string
  notes: string
  recorded_by: string
  trend_direction: 'improving' | 'maintaining' | 'declining'
}

export interface GoalReviewNote {
  id: string
  review_date: string
  review_type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
  progress_summary: string
  current_performance_level: number
  challenges_identified: string[]
  strategy_modifications: string[]
  next_steps: string[]
  reviewed_by: string
}

// Assessment Data Collection Interface
export interface TherapyAssessment {
  id: string
  student_id: string
  assessor_id: string
  assessment_type: 'initial' | 'progress' | 'discharge' | 'annual' | 'diagnostic'
  therapy_domain: 'aba' | 'speech' | 'occupational' | 'physical' | 'multi_domain'
  
  // Assessment Details
  assessment_name: string
  assessment_tool: string
  assessment_date: string
  assessment_location: string
  assessment_duration_minutes: number
  
  // Assessment Areas
  areas_assessed: AssessmentArea[]
  
  // Results
  overall_score?: number
  overall_percentile?: number
  age_equivalent?: string
  standard_scores: AssessmentScore[]
  
  // Clinical Observations
  behavioral_observations: string[]
  environmental_factors: string[]
  student_cooperation_level: number // 1-10
  validity_concerns: string[]
  
  // Recommendations
  strengths_identified: string[]
  areas_of_need: string[]
  recommended_goals: string[]
  service_recommendations: ServiceRecommendation[]
  
  // Follow-up
  reassessment_timeline: string
  monitoring_plan: string
  
  // Documentation
  assessment_report: string
  supporting_documents: string[]
  parent_input: string
  teacher_input: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

export interface AssessmentArea {
  area_name: string
  subdomain: string
  raw_score: number
  standard_score?: number
  percentile?: number
  age_equivalent?: string
  performance_level: 'below_average' | 'low_average' | 'average' | 'high_average' | 'above_average'
  qualitative_description: string
}

export interface AssessmentScore {
  score_type: string
  score_value: number
  confidence_interval?: string
  interpretation: string
}

export interface ServiceRecommendation {
  service_type: 'speech_therapy' | 'occupational_therapy' | 'physical_therapy' | 'aba_therapy' | 'other'
  frequency_per_week: number
  session_duration_minutes: number
  service_delivery_model: 'individual' | 'group' | 'consultation' | 'collaborative'
  setting: 'clinic' | 'school' | 'home' | 'community'
  priority_level: 'high' | 'medium' | 'low'
  justification: string
}

// Progress Tracking Types
export interface ProgressSummary {
  student_id: string
  therapy_type: 'aba' | 'speech' | 'occupational' | 'physical'
  reporting_period: {
    start_date: string
    end_date: string
  }
  
  // Goal Progress
  active_goals_count: number
  achieved_goals_count: number
  modified_goals_count: number
  discontinued_goals_count: number
  
  // Performance Metrics
  average_session_performance: number
  average_engagement_level: number
  total_sessions_completed: number
  attendance_rate: number
  
  // Trends
  overall_progress_trend: 'improving' | 'maintaining' | 'declining'
  areas_of_strength: string[]
  areas_needing_support: string[]
  
  // Recommendations
  next_period_focus: string[]
  strategy_adjustments: string[]
  family_recommendations: string[]
}

// Form Data Types for Creating/Updating
export type CreateTherapyGoal = Omit<TherapyGoal, 'id' | 'created_at' | 'updated_at' | 'created_by'>
export type CreateTherapyAssessment = Omit<TherapyAssessment, 'id' | 'created_at' | 'updated_at' | 'created_by'>

export type CreateABADataCollection = Omit<ABADataCollection, 'id' | 'created_at' | 'updated_at' | 'created_by'>
export type CreateSpeechTherapyDataCollection = Omit<SpeechTherapyDataCollection, 'id' | 'created_at' | 'updated_at' | 'created_by'>
export type CreateOccupationalTherapyDataCollection = Omit<OccupationalTherapyDataCollection, 'id' | 'created_at' | 'updated_at' | 'created_by'>
export type CreatePhysicalTherapyDataCollection = Omit<PhysicalTherapyDataCollection, 'id' | 'created_at' | 'updated_at' | 'created_by'>