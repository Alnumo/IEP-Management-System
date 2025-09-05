-- Story 6.1: Enhanced Student Subscription Data Model
-- Extends existing student_subscriptions table for individualized enrollment management

-- Extend student_subscriptions table with individualized fields
ALTER TABLE student_subscriptions 
ADD COLUMN individual_start_date DATE,
ADD COLUMN individual_end_date DATE,
ADD COLUMN custom_schedule JSONB DEFAULT '{}',
ADD COLUMN assigned_therapist_id UUID REFERENCES auth.users(id),
ADD COLUMN program_modifications JSONB DEFAULT '{}',
ADD COLUMN enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'paused', 'completed', 'cancelled')),
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX idx_student_subscriptions_individual_dates ON student_subscriptions(individual_start_date, individual_end_date);
CREATE INDEX idx_student_subscriptions_therapist ON student_subscriptions(assigned_therapist_id);
CREATE INDEX idx_student_subscriptions_status ON student_subscriptions(enrollment_status);
CREATE INDEX idx_student_subscriptions_custom_schedule ON student_subscriptions USING GIN(custom_schedule);
CREATE INDEX idx_student_subscriptions_modifications ON student_subscriptions USING GIN(program_modifications);

-- Add database constraints for data integrity
ALTER TABLE student_subscriptions 
ADD CONSTRAINT chk_individual_dates_valid 
CHECK (individual_end_date >= individual_start_date);

-- Audit trail function for enrollment changes
CREATE OR REPLACE FUNCTION log_enrollment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log the change in program_modifications if it's a modification update
        IF OLD.program_modifications IS DISTINCT FROM NEW.program_modifications OR
           OLD.custom_schedule IS DISTINCT FROM NEW.custom_schedule OR
           OLD.assigned_therapist_id IS DISTINCT FROM NEW.assigned_therapist_id THEN
            NEW.updated_at = NOW();
            NEW.updated_by = auth.uid();
            
            -- Append change log to program_modifications
            NEW.program_modifications = COALESCE(NEW.program_modifications, '{}'::jsonb) || 
                jsonb_build_object(
                    'change_log', 
                    COALESCE(NEW.program_modifications->'change_log', '[]'::jsonb) || 
                    jsonb_build_array(jsonb_build_object(
                        'timestamp', NOW()::text,
                        'user_id', auth.uid()::text,
                        'changes', jsonb_build_object(
                            'custom_schedule', CASE WHEN OLD.custom_schedule IS DISTINCT FROM NEW.custom_schedule THEN NEW.custom_schedule ELSE NULL END,
                            'assigned_therapist_id', CASE WHEN OLD.assigned_therapist_id IS DISTINCT FROM NEW.assigned_therapist_id THEN NEW.assigned_therapist_id::text ELSE NULL END,
                            'enrollment_status', CASE WHEN OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status THEN NEW.enrollment_status ELSE NULL END
                        )
                    ))
                );
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
        NEW.updated_by = auth.uid();
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit trail
DROP TRIGGER IF EXISTS trigger_log_enrollment_changes ON student_subscriptions;
CREATE TRIGGER trigger_log_enrollment_changes
    BEFORE INSERT OR UPDATE ON student_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION log_enrollment_changes();

-- Update RLS policies for individualized access
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for admins and managers to see all enrollments
CREATE POLICY "Admins and managers can view all enrollments" ON student_subscriptions
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Policy for therapists to see their assigned enrollments
CREATE POLICY "Therapists can view assigned enrollments" ON student_subscriptions
    FOR SELECT USING (
        assigned_therapist_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Policy for enrollment modifications by authorized users
CREATE POLICY "Authorized users can modify enrollments" ON student_subscriptions
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager')) OR
        assigned_therapist_id = auth.uid()
    );

-- Policy for creating new enrollments
CREATE POLICY "Authorized users can create enrollments" ON student_subscriptions
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Add comments for documentation
COMMENT ON COLUMN student_subscriptions.individual_start_date IS 'Individual start date for this specific student enrollment, may differ from program template';
COMMENT ON COLUMN student_subscriptions.individual_end_date IS 'Individual end date for this specific student enrollment';
COMMENT ON COLUMN student_subscriptions.custom_schedule IS 'JSONB field containing customized schedule for this student (sessions, frequency, etc.)';
COMMENT ON COLUMN student_subscriptions.assigned_therapist_id IS 'Therapist assigned to this specific enrollment';
COMMENT ON COLUMN student_subscriptions.program_modifications IS 'JSONB field tracking all modifications made to the base program template';
COMMENT ON COLUMN student_subscriptions.enrollment_status IS 'Current status of the enrollment (active, paused, completed, cancelled)';