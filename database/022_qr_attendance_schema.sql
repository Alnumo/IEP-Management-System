-- =====================================================
-- QR ATTENDANCE SYSTEM SCHEMA
-- Version: 1.0
-- Date: 2025-01-25
-- Description: Complete QR-based attendance tracking system
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. STUDENT ATTENDANCE RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    
    -- Attendance details
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMPTZ NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(epoch FROM (check_out_time - check_in_time)) / 60
    ) STORED,
    
    -- Location and session info
    room_number VARCHAR(50),
    session_type VARCHAR(100) NOT NULL DEFAULT 'General',
    attendance_mode VARCHAR(20) NOT NULL DEFAULT 'qr_scan' 
        CHECK (attendance_mode IN ('qr_scan', 'manual', 'auto_check_in')),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'checked_in' 
        CHECK (status IN ('checked_in', 'in_session', 'checked_out', 'absent', 'cancelled')),
    
    -- QR specific data
    qr_scan_data JSONB NULL, -- Store original QR code data
    qr_scan_device VARCHAR(100), -- Device used for scanning
    qr_scan_location POINT, -- GPS coordinates if available
    
    -- Staff information
    checked_in_by UUID REFERENCES auth.users(id),
    checked_out_by UUID REFERENCES auth.users(id),
    therapist_id UUID REFERENCES therapists(id),
    
    -- Additional metadata
    notes TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INTEGER DEFAULT 0,
    early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. THERAPIST ATTENDANCE RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS therapist_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Attendance timing
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMPTZ NULL,
    work_duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(epoch FROM (check_out_time - check_in_time)) / 60
    ) STORED,
    
    -- Status and mode
    status VARCHAR(20) NOT NULL DEFAULT 'checked_in' 
        CHECK (status IN ('checked_in', 'in_session', 'on_break', 'checked_out')),
    attendance_mode VARCHAR(20) NOT NULL DEFAULT 'qr_scan',
    
    -- Associated sessions
    active_sessions UUID[] DEFAULT '{}', -- Array of session IDs
    completed_sessions UUID[] DEFAULT '{}',
    
    -- QR specific data
    qr_scan_data JSONB NULL,
    qr_scan_device VARCHAR(100),
    
    -- Location tracking
    building_location VARCHAR(100),
    department VARCHAR(100),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ROOM UTILIZATION TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS room_utilization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number VARCHAR(50) NOT NULL,
    room_name VARCHAR(100),
    
    -- Utilization timing
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(epoch FROM (end_time - start_time)) / 60
    ) STORED,
    
    -- Session and occupancy info
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
    
    -- Usage details
    purpose VARCHAR(200) NOT NULL,
    capacity_used INTEGER DEFAULT 1,
    max_capacity INTEGER DEFAULT 1,
    
    -- Equipment and resources
    equipment_used TEXT[], -- Array of equipment names
    special_requirements TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'occupied' 
        CHECK (status IN ('occupied', 'available', 'maintenance', 'reserved', 'cleaning')),
    
    -- QR tracking
    qr_scan_entry_data JSONB NULL,
    qr_scan_exit_data JSONB NULL,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. QR CODE GENERATION LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_code_generation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- QR Code details
    qr_type VARCHAR(20) NOT NULL 
        CHECK (qr_type IN ('student', 'session', 'therapist', 'room', 'generic')),
    qr_data JSONB NOT NULL,
    qr_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of QR data for uniqueness
    
    -- Associated entities
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    
    -- Generation details
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration
    
    -- Usage tracking
    scan_count INTEGER DEFAULT 0,
    last_scanned_at TIMESTAMPTZ NULL,
    last_scanned_by UUID REFERENCES auth.users(id),
    
    -- QR Code properties
    is_active BOOLEAN DEFAULT TRUE,
    is_single_use BOOLEAN DEFAULT FALSE,
    max_scans INTEGER NULL, -- NULL = unlimited
    
    -- Additional metadata
    description TEXT,
    tags TEXT[], -- For categorization and search
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ATTENDANCE NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Notification target
    recipient_type VARCHAR(20) NOT NULL 
        CHECK (recipient_type IN ('parent', 'therapist', 'admin', 'student')),
    recipient_id UUID NOT NULL, -- User ID or parent contact ID
    
    -- Notification content
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Related records
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES student_attendance(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Delivery channels
    send_email BOOLEAN DEFAULT TRUE,
    send_sms BOOLEAN DEFAULT FALSE,
    send_whatsapp BOOLEAN DEFAULT TRUE,
    send_push BOOLEAN DEFAULT TRUE,
    
    -- Delivery status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ NULL,
    delivery_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    
    -- Delivery attempts and errors
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    
    -- Reading and interaction
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    action_taken VARCHAR(50) NULL, -- What action user took after reading
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. ATTENDANCE ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    date_period DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL DEFAULT 'daily' 
        CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Overall statistics
    total_students_scheduled INTEGER DEFAULT 0,
    total_students_present INTEGER DEFAULT 0,
    total_students_absent INTEGER DEFAULT 0,
    total_sessions_scheduled INTEGER DEFAULT 0,
    total_sessions_completed INTEGER DEFAULT 0,
    total_sessions_cancelled INTEGER DEFAULT 0,
    
    -- Attendance rates
    attendance_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    punctuality_rate DECIMAL(5,2) DEFAULT 0.00, -- On-time arrival rate
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- Session completion rate
    
    -- Therapist statistics
    total_therapists_scheduled INTEGER DEFAULT 0,
    total_therapists_present INTEGER DEFAULT 0,
    avg_therapist_utilization DECIMAL(5,2) DEFAULT 0.00,
    
    -- Room utilization
    total_rooms_available INTEGER DEFAULT 0,
    total_rooms_utilized INTEGER DEFAULT 0,
    avg_room_utilization DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timing analytics
    avg_session_duration_minutes INTEGER DEFAULT 0,
    avg_late_arrival_minutes INTEGER DEFAULT 0,
    avg_early_departure_minutes INTEGER DEFAULT 0,
    
    -- QR specific metrics
    qr_scan_success_rate DECIMAL(5,2) DEFAULT 0.00,
    manual_checkin_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Additional metadata
    notes TEXT,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure uniqueness per period
    UNIQUE(date_period, period_type)
);

-- =====================================================
-- 7. ATTENDANCE SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string' 
        CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
    
    -- Setting metadata
    display_name VARCHAR(200),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System settings cannot be deleted
    
    -- Access control
    required_role VARCHAR(20) DEFAULT 'admin',
    can_be_modified BOOLEAN DEFAULT TRUE,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique keys per category
    UNIQUE(setting_category, setting_key)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Student attendance indexes
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_session_id ON student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_check_in_time ON student_attendance(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_student_attendance_status ON student_attendance(status);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(DATE(check_in_time));
CREATE INDEX IF NOT EXISTS idx_student_attendance_therapist ON student_attendance(therapist_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_room ON student_attendance(room_number);

-- Therapist attendance indexes
CREATE INDEX IF NOT EXISTS idx_therapist_attendance_therapist_id ON therapist_attendance(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_attendance_check_in_time ON therapist_attendance(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_therapist_attendance_status ON therapist_attendance(status);
CREATE INDEX IF NOT EXISTS idx_therapist_attendance_date ON therapist_attendance(DATE(check_in_time));

-- Room utilization indexes
CREATE INDEX IF NOT EXISTS idx_room_utilization_room_number ON room_utilization(room_number);
CREATE INDEX IF NOT EXISTS idx_room_utilization_start_time ON room_utilization(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_room_utilization_status ON room_utilization(status);
CREATE INDEX IF NOT EXISTS idx_room_utilization_session_id ON room_utilization(session_id);

-- QR code generation indexes
CREATE INDEX IF NOT EXISTS idx_qr_generation_qr_type ON qr_code_generation_log(qr_type);
CREATE INDEX IF NOT EXISTS idx_qr_generation_generated_at ON qr_code_generation_log(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_generation_qr_hash ON qr_code_generation_log(qr_hash);
CREATE INDEX IF NOT EXISTS idx_qr_generation_student_id ON qr_code_generation_log(student_id);
CREATE INDEX IF NOT EXISTS idx_qr_generation_active ON qr_code_generation_log(is_active);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_recipient ON attendance_notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_student ON attendance_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_status ON attendance_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_created ON attendance_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_unread ON attendance_notifications(is_read) WHERE is_read = FALSE;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_attendance_analytics_date_period ON attendance_analytics(date_period DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_analytics_period_type ON attendance_analytics(period_type);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_attendance_settings_category ON attendance_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_attendance_settings_key ON attendance_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_attendance_settings_active ON attendance_settings(is_active);

-- =====================================================
-- TRIGGERS FOR AUTOMATED UPDATES
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER student_attendance_updated_at 
    BEFORE UPDATE ON student_attendance 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER therapist_attendance_updated_at 
    BEFORE UPDATE ON therapist_attendance 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER room_utilization_updated_at 
    BEFORE UPDATE ON room_utilization 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER qr_code_generation_log_updated_at 
    BEFORE UPDATE ON qr_code_generation_log 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER attendance_notifications_updated_at 
    BEFORE UPDATE ON attendance_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER attendance_analytics_updated_at 
    BEFORE UPDATE ON attendance_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER attendance_settings_updated_at 
    BEFORE UPDATE ON attendance_settings 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

-- =====================================================
-- AUTO-CALCULATION TRIGGERS
-- =====================================================

-- Auto-calculate late arrival
CREATE OR REPLACE FUNCTION calculate_late_arrival()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate if student is late based on scheduled session time
    IF NEW.session_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN s.scheduled_start_time < NEW.check_in_time 
                THEN TRUE 
                ELSE FALSE 
            END,
            CASE 
                WHEN s.scheduled_start_time < NEW.check_in_time 
                THEN EXTRACT(epoch FROM (NEW.check_in_time - s.scheduled_start_time)) / 60
                ELSE 0
            END
        INTO NEW.is_late, NEW.late_minutes
        FROM sessions s 
        WHERE s.id = NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER student_attendance_calculate_late 
    BEFORE INSERT OR UPDATE ON student_attendance 
    FOR EACH ROW EXECUTE FUNCTION calculate_late_arrival();

-- =====================================================
-- AUTOMATED NOTIFICATION TRIGGERS
-- =====================================================

-- Create notification when student checks in
CREATE OR REPLACE FUNCTION create_checkin_notification()
RETURNS TRIGGER AS $$
DECLARE
    parent_contacts RECORD;
BEGIN
    -- Only for new check-ins
    IF TG_OP = 'INSERT' AND NEW.status = 'checked_in' THEN
        -- Find parent contacts for this student
        FOR parent_contacts IN 
            SELECT DISTINCT pc.id, pc.contact_type, pc.contact_value, pc.is_primary
            FROM parent_contacts pc
            JOIN students s ON s.id = pc.student_id
            WHERE s.id = NEW.student_id AND pc.is_active = TRUE
        LOOP
            -- Create notification for each parent contact
            INSERT INTO attendance_notifications (
                recipient_type,
                recipient_id,
                notification_type,
                title,
                message,
                student_id,
                attendance_record_id,
                session_id,
                send_whatsapp,
                send_sms,
                priority
            ) VALUES (
                'parent',
                parent_contacts.id,
                'student_check_in',
                'Student Check-in Notification',
                format('Your child has arrived safely at %s for their %s session.', 
                       COALESCE(NEW.room_number, 'the center'), 
                       NEW.session_type),
                NEW.student_id,
                NEW.id,
                NEW.session_id,
                TRUE,
                parent_contacts.is_primary, -- Send SMS only to primary contact
                'medium'
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER student_checkin_notification 
    AFTER INSERT ON student_attendance 
    FOR EACH ROW EXECUTE FUNCTION create_checkin_notification();

-- =====================================================
-- ATTENDANCE ANALYTICS FUNCTIONS
-- =====================================================

-- Function to calculate daily attendance analytics
CREATE OR REPLACE FUNCTION calculate_daily_attendance_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    stats RECORD;
BEGIN
    -- Calculate comprehensive attendance statistics for the target date
    SELECT 
        -- Student statistics
        COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN s.id END) as total_students_scheduled,
        COUNT(DISTINCT sa.student_id) as total_students_present,
        COUNT(DISTINCT CASE WHEN e.id IS NOT NULL AND sa.student_id IS NULL THEN s.id END) as total_students_absent,
        
        -- Session statistics
        COUNT(DISTINCT sess.id) as total_sessions_scheduled,
        COUNT(DISTINCT CASE WHEN sa.status IN ('checked_out', 'in_session') THEN sess.id END) as total_sessions_completed,
        COUNT(DISTINCT CASE WHEN sess.status = 'cancelled' THEN sess.id END) as total_sessions_cancelled,
        
        -- Rates
        ROUND(
            (COUNT(DISTINCT sa.student_id)::DECIMAL / 
             NULLIF(COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN s.id END), 0)) * 100, 
            2
        ) as attendance_rate,
        
        ROUND(
            (COUNT(DISTINCT CASE WHEN sa.is_late = FALSE THEN sa.student_id END)::DECIMAL / 
             NULLIF(COUNT(DISTINCT sa.student_id), 0)) * 100, 
            2
        ) as punctuality_rate,
        
        ROUND(
            (COUNT(DISTINCT CASE WHEN sa.status = 'checked_out' THEN sa.student_id END)::DECIMAL / 
             NULLIF(COUNT(DISTINCT sa.student_id), 0)) * 100, 
            2
        ) as completion_rate,
        
        -- Therapist statistics
        COUNT(DISTINCT ta.therapist_id) as total_therapists_present,
        
        -- Room utilization
        COUNT(DISTINCT ru.room_number) as total_rooms_utilized,
        
        -- Timing averages
        AVG(sa.duration_minutes) as avg_session_duration_minutes,
        AVG(CASE WHEN sa.is_late THEN sa.late_minutes END) as avg_late_arrival_minutes,
        AVG(CASE WHEN sa.early_departure THEN sa.early_departure_minutes END) as avg_early_departure_minutes,
        
        -- QR metrics
        ROUND(
            (COUNT(CASE WHEN sa.attendance_mode = 'qr_scan' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(sa.id), 0)) * 100, 
            2
        ) as qr_scan_success_rate,
        
        ROUND(
            (COUNT(CASE WHEN sa.attendance_mode = 'manual' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(sa.id), 0)) * 100, 
            2
        ) as manual_checkin_percentage
        
    INTO stats
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.student_id
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN sessions sess ON c.id = sess.course_id AND DATE(sess.scheduled_start_time) = target_date
    LEFT JOIN student_attendance sa ON s.id = sa.student_id AND DATE(sa.check_in_time) = target_date
    LEFT JOIN therapist_attendance ta ON DATE(ta.check_in_time) = target_date
    LEFT JOIN room_utilization ru ON DATE(ru.start_time) = target_date;
    
    -- Insert or update analytics record
    INSERT INTO attendance_analytics (
        date_period,
        period_type,
        total_students_scheduled,
        total_students_present,
        total_students_absent,
        total_sessions_scheduled,
        total_sessions_completed,
        total_sessions_cancelled,
        attendance_rate,
        punctuality_rate,
        completion_rate,
        total_therapists_present,
        total_rooms_utilized,
        avg_session_duration_minutes,
        avg_late_arrival_minutes,
        avg_early_departure_minutes,
        qr_scan_success_rate,
        manual_checkin_percentage
    ) VALUES (
        target_date,
        'daily',
        COALESCE(stats.total_students_scheduled, 0),
        COALESCE(stats.total_students_present, 0),
        COALESCE(stats.total_students_absent, 0),
        COALESCE(stats.total_sessions_scheduled, 0),
        COALESCE(stats.total_sessions_completed, 0),
        COALESCE(stats.total_sessions_cancelled, 0),
        COALESCE(stats.attendance_rate, 0),
        COALESCE(stats.punctuality_rate, 0),
        COALESCE(stats.completion_rate, 0),
        COALESCE(stats.total_therapists_present, 0),
        COALESCE(stats.total_rooms_utilized, 0),
        COALESCE(stats.avg_session_duration_minutes, 0),
        COALESCE(stats.avg_late_arrival_minutes, 0),
        COALESCE(stats.avg_early_departure_minutes, 0),
        COALESCE(stats.qr_scan_success_rate, 0),
        COALESCE(stats.manual_checkin_percentage, 0)
    )
    ON CONFLICT (date_period, period_type) 
    DO UPDATE SET
        total_students_scheduled = EXCLUDED.total_students_scheduled,
        total_students_present = EXCLUDED.total_students_present,
        total_students_absent = EXCLUDED.total_students_absent,
        total_sessions_scheduled = EXCLUDED.total_sessions_scheduled,
        total_sessions_completed = EXCLUDED.total_sessions_completed,
        total_sessions_cancelled = EXCLUDED.total_sessions_cancelled,
        attendance_rate = EXCLUDED.attendance_rate,
        punctuality_rate = EXCLUDED.punctuality_rate,
        completion_rate = EXCLUDED.completion_rate,
        total_therapists_present = EXCLUDED.total_therapists_present,
        total_rooms_utilized = EXCLUDED.total_rooms_utilized,
        avg_session_duration_minutes = EXCLUDED.avg_session_duration_minutes,
        avg_late_arrival_minutes = EXCLUDED.avg_late_arrival_minutes,
        avg_early_departure_minutes = EXCLUDED.avg_early_departure_minutes,
        qr_scan_success_rate = EXCLUDED.qr_scan_success_rate,
        manual_checkin_percentage = EXCLUDED.manual_checkin_percentage,
        calculated_at = NOW(),
        updated_at = NOW();
END;
$$ language 'plpgsql';

-- =====================================================
-- SEED DATA FOR ATTENDANCE SETTINGS
-- =====================================================

INSERT INTO attendance_settings (setting_category, setting_key, setting_value, setting_type, display_name, description, is_system) VALUES
-- QR Code Settings
('qr_settings', 'qr_code_expiry_hours', '"24"', 'number', 'QR Code Expiry (Hours)', 'How long QR codes remain valid after generation', TRUE),
('qr_settings', 'allow_multi_scan', 'true', 'boolean', 'Allow Multiple Scans', 'Whether the same QR code can be scanned multiple times', TRUE),
('qr_settings', 'require_location', 'false', 'boolean', 'Require GPS Location', 'Whether to require GPS coordinates for QR scans', FALSE),

-- Attendance Rules
('attendance_rules', 'late_threshold_minutes', '"15"', 'number', 'Late Threshold (Minutes)', 'Minutes after scheduled time to mark as late', TRUE),
('attendance_rules', 'auto_checkout_hours', '"12"', 'number', 'Auto Check-out (Hours)', 'Automatically check out students after this many hours', TRUE),
('attendance_rules', 'allow_early_checkin_minutes', '"30"', 'number', 'Early Check-in (Minutes)', 'How early students can check in before scheduled time', TRUE),

-- Notification Settings
('notifications', 'send_checkin_notifications', 'true', 'boolean', 'Check-in Notifications', 'Send notifications when students check in', TRUE),
('notifications', 'send_checkout_notifications', 'true', 'boolean', 'Check-out Notifications', 'Send notifications when students check out', TRUE),
('notifications', 'send_late_notifications', 'true', 'boolean', 'Late Arrival Notifications', 'Send notifications for late arrivals', TRUE),
('notifications', 'notification_delay_minutes', '"5"', 'number', 'Notification Delay (Minutes)', 'Delay before sending notifications', FALSE),

-- WhatsApp Integration
('whatsapp', 'enable_whatsapp', 'true', 'boolean', 'Enable WhatsApp', 'Send notifications via WhatsApp Business API', FALSE),
('whatsapp', 'whatsapp_template_checkin', '"student_checkin"', 'string', 'Check-in Template', 'WhatsApp template for check-in messages', FALSE),
('whatsapp', 'whatsapp_template_checkout', '"student_checkout"', 'string', 'Check-out Template', 'WhatsApp template for check-out messages', FALSE),

-- Analytics Settings
('analytics', 'calculate_daily_stats', 'true', 'boolean', 'Daily Analytics', 'Calculate daily attendance statistics', TRUE),
('analytics', 'retention_days', '"365"', 'number', 'Data Retention (Days)', 'How long to keep detailed attendance records', TRUE),
('analytics', 'generate_reports', 'true', 'boolean', 'Generate Reports', 'Automatically generate attendance reports', FALSE);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'QR Attendance System Schema (v1.0) has been successfully created!';
    RAISE NOTICE 'Tables created: 7 core tables + indexes + triggers + functions';
    RAISE NOTICE 'Features: QR scanning, real-time notifications, analytics, settings management';
    RAISE NOTICE 'Next steps: Configure RLS policies and test API endpoints';
END $$;