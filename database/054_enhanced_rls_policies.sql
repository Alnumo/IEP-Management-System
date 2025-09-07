-- =====================================================================
-- Migration 54: Enhanced Row Level Security Policies
-- Story 1.2: Security Compliance & Data Protection - Task 4
-- Implements comprehensive RLS policies for medical data access control
-- =====================================================================

-- =============================================================================
-- MEDICAL RECORDS ACCESS CONTROL
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS medical_records_read_policy ON medical_records;
DROP POLICY IF EXISTS medical_records_insert_policy ON medical_records;
DROP POLICY IF EXISTS medical_records_update_policy ON medical_records;
DROP POLICY IF EXISTS medical_records_delete_policy ON medical_records;

-- Enable RLS on medical_records if not already enabled
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Policy: Read access - Role-based with therapy center isolation
CREATE POLICY medical_records_read_policy ON medical_records
    FOR SELECT TO authenticated
    USING (
        -- Admin and Manager have full access
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
        OR
        -- Therapist Lead can access records for their therapy center
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN students s ON s.id = medical_records.student_id
            WHERE u.id = auth.uid() 
            AND up.role = 'therapist_lead'
            AND s.therapy_center_id = up.therapy_center_id
        )
        OR
        -- Therapists can access only their assigned students
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN student_therapist_assignments sta ON sta.therapist_id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role = 'therapist'
            AND sta.student_id = medical_records.student_id
            AND sta.is_active = true
        )
        OR
        -- Emergency medical access (logged separately)
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager', 'therapist_lead')
            AND up.emergency_medical_access = true
        )
    );

-- Policy: Insert access - Only authorized medical personnel
CREATE POLICY medical_records_insert_policy ON medical_records
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager', 'therapist_lead')
            AND up.medical_data_entry_authorized = true
        )
        AND
        -- Ensure user has access to the therapy center
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN students s ON s.id = medical_records.student_id
            WHERE u.id = auth.uid() 
            AND (
                up.role IN ('admin', 'manager') OR
                s.therapy_center_id = up.therapy_center_id
            )
        )
    );

-- Policy: Update access - Strict modification controls
CREATE POLICY medical_records_update_policy ON medical_records
    FOR UPDATE TO authenticated
    USING (
        -- Same read access requirements
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager', 'therapist_lead')
            AND up.medical_data_modify_authorized = true
        )
        AND
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN students s ON s.id = medical_records.student_id
            WHERE u.id = auth.uid() 
            AND (
                up.role IN ('admin', 'manager') OR
                s.therapy_center_id = up.therapy_center_id
            )
        )
    )
    WITH CHECK (
        -- Prevent unauthorized changes to sensitive fields
        (
            OLD.encryption_key_id = NEW.encryption_key_id OR
            EXISTS (
                SELECT 1 FROM auth.users u
                JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = auth.uid() AND up.role = 'admin'
            )
        )
        AND
        -- Ensure data classification cannot be downgraded
        (
            CASE NEW.data_classification
                WHEN 'public' THEN OLD.data_classification IN ('public')
                WHEN 'internal' THEN OLD.data_classification IN ('public', 'internal')
                WHEN 'confidential' THEN OLD.data_classification IN ('public', 'internal', 'confidential')
                WHEN 'restricted' THEN true
                ELSE false
            END
        )
    );

-- Policy: Delete access - Admin only with audit trail
CREATE POLICY medical_records_delete_policy ON medical_records
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role = 'admin'
            AND up.medical_data_delete_authorized = true
        )
    );

-- =============================================================================
-- STUDENTS TABLE ENHANCED SECURITY
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS students_read_policy ON students;
DROP POLICY IF EXISTS students_insert_policy ON students;
DROP POLICY IF EXISTS students_update_policy ON students;

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Read access with therapy center isolation
CREATE POLICY students_read_policy ON students
    FOR SELECT TO authenticated
    USING (
        -- Admin and Manager have full access
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
        OR
        -- Users can only access students from their therapy center
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.therapy_center_id = students.therapy_center_id
        )
        OR
        -- Parents can access their own children
        EXISTS (
            SELECT 1 FROM parent_student_relationships psr
            WHERE psr.parent_user_id = auth.uid()
            AND psr.student_id = students.id
            AND psr.is_active = true
        )
    );

-- Policy: Insert access - Role-based with center validation
CREATE POLICY students_insert_policy ON students
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager', 'receptionist')
            AND (
                up.role IN ('admin', 'manager') OR
                up.therapy_center_id = students.therapy_center_id
            )
        )
    );

-- Policy: Update access - Controlled modifications
CREATE POLICY students_update_policy ON students
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND (
                up.role IN ('admin', 'manager') OR
                (up.role IN ('therapist_lead', 'receptionist') AND up.therapy_center_id = students.therapy_center_id)
            )
        )
    )
    WITH CHECK (
        -- Prevent unauthorized changes to therapy center assignment
        (
            OLD.therapy_center_id = NEW.therapy_center_id OR
            EXISTS (
                SELECT 1 FROM auth.users u
                JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = auth.uid() AND up.role IN ('admin', 'manager')
            )
        )
    );

-- =============================================================================
-- THERAPY SESSIONS SECURITY
-- =============================================================================

-- Enable RLS on therapy_sessions table
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Read access - Student-therapist relationship based
CREATE POLICY therapy_sessions_read_policy ON therapy_sessions
    FOR SELECT TO authenticated
    USING (
        -- Admin and Manager have full access
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
        OR
        -- Therapists can access their own sessions
        therapy_sessions.therapist_id = auth.uid()
        OR
        -- Therapist Lead can access sessions in their center
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN students s ON s.id = therapy_sessions.student_id
            WHERE u.id = auth.uid() 
            AND up.role = 'therapist_lead'
            AND s.therapy_center_id = up.therapy_center_id
        )
        OR
        -- Parents can access their children's sessions
        EXISTS (
            SELECT 1 FROM parent_student_relationships psr
            WHERE psr.parent_user_id = auth.uid()
            AND psr.student_id = therapy_sessions.student_id
            AND psr.is_active = true
        )
    );

-- =============================================================================
-- USER PROFILES SECURITY
-- =============================================================================

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile and admins can read all
CREATE POLICY user_profiles_read_policy ON user_profiles
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
    );

-- Policy: Only admins and the user themselves can update profiles
CREATE POLICY user_profiles_update_policy ON user_profiles
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role = 'admin'
        )
    )
    WITH CHECK (
        -- Prevent users from escalating their own roles
        (
            user_id = auth.uid() AND OLD.role = NEW.role
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- =============================================================================
-- ASSESSMENTS SECURITY
-- =============================================================================

-- Enable RLS on assessments table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assessments') THEN
        ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
        
        -- Policy: Assessment access based on student access
        CREATE POLICY assessments_read_policy ON assessments
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM students s
                    WHERE s.id = assessments.student_id
                    -- Reuse student access logic
                    AND (
                        EXISTS (
                            SELECT 1 FROM auth.users u
                            JOIN user_profiles up ON u.id = up.user_id
                            WHERE u.id = auth.uid() 
                            AND up.role IN ('admin', 'manager')
                        )
                        OR
                        EXISTS (
                            SELECT 1 FROM auth.users u
                            JOIN user_profiles up ON u.id = up.user_id
                            WHERE u.id = auth.uid() 
                            AND up.therapy_center_id = s.therapy_center_id
                        )
                    )
                )
            );
    END IF;
END $$;

-- =============================================================================
-- BACKUP AND AUDIT POLICIES
-- =============================================================================

-- Enable RLS on backup_codes table (for 2FA)
ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own backup codes
CREATE POLICY backup_codes_user_policy ON backup_codes
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Enable RLS on user_2fa_settings table
ALTER TABLE user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own 2FA settings
CREATE POLICY user_2fa_settings_policy ON user_2fa_settings
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Admins can manage 2FA for emergency access
CREATE POLICY user_2fa_settings_admin_policy ON user_2fa_settings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = auth.uid() 
            AND up.role = 'admin'
            AND up.emergency_2fa_management = true
        )
    );

-- =============================================================================
-- FUNCTION-BASED SECURITY HELPERS
-- =============================================================================

-- Function to check if user can access encrypted data
CREATE OR REPLACE FUNCTION can_access_encrypted_data(
    record_id UUID,
    data_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    therapy_center_id UUID;
    has_access BOOLEAN := false;
BEGIN
    -- Get current user role and therapy center
    SELECT up.role, up.therapy_center_id 
    INTO user_role, therapy_center_id
    FROM auth.users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = auth.uid();
    
    -- Admin and Manager always have access
    IF user_role IN ('admin', 'manager') THEN
        RETURN true;
    END IF;
    
    -- Check data type specific access
    CASE data_type
        WHEN 'medical_records' THEN
            -- Check if user has access to the student's medical records
            SELECT EXISTS (
                SELECT 1 FROM medical_records mr
                JOIN students s ON s.id = mr.student_id
                WHERE mr.id = record_id
                AND (
                    therapy_center_id = s.therapy_center_id OR
                    EXISTS (
                        SELECT 1 FROM student_therapist_assignments sta
                        WHERE sta.student_id = s.id
                        AND sta.therapist_id = auth.uid()
                        AND sta.is_active = true
                    )
                )
            ) INTO has_access;
            
        WHEN 'student_records' THEN
            -- Check student access
            SELECT EXISTS (
                SELECT 1 FROM students s
                WHERE s.id = record_id
                AND therapy_center_id = s.therapy_center_id
            ) INTO has_access;
            
        ELSE
            has_access := false;
    END CASE;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for emergency medical access (with audit)
CREATE OR REPLACE FUNCTION emergency_medical_access(
    requesting_user_id UUID,
    target_table TEXT,
    reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    emergency_authorized BOOLEAN := false;
BEGIN
    -- Check if user is authorized for emergency access
    SELECT up.role, up.emergency_medical_access
    INTO user_role, emergency_authorized
    FROM user_profiles up
    WHERE up.user_id = requesting_user_id;
    
    -- Only certain roles can have emergency access
    IF user_role NOT IN ('admin', 'manager', 'therapist_lead') OR NOT emergency_authorized THEN
        RETURN false;
    END IF;
    
    -- Log the emergency access
    INSERT INTO enhanced_audit_logs (
        event_type, action, table_name, user_id, is_emergency_access, access_purpose
    ) VALUES (
        'emergency_access', 'emergency_medical_access', target_table, 
        requesting_user_id, true, reason
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Create indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_center ON user_profiles(role, therapy_center_id);
CREATE INDEX IF NOT EXISTS idx_students_therapy_center ON students(therapy_center_id);
CREATE INDEX IF NOT EXISTS idx_student_therapist_assignments_active ON student_therapist_assignments(student_id, therapist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_parent_student_relationships_active ON parent_student_relationships(parent_user_id, student_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_therapist_student ON therapy_sessions(therapist_id, student_id);

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY medical_records_read_policy ON medical_records IS 'Role-based read access to medical records with therapy center isolation and emergency access provisions';
COMMENT ON POLICY students_read_policy ON students IS 'Therapy center-based access control for student records with parent access for their children';
COMMENT ON FUNCTION can_access_encrypted_data IS 'Validates user permission to access encrypted data based on role and relationships';
COMMENT ON FUNCTION emergency_medical_access IS 'Provides emergency medical access with comprehensive audit logging for HIPAA compliance';

-- =============================================================================
-- RLS VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate RLS policy effectiveness
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    test_result TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity,
        COALESCE(p.policy_count, 0)::INTEGER,
        CASE 
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'SECURED'
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS_ENABLED_NO_POLICIES'
            ELSE 'NOT_SECURED'
        END::TEXT
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            schemaname, tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        GROUP BY schemaname, tablename
    ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'medical_records', 'students', 'therapy_sessions', 
        'user_profiles', 'assessments', 'backup_codes', 
        'user_2fa_settings', 'encryption_keys', 'enhanced_audit_logs'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;