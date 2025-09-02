-- =====================================================
-- Notification System Database Schema
-- Complete database schema for comprehensive notification and alert management
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Core Notifications Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Notification classification
    type TEXT NOT NULL CHECK (type IN (
        'deadline_reminder',
        'approval_request', 
        'approval_completed',
        'meeting_reminder',
        'overdue_task',
        'system_alert',
        'compliance_warning',
        'goal_milestone',
        'service_hours_low',
        'document_expiry'
    )),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    
    -- Bilingual content
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    message_ar TEXT NOT NULL,
    message_en TEXT NOT NULL,
    
    -- Recipient information
    recipient_id UUID NOT NULL,
    recipient_role TEXT NOT NULL,
    
    -- Related entity context
    related_entity_type TEXT NOT NULL CHECK (related_entity_type IN (
        'iep', 'meeting', 'goal', 'approval', 'service', 'student', 'therapist', 'system'
    )),
    related_entity_id UUID NOT NULL,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Text search indexes for bilingual content
CREATE INDEX IF NOT EXISTS idx_notifications_title_ar ON notifications USING gin(to_tsvector('arabic', title_ar));
CREATE INDEX IF NOT EXISTS idx_notifications_title_en ON notifications USING gin(to_tsvector('english', title_en));
CREATE INDEX IF NOT EXISTS idx_notifications_message_search ON notifications USING gin(
    (setweight(to_tsvector('arabic', title_ar), 'A') ||
     setweight(to_tsvector('english', title_en), 'A') ||
     setweight(to_tsvector('arabic', message_ar), 'B') ||
     setweight(to_tsvector('english', message_en), 'B'))
);

-- =====================================================
-- Notification Delivery Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Delivery channel
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app', 'push')),
    
    -- Delivery status
    status TEXT NOT NULL CHECK (status IN (
        'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled'
    )) DEFAULT 'scheduled',
    
    -- Timestamps
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- External service references
    external_reference TEXT,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered_at ON notification_deliveries(delivered_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_failed_at ON notification_deliveries(failed_at);

-- =====================================================
-- User Notification Preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Preference settings
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'deadline_reminder',
        'approval_request',
        'approval_completed', 
        'meeting_reminder',
        'overdue_task',
        'system_alert',
        'compliance_warning',
        'goal_milestone',
        'service_hours_low',
        'document_expiry'
    )),
    
    -- Channel preferences
    channels TEXT[] DEFAULT ARRAY['in_app'],
    enabled BOOLEAN DEFAULT true,
    
    -- Timing preferences
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    time_zone TEXT DEFAULT 'Asia/Riyadh',
    language_preference TEXT DEFAULT 'ar' CHECK (language_preference IN ('ar', 'en', 'both')),
    
    -- Delivery preferences
    advance_notice_hours INTEGER DEFAULT 24,
    digest_frequency TEXT CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')) DEFAULT 'immediate',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference per user per type
    UNIQUE(user_id, notification_type)
);

-- Indexes for preferences
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_type ON notification_preferences(notification_type);
CREATE INDEX IF NOT EXISTS idx_preferences_enabled ON notification_preferences(enabled);

-- =====================================================
-- User Notifications (In-App)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Read status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Interaction tracking
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per user per notification
    UNIQUE(user_id, notification_id)
);

-- Indexes for user notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- =====================================================
-- Notification Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    type TEXT NOT NULL CHECK (type IN (
        'deadline_reminder',
        'approval_request',
        'approval_completed',
        'meeting_reminder', 
        'overdue_task',
        'system_alert',
        'compliance_warning',
        'goal_milestone',
        'service_hours_low',
        'document_expiry'
    )),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    
    -- Template content
    subject_template_ar TEXT NOT NULL,
    subject_template_en TEXT NOT NULL,
    body_template_ar TEXT NOT NULL,
    body_template_en TEXT NOT NULL,
    
    -- Template configuration
    variables JSONB DEFAULT '[]',
    channels TEXT[] DEFAULT ARRAY['in_app'],
    default_priority TEXT DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Template status
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON notification_templates(is_active);

-- =====================================================
-- Notification Scheduling
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Schedule identification
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    type TEXT NOT NULL,
    template_id UUID REFERENCES notification_templates(id),
    
    -- Trigger conditions
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    recipient_rules JSONB NOT NULL DEFAULT '{}',
    
    -- Schedule status
    is_active BOOLEAN DEFAULT true,
    last_executed TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for schedules
CREATE INDEX IF NOT EXISTS idx_schedules_type ON notification_schedules(type);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON notification_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_last_executed ON notification_schedules(last_executed);

-- =====================================================
-- Notification Queue Management
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Queue management
    priority_score INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    processing_status TEXT DEFAULT 'queued' CHECK (processing_status IN (
        'queued', 'processing', 'completed', 'failed', 'cancelled'
    )),
    processor_id TEXT,
    
    -- Error handling
    error_details JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_queue_notification_id ON notification_queue(notification_id);
CREATE INDEX IF NOT EXISTS idx_queue_processing_status ON notification_queue(processing_status);
CREATE INDEX IF NOT EXISTS idx_queue_priority_score ON notification_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_queue_next_retry_at ON notification_queue(next_retry_at);

-- =====================================================
-- Notification Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    date DATE NOT NULL,
    notification_type TEXT NOT NULL,
    
    -- Delivery metrics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_sent > 0 THEN total_delivered::DECIMAL / total_sent ELSE 0 END
    ) STORED,
    read_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_delivered > 0 THEN total_read::DECIMAL / total_delivered ELSE 0 END
    ) STORED,
    
    -- Performance metrics
    average_read_time INTEGER DEFAULT 0, -- in minutes
    
    -- Channel breakdown
    channel_breakdown JSONB DEFAULT '{}',
    priority_breakdown JSONB DEFAULT '{}',
    response_time_stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per date per type
    UNIQUE(date, notification_type)
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_date ON notification_analytics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON notification_analytics(notification_type);
CREATE INDEX IF NOT EXISTS idx_analytics_delivery_rate ON notification_analytics(delivery_rate);

-- =====================================================
-- Push Token Management
-- =====================================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Token details
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    
    -- Token status
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Device information
    device_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tokens per user per platform
    UNIQUE(user_id, token, platform)
);

-- Indexes for push tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_is_active ON push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

-- =====================================================
-- System Health Monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS system_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service TEXT NOT NULL DEFAULT 'notification_system',
    health_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for health logs
CREATE INDEX IF NOT EXISTS idx_health_logs_service ON system_health_logs(service);
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON system_health_logs(timestamp);

-- =====================================================
-- Database Functions
-- =====================================================

-- Function to automatically update notification analytics
CREATE OR REPLACE FUNCTION update_notification_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics when delivery status changes
    INSERT INTO notification_analytics (
        date,
        notification_type,
        total_sent,
        total_delivered,
        total_read,
        total_failed
    )
    SELECT 
        DATE(n.created_at),
        n.type,
        COUNT(*),
        COUNT(*) FILTER (WHERE nd.status = 'delivered'),
        COUNT(*) FILTER (WHERE nd.status = 'read'),
        COUNT(*) FILTER (WHERE nd.status = 'failed')
    FROM notifications n
    JOIN notification_deliveries nd ON n.id = nd.notification_id
    WHERE n.id = NEW.notification_id
    GROUP BY DATE(n.created_at), n.type
    ON CONFLICT (date, notification_type) DO UPDATE SET
        total_sent = EXCLUDED.total_sent,
        total_delivered = EXCLUDED.total_delivered,
        total_read = EXCLUDED.total_read,
        total_failed = EXCLUDED.total_failed;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics updates
DROP TRIGGER IF EXISTS trigger_update_analytics ON notification_deliveries;
CREATE TRIGGER trigger_update_analytics
    AFTER INSERT OR UPDATE OF status ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_analytics();

-- Function to clean old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete notifications older than 90 days that are read and delivered
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND id IN (
        SELECT DISTINCT n.id
        FROM notifications n
        JOIN user_notifications un ON n.id = un.notification_id
        WHERE un.is_read = true
        AND n.expires_at < NOW()
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up orphaned delivery records
    DELETE FROM notification_deliveries 
    WHERE notification_id NOT IN (SELECT id FROM notifications);
    
    -- Clean up old health logs (keep last 30 days)
    DELETE FROM system_health_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user notification summary
CREATE OR REPLACE FUNCTION get_user_notification_summary(p_user_id UUID)
RETURNS TABLE (
    total_notifications INTEGER,
    unread_count INTEGER,
    high_priority_unread INTEGER,
    urgent_priority_unread INTEGER,
    last_notification_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_notifications,
        COUNT(*) FILTER (WHERE NOT un.is_read)::INTEGER as unread_count,
        COUNT(*) FILTER (WHERE NOT un.is_read AND n.priority = 'high')::INTEGER as high_priority_unread,
        COUNT(*) FILTER (WHERE NOT un.is_read AND n.priority = 'urgent')::INTEGER as urgent_priority_unread,
        MAX(n.created_at) as last_notification_at
    FROM user_notifications un
    JOIN notifications n ON un.notification_id = n.id
    WHERE un.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- RLS Policies for user_notifications
CREATE POLICY "Users can view their own user notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own user notifications" ON user_notifications
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for push_tokens
CREATE POLICY "Users can view their own push tokens" ON push_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own push tokens" ON push_tokens
    FOR ALL USING (user_id = auth.uid());

-- Admin policies for system management
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'system_admin')
        )
    );

-- =====================================================
-- Initial Data Setup
-- =====================================================

-- Insert default notification templates
INSERT INTO notification_templates (type, name_ar, name_en, subject_template_ar, subject_template_en, body_template_ar, body_template_en) VALUES
    ('deadline_reminder', 'تذكير موعد نهائي', 'Deadline Reminder', 'تذكير: موعد نهائي قريب', 'Reminder: Upcoming Deadline', 'لديك موعد نهائي قريب في {{days}} أيام للبرنامج التعليمي الفردي', 'You have an upcoming deadline in {{days}} days for the IEP'),
    ('approval_request', 'طلب موافقة', 'Approval Request', 'طلب موافقة: {{type}}', 'Approval Request: {{type}}', 'يتطلب البرنامج التعليمي الفردي موافقتكم', 'An IEP requires your approval'),
    ('meeting_reminder', 'تذكير اجتماع', 'Meeting Reminder', 'تذكير: اجتماع قريب', 'Reminder: Upcoming Meeting', 'لديك اجتماع قريب في {{hours}} ساعة', 'You have an upcoming meeting in {{hours}} hours'),
    ('compliance_warning', 'تحذير امتثال', 'Compliance Warning', 'تحذير امتثال: {{area}}', 'Compliance Warning: {{area}}', 'تم اكتشاف مشكلة امتثال تتطلب اهتمامكم', 'A compliance issue has been detected that requires your attention'),
    ('goal_milestone', 'إنجاز هدف', 'Goal Milestone', 'تهانينا! تم تحقيق هدف', 'Congratulations! Goal Achieved', 'تم تحقيق هدف مهم في البرنامج التعليمي الفردي', 'An important goal has been achieved in the IEP'),
    ('system_alert', 'تنبيه نظام', 'System Alert', 'تنبيه نظام', 'System Alert', 'تنبيه مهم من النظام', 'Important system notification')
ON CONFLICT DO NOTHING;

-- Insert default notification preferences for all notification types
INSERT INTO notification_preferences (user_id, notification_type, channels, enabled)
SELECT 
    p.id as user_id,
    unnest(ARRAY[
        'deadline_reminder',
        'approval_request', 
        'approval_completed',
        'meeting_reminder',
        'compliance_warning',
        'goal_milestone',
        'system_alert'
    ]) as notification_type,
    ARRAY['in_app', 'email'] as channels,
    true as enabled
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = p.id
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_composite ON notifications(recipient_id, type, priority, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_composite ON notification_deliveries(notification_id, channel, status);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE notifications IS 'Core notifications table storing all system notifications with bilingual support';
COMMENT ON TABLE notification_deliveries IS 'Tracks delivery status across different channels (email, SMS, WhatsApp, etc.)';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types, channels, and timing';
COMMENT ON TABLE user_notifications IS 'In-app notifications for users with read status tracking';
COMMENT ON TABLE notification_templates IS 'Reusable templates for different notification types';
COMMENT ON TABLE notification_schedules IS 'Automated notification scheduling rules';
COMMENT ON TABLE notification_queue IS 'Queue management for processing notifications with retry logic';
COMMENT ON TABLE notification_analytics IS 'Daily analytics for notification delivery and engagement metrics';
COMMENT ON TABLE push_tokens IS 'Push notification tokens for mobile and web clients';
COMMENT ON TABLE system_health_logs IS 'System health monitoring and diagnostics';

COMMENT ON FUNCTION update_notification_analytics() IS 'Automatically updates daily analytics when notification delivery status changes';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Cleans up old read notifications and system logs to maintain performance';
COMMENT ON FUNCTION get_user_notification_summary(UUID) IS 'Returns notification summary statistics for a specific user';

-- =====================================================
-- Schema Validation
-- =====================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'notifications',
        'notification_deliveries', 
        'notification_preferences',
        'user_notifications',
        'notification_templates',
        'notification_schedules',
        'notification_queue',
        'notification_analytics',
        'push_tokens',
        'system_health_logs'
    ];
    table_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name 
            AND table_schema = 'public'
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All notification system tables created successfully!';
    END IF;
END $$;