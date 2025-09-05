-- Progress Metrics Configuration Schema
-- 
-- Database migration for customizable progress metrics system.
-- Supports metric definitions, templates, validation rules, and
-- bilingual configuration management for therapy program analytics.
--
-- Version: 1.0.0
-- Migration: 051
-- Date: 2025-09-04

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create progress metric definitions table
CREATE TABLE IF NOT EXISTS progress_metric_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('numeric', 'percentage', 'boolean', 'scale', 'composite')),
  data_source VARCHAR(100) NOT NULL CHECK (data_source IN ('session_notes', 'assessment_scores', 'attendance', 'goal_completion', 'behavioral_data', 'calculated')),
  calculation_formula TEXT NOT NULL,
  validation_rules JSONB NOT NULL DEFAULT '{}',
  display_config JSONB NOT NULL DEFAULT '{}',
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'program_specific', 'student_specific')),
  program_template_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_formula_not_empty CHECK (LENGTH(TRIM(calculation_formula)) > 0),
  CONSTRAINT valid_sort_order CHECK (sort_order >= 0),
  CONSTRAINT program_ids_for_program_scope CHECK (
    (scope != 'program_specific') OR 
    (scope = 'program_specific' AND array_length(program_template_ids, 1) > 0)
  )
);

-- Create metric templates table
CREATE TABLE IF NOT EXISTS metric_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name_ar VARCHAR(255) NOT NULL,
  template_name_en VARCHAR(255) NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('clinical', 'behavioral', 'academic', 'social', 'physical', 'communication')),
  target_audience VARCHAR(100) NOT NULL CHECK (target_audience IN ('autism', 'speech_therapy', 'occupational_therapy', 'behavioral_therapy', 'general')),
  metrics JSONB NOT NULL DEFAULT '[]',
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_usage_count CHECK (usage_count >= 0),
  CONSTRAINT valid_metrics_array CHECK (jsonb_typeof(metrics) = 'array')
);

-- Create metric calculations table for storing calculated values
CREATE TABLE IF NOT EXISTS metric_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES progress_metric_definitions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  calculated_value JSONB NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  confidence_level DECIMAL(5,4) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  data_points_used INTEGER NOT NULL DEFAULT 0,
  calculation_method VARCHAR(255) NOT NULL,
  raw_data_summary JSONB DEFAULT '{}',
  trend_direction VARCHAR(50) CHECK (trend_direction IN ('improving', 'declining', 'stable', 'insufficient_data')),
  statistical_significance DECIMAL(5,4),
  comparison_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_data_points CHECK (data_points_used >= 0),
  CONSTRAINT unique_metric_calculation UNIQUE (metric_id, enrollment_id, calculation_date)
);

-- Create metric interpretation rules table
CREATE TABLE IF NOT EXISTS metric_interpretation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES progress_metric_definitions(id) ON DELETE CASCADE,
  condition_expression TEXT NOT NULL,
  interpretation_ar TEXT NOT NULL,
  interpretation_en TEXT NOT NULL,
  recommendation_ar TEXT,
  recommendation_en TEXT,
  severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('info', 'warning', 'concern', 'critical')),
  action_required BOOLEAN NOT NULL DEFAULT false,
  notification_recipients UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_condition_not_empty CHECK (LENGTH(TRIM(condition_expression)) > 0)
);

-- Create metric alerts table
CREATE TABLE IF NOT EXISTS metric_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES progress_metric_definitions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('threshold_exceeded', 'trend_concern', 'data_quality', 'missing_data')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  auto_resolved BOOLEAN NOT NULL DEFAULT false,
  acknowledgment_required BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  recipients UUID[] NOT NULL DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT resolved_after_triggered CHECK (resolved_at IS NULL OR resolved_at >= triggered_at),
  CONSTRAINT acknowledged_after_triggered CHECK (acknowledged_at IS NULL OR acknowledged_at >= triggered_at),
  CONSTRAINT acknowledgment_consistency CHECK (
    (acknowledgment_required = false) OR 
    (acknowledgment_required = true AND acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
  )
);

-- Create metric benchmarks table
CREATE TABLE IF NOT EXISTS metric_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES progress_metric_definitions(id) ON DELETE CASCADE,
  benchmark_type VARCHAR(50) NOT NULL CHECK (benchmark_type IN ('age_based', 'diagnosis_based', 'program_based', 'industry_standard')),
  target_population JSONB NOT NULL DEFAULT '{}',
  benchmark_values JSONB NOT NULL,
  sample_size INTEGER NOT NULL CHECK (sample_size > 0),
  data_source VARCHAR(255) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  validity_period_months INTEGER NOT NULL DEFAULT 12 CHECK (validity_period_months > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_benchmark_values CHECK (jsonb_typeof(benchmark_values) = 'object'),
  CONSTRAINT valid_target_population CHECK (jsonb_typeof(target_population) = 'object')
);

-- Create metric calculation queue table for background processing
CREATE TABLE IF NOT EXISTS metric_calculation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_ids UUID[] NOT NULL,
  metric_ids UUID[] NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_arrays_not_empty CHECK (
    array_length(enrollment_ids, 1) > 0 AND 
    array_length(metric_ids, 1) > 0
  ),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),
  CONSTRAINT valid_completion_times CHECK (
    (completed_at IS NULL) OR 
    (started_at IS NOT NULL AND completed_at >= started_at)
  )
);

-- Create indexes for performance optimization

-- Primary search indexes
CREATE INDEX idx_progress_metrics_name_ar ON progress_metric_definitions USING gin(name_ar gin_trgm_ops);
CREATE INDEX idx_progress_metrics_name_en ON progress_metric_definitions USING gin(name_en gin_trgm_ops);
CREATE INDEX idx_progress_metrics_scope_active ON progress_metric_definitions (scope, is_active);
CREATE INDEX idx_progress_metrics_program_templates ON progress_metric_definitions USING gin(program_template_ids);
CREATE INDEX idx_progress_metrics_data_source ON progress_metric_definitions (data_source, is_active);

-- Template search indexes
CREATE INDEX idx_metric_templates_category ON metric_templates (category, is_system_template);
CREATE INDEX idx_metric_templates_audience ON metric_templates (target_audience);
CREATE INDEX idx_metric_templates_name_ar ON metric_templates USING gin(template_name_ar gin_trgm_ops);
CREATE INDEX idx_metric_templates_name_en ON metric_templates USING gin(template_name_en gin_trgm_ops);
CREATE INDEX idx_metric_templates_usage ON metric_templates (usage_count DESC, rating DESC);

-- Calculation performance indexes
CREATE INDEX idx_metric_calculations_enrollment ON metric_calculations (enrollment_id, calculation_date DESC);
CREATE INDEX idx_metric_calculations_student ON metric_calculations (student_id, calculation_date DESC);
CREATE INDEX idx_metric_calculations_metric_date ON metric_calculations (metric_id, calculation_date DESC);
CREATE INDEX idx_metric_calculations_trend ON metric_calculations (trend_direction, calculation_date DESC);

-- Alert management indexes
CREATE INDEX idx_metric_alerts_enrollment ON metric_alerts (enrollment_id, triggered_at DESC);
CREATE INDEX idx_metric_alerts_metric ON metric_alerts (metric_id, severity, resolved_at);
CREATE INDEX idx_metric_alerts_unresolved ON metric_alerts (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_metric_alerts_acknowledgment ON metric_alerts (acknowledgment_required, acknowledged_at) WHERE acknowledgment_required = true;

-- Queue processing indexes
CREATE INDEX idx_calculation_queue_status ON metric_calculation_queue (status, priority, created_at);
CREATE INDEX idx_calculation_queue_processing ON metric_calculation_queue (status, started_at) WHERE status = 'processing';

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_progress_metrics_updated_at 
  BEFORE UPDATE ON progress_metric_definitions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metric_templates_updated_at 
  BEFORE UPDATE ON metric_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interpretation_rules_updated_at 
  BEFORE UPDATE ON metric_interpretation_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metric_benchmarks_updated_at 
  BEFORE UPDATE ON metric_benchmarks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trail trigger for metric definitions
CREATE OR REPLACE FUNCTION audit_metric_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log significant changes
    IF OLD.calculation_formula != NEW.calculation_formula OR 
       OLD.validation_rules != NEW.validation_rules OR
       OLD.is_active != NEW.is_active THEN
      
      INSERT INTO system_audit_log (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_by,
        changed_at
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        NEW.updated_by,
        NOW()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_progress_metrics_changes
  AFTER UPDATE ON progress_metric_definitions
  FOR EACH ROW EXECUTE FUNCTION audit_metric_changes();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE progress_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_interpretation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_calculation_queue ENABLE ROW LEVEL SECURITY;

-- Progress metric definitions policies
CREATE POLICY "progress_metrics_select_policy" ON progress_metric_definitions
  FOR SELECT TO authenticated
  USING (
    is_active = true OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'therapist_lead')
    )
  );

CREATE POLICY "progress_metrics_insert_policy" ON progress_metric_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "progress_metrics_update_policy" ON progress_metric_definitions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "progress_metrics_delete_policy" ON progress_metric_definitions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin')
    )
  );

-- Metric templates policies
CREATE POLICY "metric_templates_select_policy" ON metric_templates
  FOR SELECT TO authenticated
  USING (true); -- All authenticated users can view templates

CREATE POLICY "metric_templates_insert_policy" ON metric_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'therapist_lead')
    )
  );

CREATE POLICY "metric_templates_update_policy" ON metric_templates
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Metric calculations policies (data access based on enrollment access)
CREATE POLICY "metric_calculations_select_policy" ON metric_calculations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      WHERE se.id = metric_calculations.enrollment_id
      AND (
        s.assigned_therapist = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager', 'therapist_lead')
        )
      )
    )
  );

CREATE POLICY "metric_calculations_insert_policy" ON metric_calculations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'therapist_lead', 'receptionist')
    )
  );

-- Metric alerts policies
CREATE POLICY "metric_alerts_select_policy" ON metric_alerts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = ANY(recipients) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'therapist_lead')
    )
  );

CREATE POLICY "metric_alerts_update_policy" ON metric_alerts
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = ANY(recipients) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'therapist_lead')
    )
  );

-- Insert default system metric templates
INSERT INTO metric_templates (
  id,
  template_name_ar,
  template_name_en,
  description_ar,
  description_en,
  category,
  target_audience,
  metrics,
  is_system_template,
  created_by
) VALUES 
  (
    uuid_generate_v4(),
    'مقاييس التوحد الأساسية',
    'Basic Autism Metrics',
    'مجموعة من المقاييس الأساسية لتقييم تقدم الأطفال المصابين بالتوحد',
    'Essential metrics for tracking progress in children with autism',
    'clinical',
    'autism',
    '[
      {
        "name_ar": "معدل التفاعل الاجتماعي",
        "name_en": "Social Interaction Rate",
        "description_ar": "قياس معدل المبادرة في التفاعل الاجتماعي",
        "description_en": "Measures rate of social interaction initiation",
        "metric_type": "percentage",
        "data_source": "session_notes",
        "calculation_formula": "(social_initiations / total_opportunities) * 100"
      },
      {
        "name_ar": "تحسن مهارات التواصل",
        "name_en": "Communication Skills Improvement",
        "description_ar": "قياس التحسن في مهارات التواصل اللفظي وغير اللفظي",
        "description_en": "Measures improvement in verbal and non-verbal communication",
        "metric_type": "numeric",
        "data_source": "assessment_scores",
        "calculation_formula": "Math.max(0, current_communication_score - baseline_communication_score)"
      }
    ]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    uuid_generate_v4(),
    'مقاييس علاج النطق',
    'Speech Therapy Metrics',
    'مقاييس متخصصة لتقييم تقدم علاج النطق والتخاطب',
    'Specialized metrics for speech and language therapy progress',
    'communication',
    'speech_therapy',
    '[
      {
        "name_ar": "وضوح النطق",
        "name_en": "Speech Clarity",
        "description_ar": "نسبة وضوح الكلمات المنطوقة",
        "description_en": "Percentage of clearly articulated words",
        "metric_type": "percentage",
        "data_source": "session_notes",
        "calculation_formula": "(clear_words / total_words) * 100"
      },
      {
        "name_ar": "تطور المفردات",
        "name_en": "Vocabulary Development",
        "description_ar": "عدد المفردات الجديدة المكتسبة",
        "description_en": "Number of new vocabulary words acquired",
        "metric_type": "numeric",
        "data_source": "assessment_scores",
        "calculation_formula": "current_vocabulary_count - baseline_vocabulary_count"
      }
    ]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    uuid_generate_v4(),
    'مقاييس العلاج الوظيفي',
    'Occupational Therapy Metrics',
    'مقاييس لتقييم التقدم في المهارات الحركية الدقيقة والحياتية',
    'Metrics for fine motor skills and daily living skills progress',
    'physical',
    'occupational_therapy',
    '[
      {
        "name_ar": "المهارات الحركية الدقيقة",
        "name_en": "Fine Motor Skills",
        "description_ar": "تحسن في المهارات الحركية الدقيقة",
        "description_en": "Improvement in fine motor coordination",
        "metric_type": "scale",
        "data_source": "assessment_scores",
        "calculation_formula": "fine_motor_current_score - fine_motor_baseline_score"
      },
      {
        "name_ar": "الاستقلالية في المهام اليومية",
        "name_en": "Daily Living Independence",
        "description_ar": "مستوى الاستقلالية في أداء المهام اليومية",
        "description_en": "Level of independence in daily living tasks",
        "metric_type": "percentage",
        "data_source": "goal_completion",
        "calculation_formula": "(independent_tasks / total_daily_tasks) * 100"
      }
    ]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000000'
  );

-- Create comments for documentation
COMMENT ON TABLE progress_metric_definitions IS 'Customizable progress metrics for individualized enrollment analytics';
COMMENT ON TABLE metric_templates IS 'Reusable metric templates for different therapy categories';
COMMENT ON TABLE metric_calculations IS 'Stored calculated metric values with trend analysis';
COMMENT ON TABLE metric_interpretation_rules IS 'Rules for interpreting metric values and generating recommendations';
COMMENT ON TABLE metric_alerts IS 'System-generated alerts based on metric thresholds and patterns';
COMMENT ON TABLE metric_benchmarks IS 'Industry and population benchmarks for metric comparison';
COMMENT ON TABLE metric_calculation_queue IS 'Background processing queue for metric calculations';

COMMENT ON COLUMN progress_metric_definitions.calculation_formula IS 'JavaScript expression for calculating metric value';
COMMENT ON COLUMN progress_metric_definitions.validation_rules IS 'JSONB validation rules including min/max values and data types';
COMMENT ON COLUMN progress_metric_definitions.display_config IS 'JSONB configuration for metric visualization and display';
COMMENT ON COLUMN metric_templates.metrics IS 'JSONB array of metric definitions included in this template';
COMMENT ON COLUMN metric_calculations.calculated_value IS 'JSONB stored calculated value with metadata';
COMMENT ON COLUMN metric_calculations.comparison_data IS 'JSONB comparison to baseline, target, and benchmark values';

COMMIT;