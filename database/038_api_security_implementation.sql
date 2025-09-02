-- API Security Implementation Schema
-- This migration implements comprehensive API security features including
-- rate limiting, session security, security event logging, and request throttling

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. API Rate Limits Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_pattern TEXT NOT NULL, -- Regex pattern for matching endpoints
  max_requests INTEGER NOT NULL DEFAULT 100,
  time_window_seconds INTEGER NOT NULL DEFAULT 3600,
  user_role TEXT DEFAULT NULL, -- NULL means applies to all roles
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_max_requests CHECK (max_requests > 0),
  CONSTRAINT valid_time_window CHECK (time_window_seconds > 0),
  CONSTRAINT unique_endpoint_role UNIQUE(endpoint_pattern, user_role)
);

-- 2. API Request Log Table (for rate limiting tracking)
CREATE TABLE IF NOT EXISTS api_request_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_path TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  ip_address INET,
  user_agent TEXT,
  request_metadata JSONB DEFAULT '{}',
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indexes for performance
  INDEX idx_request_log_user_endpoint (user_id, endpoint_path, created_at),
  INDEX idx_request_log_ip_endpoint (ip_address, endpoint_path, created_at),
  INDEX idx_request_log_created_at (created_at)
);

-- 3. Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_REQUEST', 'INVALID_TOKEN', 
    'CORS_VIOLATION', 'SESSION_TIMEOUT', 'BRUTE_FORCE_ATTEMPT',
    'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_IP', 'MALFORMED_REQUEST'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  request_details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indexes for security monitoring
  INDEX idx_security_events_type_severity (event_type, severity, created_at),
  INDEX idx_security_events_user (user_id, created_at),
  INDEX idx_security_events_ip (ip_address, created_at)
);

-- 4. User Sessions Table (enhanced session tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  security_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indexes for session management
  INDEX idx_user_sessions_token (session_token),
  INDEX idx_user_sessions_user_active (user_id, is_active, last_activity_at),
  INDEX idx_user_sessions_expires (expires_at)
);

-- 5. IP Address Analysis Table (for threat detection)
CREATE TABLE IF NOT EXISTS ip_analysis_cache (
  ip_address INET PRIMARY KEY,
  is_suspicious BOOLEAN DEFAULT false,
  threat_level TEXT DEFAULT 'LOW' CHECK (threat_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  blocked BOOLEAN DEFAULT false,
  reason TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  request_count INTEGER DEFAULT 1,
  
  INDEX idx_ip_analysis_threat_level (threat_level, blocked),
  INDEX idx_ip_analysis_last_analyzed (last_analyzed_at)
);

-- Insert default rate limit rules
INSERT INTO api_rate_limits (endpoint_pattern, max_requests, time_window_seconds, user_role) VALUES
  ('^/api/auth/.*', 10, 900, NULL), -- Auth endpoints: 10 requests per 15 minutes
  ('^/api/medical/.*', 100, 3600, 'medical_consultant'), -- Medical: 100/hour for consultants
  ('^/api/medical/.*', 50, 3600, 'therapist'), -- Medical: 50/hour for therapists
  ('^/api/students/.*', 200, 3600, 'admin'), -- Students: 200/hour for admin
  ('^/api/students/.*', 100, 3600, 'manager'), -- Students: 100/hour for manager
  ('^/api/reports/.*', 20, 3600, NULL), -- Reports: 20/hour for all users
  ('^/api/backup/.*', 5, 86400, 'admin'), -- Backup: 5/day for admin only
  ('^/api/upload/.*', 50, 3600, NULL), -- Upload: 50/hour for all users
  ('^/api/.*', 500, 3600, 'admin') -- Global: 500/hour for admin
ON CONFLICT (endpoint_pattern, user_role) DO NOTHING;

-- Functions for rate limiting and security

-- Function: Check rate limit for endpoint and user
CREATE OR REPLACE FUNCTION check_rate_limit(
  endpoint_path TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule_record RECORD;
  request_count INTEGER;
  user_role_name TEXT;
  result JSONB;
BEGIN
  -- Get user role if user_id provided
  IF user_id IS NOT NULL THEN
    SELECT role INTO user_role_name FROM user_profiles WHERE id = user_id;
  END IF;
  
  -- Find matching rate limit rule
  SELECT * INTO rule_record
  FROM api_rate_limits
  WHERE endpoint_path ~ endpoint_pattern
    AND enabled = true
    AND (user_role IS NULL OR user_role = user_role_name)
  ORDER BY 
    CASE WHEN user_role IS NOT NULL THEN 1 ELSE 2 END, -- Prioritize specific role rules
    length(endpoint_pattern) DESC -- More specific patterns first
  LIMIT 1;
  
  -- If no rule found, allow request
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'endpoint', endpoint_path,
      'current_count', 0,
      'max_requests', 999999,
      'reset_time', (now() + interval '1 hour')::text,
      'is_limited', false
    );
  END IF;
  
  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM api_request_log
  WHERE endpoint_path ~ rule_record.endpoint_pattern
    AND (user_id IS NULL OR api_request_log.user_id = check_rate_limit.user_id)
    AND created_at > (now() - (rule_record.time_window_seconds || ' seconds')::interval);
  
  -- Build result
  result := jsonb_build_object(
    'endpoint', endpoint_path,
    'current_count', request_count,
    'max_requests', rule_record.max_requests,
    'reset_time', (now() + (rule_record.time_window_seconds || ' seconds')::interval)::text,
    'is_limited', request_count >= rule_record.max_requests
  );
  
  -- Log rate limit violation if exceeded
  IF request_count >= rule_record.max_requests THEN
    INSERT INTO security_events (
      event_type, user_id, endpoint, severity, blocked, request_details
    ) VALUES (
      'RATE_LIMIT_EXCEEDED',
      user_id,
      endpoint_path,
      'MEDIUM',
      true,
      jsonb_build_object(
        'current_count', request_count,
        'max_requests', rule_record.max_requests,
        'time_window_seconds', rule_record.time_window_seconds
      )
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function: Record API request
CREATE OR REPLACE FUNCTION record_api_request(
  endpoint_path TEXT,
  user_id UUID DEFAULT NULL,
  request_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_request_log (
    user_id, endpoint_path, request_metadata, ip_address, user_agent
  ) VALUES (
    user_id,
    endpoint_path,
    request_metadata,
    COALESCE(request_metadata->>'ip_address', '127.0.0.1')::inet,
    request_metadata->>'user_agent'
  );
  
  -- Cleanup old logs (keep last 7 days)
  DELETE FROM api_request_log 
  WHERE created_at < (now() - interval '7 days');
END;
$$;

-- Function: Validate session security
CREATE OR REPLACE FUNCTION validate_session_security(session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  issues TEXT[] := '{}';
  result JSONB;
BEGIN
  SELECT * INTO session_record
  FROM user_sessions
  WHERE user_sessions.session_token = validate_session_security.session_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'issues', array['Session not found']
    );
  END IF;
  
  -- Check if session is active
  IF NOT session_record.is_active THEN
    issues := array_append(issues, 'Session is inactive');
  END IF;
  
  -- Check if session has expired
  IF session_record.expires_at < now() THEN
    issues := array_append(issues, 'Session has expired');
    
    -- Deactivate expired session
    UPDATE user_sessions 
    SET is_active = false 
    WHERE id = session_record.id;
  END IF;
  
  -- Check for session timeout (no activity for 24 hours)
  IF session_record.last_activity_at < (now() - interval '24 hours') THEN
    issues := array_append(issues, 'Session timed out due to inactivity');
    
    -- Deactivate timed out session
    UPDATE user_sessions 
    SET is_active = false 
    WHERE id = session_record.id;
    
    -- Log security event
    INSERT INTO security_events (
      event_type, user_id, severity, request_details
    ) VALUES (
      'SESSION_TIMEOUT',
      session_record.user_id,
      'LOW',
      jsonb_build_object('session_id', session_record.id)
    );
  END IF;
  
  result := jsonb_build_object(
    'valid', array_length(issues, 1) IS NULL OR array_length(issues, 1) = 0,
    'issues', issues
  );
  
  -- Add session info if valid
  IF (result->>'valid')::boolean THEN
    result := result || jsonb_build_object(
      'session', row_to_json(session_record)
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function: Terminate user session
CREATE OR REPLACE FUNCTION terminate_user_session(
  session_id UUID,
  termination_reason TEXT DEFAULT 'MANUAL'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT * INTO session_record
  FROM user_sessions
  WHERE id = session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', session_id;
  END IF;
  
  -- Deactivate session
  UPDATE user_sessions 
  SET 
    is_active = false,
    security_flags = security_flags || jsonb_build_object(
      'terminated_at', now(),
      'termination_reason', termination_reason
    )
  WHERE id = session_id;
  
  -- Log security event
  INSERT INTO security_events (
    event_type, user_id, severity, request_details
  ) VALUES (
    'SESSION_TIMEOUT',
    session_record.user_id,
    'LOW',
    jsonb_build_object(
      'session_id', session_id,
      'termination_reason', termination_reason
    )
  );
END;
$$;

-- Function: Check request throttling
CREATE OR REPLACE FUNCTION check_request_throttling(
  endpoint_path TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_requests INTEGER;
  base_delay INTEGER := 0;
  result JSONB;
BEGIN
  -- Count requests in last minute
  SELECT COUNT(*) INTO recent_requests
  FROM api_request_log
  WHERE endpoint_path = check_request_throttling.endpoint_path
    AND (user_id IS NULL OR api_request_log.user_id = check_request_throttling.user_id)
    AND created_at > (now() - interval '1 minute');
  
  -- Calculate throttling delay
  IF recent_requests > 20 THEN
    base_delay := 5000; -- 5 seconds
  ELSIF recent_requests > 10 THEN
    base_delay := 2000; -- 2 seconds
  ELSIF recent_requests > 5 THEN
    base_delay := 1000; -- 1 second
  END IF;
  
  -- Add jitter to prevent thundering herd
  base_delay := base_delay + (random() * 1000)::integer;
  
  result := jsonb_build_object(
    'allowed', base_delay = 0,
    'delay_ms', base_delay
  );
  
  -- Add reason if throttled
  IF base_delay > 0 THEN
    result := result || jsonb_build_object(
      'reason', 'Request frequency too high'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function: Analyze IP address for threats
CREATE OR REPLACE FUNCTION analyze_ip_address(ip_address INET)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analysis_record RECORD;
  recent_events INTEGER;
  result JSONB;
BEGIN
  -- Get or create IP analysis record
  SELECT * INTO analysis_record
  FROM ip_analysis_cache
  WHERE ip_analysis_cache.ip_address = analyze_ip_address.ip_address;
  
  IF NOT FOUND THEN
    INSERT INTO ip_analysis_cache (ip_address)
    VALUES (ip_address)
    RETURNING * INTO analysis_record;
  END IF;
  
  -- Count recent security events from this IP
  SELECT COUNT(*) INTO recent_events
  FROM security_events
  WHERE security_events.ip_address = analyze_ip_address.ip_address
    AND created_at > (now() - interval '1 hour')
    AND severity IN ('HIGH', 'CRITICAL');
  
  -- Update analysis based on recent activity
  IF recent_events > 10 THEN
    UPDATE ip_analysis_cache
    SET 
      is_suspicious = true,
      threat_level = 'CRITICAL',
      blocked = true,
      reason = 'Multiple high-severity security events',
      last_analyzed_at = now(),
      request_count = request_count + 1
    WHERE ip_analysis_cache.ip_address = analyze_ip_address.ip_address
    RETURNING * INTO analysis_record;
  ELSIF recent_events > 5 THEN
    UPDATE ip_analysis_cache
    SET 
      is_suspicious = true,
      threat_level = 'HIGH',
      reason = 'Elevated security event count',
      last_analyzed_at = now(),
      request_count = request_count + 1
    WHERE ip_analysis_cache.ip_address = analyze_ip_address.ip_address
    RETURNING * INTO analysis_record;
  ELSE
    UPDATE ip_analysis_cache
    SET 
      last_analyzed_at = now(),
      request_count = request_count + 1
    WHERE ip_analysis_cache.ip_address = analyze_ip_address.ip_address
    RETURNING * INTO analysis_record;
  END IF;
  
  RETURN jsonb_build_object(
    'is_suspicious', analysis_record.is_suspicious,
    'threat_level', analysis_record.threat_level,
    'blocked', analysis_record.blocked,
    'reason', analysis_record.reason
  );
END;
$$;

-- Function: Get security dashboard statistics
CREATE OR REPLACE FUNCTION get_security_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_limit_violations INTEGER;
  active_sessions INTEGER;
  blocked_requests INTEGER;
  events_by_severity JSONB;
  suspicious_score NUMERIC;
BEGIN
  -- Rate limit violations in last 24 hours
  SELECT COUNT(*) INTO rate_limit_violations
  FROM security_events
  WHERE event_type = 'RATE_LIMIT_EXCEEDED'
    AND created_at > (now() - interval '24 hours');
  
  -- Active sessions count
  SELECT COUNT(*) INTO active_sessions
  FROM user_sessions
  WHERE is_active = true
    AND expires_at > now();
  
  -- Blocked requests in last 24 hours
  SELECT COUNT(*) INTO blocked_requests
  FROM security_events
  WHERE blocked = true
    AND created_at > (now() - interval '24 hours');
  
  -- Security events by severity
  SELECT jsonb_object_agg(severity, event_count) INTO events_by_severity
  FROM (
    SELECT severity, COUNT(*) as event_count
    FROM security_events
    WHERE created_at > (now() - interval '24 hours')
    GROUP BY severity
  ) s;
  
  -- Calculate suspicious activity score (0-100)
  SELECT LEAST(100, 
    (rate_limit_violations * 2) + 
    (blocked_requests * 5) + 
    (COALESCE((events_by_severity->>'CRITICAL')::integer, 0) * 10) +
    (COALESCE((events_by_severity->>'HIGH')::integer, 0) * 5)
  ) INTO suspicious_score;
  
  RETURN jsonb_build_object(
    'rate_limit_violations_24h', rate_limit_violations,
    'active_sessions_count', active_sessions,
    'security_events_by_severity', COALESCE(events_by_severity, '{}'::jsonb),
    'blocked_requests_24h', blocked_requests,
    'suspicious_activity_score', suspicious_score
  );
END;
$$;

-- Function: Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE user_sessions 
  SET is_active = false
  WHERE expires_at < now() 
    AND is_active = true;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Function: Archive old security events
CREATE OR REPLACE FUNCTION archive_old_security_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive events older than 90 days
  DELETE FROM security_events
  WHERE created_at < (now() - interval '90 days');
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Archive old API request logs (keep last 7 days)
  DELETE FROM api_request_log
  WHERE created_at < (now() - interval '7 days');
  
  RETURN archived_count;
END;
$$;

-- RLS Policies

-- API Rate Limits - only admins can manage
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage rate limits"
  ON api_rate_limits FOR ALL
  USING (is_admin());

-- API Request Log - users can see their own requests, admins see all
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own API requests"
  ON api_request_log FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Security Events - admins and managers can view
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can view security events"
  ON security_events FOR SELECT
  USING (is_admin() OR is_manager());

-- User Sessions - users can see their own sessions, admins see all
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own sessions"
  ON user_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

-- IP Analysis Cache - read-only for all authenticated users
ALTER TABLE ip_analysis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read IP analysis"
  ON ip_analysis_cache FOR SELECT
  TO authenticated
  USING (true);

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_api_request(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session_security(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION terminate_user_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_request_throttling(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_ip_address(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_security_events() TO authenticated;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_request_log_endpoint_time 
  ON api_request_log (endpoint_path, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_composite
  ON security_events (event_type, severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_activity
  ON user_sessions (last_activity_at DESC) WHERE is_active = true;

-- Comment the schema
COMMENT ON TABLE api_rate_limits IS 'Rate limiting rules for API endpoints';
COMMENT ON TABLE api_request_log IS 'Log of all API requests for rate limiting and monitoring';
COMMENT ON TABLE security_events IS 'Security-related events and violations';
COMMENT ON TABLE user_sessions IS 'Enhanced session tracking with security metadata';
COMMENT ON TABLE ip_analysis_cache IS 'IP address threat analysis and caching';

COMMENT ON FUNCTION check_rate_limit IS 'Check if request exceeds rate limit for endpoint';
COMMENT ON FUNCTION record_api_request IS 'Record API request for rate limiting and monitoring';
COMMENT ON FUNCTION validate_session_security IS 'Validate session security and activity';
COMMENT ON FUNCTION terminate_user_session IS 'Terminate user session with audit logging';
COMMENT ON FUNCTION check_request_throttling IS 'Check if request should be throttled';
COMMENT ON FUNCTION analyze_ip_address IS 'Analyze IP address for security threats';
COMMENT ON FUNCTION get_security_dashboard_stats IS 'Get security dashboard statistics';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Clean up expired user sessions';
COMMENT ON FUNCTION archive_old_security_events IS 'Archive old security events and logs';