-- =====================================================
-- COMPREHENSIVE NOTIFICATION SYSTEM SCHEMA
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- NOTIFICATION TYPES ENUM
-- =====================================================
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'attendance_checkin',
        'attendance_checkout',
        'attendance_late',
        'attendance_absent',
        'session_reminder',
        'session_started',
        'session_completed',
        'session_cancelled',
        'session_rescheduled',
        'assessment_due',
        'assessment_completed',
        'assessment_overdue',
        'goal_achieved',
        'progress_update',
        'milestone_reached',
        'payment_due',
        'payment_received',
        'document_required',
        'system_update',
        'emergency_contact'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- NOTIFICATION PRIORITY ENUM
-- =====================================================
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- NOTIFICATION CHANNELS ENUM
-- =====================================================
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push', 'browser');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- RECIPIENT TYPES ENUM
-- =====================================================
DO $$ BEGIN
    CREATE TYPE recipient_type AS ENUM ('student', 'parent', 'therapist', 'admin', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- MAIN NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id TEXT NOT NULL,
    recipient_type recipient_type NOT NULL,
    notification_type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    -- Delivery
    channels notification_channel[] NOT NULL DEFAULT '{in_app}',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- Indexes for performance
    CONSTRAINT notifications_recipient_check CHECK (char_length(recipient_id) > 0),
    CONSTRAINT notifications_title_check CHECK (char_length(title) > 0),
    CONSTRAINT notifications_message_check CHECK (char_length(message) > 0)
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications (priority);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_urgent ON notifications (recipient_id, priority) WHERE priority IN ('urgent', 'high');
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications (scheduled_for) WHERE scheduled_for IS NOT NULL;

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    notification_type notification_type NOT NULL,
    channels notification_channel[] NOT NULL DEFAULT '{in_app}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'Asia/Riyadh',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE (user_id, notification_type)
);

-- Indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences (notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences (user_id, enabled) WHERE enabled = TRUE;

-- =====================================================
-- SESSION REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS session_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    therapist_id UUID NOT NULL,
    
    -- Session details
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    session_type TEXT NOT NULL,
    
    -- Reminder details
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('advance', 'day_before', 'hour_before', 'now')),
    reminder_minutes INTEGER NOT NULL DEFAULT 0,
    reminder_datetime TIMESTAMPTZ GENERATED ALWAYS AS (
        (session_date || ' ' || session_time)::timestamp - (reminder_minutes || ' minutes')::interval
    ) STORED,
    
    -- Status
    sent_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
);

-- Indexes for session reminders
CREATE INDEX IF NOT EXISTS idx_session_reminders_session ON session_reminders (session_id);
CREATE INDEX IF NOT EXISTS idx_session_reminders_student ON session_reminders (student_id);
CREATE INDEX IF NOT EXISTS idx_session_reminders_therapist ON session_reminders (therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_reminders_datetime ON session_reminders (reminder_datetime) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_reminders_unsent ON session_reminders (reminder_datetime, sent_at) WHERE sent_at IS NULL;

-- =====================================================
-- NOTIFICATION DELIVERY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    external_id TEXT, -- ID from external service (email service, SMS provider, etc.)
    error_message TEXT,
    metadata JSONB,
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for delivery log
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log (notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log (status);
CREATE INDEX IF NOT EXISTS idx_delivery_log_channel ON notification_delivery_log (channel);
CREATE INDEX IF NOT EXISTS idx_delivery_log_created_at ON notification_delivery_log (created_at DESC);

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type notification_type NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('ar', 'en')),
    
    -- Content templates
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    
    -- Configuration
    default_priority notification_priority NOT NULL DEFAULT 'medium',
    default_channels notification_channel[] NOT NULL DEFAULT '{in_app}',
    expires_after_hours INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- Unique constraint
    UNIQUE (notification_type, language)
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates (notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_language ON notification_templates (language);

-- =====================================================
-- NOTIFICATION STATISTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW notification_statistics AS
SELECT 
    recipient_id,
    recipient_type,
    notification_type,
    priority,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE priority IN ('urgent', 'high')) as high_priority_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d_count,
    MIN(created_at) as first_notification,
    MAX(created_at) as last_notification,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))/60) FILTER (WHERE read_at IS NOT NULL) as avg_read_time_minutes
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY recipient_id, recipient_type, notification_type, priority;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_delivery_log_updated_at ON notification_delivery_log;
CREATE TRIGGER update_notification_delivery_log_updated_at 
    BEFORE UPDATE ON notification_delivery_log 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old read notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = TRUE 
    AND read_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA - NOTIFICATION TEMPLATES
-- =====================================================

-- Insert default notification templates
INSERT INTO notification_templates (notification_type, language, title_template, message_template, default_priority, default_channels, expires_after_hours)
VALUES 
    -- Attendance templates
    ('attendance_checkin', 'ar', 'تسجيل وصول الطالب', 'وصل {{student_name}} بأمان إلى المركز في {{time}}{{#if room}} في الغرفة {{room}}{{/if}}.', 'medium', '{in_app,push}', 24),
    ('attendance_checkin', 'en', 'Student Check-in', '{{student_name}} has checked in safely at {{time}}{{#if room}} in room {{room}}{{/if}}.', 'medium', '{in_app,push}', 24),
    
    ('attendance_late', 'ar', 'تأخير في الوصول', 'وصل الطالب {{student_name}} متأخراً {{minutes}} دقيقة عن موعد جلسة {{session_type}}.', 'high', '{in_app,sms,push}', 6),
    ('attendance_late', 'en', 'Late Arrival', '{{student_name}} arrived {{minutes}} minutes late for their {{session_type}} session.', 'high', '{in_app,sms,push}', 6),
    
    -- Session templates
    ('session_reminder', 'ar', 'تذكير بموعد الجلسة', 'تذكير: لديك جلسة {{session_type}} مع {{therapist_name}} غداً في {{time}}.', 'medium', '{in_app,sms,email}', 24),
    ('session_reminder', 'en', 'Session Reminder', 'Reminder: You have a {{session_type}} session with {{therapist_name}} tomorrow at {{time}}.', 'medium', '{in_app,sms,email}', 24),
    
    -- Emergency templates  
    ('emergency_contact', 'ar', '🚨 اتصال طوارئ', 'يرجى الاتصال بالمركز فوراً بخصوص {{student_name}}. السبب: {{reason}}', 'urgent', '{in_app,sms,push,email}', 2),
    ('emergency_contact', 'en', '🚨 Emergency Contact', 'Please contact the center immediately regarding {{student_name}}. Reason: {{reason}}', 'urgent', '{in_app,sms,push,email}', 2)
ON CONFLICT (notification_type, language) 
DO UPDATE SET 
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    default_priority = EXCLUDED.default_priority,
    default_channels = EXCLUDED.default_channels,
    expires_after_hours = EXCLUDED.expires_after_hours,
    updated_at = NOW();

-- =====================================================
-- RLS POLICIES (ROW LEVEL SECURITY)
-- =====================================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications
    FOR SELECT USING (recipient_id = current_setting('app.current_user_id', TRUE));

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (recipient_id = current_setting('app.current_user_id', TRUE));

-- Enable RLS on notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (user_id::text = current_setting('app.current_user_id', TRUE));

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_priority ON notifications (recipient_id, is_read, priority, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type_priority_created ON notifications (notification_type, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type_created ON notifications (recipient_id, notification_type, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_urgent_unread ON notifications (recipient_id, created_at DESC) WHERE priority = 'urgent' AND is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_today_unread ON notifications (recipient_id, notification_type) WHERE created_at >= CURRENT_DATE AND is_read = FALSE;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE notifications IS 'Main notifications table storing all system notifications';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery and channels';
COMMENT ON TABLE session_reminders IS 'Automated session reminders and appointment notifications';
COMMENT ON TABLE notification_delivery_log IS 'Log of notification delivery attempts and status';
COMMENT ON TABLE notification_templates IS 'Templates for different types of notifications in multiple languages';

COMMENT ON COLUMN notifications.data IS 'JSON data for template variables and additional context';
COMMENT ON COLUMN notifications.channels IS 'Array of delivery channels for this notification';
COMMENT ON COLUMN notifications.scheduled_for IS 'When to send the notification (for scheduled notifications)';
COMMENT ON COLUMN notifications.expires_at IS 'When the notification expires and can be cleaned up';

COMMENT ON VIEW notification_statistics IS 'Aggregated statistics for notification analysis and monitoring';

-- =====================================================
-- GRANTS (SECURITY)
-- =====================================================

-- Grant necessary permissions to application role
GRANT SELECT, INSERT, UPDATE ON notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_delivery_log TO authenticated;
GRANT SELECT ON notification_templates TO anon, authenticated;
GRANT SELECT ON notification_statistics TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;