/**
 * Progress Metrics Type Definitions
 * 
 * TypeScript interfaces and types for the customizable progress metrics system.
 * Supports metric definitions, templates, configurations, and bilingual content
 * for individualized enrollment analytics and reporting.
 * 
 * @author BMad Development Team
 * @version 1.0.0
 */

// Re-export all types from the service for centralized type management
export type {
  ProgressMetricDefinition,
  MetricValidationRules,
  MetricDisplayConfig,
  MetricTemplate,
  MetricConfigurationRequest,
  MetricTestResult,
  MetricBulkOperationResult
} from '../services/analytics/progress-metric-configuration-service';

// Additional supporting types for UI components and data handling

export interface MetricCategory {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface MetricTargetAudience {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  age_range_min?: number;
  age_range_max?: number;
  diagnosis_categories?: string[];
  therapy_types?: string[];
  is_active: boolean;
}

export interface MetricDataSource {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  table_name: string;
  column_mapping: Record<string, string>;
  requires_calculation: boolean;
  update_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  is_available: boolean;
}

export interface MetricCalculationContext {
  enrollment_id: string;
  student_id: string;
  program_template_id: string;
  therapist_id?: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  session_data?: SessionMetricData[];
  assessment_data?: AssessmentMetricData[];
  attendance_data?: AttendanceMetricData[];
  goal_data?: GoalMetricData[];
  behavioral_data?: BehaviorMetricData[];
}

export interface SessionMetricData {
  session_id: string;
  session_date: string;
  duration_minutes: number;
  attendance_status: 'present' | 'absent' | 'late' | 'partial';
  participation_level: number; // 1-10 scale
  therapist_notes?: string;
  behavioral_observations?: string;
  skill_demonstrations?: Record<string, number>;
  session_type: 'individual' | 'group' | 'assessment' | 'makeup';
}

export interface AssessmentMetricData {
  assessment_id: string;
  assessment_date: string;
  assessment_type: string;
  raw_scores: Record<string, number>;
  percentile_scores: Record<string, number>;
  standard_scores: Record<string, number>;
  age_equivalent_scores: Record<string, number>;
  grade_equivalent_scores?: Record<string, number>;
  clinical_observations: string;
  recommendations: string[];
}

export interface AttendanceMetricData {
  date: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  arrival_time?: string;
  departure_time?: string;
  duration_minutes: number;
  parent_notification_sent: boolean;
  makeup_required: boolean;
  makeup_scheduled_date?: string;
}

export interface GoalMetricData {
  goal_id: string;
  goal_category: string;
  target_behavior: string;
  measurement_type: 'frequency' | 'duration' | 'accuracy' | 'independence_level' | 'quality_rating';
  baseline_value: number;
  target_value: number;
  current_value: number;
  measurement_unit: string;
  measurement_date: string;
  data_collection_method: string;
  progress_notes: string;
  mastery_status: 'not_started' | 'emerging' | 'developing' | 'mastered' | 'maintained';
}

export interface BehaviorMetricData {
  observation_date: string;
  behavior_category: 'adaptive' | 'challenging' | 'social' | 'communication' | 'sensory';
  behavior_description: string;
  frequency: number;
  intensity_level: number; // 1-5 scale
  duration_minutes?: number;
  antecedent: string;
  consequence: string;
  intervention_used?: string;
  effectiveness_rating?: number; // 1-5 scale
  environmental_factors: string[];
}

export interface MetricCalculationResult {
  metric_id: string;
  calculated_value: number | boolean | string;
  calculation_date: string;
  confidence_level: number; // 0-1 scale
  data_points_used: number;
  calculation_method: string;
  raw_data_summary: Record<string, any>;
  trend_direction: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  statistical_significance?: number;
  comparison_to_baseline?: {
    baseline_value: number;
    change_magnitude: number;
    change_percentage: number;
    effect_size?: number;
  };
  comparison_to_target?: {
    target_value: number;
    progress_percentage: number;
    estimated_completion_date?: string;
    on_track: boolean;
  };
}

export interface MetricVisualizationConfig {
  chart_type: 'line' | 'bar' | 'gauge' | 'pie' | 'scatter' | 'radar' | 'heatmap' | 'progress_bar';
  data_aggregation: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'session_based';
  color_scheme: {
    primary: string;
    secondary: string;
    positive: string;
    negative: string;
    neutral: string;
    gradient?: string[];
  };
  display_options: {
    show_trend_line: boolean;
    show_target_line: boolean;
    show_baseline_line: boolean;
    show_confidence_intervals: boolean;
    show_data_points: boolean;
    show_moving_average: boolean;
    moving_average_period?: number;
  };
  axis_configuration: {
    x_axis_label_ar: string;
    x_axis_label_en: string;
    y_axis_label_ar: string;
    y_axis_label_en: string;
    x_axis_type: 'date' | 'numeric' | 'categorical';
    y_axis_type: 'numeric' | 'percentage' | 'categorical';
    y_axis_min?: number;
    y_axis_max?: number;
  };
  responsive_breakpoints: {
    mobile: { width: number; height: number };
    tablet: { width: number; height: number };
    desktop: { width: number; height: number };
  };
}

export interface MetricExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'png' | 'svg';
  include_visualizations: boolean;
  include_raw_data: boolean;
  include_statistical_analysis: boolean;
  include_interpretations: boolean;
  language: 'ar' | 'en' | 'both';
  date_range: {
    start_date: string;
    end_date: string;
  };
  grouping: 'by_metric' | 'by_student' | 'by_program' | 'by_therapist';
  comparison_metrics?: string[];
  custom_annotations?: Array<{
    date: string;
    text_ar: string;
    text_en: string;
    type: 'milestone' | 'intervention' | 'event' | 'note';
  }>;
}

export interface MetricInterpretationRule {
  id: string;
  metric_id: string;
  condition: string; // JavaScript expression
  interpretation_ar: string;
  interpretation_en: string;
  recommendation_ar?: string;
  recommendation_en?: string;
  severity_level: 'info' | 'warning' | 'concern' | 'critical';
  action_required: boolean;
  notification_recipients?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricComparison {
  baseline_metrics: Record<string, MetricCalculationResult>;
  current_metrics: Record<string, MetricCalculationResult>;
  comparison_results: Array<{
    metric_id: string;
    change_value: number;
    change_percentage: number;
    statistical_significance: number;
    trend_analysis: {
      direction: 'improving' | 'declining' | 'stable';
      rate_of_change: number;
      acceleration: number;
      predicted_next_value?: number;
    };
    clinical_significance: {
      is_clinically_significant: boolean;
      effect_size: number;
      practical_importance: 'low' | 'moderate' | 'high';
    };
  }>;
  overall_progress_summary: {
    total_metrics: number;
    improving_metrics: number;
    declining_metrics: number;
    stable_metrics: number;
    overall_progress_rating: number; // 0-10 scale
    progress_interpretation_ar: string;
    progress_interpretation_en: string;
  };
}

export interface MetricAlert {
  id: string;
  metric_id: string;
  enrollment_id: string;
  alert_type: 'threshold_exceeded' | 'trend_concern' | 'data_quality' | 'missing_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  triggered_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  auto_resolved: boolean;
  acknowledgment_required: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  notification_sent: boolean;
  recipients: string[];
}

export interface MetricDashboardWidget {
  id: string;
  widget_type: 'single_metric' | 'metric_comparison' | 'trend_chart' | 'progress_gauge' | 'alert_summary';
  metric_ids: string[];
  title_ar: string;
  title_en: string;
  position: { x: number; y: number; width: number; height: number };
  visualization_config: MetricVisualizationConfig;
  refresh_interval: number; // seconds
  is_visible: boolean;
  user_permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface MetricBenchmark {
  id: string;
  metric_id: string;
  benchmark_type: 'age_based' | 'diagnosis_based' | 'program_based' | 'industry_standard';
  target_population: {
    age_range?: { min: number; max: number };
    diagnosis_codes?: string[];
    program_types?: string[];
    geographic_region?: string;
  };
  benchmark_values: {
    percentile_10: number;
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
    percentile_90: number;
    mean: number;
    standard_deviation: number;
  };
  sample_size: number;
  data_source: string;
  last_updated: string;
  validity_period_months: number;
  is_active: boolean;
}

// Form and UI specific types
export interface MetricFormData {
  basic_info: {
    name_ar: string;
    name_en: string;
    description_ar: string;
    description_en: string;
    category: string;
    target_audience: string;
  };
  configuration: {
    metric_type: string;
    data_source: string;
    calculation_formula: string;
    scope: string;
    program_template_ids?: string[];
  };
  validation: MetricValidationRules;
  display: MetricDisplayConfig;
  visualization: MetricVisualizationConfig;
  interpretation_rules: MetricInterpretationRule[];
}

export interface MetricListItem {
  id: string;
  name_ar: string;
  name_en: string;
  category: string;
  scope: string;
  is_active: boolean;
  usage_count: number;
  last_calculated: string;
  created_at: string;
}

export interface MetricSearchFilters {
  search_term?: string;
  category?: string;
  target_audience?: string;
  scope?: string;
  data_source?: string;
  metric_type?: string;
  is_active?: boolean;
  created_date_range?: {
    start_date: string;
    end_date: string;
  };
  program_template_id?: string;
}

export interface MetricCalculationQueue {
  id: string;
  enrollment_ids: string[];
  metric_ids: string[];
  calculation_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_by: string;
}

// API Response types
export interface MetricApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error_code?: string;
  validation_errors?: Record<string, string[]>;
  timestamp: string;
}

export interface PaginatedMetricResponse<T = any> {
  items: T[];
  total_count: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

// Event types for real-time updates
export interface MetricUpdateEvent {
  event_type: 'metric_calculated' | 'metric_created' | 'metric_updated' | 'metric_deleted' | 'alert_triggered';
  metric_id: string;
  enrollment_id?: string;
  data: any;
  timestamp: string;
  user_id: string;
}

export interface MetricSubscription {
  subscription_id: string;
  metric_ids: string[];
  enrollment_ids: string[];
  event_types: string[];
  callback_url?: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}