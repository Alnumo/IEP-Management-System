-- Migration: 052_therapist_capacity_constraints.sql
-- Description: Create therapist capacity constraints table for advanced capacity management
-- Author: Claude Assistant
-- Date: 2025-09-04

-- Create therapist capacity constraints table
CREATE TABLE therapist_capacity_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Time-based constraints
    max_daily_hours DECIMAL(4,2) NOT NULL DEFAULT 8.0 CHECK (max_daily_hours > 0 AND max_daily_hours <= 24),
    max_weekly_hours DECIMAL(5,2) NOT NULL DEFAULT 40.0 CHECK (max_weekly_hours > 0 AND max_weekly_hours <= 168),
    max_monthly_hours DECIMAL(6,2) NOT NULL DEFAULT 160.0 CHECK (max_monthly_hours > 0),
    
    -- Student and session constraints
    max_concurrent_students INTEGER NOT NULL DEFAULT 25 CHECK (max_concurrent_students > 0 AND max_concurrent_students <= 100),
    max_sessions_per_day INTEGER NOT NULL DEFAULT 8 CHECK (max_sessions_per_day > 0 AND max_sessions_per_day <= 20),
    required_break_minutes INTEGER NOT NULL DEFAULT 15 CHECK (required_break_minutes >= 0 AND required_break_minutes <= 60),
    max_consecutive_hours DECIMAL(3,1) NOT NULL DEFAULT 4.0 CHECK (max_consecutive_hours > 0 AND max_consecutive_hours <= 12),
    
    -- Specialty requirements (stored as JSON array)
    specialty_requirements JSONB DEFAULT '[]'::jsonb,
    
    -- Availability windows (stored as JSON array of time windows)
    availability_windows JSONB DEFAULT '[]'::jsonb,
    
    -- Additional constraints (flexible JSON structure for future extensions)
    additional_constraints JSONB DEFAULT '{}'::jsonb,
    
    -- Constraint override settings
    allow_emergency_override BOOLEAN NOT NULL DEFAULT true,
    override_approval_required BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_therapist_capacity_constraints_therapist_id ON therapist_capacity_constraints(therapist_id);
CREATE INDEX idx_therapist_capacity_constraints_active ON therapist_capacity_constraints(is_active) WHERE is_active = true;
CREATE INDEX idx_therapist_capacity_constraints_created_at ON therapist_capacity_constraints(created_at);
CREATE INDEX idx_therapist_capacity_constraints_updated_at ON therapist_capacity_constraints(updated_at);

-- Create GIN indexes for JSONB fields
CREATE INDEX idx_therapist_capacity_constraints_specialty_requirements 
    ON therapist_capacity_constraints USING GIN (specialty_requirements);
CREATE INDEX idx_therapist_capacity_constraints_availability_windows 
    ON therapist_capacity_constraints USING GIN (availability_windows);
CREATE INDEX idx_therapist_capacity_constraints_additional_constraints 
    ON therapist_capacity_constraints USING GIN (additional_constraints);

-- Create unique constraint to ensure one active constraint set per therapist
CREATE UNIQUE INDEX idx_therapist_capacity_constraints_unique_active 
    ON therapist_capacity_constraints(therapist_id) 
    WHERE is_active = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_therapist_capacity_constraints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_therapist_capacity_constraints_updated_at
    BEFORE UPDATE ON therapist_capacity_constraints
    FOR EACH ROW
    EXECUTE FUNCTION update_therapist_capacity_constraints_updated_at();

-- Create function to validate availability windows JSON structure
CREATE OR REPLACE FUNCTION validate_availability_windows(windows JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(windows) != 'array' THEN
        RETURN false;
    END IF;
    
    -- Validate each window object
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(windows) AS window
        WHERE NOT (
            window ? 'day_of_week' AND 
            window ? 'start_time' AND 
            window ? 'end_time' AND
            (window->>'day_of_week')::INTEGER BETWEEN 0 AND 6 AND
            (window->>'start_time') ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' AND
            (window->>'end_time') ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
        )
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate availability windows structure
ALTER TABLE therapist_capacity_constraints 
ADD CONSTRAINT check_availability_windows_structure 
CHECK (validate_availability_windows(availability_windows));

-- Create function to validate specialty requirements JSON structure
CREATE OR REPLACE FUNCTION validate_specialty_requirements(specialties JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(specialties) != 'array' THEN
        RETURN false;
    END IF;
    
    -- Check if all elements are strings
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(specialties) AS specialty
        WHERE jsonb_typeof(specialty) != 'string'
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate specialty requirements structure
ALTER TABLE therapist_capacity_constraints 
ADD CONSTRAINT check_specialty_requirements_structure 
CHECK (validate_specialty_requirements(specialty_requirements));

-- Create capacity monitoring alerts table
CREATE TABLE capacity_monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(255) NOT NULL UNIQUE,
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('over_assignment', 'capacity_warning', 'constraint_violation', 'schedule_conflict')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Bilingual alert messages
    message_ar TEXT NOT NULL,
    message_en TEXT NOT NULL,
    
    -- Alert metadata
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    requires_immediate_action BOOLEAN NOT NULL DEFAULT false,
    auto_resolution_available BOOLEAN NOT NULL DEFAULT false,
    
    -- Recommended actions (stored as JSON array)
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    
    -- Alert context data
    context_data JSONB DEFAULT '{}'::jsonb,
    
    -- Resolution tracking
    resolution_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (resolution_status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for capacity monitoring alerts
CREATE INDEX idx_capacity_alerts_therapist_id ON capacity_monitoring_alerts(therapist_id);
CREATE INDEX idx_capacity_alerts_alert_type ON capacity_monitoring_alerts(alert_type);
CREATE INDEX idx_capacity_alerts_severity ON capacity_monitoring_alerts(severity);
CREATE INDEX idx_capacity_alerts_triggered_at ON capacity_monitoring_alerts(triggered_at);
CREATE INDEX idx_capacity_alerts_resolution_status ON capacity_monitoring_alerts(resolution_status);
CREATE INDEX idx_capacity_alerts_requires_immediate_action ON capacity_monitoring_alerts(requires_immediate_action) WHERE requires_immediate_action = true;

-- Create composite index for active alerts
CREATE INDEX idx_capacity_alerts_active ON capacity_monitoring_alerts(therapist_id, resolution_status, severity) 
    WHERE resolution_status = 'active';

-- Create GIN indexes for JSONB fields
CREATE INDEX idx_capacity_alerts_recommended_actions ON capacity_monitoring_alerts USING GIN (recommended_actions);
CREATE INDEX idx_capacity_alerts_context_data ON capacity_monitoring_alerts USING GIN (context_data);

-- Create trigger to update updated_at for alerts
CREATE TRIGGER trigger_update_capacity_alerts_updated_at
    BEFORE UPDATE ON capacity_monitoring_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default capacity constraints for existing therapists
INSERT INTO therapist_capacity_constraints (
    therapist_id,
    max_daily_hours,
    max_weekly_hours,
    max_monthly_hours,
    max_concurrent_students,
    max_sessions_per_day,
    required_break_minutes,
    max_consecutive_hours,
    specialty_requirements,
    availability_windows,
    created_by
)
SELECT 
    id,
    8.0,  -- Default 8 hours per day
    40.0, -- Default 40 hours per week
    160.0, -- Default 160 hours per month
    25,   -- Default max 25 concurrent students
    8,    -- Default max 8 sessions per day
    15,   -- Default 15 minute breaks
    4.0,  -- Default max 4 consecutive hours
    COALESCE(
        CASE WHEN specialties IS NOT NULL AND jsonb_typeof(specialties) = 'array' 
             THEN specialties 
             ELSE '[]'::jsonb 
        END, 
        '[]'::jsonb
    ) AS specialty_requirements,
    '[
        {
            "day_of_week": 1,
            "start_time": "09:00",
            "end_time": "17:00"
        },
        {
            "day_of_week": 2,
            "start_time": "09:00",
            "end_time": "17:00"
        },
        {
            "day_of_week": 3,
            "start_time": "09:00",
            "end_time": "17:00"
        },
        {
            "day_of_week": 4,
            "start_time": "09:00",
            "end_time": "17:00"
        },
        {
            "day_of_week": 0,
            "start_time": "09:00",
            "end_time": "13:00"
        }
    ]'::jsonb AS availability_windows, -- Sunday-Thursday schedule (Saudi work week)
    (SELECT id FROM auth.users LIMIT 1) -- System user for initial creation
FROM therapists 
WHERE status = 'active'
ON CONFLICT DO NOTHING;

-- Create RLS policies for therapist_capacity_constraints
ALTER TABLE therapist_capacity_constraints ENABLE ROW LEVEL SECURITY;

-- Policy: Therapists can view their own constraints
CREATE POLICY "therapists_view_own_constraints" ON therapist_capacity_constraints
    FOR SELECT USING (
        therapist_id IN (
            SELECT id FROM therapists 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins and managers can view all constraints
CREATE POLICY "admins_managers_view_all_constraints" ON therapist_capacity_constraints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can manage constraints
CREATE POLICY "admins_managers_manage_constraints" ON therapist_capacity_constraints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: System can manage constraints (for automated updates)
CREATE POLICY "system_manage_constraints" ON therapist_capacity_constraints
    FOR ALL USING (auth.uid() IS NULL);

-- Create RLS policies for capacity_monitoring_alerts
ALTER TABLE capacity_monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Therapists can view their own alerts
CREATE POLICY "therapists_view_own_alerts" ON capacity_monitoring_alerts
    FOR SELECT USING (
        therapist_id IN (
            SELECT id FROM therapists 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins and managers can view all alerts
CREATE POLICY "admins_managers_view_all_alerts" ON capacity_monitoring_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can manage alerts
CREATE POLICY "admins_managers_manage_alerts" ON capacity_monitoring_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: System can create alerts (for automated monitoring)
CREATE POLICY "system_create_alerts" ON capacity_monitoring_alerts
    FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- Add helpful comments
COMMENT ON TABLE therapist_capacity_constraints IS 'Stores capacity constraints and limits for individual therapists to prevent over-assignment and ensure workload balance';
COMMENT ON COLUMN therapist_capacity_constraints.max_daily_hours IS 'Maximum hours a therapist can work per day';
COMMENT ON COLUMN therapist_capacity_constraints.max_weekly_hours IS 'Maximum hours a therapist can work per week';
COMMENT ON COLUMN therapist_capacity_constraints.max_monthly_hours IS 'Maximum hours a therapist can work per month';
COMMENT ON COLUMN therapist_capacity_constraints.max_concurrent_students IS 'Maximum number of students a therapist can handle simultaneously';
COMMENT ON COLUMN therapist_capacity_constraints.max_sessions_per_day IS 'Maximum number of therapy sessions per day';
COMMENT ON COLUMN therapist_capacity_constraints.required_break_minutes IS 'Required break time between consecutive sessions (in minutes)';
COMMENT ON COLUMN therapist_capacity_constraints.max_consecutive_hours IS 'Maximum consecutive hours without a break';
COMMENT ON COLUMN therapist_capacity_constraints.specialty_requirements IS 'JSON array of required specialties for assignments';
COMMENT ON COLUMN therapist_capacity_constraints.availability_windows IS 'JSON array of availability time windows per day of week';
COMMENT ON COLUMN therapist_capacity_constraints.allow_emergency_override IS 'Whether constraints can be overridden in emergency situations';
COMMENT ON COLUMN therapist_capacity_constraints.override_approval_required IS 'Whether constraint overrides require managerial approval';

COMMENT ON TABLE capacity_monitoring_alerts IS 'Stores capacity monitoring alerts generated by the system to prevent over-assignment and capacity violations';
COMMENT ON COLUMN capacity_monitoring_alerts.alert_id IS 'Unique identifier for the alert (can be used for deduplication)';
COMMENT ON COLUMN capacity_monitoring_alerts.alert_type IS 'Type of capacity alert: over_assignment, capacity_warning, constraint_violation, schedule_conflict';
COMMENT ON COLUMN capacity_monitoring_alerts.severity IS 'Alert severity level: low, medium, high, critical';
COMMENT ON COLUMN capacity_monitoring_alerts.requires_immediate_action IS 'Whether this alert requires immediate attention';
COMMENT ON COLUMN capacity_monitoring_alerts.auto_resolution_available IS 'Whether the system can automatically resolve this alert';
COMMENT ON COLUMN capacity_monitoring_alerts.recommended_actions IS 'JSON array of recommended actions to resolve the alert';
COMMENT ON COLUMN capacity_monitoring_alerts.context_data IS 'JSON object containing additional context data about the alert';
COMMENT ON COLUMN capacity_monitoring_alerts.resolution_status IS 'Current status of the alert resolution process';