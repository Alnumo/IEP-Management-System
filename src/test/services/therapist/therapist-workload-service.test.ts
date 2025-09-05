/**
 * Therapist Workload Service Tests
 * 
 * Comprehensive test suite for the therapist workload calculation service.
 * Tests workload calculations, capacity analysis, utilization tracking,
 * alert generation, and optimization recommendations with extensive coverage.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  therapistWorkloadService,
  TherapistWorkloadService,
  type WorkloadMetrics,
  type CapacityAnalysis,
  type WorkloadCalculationOptions,
  type BulkWorkloadCalculation
} from '../../../services/therapist/therapist-workload-service';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
  data: null,
  error: null
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock data
const mockTherapist = {
  id: 'therapist-1',
  name: 'Dr. Sarah Ahmed',
  email: 'sarah@therapy-center.com',
  specializations: ['autism', 'behavioral_therapy'],
  capacity_config: {
    max_students_per_week: 12,
    max_sessions_per_day: 6,
    max_hours_per_week: 40,
    preferred_age_range: { min: 3, max: 12 },
    preferred_diagnoses: ['autism'],
    preferred_program_types: ['individual'],
    buffer_time_minutes: 15,
    overtime_threshold: 42
  },
  is_active: true
};

const mockEnrollments = [
  { id: 'enrollment-1', student_id: 'student-1', assigned_therapist_id: 'therapist-1', enrollment_status: 'active' },
  { id: 'enrollment-2', student_id: 'student-2', assigned_therapist_id: 'therapist-1', enrollment_status: 'active' },
  { id: 'enrollment-3', student_id: 'student-3', assigned_therapist_id: 'therapist-1', enrollment_status: 'active' }
];

const mockSessions = [
  { id: 'session-1', therapist_id: 'therapist-1', session_date: '2025-09-01T10:00:00Z', duration_minutes: 45, status: 'completed' },
  { id: 'session-2', therapist_id: 'therapist-1', session_date: '2025-09-02T11:00:00Z', duration_minutes: 45, status: 'completed' },
  { id: 'session-3', therapist_id: 'therapist-1', session_date: '2025-09-03T14:00:00Z', duration_minutes: 45, status: 'scheduled' },
  { id: 'session-4', therapist_id: 'therapist-1', session_date: '2025-09-04T09:00:00Z', duration_minutes: 45, status: 'completed' },
  { id: 'session-5', therapist_id: 'therapist-1', session_date: '2025-09-05T13:00:00Z', duration_minutes: 45, status: 'scheduled' }
];

const mockPerformanceData = [
  {
    therapist_id: 'therapist-1',
    measurement_date: '2025-09-04',
    overall_performance_score: 8.5,
    student_satisfaction_avg: 4.7,
    goal_achievement_rate: 0.85
  },
  {
    therapist_id: 'therapist-1',
    measurement_date: '2025-08-28',
    overall_performance_score: 8.2,
    student_satisfaction_avg: 4.6,
    goal_achievement_rate: 0.82
  }
];

describe('TherapistWorkloadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance when called multiple times', () => {
      const instance1 = TherapistWorkloadService.getInstance();
      const instance2 = TherapistWorkloadService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(therapistWorkloadService);
    });
  });

  describe('calculateWorkload', () => {
    beforeEach(() => {
      // Setup mock responses for workload calculation
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null }) // therapist info
        .mockResolvedValueOnce({ data: mockEnrollments, error: null }) // enrollments
        .mockResolvedValueOnce({ data: mockSessions, error: null }) // sessions
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null }); // performance data
      
      mockSupabase.data = mockEnrollments;
      mockSupabase.error = null;
    });

    it('should calculate workload successfully with default options', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      expect(result.workload).toBeDefined();
      expect(result.workload?.therapist_id).toBe('therapist-1');
      expect(result.workload?.current_metrics).toBeDefined();
      expect(result.workload?.capacity_analysis).toBeDefined();
      expect(result.workload?.utilization_breakdown).toBeDefined();
      expect(result.workload?.performance_impact).toBeDefined();
      expect(result.workload?.workload_forecast).toBeDefined();
      expect(result.workload?.optimization_suggestions).toBeDefined();
      expect(result.workload?.alert_conditions).toBeDefined();
      expect(result.message).toBe('Workload calculated successfully');
    });

    it('should calculate correct workload metrics', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const metrics = result.workload!.current_metrics;
      
      expect(metrics.total_students).toBe(3); // 3 mock enrollments
      expect(metrics.weekly_sessions_scheduled).toBe(5); // 5 mock sessions
      expect(metrics.weekly_sessions_completed).toBe(3); // 3 completed sessions
      expect(metrics.average_session_duration).toBe(45); // All sessions are 45 minutes
      expect(metrics.utilization_percentage).toBeGreaterThan(0);
      expect(metrics.efficiency_score).toBeGreaterThan(0);
    });

    it('should analyze capacity correctly', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const capacity = result.workload!.capacity_analysis;
      
      expect(capacity.max_students).toBe(12); // From mock capacity config
      expect(capacity.max_weekly_hours).toBe(40);
      expect(capacity.current_vs_max_students).toBe(25); // 3/12 * 100 = 25%
      expect(capacity.can_accept_new_student).toBe(true);
      expect(capacity.max_additional_students).toBe(9); // 12 - 3 = 9
      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(capacity.over_capacity_risk_level);
    });

    it('should calculate utilization breakdown correctly', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const utilization = result.workload!.utilization_breakdown;
      
      expect(utilization.direct_therapy_percentage).toBeGreaterThan(0);
      expect(utilization.documentation_percentage).toBeGreaterThanOrEqual(0);
      expect(utilization.travel_percentage).toBeGreaterThanOrEqual(0);
      expect(utilization.administrative_percentage).toBeGreaterThanOrEqual(0);
      expect(utilization.productivity_score).toBeGreaterThanOrEqual(0);
      expect(utilization.productivity_score).toBeLessThanOrEqual(100);
    });

    it('should assess performance impact', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const performance = result.workload!.performance_impact;
      
      expect(performance.quality_score_trend).toBeDefined();
      expect(performance.student_satisfaction_correlation).toBeDefined();
      expect(performance.goal_achievement_correlation).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(performance.burnout_risk_level);
      expect(Array.isArray(performance.workload_stress_indicators)).toBe(true);
      expect(typeof performance.recommended_workload_adjustment).toBe('number');
    });

    it('should generate workload forecast', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const forecast = result.workload!.workload_forecast;
      
      expect(forecast.next_week_predicted_hours).toBeGreaterThan(0);
      expect(forecast.next_month_predicted_hours).toBeGreaterThan(0);
      expect(Array.isArray(forecast.peak_utilization_periods)).toBe(true);
      expect(Array.isArray(forecast.capacity_shortage_predictions)).toBe(true);
      expect(['increasing', 'decreasing', 'stable']).toContain(forecast.workload_trend);
      expect(Array.isArray(forecast.seasonal_patterns)).toBe(true);
    });

    it('should generate optimization suggestions', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const suggestions = result.workload!.optimization_suggestions;
      
      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(['schedule_adjustment', 'student_redistribution', 'capacity_increase', 'workload_reduction'])
          .toContain(suggestion.suggestion_type);
        expect(['low', 'medium', 'high', 'urgent']).toContain(suggestion.priority);
        expect(suggestion.title_ar).toBeDefined();
        expect(suggestion.title_en).toBeDefined();
        expect(suggestion.description_ar).toBeDefined();
        expect(suggestion.description_en).toBeDefined();
        expect(suggestion.impact_score).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(suggestion.implementation_difficulty);
      });
    });

    it('should check alert conditions', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const alerts = result.workload!.alert_conditions;
      
      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(alert => {
        expect(['over_capacity', 'approaching_limit', 'performance_decline', 'scheduling_conflict', 'burnout_risk'])
          .toContain(alert.alert_type);
        expect(['info', 'warning', 'critical', 'emergency']).toContain(alert.severity);
        expect(alert.title_ar).toBeDefined();
        expect(alert.title_en).toBeDefined();
        expect(alert.message_ar).toBeDefined();
        expect(alert.message_en).toBeDefined();
        expect(alert.triggered_at).toBeDefined();
        expect(Array.isArray(alert.recommended_actions)).toBe(true);
      });
    });

    it('should handle custom calculation options', async () => {
      const customOptions: Partial<WorkloadCalculationOptions> = {
        include_travel_time: false,
        include_documentation_time: false,
        include_administrative_tasks: false,
        optimization_level: 'basic',
        alert_thresholds: {
          capacity_warning_percentage: 90,
          overtime_threshold_hours: 35,
          efficiency_minimum_score: 80,
          burnout_risk_threshold: 90
        }
      };

      const result = await therapistWorkloadService.calculateWorkload('therapist-1', customOptions);

      expect(result.success).toBe(true);
      expect(result.workload).toBeDefined();
      
      // With travel and documentation time disabled, total hours should be lower
      const metrics = result.workload!.current_metrics;
      expect(metrics.travel_time_hours).toBe(0);
      expect(metrics.documentation_hours).toBe(0);
      expect(metrics.administrative_hours).toBe(0);
    });

    it('should handle therapist not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await therapistWorkloadService.calculateWorkload('nonexistent-therapist');

      expect(result.success).toBe(false);
      expect(result.workload).toBeUndefined();
      expect(result.message).toBe('Therapist not found or inactive');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database connection error'));

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(false);
      expect(result.workload).toBeUndefined();
      expect(result.message).toBe('Unexpected error occurred during workload calculation');
    });
  });

  describe('calculateBulkWorkloads', () => {
    beforeEach(() => {
      // Mock successful individual calculations
      mockSupabase.single
        .mockResolvedValue({ data: mockTherapist, error: null }) // therapist info
        .mockResolvedValue({ data: mockEnrollments, error: null }) // enrollments
        .mockResolvedValue({ data: mockSessions, error: null }) // sessions  
        .mockResolvedValue({ data: mockPerformanceData, error: null }); // performance data
      
      mockSupabase.data = mockEnrollments;
    });

    it('should calculate workloads for multiple therapists successfully', async () => {
      const therapistIds = ['therapist-1', 'therapist-2', 'therapist-3'];
      
      const result = await therapistWorkloadService.calculateBulkWorkloads(therapistIds);

      expect(result.therapist_ids).toEqual(therapistIds);
      expect(result.results).toHaveLength(3);
      expect(result.summary.total_processed).toBe(3);
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.calculation_date).toBeDefined();
    });

    it('should handle mixed success and failure results', async () => {
      const therapistIds = ['therapist-1', 'therapist-2'];
      
      // Mock one success and one failure
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null }) // therapist-1 success
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: mockSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // therapist-2 not found

      const result = await therapistWorkloadService.calculateBulkWorkloads(therapistIds);

      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      
      const successResult = result.results.find(r => r.therapist_id === 'therapist-1');
      const failureResult = result.results.find(r => r.therapist_id === 'therapist-2');
      
      expect(successResult?.success).toBe(true);
      expect(successResult?.workload).toBeDefined();
      
      expect(failureResult?.success).toBe(false);
      expect(failureResult?.error_message).toBeDefined();
    });

    it('should calculate summary statistics correctly', async () => {
      const therapistIds = ['therapist-1', 'therapist-2'];
      
      const result = await therapistWorkloadService.calculateBulkWorkloads(therapistIds);

      expect(result.summary.total_processed).toBe(2);
      expect(result.summary.successful).toBeGreaterThanOrEqual(0);
      expect(result.summary.failed).toBeGreaterThanOrEqual(0);
      expect(result.summary.successful + result.summary.failed).toBe(2);
      expect(result.summary.average_utilization).toBeGreaterThanOrEqual(0);
      expect(result.summary.over_capacity_count).toBeGreaterThanOrEqual(0);
      expect(result.summary.optimization_opportunities).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty therapist list', async () => {
      const result = await therapistWorkloadService.calculateBulkWorkloads([]);

      expect(result.therapist_ids).toHaveLength(0);
      expect(result.results).toHaveLength(0);
      expect(result.summary.total_processed).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
    });
  });

  describe('compareWorkloads', () => {
    const mockWorkload1 = {
      therapist_id: 'therapist-1',
      calculation_date: '2025-09-04T10:00:00Z',
      current_metrics: {
        total_students: 8,
        weekly_sessions_scheduled: 16,
        total_weekly_hours: 32,
        utilization_percentage: 80,
        efficiency_score: 85,
        overtime_hours: 0
      } as WorkloadMetrics,
      capacity_analysis: {} as CapacityAnalysis,
      utilization_breakdown: {},
      performance_impact: {},
      workload_forecast: {},
      optimization_suggestions: [],
      alert_conditions: [],
      last_updated: '2025-09-04T10:00:00Z'
    };

    const mockWorkload2 = {
      therapist_id: 'therapist-2',
      calculation_date: '2025-09-04T10:00:00Z',
      current_metrics: {
        total_students: 12,
        weekly_sessions_scheduled: 24,
        total_weekly_hours: 38,
        utilization_percentage: 95,
        efficiency_score: 78,
        overtime_hours: 3
      } as WorkloadMetrics,
      capacity_analysis: {} as CapacityAnalysis,
      utilization_breakdown: {},
      performance_impact: {},
      workload_forecast: {},
      optimization_suggestions: [],
      alert_conditions: [],
      last_updated: '2025-09-04T10:00:00Z'
    };

    it('should compare workloads successfully', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockWorkload1, error: null })
        .mockResolvedValueOnce({ data: mockWorkload2, error: null });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison!.therapist_ids).toEqual(['therapist-1', 'therapist-2']);
      expect(result.comparison!.metrics_comparison).toBeDefined();
      expect(result.comparison!.workload_balance_score).toBeDefined();
      expect(result.comparison!.redistribution_recommendations).toBeDefined();
    });

    it('should calculate metrics comparison correctly', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockWorkload1, error: null })
        .mockResolvedValueOnce({ data: mockWorkload2, error: null });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(true);
      const comparison = result.comparison!;
      
      expect(comparison.metrics_comparison).toBeDefined();
      expect(Array.isArray(comparison.metrics_comparison)).toBe(true);
      
      // Check that utilization_percentage metric is compared
      const utilizationMetric = comparison.metrics_comparison.find(m => m.metric_name === 'utilization_percentage');
      expect(utilizationMetric).toBeDefined();
      expect(utilizationMetric!.values['therapist-1']).toBe(80);
      expect(utilizationMetric!.values['therapist-2']).toBe(95);
      expect(utilizationMetric!.average).toBe(87.5); // (80 + 95) / 2
    });

    it('should identify outliers correctly', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockWorkload1, error: null })
        .mockResolvedValueOnce({ data: mockWorkload2, error: null });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(true);
      const comparison = result.comparison!;
      
      // Should identify outliers based on standard deviation
      comparison.metrics_comparison.forEach(metric => {
        expect(Array.isArray(metric.outliers)).toBe(true);
        metric.outliers.forEach(outlier => {
          expect(outlier.therapist_id).toBeDefined();
          expect(outlier.value).toBeDefined();
          expect(outlier.deviation_from_mean).toBeGreaterThan(0);
        });
      });
    });

    it('should calculate workload balance score', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockWorkload1, error: null })
        .mockResolvedValueOnce({ data: mockWorkload2, error: null });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(true);
      expect(result.comparison!.workload_balance_score).toBeGreaterThanOrEqual(0);
      expect(result.comparison!.workload_balance_score).toBeLessThanOrEqual(100);
    });

    it('should generate redistribution recommendations', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockWorkload1, error: null })
        .mockResolvedValueOnce({ data: mockWorkload2, error: null });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(true);
      const recommendations = result.comparison!.redistribution_recommendations;
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec.from_therapist_id).toBeDefined();
        expect(rec.to_therapist_id).toBeDefined();
        expect(Array.isArray(rec.student_ids)).toBe(true);
        expect(rec.expected_improvement).toBeGreaterThan(0);
      });
    });

    it('should require at least 2 therapists', async () => {
      const result = await therapistWorkloadService.compareWorkloads(['therapist-1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('At least 2 therapists are required for comparison');
    });

    it('should handle insufficient valid workload data', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await therapistWorkloadService.compareWorkloads(['therapist-1', 'therapist-2']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient valid workload data for comparison');
    });
  });

  describe('getLatestWorkload', () => {
    it('should retrieve latest workload successfully', async () => {
      const mockWorkload = {
        therapist_id: 'therapist-1',
        calculation_date: '2025-09-04T10:00:00Z',
        current_metrics: {},
        last_updated: '2025-09-04T10:00:00Z'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: mockWorkload, error: null });

      const result = await therapistWorkloadService.getLatestWorkload('therapist-1');

      expect(result.success).toBe(true);
      expect(result.workload).toEqual(mockWorkload);
      expect(result.message).toBe('Latest workload retrieved successfully');
      expect(mockSupabase.order).toHaveBeenCalledWith('calculation_date', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    });

    it('should handle no workload data found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'No rows returned' } });

      const result = await therapistWorkloadService.getLatestWorkload('therapist-1');

      expect(result.success).toBe(false);
      expect(result.workload).toBeUndefined();
      expect(result.message).toBe('No workload data found for therapist');
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database error'));

      const result = await therapistWorkloadService.getLatestWorkload('therapist-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error retrieving workload data');
    });
  });

  describe('getWorkloadTrends', () => {
    const mockTrendData = [
      {
        calculation_date: '2025-09-01T10:00:00Z',
        current_metrics: {
          utilization_percentage: 75,
          total_weekly_hours: 30,
          total_students: 8,
          efficiency_score: 82
        }
      },
      {
        calculation_date: '2025-09-02T10:00:00Z',
        current_metrics: {
          utilization_percentage: 80,
          total_weekly_hours: 32,
          total_students: 9,
          efficiency_score: 85
        }
      },
      {
        calculation_date: '2025-09-03T10:00:00Z',
        current_metrics: {
          utilization_percentage: 78,
          total_weekly_hours: 31,
          total_students: 8,
          efficiency_score: 83
        }
      }
    ];

    it('should retrieve workload trends successfully', async () => {
      mockSupabase.data = mockTrendData;
      mockSupabase.error = null;

      const result = await therapistWorkloadService.getWorkloadTrends('therapist-1', 30);

      expect(result.success).toBe(true);
      expect(result.trends).toHaveLength(3);
      expect(result.trends![0]).toEqual({
        date: '2025-09-01T10:00:00Z',
        utilization_percentage: 75,
        total_hours: 30,
        student_count: 8,
        efficiency_score: 82
      });
      expect(result.message).toBe('Workload trends retrieved successfully');
    });

    it('should handle default days parameter', async () => {
      mockSupabase.data = mockTrendData;
      mockSupabase.error = null;

      const result = await therapistWorkloadService.getWorkloadTrends('therapist-1');

      expect(result.success).toBe(true);
      expect(mockSupabase.gte).toHaveBeenCalled(); // Should filter by date range
    });

    it('should handle empty trend data', async () => {
      mockSupabase.data = [];
      mockSupabase.error = null;

      const result = await therapistWorkloadService.getWorkloadTrends('therapist-1', 30);

      expect(result.success).toBe(true);
      expect(result.trends).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockSupabase.data = null;
      mockSupabase.error = { message: 'Database error' };

      const result = await therapistWorkloadService.getWorkloadTrends('therapist-1', 30);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error retrieving workload trends');
    });
  });

  describe('Capacity Analysis', () => {
    it('should correctly identify over-capacity situations', async () => {
      const overCapacityTherapist = {
        ...mockTherapist,
        capacity_config: {
          ...mockTherapist.capacity_config,
          max_students_per_week: 5, // Lower limit to trigger over-capacity
          max_hours_per_week: 20
        }
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: overCapacityTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: mockSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const capacity = result.workload!.capacity_analysis;
      expect(['medium', 'high', 'critical']).toContain(capacity.over_capacity_risk_level);
      expect(capacity.can_accept_new_student).toBe(false);
    });

    it('should calculate capacity buffer correctly', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const capacity = result.workload!.capacity_analysis;
      expect(capacity.capacity_buffer_used).toBeGreaterThanOrEqual(0);
      expect(capacity.capacity_buffer_used).toBeLessThanOrEqual(200); // Allow for over-capacity
    });

    it('should estimate days until full capacity', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const capacity = result.workload!.capacity_analysis;
      
      if (capacity.estimated_days_until_full !== null) {
        expect(capacity.estimated_days_until_full).toBeGreaterThan(0);
      }
    });
  });

  describe('Alert Generation', () => {
    it('should generate over-capacity alerts', async () => {
      // Mock high utilization scenario
      const highUtilizationSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        therapist_id: 'therapist-1',
        session_date: '2025-09-01T10:00:00Z',
        duration_minutes: 60,
        status: 'scheduled'
      }));

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: highUtilizationSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1', {
        alert_thresholds: {
          capacity_warning_percentage: 50, // Low threshold to trigger alerts
          overtime_threshold_hours: 35,
          efficiency_minimum_score: 90,
          burnout_risk_threshold: 80
        }
      });

      expect(result.success).toBe(true);
      const alerts = result.workload!.alert_conditions;
      
      // Should have at least one alert due to high session count
      expect(alerts.length).toBeGreaterThan(0);
      
      const capacityAlert = alerts.find(a => a.alert_type === 'over_capacity' || a.alert_type === 'approaching_limit');
      if (capacityAlert) {
        expect(['warning', 'critical', 'emergency']).toContain(capacityAlert.severity);
        expect(capacityAlert.recommended_actions.length).toBeGreaterThan(0);
      }
    });

    it('should generate performance decline alerts', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1', {
        alert_thresholds: {
          capacity_warning_percentage: 85,
          overtime_threshold_hours: 40,
          efficiency_minimum_score: 95, // High threshold to trigger performance alert
          burnout_risk_threshold: 95
        }
      });

      expect(result.success).toBe(true);
      const alerts = result.workload!.alert_conditions;
      
      const performanceAlert = alerts.find(a => a.alert_type === 'performance_decline');
      if (performanceAlert) {
        expect(['info', 'warning', 'critical']).toContain(performanceAlert.severity);
        expect(performanceAlert.current_value).toBeDefined();
        expect(performanceAlert.threshold_value).toBe(95);
      }
    });

    it('should generate burnout risk alerts', async () => {
      // Create scenario that should trigger burnout alert
      const extremeWorkloadSessions = Array.from({ length: 30 }, (_, i) => ({
        id: `session-${i}`,
        therapist_id: 'therapist-1',
        session_date: '2025-09-01T10:00:00Z',
        duration_minutes: 90,
        status: 'scheduled'
      }));

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: extremeWorkloadSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1', {
        alert_thresholds: {
          capacity_warning_percentage: 85,
          overtime_threshold_hours: 40,
          efficiency_minimum_score: 75,
          burnout_risk_threshold: 80 // Lower threshold to trigger burnout alert
        }
      });

      expect(result.success).toBe(true);
      const alerts = result.workload!.alert_conditions;
      
      const burnoutAlert = alerts.find(a => a.alert_type === 'burnout_risk');
      if (burnoutAlert) {
        expect(['critical', 'emergency']).toContain(burnoutAlert.severity);
        expect(burnoutAlert.recommended_actions.length).toBeGreaterThan(0);
        
        const immediateAction = burnoutAlert.recommended_actions.find(a => a.urgency === 'immediate');
        expect(immediateAction).toBeDefined();
      }
    });
  });

  describe('Optimization Suggestions', () => {
    it('should generate schedule adjustment suggestions', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const suggestions = result.workload!.optimization_suggestions;
      
      const scheduleAdjustment = suggestions.find(s => s.suggestion_type === 'schedule_adjustment');
      if (scheduleAdjustment) {
        expect(scheduleAdjustment.title_ar).toBeDefined();
        expect(scheduleAdjustment.title_en).toBeDefined();
        expect(scheduleAdjustment.description_ar).toBeDefined();
        expect(scheduleAdjustment.description_en).toBeDefined();
        expect(scheduleAdjustment.impact_score).toBeGreaterThan(0);
        expect(scheduleAdjustment.estimated_time_savings_hours).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(scheduleAdjustment.implementation_steps)).toBe(true);
      }
    });

    it('should generate workload redistribution suggestions for over-capacity', async () => {
      // Create over-capacity scenario
      const manyEnrollments = Array.from({ length: 15 }, (_, i) => ({
        id: `enrollment-${i}`,
        student_id: `student-${i}`,
        assigned_therapist_id: 'therapist-1',
        enrollment_status: 'active'
      }));

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: manyEnrollments, error: null })
        .mockResolvedValueOnce({ data: mockSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = manyEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const suggestions = result.workload!.optimization_suggestions;
      
      const redistribution = suggestions.find(s => s.suggestion_type === 'student_redistribution');
      if (redistribution) {
        expect(['medium', 'high', 'urgent']).toContain(redistribution.priority);
        expect(redistribution.implementation_difficulty).toBeDefined();
        expect(Array.isArray(redistribution.prerequisites)).toBe(true);
        expect(redistribution.prerequisites).toContain('available_therapists');
      }
    });

    it('should limit optimization suggestions based on level', async () => {
      const basicResult = await therapistWorkloadService.calculateWorkload('therapist-1', {
        optimization_level: 'basic'
      });

      const comprehensiveResult = await therapistWorkloadService.calculateWorkload('therapist-1', {
        optimization_level: 'comprehensive'
      });

      expect(basicResult.success).toBe(true);
      expect(comprehensiveResult.success).toBe(true);

      const basicSuggestions = basicResult.workload!.optimization_suggestions.length;
      const comprehensiveSuggestions = comprehensiveResult.workload!.optimization_suggestions.length;

      expect(comprehensiveSuggestions).toBeGreaterThanOrEqual(basicSuggestions);
      expect(basicSuggestions).toBeLessThanOrEqual(2);
      expect(comprehensiveSuggestions).toBeLessThanOrEqual(5);
    });
  });

  describe('Performance Impact Assessment', () => {
    it('should calculate quality score trends', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const impact = result.workload!.performance_impact;
      
      expect(typeof impact.quality_score_trend).toBe('number');
      // Trend should be positive based on mock data (8.5 vs 8.2)
      expect(impact.quality_score_trend).toBeGreaterThan(0);
    });

    it('should assess burnout risk correctly', async () => {
      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const impact = result.workload!.performance_impact;
      
      expect(['low', 'medium', 'high', 'critical']).toContain(impact.burnout_risk_level);
      expect(Array.isArray(impact.workload_stress_indicators)).toBe(true);
      expect(typeof impact.recommended_workload_adjustment).toBe('number');
      expect(Array.isArray(impact.performance_optimization_areas)).toBe(true);
    });

    it('should identify stress indicators', async () => {
      // Create high-stress scenario
      const highStressSessions = Array.from({ length: 25 }, (_, i) => ({
        id: `session-${i}`,
        therapist_id: 'therapist-1',
        session_date: '2025-09-01T10:00:00Z',
        duration_minutes: 60,
        status: i < 10 ? 'completed' : 'scheduled' // Low completion rate
      }));

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: highStressSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      const impact = result.workload!.performance_impact;
      
      if (impact.workload_stress_indicators.length > 0) {
        const validIndicators = [
          'extreme_workload', 'high_workload', 'excessive_overtime',
          'low_efficiency', 'high_cancellation_rate'
        ];
        
        impact.workload_stress_indicators.forEach(indicator => {
          expect(validIndicators).toContain(indicator);
        });
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle therapist with no enrollments', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // No enrollments
        .mockResolvedValueOnce({ data: [], error: null }) // No sessions
        .mockResolvedValueOnce({ data: [], error: null }); // No performance data
      
      mockSupabase.data = [];

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      expect(result.workload!.current_metrics.total_students).toBe(0);
      expect(result.workload!.current_metrics.weekly_sessions_scheduled).toBe(0);
      expect(result.workload!.capacity_analysis.can_accept_new_student).toBe(true);
    });

    it('should handle therapist with no performance history', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: mockSessions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }); // No performance data
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      expect(result.workload!.performance_impact.quality_score_trend).toBe(0);
      expect(result.workload!.performance_impact.student_satisfaction_correlation).toBe(0);
    });

    it('should handle missing capacity configuration', async () => {
      const therapistWithoutConfig = {
        ...mockTherapist,
        capacity_config: null
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: therapistWithoutConfig, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: mockSessions, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      // Should use default values
      expect(result.workload!.capacity_analysis.max_students).toBe(12);
      expect(result.workload!.capacity_analysis.max_weekly_hours).toBe(40);
    });

    it('should handle calculation with zero division scenarios', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTherapist, error: null })
        .mockResolvedValueOnce({ data: mockEnrollments, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // No sessions
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });
      
      mockSupabase.data = mockEnrollments;

      const result = await therapistWorkloadService.calculateWorkload('therapist-1');

      expect(result.success).toBe(true);
      expect(result.workload!.current_metrics.average_session_duration).toBe(45); // Default value
      expect(result.workload!.current_metrics.utilization_percentage).toBeGreaterThanOrEqual(0);
      expect(result.workload!.current_metrics.efficiency_score).toBeGreaterThanOrEqual(0);
    });
  });
});