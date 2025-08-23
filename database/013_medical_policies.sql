-- =====================================================================
-- Migration 13: Medical Foundation Security Policies
-- Phase 1: Healthcare-grade security and compliance policies
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY FOR MEDICAL TABLES
-- =============================================================================

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_supervision_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ENHANCED HELPER FUNCTIONS FOR MEDICAL ACCESS CONTROL
-- =============================================================================

-- Function to check if current user is a medical consultant
CREATE OR REPLACE FUNCTION is_medical_consultant()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM medical_consultants mc
    WHERE mc.status = 'active'
    AND (
      -- Check if user is linked to a therapist who is a medical consultant
      EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
      OR
      -- Check if user email matches consultant email
      mc.email = auth.email()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has medical supervision access to student
CREATE OR REPLACE FUNCTION has_medical_supervision_access(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM medical_supervision_assignments msa
    JOIN medical_consultants mc ON mc.id = msa.medical_consultant_id
    WHERE msa.student_id = student_uuid
    AND msa.status = 'active'
    AND (
      -- User is the medical consultant
      EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
      OR mc.email = auth.email()
      OR is_admin()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific medical record
CREATE OR REPLACE FUNCTION can_access_medical_record(record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  student_id_var UUID;
BEGIN
  -- Get student ID from medical record
  SELECT mr.student_id INTO student_id_var
  FROM medical_records mr
  WHERE mr.id = record_id;
  
  -- Check access permissions
  RETURN (
    is_admin() OR
    is_medical_consultant() OR
    has_medical_supervision_access(student_id_var) OR
    is_assigned_therapist(student_id_var)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create/modify clinical documentation
CREATE OR REPLACE FUNCTION can_modify_clinical_docs(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    is_admin() OR
    is_medical_consultant() OR
    has_medical_supervision_access(student_uuid) OR
    is_assigned_therapist(student_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MEDICAL RECORDS POLICIES
-- =============================================================================

-- Admins: Full access to all medical records
CREATE POLICY "Admins can manage all medical records"
ON medical_records
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Access to records they supervise
CREATE POLICY "Medical consultants can access supervised records"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Medical consultants: Can update records they supervise
CREATE POLICY "Medical consultants can update supervised records"
ON medical_records
FOR UPDATE
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
)
WITH CHECK (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Medical consultants: Can create new medical records
CREATE POLICY "Medical consultants can create medical records"
ON medical_records
FOR INSERT
TO authenticated
WITH CHECK (
  is_medical_consultant() OR is_admin()
);

-- Therapists: Limited read access to assigned students' medical records
CREATE POLICY "Therapists can view basic medical info for assigned students"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    is_admin()
  )
);

-- Receptionists: Very limited access for registration purposes only
CREATE POLICY "Receptionists can view basic medical info for registration"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_receptionist() AND
  data_classification IN ('public', 'internal')
);

-- =============================================================================
-- MEDICAL CONSULTANTS POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all medical consultants"
ON medical_consultants
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Can view colleague information
CREATE POLICY "Medical consultants can view colleague information"
ON medical_consultants
FOR SELECT
TO authenticated
USING (is_medical_consultant() OR is_admin());

-- Medical consultants: Can update their own profile
CREATE POLICY "Medical consultants can update own profile"
ON medical_consultants
FOR UPDATE
TO authenticated
USING (
  email = auth.email() OR
  EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = therapist_id 
    AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  email = auth.email() OR
  EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = therapist_id 
    AND t.user_id = auth.uid()
  )
);

-- Therapists and staff: Can view active consultants for referrals
CREATE POLICY "Staff can view active medical consultants"
ON medical_consultants
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    is_therapist() OR 
    is_receptionist() OR 
    is_admin()
  )
);

-- =============================================================================
-- CLINICAL DOCUMENTATION POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all clinical documentation"
ON clinical_documentation
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Full access to documentation they supervise
CREATE POLICY "Medical consultants can manage supervised clinical docs"
ON clinical_documentation
FOR ALL
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    medical_consultant_id IN (
      SELECT mc.id FROM medical_consultants mc
      WHERE mc.email = auth.email()
      OR EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
    ) OR
    is_admin()
  )
)
WITH CHECK (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Therapists: Can create and view documentation for assigned students
CREATE POLICY "Therapists can manage clinical docs for assigned students"
ON clinical_documentation
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    created_by = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    is_admin()
  )
);

-- Receptionists: Limited view access for scheduling coordination
CREATE POLICY "Receptionists can view clinical docs for coordination"
ON clinical_documentation
FOR SELECT
TO authenticated
USING (
  is_receptionist() AND
  status IN ('reviewed', 'approved', 'finalized')
);

-- Parents: Very limited access to finalized, non-confidential notes
CREATE POLICY "Parents can view approved clinical summaries for their children"
ON clinical_documentation
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  status = 'finalized' AND
  documentation_type = 'progress_note'
);

-- =============================================================================
-- MEDICAL SUPERVISION ASSIGNMENTS POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all supervision assignments"
ON medical_supervision_assignments
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Can view their own assignments
CREATE POLICY "Medical consultants can view their assignments"
ON medical_supervision_assignments
FOR SELECT
TO authenticated
USING (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  ) OR is_admin()
);

-- Medical consultants: Can update their own assignment details
CREATE POLICY "Medical consultants can update their assignment details"
ON medical_supervision_assignments
FOR UPDATE
TO authenticated
USING (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  )
);

-- Therapists: Can view assignments related to their students
CREATE POLICY "Therapists can view supervision for their students"
ON medical_supervision_assignments
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    (student_id IS NOT NULL AND is_assigned_therapist(student_id)) OR
    (therapist_id IN (
      SELECT t.id FROM therapists t WHERE t.user_id = auth.uid()
    )) OR
    is_admin()
  )
);

-- =============================================================================
-- ENHANCED AUDIT LOGGING FOR MEDICAL DATA
-- =============================================================================

-- Enhanced audit function for medical data
CREATE OR REPLACE FUNCTION log_medical_data_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to all medical tables with enhanced details
    INSERT INTO audit_logs (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        user_id,
        user_role,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        (auth.jwt() ->> 'user_role'),
        (current_setting('request.headers', true)::json ->> 'x-forwarded-for'),
        (current_setting('request.headers', true)::json ->> 'user-agent')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply enhanced audit triggers to medical tables
CREATE TRIGGER audit_medical_records_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

CREATE TRIGGER audit_medical_consultants_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_consultants
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

CREATE TRIGGER audit_clinical_documentation_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinical_documentation
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

-- =============================================================================
-- DATA ENCRYPTION POLICIES
-- =============================================================================

-- Function to check if user can access encrypted medical data
CREATE OR REPLACE FUNCTION can_access_encrypted_data(record_id UUID, data_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only medical consultants and admins can access encrypted medical data
  RETURN (
    is_admin() OR
    (is_medical_consultant() AND data_type = 'medical_record') OR
    (is_medical_consultant() AND data_type = 'clinical_documentation')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMPLIANCE AND REPORTING FUNCTIONS
-- =============================================================================

-- Function to get medical record access log for compliance reporting
CREATE OR REPLACE FUNCTION get_medical_access_log(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  access_date TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_role TEXT,
  table_accessed TEXT,
  record_id UUID,
  operation TEXT,
  ip_address TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins and medical consultants can access audit logs
  IF NOT (is_admin() OR is_medical_consultant()) THEN
    RAISE EXCEPTION 'Insufficient permissions to access audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.timestamp,
    al.user_id,
    al.user_role,
    al.table_name,
    al.record_id,
    al.operation,
    al.ip_address
  FROM audit_logs al
  WHERE al.timestamp >= start_date
    AND al.timestamp <= end_date + INTERVAL '1 day'
    AND al.table_name IN ('medical_records', 'clinical_documentation', 'medical_consultants')
  ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BACKUP AND RECOVERY POLICIES
-- =============================================================================

-- Function to create secure medical data backup
CREATE OR REPLACE FUNCTION create_medical_backup()
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  backup_id TEXT;
BEGIN
  -- Only admins can create backups
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create medical data backups';
  END IF;
  
  backup_id := 'BACKUP-' || EXTRACT(EPOCH FROM NOW())::TEXT;
  
  -- Log the backup creation
  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    new_data,
    user_id,
    user_role
  ) VALUES (
    'system_backup',
    'CREATE',
    gen_random_uuid(),
    jsonb_build_object('backup_id', backup_id, 'timestamp', NOW()),
    auth.uid(),
    'admin'
  );
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANT PERMISSIONS FOR MEDICAL FUNCTIONS
-- =============================================================================

-- Grant execute permissions on medical functions
GRANT EXECUTE ON FUNCTION is_medical_consultant() TO authenticated;
GRANT EXECUTE ON FUNCTION has_medical_supervision_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_medical_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify_clinical_docs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_encrypted_data(UUID, TEXT) TO authenticated;

-- Grant limited access to audit functions
GRANT EXECUTE ON FUNCTION get_medical_access_log(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_medical_backup() TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_medical_consultant() IS 'Check if current user is an active medical consultant';
COMMENT ON FUNCTION has_medical_supervision_access(UUID) IS 'Check if user has medical supervision access to specific student';
COMMENT ON FUNCTION can_access_medical_record(UUID) IS 'Check if user can access specific medical record';
COMMENT ON FUNCTION can_modify_clinical_docs(UUID) IS 'Check if user can create/modify clinical documentation for student';
COMMENT ON FUNCTION log_medical_data_changes() IS 'Enhanced audit logging for medical data with IP and user agent tracking';
COMMENT ON FUNCTION get_medical_access_log(DATE, DATE) IS 'Generate compliance report of medical data access';
COMMENT ON FUNCTION create_medical_backup() IS 'Create secure backup of medical data (admin only)';

-- =============================================================================
-- EMERGENCY ACCESS PROCEDURES
-- =============================================================================

-- Function for emergency medical data access
CREATE OR REPLACE FUNCTION emergency_medical_access(
  student_uuid UUID,
  emergency_reason TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  medical_data JSONB;
  emergency_log_id UUID;
BEGIN
  -- Log emergency access attempt
  emergency_log_id := gen_random_uuid();
  
  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    new_data,
    user_id,
    user_role
  ) VALUES (
    'emergency_access',
    'EMERGENCY_ACCESS',
    emergency_log_id,
    jsonb_build_object(
      'student_id', student_uuid,
      'reason', emergency_reason,
      'timestamp', NOW(),
      'user_id', auth.uid()
    ),
    auth.uid(),
    COALESCE((auth.jwt() ->> 'user_role'), 'unknown')
  );
  
  -- Return essential medical information for emergencies
  SELECT jsonb_build_object(
    'allergies', mr.allergies,
    'emergency_protocol', mr.emergency_protocol,
    'blood_type', mr.blood_type,
    'emergency_contact_name', mr.emergency_medical_contact_name_ar,
    'emergency_contact_phone', mr.emergency_medical_contact_phone,
    'current_medications', mr.current_medications,
    'contraindications', mr.contraindications_ar
  ) INTO medical_data
  FROM medical_records mr
  WHERE mr.student_id = student_uuid;
  
  RETURN COALESCE(medical_data, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION emergency_medical_access(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION emergency_medical_access(UUID, TEXT) IS 'Emergency access to critical medical information with full audit logging';

-- Success message
SELECT 'Medical Foundation Security Policies created successfully!' as status;