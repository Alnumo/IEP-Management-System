-- =====================================================
-- Row Level Security (RLS) Policies for Scheduling System
-- Story 3.1: Automated Scheduling Engine
-- =====================================================

-- =====================================================
-- Enable RLS on All Scheduling Tables
-- =====================================================

ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper Functions for Role-Based Access
-- =====================================================

-- Function to get user role from auth metadata
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        auth.jwt() ->> 'user_role',
        (auth.jwt() -> 'user_metadata' ->> 'role'),
        'receptionist'  -- default role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's therapist ID if they are a therapist
CREATE OR REPLACE FUNCTION get_user_therapist_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'therapist_id')::UUID,
        (SELECT id FROM therapists WHERE user_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage specific therapist data
CREATE OR REPLACE FUNCTION can_manage_therapist_data(p_therapist_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_therapist_id UUID;
BEGIN
    user_role := get_user_role();
    user_therapist_id := get_user_therapist_id();
    
    -- Admins and managers can manage all therapist data
    IF user_role IN ('admin', 'manager') THEN
        RETURN TRUE;
    END IF;
    
    -- Therapist leads can manage therapist data in their department/team
    IF user_role = 'therapist_lead' THEN
        -- Check if the therapist is in the same department or team
        RETURN EXISTS (
            SELECT 1 FROM therapists t1, therapists t2
            WHERE t1.id = user_therapist_id
            AND t2.id = p_therapist_id
            AND COALESCE(t1.department_id, t1.team_id) = COALESCE(t2.department_id, t2.team_id)
        );
    END IF;
    
    -- Therapists can only manage their own data
    IF user_role = 'therapist' THEN
        RETURN user_therapist_id = p_therapist_id;
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view specific student data
CREATE OR REPLACE FUNCTION can_view_student_data(p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_therapist_id UUID;
BEGIN
    user_role := get_user_role();
    user_therapist_id := get_user_therapist_id();
    
    -- Admins and managers can view all student data
    IF user_role IN ('admin', 'manager') THEN
        RETURN TRUE;
    END IF;
    
    -- Therapists can view data for students they treat
    IF user_role IN ('therapist', 'therapist_lead') THEN
        RETURN EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.therapist_id = user_therapist_id
            AND EXISTS (
                SELECT 1 FROM student_subscriptions sub
                WHERE sub.id = ss.student_subscription_id
                AND sub.student_id = p_student_id
            )
        );
    END IF;
    
    -- Receptionists can view basic scheduling data
    IF user_role = 'receptionist' THEN
        RETURN TRUE;
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Therapist Availability RLS Policies
-- =====================================================

-- Policy: Admins and managers can view all availability
CREATE POLICY "admin_manager_view_all_availability" ON therapist_availability
    FOR SELECT
    USING (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can view and edit their own availability
CREATE POLICY "therapist_own_availability" ON therapist_availability
    FOR ALL
    USING (can_manage_therapist_data(therapist_id))
    WITH CHECK (can_manage_therapist_data(therapist_id));

-- Policy: Therapist leads can view availability in their team/department
CREATE POLICY "therapist_lead_team_availability" ON therapist_availability
    FOR SELECT
    USING (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    );

-- Policy: Receptionists can view availability for scheduling purposes
CREATE POLICY "receptionist_view_availability" ON therapist_availability
    FOR SELECT
    USING (get_user_role() = 'receptionist');

-- =====================================================
-- Schedule Templates RLS Policies
-- =====================================================

-- Policy: Admins and managers can manage all templates
CREATE POLICY "admin_manager_all_templates" ON schedule_templates
    FOR ALL
    USING (get_user_role() IN ('admin', 'manager'))
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can view all templates but only edit their preferred ones
CREATE POLICY "therapist_view_templates" ON schedule_templates
    FOR SELECT
    USING (get_user_role() IN ('therapist', 'therapist_lead', 'receptionist'));

CREATE POLICY "therapist_edit_preferred_templates" ON schedule_templates
    FOR UPDATE
    USING (
        preferred_therapist_id = get_user_therapist_id() AND
        get_user_role() IN ('therapist', 'therapist_lead')
    )
    WITH CHECK (
        preferred_therapist_id = get_user_therapist_id() AND
        get_user_role() IN ('therapist', 'therapist_lead')
    );

-- =====================================================
-- Scheduled Sessions RLS Policies
-- =====================================================

-- Policy: Admins and managers can view and manage all sessions
CREATE POLICY "admin_manager_all_sessions" ON scheduled_sessions
    FOR ALL
    USING (get_user_role() IN ('admin', 'manager'))
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can view and manage their own sessions
CREATE POLICY "therapist_own_sessions" ON scheduled_sessions
    FOR ALL
    USING (therapist_id = get_user_therapist_id())
    WITH CHECK (therapist_id = get_user_therapist_id());

-- Policy: Therapist leads can view sessions in their team/department
CREATE POLICY "therapist_lead_team_sessions" ON scheduled_sessions
    FOR SELECT
    USING (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    );

-- Policy: Receptionists can view and manage sessions for scheduling
CREATE POLICY "receptionist_manage_sessions" ON scheduled_sessions
    FOR ALL
    USING (get_user_role() = 'receptionist')
    WITH CHECK (get_user_role() = 'receptionist');

-- Policy: Parents can view their child's sessions (read-only)
CREATE POLICY "parent_view_child_sessions" ON scheduled_sessions
    FOR SELECT
    USING (
        get_user_role() = 'parent' AND
        EXISTS (
            SELECT 1 FROM student_subscriptions ss
            JOIN students s ON ss.student_id = s.id
            WHERE ss.id = scheduled_sessions.student_subscription_id
            AND s.parent_user_id = auth.uid()
        )
    );

-- =====================================================
-- Schedule Conflicts RLS Policies
-- =====================================================

-- Policy: Admins and managers can view and resolve all conflicts
CREATE POLICY "admin_manager_all_conflicts" ON schedule_conflicts
    FOR ALL
    USING (get_user_role() IN ('admin', 'manager'))
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can view conflicts related to their sessions
CREATE POLICY "therapist_related_conflicts" ON schedule_conflicts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.id IN (primary_session_id, conflicting_session_id)
            AND ss.therapist_id = get_user_therapist_id()
        )
    );

-- Policy: Therapist leads can view and resolve conflicts in their team
CREATE POLICY "therapist_lead_team_conflicts" ON schedule_conflicts
    FOR ALL
    USING (
        get_user_role() = 'therapist_lead' AND
        EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.id IN (primary_session_id, conflicting_session_id)
            AND can_manage_therapist_data(ss.therapist_id)
        )
    )
    WITH CHECK (
        get_user_role() = 'therapist_lead' AND
        EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.id IN (primary_session_id, conflicting_session_id)
            AND can_manage_therapist_data(ss.therapist_id)
        )
    );

-- Policy: Receptionists can view and resolve conflicts
CREATE POLICY "receptionist_manage_conflicts" ON schedule_conflicts
    FOR ALL
    USING (get_user_role() = 'receptionist')
    WITH CHECK (get_user_role() = 'receptionist');

-- =====================================================
-- Availability Templates RLS Policies
-- =====================================================

-- Policy: Admins and managers can manage all availability templates
CREATE POLICY "admin_manager_all_availability_templates" ON availability_templates
    FOR ALL
    USING (get_user_role() IN ('admin', 'manager'))
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can manage their own availability templates
CREATE POLICY "therapist_own_availability_templates" ON availability_templates
    FOR ALL
    USING (therapist_id = get_user_therapist_id())
    WITH CHECK (therapist_id = get_user_therapist_id());

-- Policy: Others can view templates for scheduling purposes
CREATE POLICY "view_availability_templates" ON availability_templates
    FOR SELECT
    USING (get_user_role() IN ('therapist_lead', 'receptionist'));

-- =====================================================
-- Therapist Schedule Preferences RLS Policies
-- =====================================================

-- Policy: Admins and managers can view all preferences
CREATE POLICY "admin_manager_all_preferences" ON therapist_schedule_preferences
    FOR SELECT
    USING (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can manage their own preferences
CREATE POLICY "therapist_own_preferences" ON therapist_schedule_preferences
    FOR ALL
    USING (therapist_id = get_user_therapist_id())
    WITH CHECK (therapist_id = get_user_therapist_id());

-- Policy: Therapist leads can view preferences in their team
CREATE POLICY "therapist_lead_team_preferences" ON therapist_schedule_preferences
    FOR SELECT
    USING (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    );

-- Policy: Receptionists can view preferences for scheduling
CREATE POLICY "receptionist_view_preferences" ON therapist_schedule_preferences
    FOR SELECT
    USING (get_user_role() = 'receptionist');

-- =====================================================
-- Availability Exceptions RLS Policies
-- =====================================================

-- Policy: Admins and managers can manage all exceptions
CREATE POLICY "admin_manager_all_exceptions" ON availability_exceptions
    FOR ALL
    USING (get_user_role() IN ('admin', 'manager'))
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can create and view their own exceptions
CREATE POLICY "therapist_own_exceptions" ON availability_exceptions
    FOR ALL
    USING (therapist_id = get_user_therapist_id())
    WITH CHECK (therapist_id = get_user_therapist_id());

-- Policy: Therapist leads can view and approve exceptions in their team
CREATE POLICY "therapist_lead_team_exceptions" ON availability_exceptions
    FOR ALL
    USING (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    )
    WITH CHECK (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    );

-- Policy: Receptionists can view exceptions for scheduling
CREATE POLICY "receptionist_view_exceptions" ON availability_exceptions
    FOR SELECT
    USING (get_user_role() = 'receptionist');

-- =====================================================
-- Workload Analytics RLS Policies
-- =====================================================

-- Policy: Admins and managers can view all analytics
CREATE POLICY "admin_manager_all_analytics" ON workload_analytics
    FOR SELECT
    USING (get_user_role() IN ('admin', 'manager'));

-- Policy: Therapists can view their own analytics
CREATE POLICY "therapist_own_analytics" ON workload_analytics
    FOR SELECT
    USING (therapist_id = get_user_therapist_id());

-- Policy: Therapist leads can view analytics for their team
CREATE POLICY "therapist_lead_team_analytics" ON workload_analytics
    FOR SELECT
    USING (
        get_user_role() = 'therapist_lead' AND
        can_manage_therapist_data(therapist_id)
    );

-- Policy: System can insert analytics (for automated calculations)
CREATE POLICY "system_insert_analytics" ON workload_analytics
    FOR INSERT
    WITH CHECK (true);  -- Allow system background processes to insert

CREATE POLICY "system_update_analytics" ON workload_analytics
    FOR UPDATE
    USING (true)  -- Allow system background processes to update
    WITH CHECK (true);

-- =====================================================
-- Materialized View Security
-- =====================================================

-- Grant appropriate access to materialized views
GRANT SELECT ON current_therapist_availability TO authenticated;
GRANT SELECT ON schedule_optimization_summary TO authenticated;

-- Create view-level RLS for materialized views
CREATE POLICY "view_current_availability" ON current_therapist_availability
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'manager', 'receptionist') OR
        therapist_id = get_user_therapist_id() OR
        (get_user_role() = 'therapist_lead' AND can_manage_therapist_data(therapist_id))
    );

-- Enable RLS on materialized views
ALTER MATERIALIZED VIEW current_therapist_availability ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW schedule_optimization_summary ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Service Account Permissions
-- =====================================================

-- Create service role for automated scheduling processes
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'scheduling_service') THEN
        CREATE ROLE scheduling_service;
    END IF;
END
$$;

-- Grant necessary permissions to service account
GRANT USAGE ON SCHEMA public TO scheduling_service;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO scheduling_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scheduling_service;

-- Allow service account to bypass RLS for automation
GRANT scheduling_service TO postgres;

-- Create policies that allow service account operations
CREATE POLICY "service_account_full_access" ON scheduled_sessions
    FOR ALL
    USING (current_user = 'scheduling_service')
    WITH CHECK (current_user = 'scheduling_service');

CREATE POLICY "service_account_conflicts" ON schedule_conflicts
    FOR ALL
    USING (current_user = 'scheduling_service')
    WITH CHECK (current_user = 'scheduling_service');

CREATE POLICY "service_account_workload" ON workload_analytics
    FOR ALL
    USING (current_user = 'scheduling_service')
    WITH CHECK (current_user = 'scheduling_service');

-- =====================================================
-- Audit Trail for Scheduling Changes
-- =====================================================

-- Function to log scheduling changes
CREATE OR REPLACE FUNCTION log_scheduling_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit record
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        user_role,
        timestamp
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        auth.uid(),
        get_user_role(),
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_scheduled_sessions
    AFTER INSERT OR UPDATE OR DELETE ON scheduled_sessions
    FOR EACH ROW EXECUTE FUNCTION log_scheduling_change();

CREATE TRIGGER audit_schedule_conflicts
    AFTER INSERT OR UPDATE OR DELETE ON schedule_conflicts
    FOR EACH ROW EXECUTE FUNCTION log_scheduling_change();

CREATE TRIGGER audit_therapist_availability
    AFTER INSERT OR UPDATE OR DELETE ON therapist_availability
    FOR EACH ROW EXECUTE FUNCTION log_scheduling_change();

-- =====================================================
-- Performance Monitoring for RLS
-- =====================================================

-- Function to check RLS policy performance
CREATE OR REPLACE FUNCTION analyze_rls_performance()
RETURNS TABLE (
    table_name TEXT,
    policy_name TEXT,
    avg_execution_time_ms DECIMAL,
    total_executions BIGINT
) AS $$
BEGIN
    -- This would integrate with pg_stat_statements if available
    -- For now, return basic structure
    RETURN QUERY
    SELECT 
        'scheduled_sessions'::TEXT,
        'therapist_own_sessions'::TEXT,
        0.0::DECIMAL,
        0::BIGINT
    WHERE false; -- Placeholder - would need actual performance data
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION get_user_role IS 'Extract user role from JWT token for RLS policy evaluation';
COMMENT ON FUNCTION get_user_therapist_id IS 'Get therapist ID for authenticated therapist users';
COMMENT ON FUNCTION can_manage_therapist_data IS 'Check if user can manage specific therapist data based on role and relationships';
COMMENT ON FUNCTION can_view_student_data IS 'Check if user can view specific student data based on their treatment relationships';
COMMENT ON FUNCTION log_scheduling_change IS 'Audit trigger function to log all scheduling-related data changes';

-- =====================================================
-- Grant Permissions to Application Roles
-- =====================================================

-- Grant basic access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant specific permissions based on roles (handled by RLS policies)
-- Additional specific grants can be added here as needed