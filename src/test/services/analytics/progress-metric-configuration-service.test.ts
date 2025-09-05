/**
 * Progress Metric Configuration Service Tests
 * 
 * Comprehensive test suite for customizable progress metrics functionality.
 * Tests metric creation, validation, templates, bulk operations, and
 * bilingual support with extensive edge case coverage.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  progressMetricConfigService,
  ProgressMetricConfigurationService,
  type MetricConfigurationRequest,
  type ProgressMetricDefinition,
  type MetricValidationRules,
  type MetricDisplayConfig
} from '../../../services/analytics/progress-metric-configuration-service';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  contains: vi.fn(() => mockSupabase),
  overlaps: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
  data: null,
  error: null
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('ProgressMetricConfigurationService', () => {
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
      const instance1 = ProgressMetricConfigurationService.getInstance();
      const instance2 = ProgressMetricConfigurationService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(progressMetricConfigService);
    });
  });

  describe('createMetricDefinition', () => {
    const validRequest: MetricConfigurationRequest = {
      name_ar: 'معدل التحسن',
      name_en: 'Improvement Rate',
      description_ar: 'قياس معدل التحسن في الأداء',
      description_en: 'Measures improvement rate in performance',
      metric_type: 'percentage',
      data_source: 'assessment_scores',
      calculation_formula: '(current_score - baseline_score) / baseline_score * 100',
      validation_rules: {
        min_value: 0,
        max_value: 100,
        required: true,
        data_type: 'decimal'
      } as MetricValidationRules,
      display_config: {
        chart_type: 'line',
        color_scheme: '#3b82f6',
        show_trend: true,
        show_target: true,
        target_value: 80,
        unit_ar: '%',
        unit_en: '%',
        decimal_places: 2,
        show_in_dashboard: true,
        dashboard_priority: 1,
        responsive_breakpoints: {
          mobile: true,
          tablet: true,
          desktop: true
        }
      } as MetricDisplayConfig,
      scope: 'global'
    };

    it('should create metric definition successfully', async () => {
      const mockMetric: ProgressMetricDefinition = {
        id: 'metric-123',
        ...validRequest,
        is_active: true,
        is_required: false,
        sort_order: 1,
        created_at: '2025-09-04T10:00:00Z',
        updated_at: '2025-09-04T10:00:00Z',
        created_by: 'user-123',
        updated_by: 'user-123'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: mockMetric, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // For name conflict check

      const result = await progressMetricConfigService.createMetricDefinition(validRequest, 'user-123');

      expect(result.success).toBe(true);
      expect(result.metric).toEqual(mockMetric);
      expect(result.message).toBe('Progress metric definition created successfully');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should reject invalid calculation formula', async () => {
      const invalidRequest = {
        ...validRequest,
        calculation_formula: 'eval("malicious code")'
      };

      const result = await progressMetricConfigService.createMetricDefinition(invalidRequest, 'user-123');

      expect(result.success).toBe(false);
      expect(result.metric).toBeNull();
      expect(result.message).toContain('Invalid calculation formula');
    });

    it('should prevent naming conflicts', async () => {
      const existingMetric: ProgressMetricDefinition = {
        id: 'existing-123',
        ...validRequest,
        is_active: true,
        is_required: false,
        sort_order: 1,
        created_at: '2025-09-04T09:00:00Z',
        updated_at: '2025-09-04T09:00:00Z',
        created_by: 'user-456',
        updated_by: 'user-456'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: existingMetric, error: null });

      const result = await progressMetricConfigService.createMetricDefinition(validRequest, 'user-123');

      expect(result.success).toBe(false);
      expect(result.metric).toBeNull();
      expect(result.message).toBe('A metric with this name already exists in the specified scope');
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // Name conflict check
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await progressMetricConfigService.createMetricDefinition(validRequest, 'user-123');

      expect(result.success).toBe(false);
      expect(result.metric).toBeNull();
      expect(result.message).toBe('Failed to create metric definition in database');
    });

    it('should handle Arabic RTL metric names correctly', async () => {
      const arabicRequest = {
        ...validRequest,
        name_ar: 'نسبة الحضور والانتباه في الجلسات العلاجية',
        name_en: 'Session Attendance Rate'
      };

      const mockMetric: ProgressMetricDefinition = {
        id: 'metric-arabic-123',
        ...arabicRequest,
        is_active: true,
        is_required: false,
        sort_order: 1,
        created_at: '2025-09-04T10:00:00Z',
        updated_at: '2025-09-04T10:00:00Z',
        created_by: 'user-123',
        updated_by: 'user-123'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: mockMetric, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await progressMetricConfigService.createMetricDefinition(arabicRequest, 'user-123');

      expect(result.success).toBe(true);
      expect(result.metric?.name_ar).toBe(arabicRequest.name_ar);
      expect(result.metric?.name_en).toBe(arabicRequest.name_en);
    });
  });

  describe('updateMetricDefinition', () => {
    it('should update metric definition successfully', async () => {
      const updates = {
        name_en: 'Updated Metric Name',
        calculation_formula: 'updated_score * 100'
      };

      const updatedMetric: ProgressMetricDefinition = {
        id: 'metric-123',
        name_ar: 'معدل التحسن المحدث',
        name_en: 'Updated Metric Name',
        description_ar: 'وصف محدث',
        description_en: 'Updated description',
        metric_type: 'percentage',
        data_source: 'assessment_scores',
        calculation_formula: 'updated_score * 100',
        validation_rules: { required: true, data_type: 'decimal' } as MetricValidationRules,
        display_config: {} as MetricDisplayConfig,
        scope: 'global',
        is_active: true,
        is_required: false,
        sort_order: 1,
        created_at: '2025-09-04T10:00:00Z',
        updated_at: '2025-09-04T11:00:00Z',
        created_by: 'user-123',
        updated_by: 'user-456'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // Name conflict check
      mockSupabase.single.mockResolvedValueOnce({ data: updatedMetric, error: null });

      const result = await progressMetricConfigService.updateMetricDefinition('metric-123', updates, 'user-456');

      expect(result.success).toBe(true);
      expect(result.metric).toEqual(updatedMetric);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should reject invalid formula updates', async () => {
      const updates = {
        calculation_formula: 'setTimeout(() => {}, 1000)'
      };

      const result = await progressMetricConfigService.updateMetricDefinition('metric-123', updates, 'user-456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid calculation formula');
    });
  });

  describe('getMetricDefinitions', () => {
    it('should retrieve global metrics successfully', async () => {
      const mockMetrics: ProgressMetricDefinition[] = [
        {
          id: 'metric-1',
          name_ar: 'المقياس الأول',
          name_en: 'First Metric',
          description_ar: 'وصف المقياس الأول',
          description_en: 'Description of first metric',
          metric_type: 'numeric',
          data_source: 'assessment_scores',
          calculation_formula: 'score * 10',
          validation_rules: { required: true, data_type: 'integer' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'global',
          is_active: true,
          is_required: false,
          sort_order: 1,
          created_at: '2025-09-04T10:00:00Z',
          updated_at: '2025-09-04T10:00:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        },
        {
          id: 'metric-2',
          name_ar: 'المقياس الثاني',
          name_en: 'Second Metric',
          description_ar: 'وصف المقياس الثاني',
          description_en: 'Description of second metric',
          metric_type: 'percentage',
          data_source: 'attendance',
          calculation_formula: 'attendance_rate * 100',
          validation_rules: { required: false, data_type: 'decimal' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'global',
          is_active: true,
          is_required: false,
          sort_order: 2,
          created_at: '2025-09-04T10:05:00Z',
          updated_at: '2025-09-04T10:05:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        }
      ];

      mockSupabase.data = mockMetrics;
      mockSupabase.error = null;

      // Mock the query chain
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);

      const result = await progressMetricConfigService.getMetricDefinitions('global');

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0].scope).toBe('global');
      expect(mockSupabase.eq).toHaveBeenCalledWith('scope', 'global');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should filter by program template ID', async () => {
      const mockMetrics: ProgressMetricDefinition[] = [
        {
          id: 'metric-program-1',
          name_ar: 'مقياس خاص بالبرنامج',
          name_en: 'Program Specific Metric',
          description_ar: 'مقياس مخصص للبرنامج',
          description_en: 'Program customized metric',
          metric_type: 'numeric',
          data_source: 'session_notes',
          calculation_formula: 'progress_score',
          validation_rules: { required: true, data_type: 'integer' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'program_specific',
          program_template_ids: ['program-template-123'],
          is_active: true,
          is_required: false,
          sort_order: 1,
          created_at: '2025-09-04T10:00:00Z',
          updated_at: '2025-09-04T10:00:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        }
      ];

      mockSupabase.data = mockMetrics;
      mockSupabase.error = null;

      const result = await progressMetricConfigService.getMetricDefinitions('program_specific', 'program-template-123');

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].program_template_ids).toContain('program-template-123');
      expect(mockSupabase.contains).toHaveBeenCalledWith('program_template_ids', ['program-template-123']);
    });

    it('should include inactive metrics when requested', async () => {
      const mockMetrics: ProgressMetricDefinition[] = [
        {
          id: 'inactive-metric',
          name_ar: 'مقياس غير نشط',
          name_en: 'Inactive Metric',
          description_ar: 'مقياس معطل',
          description_en: 'Disabled metric',
          metric_type: 'boolean',
          data_source: 'behavioral_data',
          calculation_formula: 'behavior_flag',
          validation_rules: { required: false, data_type: 'boolean' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'global',
          is_active: false,
          is_required: false,
          sort_order: 1,
          created_at: '2025-09-04T10:00:00Z',
          updated_at: '2025-09-04T10:00:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        }
      ];

      mockSupabase.data = mockMetrics;
      mockSupabase.error = null;

      const result = await progressMetricConfigService.getMetricDefinitions('all', undefined, false);

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].is_active).toBe(false);
    });

    it('should handle database errors', async () => {
      mockSupabase.data = null;
      mockSupabase.error = { message: 'Database connection error' };

      const result = await progressMetricConfigService.getMetricDefinitions();

      expect(result.success).toBe(false);
      expect(result.metrics).toHaveLength(0);
      expect(result.message).toBe('Failed to fetch metric definitions');
    });
  });

  describe('testMetricCalculation', () => {
    const mockMetric: ProgressMetricDefinition = {
      id: 'metric-test-123',
      name_ar: 'مقياس الاختبار',
      name_en: 'Test Metric',
      description_ar: 'مقياس للاختبار',
      description_en: 'Metric for testing',
      metric_type: 'percentage',
      data_source: 'assessment_scores',
      calculation_formula: '(current_score - baseline_score) / baseline_score * 100',
      validation_rules: {
        min_value: 0,
        max_value: 200,
        required: true,
        data_type: 'decimal'
      } as MetricValidationRules,
      display_config: {} as MetricDisplayConfig,
      scope: 'global',
      is_active: true,
      is_required: false,
      sort_order: 1,
      created_at: '2025-09-04T10:00:00Z',
      updated_at: '2025-09-04T10:00:00Z',
      created_by: 'user-123',
      updated_by: 'user-123'
    };

    it('should test metric calculation successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockMetric, error: null });

      const sampleData = {
        current_score: 90,
        baseline_score: 75
      };

      const result = await progressMetricConfigService.testMetricCalculation('metric-test-123', sampleData);

      expect(result.is_valid).toBe(true);
      expect(result.formula_executed).toBe(true);
      expect(result.validation_passed).toBe(true);
      expect(result.calculated_result).toBeCloseTo(20); // (90-75)/75*100 = 20%
      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid formulas', async () => {
      const invalidMetric = {
        ...mockMetric,
        calculation_formula: 'undefined_variable * 100'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: invalidMetric, error: null });

      const result = await progressMetricConfigService.testMetricCalculation('metric-test-123');

      expect(result.is_valid).toBe(false);
      expect(result.formula_executed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate result against rules', async () => {
      const restrictiveMetric = {
        ...mockMetric,
        calculation_formula: '300', // Will exceed max_value of 200
        validation_rules: {
          min_value: 0,
          max_value: 200,
          required: true,
          data_type: 'decimal'
        } as MetricValidationRules
      };

      mockSupabase.single.mockResolvedValueOnce({ data: restrictiveMetric, error: null });

      const result = await progressMetricConfigService.testMetricCalculation('metric-test-123');

      expect(result.formula_executed).toBe(true);
      expect(result.validation_passed).toBe(false);
      expect(result.calculated_result).toBe(300);
      expect(result.errors).toContain('Value must be at most 200');
    });

    it('should handle metric not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await progressMetricConfigService.testMetricCalculation('nonexistent-metric');

      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Metric definition not found');
    });

    it('should generate appropriate sample data for different data sources', async () => {
      const attendanceMetric = {
        ...mockMetric,
        data_source: 'attendance' as const,
        calculation_formula: 'attendance_rate * 100'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: attendanceMetric, error: null });

      const result = await progressMetricConfigService.testMetricCalculation('metric-test-123');

      expect(result.sample_data_used.test_input).toBe(0.85); // Attendance rate sample
      expect(result.sample_data_used.attendance_rate).toBeDefined();
    });
  });

  describe('createMetricTemplate', () => {
    it('should create metric template successfully', async () => {
      const mockMetrics: ProgressMetricDefinition[] = [
        {
          id: 'metric-1',
          name_ar: 'المقياس الأول',
          name_en: 'First Metric',
          description_ar: 'وصف المقياس الأول',
          description_en: 'Description of first metric',
          metric_type: 'numeric',
          data_source: 'assessment_scores',
          calculation_formula: 'score * 10',
          validation_rules: { required: true, data_type: 'integer' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'global',
          is_active: true,
          is_required: false,
          sort_order: 1,
          created_at: '2025-09-04T10:00:00Z',
          updated_at: '2025-09-04T10:00:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        }
      ];

      const mockTemplate = {
        id: 'template-123',
        template_name_ar: 'قالب المقاييس الأساسية',
        template_name_en: 'Basic Metrics Template',
        description_ar: 'قالب يحتوي على المقاييس الأساسية',
        description_en: 'Template containing basic metrics',
        category: 'clinical',
        target_audience: 'autism',
        metrics: mockMetrics,
        is_system_template: false,
        usage_count: 0,
        rating: 0,
        created_at: '2025-09-04T10:00:00Z',
        created_by: 'user-123'
      };

      mockSupabase.data = mockMetrics;
      mockSupabase.error = null;
      mockSupabase.single.mockResolvedValueOnce({ data: mockTemplate, error: null });

      const result = await progressMetricConfigService.createMetricTemplate(
        'قالب المقاييس الأساسية',
        'Basic Metrics Template',
        'قالب يحتوي على المقاييس الأساسية',
        'Template containing basic metrics',
        'clinical',
        'autism',
        ['metric-1'],
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.template).toEqual(mockTemplate);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle missing metrics', async () => {
      mockSupabase.data = null;
      mockSupabase.error = { message: 'Not found' };

      const result = await progressMetricConfigService.createMetricTemplate(
        'قالب فارغ',
        'Empty Template',
        'قالب بدون مقاييس',
        'Template without metrics',
        'clinical',
        'general',
        ['nonexistent-metric'],
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve metric definitions for template');
    });
  });

  describe('applyMetricTemplate', () => {
    const mockTemplate = {
      id: 'template-123',
      template_name_ar: 'قالب المقاييس',
      template_name_en: 'Metrics Template',
      description_ar: 'قالب للمقاييس',
      description_en: 'Template for metrics',
      category: 'clinical',
      target_audience: 'autism',
      metrics: [
        {
          id: 'template-metric-1',
          name_ar: 'مقياس القالب الأول',
          name_en: 'Template Metric 1',
          description_ar: 'مقياس من القالب',
          description_en: 'Metric from template',
          metric_type: 'numeric',
          data_source: 'assessment_scores',
          calculation_formula: 'score * 10',
          validation_rules: { required: true, data_type: 'integer' } as MetricValidationRules,
          display_config: {} as MetricDisplayConfig,
          scope: 'global',
          is_active: true,
          is_required: false,
          sort_order: 1,
          created_at: '2025-09-04T10:00:00Z',
          updated_at: '2025-09-04T10:00:00Z',
          created_by: 'user-123',
          updated_by: 'user-123'
        }
      ] as ProgressMetricDefinition[],
      is_system_template: false,
      usage_count: 1,
      rating: 0,
      created_at: '2025-09-04T10:00:00Z',
      created_by: 'user-123'
    };

    it('should apply template successfully', async () => {
      const mockCreatedMetric: ProgressMetricDefinition = {
        id: 'new-metric-123',
        name_ar: 'مقياس القالب الأول',
        name_en: 'Template Metric 1',
        description_ar: 'مقياس من القالب',
        description_en: 'Metric from template',
        metric_type: 'numeric',
        data_source: 'assessment_scores',
        calculation_formula: 'score * 10',
        validation_rules: { required: true, data_type: 'integer' } as MetricValidationRules,
        display_config: {} as MetricDisplayConfig,
        scope: 'program_specific',
        program_template_ids: ['program-template-456'],
        is_active: true,
        is_required: false,
        sort_order: 1,
        created_at: '2025-09-04T11:00:00Z',
        updated_at: '2025-09-04T11:00:00Z',
        created_by: 'user-456',
        updated_by: 'user-456'
      };

      // Mock template retrieval
      mockSupabase.single.mockResolvedValueOnce({ data: mockTemplate, error: null });
      
      // Mock metric creation (called internally by createMetricDefinition)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // Name conflict check
      mockSupabase.single.mockResolvedValueOnce({ data: mockCreatedMetric, error: null }); // Insert result
      
      // Mock template usage update
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null });

      const result = await progressMetricConfigService.applyMetricTemplate(
        'template-123',
        'program-template-456',
        'user-456'
      );

      expect(result.total_processed).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.created_metrics).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle template not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Template not found' } });

      const result = await progressMetricConfigService.applyMetricTemplate(
        'nonexistent-template',
        'program-template-456',
        'user-456'
      );

      expect(result.total_processed).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].metric_id).toBe('template');
      expect(result.errors[0].error_message).toBe('Metric template not found');
    });

    it('should handle partial failures in bulk operation', async () => {
      const templateWithMultipleMetrics = {
        ...mockTemplate,
        metrics: [
          mockTemplate.metrics[0],
          {
            ...mockTemplate.metrics[0],
            id: 'template-metric-2',
            name_en: 'Template Metric 2',
            calculation_formula: 'eval("malicious")' // Invalid formula
          }
        ] as ProgressMetricDefinition[]
      };

      // Mock template retrieval
      mockSupabase.single.mockResolvedValueOnce({ data: templateWithMultipleMetrics, error: null });
      
      // Mock first metric creation (success)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // Name conflict check
      mockSupabase.single.mockResolvedValueOnce({ data: mockTemplate.metrics[0], error: null }); // Insert result

      const result = await progressMetricConfigService.applyMetricTemplate(
        'template-123',
        'program-template-456',
        'user-456'
      );

      expect(result.total_processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.created_metrics).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error_message).toContain('Invalid calculation formula');
    });
  });

  describe('Formula Validation', () => {
    it('should accept valid mathematical formulas', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const validFormulas = [
        'score * 100',
        '(current - baseline) / baseline',
        'Math.max(score1, score2)',
        'Math.round(average * 10) / 10',
        'Number.parseInt(value)',
        'attendance_rate + improvement_factor'
      ];

      for (const formula of validFormulas) {
        // Using reflection to access private method for testing
        const validation = await (service as any).validateCalculationFormula(formula);
        expect(validation.is_valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should reject dangerous operations', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const dangerousFormulas = [
        'eval("malicious code")',
        'Function("return process.exit()")()',
        'setTimeout(() => {}, 1000)',
        'setInterval(() => {}, 1000)',
        'document.createElement("script")',
        'window.location = "malicious.com"'
      ];

      for (const formula of dangerousFormulas) {
        const validation = await (service as any).validateCalculationFormula(formula);
        expect(validation.is_valid).toBe(false);
        expect(validation.errors).toContain('Formula contains potentially dangerous operations');
      }
    });

    it('should handle empty formulas', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const emptyFormulas = ['', '   ', null, undefined];

      for (const formula of emptyFormulas) {
        const validation = await (service as any).validateCalculationFormula(formula);
        expect(validation.is_valid).toBe(false);
        expect(validation.errors).toContain('Formula cannot be empty');
      }
    });
  });

  describe('Value Validation', () => {
    it('should validate numeric ranges correctly', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const rules: MetricValidationRules = {
        min_value: 0,
        max_value: 100,
        required: true,
        data_type: 'decimal'
      };

      const validValues = [0, 50, 100, 25.5, 99.99];
      const invalidValues = [-1, 101, -50, 150];

      for (const value of validValues) {
        const validation = await (service as any).validateMetricValue(value, rules);
        expect(validation.is_valid).toBe(true);
      }

      for (const value of invalidValues) {
        const validation = await (service as any).validateMetricValue(value, rules);
        expect(validation.is_valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate data types correctly', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const integerRules: MetricValidationRules = {
        required: true,
        data_type: 'integer'
      };

      const booleanRules: MetricValidationRules = {
        required: true,
        data_type: 'boolean'
      };

      // Integer validation
      const integerValidation = await (service as any).validateMetricValue(42, integerRules);
      expect(integerValidation.is_valid).toBe(true);

      const floatValidation = await (service as any).validateMetricValue(42.5, integerRules);
      expect(floatValidation.is_valid).toBe(false);

      // Boolean validation
      const booleanValidation = await (service as any).validateMetricValue(true, booleanRules);
      expect(booleanValidation.is_valid).toBe(true);

      const stringValidation = await (service as any).validateMetricValue('true', booleanRules);
      expect(stringValidation.is_valid).toBe(false);
    });

    it('should handle required field validation', async () => {
      const service = ProgressMetricConfigurationService.getInstance();
      
      const requiredRules: MetricValidationRules = {
        required: true,
        data_type: 'decimal'
      };

      const optionalRules: MetricValidationRules = {
        required: false,
        data_type: 'decimal'
      };

      // Required field tests
      const nullValidation = await (service as any).validateMetricValue(null, requiredRules);
      expect(nullValidation.is_valid).toBe(false);
      expect(nullValidation.errors).toContain('Value is required');

      const valueValidation = await (service as any).validateMetricValue(42, requiredRules);
      expect(valueValidation.is_valid).toBe(true);

      // Optional field tests
      const optionalNullValidation = await (service as any).validateMetricValue(null, optionalRules);
      expect(optionalNullValidation.is_valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await progressMetricConfigService.createMetricDefinition(
        {} as MetricConfigurationRequest,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unexpected error occurred while creating metric definition');
    });

    it('should handle malformed database responses', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: undefined, error: null });

      const result = await progressMetricConfigService.testMetricCalculation('metric-123');

      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Metric definition not found');
    });
  });
});