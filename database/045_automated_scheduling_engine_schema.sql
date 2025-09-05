-- =====================================================
-- Automated Scheduling Engine Database Schema
-- Story 3.1: Automated Scheduling Engine Implementation
-- 
-- Creates tables for schedule templates, optimization rules,
-- conflict management, and advanced scheduling features.
-- Supports Arabic RTL/English LTR content and performance optimization.
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- Schedule Templates Table
-- =====================================================

CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Template configuration
    template_type VARCHAR(50) NOT NULL DEFAULT 'program_based',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Scheduling rules
    session_duration INTEGER NOT NULL DEFAULT 60, -- minutes
    sessions_per_week INTEGER NOT NULL DEFAULT 2,
    preferred_times JSONB DEFAULT '[]'::jsonb,
    
    -- Pattern configuration
    scheduling_pattern VARCHAR(50) NOT NULL DEFAULT 'weekly',
    pattern_config JSONB DEFAULT '{}'::jsonb,
    
    -- Resource requirements
    required_room_type VARCHAR(100),
    required_equipment TEXT[] DEFAULT '{}',
    special_requirements TEXT,
    special_requirements_ar TEXT,
    
    -- Optimization preferences
    allow_back_to_back BOOLEAN DEFAULT false,
    max_gap_between_sessions INTEGER DEFAULT 120, -- minutes
    preferred_therapist_id UUID REFERENCES therapists(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chk_session_duration CHECK (session_duration BETWEEN 15 AND 240),
    CONSTRAINT chk_sessions_per_week CHECK (sessions_per_week BETWEEN 1 AND 7),
    CONSTRAINT chk_max_gap CHECK (max_gap_between_sessions >= 0),
    CONSTRAINT chk_template_type CHECK (template_type IN ('program_based', 'custom', 'recurring'))
);

-- Indexes for performance
CREATE INDEX idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX idx_schedule_templates_type ON schedule_templates(template_type);
CREATE INDEX idx_schedule_templates_pattern ON schedule_templates(scheduling_pattern);
CREATE INDEX idx_schedule_templates_therapist ON schedule_templates(preferred_therapist_id);
CREATE INDEX idx_schedule_templates_search ON schedule_templates USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
CREATE INDEX idx_schedule_templates_search_ar ON schedule_templates USING GIN (
    to_tsvector('arabic', name_ar || ' ' || COALESCE(description_ar, ''))
);

-- =====================================================
-- Enhanced Therapist Availability Table
-- =====================================================

CREATE TABLE IF NOT EXISTS therapist_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Time slot definition
    day_of_week INTEGER, -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Availability management
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    specific_date DATE, -- For non-recurring availability
    
    -- Capacity management
    max_sessions_per_slot INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    session_buffer_minutes INTEGER DEFAULT 15,
    
    -- Time off management
    is_time_off BOOLEAN DEFAULT false,
    time_off_reason VARCHAR(255),
    time_off_reason_ar VARCHAR(255),
    
    -- Metadata
    notes TEXT,
    notes_ar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chk_day_of_week CHECK (day_of_week IS NULL OR day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_time_order CHECK (start_time < end_time),
    CONSTRAINT chk_max_sessions CHECK (max_sessions_per_slot > 0),
    CONSTRAINT chk_current_bookings CHECK (current_bookings >= 0),
    CONSTRAINT chk_buffer_time CHECK (session_buffer_minutes >= 0),
    CONSTRAINT chk_recurring_logic CHECK (
        (is_recurring = true AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
        (is_recurring = false AND specific_date IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_therapist_availability_therapist ON therapist_availability(therapist_id);
CREATE INDEX idx_therapist_availability_day ON therapist_availability(day_of_week);
CREATE INDEX idx_therapist_availability_date ON therapist_availability(specific_date);
CREATE INDEX idx_therapist_availability_active ON therapist_availability(is_available);
CREATE INDEX idx_therapist_availability_time ON therapist_availability(start_time, end_time);
CREATE UNIQUE INDEX idx_therapist_availability_recurring ON therapist_availability(
    therapist_id, day_of_week, start_time, end_time
) WHERE is_recurring = true AND specific_date IS NULL;

-- =====================================================
-- Schedule Conflicts Table
-- =====================================================

CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Conflict identification
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    
    -- Related sessions
    primary_session_id UUID NOT NULL,
    conflicting_session_id UUID,
    
    -- Conflict details
    conflict_description TEXT NOT NULL,
    conflict_description_ar TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Resolution tracking
    resolution_status VARCHAR(50) DEFAULT 'pending',
    resolution_method VARCHAR(100),
    resolution_notes TEXT,
    resolution_notes_ar TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Alternative suggestions
    suggested_alternatives JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_conflict_type CHECK (conflict_type IN (
        'therapist_double_booking', 'room_unavailable', 'equipment_conflict', 
        'student_unavailable', 'time_constraint'
    )),
    CONSTRAINT chk_conflict_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_resolution_status CHECK (resolution_status IN (
        'pending', 'in_progress', 'resolved', 'escalated', 'ignored'
    ))
);

-- Indexes for performance
CREATE INDEX idx_schedule_conflicts_primary_session ON schedule_conflicts(primary_session_id);
CREATE INDEX idx_schedule_conflicts_conflicting_session ON schedule_conflicts(conflicting_session_id);
CREATE INDEX idx_schedule_conflicts_type ON schedule_conflicts(conflict_type);
CREATE INDEX idx_schedule_conflicts_severity ON schedule_conflicts(severity);
CREATE INDEX idx_schedule_conflicts_status ON schedule_conflicts(resolution_status);
CREATE INDEX idx_schedule_conflicts_detected ON schedule_conflicts(detected_at);

-- =====================================================
-- Optimization Rules Table
-- =====================================================

CREATE TABLE IF NOT EXISTS optimization_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    
    -- Rule configuration
    rule_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Rule logic
    condition JSONB NOT NULL DEFAULT '{}'::jsonb,
    action JSONB NOT NULL DEFAULT '{}'::jsonb,
    weight DECIMAL(3,2) DEFAULT 1.0, -- Impact on optimization score
    
    -- Application scope
    applies_to VARCHAR(50) DEFAULT 'all',
    target_ids UUID[] DEFAULT '{}',
    
    -- Execution tracking
    execution_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    last_executed TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    description TEXT,
    description_ar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chk_rule_type CHECK (rule_type IN (
        'preference', 'constraint', 'optimization', 'business_rule'
    )),
    CONSTRAINT chk_priority CHECK (priority BETWEEN 1 AND 10),
    CONSTRAINT chk_weight CHECK (weight >= 0.0 AND weight <= 5.0),
    CONSTRAINT chk_applies_to CHECK (applies_to IN ('all', 'therapist', 'program', 'student', 'room')),
    CONSTRAINT chk_success_rate CHECK (success_rate >= 0.0 AND success_rate <= 100.0)
);

-- Indexes for performance
CREATE INDEX idx_optimization_rules_active ON optimization_rules(is_active);
CREATE INDEX idx_optimization_rules_type ON optimization_rules(rule_type);
CREATE INDEX idx_optimization_rules_priority ON optimization_rules(priority DESC);
CREATE INDEX idx_optimization_rules_scope ON optimization_rules(applies_to);
CREATE INDEX idx_optimization_rules_targets ON optimization_rules USING GIN(target_ids);

-- =====================================================
-- Scheduling Metrics Table (for performance tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduling_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    metric_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'daily',
    
    -- Utilization metrics
    therapist_utilization JSONB DEFAULT '{}'::jsonb,
    room_utilization JSONB DEFAULT '{}'::jsonb,
    equipment_utilization JSONB DEFAULT '{}'::jsonb,
    
    -- Conflict metrics
    total_conflicts INTEGER DEFAULT 0,
    conflicts_by_type JSONB DEFAULT '{}'::jsonb,
    conflicts_by_severity JSONB DEFAULT '{}'::jsonb,
    average_resolution_time DECIMAL(8,2), -- hours
    
    -- Efficiency metrics
    schedule_optimization_score DECIMAL(5,2) DEFAULT 0.0,
    average_gap_between_sessions DECIMAL(6,2), -- minutes
    back_to_back_session_percentage DECIMAL(5,2) DEFAULT 0.0,
    
    -- Quality metrics
    reschedule_rate DECIMAL(5,2) DEFAULT 0.0,
    no_show_rate DECIMAL(5,2) DEFAULT 0.0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Generation performance
    average_generation_time DECIMAL(8,2), -- milliseconds
    total_schedules_generated INTEGER DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    CONSTRAINT chk_optimization_score CHECK (schedule_optimization_score >= 0.0 AND schedule_optimization_score <= 100.0),
    CONSTRAINT chk_percentages CHECK (
        back_to_back_session_percentage >= 0.0 AND back_to_back_session_percentage <= 100.0 AND
        reschedule_rate >= 0.0 AND no_show_rate >= 0.0 AND cancellation_rate >= 0.0
    )
);

-- Unique constraint for metrics
CREATE UNIQUE INDEX idx_scheduling_metrics_unique ON scheduling_metrics(metric_date, period_type);

-- Indexes for performance
CREATE INDEX idx_scheduling_metrics_date ON scheduling_metrics(metric_date);
CREATE INDEX idx_scheduling_metrics_period ON scheduling_metrics(period_type);

-- =====================================================
-- Bulk Operations Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS bulk_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL,
    operation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Scope and impact
    total_items INTEGER NOT NULL,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Operation data
    operation_data JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_details JSONB DEFAULT '{}'::jsonb,
    
    -- Rollback information
    rollback_data JSONB DEFAULT '{}'::jsonb,
    rollback_available BOOLEAN DEFAULT true,
    rollback_executed BOOLEAN DEFAULT false,
    
    -- Progress tracking
    current_step VARCHAR(100),
    total_steps INTEGER DEFAULT 1,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms BIGINT,
    
    -- User context
    initiated_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_operation_type CHECK (operation_type IN (
        'bulk_reschedule', 'bulk_cancel', 'bulk_modify', 'schedule_generation',
        'conflict_resolution', 'optimization_run'
    )),
    CONSTRAINT chk_operation_status CHECK (operation_status IN (
        'pending', 'in_progress', 'completed', 'failed', 'cancelled', 'rolled_back'
    )),
    CONSTRAINT chk_items_counts CHECK (
        processed_items >= 0 AND successful_items >= 0 AND failed_items >= 0 AND
        processed_items = successful_items + failed_items
    ),
    CONSTRAINT chk_progress CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0)
);

-- Indexes for performance
CREATE INDEX idx_bulk_operations_status ON bulk_operation_logs(operation_status);
CREATE INDEX idx_bulk_operations_type ON bulk_operation_logs(operation_type);
CREATE INDEX idx_bulk_operations_started ON bulk_operation_logs(started_at);
CREATE INDEX idx_bulk_operations_user ON bulk_operation_logs(initiated_by);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_logs ENABLE ROW LEVEL SECURITY;

-- Schedule Templates Policies
CREATE POLICY "Users can view active schedule templates" ON schedule_templates
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins and managers can manage schedule templates" ON schedule_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
        )
    );

-- Therapist Availability Policies
CREATE POLICY "Therapists can manage their own availability" ON therapist_availability
    FOR ALL TO authenticated
    USING (
        therapist_id IN (
            SELECT t.id FROM therapists t
            WHERE t.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "All users can view therapist availability" ON therapist_availability
    FOR SELECT TO authenticated
    USING (is_available = true);

-- Schedule Conflicts Policies
CREATE POLICY "Users can view schedule conflicts" ON schedule_conflicts
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authorized users can manage conflicts" ON schedule_conflicts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager', 'therapist_lead')
        )
    );

-- Optimization Rules Policies
CREATE POLICY "All users can view active optimization rules" ON optimization_rules
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage optimization rules" ON optimization_rules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

-- Scheduling Metrics Policies
CREATE POLICY "All users can view scheduling metrics" ON scheduling_metrics
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "System can insert scheduling metrics" ON scheduling_metrics
    FOR INSERT TO authenticated
    USING (true);

-- Bulk Operations Policies
CREATE POLICY "Users can view their own bulk operations" ON bulk_operation_logs
    FOR SELECT TO authenticated
    USING (initiated_by = auth.uid());

CREATE POLICY "Managers can view all bulk operations" ON bulk_operation_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Authorized users can create bulk operations" ON bulk_operation_logs
    FOR INSERT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager', 'therapist_lead')
        )
    );

-- =====================================================
-- Triggers for Updated At Timestamp
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_schedule_templates_updated_at
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapist_availability_updated_at
    BEFORE UPDATE ON therapist_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_conflicts_updated_at
    BEFORE UPDATE ON schedule_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimization_rules_updated_at
    BEFORE UPDATE ON optimization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_metrics_updated_at
    BEFORE UPDATE ON scheduling_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_operation_logs_updated_at
    BEFORE UPDATE ON bulk_operation_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Utility Functions for Scheduling Engine
-- =====================================================

-- Function to get schedule statistics
CREATE OR REPLACE FUNCTION get_schedule_statistics(
    start_date DATE,
    end_date DATE,
    therapist_ids UUID[] DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    WITH session_stats AS (
        SELECT
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_sessions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions,
            COUNT(DISTINCT therapist_id) as active_therapists,
            SUM(duration_minutes) as total_minutes
        FROM therapy_sessions
        WHERE scheduled_date BETWEEN start_date AND end_date
        AND (therapist_ids IS NULL OR therapist_id = ANY(therapist_ids))
    ),
    conflict_stats AS (
        SELECT
            COUNT(*) as total_conflicts,
            COUNT(*) FILTER (WHERE severity = 'high') as high_priority_conflicts
        FROM schedule_conflicts sc
        WHERE detected_at::date BETWEEN start_date AND end_date
    )
    SELECT json_build_object(
        'total_sessions', COALESCE(ss.total_sessions, 0),
        'confirmed_sessions', COALESCE(ss.confirmed_sessions, 0),
        'completed_sessions', COALESCE(ss.completed_sessions, 0),
        'cancelled_sessions', COALESCE(ss.cancelled_sessions, 0),
        'active_therapists', COALESCE(ss.active_therapists, 0),
        'total_therapy_hours', COALESCE(ROUND(ss.total_minutes::numeric / 60, 2), 0),
        'average_sessions_per_therapist', 
            CASE 
                WHEN COALESCE(ss.active_therapists, 0) > 0 
                THEN ROUND(COALESCE(ss.total_sessions, 0)::numeric / ss.active_therapists, 2)
                ELSE 0 
            END,
        'utilization_percentage', 
            CASE 
                WHEN COALESCE(ss.total_sessions, 0) > 0 
                THEN ROUND((COALESCE(ss.confirmed_sessions, 0) + COALESCE(ss.completed_sessions, 0))::numeric / ss.total_sessions * 100, 2)
                ELSE 0 
            END,
        'total_conflicts', COALESCE(cs.total_conflicts, 0),
        'high_priority_conflicts', COALESCE(cs.high_priority_conflicts, 0),
        'attendance_rate',
            CASE 
                WHEN COALESCE(ss.completed_sessions, 0) + COALESCE(ss.cancelled_sessions, 0) > 0
                THEN ROUND(COALESCE(ss.completed_sessions, 0)::numeric / (ss.completed_sessions + ss.cancelled_sessions) * 100, 2)
                ELSE 0 
            END
    ) INTO stats
    FROM session_stats ss
    CROSS JOIN conflict_stats cs;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check therapist availability
CREATE OR REPLACE FUNCTION check_therapist_availability(
    p_therapist_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    day_of_week_num INTEGER;
    availability_exists BOOLEAN;
    has_conflicts BOOLEAN;
BEGIN
    -- Get day of week (1 = Monday, 7 = Sunday)
    day_of_week_num := EXTRACT(ISODOW FROM p_date);
    
    -- Check if therapist has availability for this day/time
    SELECT EXISTS (
        SELECT 1 FROM therapist_availability ta
        WHERE ta.therapist_id = p_therapist_id
        AND ta.is_available = true
        AND (
            (ta.is_recurring = true AND ta.day_of_week = day_of_week_num) OR
            (ta.is_recurring = false AND ta.specific_date = p_date)
        )
        AND ta.start_time <= p_start_time
        AND ta.end_time >= p_end_time
    ) INTO availability_exists;
    
    IF NOT availability_exists THEN
        RETURN false;
    END IF;
    
    -- Check for existing session conflicts
    SELECT EXISTS (
        SELECT 1 FROM therapy_sessions ts
        WHERE ts.therapist_id = p_therapist_id
        AND ts.scheduled_date = p_date
        AND ts.status NOT IN ('cancelled', 'no_show')
        AND (
            (ts.start_time < p_end_time AND ts.end_time > p_start_time)
        )
    ) INTO has_conflicts;
    
    RETURN NOT has_conflicts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Sample Data for Testing
-- =====================================================

-- Insert default optimization rules
INSERT INTO optimization_rules (name, name_ar, rule_type, priority, condition, action, weight) VALUES
('Minimize therapist gaps', 'تقليل الفجوات بين جلسات المعالج', 'optimization', 8, 
 '{"type": "gap_minimization", "max_gap_minutes": 60}',
 '{"type": "schedule_adjustment", "prefer_consecutive": true}', 1.5),
('Prefer morning sessions', 'تفضيل الجلسات الصباحية', 'preference', 6,
 '{"time_range": {"start": "08:00", "end": "12:00"}}',
 '{"type": "time_preference", "boost_score": 0.2}', 1.0),
('Avoid lunch hours', 'تجنب ساعات الغداء', 'constraint', 7,
 '{"avoid_time": {"start": "12:00", "end": "14:00"}}',
 '{"type": "time_restriction", "penalty": -0.5}', 1.2),
('Balance therapist workload', 'توزيع عبء العمل على المعالجين', 'optimization', 9,
 '{"type": "workload_balance", "max_daily_sessions": 8}',
 '{"type": "load_balancing", "redistribute": true}', 1.8);

-- Insert sample schedule templates
INSERT INTO schedule_templates (name, name_ar, description, description_ar, template_type, 
    session_duration, sessions_per_week, scheduling_pattern, pattern_config) VALUES
('Standard Therapy', 'علاج قياسي', 'Standard therapy sessions twice per week', 
 'جلسات علاج قياسية مرتين في الأسبوع', 'program_based', 60, 2, 'weekly',
 '{"preferred_days": [1, 3], "preferred_time_blocks": [{"start_time": "09:00", "end_time": "11:00"}]}'),
('Intensive Therapy', 'علاج مكثف', 'Intensive therapy sessions for faster progress',
 'جلسات علاج مكثفة لتقدم أسرع', 'program_based', 90, 3, 'weekly',
 '{"preferred_days": [1, 2, 4], "max_sessions_per_day": 2, "allow_evening": false}'),
('Flexible Schedule', 'جدول مرن', 'Flexible scheduling template for varying needs',
 'قالب جدولة مرن للاحتياجات المتنوعة', 'custom', 45, 2, 'biweekly',
 '{"allow_weekend": true, "flexible_timing": true, "min_gap_hours": 2}');

COMMENT ON TABLE schedule_templates IS 'Templates for automated schedule generation with bilingual support';
COMMENT ON TABLE therapist_availability IS 'Enhanced therapist availability with capacity management';
COMMENT ON TABLE schedule_conflicts IS 'Automated conflict detection and resolution tracking';
COMMENT ON TABLE optimization_rules IS 'Configurable rules for schedule optimization';
COMMENT ON TABLE scheduling_metrics IS 'Performance metrics for scheduling engine';
COMMENT ON TABLE bulk_operation_logs IS 'Audit trail for bulk scheduling operations';