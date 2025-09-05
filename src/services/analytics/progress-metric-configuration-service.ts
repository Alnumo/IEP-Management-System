/**
 * Progress Metric Configuration Service
 * 
 * Manages customizable progress metrics for individualized enrollment analytics.
 * Supports metric definitions, validation rules, calculation formulas, and
 * bilingual configuration management for therapy program analytics.
 * 
 * Key Features:
 * - Custom metric definitions with validation rules
 * - Formula-based calculation configurations
 * - Bilingual metric descriptions (Arabic/English)
 * - Program-specific and global metric templates
 * - Real-time metric validation and testing
 * - Metric inheritance and override capabilities
 * 
 * @author BMad Development Team
 * @version 1.0.0
 */

import { supabase } from '../../lib/supabase';

// Core Types for Progress Metric Configuration
export interface ProgressMetricDefinition {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  metric_type: 'numeric' | 'percentage' | 'boolean' | 'scale' | 'composite';
  data_source: 'session_notes' | 'assessment_scores' | 'attendance' | 'goal_completion' | 'behavioral_data' | 'calculated';
  calculation_formula: string; // Mathematical formula or aggregation rule
  validation_rules: MetricValidationRules;
  display_config: MetricDisplayConfig;
  scope: 'global' | 'program_specific' | 'student_specific';
  program_template_ids?: string[]; // For program-specific metrics
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface MetricValidationRules {
  min_value?: number;
  max_value?: number;
  required: boolean;
  data_type: 'integer' | 'decimal' | 'boolean' | 'text' | 'json';
  allowed_values?: (string | number | boolean)[];
  regex_pattern?: string;
  custom_validation?: string; // JavaScript validation function
  dependencies?: string[]; // IDs of metrics this depends on
}

export interface MetricDisplayConfig {
  chart_type: 'line' | 'bar' | 'gauge' | 'pie' | 'scatter' | 'radar';
  color_scheme: string;
  show_trend: boolean;
  show_target: boolean;
  target_value?: number;
  unit_ar: string;
  unit_en: string;
  decimal_places: number;
  show_in_dashboard: boolean;
  dashboard_priority: number;
  responsive_breakpoints: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
}

export interface MetricTemplate {
  id: string;
  template_name_ar: string;
  template_name_en: string;
  description_ar: string;
  description_en: string;
  category: 'clinical' | 'behavioral' | 'academic' | 'social' | 'physical' | 'communication';
  target_audience: 'autism' | 'speech_therapy' | 'occupational_therapy' | 'behavioral_therapy' | 'general';
  metrics: ProgressMetricDefinition[];
  is_system_template: boolean;
  usage_count: number;
  rating: number;
  created_at: string;
  created_by: string;
}

export interface MetricConfigurationRequest {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  metric_type: ProgressMetricDefinition['metric_type'];
  data_source: ProgressMetricDefinition['data_source'];
  calculation_formula: string;
  validation_rules: MetricValidationRules;
  display_config: MetricDisplayConfig;
  scope: ProgressMetricDefinition['scope'];
  program_template_ids?: string[];
}

export interface MetricTestResult {
  is_valid: boolean;
  test_value: number | boolean | string;
  calculated_result: number | boolean | string;
  validation_passed: boolean;
  formula_executed: boolean;
  execution_time_ms: number;
  errors: string[];
  warnings: string[];
  sample_data_used: any;
}

export interface MetricBulkOperationResult {
  total_processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    metric_id: string;
    error_message: string;
  }>;
  created_metrics: ProgressMetricDefinition[];
  updated_metrics: ProgressMetricDefinition[];
}

/**
 * Progress Metric Configuration Service Class
 * Handles all operations related to customizable progress metrics
 */
export class ProgressMetricConfigurationService {
  private static instance: ProgressMetricConfigurationService;

  public static getInstance(): ProgressMetricConfigurationService {
    if (!ProgressMetricConfigurationService.instance) {
      ProgressMetricConfigurationService.instance = new ProgressMetricConfigurationService();
    }
    return ProgressMetricConfigurationService.instance;
  }

  /**
   * Create a new progress metric definition
   */
  async createMetricDefinition(
    request: MetricConfigurationRequest,
    user_id: string
  ): Promise<{
    success: boolean;
    metric: ProgressMetricDefinition | null;
    message: string;
  }> {
    try {
      // Validate formula syntax
      const formulaValidation = await this.validateCalculationFormula(request.calculation_formula);
      if (!formulaValidation.is_valid) {
        return {
          success: false,
          metric: null,
          message: `Invalid calculation formula: ${formulaValidation.errors.join(', ')}`
        };
      }

      // Check for naming conflicts
      const existingMetric = await this.findMetricByName(request.name_en, request.scope, request.program_template_ids);
      if (existingMetric) {
        return {
          success: false,
          metric: null,
          message: 'A metric with this name already exists in the specified scope'
        };
      }

      // Create metric definition
      const metricData = {
        id: crypto.randomUUID(),
        name_ar: request.name_ar,
        name_en: request.name_en,
        description_ar: request.description_ar,
        description_en: request.description_en,
        metric_type: request.metric_type,
        data_source: request.data_source,
        calculation_formula: request.calculation_formula,
        validation_rules: request.validation_rules,
        display_config: request.display_config,
        scope: request.scope,
        program_template_ids: request.program_template_ids,
        is_active: true,
        is_required: false,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user_id,
        updated_by: user_id
      };

      const { data, error } = await supabase
        .from('progress_metric_definitions')
        .insert(metricData)
        .select()
        .single();

      if (error) {
        console.error('Error creating metric definition:', error);
        return {
          success: false,
          metric: null,
          message: 'Failed to create metric definition in database'
        };
      }

      // Update sort order for new metric
      await this.updateMetricSortOrder(data.id, await this.getNextSortOrder(request.scope));

      return {
        success: true,
        metric: data as ProgressMetricDefinition,
        message: 'Progress metric definition created successfully'
      };

    } catch (error) {
      console.error('Error in createMetricDefinition:', error);
      return {
        success: false,
        metric: null,
        message: 'Unexpected error occurred while creating metric definition'
      };
    }
  }

  /**
   * Update an existing metric definition
   */
  async updateMetricDefinition(
    metric_id: string,
    updates: Partial<MetricConfigurationRequest>,
    user_id: string
  ): Promise<{
    success: boolean;
    metric: ProgressMetricDefinition | null;
    message: string;
  }> {
    try {
      // Validate formula if being updated
      if (updates.calculation_formula) {
        const formulaValidation = await this.validateCalculationFormula(updates.calculation_formula);
        if (!formulaValidation.is_valid) {
          return {
            success: false,
            metric: null,
            message: `Invalid calculation formula: ${formulaValidation.errors.join(', ')}`
          };
        }
      }

      // Check for naming conflicts if name is being updated
      if (updates.name_en) {
        const existingMetric = await this.findMetricByName(updates.name_en, updates.scope, updates.program_template_ids);
        if (existingMetric && existingMetric.id !== metric_id) {
          return {
            success: false,
            metric: null,
            message: 'A metric with this name already exists in the specified scope'
          };
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user_id
      };

      const { data, error } = await supabase
        .from('progress_metric_definitions')
        .update(updateData)
        .eq('id', metric_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating metric definition:', error);
        return {
          success: false,
          metric: null,
          message: 'Failed to update metric definition in database'
        };
      }

      return {
        success: true,
        metric: data as ProgressMetricDefinition,
        message: 'Progress metric definition updated successfully'
      };

    } catch (error) {
      console.error('Error in updateMetricDefinition:', error);
      return {
        success: false,
        metric: null,
        message: 'Unexpected error occurred while updating metric definition'
      };
    }
  }

  /**
   * Get metric definitions based on scope and filters
   */
  async getMetricDefinitions(
    scope: 'global' | 'program_specific' | 'student_specific' | 'all' = 'all',
    program_template_id?: string,
    active_only: boolean = true
  ): Promise<{
    success: boolean;
    metrics: ProgressMetricDefinition[];
    message: string;
  }> {
    try {
      let query = supabase
        .from('progress_metric_definitions')
        .select('*');

      // Apply scope filter
      if (scope !== 'all') {
        query = query.eq('scope', scope);
      }

      // Apply program template filter
      if (program_template_id) {
        query = query.contains('program_template_ids', [program_template_id]);
      }

      // Apply active filter
      if (active_only) {
        query = query.eq('is_active', true);
      }

      // Order by sort order and name
      query = query.order('sort_order', { ascending: true })
                  .order('name_en', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching metric definitions:', error);
        return {
          success: false,
          metrics: [],
          message: 'Failed to fetch metric definitions'
        };
      }

      return {
        success: true,
        metrics: data as ProgressMetricDefinition[],
        message: 'Metric definitions retrieved successfully'
      };

    } catch (error) {
      console.error('Error in getMetricDefinitions:', error);
      return {
        success: false,
        metrics: [],
        message: 'Unexpected error occurred while fetching metric definitions'
      };
    }
  }

  /**
   * Test a metric calculation formula with sample data
   */
  async testMetricCalculation(
    metric_id: string,
    sample_data?: any
  ): Promise<MetricTestResult> {
    try {
      // Get metric definition
      const { data: metric, error } = await supabase
        .from('progress_metric_definitions')
        .select('*')
        .eq('id', metric_id)
        .single();

      if (error || !metric) {
        return {
          is_valid: false,
          test_value: 0,
          calculated_result: 0,
          validation_passed: false,
          formula_executed: false,
          execution_time_ms: 0,
          errors: ['Metric definition not found'],
          warnings: [],
          sample_data_used: null
        };
      }

      const startTime = performance.now();

      // Generate sample data if not provided
      if (!sample_data) {
        sample_data = await this.generateSampleData(metric as ProgressMetricDefinition);
      }

      // Test formula execution
      const calculationResult = await this.executeCalculationFormula(
        metric.calculation_formula,
        sample_data
      );

      // Validate result against rules
      const validationResult = await this.validateMetricValue(
        calculationResult,
        metric.validation_rules
      );

      const executionTime = performance.now() - startTime;

      return {
        is_valid: calculationResult !== null && validationResult.is_valid,
        test_value: sample_data.test_input || 0,
        calculated_result: calculationResult,
        validation_passed: validationResult.is_valid,
        formula_executed: calculationResult !== null,
        execution_time_ms: Math.round(executionTime * 100) / 100,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        sample_data_used: sample_data
      };

    } catch (error) {
      console.error('Error in testMetricCalculation:', error);
      return {
        is_valid: false,
        test_value: 0,
        calculated_result: 0,
        validation_passed: false,
        formula_executed: false,
        execution_time_ms: 0,
        errors: ['Unexpected error during metric testing'],
        warnings: [],
        sample_data_used: null
      };
    }
  }

  /**
   * Create metric template from existing metrics
   */
  async createMetricTemplate(
    template_name_ar: string,
    template_name_en: string,
    description_ar: string,
    description_en: string,
    category: MetricTemplate['category'],
    target_audience: MetricTemplate['target_audience'],
    metric_ids: string[],
    user_id: string
  ): Promise<{
    success: boolean;
    template: MetricTemplate | null;
    message: string;
  }> {
    try {
      // Get metric definitions
      const { data: metrics, error: metricsError } = await supabase
        .from('progress_metric_definitions')
        .select('*')
        .in('id', metric_ids);

      if (metricsError || !metrics || metrics.length === 0) {
        return {
          success: false,
          template: null,
          message: 'Failed to retrieve metric definitions for template'
        };
      }

      const templateData = {
        id: crypto.randomUUID(),
        template_name_ar,
        template_name_en,
        description_ar,
        description_en,
        category,
        target_audience,
        metrics: metrics as ProgressMetricDefinition[],
        is_system_template: false,
        usage_count: 0,
        rating: 0,
        created_at: new Date().toISOString(),
        created_by: user_id
      };

      const { data, error } = await supabase
        .from('metric_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        console.error('Error creating metric template:', error);
        return {
          success: false,
          template: null,
          message: 'Failed to create metric template'
        };
      }

      return {
        success: true,
        template: data as MetricTemplate,
        message: 'Metric template created successfully'
      };

    } catch (error) {
      console.error('Error in createMetricTemplate:', error);
      return {
        success: false,
        template: null,
        message: 'Unexpected error occurred while creating metric template'
      };
    }
  }

  /**
   * Apply metric template to a program
   */
  async applyMetricTemplate(
    template_id: string,
    program_template_id: string,
    user_id: string,
    customizations?: Partial<MetricConfigurationRequest>[]
  ): Promise<MetricBulkOperationResult> {
    try {
      const result: MetricBulkOperationResult = {
        total_processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        created_metrics: [],
        updated_metrics: []
      };

      // Get template
      const { data: template, error: templateError } = await supabase
        .from('metric_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        result.errors.push({
          metric_id: 'template',
          error_message: 'Metric template not found'
        });
        return result;
      }

      result.total_processed = template.metrics.length;

      // Process each metric in the template
      for (let i = 0; i < template.metrics.length; i++) {
        const templateMetric = template.metrics[i];
        const customization = customizations?.[i] || {};

        try {
          // Create metric configuration request
          const request: MetricConfigurationRequest = {
            name_ar: customization.name_ar || templateMetric.name_ar,
            name_en: customization.name_en || templateMetric.name_en,
            description_ar: customization.description_ar || templateMetric.description_ar,
            description_en: customization.description_en || templateMetric.description_en,
            metric_type: customization.metric_type || templateMetric.metric_type,
            data_source: customization.data_source || templateMetric.data_source,
            calculation_formula: customization.calculation_formula || templateMetric.calculation_formula,
            validation_rules: customization.validation_rules || templateMetric.validation_rules,
            display_config: customization.display_config || templateMetric.display_config,
            scope: 'program_specific',
            program_template_ids: [program_template_id]
          };

          const createResult = await this.createMetricDefinition(request, user_id);

          if (createResult.success && createResult.metric) {
            result.successful++;
            result.created_metrics.push(createResult.metric);
          } else {
            result.failed++;
            result.errors.push({
              metric_id: templateMetric.id,
              error_message: createResult.message
            });
          }

        } catch (error) {
          result.failed++;
          result.errors.push({
            metric_id: templateMetric.id,
            error_message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Update template usage count
      await supabase
        .from('metric_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template_id);

      return result;

    } catch (error) {
      console.error('Error in applyMetricTemplate:', error);
      return {
        total_processed: 0,
        successful: 0,
        failed: 1,
        errors: [{
          metric_id: 'system',
          error_message: 'Unexpected error occurred during template application'
        }],
        created_metrics: [],
        updated_metrics: []
      };
    }
  }

  // Private Helper Methods

  private async validateCalculationFormula(formula: string): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic formula validation
    if (!formula || formula.trim().length === 0) {
      errors.push('Formula cannot be empty');
      return { is_valid: false, errors, warnings };
    }

    // Check for dangerous operations
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout/,
      /setInterval/,
      /document\./,
      /window\./,
      /global\./
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        errors.push('Formula contains potentially dangerous operations');
        break;
      }
    }

    // Check for valid mathematical operations
    const validOperators = ['+', '-', '*', '/', '(', ')', 'Math.', 'Number.', 'parseInt', 'parseFloat'];
    const hasValidOperators = validOperators.some(op => formula.includes(op));

    if (!hasValidOperators && !formula.includes('return')) {
      warnings.push('Formula may not contain valid mathematical operations');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async findMetricByName(
    name: string,
    scope?: string,
    program_template_ids?: string[]
  ): Promise<ProgressMetricDefinition | null> {
    let query = supabase
      .from('progress_metric_definitions')
      .select('*')
      .eq('name_en', name);

    if (scope) {
      query = query.eq('scope', scope);
    }

    if (program_template_ids && program_template_ids.length > 0) {
      query = query.overlaps('program_template_ids', program_template_ids);
    }

    const { data } = await query.single();
    return data as ProgressMetricDefinition | null;
  }

  private async getNextSortOrder(scope: string): Promise<number> {
    const { data, error } = await supabase
      .from('progress_metric_definitions')
      .select('sort_order')
      .eq('scope', scope)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return (data[0].sort_order || 0) + 1;
  }

  private async updateMetricSortOrder(metric_id: string, sort_order: number): Promise<void> {
    await supabase
      .from('progress_metric_definitions')
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq('id', metric_id);
  }

  private async generateSampleData(metric: ProgressMetricDefinition): Promise<any> {
    const sampleData: any = {
      test_input: 75, // Default test value
      session_count: 10,
      attendance_rate: 0.85,
      goal_completion_rate: 0.78,
      behavioral_score: 8.5,
      assessment_scores: [85, 78, 92, 88, 91],
      session_duration_minutes: 45,
      participation_level: 9,
      improvement_rate: 0.15
    };

    // Customize sample data based on metric type and data source
    switch (metric.data_source) {
      case 'attendance':
        sampleData.test_input = 0.85;
        break;
      case 'assessment_scores':
        sampleData.test_input = 85;
        break;
      case 'goal_completion':
        sampleData.test_input = 0.78;
        break;
      case 'behavioral_data':
        sampleData.test_input = 8.5;
        break;
    }

    return sampleData;
  }

  private async executeCalculationFormula(formula: string, data: any): Promise<any> {
    try {
      // Create a safe execution context
      const context = { ...data, Math, Number, parseInt, parseFloat };
      
      // Simple formula execution with basic safety
      const func = new Function('data', `with(data) { return ${formula}; }`);
      return func(context);

    } catch (error) {
      console.error('Formula execution error:', error);
      return null;
    }
  }

  private async validateMetricValue(
    value: any,
    rules: MetricValidationRules
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required check
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push('Value is required');
    }

    // Type validation
    if (value !== null && value !== undefined) {
      switch (rules.data_type) {
        case 'integer':
          if (!Number.isInteger(value)) {
            errors.push('Value must be an integer');
          }
          break;
        case 'decimal':
          if (isNaN(Number(value))) {
            errors.push('Value must be a number');
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push('Value must be a boolean');
          }
          break;
      }

      // Range validation
      if (rules.min_value !== undefined && Number(value) < rules.min_value) {
        errors.push(`Value must be at least ${rules.min_value}`);
      }
      if (rules.max_value !== undefined && Number(value) > rules.max_value) {
        errors.push(`Value must be at most ${rules.max_value}`);
      }

      // Allowed values validation
      if (rules.allowed_values && !rules.allowed_values.includes(value)) {
        errors.push(`Value must be one of: ${rules.allowed_values.join(', ')}`);
      }

      // Regex validation
      if (rules.regex_pattern && typeof value === 'string') {
        const regex = new RegExp(rules.regex_pattern);
        if (!regex.test(value)) {
          errors.push('Value does not match required pattern');
        }
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const progressMetricConfigService = ProgressMetricConfigurationService.getInstance();