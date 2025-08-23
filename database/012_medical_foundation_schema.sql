-- =====================================================================
-- Migration 12: Medical Foundation Schema Extensions
-- Phase 1: Healthcare compliance and medical record management
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- MEDICAL RECORDS TABLE
-- Core table for comprehensive medical record management with encryption
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Medical Identification
    medical_record_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: MED-2025-0001
    primary_diagnosis_code TEXT[], -- ICD-10 codes array
    secondary_diagnosis_codes TEXT[], -- Additional ICD-10 codes
    
    -- Comprehensive Medical History (Encrypted JSONB)
    medical_history JSONB DEFAULT '{}', -- Encrypted medical data
    current_medications JSONB DEFAULT '{}', -- Medication details with dosages
    allergies TEXT[], -- Known allergies list
    emergency_protocol TEXT, -- Emergency procedures specific to patient
    
    -- Vital Information
    blood_type VARCHAR(5), -- A+, B-, O+, etc.
    weight_kg DECIMAL(5,2), -- Current weight in kg
    height_cm DECIMAL(5,2), -- Current height in cm
    bmi DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN height_cm > 0 THEN weight_kg / POWER(height_cm / 100, 2)
            ELSE NULL 
        END
    ) STORED,
    
    -- Medical Team Information
    primary_physician_ar TEXT,
    primary_physician_en TEXT,
    primary_physician_phone VARCHAR(20),
    primary_physician_email VARCHAR(255),
    hospital_clinic_ar TEXT,
    hospital_clinic_en TEXT,
    
    -- Insurance Information
    insurance_provider_ar TEXT,
    insurance_provider_en TEXT,
    policy_number VARCHAR(50),
    insurance_expiry_date DATE,
    coverage_details JSONB DEFAULT '{}',
    
    -- Emergency Contacts (Medical)
    emergency_medical_contact_name_ar TEXT,
    emergency_medical_contact_name_en TEXT,
    emergency_medical_contact_phone VARCHAR(20),
    emergency_medical_contact_relationship_ar TEXT,
    emergency_medical_contact_relationship_en TEXT,
    
    -- Medical Restrictions and Precautions
    activity_restrictions_ar TEXT,
    activity_restrictions_en TEXT,
    dietary_restrictions_ar TEXT,
    dietary_restrictions_en TEXT,
    medication_allergies TEXT[],
    environmental_allergies TEXT[],
    
    -- Therapy-Related Medical Information
    contraindications_ar TEXT, -- Medical reasons to avoid certain therapies
    contraindications_en TEXT,
    special_accommodations_ar TEXT, -- Required medical accommodations
    special_accommodations_en TEXT,
    therapy_clearance_date DATE, -- Date cleared for therapy activities
    therapy_clearance_notes_ar TEXT,
    therapy_clearance_notes_en TEXT,
    
    -- Compliance and Security
    last_medical_review_date DATE,
    next_review_due_date DATE,
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(100), -- Reference to encryption key
    data_classification VARCHAR(20) DEFAULT 'confidential' CHECK (
        data_classification IN ('public', 'internal', 'confidential', 'restricted')
    ),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    audit_log JSONB DEFAULT '[]' -- Audit trail for all changes
);

-- Add indexes for medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_student_id ON medical_records(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_number ON medical_records(medical_record_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_diagnosis ON medical_records USING GIN(primary_diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_review_date ON medical_records(next_review_due_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_insurance ON medical_records(insurance_provider_ar, policy_number);

-- =============================================================================
-- MEDICAL CONSULTANTS TABLE
-- Healthcare professionals and medical supervision
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_consultants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID REFERENCES therapists(id), -- Link to existing therapist if applicable
    
    -- Professional Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    title_ar TEXT, -- د., أ.د., بروفيسور
    title_en TEXT, -- Dr., Prof., etc.
    
    -- Medical Credentials
    license_number TEXT NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL, -- Medical Doctor, Specialist, etc.
    license_expiry_date DATE,
    license_issuing_authority_ar TEXT,
    license_issuing_authority_en TEXT,
    
    -- Specialization Information
    primary_specialization_ar TEXT NOT NULL,
    primary_specialization_en TEXT,
    secondary_specializations TEXT[], -- Additional specialties
    board_certifications TEXT[], -- Board certifications
    fellowship_training TEXT[], -- Fellowship details
    
    -- Practice Information
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    education_background JSONB DEFAULT '{}', -- Medical education details
    professional_memberships TEXT[], -- Medical associations
    
    -- Contact Information
    primary_phone VARCHAR(20),
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    
    -- Practice Address
    clinic_name_ar TEXT,
    clinic_name_en TEXT,
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Supervision Details
    supervision_level VARCHAR(30) CHECK (supervision_level IN (
        'attending_physician', 'consulting_physician', 'supervising_specialist',
        'medical_director', 'clinical_consultant', 'external_consultant'
    )),
    supervision_scope_ar TEXT,
    supervision_scope_en TEXT,
    available_hours JSONB DEFAULT '{}', -- Availability schedule
    
    -- Center-Specific Information
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    contract_type VARCHAR(20) CHECK (contract_type IN (
        'full_time', 'part_time', 'consultant', 'on_call', 'contractual'
    )),
    hourly_rate DECIMAL(10,2),
    consultation_fee DECIMAL(10,2),
    
    -- Emergency Availability
    emergency_contact BOOLEAN DEFAULT false,
    emergency_phone VARCHAR(20),
    emergency_availability_notes_ar TEXT,
    emergency_availability_notes_en TEXT,
    
    -- Performance and Quality
    patient_satisfaction_rating DECIMAL(3,2) CHECK (
        patient_satisfaction_rating >= 0 AND patient_satisfaction_rating <= 5
    ),
    clinical_performance_notes JSONB DEFAULT '{}',
    
    -- Status and Compliance
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'suspended', 'on_leave', 'terminated'
    )),
    background_check_date DATE,
    background_check_status VARCHAR(20),
    insurance_coverage JSONB DEFAULT '{}', -- Professional liability insurance
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for medical consultants
CREATE INDEX IF NOT EXISTS idx_medical_consultants_license ON medical_consultants(license_number);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_specialization ON medical_consultants(primary_specialization_ar);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_status ON medical_consultants(status);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_supervision ON medical_consultants(supervision_level);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_name_ar ON medical_consultants(first_name_ar, last_name_ar);

-- =============================================================================
-- CLINICAL DOCUMENTATION TABLE
-- SOAP notes and clinical session documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS clinical_documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE, -- Link to therapy session
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    medical_consultant_id UUID REFERENCES medical_consultants(id),
    
    -- Documentation Type
    documentation_type VARCHAR(30) DEFAULT 'soap_note' CHECK (documentation_type IN (
        'soap_note', 'progress_note', 'assessment_note', 'consultation_note',
        'incident_report', 'medical_review', 'discharge_summary'
    )),
    
    -- SOAP Notes Structure (Encrypted JSONB)
    soap_notes JSONB DEFAULT '{}', -- Complete SOAP documentation
    
    -- Subjective (Patient/Parent Report)
    subjective_ar TEXT,
    subjective_en TEXT,
    parent_report_ar TEXT,
    parent_report_en TEXT,
    patient_mood_ar TEXT,
    patient_mood_en TEXT,
    recent_events_ar TEXT,
    recent_events_en TEXT,
    
    -- Objective (Clinical Observations)
    objective_ar TEXT,
    objective_en TEXT,
    observed_behaviors TEXT[],
    vital_signs JSONB DEFAULT '{}', -- If applicable
    physical_observations_ar TEXT,
    physical_observations_en TEXT,
    
    -- Assessment (Clinical Analysis)
    assessment_ar TEXT NOT NULL,
    assessment_en TEXT,
    clinical_impression_ar TEXT,
    clinical_impression_en TEXT,
    progress_toward_goals_ar TEXT,
    progress_toward_goals_en TEXT,
    concerns_identified TEXT[],
    risk_factors TEXT[],
    
    -- Plan (Treatment Plan)
    plan_ar TEXT NOT NULL,
    plan_en TEXT,
    next_session_focus_ar TEXT,
    next_session_focus_en TEXT,
    home_program_ar TEXT,
    home_program_en TEXT,
    recommendations TEXT[],
    referrals_needed TEXT[],
    
    -- Behavioral Data (Quantitative)
    behavioral_data JSONB DEFAULT '{}', -- Structured behavioral observations
    frequency_data JSONB DEFAULT '{}', -- Behavior frequency tracking
    duration_data JSONB DEFAULT '{}', -- Activity duration tracking
    intensity_scores JSONB DEFAULT '{}', -- Behavior intensity ratings
    
    -- Progress Metrics (Quantitative)
    progress_metrics JSONB DEFAULT '{}', -- Measurable progress indicators
    goal_achievement_percentage INTEGER CHECK (
        goal_achievement_percentage >= 0 AND goal_achievement_percentage <= 100
    ),
    session_effectiveness_rating INTEGER CHECK (
        session_effectiveness_rating >= 1 AND session_effectiveness_rating <= 5
    ),
    
    -- Interventions Used
    interventions_used TEXT[],
    materials_utilized TEXT[],
    modifications_made_ar TEXT,
    modifications_made_en TEXT,
    
    -- Session Details
    session_date DATE NOT NULL,
    session_duration_minutes INTEGER,
    session_location_ar TEXT,
    session_location_en TEXT,
    attendees TEXT[], -- Who was present during session
    
    -- Medical Considerations
    medical_observations_ar TEXT,
    medical_observations_en TEXT,
    medication_effects_noted_ar TEXT,
    medication_effects_noted_en TEXT,
    side_effects_observed TEXT[],
    contraindications_noted TEXT[],
    
    -- Follow-up Requirements
    follow_up_needed BOOLEAN DEFAULT false,
    follow_up_timeframe VARCHAR(20),
    follow_up_type VARCHAR(30),
    urgency_level VARCHAR(20) DEFAULT 'routine' CHECK (urgency_level IN (
        'routine', 'urgent', 'immediate', 'scheduled'
    )),
    
    -- Quality and Compliance
    is_encrypted BOOLEAN DEFAULT true,
    requires_medical_review BOOLEAN DEFAULT false,
    reviewed_by_medical_consultant UUID REFERENCES medical_consultants(id),
    medical_review_date DATE,
    medical_review_notes_ar TEXT,
    medical_review_notes_en TEXT,
    
    -- Digital Signatures
    therapist_signature JSONB DEFAULT '{}', -- Digital signature data
    medical_consultant_signature JSONB DEFAULT '{}',
    parent_acknowledgment JSONB DEFAULT '{}',
    
    -- Status and Workflow
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    approval_workflow JSONB DEFAULT '{}', -- Approval process tracking
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for clinical documentation
CREATE INDEX IF NOT EXISTS idx_clinical_docs_session_id ON clinical_documentation(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_student_id ON clinical_documentation(student_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_date ON clinical_documentation(session_date);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_type ON clinical_documentation(documentation_type);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_status ON clinical_documentation(status);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_consultant ON clinical_documentation(medical_consultant_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_follow_up ON clinical_documentation(follow_up_needed, urgency_level);

-- =============================================================================
-- MEDICAL SUPERVISION ASSIGNMENTS
-- Track which consultants supervise which students/therapists
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_supervision_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medical_consultant_id UUID NOT NULL REFERENCES medical_consultants(id),
    student_id UUID REFERENCES students(id), -- If supervising specific student
    therapist_id UUID REFERENCES therapists(id), -- If supervising specific therapist
    therapy_plan_id UUID REFERENCES therapy_plans(id), -- If supervising specific plan
    
    -- Supervision Details
    supervision_type VARCHAR(30) CHECK (supervision_type IN (
        'direct_patient_care', 'therapist_supervision', 'program_oversight',
        'case_consultation', 'emergency_consultation', 'periodic_review'
    )),
    
    -- Schedule Information
    supervision_frequency VARCHAR(20), -- weekly, bi-weekly, monthly, as-needed
    scheduled_days TEXT[], -- Days of week for supervision
    supervision_duration_minutes INTEGER DEFAULT 60,
    
    -- Supervision Scope
    scope_description_ar TEXT,
    scope_description_en TEXT,
    responsibilities TEXT[],
    authority_level VARCHAR(20) CHECK (authority_level IN (
        'advisory', 'oversight', 'direct_supervision', 'full_authority'
    )),
    
    -- Communication Preferences
    communication_method VARCHAR(20) DEFAULT 'in_person' CHECK (communication_method IN (
        'in_person', 'video_call', 'phone', 'written_reports', 'combination'
    )),
    emergency_contact_required BOOLEAN DEFAULT false,
    
    -- Assignment Dates
    assignment_start_date DATE DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'paused', 'completed', 'terminated'
    )),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    
    -- Ensure logical constraints
    CHECK (
        (student_id IS NOT NULL) OR 
        (therapist_id IS NOT NULL) OR 
        (therapy_plan_id IS NOT NULL)
    )
);

-- Add indexes for supervision assignments
CREATE INDEX IF NOT EXISTS idx_supervision_consultant ON medical_supervision_assignments(medical_consultant_id);
CREATE INDEX IF NOT EXISTS idx_supervision_student ON medical_supervision_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_supervision_therapist ON medical_supervision_assignments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_supervision_type ON medical_supervision_assignments(supervision_type);
CREATE INDEX IF NOT EXISTS idx_supervision_status ON medical_supervision_assignments(status);

-- =============================================================================
-- UPDATE EXISTING TABLES FOR MEDICAL COMPLIANCE
-- =============================================================================

-- Add medical supervision fields to therapy_plans
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS requires_medical_supervision BOOLEAN DEFAULT false;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_clearance_required BOOLEAN DEFAULT false;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS contraindications TEXT[];
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_precautions_ar TEXT;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_precautions_en TEXT;

-- Add medical fields to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS requires_medical_review BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS medical_notes_ar TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS medical_notes_en TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vital_signs_required BOOLEAN DEFAULT false;

-- Add medical fields to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS requires_medical_monitoring BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_emergency_protocol TEXT;

-- =============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================================================

-- Generate unique medical record number
CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    record_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(medical_records.medical_record_number FROM 'MED-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM medical_records
    WHERE medical_records.medical_record_number LIKE 'MED-' || current_year || '-%';
    
    -- Format with leading zeros
    record_number := 'MED-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN record_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate medical record number before insert
CREATE OR REPLACE FUNCTION set_medical_record_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.medical_record_number IS NULL OR NEW.medical_record_number = '' THEN
        NEW.medical_record_number := generate_medical_record_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_medical_record_number
    BEFORE INSERT ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION set_medical_record_number();

-- Function to update BMI when weight or height changes
CREATE OR REPLACE FUNCTION update_medical_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- BMI is automatically calculated as a generated column
    -- This function can be extended for other calculated medical metrics
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medical_metrics
    BEFORE UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_metrics();

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_medical_records_updated_at 
    BEFORE UPDATE ON medical_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_consultants_updated_at 
    BEFORE UPDATE ON medical_consultants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_documentation_updated_at 
    BEFORE UPDATE ON clinical_documentation 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_supervision_assignments_updated_at 
    BEFORE UPDATE ON medical_supervision_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE medical_records IS 'Comprehensive medical records with encryption and compliance features';
COMMENT ON TABLE medical_consultants IS 'Healthcare professionals providing medical supervision and consultation';
COMMENT ON TABLE clinical_documentation IS 'SOAP notes and clinical session documentation with medical review';
COMMENT ON TABLE medical_supervision_assignments IS 'Assignment of medical consultants to students, therapists, or programs';

COMMENT ON COLUMN medical_records.medical_history IS 'Encrypted JSONB containing comprehensive medical history';
COMMENT ON COLUMN medical_records.audit_log IS 'Complete audit trail of all record changes';
COMMENT ON COLUMN clinical_documentation.soap_notes IS 'Structured SOAP notes in encrypted JSONB format';
COMMENT ON COLUMN medical_consultants.supervision_level IS 'Level of medical supervision authority';

-- =============================================================================
-- INITIAL DATA FOR TESTING
-- =============================================================================

-- Insert sample medical consultant
INSERT INTO medical_consultants (
    first_name_ar, last_name_ar, first_name_en, last_name_en,
    title_ar, title_en, license_number, license_type,
    primary_specialization_ar, primary_specialization_en,
    supervision_level, years_of_experience,
    primary_phone, email, clinic_name_ar, clinic_name_en,
    status, contract_type
) VALUES (
    'أيمن', 'الحازمي', 'Ayman', 'Al-Hazimi',
    'د.', 'Dr.', 'MD-2024-001', 'Medical Doctor',
    'طب الأطفال التطويري', 'Developmental Pediatrics',
    'medical_director', 15,
    '+966501234567', 'dr.ayman@arkancenter.com',
    'مركز أركان النمو', 'Arkan Growth Center',
    'active', 'full_time'
);

-- Success verification
SELECT 'Medical Foundation Schema created successfully!' as status;