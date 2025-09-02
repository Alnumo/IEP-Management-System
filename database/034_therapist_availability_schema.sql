-- =====================================================
-- Therapist Availability Schema Extensions
-- Story 3.1: Automated Scheduling Engine
-- =====================================================

-- =====================================================
-- Table: availability_templates
-- Purpose: Reusable availability patterns for therapists
-- =====================================================
CREATE TABLE IF NOT EXISTS availability_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Template ownership
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Template configuration
    weekly_pattern JSONB NOT NULL, -- Array of weekly availability slots
    exceptions JSONB DEFAULT '[]', -- Array of date-specific exceptions
    
    -- Validity period
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_applied DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (valid_from <= valid_until OR valid_until IS NULL)
);

-- =====================================================
-- Table: therapist_schedule_preferences
-- Purpose: Individual therapist scheduling preferences and constraints
-- =====================================================
CREATE TABLE IF NOT EXISTS therapist_schedule_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID UNIQUE NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Working hours preferences
    preferred_start_time TIME DEFAULT '08:00',
    preferred_end_time TIME DEFAULT '17:00',
    max_hours_per_day DECIMAL(4,2) DEFAULT 8.0,
    max_hours_per_week DECIMAL(5,2) DEFAULT 40.0,
    
    -- Session scheduling preferences
    min_break_between_sessions INTEGER DEFAULT 15, -- minutes
    max_consecutive_sessions INTEGER DEFAULT 6,
    preferred_session_duration INTEGER DEFAULT 60, -- minutes
    
    -- Workload management
    max_sessions_per_day INTEGER DEFAULT 8,
    max_sessions_per_week INTEGER DEFAULT 35,
    preferred_session_distribution VARCHAR(50) DEFAULT 'balanced', -- balanced, front_loaded, back_loaded
    
    -- Time preferences
    allow_early_morning BOOLEAN DEFAULT false, -- before 8 AM
    allow_evening BOOLEAN DEFAULT false, -- after 6 PM
    allow_weekend BOOLEAN DEFAULT false,
    preferred_lunch_break_start TIME DEFAULT '12:00',
    preferred_lunch_break_duration INTEGER DEFAULT 60, -- minutes
    
    -- Special constraints
    avoid_back_to_back_different_locations BOOLEAN DEFAULT true,
    require_setup_time INTEGER DEFAULT 5, -- minutes before each session
    require_cleanup_time INTEGER DEFAULT 5, -- minutes after each session
    
    -- Notification preferences
    notification_advance_hours INTEGER DEFAULT 24,
    emergency_contact_method VARCHAR(50) DEFAULT 'email',
    
    -- Flexibility settings
    flexibility_score INTEGER DEFAULT 50 CHECK (flexibility_score >= 0 AND flexibility_score <= 100),
    auto_accept_within_preferences BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_working_hours CHECK (preferred_start_time < preferred_end_time),
    CONSTRAINT valid_daily_hours CHECK (max_hours_per_day > 0 AND max_hours_per_day <= 24),
    CONSTRAINT valid_weekly_hours CHECK (max_hours_per_week > 0 AND max_hours_per_week <= 168),
    CONSTRAINT valid_break_time CHECK (min_break_between_sessions >= 0),
    CONSTRAINT valid_session_counts CHECK (max_sessions_per_day > 0 AND max_sessions_per_week > 0)
);

-- =====================================================
-- Table: availability_exceptions  
-- Purpose: Date-specific availability changes and time-off requests
-- =====================================================
CREATE TABLE IF NOT EXISTS availability_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Exception period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Exception type
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('time_off', 'modified_hours', 'unavailable', 'special_availability')),
    
    -- Exception details
    is_all_day BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    
    -- Reason and status
    reason VARCHAR(255) NOT NULL,
    reason_ar VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Approval workflow
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Impact tracking
    affected_sessions_count INTEGER DEFAULT 0,
    automatic_rescheduling BOOLEAN DEFAULT true,
    
    -- Recurrence pattern (for recurring exceptions)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- For recurring time-off or schedule changes
    
    -- Emergency contact
    emergency_coverage_therapist_id UUID REFERENCES therapists(id),
    
    -- Notes
    notes TEXT,
    admin_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_exception_dates CHECK (start_date <= end_date),
    CONSTRAINT valid_exception_times CHECK (
        (is_all_day = true) OR 
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- =====================================================
-- Table: workload_analytics
-- Purpose: Track and analyze therapist workload and utilization
-- =====================================================
CREATE TABLE IF NOT EXISTS workload_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Analysis period
    analysis_date DATE NOT NULL,
    week_start_date DATE NOT NULL,
    month_start_date DATE NOT NULL,
    
    -- Session metrics
    total_scheduled_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    cancelled_sessions INTEGER DEFAULT 0,
    no_show_sessions INTEGER DEFAULT 0,
    
    -- Time metrics
    total_scheduled_hours DECIMAL(6,2) DEFAULT 0,
    total_actual_hours DECIMAL(6,2) DEFAULT 0,
    available_hours DECIMAL(6,2) DEFAULT 0,
    
    -- Utilization metrics
    utilization_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    efficiency_score DECIMAL(5,2) DEFAULT 0, -- percentage
    availability_utilization DECIMAL(5,2) DEFAULT 0, -- percentage
    
    -- Workload distribution
    peak_hours_sessions INTEGER DEFAULT 0,
    off_peak_hours_sessions INTEGER DEFAULT 0,
    average_session_gap DECIMAL(5,2) DEFAULT 0, -- minutes
    
    -- Conflict metrics
    scheduling_conflicts INTEGER DEFAULT 0,
    rescheduled_sessions INTEGER DEFAULT 0,
    emergency_schedule_changes INTEGER DEFAULT 0,
    
    -- Quality metrics
    on_time_arrival_rate DECIMAL(5,2) DEFAULT 100,
    session_completion_rate DECIMAL(5,2) DEFAULT 100,
    client_satisfaction_score DECIMAL(3,1), -- 1-10 scale
    
    -- Computed scores
    workload_balance_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    schedule_flexibility_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    
    -- Comparison metrics
    peer_group_avg_utilization DECIMAL(5,2),
    department_avg_utilization DECIMAL(5,2),
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    calculation_version VARCHAR(20) DEFAULT '1.0',
    
    -- Constraints
    CONSTRAINT unique_therapist_date UNIQUE (therapist_id, analysis_date),
    CONSTRAINT valid_percentages CHECK (
        utilization_rate >= 0 AND utilization_rate <= 100 AND
        efficiency_score >= 0 AND efficiency_score <= 100 AND
        availability_utilization >= 0 AND availability_utilization <= 100
    )
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Availability templates indexes
CREATE INDEX IF NOT EXISTS idx_availability_templates_therapist_active 
    ON availability_templates(therapist_id, is_active);
CREATE INDEX IF NOT EXISTS idx_availability_templates_default 
    ON availability_templates(is_default, therapist_id);
CREATE INDEX IF NOT EXISTS idx_availability_templates_validity 
    ON availability_templates(valid_from, valid_until);

-- Therapist schedule preferences indexes
CREATE INDEX IF NOT EXISTS idx_therapist_preferences_flexibility 
    ON therapist_schedule_preferences(flexibility_score, auto_accept_within_preferences);
CREATE INDEX IF NOT EXISTS idx_therapist_preferences_workload 
    ON therapist_schedule_preferences(max_sessions_per_day, max_sessions_per_week);

-- Availability exceptions indexes
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_therapist_dates 
    ON availability_exceptions(therapist_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_status_type 
    ON availability_exceptions(status, exception_type);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_period 
    ON availability_exceptions(start_date, end_date) 
    WHERE status IN ('approved', 'pending');

-- Workload analytics indexes
CREATE INDEX IF NOT EXISTS idx_workload_analytics_therapist_date 
    ON workload_analytics(therapist_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_workload_analytics_utilization 
    ON workload_analytics(utilization_rate, analysis_date);
CREATE INDEX IF NOT EXISTS idx_workload_analytics_week_month 
    ON workload_analytics(week_start_date, month_start_date);

-- =====================================================
-- Materialized Views for Performance
-- =====================================================

-- Current availability summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS current_therapist_availability AS
SELECT 
    t.id as therapist_id,
    t.name_en as therapist_name,
    t.name_ar as therapist_name_ar,
    
    -- Current availability slots
    COUNT(ta.id) as total_availability_slots,
    COUNT(ta.id) FILTER (WHERE ta.is_available = true) as available_slots,
    COUNT(ta.id) FILTER (WHERE ta.is_time_off = true) as time_off_slots,
    
    -- Capacity metrics
    SUM(ta.max_sessions_per_slot) as total_capacity,
    SUM(ta.current_bookings) as current_bookings,
    SUM(ta.max_sessions_per_slot - ta.current_bookings) as remaining_capacity,
    
    -- Utilization calculation
    CASE 
        WHEN SUM(ta.max_sessions_per_slot) > 0 
        THEN ROUND((SUM(ta.current_bookings)::decimal / SUM(ta.max_sessions_per_slot)) * 100, 2)
        ELSE 0 
    END as utilization_percentage,
    
    -- Preference integration
    tsp.flexibility_score,
    tsp.max_sessions_per_day,
    tsp.max_sessions_per_week,
    
    -- Last updated
    GREATEST(MAX(ta.updated_at), MAX(tsp.updated_at)) as last_updated
FROM therapists t
LEFT JOIN therapist_availability ta ON t.id = ta.therapist_id 
    AND (ta.is_recurring = true OR ta.specific_date >= CURRENT_DATE)
LEFT JOIN therapist_schedule_preferences tsp ON t.id = tsp.therapist_id
WHERE t.is_active = true
GROUP BY t.id, t.name_en, t.name_ar, tsp.flexibility_score, 
         tsp.max_sessions_per_day, tsp.max_sessions_per_week;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_current_availability_therapist 
    ON current_therapist_availability(therapist_id);

-- =====================================================
-- Triggers for Automated Updates
-- =====================================================

-- Update availability_templates timestamp
CREATE TRIGGER update_availability_templates_updated_at 
    BEFORE UPDATE ON availability_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update therapist_schedule_preferences timestamp  
CREATE TRIGGER update_therapist_preferences_updated_at 
    BEFORE UPDATE ON therapist_schedule_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update availability_exceptions timestamp
CREATE TRIGGER update_availability_exceptions_updated_at 
    BEFORE UPDATE ON availability_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh materialized view on availability changes
CREATE OR REPLACE FUNCTION refresh_current_availability()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_therapist_availability;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized view
CREATE TRIGGER refresh_availability_on_change
    AFTER INSERT OR UPDATE OR DELETE ON therapist_availability
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_current_availability();

-- =====================================================
-- Functions for Workload Calculation
-- =====================================================

-- Function to calculate daily workload analytics
CREATE OR REPLACE FUNCTION calculate_daily_workload(
    p_therapist_id UUID,
    p_analysis_date DATE
) RETURNS workload_analytics AS $$
DECLARE
    result workload_analytics%ROWTYPE;
    week_start DATE;
    month_start DATE;
BEGIN
    -- Calculate week and month boundaries
    week_start := p_analysis_date - EXTRACT(dow FROM p_analysis_date)::INTEGER;
    month_start := DATE_TRUNC('month', p_analysis_date)::DATE;
    
    -- Initialize result
    result.therapist_id := p_therapist_id;
    result.analysis_date := p_analysis_date;
    result.week_start_date := week_start;
    result.month_start_date := month_start;
    
    -- Calculate session metrics for the day
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status = 'no_show'),
        SUM(duration_minutes)::DECIMAL / 60,
        -- Actual hours would come from session logs
        SUM(duration_minutes)::DECIMAL / 60
    INTO 
        result.total_scheduled_sessions,
        result.completed_sessions,
        result.cancelled_sessions,
        result.no_show_sessions,
        result.total_scheduled_hours,
        result.total_actual_hours
    FROM scheduled_sessions 
    WHERE therapist_id = p_therapist_id 
    AND scheduled_date = p_analysis_date;
    
    -- Calculate available hours from therapist availability
    SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
    INTO result.available_hours
    FROM therapist_availability
    WHERE therapist_id = p_therapist_id 
    AND (
        (is_recurring = true AND day_of_week = EXTRACT(dow FROM p_analysis_date)) OR
        (specific_date = p_analysis_date)
    )
    AND is_available = true;
    
    -- Calculate utilization metrics
    result.utilization_rate := CASE 
        WHEN result.available_hours > 0 
        THEN ROUND((result.total_scheduled_hours / result.available_hours) * 100, 2)
        ELSE 0 
    END;
    
    result.efficiency_score := CASE 
        WHEN result.total_scheduled_sessions > 0
        THEN ROUND((result.completed_sessions::DECIMAL / result.total_scheduled_sessions) * 100, 2)
        ELSE 100
    END;
    
    -- Set calculation metadata
    result.calculated_at := now();
    result.calculation_version := '1.0';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE availability_templates IS 'Reusable availability patterns for therapists with weekly schedules and exceptions';
COMMENT ON TABLE therapist_schedule_preferences IS 'Individual therapist scheduling preferences, constraints, and workload limits';
COMMENT ON TABLE availability_exceptions IS 'Date-specific availability changes, time-off requests, and schedule modifications';  
COMMENT ON TABLE workload_analytics IS 'Comprehensive workload tracking and utilization analytics for therapists';

COMMENT ON MATERIALIZED VIEW current_therapist_availability IS 'Real-time availability summary with capacity and utilization metrics';
COMMENT ON FUNCTION calculate_daily_workload IS 'Calculate comprehensive daily workload metrics for a therapist on a specific date';