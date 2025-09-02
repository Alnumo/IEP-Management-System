-- Service Hour Tracking and Compliance Schema
-- Extension to IEP Management System for Service Delivery Tracking
-- IDEA 2024 Compliant - Service Hour Documentation and Validation
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- SERVICE DELIVERY SESSIONS TABLE
-- Actual service delivery sessions with hour tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_delivery_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES iep_services(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Session Information
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    planned_duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER,
    
    -- Service Provider Information
    provider_id UUID REFERENCES auth.users(id),
    provider_name VARCHAR(100), -- For external providers
    substitute_provider_id UUID REFERENCES auth.users(id),
    substitute_provider_name VARCHAR(100),
    is_substitute_session BOOLEAN DEFAULT FALSE,
    
    -- Session Location and Setting
    actual_location VARCHAR(50) CHECK (actual_location IN (
        'general_education_classroom', 'special_education_classroom',
        'therapy_room', 'home', 'community', 'online', 'other'
    )),
    location_notes_ar TEXT,
    location_notes_en TEXT,
    
    -- Session Status and Outcomes
    session_status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (session_status IN (
        'scheduled', 'completed', 'cancelled', 'no_show', 'partial', 'makeup_needed'
    )),
    cancellation_reason_ar TEXT,
    cancellation_reason_en TEXT,
    
    -- Service Delivery Documentation (Bilingual)
    services_delivered_ar TEXT,
    services_delivered_en TEXT,
    session_objectives_met BOOLEAN,
    student_engagement_level INTEGER CHECK (student_engagement_level BETWEEN 1 AND 5),
    
    -- Progress Tracking
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    behavioral_observations_ar TEXT,
    behavioral_observations_en TEXT,
    
    -- Goals and Objectives Progress
    goals_addressed UUID[] DEFAULT '{}',
    objective_progress JSONB DEFAULT '{}', -- Store progress on specific objectives
    
    -- Compliance Tracking
    session_documented BOOLEAN DEFAULT FALSE,
    documentation_complete BOOLEAN DEFAULT FALSE,
    requires_makeup_session BOOLEAN DEFAULT FALSE,
    makeup_session_scheduled BOOLEAN DEFAULT FALSE,
    makeup_for_session_id UUID REFERENCES service_delivery_sessions(id),
    
    -- Quality Assurance
    supervisor_review_required BOOLEAN DEFAULT FALSE,
    supervisor_reviewed_by UUID REFERENCES auth.users(id),
    supervisor_review_date TIMESTAMP WITH TIME ZONE,
    supervisor_comments_ar TEXT,
    supervisor_comments_en TEXT,
    
    -- Billing and Administrative
    billable_session BOOLEAN DEFAULT TRUE,
    billing_code VARCHAR(20),
    administrative_notes_ar TEXT,
    administrative_notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- SERVICE HOUR SUMMARIES TABLE
-- Aggregated service hour tracking for compliance reporting
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_hour_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES iep_services(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Time Period
    summary_period_type VARCHAR(20) NOT NULL CHECK (summary_period_type IN (
        'weekly', 'monthly', 'quarterly', 'annual'
    )),
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Service Hour Tracking
    planned_total_minutes INTEGER NOT NULL,
    delivered_total_minutes INTEGER DEFAULT 0,
    missed_total_minutes INTEGER DEFAULT 0,
    makeup_total_minutes INTEGER DEFAULT 0,
    
    -- Session Counts
    total_planned_sessions INTEGER NOT NULL,
    total_completed_sessions INTEGER DEFAULT 0,
    total_cancelled_sessions INTEGER DEFAULT 0,
    total_no_show_sessions INTEGER DEFAULT 0,
    total_makeup_sessions INTEGER DEFAULT 0,
    
    -- Compliance Metrics
    service_delivery_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN planned_total_minutes > 0 
            THEN ROUND((delivered_total_minutes::DECIMAL / planned_total_minutes::DECIMAL) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    
    compliance_status VARCHAR(20) DEFAULT 'compliant' CHECK (compliance_status IN (
        'compliant', 'at_risk', 'non_compliant', 'needs_review'
    )),
    
    -- Alert Thresholds
    below_threshold_alert BOOLEAN DEFAULT FALSE,
    makeup_sessions_needed INTEGER DEFAULT 0,
    compliance_notes_ar TEXT,
    compliance_notes_en TEXT,
    
    -- Metadata
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SERVICE COMPLIANCE ALERTS TABLE
-- Automated alerts for service delivery compliance issues
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_compliance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES iep_services(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Alert Information
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'service_hours_below_threshold',
        'excessive_cancellations',
        'missed_sessions_requiring_makeup',
        'provider_unavailable',
        'documentation_overdue',
        'compliance_review_required',
        'service_modification_needed'
    )),
    
    -- Alert Priority and Status
    priority_level VARCHAR(10) NOT NULL CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    alert_status VARCHAR(20) DEFAULT 'active' CHECK (alert_status IN (
        'active', 'acknowledged', 'resolved', 'dismissed', 'escalated'
    )),
    
    -- Alert Content (Bilingual)
    alert_title_ar TEXT NOT NULL,
    alert_title_en TEXT NOT NULL,
    alert_message_ar TEXT NOT NULL,
    alert_message_en TEXT NOT NULL,
    recommended_action_ar TEXT,
    recommended_action_en TEXT,
    
    -- Alert Metrics
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    variance_amount DECIMAL(10,2),
    
    -- Alert Timeline
    alert_triggered_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolution_due_date TIMESTAMP WITH TIME ZONE,
    resolved_date TIMESTAMP WITH TIME ZONE,
    
    -- Assignment and Resolution
    assigned_to_user_id UUID REFERENCES auth.users(id),
    resolved_by_user_id UUID REFERENCES auth.users(id),
    resolution_notes_ar TEXT,
    resolution_notes_en TEXT,
    
    -- Follow-up Actions
    requires_iep_team_review BOOLEAN DEFAULT FALSE,
    requires_service_modification BOOLEAN DEFAULT FALSE,
    requires_parent_notification BOOLEAN DEFAULT FALSE,
    parent_notified_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SERVICE PROVIDER SCHEDULES TABLE
-- Provider availability and scheduling for service delivery
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_provider_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Schedule Information
    schedule_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    
    -- Time Slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available_duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    
    -- Availability Status
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN (
        'available', 'booked', 'partially_booked', 'unavailable', 'break', 'meeting'
    )),
    
    -- Location and Service Type
    available_locations VARCHAR(50)[] DEFAULT '{}',
    service_categories VARCHAR(30)[] DEFAULT '{}',
    
    -- Recurring Schedule
    is_recurring BOOLEAN DEFAULT TRUE,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
        'weekly', 'biweekly', 'monthly', 'one_time'
    )),
    recurrence_end_date DATE,
    
    -- Special Notes
    schedule_notes_ar TEXT,
    schedule_notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Service Delivery Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_service_id ON service_delivery_sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_student_id ON service_delivery_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_provider_id ON service_delivery_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_date ON service_delivery_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_status ON service_delivery_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_service_delivery_sessions_makeup ON service_delivery_sessions(makeup_for_session_id) WHERE makeup_for_session_id IS NOT NULL;

-- Service Hour Summaries Indexes
CREATE INDEX IF NOT EXISTS idx_service_hour_summaries_service_id ON service_hour_summaries(service_id);
CREATE INDEX IF NOT EXISTS idx_service_hour_summaries_student_id ON service_hour_summaries(student_id);
CREATE INDEX IF NOT EXISTS idx_service_hour_summaries_period ON service_hour_summaries(summary_period_type, period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_service_hour_summaries_compliance ON service_hour_summaries(compliance_status);

-- Service Compliance Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_service_id ON service_compliance_alerts(service_id);
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_student_id ON service_compliance_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_type ON service_compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_status ON service_compliance_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_priority ON service_compliance_alerts(priority_level);
CREATE INDEX IF NOT EXISTS idx_service_compliance_alerts_assigned ON service_compliance_alerts(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

-- Service Provider Schedules Indexes
CREATE INDEX IF NOT EXISTS idx_service_provider_schedules_provider_id ON service_provider_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_schedules_date ON service_provider_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_service_provider_schedules_day_time ON service_provider_schedules(day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_service_provider_schedules_status ON service_provider_schedules(availability_status);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps
CREATE TRIGGER update_service_delivery_sessions_updated_at 
    BEFORE UPDATE ON service_delivery_sessions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_service_hour_summaries_updated_at 
    BEFORE UPDATE ON service_hour_summaries 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_service_compliance_alerts_updated_at 
    BEFORE UPDATE ON service_compliance_alerts 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_service_provider_schedules_updated_at 
    BEFORE UPDATE ON service_provider_schedules 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Function to calculate service hour compliance
CREATE OR REPLACE FUNCTION calculate_service_compliance(
    p_service_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS TABLE (
    planned_minutes INTEGER,
    delivered_minutes INTEGER,
    compliance_percentage DECIMAL(5,2),
    compliance_status VARCHAR(20),
    makeup_needed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH service_calculations AS (
        SELECT 
            s.frequency_per_week * s.session_duration_minutes * 
            (EXTRACT(DAYS FROM p_period_end - p_period_start) / 7.0)::INTEGER as planned_mins,
            
            COALESCE(SUM(
                CASE 
                    WHEN sds.session_status = 'completed' 
                    THEN sds.actual_duration_minutes 
                    ELSE 0 
                END
            ), 0) as delivered_mins
            
        FROM iep_services s
        LEFT JOIN service_delivery_sessions sds ON s.id = sds.service_id
            AND sds.session_date BETWEEN p_period_start AND p_period_end
        WHERE s.id = p_service_id
        GROUP BY s.frequency_per_week, s.session_duration_minutes
    )
    SELECT 
        sc.planned_mins,
        sc.delivered_mins::INTEGER,
        ROUND(
            CASE 
                WHEN sc.planned_mins > 0 
                THEN (sc.delivered_mins / sc.planned_mins::DECIMAL) * 100 
                ELSE 0 
            END, 2
        ) as compliance_pct,
        CASE 
            WHEN sc.delivered_mins >= sc.planned_mins * 0.9 THEN 'compliant'::VARCHAR(20)
            WHEN sc.delivered_mins >= sc.planned_mins * 0.7 THEN 'at_risk'::VARCHAR(20)
            ELSE 'non_compliant'::VARCHAR(20)
        END as compliance_stat,
        GREATEST(0, sc.planned_mins - sc.delivered_mins)::INTEGER as makeup_mins
    FROM service_calculations sc;
END;
$$ LANGUAGE plpgsql;

-- Function to generate compliance alerts
CREATE OR REPLACE FUNCTION check_service_compliance_alerts()
RETURNS VOID AS $$
DECLARE
    service_record RECORD;
    compliance_data RECORD;
    current_week_start DATE;
    current_week_end DATE;
BEGIN
    -- Calculate current week boundaries
    current_week_start := date_trunc('week', CURRENT_DATE);
    current_week_end := current_week_start + INTERVAL '6 days';
    
    -- Check each active service for compliance issues
    FOR service_record IN 
        SELECT id, student_id, service_name_ar, service_name_en
        FROM iep_services 
        WHERE service_status = 'active'
    LOOP
        -- Get compliance data for current week
        SELECT * INTO compliance_data
        FROM calculate_service_compliance(
            service_record.id,
            current_week_start::DATE,
            current_week_end::DATE
        );
        
        -- Check for low compliance
        IF compliance_data.compliance_percentage < 70 THEN
            INSERT INTO service_compliance_alerts (
                service_id,
                student_id,
                alert_type,
                priority_level,
                alert_title_ar,
                alert_title_en,
                alert_message_ar,
                alert_message_en,
                threshold_value,
                current_value,
                resolution_due_date
            )
            VALUES (
                service_record.id,
                service_record.student_id,
                'service_hours_below_threshold',
                CASE 
                    WHEN compliance_data.compliance_percentage < 50 THEN 'high'
                    ELSE 'medium'
                END,
                'خدمات العلاج أقل من المطلوب',
                'Service Hours Below Required Threshold',
                'تم تسليم ' || compliance_data.delivered_minutes || ' دقيقة من أصل ' || compliance_data.planned_minutes || ' دقيقة مطلوبة',
                'Delivered ' || compliance_data.delivered_minutes || ' minutes out of ' || compliance_data.planned_minutes || ' required minutes',
                70.0,
                compliance_data.compliance_percentage,
                CURRENT_DATE + INTERVAL '3 days'
            )
            ON CONFLICT DO NOTHING; -- Avoid duplicate alerts
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE service_delivery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_hour_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_provider_schedules ENABLE ROW LEVEL SECURITY;

-- Service Delivery Sessions Policies
CREATE POLICY "Users can view service sessions for their assigned students/services"
ON service_delivery_sessions FOR SELECT
USING (
    auth.uid() IN (
        SELECT provider_id FROM iep_services WHERE id = service_delivery_sessions.service_id
        UNION
        SELECT assigned_therapist_id FROM students WHERE id = service_delivery_sessions.student_id
        UNION
        SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')
    )
);

CREATE POLICY "Providers can insert sessions for their services"
ON service_delivery_sessions FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT provider_id FROM iep_services WHERE id = service_id
        UNION
        SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')
    )
);

CREATE POLICY "Providers can update their service sessions"
ON service_delivery_sessions FOR UPDATE
USING (
    auth.uid() IN (
        SELECT provider_id FROM iep_services WHERE id = service_delivery_sessions.service_id
        UNION
        SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')
    )
);

-- Service Hour Summaries Policies
CREATE POLICY "Users can view service summaries for authorized services"
ON service_hour_summaries FOR ALL
USING (
    auth.uid() IN (
        SELECT provider_id FROM iep_services WHERE id = service_hour_summaries.service_id
        UNION
        SELECT assigned_therapist_id FROM students WHERE id = service_hour_summaries.student_id
        UNION
        SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')
    )
);

-- Service Compliance Alerts Policies
CREATE POLICY "Users can view alerts for their services/students"
ON service_compliance_alerts FOR ALL
USING (
    auth.uid() IN (
        SELECT provider_id FROM iep_services WHERE id = service_compliance_alerts.service_id
        UNION
        SELECT assigned_therapist_id FROM students WHERE id = service_compliance_alerts.student_id
        UNION
        SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')
        UNION
        SELECT assigned_to_user_id FROM service_compliance_alerts WHERE id = service_compliance_alerts.id
    )
);

-- Service Provider Schedules Policies
CREATE POLICY "Providers can manage their own schedules"
ON service_provider_schedules FOR ALL
USING (
    provider_id = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
);

-- =============================================================================
-- TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE service_delivery_sessions IS 'Actual service delivery sessions with hour tracking and documentation';
COMMENT ON TABLE service_hour_summaries IS 'Aggregated service hour tracking for compliance reporting and analysis';
COMMENT ON TABLE service_compliance_alerts IS 'Automated alerts for service delivery compliance issues and required actions';
COMMENT ON TABLE service_provider_schedules IS 'Provider availability and scheduling for optimal service delivery planning';

-- End of Service Hour Tracking Schema
-- This schema provides comprehensive service delivery tracking and compliance monitoring
-- with automated alert generation and hour validation for IDEA 2024 compliance
-- in the Arkan Al-Numo Center ERP system.