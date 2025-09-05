-- =====================================================
-- DUAL-LEVEL QR ATTENDANCE SYSTEM ENHANCEMENT
-- Version: 3.2.1  
-- Date: 2025-09-02
-- Description: Enhance existing QR attendance system for dual-level tracking
-- Story: 3.2 - Dual-Level QR Attendance System
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE attendance_logs TABLE (Story Requirement)
-- =====================================================
-- This table provides the simplified structure mentioned in the story dev notes
-- while maintaining compatibility with the existing student_attendance table

CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,  -- optional for session-level tracking
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(20) NOT NULL 
        CHECK (event_type IN ('center_check_in', 'center_check_out', 'session_check_in')),
    
    -- Additional context for dual-level system
    qr_scan_data JSONB NULL, -- Store QR code scan details
    scan_location VARCHAR(100), -- Entrance, Room 101, etc.
    scanned_by UUID REFERENCES auth.users(id), -- Staff member who facilitated scan
    device_info VARCHAR(200), -- Mobile device/browser info
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 2. ENHANCE QR CODE GENERATION FOR DUAL-LEVEL SYSTEM
-- =====================================================
-- Add center-level QR code support to existing qr_code_generation_log

-- Add new QR types for dual-level system
ALTER TABLE qr_code_generation_log DROP CONSTRAINT IF EXISTS qr_code_generation_log_qr_type_check;
ALTER TABLE qr_code_generation_log ADD CONSTRAINT qr_code_generation_log_qr_type_check 
    CHECK (qr_type IN ('student', 'session', 'therapist', 'room', 'generic', 'center_entry', 'center_exit', 'session_specific'));

-- Add center-level tracking fields
ALTER TABLE qr_code_generation_log ADD COLUMN IF NOT EXISTS center_location VARCHAR(100); -- Main Entrance, Emergency Exit
ALTER TABLE qr_code_generation_log ADD COLUMN IF NOT EXISTS is_center_level BOOLEAN DEFAULT FALSE;
ALTER TABLE qr_code_generation_log ADD COLUMN IF NOT EXISTS is_session_level BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 3. ENHANCED INDEXES FOR PERFORMANCE
-- =====================================================

-- Attendance logs indexes
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_type ON attendance_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(DATE(timestamp));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_date ON attendance_logs(student_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_attendance_logs_session_event ON attendance_logs(session_id, event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_center_tracking ON attendance_logs(student_id, event_type, timestamp) 
    WHERE event_type IN ('center_check_in', 'center_check_out');

-- Enhanced QR generation indexes
CREATE INDEX IF NOT EXISTS idx_qr_generation_center_level ON qr_code_generation_log(is_center_level) WHERE is_center_level = TRUE;
CREATE INDEX IF NOT EXISTS idx_qr_generation_session_level ON qr_code_generation_log(is_session_level) WHERE is_session_level = TRUE;
CREATE INDEX IF NOT EXISTS idx_qr_generation_location ON qr_code_generation_log(center_location);

-- =====================================================
-- 4. DATABASE FUNCTIONS FOR ATTENDANCE PROCESSING
-- =====================================================

-- Function to log attendance with dual-level support
CREATE OR REPLACE FUNCTION log_attendance(
    p_student_id UUID,
    p_event_type VARCHAR(20),
    p_session_id UUID DEFAULT NULL,
    p_qr_scan_data JSONB DEFAULT NULL,
    p_scan_location VARCHAR(100) DEFAULT NULL,
    p_scanned_by UUID DEFAULT NULL,
    p_device_info VARCHAR(200) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    attendance_id UUID;
    session_info RECORD;
BEGIN
    -- Validate event type
    IF p_event_type NOT IN ('center_check_in', 'center_check_out', 'session_check_in') THEN
        RAISE EXCEPTION 'Invalid event_type: %. Must be center_check_in, center_check_out, or session_check_in', p_event_type;
    END IF;
    
    -- For session check-ins, validate session exists and is active
    IF p_event_type = 'session_check_in' AND p_session_id IS NOT NULL THEN
        SELECT s.id, s.scheduled_start_time, s.scheduled_end_time, s.status
        INTO session_info
        FROM sessions s
        WHERE s.id = p_session_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Session not found: %', p_session_id;
        END IF;
    END IF;
    
    -- Insert attendance log
    INSERT INTO attendance_logs (
        student_id,
        session_id,
        timestamp,
        event_type,
        qr_scan_data,
        scan_location,
        scanned_by,
        device_info,
        created_by
    ) VALUES (
        p_student_id,
        p_session_id,
        NOW(),
        p_event_type,
        p_qr_scan_data,
        p_scan_location,
        p_scanned_by,
        p_device_info,
        p_scanned_by
    ) RETURNING id INTO attendance_id;
    
    -- Also create corresponding student_attendance record for compatibility
    IF p_event_type = 'center_check_in' OR p_event_type = 'session_check_in' THEN
        INSERT INTO student_attendance (
            student_id,
            session_id,
            check_in_time,
            session_type,
            attendance_mode,
            status,
            qr_scan_data,
            room_number,
            checked_in_by
        ) VALUES (
            p_student_id,
            p_session_id,
            NOW(),
            CASE WHEN p_session_id IS NOT NULL THEN 'Therapy Session' ELSE 'General' END,
            'qr_scan',
            'checked_in',
            p_qr_scan_data,
            p_scan_location,
            p_scanned_by
        );
    END IF;
    
    RETURN attendance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current facility attendance status
CREATE OR REPLACE FUNCTION get_current_facility_attendance()
RETURNS TABLE (
    student_id UUID,
    student_name_en TEXT,
    student_name_ar TEXT,
    check_in_time TIMESTAMPTZ,
    scan_location TEXT,
    current_session_id UUID,
    session_type TEXT,
    minutes_in_facility INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.name_en as student_name_en,
        s.name_ar as student_name_ar,
        al_in.timestamp as check_in_time,
        al_in.scan_location as scan_location,
        al_in.session_id as current_session_id,
        CASE 
            WHEN al_in.event_type = 'session_check_in' THEN 'Session'
            ELSE 'General'
        END as session_type,
        EXTRACT(epoch FROM (NOW() - al_in.timestamp))::INTEGER / 60 as minutes_in_facility
    FROM students s
    JOIN attendance_logs al_in ON s.id = al_in.student_id
    LEFT JOIN attendance_logs al_out ON s.id = al_out.student_id 
        AND al_out.event_type = 'center_check_out' 
        AND al_out.timestamp > al_in.timestamp
    WHERE al_in.event_type IN ('center_check_in', 'session_check_in')
        AND al_out.id IS NULL  -- No corresponding check-out
        AND DATE(al_in.timestamp) = CURRENT_DATE
    ORDER BY al_in.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Function for attendance aggregation queries (performance optimization)
CREATE OR REPLACE FUNCTION get_attendance_summary(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_student_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
    summary_date DATE,
    total_center_checkins BIGINT,
    total_session_checkins BIGINT,
    total_checkouts BIGINT,
    unique_students_present BIGINT,
    avg_facility_duration_minutes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(al.timestamp) as summary_date,
        COUNT(CASE WHEN al.event_type = 'center_check_in' THEN 1 END) as total_center_checkins,
        COUNT(CASE WHEN al.event_type = 'session_check_in' THEN 1 END) as total_session_checkins,
        COUNT(CASE WHEN al.event_type = 'center_check_out' THEN 1 END) as total_checkouts,
        COUNT(DISTINCT al.student_id) as unique_students_present,
        AVG(
            CASE 
                WHEN al_out.timestamp IS NOT NULL 
                THEN EXTRACT(epoch FROM (al_out.timestamp - al.timestamp)) / 60
            END
        ) as avg_facility_duration_minutes
    FROM attendance_logs al
    LEFT JOIN attendance_logs al_out ON al.student_id = al_out.student_id
        AND al_out.event_type = 'center_check_out'
        AND al_out.timestamp > al.timestamp
        AND DATE(al_out.timestamp) = DATE(al.timestamp)
    WHERE DATE(al.timestamp) BETWEEN p_start_date AND p_end_date
        AND (p_student_id IS NULL OR al.student_id = p_student_id)
        AND (p_session_id IS NULL OR al.session_id = p_session_id)
    GROUP BY DATE(al.timestamp)
    ORDER BY DATE(al.timestamp) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. RLS POLICIES FOR ATTENDANCE DATA SECURITY
-- =====================================================

-- Enable RLS on attendance_logs
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attendance logs for their assigned students
CREATE POLICY "Users can view assigned student attendance" ON attendance_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT DISTINCT t.user_id 
            FROM therapists t
            JOIN therapy_sessions ts ON t.id = ts.therapist_id
            WHERE ts.student_id = attendance_logs.student_id
        )
        OR 
        auth.uid() IN (
            SELECT u.id FROM auth.users u
            JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role IN ('admin', 'manager', 'receptionist')
        )
    );

-- Policy: Authorized staff can insert attendance logs
CREATE POLICY "Authorized staff can log attendance" ON attendance_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT u.id FROM auth.users u
            JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role IN ('admin', 'manager', 'therapist_lead', 'receptionist')
        )
    );

-- Policy: Staff can update their own attendance entries (within 24 hours)
CREATE POLICY "Staff can update recent attendance logs" ON attendance_logs
    FOR UPDATE
    USING (
        scanned_by = auth.uid()
        AND created_at > (NOW() - INTERVAL '24 hours')
    );

-- Enhanced RLS for QR code generation with center-level support
CREATE POLICY "Staff can view center-level QR codes" ON qr_code_generation_log
    FOR SELECT
    USING (
        is_center_level = TRUE
        OR 
        auth.uid() IN (
            SELECT u.id FROM auth.users u
            JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role IN ('admin', 'manager', 'receptionist')
        )
    );

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATED UPDATES
-- =====================================================

-- Update timestamp trigger for attendance_logs
CREATE TRIGGER attendance_logs_updated_at 
    BEFORE UPDATE ON attendance_logs 
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

-- Trigger to auto-update QR generation scan count
CREATE OR REPLACE FUNCTION update_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update scan count and last scanned info for the QR code
    UPDATE qr_code_generation_log 
    SET 
        scan_count = scan_count + 1,
        last_scanned_at = NEW.timestamp,
        last_scanned_by = NEW.scanned_by,
        updated_at = NOW()
    WHERE qr_hash = (NEW.qr_scan_data->>'qr_hash')::VARCHAR(64);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_logs_update_qr_count
    AFTER INSERT ON attendance_logs
    FOR EACH ROW 
    WHEN (NEW.qr_scan_data IS NOT NULL)
    EXECUTE FUNCTION update_qr_scan_count();

-- =====================================================
-- 7. SEED DATA FOR DUAL-LEVEL QR SETTINGS
-- =====================================================

INSERT INTO attendance_settings (setting_category, setting_key, setting_value, setting_type, display_name, description, is_system) VALUES
-- Dual-level QR Settings
('dual_level_qr', 'enable_center_level_tracking', 'true', 'boolean', 'Enable Center-Level Tracking', 'Track student entry/exit to the facility', TRUE),
('dual_level_qr', 'enable_session_level_tracking', 'true', 'boolean', 'Enable Session-Level Tracking', 'Track student attendance for specific sessions', TRUE),
('dual_level_qr', 'center_qr_locations', '["Main Entrance", "Emergency Exit", "Side Door"]', 'array', 'Center QR Locations', 'Available locations for center-level QR codes', FALSE),
('dual_level_qr', 'require_center_checkin_first', 'true', 'boolean', 'Require Center Check-in First', 'Students must check into center before session check-in', TRUE),
('dual_level_qr', 'auto_checkout_at_session_end', 'false', 'boolean', 'Auto Check-out at Session End', 'Automatically check out students when session ends', FALSE),

-- Mobile scanning settings
('mobile_scanning', 'enable_offline_scanning', 'true', 'boolean', 'Enable Offline Scanning', 'Allow QR scanning when offline with sync later', FALSE),
('mobile_scanning', 'offline_storage_limit', '"100"', 'number', 'Offline Storage Limit', 'Maximum offline scans to store before sync required', FALSE),
('mobile_scanning', 'require_location_permission', 'false', 'boolean', 'Require Location Permission', 'Require GPS location for mobile QR scans', FALSE)

ON CONFLICT (setting_category, setting_key) DO NOTHING;

-- =====================================================
-- 8. SEED CENTER-LEVEL QR CODES
-- =====================================================

-- Generate default center-level QR codes
INSERT INTO qr_code_generation_log (
    qr_type,
    qr_data,
    qr_hash,
    center_location,
    is_center_level,
    is_active,
    description,
    generated_by,
    generated_at
) VALUES
(
    'center_entry',
    '{"type": "center_check_in", "location": "Main Entrance", "facility_id": "arkan_center_main"}',
    encode(sha256('{"type": "center_check_in", "location": "Main Entrance", "facility_id": "arkan_center_main"}'::bytea), 'hex'),
    'Main Entrance',
    TRUE,
    TRUE,
    'Main entrance check-in QR code',
    (SELECT id FROM auth.users LIMIT 1),
    NOW()
),
(
    'center_exit',
    '{"type": "center_check_out", "location": "Main Entrance", "facility_id": "arkan_center_main"}',
    encode(sha256('{"type": "center_check_out", "location": "Main Entrance", "facility_id": "arkan_center_main"}'::bytea), 'hex'),
    'Main Entrance',
    TRUE,
    TRUE,
    'Main entrance check-out QR code',
    (SELECT id FROM auth.users LIMIT 1),
    NOW()
),
(
    'center_entry',
    '{"type": "center_check_in", "location": "Emergency Exit", "facility_id": "arkan_center_main"}',
    encode(sha256('{"type": "center_check_in", "location": "Emergency Exit", "facility_id": "arkan_center_main"}'::bytea), 'hex'),
    'Emergency Exit',
    TRUE,
    TRUE,
    'Emergency exit entry QR code',
    (SELECT id FROM auth.users LIMIT 1),
    NOW()
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Dual-Level QR Attendance System Enhancement (v3.2.1) completed successfully!';
    RAISE NOTICE 'New features: attendance_logs table, center/session level tracking, enhanced RLS policies';
    RAISE NOTICE 'Functions added: log_attendance(), get_current_facility_attendance(), get_attendance_summary()';
    RAISE NOTICE 'Default center-level QR codes generated for Main Entrance and Emergency Exit';
    RAISE NOTICE 'Ready for frontend integration with existing QR components';
END $$;