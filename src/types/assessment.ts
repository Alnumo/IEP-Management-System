// Assessment & Clinical Documentation Types
// Phase 3: SOAP notes, standardized assessments, and progress tracking

export interface SOAPTemplate {
  id: string
  therapy_program_id?: string
  
  // Template Identification
  template_name_ar: string
  template_name_en: string
  template_code: string
  
  // SOAP Structure Definition
  subjective_fields: any[] // Field definitions for subjective section
  objective_fields: any[] // Field definitions for objective section
  assessment_fields: any[] // Field definitions for assessment section
  plan_fields: any[] // Field definitions for plan section
  
  // Additional Sections
  additional_sections: Record<string, any> // Therapy-specific additional sections
  required_fields: string[] // Fields that must be completed
  conditional_fields: Record<string, any> // Fields shown based on conditions
  
  // Data Validation
  validation_rules: Record<string, any> // Field validation rules
  score_calculations: Record<string, any> // Automatic score calculations
  
  // Template Configuration
  is_active: boolean
  is_default_for_program: boolean
  version: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface AssessmentResult {
  id: string
  student_id: string
  assessment_tool_id: string
  clinical_doc_id?: string
  
  // Assessment Session Details
  assessment_date: string
  assessor_id: string
  assessment_location?: string
  session_duration_minutes?: number
  
  // Assessment Context
  assessment_purpose: 'baseline' | 'progress_monitoring' | 'annual_review' | 'discharge' | 'diagnostic' | 'program_planning' | 'research'
  assessment_conditions?: string // Testing conditions and environment
  accommodations_provided: string[] // Any accommodations used
  
  // Raw Scores and Responses
  raw_scores: Record<string, any> // All raw scores by domain/subtest
  item_responses: Record<string, any> // Individual item responses
  behavioral_observations: Record<string, any> // Observations during testing
  
  // Standard Scores and Interpretations
  standard_scores: Record<string, any> // Converted standard scores
  percentile_ranks: Record<string, any> // Percentile rankings
  age_equivalents: Record<string, any> // Age equivalent scores
  grade_equivalents: Record<string, any> // Grade equivalent scores
  
  // Overall Results
  overall_score?: number
  composite_scores: Record<string, any> // Composite domain scores
  confidence_intervals: Record<string, any> // 95% confidence intervals
  
  // Clinical Interpretation
  interpretation_summary_ar?: string
  interpretation_summary_en?: string
  strengths_identified: string[]
  areas_of_concern: string[]
  
  // Recommendations
  immediate_recommendations: string[]
  long_term_recommendations: string[]
  referrals_suggested: string[]
  reassessment_timeline?: string
  
  // Validity and Reliability
  test_validity: 'valid' | 'questionable' | 'invalid'
  validity_concerns?: string
  cooperation_level?: number // 1-5 scale
  effort_level?: number // 1-5 scale
  
  // Comparison Data
  previous_assessment_id?: string
  change_from_previous: Record<string, any> // Changes since last assessment
  progress_indicators: Record<string, any> // Specific progress measures
  
  // Report Generation
  report_generated: boolean
  report_path?: string // Path to generated report
  report_shared_with_parents: boolean
  report_shared_date?: string
  
  // Status and Approval
  status: 'draft' | 'pending_review' | 'reviewed' | 'approved' | 'finalized'
  reviewed_by?: string
  review_date?: string
  review_notes?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface ProgressTracking {
  id: string
  student_id: string
  program_enrollment_id?: string
  therapy_program_id?: string
  
  // Progress Period
  tracking_period_start: string
  tracking_period_end: string
  measurement_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly'
  
  // Goal-Based Progress
  goals_progress: Record<string, any> // Progress on each individual goal
  goals_achieved: number
  goals_total: number
  goal_achievement_percentage?: number // Generated field
  
  // Skill Acquisition Data
  skills_targeted: number
  skills_emerging: number
  skills_acquired: number
  skills_mastered: number
  skills_generalized: number
  
  // Skill Acquisition Rates
  acquisition_rate_weekly?: number // Skills acquired per week
  mastery_rate_weekly?: number // Skills mastered per week
  generalization_rate?: number // Percentage of mastered skills generalized
  
  // Behavioral Measurements
  target_behaviors: Record<string, any> // Tracked target behaviors
  behavior_frequency_data: Record<string, any> // Frequency measurements
  behavior_duration_data: Record<string, any> // Duration measurements
  behavior_intensity_data: Record<string, any> // Intensity measurements
  
  // Functional Independence
  independence_scores: Record<string, any> // Independence in various domains
  functional_skills_progress: Record<string, any> // Progress in functional skills
  adaptive_behavior_scores: Record<string, any> // Adaptive behavior measurements
  
  // Academic/Developmental Milestones
  developmental_milestones: Record<string, any> // Age-appropriate milestones
  academic_progress: Record<string, any> // Academic skill progress
  cognitive_development: Record<string, any> // Cognitive skill development
  
  // Social-Emotional Progress
  social_skills_progress: Record<string, any> // Social interaction skills
  emotional_regulation: Record<string, any> // Emotional regulation abilities
  communication_progress: Record<string, any> // Communication skill development
  
  // Regression Monitoring
  regression_indicators: Record<string, any> // Signs of skill regression
  regression_alerts: boolean
  regression_severity?: 'mild' | 'moderate' | 'severe'
  regression_response_plan?: string
  
  // Generalization Tracking
  generalization_settings: string[] // Settings where skills are generalized
  generalization_people: string[] // People with whom skills are generalized
  generalization_materials: string[] // Materials across which skills generalize
  generalization_success_rate?: number
  
  // Data Quality Metrics
  data_collection_reliability?: number // Inter-observer agreement
  sessions_with_data: number
  total_sessions: number
  data_completion_rate?: number // Generated field
  
  // Trend Analysis
  trend_direction?: 'improving' | 'stable' | 'declining' | 'variable'
  trend_strength?: number // Correlation coefficient for trend
  predicted_outcome: Record<string, any> // Predictive analytics
  
  // Clinical Significance
  clinically_significant_change: boolean
  effect_size?: number // Statistical effect size
  meaningful_change_indicators: Record<string, any>
  
  // Contextual Factors
  environmental_factors: Record<string, any> // Environmental influences
  family_factors: Record<string, any> // Family-related factors
  medical_factors: Record<string, any> // Medical factors affecting progress
  
  // Progress Summary
  overall_progress_rating?: number // 1-5 scale
  progress_summary_ar?: string
  progress_summary_en?: string
  challenges_identified: string[]
  
  // Recommendations
  intervention_modifications: string[]
  intensity_recommendations?: string
  goal_adjustments: string[]
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TherapeuticGoal {
  id: string
  student_id: string
  program_enrollment_id?: string
  therapy_program_id?: string
  
  // Goal Identification
  goal_number: number
  goal_category: string // communication, motor, social, academic, etc.
  goal_domain: string // specific domain within category
  
  // SMART Goal Structure
  goal_statement_ar: string
  goal_statement_en?: string
  specific_criteria: Record<string, any> // Specific measurable criteria
  measurable_outcomes: Record<string, any> // How progress will be measured
  achievable_steps: string[] // Steps to achieve the goal
  relevant_justification?: string // Why this goal is relevant
  time_bound_deadline?: string
  
  // Goal Hierarchy
  parent_goal_id?: string // For sub-goals
  goal_level: number // 1=main goal, 2=sub-goal, etc.
  prerequisite_goals: string[] // Goals that must be achieved first
  
  // Baseline and Target
  baseline_data: Record<string, any> // Initial performance level
  target_criteria: Record<string, any> // Target performance level
  mastery_criteria_ar?: string
  mastery_criteria_en?: string
  generalization_criteria: string[]
  
  // Progress Tracking Configuration
  measurement_method?: string // How progress is measured
  data_collection_frequency?: string
  progress_indicators: Record<string, any> // What indicates progress
  
  // Current Status
  status: 'active' | 'achieved' | 'discontinued' | 'modified' | 'on_hold'
  progress_percentage: number
  current_performance_level: Record<string, any>
  
  // Achievement Data
  date_initiated: string
  date_achieved?: string
  sessions_to_achieve?: number
  trials_to_mastery?: number
  
  // Intervention Information
  intervention_strategies: string[]
  materials_needed: string[]
  environmental_arrangements?: string
  prompting_procedures: Record<string, any>
  reinforcement_schedule: Record<string, any>
  
  // Team Assignment
  primary_therapist_id?: string
  secondary_therapist_id?: string
  family_involvement_level?: string
  
  // Review and Modification
  last_review_date?: string
  next_review_date?: string
  review_frequency: string
  modification_history: any[]
  
  // Data Quality
  reliability_checks: Record<string, any>
  inter_observer_agreement?: number
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface DevelopmentalMilestone {
  id: string
  
  // Milestone Definition
  milestone_code: string
  milestone_name_ar: string
  milestone_name_en?: string
  
  // Age and Development
  typical_age_months_min?: number
  typical_age_months_max?: number
  developmental_domain?: string // gross_motor, fine_motor, language, social, cognitive
  
  // Description
  description_ar?: string
  description_en?: string
  observable_behaviors: string[]
  assessment_criteria: Record<string, any>
  
  // Prerequisites and Progressions
  prerequisite_milestones: string[]
  next_milestones: string[]
  
  // Documentation
  evidence_source?: string // Research or clinical source
  cultural_considerations?: string
  
  // Status
  is_active: boolean
  
  // Metadata
  created_at: string
}

export interface StudentMilestoneProgress {
  id: string
  student_id: string
  milestone_id: string
  
  // Achievement Status
  status: 'not_emerged' | 'emerging' | 'achieved' | 'mastered' | 'regressed'
  achievement_date?: string
  age_at_achievement_months?: number
  
  // Evidence and Documentation
  evidence_source?: 'observation' | 'assessment' | 'parent_report'
  evidence_description?: string
  documented_by?: string
  
  // Progress Notes
  progress_notes_ar?: string
  progress_notes_en?: string
  support_needed?: 'independent' | 'minimal' | 'moderate' | 'maximum'
  
  // Context
  context_achieved?: 'home' | 'clinic' | 'school' | 'community'
  generalization_contexts: string[]
  
  // Quality Assurance
  verified_by?: string
  verification_date?: string
  confidence_level?: number // 1-5 scale
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface RegressionMonitoring {
  id: string
  student_id: string
  
  // Regression Incident
  detection_date: string
  detected_by?: string
  
  // Regression Details
  skills_affected: string[]
  severity_level: 'mild' | 'moderate' | 'severe' | 'profound'
  domains_affected: string[]
  
  // Regression Pattern
  onset_type: 'gradual' | 'sudden' | 'fluctuating'
  duration_observed?: string // days, weeks, months
  pattern_description?: string
  
  // Baseline Comparison
  previous_performance_level: Record<string, any>
  current_performance_level: Record<string, any>
  percentage_decline?: number
  
  // Contributing Factors
  potential_causes: string[] // medical, environmental, behavioral, unknown
  recent_changes: Record<string, any> // medication, environment, routine
  medical_factors: string[]
  environmental_factors: string[]
  
  // Assessment and Investigation
  formal_assessments_completed: string[]
  medical_consultation_required: boolean
  medical_consultation_completed: boolean
  consultation_findings?: string
  
  // Intervention Response
  intervention_modifications: string[]
  response_plan_implemented?: string
  response_effectiveness?: string
  
  // Recovery Tracking
  recovery_initiated_date?: string
  recovery_milestones: Record<string, any>
  full_recovery_date?: string
  residual_effects: string[]
  
  // Prevention Measures
  prevention_strategies: string[]
  monitoring_modifications: string[]
  early_warning_indicators: string[]
  
  // Team Response
  team_members_notified: string[]
  family_notification_date?: string
  medical_team_notification_date?: string
  
  // Follow-up
  follow_up_assessments: any[]
  long_term_monitoring_plan?: string
  
  // Status
  status: 'active' | 'resolved' | 'monitoring' | 'chronic'
  resolution_date?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// Create/Update types
export interface CreateAssessmentResultData {
  student_id: string
  assessment_tool_id: string
  assessment_date: string
  assessor_id: string
  assessment_purpose: 'baseline' | 'progress_monitoring' | 'annual_review' | 'discharge' | 'diagnostic' | 'program_planning' | 'research'
  raw_scores?: Record<string, any>
  standard_scores?: Record<string, any>
  overall_score?: number
  interpretation_summary_ar?: string
  interpretation_summary_en?: string
}

export interface UpdateAssessmentResultData extends Partial<CreateAssessmentResultData> {
  id: string
  status?: 'draft' | 'pending_review' | 'reviewed' | 'approved' | 'finalized'
  strengths_identified?: string[]
  areas_of_concern?: string[]
  immediate_recommendations?: string[]
  long_term_recommendations?: string[]
}

export interface CreateTherapeuticGoalData {
  student_id: string
  therapy_program_id?: string
  goal_number: number
  goal_category: string
  goal_domain: string
  goal_statement_ar: string
  goal_statement_en?: string
  baseline_data?: Record<string, any>
  target_criteria?: Record<string, any>
  time_bound_deadline?: string
  intervention_strategies?: string[]
}

export interface UpdateTherapeuticGoalData extends Partial<CreateTherapeuticGoalData> {
  id: string
  status?: 'active' | 'achieved' | 'discontinued' | 'modified' | 'on_hold'
  progress_percentage?: number
  current_performance_level?: Record<string, any>
  date_achieved?: string
}

export interface CreateProgressTrackingData {
  student_id: string
  therapy_program_id?: string
  tracking_period_start: string
  tracking_period_end: string
  measurement_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly'
  goals_total?: number
  goals_achieved?: number
  skills_targeted?: number
}

export interface UpdateProgressTrackingData extends Partial<CreateProgressTrackingData> {
  id: string
  goal_achievement_percentage?: number
  trend_direction?: 'improving' | 'stable' | 'declining' | 'variable'
  overall_progress_rating?: number
  progress_summary_ar?: string
  progress_summary_en?: string
}

// Filter and search types
export interface AssessmentResultFilters {
  student_id?: string
  assessment_tool_id?: string
  assessment_purpose?: 'baseline' | 'progress_monitoring' | 'annual_review' | 'discharge' | 'diagnostic' | 'program_planning' | 'research'
  status?: 'draft' | 'pending_review' | 'reviewed' | 'approved' | 'finalized'
  assessor_id?: string
  date_from?: string
  date_to?: string
}

export interface TherapeuticGoalFilters {
  student_id?: string
  therapy_program_id?: string
  goal_category?: string
  status?: 'active' | 'achieved' | 'discontinued' | 'modified' | 'on_hold'
  primary_therapist_id?: string
  deadline_from?: string
  deadline_to?: string
}

export interface ProgressTrackingFilters {
  student_id?: string
  therapy_program_id?: string
  tracking_period_from?: string
  tracking_period_to?: string
  trend_direction?: 'improving' | 'stable' | 'declining' | 'variable'
  regression_alerts?: boolean
}

export interface MilestoneProgressFilters {
  student_id?: string
  milestone_id?: string
  status?: 'not_emerged' | 'emerging' | 'achieved' | 'mastered' | 'regressed'
  developmental_domain?: string
  age_range?: { min: number; max: number }
}

export interface RegressionMonitoringFilters {
  student_id?: string
  severity_level?: 'mild' | 'moderate' | 'severe' | 'profound'
  status?: 'active' | 'resolved' | 'monitoring' | 'chronic'
  detection_date_from?: string
  detection_date_to?: string
  domains_affected?: string
}