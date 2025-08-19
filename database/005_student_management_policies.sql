-- Row Level Security Policies for Student Management System
-- Phase 2: Security policies for student data protection and access control
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_therapy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- =============================================================================

-- Function to check if current user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') = 'admin' OR
      (auth.jwt() ->> 'user_role') = 'manager',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a therapist
CREATE OR REPLACE FUNCTION is_therapist()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') IN ('therapist_lead', 'therapist', 'admin', 'manager'),
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a receptionist
CREATE OR REPLACE FUNCTION is_receptionist()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') IN ('receptionist', 'admin', 'manager'),
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is assigned to a specific student
CREATE OR REPLACE FUNCTION is_assigned_therapist(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM student_therapy_plans stp
    WHERE stp.student_id = student_uuid
    AND (stp.primary_therapist_id = auth.uid() OR stp.secondary_therapist_id = auth.uid())
    AND stp.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a parent of a specific student
CREATE OR REPLACE FUNCTION is_student_parent(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM student_parents sp
    JOIN parents p ON p.id = sp.parent_id
    WHERE sp.student_id = student_uuid
    AND p.email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STUDENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all students"
ON students
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can view students they are assigned to
CREATE POLICY "Therapists can view assigned students"
ON students
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(id) OR
    is_admin()
  )
);

-- Receptionists: Can view and create students for registration
CREATE POLICY "Receptionists can manage students for registration"
ON students
FOR ALL
TO authenticated
USING (is_receptionist());

-- Parents: Can view their own children's basic information
CREATE POLICY "Parents can view their children"
ON students
FOR SELECT
TO authenticated
USING (is_student_parent(id));

-- Therapists can update students they are assigned to (limited fields)
CREATE POLICY "Therapists can update assigned students"
ON students
FOR UPDATE
TO authenticated
USING (
  is_therapist() AND is_assigned_therapist(id)
)
WITH CHECK (
  is_therapist() AND is_assigned_therapist(id)
);

-- =============================================================================
-- PARENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all parents"
ON parents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage parents for registration
CREATE POLICY "Receptionists can manage parents"
ON parents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view parents of their assigned students
CREATE POLICY "Therapists can view parents of assigned students"
ON parents
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    EXISTS (
      SELECT 1 FROM student_parents sp
      WHERE sp.parent_id = parents.id
      AND is_assigned_therapist(sp.student_id)
    ) OR is_admin()
  )
);

-- Parents: Can view and update their own information
CREATE POLICY "Parents can manage their own information"
ON parents
FOR ALL
TO authenticated
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- =============================================================================
-- STUDENT_PARENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student-parent relationships"
ON student_parents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage relationships for registration
CREATE POLICY "Receptionists can manage student-parent relationships"
ON student_parents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view relationships for their assigned students
CREATE POLICY "Therapists can view student-parent relationships for assigned students"
ON student_parents
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view relationships for their children
CREATE POLICY "Parents can view their relationships with children"
ON student_parents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parents p
    WHERE p.id = parent_id AND p.email = auth.email()
  )
);

-- =============================================================================
-- EMERGENCY_CONTACTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all emergency contacts"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage emergency contacts
CREATE POLICY "Receptionists can manage emergency contacts"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view emergency contacts for assigned students
CREATE POLICY "Therapists can view emergency contacts for assigned students"
ON emergency_contacts
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view and manage emergency contacts for their children
CREATE POLICY "Parents can manage emergency contacts for their children"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_student_parent(student_id))
WITH CHECK (is_student_parent(student_id));

-- =============================================================================
-- STUDENT_DOCUMENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student documents"
ON student_documents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage documents for registration
CREATE POLICY "Receptionists can manage student documents"
ON student_documents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view and upload documents for assigned students
CREATE POLICY "Therapists can manage documents for assigned students"
ON student_documents
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view documents that are not confidential for their children
CREATE POLICY "Parents can view non-confidential documents for their children"
ON student_documents
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  (is_confidential = false OR NOT requires_authorization)
);

-- Parents: Can upload certain types of documents for their children
CREATE POLICY "Parents can upload documents for their children"
ON student_documents
FOR INSERT
TO authenticated
WITH CHECK (
  is_student_parent(student_id) AND
  document_type IN ('medical_report', 'educational_report', 'other')
);

-- =============================================================================
-- MEDICAL_HISTORY TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all medical history"
ON medical_history
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can view and update medical history for assigned students
CREATE POLICY "Therapists can manage medical history for assigned students"
ON medical_history
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Receptionists: Can view medical history for registration purposes
CREATE POLICY "Receptionists can view medical history"
ON medical_history
FOR SELECT
TO authenticated
USING (is_receptionist());

-- Parents: Can view non-sensitive medical history for their children
CREATE POLICY "Parents can view medical history for their children"
ON medical_history
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  NOT requires_immediate_attention
);

-- =============================================================================
-- STUDENT_THERAPY_PLANS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student therapy plans"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can manage therapy plans for their assigned students
CREATE POLICY "Therapists can manage therapy plans for assigned students"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    primary_therapist_id = auth.uid() OR
    secondary_therapist_id = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    primary_therapist_id = auth.uid() OR
    secondary_therapist_id = auth.uid() OR
    is_admin()
  )
);

-- Receptionists: Can view and assign therapy plans
CREATE POLICY "Receptionists can manage therapy plan assignments"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (is_receptionist());

-- Parents: Can view therapy plans for their children (limited information)
CREATE POLICY "Parents can view therapy plans for their children"
ON student_therapy_plans
FOR SELECT
TO authenticated
USING (is_student_parent(student_id));

-- =============================================================================
-- STUDENT_ASSESSMENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student assessments"
ON student_assessments
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can manage assessments for their assigned students
CREATE POLICY "Therapists can manage assessments for assigned students"
ON student_assessments
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    conducted_by = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    conducted_by = auth.uid() OR
    is_admin()
  )
);

-- Receptionists: Can view assessments for scheduling and coordination
CREATE POLICY "Receptionists can view student assessments"
ON student_assessments
FOR SELECT
TO authenticated
USING (is_receptionist());

-- Parents: Can view assessment results for their children
CREATE POLICY "Parents can view assessments for their children"
ON student_assessments
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  status = 'completed'
);

-- =============================================================================
-- SPECIAL POLICIES FOR DATA PRIVACY
-- =============================================================================

-- Ensure users can only see their own authentication data
CREATE POLICY "Users can only see their own auth data"
ON auth.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- =============================================================================
-- FUNCTIONS FOR AUDIT LOGGING
-- =============================================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_role TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Function to log sensitive data changes
CREATE OR REPLACE FUNCTION log_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to sensitive tables
    IF TG_TABLE_NAME IN ('students', 'medical_history', 'student_documents') THEN
        INSERT INTO audit_logs (
            table_name,
            operation,
            record_id,
            old_data,
            new_data,
            user_id,
            user_role
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid(),
            (auth.jwt() ->> 'user_role')
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_students_changes
    AFTER INSERT OR UPDATE OR DELETE ON students
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

CREATE TRIGGER audit_medical_history_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_history
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

CREATE TRIGGER audit_student_documents_changes
    AFTER INSERT OR UPDATE OR DELETE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin or manager role';
COMMENT ON FUNCTION is_therapist() IS 'Check if current user has therapist role';
COMMENT ON FUNCTION is_receptionist() IS 'Check if current user has receptionist role';
COMMENT ON FUNCTION is_assigned_therapist(UUID) IS 'Check if current user is assigned as therapist to specific student';
COMMENT ON FUNCTION is_student_parent(UUID) IS 'Check if current user is parent of specific student';
COMMENT ON FUNCTION log_sensitive_changes() IS 'Audit function to log changes to sensitive data';

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive data changes and access';

-- End of Student Management Security Policies
-- These policies ensure proper data access control and privacy protection
-- for student information in compliance with healthcare data regulations