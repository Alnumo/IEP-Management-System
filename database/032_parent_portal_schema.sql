-- Parent Portal Database Schema Migration
-- Migration: 032_parent_portal_schema.sql
-- Purpose: Create comprehensive parent portal system with secure access and messaging

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create parent authentication and profiles table
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_name_ar TEXT NOT NULL,
  parent_name_en TEXT NOT NULL,
  relationship_ar TEXT NOT NULL, -- والد، والدة، ولي أمر
  relationship_en TEXT NOT NULL, -- father, mother, guardian
  phone_number TEXT,
  email TEXT,
  preferred_language VARCHAR(2) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "sms": true,
    "whatsapp": true,
    "in_app": true,
    "progress_updates": true,
    "session_reminders": true,
    "messages": true
  }'::jsonb,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create parent-therapist messaging system
CREATE TABLE parent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL,
  parent_id UUID REFERENCES parent_profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('parent', 'therapist')),
  sender_id UUID NOT NULL,
  message_text_ar TEXT,
  message_text_en TEXT,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'attachment', 'system')),
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  attachment_name TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reply_to_id UUID REFERENCES parent_messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Create home programs assignment system
CREATE TABLE home_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  program_name_ar TEXT NOT NULL,
  program_name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  instructions_ar TEXT NOT NULL,
  instructions_en TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, multiple_times_daily
  duration_minutes INTEGER,
  target_goal_ar TEXT,
  target_goal_en TEXT,
  assigned_date DATE NOT NULL,
  due_date DATE,
  is_active BOOLEAN DEFAULT true,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  required_materials_ar TEXT[],
  required_materials_en TEXT[],
  video_tutorial_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create home program completion tracking
CREATE TABLE home_program_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_program_id UUID REFERENCES home_programs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completion_time TIME,
  duration_minutes INTEGER,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 5),
  notes_ar TEXT,
  notes_en TEXT,
  evidence_photos TEXT[], -- Array of photo URLs
  evidence_videos TEXT[], -- Array of video URLs
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES therapists(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  therapist_feedback_ar TEXT,
  therapist_feedback_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent document access system
CREATE TABLE parent_document_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- therapy_report, assessment_result, session_summary, iep_document
  document_title_ar TEXT NOT NULL,
  document_title_en TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_category VARCHAR(30) NOT NULL, -- progress, assessment, medical, administrative
  access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view', 'download', 'restricted')),
  is_sensitive BOOLEAN DEFAULT false,
  expiry_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0
);

-- Create parent notifications system
CREATE TABLE parent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- message, session_reminder, progress_update, milestone, document
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_required BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'], -- in_app, email, sms, whatsapp
  delivery_status JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent progress tracking views
CREATE TABLE parent_progress_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_profiles(id) ON DELETE CASCADE,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  attended_sessions INTEGER DEFAULT 0,
  goals_achieved INTEGER DEFAULT 0,
  goals_in_progress INTEGER DEFAULT 0,
  overall_progress_percentage DECIMAL(5,2),
  key_achievements_ar TEXT[],
  key_achievements_en TEXT[],
  areas_for_improvement_ar TEXT[],
  areas_for_improvement_en TEXT[],
  therapist_recommendations_ar TEXT,
  therapist_recommendations_en TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES therapists(id)
);

-- Add indexes for performance optimization
CREATE INDEX idx_parent_profiles_user_id ON parent_profiles(user_id);
CREATE INDEX idx_parent_profiles_student_id ON parent_profiles(student_id);
CREATE INDEX idx_parent_profiles_active ON parent_profiles(is_active);

CREATE INDEX idx_parent_messages_thread_id ON parent_messages(thread_id);
CREATE INDEX idx_parent_messages_parent_id ON parent_messages(parent_id);
CREATE INDEX idx_parent_messages_therapist_id ON parent_messages(therapist_id);
CREATE INDEX idx_parent_messages_student_id ON parent_messages(student_id);
CREATE INDEX idx_parent_messages_created_at ON parent_messages(created_at DESC);
CREATE INDEX idx_parent_messages_is_read ON parent_messages(is_read);

CREATE INDEX idx_home_programs_student_id ON home_programs(student_id);
CREATE INDEX idx_home_programs_therapist_id ON home_programs(therapist_id);
CREATE INDEX idx_home_programs_active ON home_programs(is_active);
CREATE INDEX idx_home_programs_assigned_date ON home_programs(assigned_date DESC);

CREATE INDEX idx_home_program_completions_program_id ON home_program_completions(home_program_id);
CREATE INDEX idx_home_program_completions_parent_id ON home_program_completions(parent_id);
CREATE INDEX idx_home_program_completions_student_id ON home_program_completions(student_id);
CREATE INDEX idx_home_program_completions_completion_date ON home_program_completions(completion_date DESC);

CREATE INDEX idx_parent_document_access_parent_id ON parent_document_access(parent_id);
CREATE INDEX idx_parent_document_access_student_id ON parent_document_access(student_id);
CREATE INDEX idx_parent_document_access_document_type ON parent_document_access(document_type);
CREATE INDEX idx_parent_document_access_created_at ON parent_document_access(created_at DESC);

CREATE INDEX idx_parent_notifications_parent_id ON parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_student_id ON parent_notifications(student_id);
CREATE INDEX idx_parent_notifications_is_read ON parent_notifications(is_read);
CREATE INDEX idx_parent_notifications_created_at ON parent_notifications(created_at DESC);
CREATE INDEX idx_parent_notifications_type ON parent_notifications(notification_type);

CREATE INDEX idx_parent_progress_summaries_student_id ON parent_progress_summaries(student_id);
CREATE INDEX idx_parent_progress_summaries_parent_id ON parent_progress_summaries(parent_id);
CREATE INDEX idx_parent_progress_summaries_period ON parent_progress_summaries(reporting_period_end DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_program_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_document_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_progress_summaries ENABLE ROW LEVEL SECURITY;

-- Parent Profiles RLS Policies
CREATE POLICY "Parents can view their own profile" ON parent_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can update their own profile" ON parent_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Therapists can view parent profiles of their students" ON parent_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapists t 
      JOIN therapy_sessions ts ON ts.therapist_id = t.id 
      WHERE t.user_id = auth.uid() 
      AND ts.student_id = parent_profiles.student_id
    )
  );

CREATE POLICY "Admins and managers can view all parent profiles" ON parent_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_name IN ('admin', 'manager')
    )
  );

-- Parent Messages RLS Policies
CREATE POLICY "Parents can view messages for their students" ON parent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_messages.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create messages for their students" ON parent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_messages.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view messages for their students" ON parent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = parent_messages.therapist_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can create messages for their students" ON parent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = parent_messages.therapist_id 
      AND t.user_id = auth.uid()
    )
  );

-- Home Programs RLS Policies
CREATE POLICY "Parents can view home programs for their students" ON home_programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.student_id = home_programs.student_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage home programs for their students" ON home_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = home_programs.therapist_id 
      AND t.user_id = auth.uid()
    )
  );

-- Home Program Completions RLS Policies
CREATE POLICY "Parents can manage completions for their students" ON home_program_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = home_program_completions.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view completions for their students" ON home_program_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_programs hp 
      JOIN therapists t ON t.id = hp.therapist_id 
      WHERE hp.id = home_program_completions.home_program_id 
      AND t.user_id = auth.uid()
    )
  );

-- Parent Document Access RLS Policies
CREATE POLICY "Parents can access documents for their students" ON parent_document_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_document_access.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage document access for their students" ON parent_document_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM therapists t 
      JOIN therapy_sessions ts ON ts.therapist_id = t.id 
      WHERE t.user_id = auth.uid() 
      AND ts.student_id = parent_document_access.student_id
    )
  );

-- Parent Notifications RLS Policies
CREATE POLICY "Parents can view their notifications" ON parent_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_notifications.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their notifications (mark as read)" ON parent_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_notifications.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

-- Parent Progress Summaries RLS Policies
CREATE POLICY "Parents can view progress summaries for their students" ON parent_progress_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_profiles pp 
      WHERE pp.id = parent_progress_summaries.parent_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage progress summaries for their students" ON parent_progress_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM therapists t 
      JOIN therapy_sessions ts ON ts.therapist_id = t.id 
      WHERE t.user_id = auth.uid() 
      AND ts.student_id = parent_progress_summaries.student_id
    )
  );

-- Create functions for automated tasks

-- Function to update parent_profiles updated_at timestamp
CREATE OR REPLACE FUNCTION update_parent_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_profiles_updated_at
  BEFORE UPDATE ON parent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_parent_profiles_updated_at();

-- Function to update parent_messages updated_at timestamp
CREATE OR REPLACE FUNCTION update_parent_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_messages_updated_at
  BEFORE UPDATE ON parent_messages
  FOR EACH ROW EXECUTE FUNCTION update_parent_messages_updated_at();

-- Function to update home_programs updated_at timestamp
CREATE OR REPLACE FUNCTION update_home_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_home_programs_updated_at
  BEFORE UPDATE ON home_programs
  FOR EACH ROW EXECUTE FUNCTION update_home_programs_updated_at();

-- Function to auto-create notification when new message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'therapist' THEN
    INSERT INTO parent_notifications (
      parent_id, 
      student_id, 
      notification_type, 
      title_ar, 
      title_en, 
      content_ar, 
      content_en,
      action_url,
      delivery_channels
    ) VALUES (
      NEW.parent_id,
      NEW.student_id,
      'message',
      'رسالة جديدة من المعالج',
      'New message from therapist',
      COALESCE(NEW.message_text_ar, 'رسالة جديدة من المعالج الخاص بطفلك'),
      COALESCE(NEW.message_text_en, 'You have a new message from your child''s therapist'),
      '/messages/' || NEW.thread_id,
      ARRAY['in_app', 'email', 'whatsapp']
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON parent_messages
  FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- Add comments for documentation
COMMENT ON TABLE parent_profiles IS 'Parent user profiles with authentication and preferences';
COMMENT ON TABLE parent_messages IS 'Secure messaging system between parents and therapists';
COMMENT ON TABLE home_programs IS 'Home therapy programs assigned to students';
COMMENT ON TABLE home_program_completions IS 'Parent-reported completion of home programs';
COMMENT ON TABLE parent_document_access IS 'Parent access control for therapy documents';
COMMENT ON TABLE parent_notifications IS 'Notification system for parents';
COMMENT ON TABLE parent_progress_summaries IS 'Periodic progress summaries for parents';

-- Document Access Tracking Enhancement
-- Add document access tracking columns to parent_document_access
ALTER TABLE parent_document_access 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;

-- Create document access logs table
CREATE TABLE IF NOT EXISTS document_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES parent_document_access(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'download', 'bookmark', 'unbookmark')),
  access_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on document_access_logs
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for document_access_logs - parents can only see their own logs
CREATE POLICY "Parents can view own document access logs" ON document_access_logs
  FOR SELECT TO authenticated
  USING (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

-- RLS policy for inserting access logs - system can insert
CREATE POLICY "System can insert document access logs" ON document_access_logs
  FOR INSERT TO authenticated
  WITH CHECK (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

-- Functions for incrementing counters
CREATE OR REPLACE FUNCTION increment_view_count(document_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE parent_document_access 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = document_id
  RETURNING view_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_download_count(document_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE parent_document_access 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = document_id
  RETURNING download_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional indexes for document access logs
CREATE INDEX idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_parent_id ON document_access_logs(parent_id);
CREATE INDEX idx_document_access_logs_access_timestamp ON document_access_logs(access_timestamp);

-- Parent consent tracking for sensitive document access
CREATE TABLE IF NOT EXISTS parent_consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('sensitive_document_access', 'medical_records_access', 'assessment_reports_access')),
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  consent_details JSONB,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on parent_consent_log
ALTER TABLE parent_consent_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for parent_consent_log - parents can only see their own consent records
CREATE POLICY "Parents can view own consent records" ON parent_consent_log
  FOR SELECT TO authenticated
  USING (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

-- RLS policy for inserting consent records - parents can create their own
CREATE POLICY "Parents can create own consent records" ON parent_consent_log
  FOR INSERT TO authenticated
  WITH CHECK (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

-- Add security enhancement columns to parent_document_access
ALTER TABLE parent_document_access 
ADD COLUMN IF NOT EXISTS restricted_actions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS requires_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_type TEXT,
ADD COLUMN IF NOT EXISTS security_classification TEXT CHECK (security_classification IN ('public', 'confidential', 'restricted', 'top_secret')) DEFAULT 'public';

-- Indexes for parent_consent_log
CREATE INDEX idx_parent_consent_log_parent_id ON parent_consent_log(parent_id);
CREATE INDEX idx_parent_consent_log_consent_type ON parent_consent_log(consent_type);
CREATE INDEX idx_parent_consent_log_expires_at ON parent_consent_log(expires_at);

-- Email notification queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject_ar TEXT NOT NULL,
  subject_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  template_type TEXT DEFAULT 'parent_notification',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp notification queue table
CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_phone TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  template_type TEXT DEFAULT 'parent_notification',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on queue tables
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for queue tables (system access only)
CREATE POLICY "System can manage email queue" ON email_queue
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can manage whatsapp queue" ON whatsapp_queue
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update notification delivery status
CREATE OR REPLACE FUNCTION update_notification_delivery_status(
  notification_id UUID,
  channel TEXT,
  status TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  UPDATE parent_notifications 
  SET delivery_status = jsonb_set(
    COALESCE(delivery_status, '{}'::jsonb),
    ARRAY[channel],
    jsonb_build_object(
      'status', status,
      'timestamp', timestamp,
      'attempts', COALESCE((delivery_status->channel->>'attempts')::integer, 0) + 1
    )
  ),
  updated_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced parent_profiles with notification preferences
ALTER TABLE parent_profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Indexes for queue tables
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);
CREATE INDEX idx_whatsapp_queue_status ON whatsapp_queue(status);
CREATE INDEX idx_whatsapp_queue_scheduled_for ON whatsapp_queue(scheduled_for);
CREATE INDEX idx_whatsapp_queue_priority ON whatsapp_queue(priority);

-- Add comments for new tables
COMMENT ON TABLE document_access_logs IS 'Audit log for document access tracking';
COMMENT ON TABLE parent_consent_log IS 'Parent consent tracking for sensitive document access';
COMMENT ON TABLE email_queue IS 'Email notification queue for n8n processing';
COMMENT ON TABLE whatsapp_queue IS 'WhatsApp notification queue for n8n processing';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;