/**
 * Therapist Workload Calculation Service
 * 
 * Comprehensive service for calculating and managing therapist workloads across
 * individualized enrollments. Handles capacity management, utilization tracking,
 * workload optimization, and real-time updates with performance monitoring.
 * 
 * Key Features:
 * - Real-time workload calculation across multiple enrollments
 * - Capacity utilization tracking and forecasting
 * - Workload optimization and balancing algorithms
 * - Over-assignment prevention and alerts
 * - Performance impact analysis
 * - Scheduling conflict detection
 * - Workload history and trend analysis
 * - Bilingual reporting and notifications
 * 
 * @author BMad Development Team
 * @version 1.0.0
 */

import { supabase } from '../../lib/supabase';

// Core workload calculation types
export interface TherapistWorkload {
  therapist_id: string;
  calculation_date: string;
  current_metrics: WorkloadMetrics;
  capacity_analysis: CapacityAnalysis;
  utilization_breakdown: UtilizationBreakdown;
  performance_impact: PerformanceImpact;
  workload_forecast: WorkloadForecast;
  optimization_suggestions: OptimizationSuggestion[];
  alert_conditions: WorkloadAlert[];
  last_updated: string;
}

export interface WorkloadMetrics {
  total_students: number;
  active_enrollments: number;
  weekly_sessions_scheduled: number;
  weekly_sessions_completed: number;
  total_weekly_hours: number;
  average_session_duration: number;
  travel_time_hours: number;
  administrative_hours: number;
  documentation_hours: number;
  break_time_hours: number;
  overtime_hours: number;
  utilization_percentage: number;
  efficiency_score: number;
  capacity_remaining: number;
}

export interface CapacityAnalysis {
  max_students: number;
  max_weekly_sessions: number;
  max_weekly_hours: number;
  current_vs_max_students: number;
  current_vs_max_sessions: number;
  current_vs_max_hours: number;
  capacity_buffer_used: number;
  over_capacity_risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  estimated_days_until_full: number | null;
  can_accept_new_student: boolean;
  max_additional_students: number;
}

export interface UtilizationBreakdown {
  direct_therapy_percentage: number;
  documentation_percentage: number;
  travel_percentage: number;
  administrative_percentage: number;
  break_time_percentage: number;
  overtime_percentage: number;
  idle_time_percentage: number;
  productivity_score: number;
  billable_hours_percentage: number;
}

export interface PerformanceImpact {
  quality_score_trend: number;
  student_satisfaction_correlation: number;
  goal_achievement_correlation: number;
  burnout_risk_level: 'low' | 'medium' | 'high' | 'critical';
  workload_stress_indicators: string[];
  recommended_workload_adjustment: number; // percentage change
  performance_optimization_areas: string[];
}

export interface WorkloadForecast {
  next_week_predicted_hours: number;
  next_month_predicted_hours: number;
  peak_utilization_periods: Array<{
    start_date: string;
    end_date: string;
    predicted_utilization: number;
  }>;
  capacity_shortage_predictions: Array<{
    date: string;
    shortage_hours: number;
    affected_students: string[];
  }>;
  workload_trend: 'increasing' | 'decreasing' | 'stable';
  seasonal_patterns: Array<{
    period: string;
    utilization_change: number;
  }>;
}

export interface OptimizationSuggestion {
  suggestion_type: 'schedule_adjustment' | 'student_redistribution' | 'capacity_increase' | 'workload_reduction';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  impact_score: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
  estimated_time_savings_hours: number;
  affected_enrollments: string[];
  prerequisites: string[];
  implementation_steps: Array<{
    step_number: number;
    description_ar: string;
    description_en: string;
    estimated_duration: string;
  }>;
}

export interface WorkloadAlert {
  alert_type: 'over_capacity' | 'approaching_limit' | 'performance_decline' | 'scheduling_conflict' | 'burnout_risk';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  triggered_at: string;
  threshold_value: number;
  current_value: number;
  recommended_actions: Array<{
    action_ar: string;
    action_en: string;
    urgency: 'immediate' | 'within_day' | 'within_week';
  }>;
  auto_notification_sent: boolean;
}

export interface WorkloadCalculationOptions {
  include_travel_time: boolean;
  include_documentation_time: boolean;
  include_administrative_tasks: boolean;
  forecast_periods: number; // weeks
  optimization_level: 'basic' | 'advanced' | 'comprehensive';
  alert_thresholds: {
    capacity_warning_percentage: number;
    overtime_threshold_hours: number;
    efficiency_minimum_score: number;
    burnout_risk_threshold: number;
  };
}

export interface BulkWorkloadCalculation {
  therapist_ids: string[];
  calculation_date: string;
  options: WorkloadCalculationOptions;
  results: Array<{
    therapist_id: string;
    success: boolean;
    workload?: TherapistWorkload;
    error_message?: string;
  }>;
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
    average_utilization: number;
    over_capacity_count: number;
    optimization_opportunities: number;
  };
  processing_time_ms: number;
}

export interface WorkloadComparison {
  therapist_ids: string[];
  comparison_date: string;
  metrics_comparison: Array<{
    metric_name: string;
    values: Record<string, number>;
    average: number;
    standard_deviation: number;
    outliers: Array<{
      therapist_id: string;
      value: number;
      deviation_from_mean: number;
    }>;
  }>;
  workload_balance_score: number;
  redistribution_recommendations: Array<{
    from_therapist_id: string;
    to_therapist_id: string;
    student_ids: string[];
    expected_improvement: number;
  }>;
}

/**
 * Therapist Workload Service Class
 * Handles all workload calculations and capacity management
 */
export class TherapistWorkloadService {
  private static instance: TherapistWorkloadService;

  public static getInstance(): TherapistWorkloadService {
    if (!TherapistWorkloadService.instance) {
      TherapistWorkloadService.instance = new TherapistWorkloadService();
    }
    return TherapistWorkloadService.instance;
  }

  /**
   * Calculate comprehensive workload for a therapist
   */
  async calculateWorkload(
    therapist_id: string,
    options: Partial<WorkloadCalculationOptions> = {}
  ): Promise<{
    success: boolean;
    workload?: TherapistWorkload;
    message: string;
  }> {
    try {
      const defaultOptions: WorkloadCalculationOptions = {
        include_travel_time: true,
        include_documentation_time: true,
        include_administrative_tasks: true,
        forecast_periods: 4,
        optimization_level: 'comprehensive',
        alert_thresholds: {
          capacity_warning_percentage: 85,
          overtime_threshold_hours: 40,
          efficiency_minimum_score: 75,
          burnout_risk_threshold: 95
        }
      };

      const calculationOptions = { ...defaultOptions, ...options };
      const calculationDate = new Date().toISOString();

      // Get therapist information and capacity config
      const therapistInfo = await this.getTherapistInfo(therapist_id);
      if (!therapistInfo.success || !therapistInfo.therapist) {
        return {
          success: false,
          message: therapistInfo.message
        };
      }

      // Calculate current workload metrics
      const currentMetrics = await this.calculateCurrentMetrics(therapist_id, calculationOptions);

      // Analyze capacity utilization
      const capacityAnalysis = await this.analyzeCapacity(
        therapist_id,
        currentMetrics,
        therapistInfo.therapist.capacity_config
      );

      // Calculate utilization breakdown
      const utilizationBreakdown = await this.calculateUtilizationBreakdown(
        therapist_id,
        currentMetrics
      );

      // Assess performance impact
      const performanceImpact = await this.assessPerformanceImpact(
        therapist_id,
        currentMetrics,
        capacityAnalysis
      );

      // Generate workload forecast
      const workloadForecast = await this.generateWorkloadForecast(
        therapist_id,
        currentMetrics,
        calculationOptions.forecast_periods
      );

      // Generate optimization suggestions
      const optimizationSuggestions = await this.generateOptimizationSuggestions(
        therapist_id,
        currentMetrics,
        capacityAnalysis,
        utilizationBreakdown,
        calculationOptions.optimization_level
      );

      // Check for alert conditions
      const alertConditions = await this.checkAlertConditions(
        therapist_id,
        currentMetrics,
        capacityAnalysis,
        performanceImpact,
        calculationOptions.alert_thresholds
      );

      const workload: TherapistWorkload = {
        therapist_id,
        calculation_date: calculationDate,
        current_metrics: currentMetrics,
        capacity_analysis: capacityAnalysis,
        utilization_breakdown: utilizationBreakdown,
        performance_impact: performanceImpact,
        workload_forecast: workloadForecast,
        optimization_suggestions: optimizationSuggestions,
        alert_conditions: alertConditions,
        last_updated: new Date().toISOString()
      };

      // Store workload calculation result
      await this.storeWorkloadCalculation(workload);

      // Send notifications for critical alerts
      await this.processAlertNotifications(alertConditions, therapist_id);

      return {
        success: true,
        workload,
        message: 'Workload calculated successfully'
      };

    } catch (error) {
      console.error('Error calculating workload:', error);
      return {
        success: false,
        message: 'Unexpected error occurred during workload calculation'
      };
    }
  }

  /**
   * Calculate workloads for multiple therapists
   */
  async calculateBulkWorkloads(
    therapist_ids: string[],
    options: Partial<WorkloadCalculationOptions> = {}
  ): Promise<BulkWorkloadCalculation> {
    const startTime = performance.now();
    const calculationDate = new Date().toISOString();
    
    const results: BulkWorkloadCalculation['results'] = [];
    let totalUtilization = 0;
    let overCapacityCount = 0;
    let optimizationOpportunities = 0;

    // Process each therapist
    for (const therapist_id of therapist_ids) {
      try {
        const result = await this.calculateWorkload(therapist_id, options);
        
        if (result.success && result.workload) {
          results.push({
            therapist_id,
            success: true,
            workload: result.workload
          });

          totalUtilization += result.workload.current_metrics.utilization_percentage;
          
          if (result.workload.capacity_analysis.over_capacity_risk_level !== 'none') {
            overCapacityCount++;
          }

          optimizationOpportunities += result.workload.optimization_suggestions.length;

        } else {
          results.push({
            therapist_id,
            success: false,
            error_message: result.message
          });
        }

      } catch (error) {
        results.push({
          therapist_id,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    const processingTime = performance.now() - startTime;

    return {
      therapist_ids,
      calculation_date: calculationDate,
      options: options as WorkloadCalculationOptions,
      results,
      summary: {
        total_processed: therapist_ids.length,
        successful,
        failed,
        average_utilization: successful > 0 ? totalUtilization / successful : 0,
        over_capacity_count: overCapacityCount,
        optimization_opportunities: optimizationOpportunities
      },
      processing_time_ms: Math.round(processingTime)
    };
  }

  /**
   * Compare workloads across multiple therapists
   */
  async compareWorkloads(therapist_ids: string[]): Promise<{
    success: boolean;
    comparison?: WorkloadComparison;
    message: string;
  }> {
    try {
      if (therapist_ids.length < 2) {
        return {
          success: false,
          message: 'At least 2 therapists are required for comparison'
        };
      }

      // Get current workloads for all therapists
      const workloads: Record<string, TherapistWorkload> = {};
      
      for (const therapist_id of therapist_ids) {
        const result = await this.getLatestWorkload(therapist_id);
        if (result.success && result.workload) {
          workloads[therapist_id] = result.workload;
        }
      }

      const validTherapistIds = Object.keys(workloads);
      if (validTherapistIds.length < 2) {
        return {
          success: false,
          message: 'Insufficient valid workload data for comparison'
        };
      }

      // Define metrics to compare
      const metrics = [
        'total_students',
        'weekly_sessions_scheduled',
        'total_weekly_hours',
        'utilization_percentage',
        'efficiency_score',
        'overtime_hours'
      ];

      const metricsComparison = metrics.map(metric => {
        const values: Record<string, number> = {};
        const valuesList: number[] = [];

        validTherapistIds.forEach(therapist_id => {
          const value = (workloads[therapist_id].current_metrics as any)[metric] || 0;
          values[therapist_id] = value;
          valuesList.push(value);
        });

        const average = valuesList.reduce((sum, val) => sum + val, 0) / valuesList.length;
        const variance = valuesList.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / valuesList.length;
        const standardDeviation = Math.sqrt(variance);

        const outliers = validTherapistIds
          .map(therapist_id => ({
            therapist_id,
            value: values[therapist_id],
            deviation_from_mean: Math.abs(values[therapist_id] - average)
          }))
          .filter(item => item.deviation_from_mean > standardDeviation * 1.5)
          .sort((a, b) => b.deviation_from_mean - a.deviation_from_mean);

        return {
          metric_name: metric,
          values,
          average,
          standard_deviation: standardDeviation,
          outliers
        };
      });

      // Calculate workload balance score
      const utilizationValues = validTherapistIds.map(id => workloads[id].current_metrics.utilization_percentage);
      const utilizationVariance = utilizationValues.reduce((sum, val) => {
        const avg = utilizationValues.reduce((s, v) => s + v, 0) / utilizationValues.length;
        return sum + Math.pow(val - avg, 2);
      }, 0) / utilizationValues.length;
      
      const workloadBalanceScore = Math.max(0, 100 - Math.sqrt(utilizationVariance));

      // Generate redistribution recommendations
      const redistributionRecommendations = await this.generateRedistributionRecommendations(
        validTherapistIds,
        workloads
      );

      const comparison: WorkloadComparison = {
        therapist_ids: validTherapistIds,
        comparison_date: new Date().toISOString(),
        metrics_comparison: metricsComparison,
        workload_balance_score: workloadBalanceScore,
        redistribution_recommendations
      };

      return {
        success: true,
        comparison,
        message: 'Workload comparison completed successfully'
      };

    } catch (error) {
      console.error('Error comparing workloads:', error);
      return {
        success: false,
        message: 'Error occurred during workload comparison'
      };
    }
  }

  /**
   * Get latest workload calculation for a therapist
   */
  async getLatestWorkload(therapist_id: string): Promise<{
    success: boolean;
    workload?: TherapistWorkload;
    message: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('therapist_workloads')
        .select('*')
        .eq('therapist_id', therapist_id)
        .order('calculation_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return {
          success: false,
          message: 'No workload data found for therapist'
        };
      }

      return {
        success: true,
        workload: data as TherapistWorkload,
        message: 'Latest workload retrieved successfully'
      };

    } catch (error) {
      console.error('Error retrieving latest workload:', error);
      return {
        success: false,
        message: 'Error retrieving workload data'
      };
    }
  }

  /**
   * Get workload trends over time
   */
  async getWorkloadTrends(
    therapist_id: string,
    days: number = 30
  ): Promise<{
    success: boolean;
    trends?: Array<{
      date: string;
      utilization_percentage: number;
      total_hours: number;
      student_count: number;
      efficiency_score: number;
    }>;
    message: string;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('therapist_workloads')
        .select('calculation_date, current_metrics')
        .eq('therapist_id', therapist_id)
        .gte('calculation_date', startDate.toISOString())
        .order('calculation_date', { ascending: true });

      if (error) {
        return {
          success: false,
          message: 'Error retrieving workload trends'
        };
      }

      const trends = data.map(item => ({
        date: item.calculation_date,
        utilization_percentage: item.current_metrics.utilization_percentage,
        total_hours: item.current_metrics.total_weekly_hours,
        student_count: item.current_metrics.total_students,
        efficiency_score: item.current_metrics.efficiency_score
      }));

      return {
        success: true,
        trends,
        message: 'Workload trends retrieved successfully'
      };

    } catch (error) {
      console.error('Error retrieving workload trends:', error);
      return {
        success: false,
        message: 'Error retrieving workload trends'
      };
    }
  }

  // Private Helper Methods

  private async getTherapistInfo(therapist_id: string): Promise<{
    success: boolean;
    therapist?: any;
    message: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', therapist_id)
        .eq('is_active', true)
        .single();

      if (error) {
        return {
          success: false,
          message: 'Therapist not found or inactive'
        };
      }

      return {
        success: true,
        therapist: data,
        message: 'Therapist information retrieved'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving therapist information'
      };
    }
  }

  private async calculateCurrentMetrics(
    therapist_id: string,
    options: WorkloadCalculationOptions
  ): Promise<WorkloadMetrics> {
    // Get current active enrollments
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('assigned_therapist_id', therapist_id)
      .eq('enrollment_status', 'active');

    const totalStudents = enrollments?.length || 0;

    // Get scheduled sessions for current week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: sessions } = await supabase
      .from('therapy_sessions')
      .select('*')
      .eq('therapist_id', therapist_id)
      .gte('session_date', weekStart.toISOString())
      .lte('session_date', weekEnd.toISOString());

    const scheduledSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    const totalSessionMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 45), 0) || 0;

    // Calculate additional time components
    const averageSessionDuration = scheduledSessions > 0 ? totalSessionMinutes / scheduledSessions : 45;
    const travelTimeHours = options.include_travel_time ? totalStudents * 0.25 : 0; // 15min per student
    const documentationHours = options.include_documentation_time ? scheduledSessions * 0.25 : 0; // 15min per session
    const administrativeHours = options.include_administrative_tasks ? 2 : 0; // 2 hours per week

    const directTherapyHours = totalSessionMinutes / 60;
    const totalWeeklyHours = directTherapyHours + travelTimeHours + documentationHours + administrativeHours;

    // Calculate utilization based on 40-hour work week
    const standardWorkWeekHours = 40;
    const utilizationPercentage = (totalWeeklyHours / standardWorkWeekHours) * 100;

    // Calculate efficiency score based on completion rate and utilization
    const completionRate = scheduledSessions > 0 ? completedSessions / scheduledSessions : 1;
    const efficiencyScore = Math.min(100, completionRate * 85 + (utilizationPercentage > 100 ? -10 : 0));

    return {
      total_students: totalStudents,
      active_enrollments: totalStudents,
      weekly_sessions_scheduled: scheduledSessions,
      weekly_sessions_completed: completedSessions,
      total_weekly_hours: totalWeeklyHours,
      average_session_duration: averageSessionDuration,
      travel_time_hours: travelTimeHours,
      administrative_hours: administrativeHours,
      documentation_hours: documentationHours,
      break_time_hours: Math.max(0, Math.min(4, totalWeeklyHours * 0.1)), // 10% break time, max 4 hours
      overtime_hours: Math.max(0, totalWeeklyHours - standardWorkWeekHours),
      utilization_percentage: utilizationPercentage,
      efficiency_score: efficiencyScore,
      capacity_remaining: Math.max(0, standardWorkWeekHours - totalWeeklyHours)
    };
  }

  private async analyzeCapacity(
    therapist_id: string,
    metrics: WorkloadMetrics,
    capacityConfig: any
  ): Promise<CapacityAnalysis> {
    const maxStudents = capacityConfig?.max_students_per_week || 12;
    const maxWeeklySessions = capacityConfig?.max_sessions_per_day * 5 || 30; // Assuming 5 work days
    const maxWeeklyHours = capacityConfig?.max_hours_per_week || 40;

    const currentVsMaxStudents = (metrics.total_students / maxStudents) * 100;
    const currentVsMaxSessions = (metrics.weekly_sessions_scheduled / maxWeeklySessions) * 100;
    const currentVsMaxHours = (metrics.total_weekly_hours / maxWeeklyHours) * 100;

    const maxUtilization = Math.max(currentVsMaxStudents, currentVsMaxSessions, currentVsMaxHours);
    
    let riskLevel: CapacityAnalysis['over_capacity_risk_level'] = 'none';
    if (maxUtilization > 100) riskLevel = 'critical';
    else if (maxUtilization > 95) riskLevel = 'high';
    else if (maxUtilization > 85) riskLevel = 'medium';
    else if (maxUtilization > 70) riskLevel = 'low';

    const canAcceptNewStudent = maxUtilization < 90; // 10% buffer
    const maxAdditionalStudents = Math.max(0, Math.floor(maxStudents - metrics.total_students));

    // Estimate days until full capacity based on current trend
    let estimatedDaysUntilFull: number | null = null;
    if (riskLevel !== 'none' && riskLevel !== 'critical') {
      const remainingCapacity = 100 - maxUtilization;
      const assumedGrowthRate = 2; // 2% per week
      estimatedDaysUntilFull = Math.round((remainingCapacity / assumedGrowthRate) * 7);
    }

    return {
      max_students: maxStudents,
      max_weekly_sessions: maxWeeklySessions,
      max_weekly_hours: maxWeeklyHours,
      current_vs_max_students: currentVsMaxStudents,
      current_vs_max_sessions: currentVsMaxSessions,
      current_vs_max_hours: currentVsMaxHours,
      capacity_buffer_used: maxUtilization,
      over_capacity_risk_level: riskLevel,
      estimated_days_until_full: estimatedDaysUntilFull,
      can_accept_new_student: canAcceptNewStudent,
      max_additional_students: maxAdditionalStudents
    };
  }

  private async calculateUtilizationBreakdown(
    therapist_id: string,
    metrics: WorkloadMetrics
  ): Promise<UtilizationBreakdown> {
    const totalHours = Math.max(metrics.total_weekly_hours, 1); // Avoid division by zero

    const directTherapyHours = metrics.weekly_sessions_scheduled * (metrics.average_session_duration / 60);
    
    return {
      direct_therapy_percentage: (directTherapyHours / totalHours) * 100,
      documentation_percentage: (metrics.documentation_hours / totalHours) * 100,
      travel_percentage: (metrics.travel_time_hours / totalHours) * 100,
      administrative_percentage: (metrics.administrative_hours / totalHours) * 100,
      break_time_percentage: (metrics.break_time_hours / totalHours) * 100,
      overtime_percentage: (metrics.overtime_hours / totalHours) * 100,
      idle_time_percentage: Math.max(0, ((40 - totalHours) / 40) * 100),
      productivity_score: Math.min(100, (directTherapyHours / totalHours) * 120), // Bonus for high direct therapy
      billable_hours_percentage: ((directTherapyHours + metrics.documentation_hours) / totalHours) * 100
    };
  }

  private async assessPerformanceImpact(
    therapist_id: string,
    metrics: WorkloadMetrics,
    capacity: CapacityAnalysis
  ): Promise<PerformanceImpact> {
    // Get recent performance data
    const { data: performanceData } = await supabase
      .from('therapist_performance_metrics')
      .select('*')
      .eq('therapist_id', therapist_id)
      .order('measurement_date', { ascending: false })
      .limit(10);

    let qualityTrend = 0;
    let satisfactionCorrelation = 0;
    let goalCorrelation = 0;

    if (performanceData && performanceData.length > 1) {
      const latest = performanceData[0];
      const previous = performanceData[Math.min(5, performanceData.length - 1)];
      
      qualityTrend = ((latest.overall_performance_score - previous.overall_performance_score) / previous.overall_performance_score) * 100;
      satisfactionCorrelation = this.calculateCorrelation(
        performanceData.map(p => p.student_satisfaction_avg),
        performanceData.map((_, i) => 100 - (i * 2)) // Simulate utilization trend
      );
      goalCorrelation = this.calculateCorrelation(
        performanceData.map(p => p.goal_achievement_rate),
        performanceData.map((_, i) => 100 - (i * 2))
      );
    }

    // Assess burnout risk
    let burnoutRisk: PerformanceImpact['burnout_risk_level'] = 'low';
    const stressIndicators: string[] = [];

    if (metrics.utilization_percentage > 95) {
      burnoutRisk = 'critical';
      stressIndicators.push('extreme_workload');
    } else if (metrics.utilization_percentage > 85) {
      burnoutRisk = 'high';
      stressIndicators.push('high_workload');
    } else if (metrics.overtime_hours > 5) {
      burnoutRisk = 'medium';
      stressIndicators.push('excessive_overtime');
    }

    if (metrics.efficiency_score < 70) {
      stressIndicators.push('low_efficiency');
    }

    if (metrics.weekly_sessions_completed / Math.max(metrics.weekly_sessions_scheduled, 1) < 0.9) {
      stressIndicators.push('high_cancellation_rate');
    }

    // Calculate recommended workload adjustment
    let workloadAdjustment = 0;
    if (burnoutRisk === 'critical') workloadAdjustment = -20;
    else if (burnoutRisk === 'high') workloadAdjustment = -10;
    else if (burnoutRisk === 'medium') workloadAdjustment = -5;
    else if (metrics.utilization_percentage < 60) workloadAdjustment = 10;

    const optimizationAreas = [];
    if (metrics.efficiency_score < 80) optimizationAreas.push('scheduling_optimization');
    if (metrics.documentation_hours > 5) optimizationAreas.push('documentation_efficiency');
    if (metrics.travel_time_hours > 3) optimizationAreas.push('travel_reduction');

    return {
      quality_score_trend: qualityTrend,
      student_satisfaction_correlation: satisfactionCorrelation,
      goal_achievement_correlation: goalCorrelation,
      burnout_risk_level: burnoutRisk,
      workload_stress_indicators: stressIndicators,
      recommended_workload_adjustment: workloadAdjustment,
      performance_optimization_areas: optimizationAreas
    };
  }

  private async generateWorkloadForecast(
    therapist_id: string,
    metrics: WorkloadMetrics,
    forecastWeeks: number
  ): Promise<WorkloadForecast> {
    // Simple linear projection based on current trends
    const currentWeeklyHours = metrics.total_weekly_hours;
    const growthRate = 0.02; // 2% growth assumption

    const nextWeekHours = currentWeeklyHours * (1 + growthRate);
    const nextMonthHours = currentWeeklyHours * Math.pow(1 + growthRate, 4);

    // Generate peak utilization periods (simplified)
    const peakPeriods = [
      {
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predicted_utilization: Math.min(metrics.utilization_percentage * 1.1, 110)
      }
    ];

    // Predict capacity shortages
    const shortages = [];
    if (nextWeekHours > 40) {
      shortages.push({
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        shortage_hours: nextWeekHours - 40,
        affected_students: [] // Would be calculated based on actual enrollment data
      });
    }

    let trend: WorkloadForecast['workload_trend'] = 'stable';
    if (growthRate > 0.01) trend = 'increasing';
    else if (growthRate < -0.01) trend = 'decreasing';

    return {
      next_week_predicted_hours: nextWeekHours,
      next_month_predicted_hours: nextMonthHours,
      peak_utilization_periods: peakPeriods,
      capacity_shortage_predictions: shortages,
      workload_trend: trend,
      seasonal_patterns: [
        { period: 'fall_semester', utilization_change: 15 },
        { period: 'spring_semester', utilization_change: 10 },
        { period: 'summer_break', utilization_change: -25 }
      ]
    };
  }

  private async generateOptimizationSuggestions(
    therapist_id: string,
    metrics: WorkloadMetrics,
    capacity: CapacityAnalysis,
    utilization: UtilizationBreakdown,
    optimizationLevel: string
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Schedule optimization suggestions
    if (utilization.idle_time_percentage > 15) {
      suggestions.push({
        suggestion_type: 'schedule_adjustment',
        priority: 'medium',
        title_ar: 'تحسين جدولة المواعيد',
        title_en: 'Optimize Session Scheduling',
        description_ar: 'يمكن تحسين استغلال الوقت من خلال إعادة ترتيب مواعيد الجلسات',
        description_en: 'Time utilization can be improved by rescheduling session appointments',
        impact_score: 8.5,
        implementation_difficulty: 'easy',
        estimated_time_savings_hours: utilization.idle_time_percentage * 0.4,
        affected_enrollments: [],
        prerequisites: ['schedule_flexibility', 'parent_agreement'],
        implementation_steps: [
          {
            step_number: 1,
            description_ar: 'مراجعة الجدول الحالي وتحديد الفجوات',
            description_en: 'Review current schedule and identify gaps',
            estimated_duration: '30 minutes'
          },
          {
            step_number: 2,
            description_ar: 'اقتراح مواعيد بديلة للأهالي',
            description_en: 'Propose alternative appointment times to parents',
            estimated_duration: '1 hour'
          }
        ]
      });
    }

    // Workload redistribution suggestions
    if (capacity.over_capacity_risk_level === 'high' || capacity.over_capacity_risk_level === 'critical') {
      suggestions.push({
        suggestion_type: 'student_redistribution',
        priority: 'high',
        title_ar: 'إعادة توزيع الطلاب',
        title_en: 'Redistribute Student Load',
        description_ar: 'يُنصح بإعادة توزيع بعض الطلاب على معالجين آخرين لتقليل العبء',
        description_en: 'Recommend redistributing some students to other therapists to reduce load',
        impact_score: 9.2,
        implementation_difficulty: 'medium',
        estimated_time_savings_hours: metrics.overtime_hours * 0.7,
        affected_enrollments: [],
        prerequisites: ['available_therapists', 'specialization_match', 'parent_approval'],
        implementation_steps: [
          {
            step_number: 1,
            description_ar: 'تحديد المعالجين المتاحين بالتخصص المناسب',
            description_en: 'Identify available therapists with appropriate specialization',
            estimated_duration: '45 minutes'
          },
          {
            step_number: 2,
            description_ar: 'الحصول على موافقة الأهالي على التغيير',
            description_en: 'Obtain parent approval for the change',
            estimated_duration: '2 hours'
          }
        ]
      });
    }

    // Documentation efficiency suggestions
    if (utilization.documentation_percentage > 20) {
      suggestions.push({
        suggestion_type: 'workload_reduction',
        priority: 'medium',
        title_ar: 'تحسين كفاءة التوثيق',
        title_en: 'Improve Documentation Efficiency',
        description_ar: 'استخدام أدوات التوثيق الآلي لتقليل الوقت المطلوب',
        description_en: 'Use automated documentation tools to reduce required time',
        impact_score: 7.0,
        implementation_difficulty: 'easy',
        estimated_time_savings_hours: metrics.documentation_hours * 0.3,
        affected_enrollments: [],
        prerequisites: ['documentation_templates', 'training'],
        implementation_steps: [
          {
            step_number: 1,
            description_ar: 'تدريب على استخدام قوالب التوثيق السريع',
            description_en: 'Training on rapid documentation templates',
            estimated_duration: '2 hours'
          }
        ]
      });
    }

    return suggestions.slice(0, optimizationLevel === 'comprehensive' ? 5 : optimizationLevel === 'advanced' ? 3 : 2);
  }

  private async checkAlertConditions(
    therapist_id: string,
    metrics: WorkloadMetrics,
    capacity: CapacityAnalysis,
    performance: PerformanceImpact,
    thresholds: WorkloadCalculationOptions['alert_thresholds']
  ): Promise<WorkloadAlert[]> {
    const alerts: WorkloadAlert[] = [];
    const currentTime = new Date().toISOString();

    // Over capacity alert
    if (capacity.over_capacity_risk_level === 'critical') {
      alerts.push({
        alert_type: 'over_capacity',
        severity: 'critical',
        title_ar: 'تجاوز الطاقة الاستيعابية',
        title_en: 'Over Capacity',
        message_ar: `المعالج يعمل بنسبة ${metrics.utilization_percentage.toFixed(0)}% من طاقته الاستيعابية`,
        message_en: `Therapist is working at ${metrics.utilization_percentage.toFixed(0)}% capacity`,
        triggered_at: currentTime,
        threshold_value: thresholds.capacity_warning_percentage,
        current_value: metrics.utilization_percentage,
        recommended_actions: [
          {
            action_ar: 'إعادة توزيع بعض الطلاب فوراً',
            action_en: 'Redistribute some students immediately',
            urgency: 'immediate'
          },
          {
            action_ar: 'مراجعة الجدول وإلغاء المهام غير الضرورية',
            action_en: 'Review schedule and cancel non-essential tasks',
            urgency: 'within_day'
          }
        ],
        auto_notification_sent: false
      });
    }

    // Approaching capacity limit
    else if (capacity.over_capacity_risk_level === 'high') {
      alerts.push({
        alert_type: 'approaching_limit',
        severity: 'warning',
        title_ar: 'اقتراب من الحد الأقصى',
        title_en: 'Approaching Capacity Limit',
        message_ar: 'المعالج يقترب من الحد الأقصى لطاقته الاستيعابية',
        message_en: 'Therapist is approaching maximum capacity',
        triggered_at: currentTime,
        threshold_value: thresholds.capacity_warning_percentage,
        current_value: metrics.utilization_percentage,
        recommended_actions: [
          {
            action_ar: 'تخطيط لإعادة توزيع الطلاب',
            action_en: 'Plan for student redistribution',
            urgency: 'within_week'
          }
        ],
        auto_notification_sent: false
      });
    }

    // Performance decline alert
    if (metrics.efficiency_score < thresholds.efficiency_minimum_score) {
      alerts.push({
        alert_type: 'performance_decline',
        severity: 'warning',
        title_ar: 'انخفاض في الأداء',
        title_en: 'Performance Decline',
        message_ar: `انخفض مستوى الكفاءة إلى ${metrics.efficiency_score.toFixed(0)}%`,
        message_en: `Efficiency level has dropped to ${metrics.efficiency_score.toFixed(0)}%`,
        triggered_at: currentTime,
        threshold_value: thresholds.efficiency_minimum_score,
        current_value: metrics.efficiency_score,
        recommended_actions: [
          {
            action_ar: 'مراجعة أسباب انخفاض الكفاءة',
            action_en: 'Review causes of efficiency decline',
            urgency: 'within_day'
          }
        ],
        auto_notification_sent: false
      });
    }

    // Burnout risk alert
    if (performance.burnout_risk_level === 'critical' || performance.burnout_risk_level === 'high') {
      alerts.push({
        alert_type: 'burnout_risk',
        severity: performance.burnout_risk_level === 'critical' ? 'emergency' : 'critical',
        title_ar: 'خطر الإرهاق المهني',
        title_en: 'Burnout Risk',
        message_ar: `مستوى خطر الإرهاق: ${performance.burnout_risk_level}`,
        message_en: `Burnout risk level: ${performance.burnout_risk_level}`,
        triggered_at: currentTime,
        threshold_value: thresholds.burnout_risk_threshold,
        current_value: metrics.utilization_percentage,
        recommended_actions: [
          {
            action_ar: 'تقليل العبء فوراً واستشارة الإدارة',
            action_en: 'Reduce workload immediately and consult management',
            urgency: 'immediate'
          },
          {
            action_ar: 'ترتيب إجازة أو أيام راحة إضافية',
            action_en: 'Arrange vacation or additional rest days',
            urgency: 'within_day'
          }
        ],
        auto_notification_sent: false
      });
    }

    return alerts;
  }

  private async storeWorkloadCalculation(workload: TherapistWorkload): Promise<void> {
    try {
      await supabase
        .from('therapist_workloads')
        .upsert(workload, {
          onConflict: 'therapist_id,calculation_date'
        });
    } catch (error) {
      console.error('Error storing workload calculation:', error);
    }
  }

  private async processAlertNotifications(alerts: WorkloadAlert[], therapist_id: string): Promise<void> {
    for (const alert of alerts) {
      if (alert.severity === 'critical' || alert.severity === 'emergency') {
        try {
          // Send immediate notification to management
          await supabase
            .from('notifications')
            .insert({
              recipient_type: 'role',
              recipient_ids: ['admin', 'manager'],
              title_ar: alert.title_ar,
              title_en: alert.title_en,
              message_ar: alert.message_ar,
              message_en: alert.message_en,
              type: 'workload_alert',
              urgency: alert.severity,
              metadata: {
                therapist_id,
                alert_type: alert.alert_type,
                current_value: alert.current_value,
                threshold_value: alert.threshold_value
              }
            });

          // Mark notification as sent
          alert.auto_notification_sent = true;

        } catch (error) {
          console.error('Error sending alert notification:', error);
        }
      }
    }
  }

  private async generateRedistributionRecommendations(
    therapist_ids: string[],
    workloads: Record<string, TherapistWorkload>
  ): Promise<WorkloadComparison['redistribution_recommendations']> {
    const recommendations: WorkloadComparison['redistribution_recommendations'] = [];

    // Find overloaded and underloaded therapists
    const overloaded = therapist_ids.filter(id => 
      workloads[id].current_metrics.utilization_percentage > 90
    );
    const underloaded = therapist_ids.filter(id => 
      workloads[id].current_metrics.utilization_percentage < 70 &&
      workloads[id].capacity_analysis.can_accept_new_student
    );

    // Generate redistribution recommendations
    for (const overloadedId of overloaded) {
      for (const underloadedId of underloaded) {
        const overloadedWorkload = workloads[overloadedId];
        const underloadedWorkload = workloads[underloadedId];
        
        const utilizationDifference = 
          overloadedWorkload.current_metrics.utilization_percentage - 
          underloadedWorkload.current_metrics.utilization_percentage;

        if (utilizationDifference > 20) {
          // Calculate potential improvement
          const expectedImprovement = Math.min(utilizationDifference * 0.3, 15);

          recommendations.push({
            from_therapist_id: overloadedId,
            to_therapist_id: underloadedId,
            student_ids: [], // Would be populated with actual student data
            expected_improvement: expectedImprovement
          });
        }
      }
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    let numerator = 0;
    let sumXSq = 0;
    let sumYSq = 0;

    for (let i = 0; i < x.length; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumXSq += diffX * diffX;
      sumYSq += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSq * sumYSq);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Export singleton instance
export const therapistWorkloadService = TherapistWorkloadService.getInstance();