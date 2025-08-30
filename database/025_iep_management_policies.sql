-- IEP Management System - Row Level Security Policies
-- HIPAA/FERPA Compliant Access Control for IEP Data
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE ieps ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_goal_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_progress_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_compliance_alerts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR AUTHORIZATION
-- =============================================================================

-- Function to check if user is an IEP team member for a specific student
CREATE OR REPLACE FUNCTION is_iep_team_member(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM iep_team_members itm
        JOIN ieps i ON itm.iep_id = i.id
        WHERE i.student_id = student_uuid
        AND itm.user_id = auth.uid()
        AND itm.participation_status = 'active'
        AND i.is_current_version = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a student's parent/guardian
CREATE OR REPLACE FUNCTION is_student_parent(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM student_parents sp
        WHERE sp.student_id = student_uuid
        AND sp.parent_id = auth.uid()
        AND sp.can_access_records = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role from profiles
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access student data
CREATE OR REPLACE FUNCTION can_access_student_iep(student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := get_user_role();
    
    -- Admin and managers can access all IEPs
    IF user_role IN ('admin', 'manager') THEN
        RETURN true;
    END IF;
    
    -- IEP team members can access IEPs for their assigned students
    IF is_iep_team_member(student_uuid) THEN
        RETURN true;
    END IF;
    
    -- Parents can access their child's IEP
    IF is_student_parent(student_uuid) THEN
        RETURN true;
    END IF;
    
    -- Special education staff can access all active IEPs
    IF user_role IN ('special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist') THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- IEP DOCUMENTS POLICIES
-- =============================================================================

-- IEP SELECT Policy - Multi-level access control
CREATE POLICY "iep_select_policy" ON ieps
    FOR SELECT TO authenticated
    USING (can_access_student_iep(student_id));

-- IEP INSERT Policy - Only authorized staff can create IEPs
CREATE POLICY "iep_insert_policy" ON ieps
    FOR INSERT TO authenticated
    WITH CHECK (
        get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'school_psychologist')
    );

-- IEP UPDATE Policy - Team members and authorized staff can update
CREATE POLICY "iep_update_policy" ON ieps
    FOR UPDATE TO authenticated
    USING (
        can_access_student_iep(student_id)
        AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'school_psychologist')
        AND status IN ('draft', 'review', 'approved') -- Can't modify active/archived IEPs
    )
    WITH CHECK (
        can_access_student_iep(student_id)
        AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'school_psychologist')
    );

-- IEP DELETE Policy - Only admin can delete (soft delete recommended)
CREATE POLICY "iep_delete_policy" ON ieps
    FOR DELETE TO authenticated
    USING (
        get_user_role() = 'admin'
        AND status = 'draft' -- Only draft IEPs can be deleted
    );

-- =============================================================================
-- IEP GOALS POLICIES
-- =============================================================================

-- Goals SELECT Policy - Follow IEP access rules
CREATE POLICY "iep_goals_select_policy" ON iep_goals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_goals.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Goals INSERT Policy - IEP team members can add goals
CREATE POLICY "iep_goals_insert_policy" ON iep_goals
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_goals.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist')
            AND ieps.status IN ('draft', 'review')
        )
    );

-- Goals UPDATE Policy - Authorized team members can update goals
CREATE POLICY "iep_goals_update_policy" ON iep_goals
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_goals.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_goals.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist')
        )
    );

-- =============================================================================
-- IEP GOAL OBJECTIVES POLICIES
-- =============================================================================

-- Objectives follow goal access rules
CREATE POLICY "iep_objectives_select_policy" ON iep_goal_objectives
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_goal_objectives.goal_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

CREATE POLICY "iep_objectives_insert_policy" ON iep_goal_objectives
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_goal_objectives.goal_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist')
            AND ieps.status IN ('draft', 'review')
        )
    );

CREATE POLICY "iep_objectives_update_policy" ON iep_goal_objectives
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_goal_objectives.goal_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist')
        )
    );

-- =============================================================================
-- IEP PROGRESS DATA POLICIES
-- =============================================================================

-- Progress data SELECT - Team members and parents can view
CREATE POLICY "iep_progress_select_policy" ON iep_progress_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_progress_data.goal_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Progress data INSERT - Service providers can add progress data
CREATE POLICY "iep_progress_insert_policy" ON iep_progress_data
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_progress_data.goal_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher', 'speech_therapist', 'occupational_therapist', 'physical_therapist', 'behavior_specialist', 'general_education_teacher')
        )
    );

-- Progress data UPDATE - Only data collector and supervisors can update
CREATE POLICY "iep_progress_update_policy" ON iep_progress_data
    FOR UPDATE TO authenticated
    USING (
        (collected_by = auth.uid() OR get_user_role() IN ('admin', 'manager'))
        AND EXISTS (
            SELECT 1 FROM iep_goals
            JOIN ieps ON ieps.id = iep_goals.iep_id
            WHERE iep_goals.id = iep_progress_data.goal_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- =============================================================================
-- IEP SERVICES POLICIES
-- =============================================================================

-- Services follow IEP access rules
CREATE POLICY "iep_services_select_policy" ON iep_services
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_services.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

CREATE POLICY "iep_services_insert_policy" ON iep_services
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_services.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
            AND ieps.status IN ('draft', 'review')
        )
    );

CREATE POLICY "iep_services_update_policy" ON iep_services
    FOR UPDATE TO authenticated
    USING (
        (provider_id = auth.uid() OR get_user_role() IN ('admin', 'manager', 'special_education_teacher'))
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_services.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- =============================================================================
-- IEP TEAM MEMBERS POLICIES
-- =============================================================================

-- Team members SELECT - Follow IEP access rules
CREATE POLICY "iep_team_select_policy" ON iep_team_members
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_team_members.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Team members INSERT - IEP coordinators can manage team
CREATE POLICY "iep_team_insert_policy" ON iep_team_members
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_team_members.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
        )
    );

CREATE POLICY "iep_team_update_policy" ON iep_team_members
    FOR UPDATE TO authenticated
    USING (
        (user_id = auth.uid() OR get_user_role() IN ('admin', 'manager', 'special_education_teacher'))
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_team_members.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- =============================================================================
-- IEP MEETINGS POLICIES
-- =============================================================================

-- Meetings follow IEP access rules
CREATE POLICY "iep_meetings_select_policy" ON iep_meetings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_meetings.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

CREATE POLICY "iep_meetings_insert_policy" ON iep_meetings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_meetings.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
        )
    );

CREATE POLICY "iep_meetings_update_policy" ON iep_meetings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_meetings.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
        )
    );

-- =============================================================================
-- IEP MEETING ATTENDANCE POLICIES
-- =============================================================================

-- Attendance follows meeting access rules
CREATE POLICY "meeting_attendance_select_policy" ON iep_meeting_attendance
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iep_meetings im
            JOIN ieps i ON i.id = im.iep_id
            WHERE im.id = iep_meeting_attendance.meeting_id
            AND can_access_student_iep(i.student_id)
        )
    );

CREATE POLICY "meeting_attendance_insert_policy" ON iep_meeting_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM iep_meetings im
            JOIN ieps i ON i.id = im.iep_id
            WHERE im.id = iep_meeting_attendance.meeting_id
            AND can_access_student_iep(i.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
        )
    );

-- =============================================================================
-- IEP APPROVALS POLICIES
-- =============================================================================

-- Approvals SELECT - Team members can see approval status
CREATE POLICY "iep_approvals_select_policy" ON iep_approvals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_approvals.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Approvals INSERT - System can create approval requests
CREATE POLICY "iep_approvals_insert_policy" ON iep_approvals
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_approvals.iep_id
            AND can_access_student_iep(ieps.student_id)
            AND get_user_role() IN ('admin', 'manager', 'special_education_teacher')
        )
    );

-- Approvals UPDATE - Approvers can update their own approvals
CREATE POLICY "iep_approvals_update_policy" ON iep_approvals
    FOR UPDATE TO authenticated
    USING (
        (approver_id = auth.uid() OR get_user_role() IN ('admin', 'manager'))
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_approvals.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- =============================================================================
-- IEP COMPLIANCE ALERTS POLICIES
-- =============================================================================

-- Compliance alerts SELECT - Assigned users and supervisors can view
CREATE POLICY "compliance_alerts_select_policy" ON iep_compliance_alerts
    FOR SELECT TO authenticated
    USING (
        (assigned_to = auth.uid() OR get_user_role() IN ('admin', 'manager'))
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_compliance_alerts.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Compliance alerts INSERT - System and supervisors can create alerts
CREATE POLICY "compliance_alerts_insert_policy" ON iep_compliance_alerts
    FOR INSERT TO authenticated
    WITH CHECK (
        get_user_role() IN ('admin', 'manager', 'system')
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_compliance_alerts.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- Compliance alerts UPDATE - Assigned users and supervisors can update
CREATE POLICY "compliance_alerts_update_policy" ON iep_compliance_alerts
    FOR UPDATE TO authenticated
    USING (
        (assigned_to = auth.uid() OR get_user_role() IN ('admin', 'manager'))
        AND EXISTS (
            SELECT 1 FROM ieps
            WHERE ieps.id = iep_compliance_alerts.iep_id
            AND can_access_student_iep(ieps.student_id)
        )
    );

-- =============================================================================
-- AUDIT FUNCTIONS
-- =============================================================================

-- Function to log IEP data access
CREATE OR REPLACE FUNCTION log_iep_access(
    p_iep_id UUID,
    p_access_type TEXT,
    p_accessed_data TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Log access for audit purposes
    INSERT INTO system_audit_log (
        user_id,
        action_type,
        table_name,
        record_id,
        details,
        created_at
    )
    VALUES (
        auth.uid(),
        p_access_type,
        'ieps',
        p_iep_id,
        jsonb_build_object(
            'accessed_data', p_accessed_data,
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        ),
        CURRENT_TIMESTAMP
    );
EXCEPTION
    WHEN others THEN
        -- Don't fail the main operation if audit logging fails
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_iep_team_member(UUID) IS 'Check if current user is an active IEP team member for the specified student';
COMMENT ON FUNCTION is_student_parent(UUID) IS 'Check if current user is an authorized parent/guardian for the specified student';
COMMENT ON FUNCTION get_user_role() IS 'Get the role of the current authenticated user';
COMMENT ON FUNCTION can_access_student_iep(UUID) IS 'Comprehensive access control check for student IEP data';
COMMENT ON FUNCTION log_iep_access(UUID, TEXT, TEXT) IS 'Audit logging function for IEP data access';

-- End of IEP Management RLS Policies
-- This provides HIPAA/FERPA compliant multi-level access control
-- for all IEP-related data in the Arkan Al-Numo Center system.