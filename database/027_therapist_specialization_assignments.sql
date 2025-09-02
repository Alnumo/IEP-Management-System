-- Therapist Specialization Assignment System
-- This migration implements Story 1.2: Advanced Therapist Assignment & Substitute Workflow
-- Ensures each student has exactly one primary therapist per specialization

-- Create course_assignments table first (if it doesn't exist)
-- This table manages therapist assignments to courses
CREATE TABLE IF NOT EXISTS course_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Assignment Information
    assignment_date DATE DEFAULT CURRENT_DATE,
    assignment_type VARCHAR(20) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'assistant', 'substitute')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    -- Financial Information
    hourly_rate DECIMAL(10,2),
    total_hours DECIMAL(8,2) DEFAULT 0.00,
    total_payment DECIMAL(10,2) DEFAULT 0.00,
    
    -- Notes and Documentation
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(therapist_id, course_id, assignment_type)
);

-- Extend course_assignments table for specialization-based assignments
ALTER TABLE course_assignments 
ADD COLUMN IF NOT EXISTS is_primary_for_specialization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS substitute_for_therapist_id UUID REFERENCES therapists(id),
ADD COLUMN IF NOT EXISTS assignment_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specialization_override VARCHAR(100);

-- Create therapist_specialization_assignments table
-- This table enforces one-therapist-per-specialization-per-student rule
CREATE TABLE IF NOT EXISTS therapist_specialization_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    primary_therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Specialization Information
    specialization_ar VARCHAR(100) NOT NULL,
    specialization_en VARCHAR(100),
    specialization_key VARCHAR(50), -- For mapping to THERAPY_SPECIALIZATIONS constants
    
    -- Assignment Information
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
    assignment_reason TEXT,
    
    -- Substitute Information
    current_substitute_id UUID REFERENCES therapists(id),
    substitute_start_date TIMESTAMP WITH TIME ZONE,
    substitute_end_date TIMESTAMP WITH TIME ZONE,
    substitute_reason TEXT,
    
    -- Notification Tracking
    parent_notified BOOLEAN DEFAULT false,
    parent_notification_date TIMESTAMP WITH TIME ZONE,
    therapist_notified BOOLEAN DEFAULT false,
    therapist_notification_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints: One primary therapist per specialization per student
    UNIQUE(student_id, specialization_ar),
    UNIQUE(student_id, specialization_key)
);

-- Create assignment_history table for audit trail
CREATE TABLE IF NOT EXISTS assignment_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    specialization_assignment_id UUID NOT NULL REFERENCES therapist_specialization_assignments(id) ON DELETE CASCADE,
    
    -- Assignment Change Information
    change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('assignment_created', 'therapist_changed', 'substitute_assigned', 'substitute_removed', 'assignment_deactivated')),
    previous_therapist_id UUID REFERENCES therapists(id),
    new_therapist_id UUID REFERENCES therapists(id),
    
    -- Change Details
    change_reason TEXT,
    specialization_ar VARCHAR(100),
    specialization_en VARCHAR(100),
    
    -- Notification Information
    parent_notified BOOLEAN DEFAULT false,
    notification_method VARCHAR(20), -- 'email', 'sms', 'portal', 'phone'
    notification_language VARCHAR(5) DEFAULT 'ar', -- 'ar' or 'en'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    change_notes TEXT
);

-- Create substitute_pools table for managing approved substitutes per specialization
CREATE TABLE IF NOT EXISTS substitute_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Specialization Information
    specialization_ar VARCHAR(100) NOT NULL,
    specialization_en VARCHAR(100),
    specialization_key VARCHAR(50),
    
    -- Therapist Information
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Availability Information
    is_available BOOLEAN DEFAULT true,
    max_concurrent_substitutions INTEGER DEFAULT 5,
    current_substitutions_count INTEGER DEFAULT 0,
    
    -- Priority and Preferences
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5), -- 1 = highest priority
    emergency_contact_only BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(specialization_ar, therapist_id),
    UNIQUE(specialization_key, therapist_id)
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_course_assignments_therapist ON course_assignments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_type_status ON course_assignments(assignment_type, status);
CREATE INDEX IF NOT EXISTS idx_course_assignments_specialization ON course_assignments(is_primary_for_specialization) WHERE is_primary_for_specialization = true;

CREATE INDEX IF NOT EXISTS idx_specialization_assignments_student ON therapist_specialization_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_specialization_assignments_therapist ON therapist_specialization_assignments(primary_therapist_id);
CREATE INDEX IF NOT EXISTS idx_specialization_assignments_specialization ON therapist_specialization_assignments(specialization_ar);
CREATE INDEX IF NOT EXISTS idx_specialization_assignments_status ON therapist_specialization_assignments(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_specialization_assignments_substitute ON therapist_specialization_assignments(current_substitute_id) WHERE current_substitute_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_history_student ON assignment_history(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assignment ON assignment_history(specialization_assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created ON assignment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_assignment_history_change_type ON assignment_history(change_type);

CREATE INDEX IF NOT EXISTS idx_substitute_pools_specialization ON substitute_pools(specialization_ar);
CREATE INDEX IF NOT EXISTS idx_substitute_pools_therapist ON substitute_pools(therapist_id);
CREATE INDEX IF NOT EXISTS idx_substitute_pools_available ON substitute_pools(is_available) WHERE is_available = true;

-- Create updated_at triggers
CREATE TRIGGER IF NOT EXISTS update_course_assignments_updated_at 
    BEFORE UPDATE ON course_assignments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_specialization_assignments_updated_at 
    BEFORE UPDATE ON therapist_specialization_assignments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_substitute_pools_updated_at 
    BEFORE UPDATE ON substitute_pools 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to validate specialization assignment rules
CREATE OR REPLACE FUNCTION validate_specialization_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if student already has a primary therapist for this specialization
    IF NEW.status = 'active' AND EXISTS (
        SELECT 1 FROM therapist_specialization_assignments 
        WHERE student_id = NEW.student_id 
        AND specialization_ar = NEW.specialization_ar 
        AND status = 'active' 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
        RAISE EXCEPTION 'Student already has an active primary therapist for specialization: %', NEW.specialization_ar;
    END IF;

    -- Validate therapist has the required specialization
    IF NOT EXISTS (
        SELECT 1 FROM therapists 
        WHERE id = NEW.primary_therapist_id 
        AND (specialization_ar = NEW.specialization_ar OR specialization_en = NEW.specialization_en)
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Therapist does not have the required specialization or is not active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
CREATE TRIGGER trigger_validate_specialization_assignment
    BEFORE INSERT OR UPDATE ON therapist_specialization_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_specialization_assignment();

-- Function to automatically log assignment changes
CREATE OR REPLACE FUNCTION log_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log assignment creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO assignment_history (
            student_id, specialization_assignment_id, change_type,
            new_therapist_id, specialization_ar, specialization_en,
            change_reason, created_by
        ) VALUES (
            NEW.student_id, NEW.id, 'assignment_created',
            NEW.primary_therapist_id, NEW.specialization_ar, NEW.specialization_en,
            NEW.assignment_reason, NEW.created_by
        );
        RETURN NEW;
    END IF;

    -- Log assignment updates
    IF TG_OP = 'UPDATE' THEN
        -- Log therapist change
        IF OLD.primary_therapist_id != NEW.primary_therapist_id THEN
            INSERT INTO assignment_history (
                student_id, specialization_assignment_id, change_type,
                previous_therapist_id, new_therapist_id, specialization_ar, specialization_en,
                change_reason, created_by
            ) VALUES (
                NEW.student_id, NEW.id, 'therapist_changed',
                OLD.primary_therapist_id, NEW.primary_therapist_id, 
                NEW.specialization_ar, NEW.specialization_en,
                'Therapist assignment changed', NEW.updated_by
            );
        END IF;

        -- Log substitute assignment
        IF OLD.current_substitute_id IS NULL AND NEW.current_substitute_id IS NOT NULL THEN
            INSERT INTO assignment_history (
                student_id, specialization_assignment_id, change_type,
                new_therapist_id, specialization_ar, specialization_en,
                change_reason, created_by
            ) VALUES (
                NEW.student_id, NEW.id, 'substitute_assigned',
                NEW.current_substitute_id, NEW.specialization_ar, NEW.specialization_en,
                NEW.substitute_reason, NEW.updated_by
            );
        END IF;

        -- Log substitute removal
        IF OLD.current_substitute_id IS NOT NULL AND NEW.current_substitute_id IS NULL THEN
            INSERT INTO assignment_history (
                student_id, specialization_assignment_id, change_type,
                previous_therapist_id, specialization_ar, specialization_en,
                change_reason, created_by
            ) VALUES (
                NEW.student_id, NEW.id, 'substitute_removed',
                OLD.current_substitute_id, NEW.specialization_ar, NEW.specialization_en,
                'Substitute assignment ended', NEW.updated_by
            );
        END IF;

        -- Log status deactivation
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            INSERT INTO assignment_history (
                student_id, specialization_assignment_id, change_type,
                previous_therapist_id, specialization_ar, specialization_en,
                change_reason, created_by
            ) VALUES (
                NEW.student_id, NEW.id, 'assignment_deactivated',
                NEW.primary_therapist_id, NEW.specialization_ar, NEW.specialization_en,
                'Assignment deactivated', NEW.updated_by
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply history logging trigger
CREATE TRIGGER trigger_log_assignment_change
    AFTER INSERT OR UPDATE ON therapist_specialization_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_assignment_change();

-- Function to update substitute pool counts
CREATE OR REPLACE FUNCTION update_substitute_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.current_substitute_id IS NOT NULL THEN
        -- Increase substitute count
        UPDATE substitute_pools 
        SET current_substitutions_count = current_substitutions_count + 1
        WHERE therapist_id = NEW.current_substitute_id 
        AND specialization_ar = NEW.specialization_ar;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle substitute changes
        IF OLD.current_substitute_id IS NULL AND NEW.current_substitute_id IS NOT NULL THEN
            -- New substitute assigned
            UPDATE substitute_pools 
            SET current_substitutions_count = current_substitutions_count + 1
            WHERE therapist_id = NEW.current_substitute_id 
            AND specialization_ar = NEW.specialization_ar;
        ELSIF OLD.current_substitute_id IS NOT NULL AND NEW.current_substitute_id IS NULL THEN
            -- Substitute removed
            UPDATE substitute_pools 
            SET current_substitutions_count = current_substitutions_count - 1
            WHERE therapist_id = OLD.current_substitute_id 
            AND specialization_ar = OLD.specialization_ar;
        ELSIF OLD.current_substitute_id IS NOT NULL AND NEW.current_substitute_id IS NOT NULL 
              AND OLD.current_substitute_id != NEW.current_substitute_id THEN
            -- Substitute changed
            UPDATE substitute_pools 
            SET current_substitutions_count = current_substitutions_count - 1
            WHERE therapist_id = OLD.current_substitute_id 
            AND specialization_ar = OLD.specialization_ar;
            
            UPDATE substitute_pools 
            SET current_substitutions_count = current_substitutions_count + 1
            WHERE therapist_id = NEW.current_substitute_id 
            AND specialization_ar = NEW.specialization_ar;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.current_substitute_id IS NOT NULL THEN
        -- Decrease substitute count
        UPDATE substitute_pools 
        SET current_substitutions_count = current_substitutions_count - 1
        WHERE therapist_id = OLD.current_substitute_id 
        AND specialization_ar = OLD.specialization_ar;
        RETURN OLD;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply substitute count trigger
CREATE TRIGGER trigger_update_substitute_count
    AFTER INSERT OR UPDATE OR DELETE ON therapist_specialization_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_substitute_count();

-- Create views for easy data access
CREATE OR REPLACE VIEW student_therapist_assignments AS
SELECT 
    sta.id,
    s.id as student_id,
    s.first_name_ar as student_name_ar,
    s.first_name_en as student_name_en,
    sta.specialization_ar,
    sta.specialization_en,
    sta.specialization_key,
    t.id as primary_therapist_id,
    t.first_name_ar || ' ' || t.last_name_ar as primary_therapist_name_ar,
    COALESCE(t.first_name_en || ' ' || t.last_name_en, t.first_name_ar || ' ' || t.last_name_ar) as primary_therapist_name_en,
    t.specialization_ar as therapist_specialization_ar,
    t.specialization_en as therapist_specialization_en,
    sub_t.id as substitute_therapist_id,
    sub_t.first_name_ar || ' ' || sub_t.last_name_ar as substitute_therapist_name_ar,
    COALESCE(sub_t.first_name_en || ' ' || sub_t.last_name_en, sub_t.first_name_ar || ' ' || sub_t.last_name_ar) as substitute_therapist_name_en,
    sta.assigned_date,
    sta.status,
    sta.substitute_start_date,
    sta.substitute_end_date,
    sta.substitute_reason,
    sta.parent_notified,
    sta.therapist_notified
FROM therapist_specialization_assignments sta
JOIN students s ON sta.student_id = s.id
JOIN therapists t ON sta.primary_therapist_id = t.id
LEFT JOIN therapists sub_t ON sta.current_substitute_id = sub_t.id
WHERE sta.status = 'active';

CREATE OR REPLACE VIEW available_substitutes AS
SELECT 
    sp.specialization_ar,
    sp.specialization_en,
    sp.specialization_key,
    t.id as therapist_id,
    t.first_name_ar || ' ' || t.last_name_ar as therapist_name_ar,
    COALESCE(t.first_name_en || ' ' || t.last_name_en, t.first_name_ar || ' ' || t.last_name_ar) as therapist_name_en,
    t.specialization_ar as therapist_specialization_ar,
    t.specialization_en as therapist_specialization_en,
    sp.priority_level,
    sp.max_concurrent_substitutions,
    sp.current_substitutions_count,
    (sp.max_concurrent_substitutions - sp.current_substitutions_count) as available_slots,
    sp.emergency_contact_only
FROM substitute_pools sp
JOIN therapists t ON sp.therapist_id = t.id
WHERE sp.is_available = true 
AND t.status = 'active'
AND sp.current_substitutions_count < sp.max_concurrent_substitutions
ORDER BY sp.specialization_ar, sp.priority_level, sp.current_substitutions_count;

-- Add table comments
COMMENT ON TABLE course_assignments IS 'Manages therapist assignments to courses with primary/assistant/substitute roles';
COMMENT ON TABLE therapist_specialization_assignments IS 'Enforces one-therapist-per-specialization-per-student rule with substitute management';
COMMENT ON TABLE assignment_history IS 'Audit trail for all therapist assignment changes with bilingual notifications';
COMMENT ON TABLE substitute_pools IS 'Manages approved substitute therapists per specialization with availability tracking';

-- Add column comments
COMMENT ON COLUMN therapist_specialization_assignments.specialization_key IS 'Maps to THERAPY_SPECIALIZATIONS constants for consistency';
COMMENT ON COLUMN therapist_specialization_assignments.parent_notified IS 'Tracks if parent has been notified of assignment changes';
COMMENT ON COLUMN therapist_specialization_assignments.substitute_start_date IS 'When substitute assignment began';
COMMENT ON COLUMN assignment_history.notification_language IS 'Language used for parent notification (ar/en)';
COMMENT ON COLUMN substitute_pools.priority_level IS '1=highest priority, 5=lowest priority for substitute selection';