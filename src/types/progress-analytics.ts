// Progress Analytics Types
// Comprehensive visual progress tracking and analytics

export interface ProgressDataPoint {
  date: string
  value: number
  session_id?: string
  notes?: string
  context?: string
}

export interface GoalProgressMetrics {
  goal_id: string
  goal_name: string
  therapy_type: 'aba' | 'speech' | 'occupational' | 'physical'
  baseline_value: number
  current_value: number
  target_value: number
  progress_percentage: number
  trend: 'improving' | 'stable' | 'declining'
  velocity: number // rate of change per week
  data_points: ProgressDataPoint[]
  milestones_achieved: Milestone[]
  projected_completion_date?: string
  status: 'not_started' | 'in_progress' | 'achieved' | 'discontinued'
}

export interface Milestone {
  id: string
  description: string
  target_value: number
  achieved: boolean
  achievement_date?: string
  notes?: string
}

export interface TherapyDomainProgress {
  domain: string
  therapy_type: 'aba' | 'speech' | 'occupational' | 'physical'
  overall_progress_percentage: number
  active_goals_count: number
  achieved_goals_count: number
  total_goals_count: number
  average_progress_rate: number
  strengths: string[]
  areas_for_improvement: string[]
  recent_achievements: string[]
  upcoming_milestones: string[]
}

export interface StudentProgressSummary {
  student_id: string
  student_name: string
  assessment_period: {
    start_date: string
    end_date: string
  }
  overall_progress_score: number
  therapy_domains: TherapyDomainProgress[]
  goal_metrics: GoalProgressMetrics[]
  session_attendance: AttendanceMetrics
  behavioral_trends: BehavioralTrend[]
  skill_acquisition_rate: SkillAcquisitionMetrics
  recommendations: ProgressRecommendation[]
  next_review_date: string
}

export interface AttendanceMetrics {
  total_scheduled_sessions: number
  attended_sessions: number
  cancelled_sessions: number
  makeup_sessions: number
  attendance_percentage: number
  consistency_score: number
  attendance_trend: 'improving' | 'stable' | 'declining'
  monthly_breakdown: MonthlyAttendance[]
}

export interface MonthlyAttendance {
  month: string
  scheduled: number
  attended: number
  percentage: number
}

export interface BehavioralTrend {
  behavior_category: string
  trend_direction: 'improving' | 'stable' | 'worsening'
  frequency_change_percentage: number
  intensity_change_percentage: number
  duration_change_percentage: number
  data_points: ProgressDataPoint[]
  intervention_effectiveness: number
}

export interface SkillAcquisitionMetrics {
  new_skills_acquired: number
  skills_in_progress: number
  skill_generalization_rate: number
  maintenance_success_rate: number
  learning_velocity: number
  difficulty_level_progression: DifficultyProgression[]
}

export interface DifficultyProgression {
  skill_domain: string
  beginner_skills: number
  intermediate_skills: number
  advanced_skills: number
  mastery_level_distribution: Record<string, number>
}

export interface ProgressRecommendation {
  category: 'goal_adjustment' | 'intervention_modification' | 'frequency_change' | 'additional_support' | 'celebration'
  priority: 'high' | 'medium' | 'low'
  recommendation: string
  rationale: string
  implementation_timeline: string
  expected_outcome: string
}

// Chart and Visualization Types
export interface ChartConfiguration {
  chart_type: 'line' | 'bar' | 'area' | 'scatter' | 'pie' | 'radar' | 'heatmap'
  title: string
  x_axis_label: string
  y_axis_label: string
  color_scheme: string[]
  show_trend_line: boolean
  show_target_line: boolean
  show_baseline: boolean
  time_range_filter: TimeRangeFilter
}

export interface TimeRangeFilter {
  range_type: 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom'
  start_date?: string
  end_date?: string
}

export interface ProgressVisualization {
  id: string
  title: string
  description: string
  chart_config: ChartConfiguration
  data_source: string
  filters: ProgressFilter[]
  refresh_interval: number
  last_updated: string
}

export interface ProgressFilter {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains'
  value: any
  display_name: string
}

// Analytics Dashboard Types
export interface DashboardWidget {
  id: string
  title: string
  widget_type: 'chart' | 'metric' | 'table' | 'progress_bar' | 'gauge'
  position: WidgetPosition
  size: WidgetSize
  data_config: WidgetDataConfig
  styling: WidgetStyling
}

export interface WidgetPosition {
  x: number
  y: number
  row: number
  column: number
}

export interface WidgetSize {
  width: number
  height: number
  min_width?: number
  min_height?: number
}

export interface WidgetDataConfig {
  data_source: string
  metrics: string[]
  filters: ProgressFilter[]
  aggregation: 'sum' | 'average' | 'count' | 'max' | 'min' | 'latest'
  grouping?: string[]
}

export interface WidgetStyling {
  background_color?: string
  text_color?: string
  border_color?: string
  font_size?: 'small' | 'medium' | 'large'
  chart_colors?: string[]
}

export interface AnalyticsDashboard {
  id: string
  name: string
  description: string
  user_type: 'therapist' | 'admin' | 'parent' | 'student'
  layout: 'grid' | 'flexible'
  widgets: DashboardWidget[]
  filters: ProgressFilter[]
  refresh_settings: RefreshSettings
  sharing_permissions: SharingPermission[]
  created_at: string
  updated_at: string
}

export interface RefreshSettings {
  auto_refresh: boolean
  refresh_interval_minutes: number
  last_refresh: string
}

export interface SharingPermission {
  user_id: string
  permission_level: 'view' | 'edit' | 'admin'
  granted_by: string
  granted_at: string
}

// Comparative Analytics
export interface ProgressComparison {
  comparison_type: 'peer_group' | 'historical_self' | 'normative_data' | 'sibling'
  baseline_period: string
  comparison_period: string
  metrics_compared: ComparisonMetric[]
  statistical_significance: StatisticalTest[]
  summary: string
  recommendations: string[]
}

export interface ComparisonMetric {
  metric_name: string
  baseline_value: number
  comparison_value: number
  change_percentage: number
  change_direction: 'improvement' | 'decline' | 'stable'
  confidence_level: number
  clinical_significance: boolean
}

export interface StatisticalTest {
  test_type: 't_test' | 'chi_square' | 'anova' | 'correlation'
  p_value: number
  effect_size: number
  confidence_interval: string
  interpretation: string
}

// Predictive Analytics
export interface ProgressPrediction {
  goal_id: string
  prediction_model: 'linear_regression' | 'polynomial' | 'exponential' | 'machine_learning'
  predicted_completion_date: string
  confidence_interval: string
  accuracy_percentage: number
  factors_influencing: PredictionFactor[]
  alternative_scenarios: PredictionScenario[]
}

export interface PredictionFactor {
  factor_name: string
  influence_weight: number
  current_value: any
  optimal_value: any
  impact_on_timeline: string
}

export interface PredictionScenario {
  scenario_name: string
  assumptions: string[]
  predicted_outcome: string
  timeline_adjustment: string
  probability: number
}

// Progress Reporting
export interface ProgressReport {
  id: string
  report_type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'
  student_id: string
  reporting_period: {
    start_date: string
    end_date: string
  }
  executive_summary: string
  progress_highlights: string[]
  areas_of_concern: string[]
  goal_status_summary: GoalStatusSummary[]
  behavioral_analysis: BehavioralAnalysisReport
  skill_development: SkillDevelopmentReport
  recommendations: ProgressRecommendation[]
  next_steps: string[]
  attachments: ReportAttachment[]
  generated_at: string
  generated_by: string
}

export interface GoalStatusSummary {
  goal_id: string
  goal_description: string
  status: 'achieved' | 'on_track' | 'at_risk' | 'discontinued'
  progress_percentage: number
  key_achievements: string[]
  challenges_encountered: string[]
  modifications_made: string[]
}

export interface BehavioralAnalysisReport {
  target_behaviors: BehaviorAnalysis[]
  replacement_behaviors: BehaviorAnalysis[]
  environmental_factors: string[]
  intervention_effectiveness: InterventionEffectiveness[]
}

export interface BehaviorAnalysis {
  behavior_name: string
  frequency_trend: 'increasing' | 'decreasing' | 'stable'
  intensity_trend: 'increasing' | 'decreasing' | 'stable'
  duration_trend: 'increasing' | 'decreasing' | 'stable'
  antecedent_patterns: string[]
  consequence_patterns: string[]
  functional_analysis: string
}

export interface InterventionEffectiveness {
  intervention_name: string
  effectiveness_rating: number
  data_supporting: string[]
  side_effects: string[]
  fidelity_rating: number
  cost_benefit_analysis: string
}

export interface SkillDevelopmentReport {
  domains_assessed: SkillDomainReport[]
  cross_domain_skills: string[]
  generalization_successes: string[]
  maintenance_status: string[]
  emerging_skills: string[]
}

export interface SkillDomainReport {
  domain_name: string
  skills_mastered: string[]
  skills_in_progress: string[]
  skills_not_yet_introduced: string[]
  mastery_timeline: SkillMasteryTimeline[]
}

export interface SkillMasteryTimeline {
  skill_name: string
  introduction_date: string
  mastery_date?: string
  maintenance_checks: MaintenanceCheck[]
}

export interface MaintenanceCheck {
  check_date: string
  performance_level: number
  notes: string
  intervention_needed: boolean
}

export interface ReportAttachment {
  id: string
  filename: string
  file_type: string
  description: string
  attachment_date: string
}

// Report Options
export interface ReportOptions {
  format: 'pdf' | 'excel' | 'word' | 'html'
  template_id?: string
  template?: string
  include_charts: boolean
  include_raw_data: boolean
  language: 'en' | 'ar'
  delivery_method?: 'download' | 'email' | 'print'
  recipients?: string[]
  custom_fields?: Record<string, any>
}

// Form Data Types
export type CreateProgressReport = Omit<ProgressReport, 'id' | 'generated_at' | 'generated_by'>
export type CreateAnalyticsDashboard = Omit<AnalyticsDashboard, 'id' | 'created_at' | 'updated_at'>
export type UpdateProgressMetrics = Partial<GoalProgressMetrics>