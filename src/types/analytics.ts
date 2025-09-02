/**
 * Analytics and Reporting Types
 * Comprehensive TypeScript interfaces for IEP analytics, reporting, and dashboard systems
 */

// Core analytics types
export type AnalyticsTimeframe = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type AnalyticsMetric = 'count' | 'percentage' | 'average' | 'sum' | 'median' | 'max' | 'min';
export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile';
export type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant' | 'unknown';
export type ReportFormat = 'json' | 'csv' | 'excel' | 'pdf';

// Dashboard and KPI types
export interface DashboardKPI {
  id: string;
  title_ar: string;
  title_en: string;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  trend_direction: TrendDirection;
  target_value?: number;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  icon: string;
  description_ar: string;
  description_en: string;
  last_updated: string;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title_ar: string;
  title_en: string;
  position: WidgetPosition;
  size: WidgetSize;
  data_source: string;
  configuration: WidgetConfiguration;
  is_visible: boolean;
  requires_permissions: string[];
  refresh_interval: number; // seconds
  last_updated: string;
}

export type WidgetType = 
  | 'kpi_card'
  | 'chart_line'
  | 'chart_bar'
  | 'chart_pie'
  | 'chart_area'
  | 'table'
  | 'progress_bar'
  | 'gauge'
  | 'heatmap'
  | 'timeline'
  | 'comparison'
  | 'trend_indicator';

export interface WidgetPosition {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface WidgetSize {
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
}

export interface WidgetConfiguration {
  chart_type?: string;
  color_scheme?: string[];
  show_legend?: boolean;
  show_grid?: boolean;
  show_values?: boolean;
  aggregation?: AnalyticsMetric;
  timeframe?: AnalyticsTimeframe;
  filters?: Record<string, any>;
  data_limit?: number;
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// IEP Analytics types
export interface IEPAnalytics {
  overview: IEPOverviewAnalytics;
  students: StudentAnalytics;
  goals: GoalAnalytics;
  services: ServiceAnalytics;
  compliance: ComplianceAnalytics;
  performance: PerformanceAnalytics;
  trends: TrendAnalytics;
  predictions: PredictionAnalytics;
}

export interface IEPOverviewAnalytics {
  total_ieps: number;
  active_ieps: number;
  draft_ieps: number;
  completed_ieps: number;
  overdue_reviews: number;
  upcoming_reviews: number;
  compliance_rate: number;
  average_goals_per_iep: number;
  total_students_served: number;
  iep_distribution: {
    by_type: Record<string, number>;
    by_grade_level: Record<string, number>;
    by_disability_category: Record<string, number>;
    by_placement: Record<string, number>;
  };
  monthly_trends: MonthlyTrend[];
}

export interface StudentAnalytics {
  total_students: number;
  active_students: number;
  new_referrals: number;
  graduated_students: number;
  age_distribution: AgeDistribution[];
  grade_distribution: GradeDistribution[];
  disability_categories: DisabilityCategory[];
  gender_distribution: {
    male: number;
    female: number;
  };
  enrollment_trends: EnrollmentTrend[];
  outcomes: StudentOutcomes;
}

export interface GoalAnalytics {
  total_goals: number;
  achieved_goals: number;
  in_progress_goals: number;
  not_met_goals: number;
  goal_achievement_rate: number;
  average_time_to_achieve: number; // days
  goal_distribution: {
    by_domain: Record<string, number>;
    by_skill_area: Record<string, number>;
    by_measurement_type: Record<string, number>;
  };
  mastery_trends: MasteryTrend[];
  benchmark_comparisons: BenchmarkComparison[];
  predictive_insights: GoalPrediction[];
}

export interface ServiceAnalytics {
  total_services: number;
  active_services: number;
  service_hours: {
    planned: number;
    delivered: number;
    remaining: number;
    completion_rate: number;
  };
  service_distribution: {
    by_type: Record<string, number>;
    by_frequency: Record<string, number>;
    by_provider: Record<string, ServiceProvider>;
  };
  efficiency_metrics: ServiceEfficiencyMetrics;
  provider_performance: ProviderPerformance[];
  utilization_trends: ServiceUtilizationTrend[];
}

export interface ComplianceAnalytics {
  overall_compliance_score: number;
  compliance_areas: ComplianceArea[];
  violation_trends: ViolationTrend[];
  audit_results: AuditResult[];
  deadlines: DeadlineTracking;
  documentation_completeness: DocumentationCompleteness;
  risk_assessment: RiskAssessment;
}

export interface PerformanceAnalytics {
  system_performance: {
    average_response_time: number;
    uptime_percentage: number;
    error_rate: number;
    user_satisfaction: number;
  };
  user_engagement: {
    active_users: number;
    session_duration: number;
    feature_usage: Record<string, number>;
    login_frequency: number;
  };
  workflow_efficiency: {
    average_iep_creation_time: number;
    average_review_time: number;
    bottlenecks: WorkflowBottleneck[];
  };
}

// Detailed analytics interfaces
export interface MonthlyTrend {
  month: string;
  year: number;
  value: number;
  change_from_previous: number;
  trend_direction: TrendDirection;
}

export interface AgeDistribution {
  age_range: string;
  count: number;
  percentage: number;
}

export interface GradeDistribution {
  grade_level: string;
  count: number;
  percentage: number;
}

export interface DisabilityCategory {
  category: string;
  category_ar: string;
  category_en: string;
  count: number;
  percentage: number;
  trend: TrendDirection;
}

export interface EnrollmentTrend {
  date: string;
  new_enrollments: number;
  total_active: number;
  graduations: number;
  transfers: number;
}

export interface StudentOutcomes {
  academic_progress: {
    improved: number;
    maintained: number;
    declined: number;
  };
  behavioral_progress: {
    improved: number;
    maintained: number;
    declined: number;
  };
  post_secondary_readiness: number;
  employment_readiness: number;
}

export interface MasteryTrend {
  date: string;
  total_goals: number;
  mastered_goals: number;
  mastery_rate: number;
  average_progress: number;
}

export interface BenchmarkComparison {
  metric: string;
  metric_ar: string;
  metric_en: string;
  current_value: number;
  benchmark_value: number;
  percentile_rank: number;
  comparison_group: string;
}

export interface GoalPrediction {
  goal_id: string;
  goal_description_ar: string;
  goal_description_en: string;
  current_progress: number;
  predicted_mastery_date: string;
  confidence_level: number;
  risk_factors: string[];
  recommended_actions: string[];
}

export interface ServiceProvider {
  id: string;
  name_ar: string;
  name_en: string;
  specialization: string;
  total_hours: number;
  completion_rate: number;
  effectiveness_score: number;
}

export interface ServiceEfficiencyMetrics {
  average_session_duration: number;
  no_show_rate: number;
  cancellation_rate: number;
  rescheduling_rate: number;
  resource_utilization: number;
  cost_per_hour: number;
  outcome_effectiveness: number;
}

export interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  total_students: number;
  average_progress_rate: number;
  goal_achievement_rate: number;
  attendance_rate: number;
  satisfaction_score: number;
  efficiency_rating: number;
}

export interface ServiceUtilizationTrend {
  date: string;
  total_scheduled_hours: number;
  delivered_hours: number;
  utilization_rate: number;
  efficiency_score: number;
}

export interface ComplianceArea {
  area: string;
  area_ar: string;
  area_en: string;
  current_score: number;
  target_score: number;
  last_audit_date: string;
  violations: number;
  trend: TrendDirection;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ViolationTrend {
  date: string;
  total_violations: number;
  resolved_violations: number;
  pending_violations: number;
  new_violations: number;
}

export interface AuditResult {
  audit_id: string;
  audit_date: string;
  audit_type: string;
  overall_score: number;
  findings: AuditFinding[];
  recommendations: string[];
  follow_up_required: boolean;
  next_audit_date: string;
}

export interface AuditFinding {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description_ar: string;
  description_en: string;
  corrective_action: string;
  deadline: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface DeadlineTracking {
  upcoming_deadlines: DeadlineItem[];
  overdue_items: DeadlineItem[];
  completed_on_time: number;
  completion_rate: number;
}

export interface DeadlineItem {
  item_id: string;
  item_type: string;
  description_ar: string;
  description_en: string;
  due_date: string;
  days_remaining: number;
  assigned_to: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface DocumentationCompleteness {
  overall_completeness: number;
  iep_completeness: number;
  assessment_completeness: number;
  progress_notes_completeness: number;
  meeting_documentation: number;
  incomplete_items: IncompleteItem[];
}

export interface IncompleteItem {
  item_id: string;
  item_type: string;
  description_ar: string;
  description_en: string;
  missing_fields: string[];
  assigned_to: string;
  priority: number;
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_categories: RiskCategory[];
  mitigation_strategies: MitigationStrategy[];
  monitoring_requirements: MonitoringRequirement[];
}

export interface RiskCategory {
  category: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  risk_score: number;
  description_ar: string;
  description_en: string;
  mitigation_actions: string[];
}

export interface MitigationStrategy {
  strategy_id: string;
  description_ar: string;
  description_en: string;
  effectiveness: number;
  implementation_cost: number;
  timeline: string;
  responsible_party: string;
}

export interface MonitoringRequirement {
  requirement_id: string;
  description_ar: string;
  description_en: string;
  frequency: string;
  method: string;
  responsible_party: string;
  alert_threshold: number;
}

export interface WorkflowBottleneck {
  process_name: string;
  bottleneck_stage: string;
  average_delay: number; // hours
  frequency: number;
  impact_score: number;
  suggested_improvements: string[];
}

// Trend analysis types
export interface TrendAnalytics {
  enrollment_trends: TrendData;
  goal_achievement_trends: TrendData;
  service_delivery_trends: TrendData;
  compliance_trends: TrendData;
  outcome_trends: TrendData;
  seasonal_patterns: SeasonalPattern[];
  comparative_analysis: ComparativeAnalysis;
}

export interface TrendData {
  metric_name: string;
  timeframe: AnalyticsTimeframe;
  data_points: DataPoint[];
  trend_direction: TrendDirection;
  correlation_coefficient: number;
  forecasted_values: ForecastPoint[];
  confidence_intervals: ConfidenceInterval[];
}

export interface DataPoint {
  date: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ForecastPoint {
  date: string;
  predicted_value: number;
  confidence_level: number;
  upper_bound: number;
  lower_bound: number;
}

export interface ConfidenceInterval {
  date: string;
  upper_bound: number;
  lower_bound: number;
  confidence_level: number;
}

export interface SeasonalPattern {
  pattern_name: string;
  pattern_type: 'monthly' | 'quarterly' | 'seasonal' | 'cyclical';
  strength: number;
  peak_periods: string[];
  low_periods: string[];
  impact_magnitude: number;
}

export interface ComparativeAnalysis {
  peer_comparisons: PeerComparison[];
  historical_comparisons: HistoricalComparison[];
  benchmark_analysis: BenchmarkAnalysis;
}

export interface PeerComparison {
  metric: string;
  our_value: number;
  peer_average: number;
  percentile_rank: number;
  comparison_group: string;
  sample_size: number;
}

export interface HistoricalComparison {
  metric: string;
  current_period: number;
  previous_period: number;
  change_percentage: number;
  change_significance: 'significant' | 'not_significant';
}

export interface BenchmarkAnalysis {
  benchmarks: Benchmark[];
  performance_gaps: PerformanceGap[];
  improvement_opportunities: ImprovementOpportunity[];
}

export interface Benchmark {
  name: string;
  target_value: number;
  current_value: number;
  achievement_percentage: number;
  trend: TrendDirection;
}

export interface PerformanceGap {
  area: string;
  current_performance: number;
  target_performance: number;
  gap_size: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_improvement_time: string;
}

export interface ImprovementOpportunity {
  opportunity_id: string;
  description_ar: string;
  description_en: string;
  potential_impact: number;
  implementation_effort: 'low' | 'medium' | 'high';
  estimated_roi: number;
  timeline: string;
}

// Prediction analytics types
export interface PredictionAnalytics {
  student_outcomes: StudentOutcomePrediction[];
  goal_achievement: GoalAchievementPrediction[];
  service_needs: ServiceNeedPrediction[];
  compliance_risks: ComplianceRiskPrediction[];
  resource_requirements: ResourceRequirementPrediction[];
  early_warning_indicators: EarlyWarningIndicator[];
}

export interface StudentOutcomePrediction {
  student_id: string;
  prediction_type: 'academic' | 'behavioral' | 'transition' | 'graduation';
  predicted_outcome: string;
  confidence_level: number;
  contributing_factors: Factor[];
  recommended_interventions: Intervention[];
  timeline: string;
}

export interface GoalAchievementPrediction {
  goal_id: string;
  predicted_mastery_date: string;
  achievement_probability: number;
  risk_factors: RiskFactor[];
  success_factors: SuccessFactor[];
  recommended_adjustments: Adjustment[];
}

export interface ServiceNeedPrediction {
  service_type: string;
  predicted_demand: number;
  peak_periods: string[];
  resource_requirements: ResourceRequirement[];
  capacity_gaps: CapacityGap[];
}

export interface ComplianceRiskPrediction {
  compliance_area: string;
  risk_probability: number;
  potential_violations: PotentialViolation[];
  preventive_measures: PreventiveMeasure[];
  monitoring_indicators: string[];
}

export interface ResourceRequirementPrediction {
  resource_type: string;
  predicted_need: number;
  timeline: string;
  confidence_level: number;
  cost_implications: CostImplication[];
  procurement_recommendations: string[];
}

export interface EarlyWarningIndicator {
  indicator_name: string;
  current_value: number;
  threshold_value: number;
  alert_level: 'green' | 'yellow' | 'orange' | 'red';
  trend: TrendDirection;
  recommended_actions: string[];
}

// Supporting types for predictions
export interface Factor {
  name: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface Intervention {
  intervention_id: string;
  name_ar: string;
  name_en: string;
  type: string;
  effectiveness_probability: number;
  resource_requirements: string[];
  timeline: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  mitigation_strategy: string;
  monitoring_required: boolean;
}

export interface SuccessFactor {
  factor: string;
  weight: number;
  enhancement_strategy: string;
}

export interface Adjustment {
  adjustment_type: string;
  description_ar: string;
  description_en: string;
  expected_impact: number;
  implementation_effort: string;
}

export interface ResourceRequirement {
  resource_type: string;
  quantity: number;
  qualification_requirements: string[];
  availability_timeline: string;
}

export interface CapacityGap {
  gap_area: string;
  current_capacity: number;
  required_capacity: number;
  gap_size: number;
  resolution_options: string[];
}

export interface PotentialViolation {
  violation_type: string;
  probability: number;
  severity: string;
  potential_consequences: string[];
}

export interface PreventiveMeasure {
  measure_id: string;
  description_ar: string;
  description_en: string;
  effectiveness: number;
  implementation_cost: number;
  timeline: string;
}

export interface CostImplication {
  cost_category: string;
  estimated_cost: number;
  cost_breakdown: Record<string, number>;
  funding_sources: string[];
}

// Report generation types
export interface ReportConfiguration {
  report_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  report_type: ReportType;
  schedule: ReportSchedule;
  recipients: ReportRecipient[];
  parameters: ReportParameters;
  format: ReportFormat;
  template_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ReportType = 
  | 'executive_summary'
  | 'compliance_report'
  | 'performance_dashboard'
  | 'trend_analysis'
  | 'predictive_insights'
  | 'audit_report'
  | 'custom_analytics';

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  day_of_week?: string;
  day_of_month?: number;
  time_of_day?: string;
  timezone: string;
  next_run: string;
}

export interface ReportRecipient {
  user_id: string;
  email: string;
  delivery_method: 'email' | 'dashboard' | 'download';
  notification_preferences: {
    immediate: boolean;
    summary: boolean;
    alerts_only: boolean;
  };
}

export interface ReportParameters {
  date_range: {
    start_date: string;
    end_date: string;
    relative_period?: string;
  };
  filters: Record<string, any>;
  metrics: string[];
  grouping: string[];
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  aggregations: AnalyticsMetric[];
  include_predictions: boolean;
  include_recommendations: boolean;
}

// API and response types
export interface AnalyticsRequest {
  metrics: string[];
  timeframe: AnalyticsTimeframe;
  start_date?: string;
  end_date?: string;
  filters?: Record<string, any>;
  grouping?: string[];
  aggregations?: AnalyticsMetric[];
  include_trends?: boolean;
  include_predictions?: boolean;
}

export interface AnalyticsResponse {
  data: Record<string, any>;
  metadata: {
    total_records: number;
    processing_time: number;
    cache_status: 'hit' | 'miss';
    last_updated: string;
  };
  trends?: TrendData[];
  predictions?: any[];
  recommendations?: string[];
}

// Export utility types
export type CreateDashboardWidgetRequest = Omit<DashboardWidget, 'id' | 'last_updated'>;
export type UpdateDashboardWidgetRequest = Partial<Omit<DashboardWidget, 'id'>>;
export type CreateReportRequest = Omit<ReportConfiguration, 'report_id' | 'created_at' | 'updated_at'>;
export type UpdateReportRequest = Partial<Omit<ReportConfiguration, 'report_id' | 'created_by'>>;

export type AnalyticsFilters = {
  date_from?: string;
  date_to?: string;
  student_ids?: string[];
  iep_ids?: string[];
  goal_ids?: string[];
  service_types?: string[];
  compliance_areas?: string[];
  user_roles?: string[];
  grade_levels?: string[];
  disability_categories?: string[];
};