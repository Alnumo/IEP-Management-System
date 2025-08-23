-- Parent Portal Database Schema
-- Phase 5: Parent Portal & Engagement System

-- Parent Users Table
CREATE TABLE parent_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id TEXT UNIQUE NOT NULL DEFAULT 'parent-' || extract(epoch from now())::text,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'caregiver')) DEFAULT 'father',
  preferred_language TEXT CHECK (preferred_language IN ('ar', 'en')) DEFAULT 'ar',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  notification_preferences JSONB DEFAULT '{
    "sessionReminders": true,
    "progressUpdates": true,
    "homeProgramUpdates": true,
    "appointmentChanges": true,
    "emergencyAlerts": true,
    "weeklyReports": true,
    "communicationMethod": "email",
    "reminderTiming": 2
  }',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student-Parent Relationships
CREATE TABLE student_parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'caregiver')),
  is_primary_contact BOOLEAN DEFAULT false,
  emergency_contact BOOLEAN DEFAULT false,
  pickup_authorized BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, parent_id)
);

-- Parent Messages System
CREATE TABLE parent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('parent', 'therapist', 'admin', 'system')) NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'voice', 'image', 'document', 'video')) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  reply_to_message_id UUID REFERENCES parent_messages(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_parent_messages_conversation (conversation_id),
  INDEX idx_parent_messages_recipient (recipient_id),
  INDEX idx_parent_messages_sender (sender_id)
);

-- Home Programs for Parents
CREATE TABLE home_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  program_title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL,
  assigned_by_name TEXT NOT NULL,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category TEXT,
  estimated_duration INTEGER, -- in minutes
  instructions JSONB DEFAULT '[]',
  materials JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')) DEFAULT 'assigned',
  completion_date TIMESTAMP WITH TIME ZONE,
  parent_feedback TEXT,
  parent_rating INTEGER CHECK (parent_rating >= 1 AND parent_rating <= 5),
  video_url TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_home_programs_child (child_id),
  INDEX idx_home_programs_status (status),
  INDEX idx_home_programs_assigned (assigned_date)
);

-- Appointment Requests
CREATE TABLE appointment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  request_type TEXT CHECK (request_type IN ('new_session', 'reschedule', 'consultation', 'assessment')) NOT NULL,
  preferred_therapist UUID REFERENCES therapists(id),
  preferred_dates TEXT[],
  preferred_times TEXT[],
  duration INTEGER DEFAULT 60,
  priority TEXT CHECK (priority IN ('routine', 'urgent', 'emergency')) DEFAULT 'routine',
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')) DEFAULT 'pending',
  response_notes TEXT,
  scheduled_date_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_appointment_requests_parent (parent_id),
  INDEX idx_appointment_requests_child (child_id),
  INDEX idx_appointment_requests_status (status)
);

-- Parent Feedback System
CREATE TABLE parent_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  program_id UUID,
  therapist_id UUID REFERENCES therapists(id),
  feedback_type TEXT CHECK (feedback_type IN ('session_feedback', 'program_feedback', 'home_activity', 'concern', 'appreciation')) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT NOT NULL,
  suggestions TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('submitted', 'reviewed', 'responded')) DEFAULT 'submitted',
  admin_response TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_parent_feedback_parent (parent_id),
  INDEX idx_parent_feedback_child (child_id),
  INDEX idx_parent_feedback_status (status)
);

-- Document Access Control
CREATE TABLE document_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('assessment_report', 'progress_report', 'iep', 'medical_record', 'session_notes', 'home_program', 'photo', 'video')) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confidential BOOLEAN DEFAULT false,
  expiry_date TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  parent_notes TEXT,
  tags TEXT[],
  
  INDEX idx_document_access_child (child_id),
  INDEX idx_document_access_type (document_type),
  INDEX idx_document_access_uploaded (uploaded_at)
);

-- System Announcements
CREATE TABLE system_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('general', 'urgent', 'holiday', 'program_update', 'policy_change')) DEFAULT 'general',
  target_audience TEXT CHECK (target_audience IN ('all_parents', 'specific_program', 'specific_children')) DEFAULT 'all_parents',
  target_criteria JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  attachments TEXT[],
  read_by TEXT[], -- Array of parent IDs who have read the announcement
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_announcements_active (is_active, published_at),
  INDEX idx_announcements_target (target_audience)
);

-- Parent Activity Log
CREATE TABLE parent_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  entity_type TEXT, -- e.g., 'message', 'appointment', 'document'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_parent_activity_parent (parent_id),
  INDEX idx_parent_activity_type (activity_type),
  INDEX idx_parent_activity_created (created_at)
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_parent_users_updated_at BEFORE UPDATE ON parent_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_home_programs_updated_at BEFORE UPDATE ON home_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();