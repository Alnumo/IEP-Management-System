-- =====================================================
-- Automated Scheduling Schema - Core Tables
-- Story 3.1: Automated Scheduling Engine
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: therapist_availability
-- Purpose: Time slot management for therapist schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS therapist_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Time slot definition
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Availability management
    is_available BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT true, -- For recurring weekly availability
    specific_date DATE NULL, -- For specific date overrides
    
    -- Capacity and workload management
    max_sessions_per_slot INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    
    -- Time off and exceptions
    is_time_off BOOLEAN DEFAULT false,
    time_off_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_session_capacity CHECK (max_sessions_per_slot > 0),
    CONSTRAINT valid_current_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_sessions_per_slot)
);

-- =====================================================
-- Table: schedule_templates  
-- Purpose: Reusable scheduling patterns and rules
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL, -- Arabic name
    description TEXT,
    description_ar TEXT, -- Arabic description
    
    -- Template configuration
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('program_based', 'custom', 'recurring')),
    is_active BOOLEAN DEFAULT true,
    
    -- Scheduling rules
    session_duration INTEGER NOT NULL, -- Duration in minutes
    sessions_per_week INTEGER DEFAULT 1,
    preferred_times JSONB, -- Array of preferred time slots
    
    -- Pattern configuration
    scheduling_pattern VARCHAR(50) DEFAULT 'weekly' CHECK (scheduling_pattern IN ('daily', 'weekly', 'biweekly', 'monthly')),
    pattern_config JSONB, -- Flexible pattern configuration
    
    -- Resource requirements
    required_room_type VARCHAR(100),
    required_equipment JSONB, -- Array of required equipment
    special_requirements TEXT,
    special_requirements_ar TEXT,
    
    -- Optimization preferences
    allow_back_to_back BOOLEAN DEFAULT true,
    max_gap_between_sessions INTEGER DEFAULT 60, -- Minutes
    preferred_therapist_id UUID REFERENCES therapists(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (session_duration > 0 AND session_duration <= 480), -- Max 8 hours
    CONSTRAINT valid_sessions_per_week CHECK (sessions_per_week > 0 AND sessions_per_week <= 21) -- Max 3 per day
);

-- =====================================================
-- Table: scheduled_sessions
-- Purpose: Generated session schedules with conflict tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session identification
    session_number VARCHAR(50) NOT NULL, -- Auto-generated session identifier
    
    -- Relationships
    student_subscription_id UUID NOT NULL REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES therapists(id),
    template_id UUID REFERENCES schedule_templates(id),
    
    -- Schedule details
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Session categorization
    session_category VARCHAR(100) NOT NULL DEFAULT 'therapy',
    session_type VARCHAR(100), -- specific therapy type
    priority_level INTEGER DEFAULT 1 CHECK (priority_level >= 1 AND priority_level <= 5),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    
    -- Conflict management
    has_conflicts BOOLEAN DEFAULT false,
    conflict_details JSONB, -- Array of conflict descriptions
    resolution_status VARCHAR(50) DEFAULT 'none' CHECK (resolution_status IN ('none', 'pending', 'resolved', 'escalated')),
    
    -- Resource allocation
    room_id UUID, -- Reference to rooms table if exists
    equipment_ids JSONB, -- Array of equipment IDs
    
    -- Rescheduling tracking
    original_session_id UUID REFERENCES scheduled_sessions(id), -- If rescheduled
    reschedule_reason VARCHAR(255),
    reschedule_count INTEGER DEFAULT 0,
    
    -- Generation metadata
    generation_algorithm VARCHAR(100), -- Algorithm used to generate this session
    optimization_score DECIMAL(5,2), -- Optimization score (0-100)
    
    -- Billing integration
    is_billable BOOLEAN DEFAULT true,
    billing_rate DECIMAL(10,2),
    
    -- Notes and communication
    therapist_notes TEXT,
    admin_notes TEXT,
    parent_notification_sent BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints  
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT valid_reschedule_count CHECK (reschedule_count >= 0),
    CONSTRAINT unique_session_slot UNIQUE (therapist_id, scheduled_date, start_time)
);

-- =====================================================
-- Table: schedule_conflicts
-- Purpose: Track and manage scheduling conflicts
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Conflict identification
    conflict_type VARCHAR(100) NOT NULL CHECK (conflict_type IN ('therapist_double_booking', 'room_unavailable', 'equipment_conflict', 'student_unavailable', 'time_constraint')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Related sessions
    primary_session_id UUID NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
    conflicting_session_id UUID REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_description TEXT NOT NULL,
    conflict_description_ar TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Resolution tracking
    resolution_status VARCHAR(50) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'escalated', 'ignored')),
    resolution_method VARCHAR(100),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Alternative suggestions
    suggested_alternatives JSONB, -- Array of alternative time slots
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Therapist availability indexes
CREATE INDEX IF NOT EXISTS idx_therapist_availability_therapist_day 
    ON therapist_availability(therapist_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_therapist_availability_date_available 
    ON therapist_availability(specific_date, is_available);
CREATE INDEX IF NOT EXISTS idx_therapist_availability_recurring 
    ON therapist_availability(is_recurring, is_available);

-- Schedule templates indexes  
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active 
    ON schedule_templates(is_active, template_type);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_therapist 
    ON schedule_templates(preferred_therapist_id);

-- Scheduled sessions indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_date_therapist 
    ON scheduled_sessions(scheduled_date, therapist_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_subscription 
    ON scheduled_sessions(student_subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_status_date 
    ON scheduled_sessions(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_conflicts 
    ON scheduled_sessions(has_conflicts, resolution_status);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_datetime 
    ON scheduled_sessions(scheduled_date, start_time, end_time);

-- Schedule conflicts indexes
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_session 
    ON schedule_conflicts(primary_session_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_type_severity 
    ON schedule_conflicts(conflict_type, severity);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_status 
    ON schedule_conflicts(resolution_status, detected_at);

-- =====================================================
-- Triggers for Automated Timestamps
-- =====================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_therapist_availability_updated_at 
    BEFORE UPDATE ON therapist_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_templates_updated_at 
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_sessions_updated_at 
    BEFORE UPDATE ON scheduled_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_conflicts_updated_at 
    BEFORE UPDATE ON schedule_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE therapist_availability IS 'Manages therapist time slots and availability for automated scheduling';
COMMENT ON TABLE schedule_templates IS 'Reusable scheduling patterns and rules for different therapy programs';
COMMENT ON TABLE scheduled_sessions IS 'Generated session schedules with comprehensive tracking and conflict management';
COMMENT ON TABLE schedule_conflicts IS 'Tracks and manages scheduling conflicts with resolution workflows';

COMMENT ON COLUMN therapist_availability.day_of_week IS '0=Sunday through 6=Saturday for weekly recurring availability';
COMMENT ON COLUMN schedule_templates.pattern_config IS 'JSONB configuration for flexible scheduling patterns and rules';
COMMENT ON COLUMN scheduled_sessions.conflict_details IS 'JSONB array storing detailed conflict information and context';
COMMENT ON COLUMN schedule_conflicts.suggested_alternatives IS 'JSONB array of alternative scheduling options for conflict resolution';