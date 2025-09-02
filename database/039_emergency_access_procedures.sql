-- Emergency Access Procedures Implementation
-- This migration implements comprehensive emergency access procedures for critical medical situations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Emergency Access Requests Table
CREATE TABLE IF NOT EXISTS emergency_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) >= 10),
  emergency_type TEXT NOT NULL CHECK (emergency_type IN (
    'LIFE_THREATENING', 'URGENT_CARE', 'MEDICATION_CRITICAL', 
    'BEHAVIORAL_CRISIS', 'OTHER'
  )),
  access_level TEXT NOT NULL CHECK (access_level IN (
    'READ_ONLY', 'LIMITED_EDIT', 'FULL_ACCESS'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'USED'
  )),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  justification TEXT NOT NULL CHECK (length(justification) >= 20),
  emergency_contact_verified BOOLEAN DEFAULT false,
  supervisor_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT approval_logic CHECK (
    (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (status = 'DENIED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (status IN ('PENDING', 'EXPIRED', 'USED'))
  ),
  
  -- Indexes for performance
  INDEX idx_emergency_requests_status (status, created_at),
  INDEX idx_emergency_requests_patient (patient_id, status),
  INDEX idx_emergency_requests_requester (requester_id, created_at),
  INDEX idx_emergency_requests_expires (expires_at) WHERE status IN ('APPROVED', 'PENDING')
);

-- 2. Emergency Access Sessions Table
CREATE TABLE IF NOT EXISTS emergency_access_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES emergency_access_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL CHECK (access_level IN ('READ_ONLY', 'LIMITED_EDIT', 'FULL_ACCESS')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  session_notes TEXT DEFAULT '',
  terminated_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_session_expiry CHECK (expires_at > started_at),
  CONSTRAINT single_active_session_per_request UNIQUE (request_id) WHERE is_active = true,
  
  -- Indexes
  INDEX idx_emergency_sessions_active (is_active, expires_at),
  INDEX idx_emergency_sessions_user (user_id, is_active),
  INDEX idx_emergency_sessions_patient (patient_id, is_active),
  INDEX idx_emergency_sessions_token (session_token) WHERE is_active = true
);

-- 3. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2),
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^\+?[0-9\-\s\(\)]{8,20}$'),
  email TEXT CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  is_primary BOOLEAN DEFAULT false,
  can_authorize_emergency BOOLEAN DEFAULT false,
  verification_code TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT single_primary_contact_per_patient EXCLUDE (patient_id WITH =) WHERE is_primary = true,
  
  -- Indexes
  INDEX idx_emergency_contacts_patient (patient_id, is_primary),
  INDEX idx_emergency_contacts_phone (phone),
  INDEX idx_emergency_contacts_verification (verification_code) WHERE verification_code IS NOT NULL
);

-- 4. Emergency Access Logs Table
CREATE TABLE IF NOT EXISTS emergency_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES emergency_access_sessions(id) ON DELETE CASCADE,
  request_id UUID REFERENCES emergency_access_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- At least one of session_id or request_id must be provided
  CONSTRAINT emergency_log_reference CHECK (session_id IS NOT NULL OR request_id IS NOT NULL),
  
  -- Indexes
  INDEX idx_emergency_logs_session (session_id, timestamp),
  INDEX idx_emergency_logs_request (request_id, timestamp),
  INDEX idx_emergency_logs_user (user_id, timestamp),
  INDEX idx_emergency_logs_timestamp (timestamp DESC)
);

-- 5. Emergency Notifications Table
CREATE TABLE IF NOT EXISTS emergency_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES emergency_access_requests(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_DENIED', 
    'ACCESS_USED', 'SESSION_EXPIRED', 'CONTACT_VERIFICATION'
  )),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'SUPERVISOR', 'EMERGENCY_CONTACT', 'MEDICAL_TEAM', 'ADMIN'
  )),
  recipient_id TEXT NOT NULL,
  message_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN (
    'EMAIL', 'SMS', 'IN_APP', 'WHATSAPP'
  )),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN (
    'PENDING', 'SENT', 'DELIVERED', 'FAILED'
  )),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indexes
  INDEX idx_emergency_notifications_request (request_id, notification_type),
  INDEX idx_emergency_notifications_status (delivery_status, created_at),
  INDEX idx_emergency_notifications_recipient (recipient_type, recipient_id)
);

-- Enhanced emergency_medical_access function
CREATE OR REPLACE FUNCTION emergency_medical_access(
  user_id UUID,
  patient_id UUID,
  emergency_reason TEXT,
  access_level TEXT DEFAULT 'READ_ONLY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  eligibility_check JSONB;
  result JSONB;
BEGIN
  -- Check user eligibility
  SELECT * INTO eligibility_check 
  FROM check_emergency_access_eligibility(user_id, patient_id);
  
  IF NOT (eligibility_check->>'can_request')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', eligibility_check->>'reason'
    );
  END IF;
  
  -- Create emergency access request
  INSERT INTO emergency_access_requests (
    requester_id,
    patient_id,
    reason,
    emergency_type,
    access_level,
    expires_at,
    justification,
    emergency_contact_verified,
    supervisor_notified
  ) VALUES (
    user_id,
    patient_id,
    emergency_reason,
    'URGENT_CARE',
    access_level,
    now() + interval '24 hours',
    'Legacy emergency access function - immediate access required',
    false,
    false
  ) RETURNING * INTO request_record;
  
  -- Auto-approve for backward compatibility (but log it)
  UPDATE emergency_access_requests 
  SET 
    status = 'APPROVED',
    approved_by = user_id,
    approved_at = now()
  WHERE id = request_record.id;
  
  -- Log the emergency access
  INSERT INTO emergency_access_logs (
    request_id,
    user_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    request_record.id,
    user_id,
    'LEGACY_EMERGENCY_ACCESS',
    jsonb_build_object(
      'patient_id', patient_id,
      'reason', emergency_reason,
      'access_level', access_level,
      'auto_approved', true
    ),
    inet_client_addr()
  );
  
  -- Send notifications
  PERFORM send_emergency_notifications(request_record.id, 'REQUEST_APPROVED');
  
  result := jsonb_build_object(
    'success', true,
    'request_id', request_record.id,
    'access_level', access_level,
    'expires_at', request_record.expires_at,
    'message', 'Emergency access granted'
  );
  
  RETURN result;
END;
$$;

-- Function: Create emergency access request
CREATE OR REPLACE FUNCTION create_emergency_access_request(
  requester_user_id UUID,
  patient_user_id UUID,
  emergency_reason TEXT,
  emergency_type TEXT,
  requested_access_level TEXT,
  justification_text TEXT,
  expires_in_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record emergency_access_requests;
  eligibility_result JSONB;
BEGIN
  -- Check eligibility
  SELECT * INTO eligibility_result 
  FROM check_emergency_access_eligibility(requester_user_id, patient_user_id);
  
  IF NOT (eligibility_result->>'can_request')::boolean THEN
    RAISE EXCEPTION 'Cannot create emergency request: %', eligibility_result->>'reason';
  END IF;
  
  -- Validate inputs
  IF length(emergency_reason) < 10 THEN
    RAISE EXCEPTION 'Emergency reason must be at least 10 characters';
  END IF;
  
  IF length(justification_text) < 20 THEN
    RAISE EXCEPTION 'Justification must be at least 20 characters';
  END IF;
  
  -- Create request
  INSERT INTO emergency_access_requests (
    requester_id,
    patient_id,
    reason,
    emergency_type,
    access_level,
    expires_at,
    justification,
    emergency_contact_verified,
    supervisor_notified
  ) VALUES (
    requester_user_id,
    patient_user_id,
    emergency_reason,
    emergency_type,
    requested_access_level,
    now() + (expires_in_hours || ' hours')::interval,
    justification_text,
    false,
    true
  ) RETURNING * INTO request_record;
  
  -- Log the request creation
  INSERT INTO emergency_access_logs (
    request_id,
    user_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    request_record.id,
    requester_user_id,
    'REQUEST_CREATED',
    jsonb_build_object(
      'emergency_type', emergency_type,
      'access_level', requested_access_level,
      'expires_in_hours', expires_in_hours
    ),
    inet_client_addr()
  );
  
  -- Send notifications
  PERFORM send_emergency_notifications(request_record.id, 'REQUEST_CREATED');
  
  RETURN row_to_json(request_record)::jsonb;
END;
$$;

-- Function: Approve emergency access
CREATE OR REPLACE FUNCTION approve_emergency_access(
  request_id UUID,
  approver_id UUID,
  override_access_level TEXT DEFAULT NULL,
  override_expiry_hours INTEGER DEFAULT NULL,
  approval_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record emergency_access_requests;
  final_access_level TEXT;
  final_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the request
  SELECT * INTO request_record
  FROM emergency_access_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency access request not found';
  END IF;
  
  IF request_record.status != 'PENDING' THEN
    RAISE EXCEPTION 'Request is not in pending status';
  END IF;
  
  -- Determine final values
  final_access_level := COALESCE(override_access_level, request_record.access_level);
  final_expiry := CASE 
    WHEN override_expiry_hours IS NOT NULL THEN now() + (override_expiry_hours || ' hours')::interval
    ELSE request_record.expires_at
  END;
  
  -- Update request
  UPDATE emergency_access_requests
  SET 
    status = 'APPROVED',
    approved_by = approver_id,
    approved_at = now(),
    access_level = final_access_level,
    expires_at = final_expiry,
    justification = CASE 
      WHEN approval_notes IS NOT NULL THEN 
        request_record.justification || E'\n\nApproval Notes: ' || approval_notes
      ELSE request_record.justification
    END,
    updated_at = now()
  WHERE id = request_id
  RETURNING * INTO request_record;
  
  -- Log the approval
  INSERT INTO emergency_access_logs (
    request_id,
    user_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    request_id,
    approver_id,
    'REQUEST_APPROVED',
    jsonb_build_object(
      'final_access_level', final_access_level,
      'final_expiry', final_expiry,
      'approval_notes', approval_notes,
      'original_request', row_to_json(request_record)
    ),
    inet_client_addr()
  );
  
  -- Send notifications
  PERFORM send_emergency_notifications(request_id, 'REQUEST_APPROVED');
  
  RETURN row_to_json(request_record)::jsonb;
END;
$$;

-- Function: Start emergency session
CREATE OR REPLACE FUNCTION start_emergency_session(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record emergency_access_requests;
  session_record emergency_access_sessions;
  session_token TEXT;
BEGIN
  -- Get approved request
  SELECT * INTO request_record
  FROM emergency_access_requests
  WHERE id = request_id AND status = 'APPROVED';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No approved emergency access request found';
  END IF;
  
  -- Check if request has expired
  IF request_record.expires_at < now() THEN
    -- Update status to expired
    UPDATE emergency_access_requests
    SET status = 'EXPIRED', updated_at = now()
    WHERE id = request_id;
    
    RAISE EXCEPTION 'Emergency access request has expired';
  END IF;
  
  -- Generate secure session token
  session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create session
  INSERT INTO emergency_access_sessions (
    request_id,
    user_id,
    patient_id,
    session_token,
    access_level,
    expires_at
  ) VALUES (
    request_id,
    request_record.requester_id,
    request_record.patient_id,
    session_token,
    request_record.access_level,
    request_record.expires_at
  ) RETURNING * INTO session_record;
  
  -- Update request status
  UPDATE emergency_access_requests
  SET 
    status = 'USED',
    accessed_at = now(),
    updated_at = now()
  WHERE id = request_id;
  
  -- Log session start
  INSERT INTO emergency_access_logs (
    session_id,
    request_id,
    user_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    session_record.id,
    request_id,
    request_record.requester_id,
    'SESSION_STARTED',
    jsonb_build_object(
      'access_level', request_record.access_level,
      'session_token', session_token
    ),
    inet_client_addr()
  );
  
  -- Send notification
  PERFORM send_emergency_notifications(request_id, 'ACCESS_USED');
  
  RETURN row_to_json(session_record)::jsonb;
END;
$$;

-- Function: Terminate emergency session
CREATE OR REPLACE FUNCTION terminate_emergency_session(
  session_id UUID,
  termination_reason TEXT DEFAULT 'MANUAL_TERMINATION',
  session_notes TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record emergency_access_sessions;
BEGIN
  -- Get active session
  SELECT * INTO session_record
  FROM emergency_access_sessions
  WHERE id = session_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active emergency session not found';
  END IF;
  
  -- Update session
  UPDATE emergency_access_sessions
  SET 
    is_active = false,
    terminated_reason = termination_reason,
    session_notes = session_notes,
    last_activity_at = now()
  WHERE id = session_id;
  
  -- Log termination
  INSERT INTO emergency_access_logs (
    session_id,
    user_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    session_id,
    session_record.user_id,
    'SESSION_TERMINATED',
    jsonb_build_object(
      'termination_reason', termination_reason,
      'session_notes', session_notes,
      'session_duration_minutes', 
      EXTRACT(EPOCH FROM (now() - session_record.started_at)) / 60
    ),
    inet_client_addr()
  );
END;
$$;

-- Function: Check emergency access eligibility
CREATE OR REPLACE FUNCTION check_emergency_access_eligibility(
  user_id UUID,
  patient_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  existing_request_count INTEGER;
  recent_request_id UUID;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM user_profiles
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason', 'User profile not found'
    );
  END IF;
  
  -- Check if user has appropriate role
  IF user_profile.role NOT IN ('admin', 'manager', 'therapist', 'medical_consultant') THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason', 'Insufficient permissions for emergency access'
    );
  END IF;
  
  -- Check for existing pending or approved requests
  SELECT COUNT(*), MIN(id) INTO existing_request_count, recent_request_id
  FROM emergency_access_requests
  WHERE requester_id = user_id 
    AND patient_id = patient_id 
    AND status IN ('PENDING', 'APPROVED')
    AND expires_at > now();
  
  IF existing_request_count > 0 THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason', 'Active emergency access request already exists',
      'existing_request_id', recent_request_id
    );
  END IF;
  
  -- Check daily limits (max 3 requests per user per day)
  SELECT COUNT(*) INTO existing_request_count
  FROM emergency_access_requests
  WHERE requester_id = user_id
    AND created_at >= date_trunc('day', now());
  
  IF existing_request_count >= 3 THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason', 'Daily emergency access request limit exceeded'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_request', true,
    'user_role', user_profile.role
  );
END;
$$;

-- Function: Send emergency notifications
CREATE OR REPLACE FUNCTION send_emergency_notifications(
  request_id UUID,
  notification_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record emergency_access_requests;
  notification_record emergency_notifications;
  supervisor_ids UUID[];
  contact_record emergency_contacts;
BEGIN
  -- Get request details
  SELECT * INTO request_record
  FROM emergency_access_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN; -- Skip if request not found
  END IF;
  
  -- Notify supervisors (managers and admins)
  SELECT array_agg(id) INTO supervisor_ids
  FROM user_profiles
  WHERE role IN ('admin', 'manager')
    AND is_active = true;
  
  -- Create supervisor notifications
  IF supervisor_ids IS NOT NULL THEN
    INSERT INTO emergency_notifications (
      request_id,
      notification_type,
      recipient_type,
      recipient_id,
      message_content,
      delivery_method
    )
    SELECT 
      request_id,
      notification_type,
      'SUPERVISOR',
      supervisor_id::text,
      jsonb_build_object(
        'emergency_type', request_record.emergency_type,
        'patient_id', request_record.patient_id,
        'requester_id', request_record.requester_id,
        'reason', request_record.reason,
        'access_level', request_record.access_level,
        'created_at', request_record.created_at
      ),
      'IN_APP'
    FROM unnest(supervisor_ids) AS supervisor_id;
  END IF;
  
  -- Notify emergency contacts for high-priority cases
  IF request_record.emergency_type IN ('LIFE_THREATENING', 'BEHAVIORAL_CRISIS') THEN
    FOR contact_record IN 
      SELECT * FROM emergency_contacts 
      WHERE patient_id = request_record.patient_id 
        AND can_authorize_emergency = true
    LOOP
      INSERT INTO emergency_notifications (
        request_id,
        notification_type,
        recipient_type,
        recipient_id,
        message_content,
        delivery_method
      ) VALUES (
        request_id,
        notification_type,
        'EMERGENCY_CONTACT',
        contact_record.id::text,
        jsonb_build_object(
          'contact_name', contact_record.name,
          'emergency_type', request_record.emergency_type,
          'requester_name', (SELECT name FROM user_profiles WHERE id = request_record.requester_id),
          'reason', request_record.reason,
          'timestamp', now()
        ),
        CASE 
          WHEN contact_record.phone IS NOT NULL THEN 'SMS'
          WHEN contact_record.email IS NOT NULL THEN 'EMAIL'
          ELSE 'IN_APP'
        END
      );
    END LOOP;
  END IF;
END;
$$;

-- Function: Verify emergency contact
CREATE OR REPLACE FUNCTION verify_emergency_contact(
  contact_id UUID,
  verification_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_record emergency_contacts;
BEGIN
  -- Get contact with code
  SELECT * INTO contact_record
  FROM emergency_contacts
  WHERE id = contact_id
    AND verification_code = verification_code;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Mark as verified
  UPDATE emergency_contacts
  SET 
    verified_at = now(),
    verification_code = NULL,
    updated_at = now()
  WHERE id = contact_id;
  
  RETURN true;
END;
$$;

-- Function: Get emergency access statistics
CREATE OR REPLACE FUNCTION get_emergency_access_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
  total_requests_24h INTEGER;
  approved_requests_24h INTEGER;
  active_sessions INTEGER;
  avg_response_time NUMERIC;
  requests_by_type JSONB;
BEGIN
  -- Total requests in last 24 hours
  SELECT COUNT(*) INTO total_requests_24h
  FROM emergency_access_requests
  WHERE created_at >= now() - interval '24 hours';
  
  -- Approved requests in last 24 hours
  SELECT COUNT(*) INTO approved_requests_24h
  FROM emergency_access_requests
  WHERE created_at >= now() - interval '24 hours'
    AND status = 'APPROVED';
  
  -- Active sessions
  SELECT COUNT(*) INTO active_sessions
  FROM emergency_access_sessions
  WHERE is_active = true
    AND expires_at > now();
  
  -- Average response time (approval time - creation time)
  SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 60) INTO avg_response_time
  FROM emergency_access_requests
  WHERE created_at >= now() - interval '7 days'
    AND approved_at IS NOT NULL;
  
  -- Requests by type
  SELECT jsonb_object_agg(emergency_type, request_count) INTO requests_by_type
  FROM (
    SELECT emergency_type, COUNT(*) as request_count
    FROM emergency_access_requests
    WHERE created_at >= now() - interval '24 hours'
    GROUP BY emergency_type
  ) type_counts;
  
  stats := jsonb_build_object(
    'total_requests_24h', total_requests_24h,
    'approved_requests_24h', approved_requests_24h,
    'active_sessions', active_sessions,
    'average_response_time_minutes', COALESCE(avg_response_time, 0),
    'requests_by_type', COALESCE(requests_by_type, '{}'::jsonb)
  );
  
  RETURN stats;
END;
$$;

-- Function: Expire old emergency requests
CREATE OR REPLACE FUNCTION expire_old_emergency_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired requests
  UPDATE emergency_access_requests
  SET 
    status = 'EXPIRED',
    updated_at = now()
  WHERE status IN ('PENDING', 'APPROVED')
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Terminate expired sessions
  UPDATE emergency_access_sessions
  SET 
    is_active = false,
    terminated_reason = 'EXPIRED',
    last_activity_at = now()
  WHERE is_active = true
    AND expires_at < now();
  
  -- Send expiry notifications
  INSERT INTO emergency_notifications (
    request_id,
    notification_type,
    recipient_type,
    recipient_id,
    message_content,
    delivery_method
  )
  SELECT 
    id,
    'SESSION_EXPIRED',
    'SUPERVISOR',
    requester_id::text,
    jsonb_build_object(
      'expired_at', now(),
      'emergency_type', emergency_type,
      'patient_id', patient_id
    ),
    'IN_APP'
  FROM emergency_access_requests
  WHERE status = 'EXPIRED'
    AND updated_at >= now() - interval '1 minute'; -- Only newly expired
  
  RETURN expired_count;
END;
$$;

-- RLS Policies

-- Emergency Access Requests - users can see their own requests, supervisors can see all
ALTER TABLE emergency_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own emergency requests"
  ON emergency_access_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR 
    is_admin() OR 
    is_manager() OR
    is_medical_consultant()
  );

CREATE POLICY "Users can create emergency requests"
  ON emergency_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Supervisors can update emergency requests"
  ON emergency_access_requests FOR UPDATE
  USING (is_admin() OR is_manager() OR is_medical_consultant());

-- Emergency Sessions - users can see their own sessions, supervisors can see all
ALTER TABLE emergency_access_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own emergency sessions"
  ON emergency_access_sessions FOR SELECT
  USING (
    user_id = auth.uid() OR 
    is_admin() OR 
    is_manager() OR
    is_medical_consultant()
  );

-- Emergency Contacts - readable by medical staff for patients they have access to
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical staff can access emergency contacts"
  ON emergency_contacts FOR SELECT
  USING (
    is_admin() OR
    is_manager() OR
    is_therapist() OR
    is_medical_consultant() OR
    can_access_student_data(patient_id)
  );

-- Emergency Logs - viewable by supervisors and users involved
ALTER TABLE emergency_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Emergency logs access control"
  ON emergency_access_logs FOR SELECT
  USING (
    user_id = auth.uid() OR 
    is_admin() OR 
    is_manager() OR
    is_medical_consultant()
  );

-- Emergency Notifications - viewable by recipients and supervisors
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notification access control"
  ON emergency_notifications FOR SELECT
  USING (
    recipient_id = auth.uid()::text OR 
    is_admin() OR 
    is_manager()
  );

-- Grant execute permissions on emergency functions
GRANT EXECUTE ON FUNCTION emergency_medical_access(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_emergency_access_request(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_emergency_access(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_emergency_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION terminate_emergency_session(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_emergency_access_eligibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_emergency_notifications(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_emergency_contact(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_emergency_access_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_emergency_requests() TO authenticated;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_requests_composite
  ON emergency_access_requests (status, emergency_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_sessions_composite
  ON emergency_access_sessions (is_active, expires_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_logs_composite
  ON emergency_access_logs (timestamp DESC, action_type);

-- Set up automatic expiration job (requires pg_cron extension if available)
-- This would be set up separately in production environments
COMMENT ON FUNCTION expire_old_emergency_requests() IS 
'This function should be called periodically (every 15 minutes) to expire old emergency requests and sessions';

-- Comments for documentation
COMMENT ON TABLE emergency_access_requests IS 'Emergency access requests for critical medical situations';
COMMENT ON TABLE emergency_access_sessions IS 'Active emergency access sessions with time-limited access';
COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for patients who can authorize emergency access';
COMMENT ON TABLE emergency_access_logs IS 'Comprehensive audit trail for all emergency access activities';
COMMENT ON TABLE emergency_notifications IS 'Notifications sent during emergency access procedures';

COMMENT ON FUNCTION emergency_medical_access IS 'Enhanced emergency medical access function with comprehensive audit trail';
COMMENT ON FUNCTION create_emergency_access_request IS 'Create new emergency access request with validation and notifications';
COMMENT ON FUNCTION approve_emergency_access IS 'Approve emergency access request with optional overrides';
COMMENT ON FUNCTION start_emergency_session IS 'Start emergency access session from approved request';
COMMENT ON FUNCTION terminate_emergency_session IS 'Terminate emergency access session with audit logging';
COMMENT ON FUNCTION check_emergency_access_eligibility IS 'Check if user can request emergency access';
COMMENT ON FUNCTION send_emergency_notifications IS 'Send notifications for emergency access events';
COMMENT ON FUNCTION get_emergency_access_stats IS 'Get emergency access statistics and metrics';