-- ============================================================================
-- CRM Lead Management Schema
-- Version: 1.0
-- Description: Implements comprehensive CRM system for lead tracking and conversion
-- Author: James (Dev Agent)
-- Date: 2025-09-03
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LEADS TABLE
-- ============================================================================

-- Create lead status enum type
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new_booking',
        'confirmed', 
        'evaluation_complete',
        'registered',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create leads table for managing potential students
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Parent/Guardian Information
    parent_name TEXT NOT NULL,
    parent_name_ar TEXT, -- Arabic name for bilingual support
    parent_contact TEXT NOT NULL, -- Phone or email
    parent_contact_secondary TEXT, -- Alternative contact
    
    -- Child Information
    child_name TEXT NOT NULL,
    child_name_ar TEXT, -- Arabic name for bilingual support
    child_dob DATE NOT NULL,
    child_gender VARCHAR(10),
    
    -- Lead Details
    status lead_status DEFAULT 'new_booking' NOT NULL,
    evaluation_date TIMESTAMP WITH TIME ZONE,
    evaluation_notes TEXT,
    notes TEXT,
    
    -- Source Tracking
    source VARCHAR(50) DEFAULT 'website', -- website, referral, walk-in, etc.
    source_details JSONB, -- Additional source metadata (campaign, referrer, etc.)
    
    -- Conversion Tracking
    converted_to_student_id UUID REFERENCES students(id),
    conversion_date TIMESTAMP WITH TIME ZONE,
    
    -- Assignment and Follow-up
    assigned_to UUID REFERENCES auth.users(id),
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Integration Fields
    external_id TEXT, -- ID from external systems (Amelia, etc.)
    integration_metadata JSONB, -- Store any additional integration data
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_evaluation_date ON leads(evaluation_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_follow_up_date ON leads(follow_up_date) WHERE deleted_at IS NULL AND status NOT IN ('registered', 'archived');
CREATE INDEX idx_leads_external_id ON leads(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_leads_parent_contact ON leads(parent_contact);

-- ============================================================================
-- LEAD AUDIT TRAIL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_audit_trail (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, status_changed, assigned, converted, etc.
    old_value JSONB,
    new_value JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create index for audit trail queries
CREATE INDEX idx_lead_audit_trail_lead_id ON lead_audit_trail(lead_id);
CREATE INDEX idx_lead_audit_trail_performed_at ON lead_audit_trail(performed_at DESC);

-- ============================================================================
-- LEAD INTERACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- call, email, meeting, note, etc.
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER,
    subject TEXT,
    description TEXT,
    outcome VARCHAR(50), -- interested, not_interested, follow_up_needed, etc.
    next_action TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for interactions
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_date ON lead_interactions(interaction_date DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON leads;
DROP POLICY IF EXISTS "Enable insert for admin and manager roles" ON leads;
DROP POLICY IF EXISTS "Enable update for admin and manager roles" ON leads;
DROP POLICY IF EXISTS "Enable delete for admin role only" ON leads;

-- Lead policies
CREATE POLICY "Enable read access for authenticated users" ON leads
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Enable insert for admin and manager roles" ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

CREATE POLICY "Enable update for admin and manager roles" ON leads
    FOR UPDATE
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

CREATE POLICY "Enable delete for admin role only" ON leads
    FOR DELETE
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Audit trail policies
CREATE POLICY "Enable read access for authenticated users on audit" ON lead_audit_trail
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for system operations on audit" ON lead_audit_trail
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Interactions policies  
CREATE POLICY "Enable full access for authenticated users on interactions" ON lead_interactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to handle lead status transitions with audit trail
CREATE OR REPLACE FUNCTION update_lead_status(
    p_lead_id UUID,
    p_new_status lead_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_status lead_status;
    v_result JSONB;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM leads
    WHERE id = p_lead_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
    END IF;
    
    -- Update lead status
    UPDATE leads
    SET 
        status = p_new_status,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_lead_id;
    
    -- Create audit trail entry
    INSERT INTO lead_audit_trail (
        lead_id,
        action,
        old_value,
        new_value,
        performed_by,
        notes
    ) VALUES (
        p_lead_id,
        'status_changed',
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', p_new_status),
        auth.uid(),
        p_notes
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'old_status', v_old_status,
        'new_status', p_new_status
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert lead to student
CREATE OR REPLACE FUNCTION convert_lead_to_student(
    p_lead_id UUID,
    p_student_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_student_id UUID;
    v_lead RECORD;
    v_result JSONB;
BEGIN
    -- Get lead data
    SELECT * INTO v_lead
    FROM leads
    WHERE id = p_lead_id 
        AND deleted_at IS NULL
        AND status = 'evaluation_complete';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Lead not found or not ready for conversion'
        );
    END IF;
    
    -- Check if already converted
    IF v_lead.converted_to_student_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead already converted to student'
        );
    END IF;
    
    -- Create student record (basic implementation - extend as needed)
    INSERT INTO students (
        name_ar,
        name_en,
        date_of_birth,
        gender,
        parent_name,
        parent_phone,
        created_by,
        updated_by
    ) VALUES (
        COALESCE(v_lead.child_name_ar, v_lead.child_name),
        v_lead.child_name,
        v_lead.child_dob,
        COALESCE(v_lead.child_gender, 'not_specified'),
        v_lead.parent_name,
        v_lead.parent_contact,
        auth.uid(),
        auth.uid()
    ) RETURNING id INTO v_student_id;
    
    -- Update lead with conversion info
    UPDATE leads
    SET 
        status = 'registered',
        converted_to_student_id = v_student_id,
        conversion_date = NOW(),
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_lead_id;
    
    -- Create audit trail entry
    INSERT INTO lead_audit_trail (
        lead_id,
        action,
        new_value,
        performed_by,
        notes
    ) VALUES (
        p_lead_id,
        'converted',
        jsonb_build_object('student_id', v_student_id),
        auth.uid(),
        'Lead converted to student'
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'student_id', v_student_id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign lead to user
CREATE OR REPLACE FUNCTION assign_lead(
    p_lead_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_assignee UUID;
    v_result JSONB;
BEGIN
    -- Get current assignee
    SELECT assigned_to INTO v_old_assignee
    FROM leads
    WHERE id = p_lead_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
    END IF;
    
    -- Update lead assignment
    UPDATE leads
    SET 
        assigned_to = p_user_id,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_lead_id;
    
    -- Create audit trail entry
    INSERT INTO lead_audit_trail (
        lead_id,
        action,
        old_value,
        new_value,
        performed_by,
        notes
    ) VALUES (
        p_lead_id,
        'assigned',
        jsonb_build_object('assigned_to', v_old_assignee),
        jsonb_build_object('assigned_to', p_user_id),
        auth.uid(),
        p_notes
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'assigned_to', p_user_id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create audit trail on lead creation
CREATE OR REPLACE FUNCTION audit_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_audit_trail (
        lead_id,
        action,
        new_value,
        performed_by
    ) VALUES (
        NEW.id,
        'created',
        to_jsonb(NEW),
        NEW.created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_lead_creation_trigger AFTER INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION audit_lead_creation();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON leads TO authenticated;
GRANT SELECT, INSERT ON lead_audit_trail TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION update_lead_status TO authenticated;
GRANT EXECUTE ON FUNCTION convert_lead_to_student TO authenticated;
GRANT EXECUTE ON FUNCTION assign_lead TO authenticated;

-- Grant usage on lead_status type
GRANT USAGE ON TYPE lead_status TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE leads IS 'Stores potential student leads from evaluation bookings through registration';
COMMENT ON TABLE lead_audit_trail IS 'Audit trail for all lead-related changes and actions';
COMMENT ON TABLE lead_interactions IS 'Tracks all interactions and communications with leads';
COMMENT ON FUNCTION update_lead_status IS 'Updates lead status with audit trail';
COMMENT ON FUNCTION convert_lead_to_student IS 'Converts a qualified lead into a registered student';
COMMENT ON FUNCTION assign_lead IS 'Assigns a lead to a user for follow-up';