// Standardized Assessment Tools Types
// Comprehensive interfaces for evidence-based assessment tools

export interface StandardizedAssessmentTool {
  id: string
  name: string
  acronym: string
  version?: string
  domain: 'aba' | 'speech' | 'occupational' | 'physical' | 'multi_domain'
  age_range: AgeRange
  administration_time: number // minutes
  description: string
  purpose: string[]
  areas_assessed: string[]
  scoring_method: ScoringMethod
  reliability_validity: ReliabilityInfo
  normative_sample: NormativeSample
  interpretation_guidelines: InterpretationGuideline[]
  cultural_considerations: string[]
  training_requirements: string[]
  publisher: string
  publication_year: number
  cost_category: 'free' | 'low' | 'moderate' | 'high'
}

export interface AgeRange {
  minimum_months: number
  maximum_months: number
  optimal_range?: {
    minimum_months: number
    maximum_months: number
  }
}

export interface ScoringMethod {
  score_types: ScoreType[]
  calculation_method: string
  interpretation_levels: string[]
  cutoff_scores?: CutoffScore[]
  percentile_ranks: boolean
  standard_scores: boolean
  age_equivalents: boolean
}

export interface ScoreType {
  type: 'raw' | 'standard' | 'scaled' | 'percentile' | 'age_equivalent' | 'composite'
  range: {
    minimum: number
    maximum: number
  }
  mean?: number
  standard_deviation?: number
  description: string
}

export interface CutoffScore {
  level: string
  score_threshold: number
  interpretation: string
  recommendation: string
}

export interface ReliabilityInfo {
  internal_consistency: number[] // Chronbach's alpha values
  test_retest_reliability: number[]
  inter_rater_reliability?: number[]
  standard_error_measurement: number[]
  confidence_intervals: string[]
}

export interface NormativeSample {
  sample_size: number
  age_groups: AgeGroup[]
  demographic_breakdown: DemographicInfo
  geographic_distribution: string[]
  socioeconomic_representation: string[]
  cultural_linguistic_diversity: string[]
  special_populations_included: string[]
}

export interface AgeGroup {
  age_range: AgeRange
  sample_size: number
  gender_distribution: {
    male_percentage: number
    female_percentage: number
  }
}

export interface DemographicInfo {
  ethnicity_breakdown: Record<string, number>
  language_background: Record<string, number>
  disability_status: Record<string, number>
  geographic_regions: Record<string, number>
}

export interface InterpretationGuideline {
  score_range: {
    minimum: number
    maximum: number
  }
  classification: string
  interpretation: string
  clinical_implications: string[]
  recommended_actions: string[]
}

// Specific Assessment Tool Implementations

// ABA Assessment Tools
export interface VBMAPPAssessment {
  tool_info: StandardizedAssessmentTool
  milestones: VBMAPPMilestone[]
  barriers: VBMAPPBarrier[]
  transition: VBMAPPTransition[]
  task_analysis: VBMAPPTaskAnalysis[]
  placement_recommendations: PlacementRecommendation[]
}

export interface VBMAPPMilestone {
  level: 1 | 2 | 3
  domain: 'mand' | 'tact' | 'listener' | 'visual_perceptual' | 'independent_play' | 'social' | 'motor_imitation' | 'echoic' | 'spontaneous_vocal' | 'listener_responding' | 'intraverbal' | 'classroom' | 'linguistic_structure' | 'group' | 'reading' | 'writing' | 'math'
  milestone_number: number
  description: string
  criteria: string
  scored: boolean
  score_date?: string
  notes?: string
}

export interface VBMAPPBarrier {
  barrier_type: 'instructional_control' | 'absent_mand' | 'impaired_tact' | 'impaired_motor_imitation' | 'impaired_echoic' | 'impaired_matching' | 'impaired_listener' | 'impaired_intraverbal' | 'impaired_social' | 'prompt_dependent' | 'scrolling' | 'impaired_scanning' | 'failure_to_generalize' | 'weak_conditional_discriminations' | 'impaired_verbal_conditional_discriminations'
  level: 1 | 2 | 3 | 4
  present: boolean
  intervention_priority: 'high' | 'medium' | 'low'
  strategies_recommended: string[]
}

export interface VBMAPPTransition {
  area: string
  skill_description: string
  current_level: number
  target_level: number
  intervention_strategies: string[]
  timeline: string
}

export interface VBMAPPTaskAnalysis {
  skill_area: string
  task_components: TaskComponent[]
  teaching_procedures: string[]
  data_collection_method: string
  mastery_criteria: string
}

export interface TaskComponent {
  step_number: number
  description: string
  mastered: boolean
  teaching_method: string
  notes?: string
}

export interface PlacementRecommendation {
  current_score: number
  recommended_placement: 'early_intervention' | 'special_education_classroom' | 'inclusion_with_support' | 'typical_classroom' | 'vocational_training'
  rationale: string
  support_level: 'intensive' | 'moderate' | 'minimal' | 'none'
  specific_recommendations: string[]
}

// Speech Language Assessment Tools
export interface CELFAssessment {
  tool_info: StandardizedAssessmentTool
  core_subtests: CELFSubtest[]
  supplementary_subtests: CELFSubtest[]
  index_scores: CELFIndexScore[]
  observational_rating_scale: CELFObservationalRating[]
  pragmatic_profile: CELFPragmaticProfile
}

export interface CELFSubtest {
  subtest_name: string
  domain: 'receptive' | 'expressive' | 'language_content' | 'language_structure' | 'language_memory'
  raw_score: number
  scaled_score: number
  percentile: number
  age_equivalent: string
  interpretation: string
  strengths: string[]
  weaknesses: string[]
  error_analysis: ErrorPattern[]
}

export interface CELFIndexScore {
  index_name: 'core_language' | 'receptive_language' | 'expressive_language' | 'language_content' | 'language_structure' | 'working_memory'
  standard_score: number
  percentile: number
  confidence_interval: string
  classification: string
  interpretation: string
}

export interface CELFObservationalRating {
  behavior_category: string
  rating_scale: 1 | 2 | 3 | 4 | 5
  description: string
  clinical_significance: boolean
  recommendations: string[]
}

export interface CELFPragmaticProfile {
  total_score: number
  percentile: number
  interpretation: string
  problem_areas: string[]
  strengths: string[]
  intervention_priorities: string[]
}

export interface ErrorPattern {
  error_type: string
  frequency: number
  examples: string[]
  clinical_significance: boolean
  intervention_targets: string[]
}

// Occupational Therapy Assessment Tools
export interface BOT2Assessment {
  tool_info: StandardizedAssessmentTool
  subtests: BOT2Subtest[]
  composite_scores: BOT2CompositeScore[]
  motor_areas: BOT2MotorArea[]
  intervention_recommendations: BOT2InterventionRec[]
}

export interface BOT2Subtest {
  subtest_name: string
  motor_area: 'fine_motor_precision' | 'fine_motor_integration' | 'manual_dexterity' | 'bilateral_coordination' | 'balance' | 'running_speed_agility' | 'upper_limb_coordination' | 'strength'
  raw_score: number
  scale_score: number
  percentile: number
  descriptor: 'well_above_average' | 'above_average' | 'average' | 'below_average' | 'well_below_average'
  age_equivalent: string
  item_analysis: BOT2ItemAnalysis[]
}

export interface BOT2CompositeScore {
  composite_name: 'total_motor_composite' | 'fine_motor_composite' | 'gross_motor_composite' | 'fine_manual_control' | 'manual_coordination' | 'body_coordination' | 'strength_agility'
  standard_score: number
  percentile: number
  confidence_interval: string
  descriptor: string
  interpretation: string
}

export interface BOT2MotorArea {
  area_name: string
  performance_level: string
  specific_deficits: string[]
  compensatory_strategies: string[]
  intervention_priorities: string[]
}

export interface BOT2InterventionRec {
  deficit_area: string
  severity: 'mild' | 'moderate' | 'severe'
  recommended_frequency: string
  intervention_strategies: string[]
  environmental_modifications: string[]
  equipment_recommendations: string[]
}

export interface BOT2ItemAnalysis {
  item_number: number
  item_description: string
  score: number
  qualitative_observations: string[]
  error_patterns: string[]
}

// Physical Therapy Assessment Tools
export interface PDMS2Assessment {
  tool_info: StandardizedAssessmentTool
  subtests: PDMS2Subtest[]
  composite_scores: PDMS2CompositeScore[]
  developmental_profile: PDMS2DevelopmentalProfile
  intervention_plan: PDMS2InterventionPlan
}

export interface PDMS2Subtest {
  subtest_name: string
  motor_domain: 'reflexes' | 'stationary' | 'locomotion' | 'object_manipulation' | 'grasping' | 'visual_motor_integration'
  raw_score: number
  age_equivalent: string
  percentile: number
  standard_score: number
  motor_quotient_contribution: number
  item_scores: PDMS2ItemScore[]
}

export interface PDMS2CompositeScore {
  composite_name: 'gross_motor_quotient' | 'fine_motor_quotient' | 'total_motor_quotient'
  quotient_score: number
  percentile: number
  confidence_interval: string
  classification: string
  interpretation: string
}

export interface PDMS2DevelopmentalProfile {
  chronological_age_months: number
  motor_age_equivalent: number
  developmental_delay_months: number
  relative_strengths: string[]
  relative_weaknesses: string[]
  intervention_priorities: string[]
}

export interface PDMS2InterventionPlan {
  goals: PDMS2Goal[]
  recommended_frequency: string
  service_delivery_model: string
  environmental_recommendations: string[]
  family_education_topics: string[]
}

export interface PDMS2Goal {
  domain: string
  goal_description: string
  baseline_performance: string
  target_criteria: string
  intervention_strategies: string[]
  measurement_method: string
}

export interface PDMS2ItemScore {
  item_number: number
  item_description: string
  score: 0 | 1 | 2
  qualitative_notes: string
  teaching_suggestions: string[]
}

// Assessment Administration and Interpretation
export interface AssessmentSession {
  id: string
  student_id: string
  assessor_id: string
  assessment_tool_id: string
  session_date: string
  session_duration_minutes: number
  session_location: string
  
  // Pre-assessment
  preparation_completed: boolean
  materials_prepared: string[]
  environment_optimized: boolean
  student_rapport_established: boolean
  
  // Administration
  administration_fidelity: AdministrationFidelity
  behavioral_observations: SessionObservation[]
  modifications_made: AssessmentModification[]
  validity_indicators: ValidityIndicator[]
  
  // Scoring and Interpretation
  raw_data: Record<string, any>
  calculated_scores: CalculatedScore[]
  interpretation_summary: string
  confidence_level: 'high' | 'moderate' | 'low'
  
  // Recommendations
  immediate_findings: string[]
  further_assessment_needed: string[]
  intervention_priorities: string[]
  
  // Documentation
  session_notes: string
  follow_up_actions: string[]
  report_completed: boolean
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

export interface AdministrationFidelity {
  standardized_instructions_followed: boolean
  timing_procedures_adhered: boolean
  scoring_accuracy_verified: boolean
  environmental_standards_met: boolean
  fidelity_percentage: number
  deviations_documented: string[]
}

export interface SessionObservation {
  time_stamp: string
  observation_category: 'attention' | 'motivation' | 'fatigue' | 'anxiety' | 'cooperation' | 'communication' | 'motor_behavior'
  observation_description: string
  impact_on_performance: 'none' | 'minimal' | 'moderate' | 'significant'
  intervention_applied: string
}

export interface AssessmentModification {
  modification_type: 'timing' | 'instruction' | 'response_mode' | 'environmental' | 'motivational'
  modification_description: string
  rationale: string
  impact_on_validity: boolean
  documentation_required: boolean
}

export interface ValidityIndicator {
  indicator_type: 'cooperation' | 'understanding' | 'effort' | 'attention' | 'fatigue' | 'anxiety'
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  impact_on_interpretation: string
  recommendations: string[]
}

export interface CalculatedScore {
  score_type: string
  raw_score: number
  derived_score: number
  percentile?: number
  confidence_interval?: string
  interpretation: string
  clinical_significance: boolean
}

// Assessment Report Generation
export interface StandardizedAssessmentReport {
  id: string
  assessment_session_id: string
  report_type: 'comprehensive' | 'summary' | 'progress' | 'diagnostic'
  
  // Report Sections
  executive_summary: string
  background_information: BackgroundInfo
  assessment_procedures: AssessmentProceduresSummary
  results_interpretation: ResultsInterpretation
  clinical_impressions: ClinicalImpressions
  recommendations: RecommendationsSummary
  
  // Report Metadata
  report_date: string
  author_credentials: string
  review_status: 'draft' | 'reviewed' | 'final'
  distribution_list: string[]
  
  created_at: string
  updated_at: string
  created_by: string
}

export interface BackgroundInfo {
  referral_reason: string
  developmental_history: string
  medical_history: string
  educational_history: string
  previous_assessments: string[]
  family_concerns: string[]
  cultural_considerations: string[]
}

export interface AssessmentProceduresSummary {
  tools_administered: string[]
  session_details: string
  environmental_conditions: string
  student_behavior_cooperation: string
  validity_considerations: string
  limitations: string[]
}

export interface ResultsInterpretation {
  overall_performance_summary: string
  domain_specific_results: DomainResult[]
  comparative_analysis: string
  pattern_analysis: string
  diagnostic_considerations: string[]
}

export interface DomainResult {
  domain_name: string
  performance_level: string
  standard_scores: number[]
  percentiles: number[]
  age_equivalents: string[]
  strengths: string[]
  weaknesses: string[]
  clinical_observations: string[]
}

export interface ClinicalImpressions {
  diagnostic_impressions: string[]
  severity_ratings: SeverityRating[]
  prognostic_indicators: string[]
  risk_factors: string[]
  protective_factors: string[]
}

export interface SeverityRating {
  domain: string
  severity: 'within_normal_limits' | 'mild' | 'moderate' | 'severe' | 'profound'
  rationale: string
  functional_impact: string
}

export interface RecommendationsSummary {
  service_recommendations: ServiceRecommendation[]
  educational_recommendations: string[]
  family_recommendations: string[]
  environmental_modifications: string[]
  follow_up_assessments: FollowUpAssessment[]
  monitoring_plan: string
}

export interface ServiceRecommendation {
  service_type: string
  frequency: string
  duration: string
  intensity: string
  setting: string
  provider_qualifications: string[]
  specific_focus_areas: string[]
  rationale: string
}

export interface FollowUpAssessment {
  assessment_type: string
  timeframe: string
  rationale: string
  specific_areas_focus: string[]
}

// Form Data Types
export type CreateAssessmentSession = Omit<AssessmentSession, 'id' | 'created_at' | 'updated_at' | 'created_by'>
export type CreateAssessmentReport = Omit<StandardizedAssessmentReport, 'id' | 'created_at' | 'updated_at' | 'created_by'>