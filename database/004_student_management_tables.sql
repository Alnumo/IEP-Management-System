-- Student Management System Tables
-- Phase 2: Database Schema for Students, Parents, and Document Management
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- STUDENTS TABLE
-- Core table for student information with bilingual support
-- =============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Personal Details
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
    nationality_ar TEXT DEFAULT 'سعودي',
    nationality_en TEXT DEFAULT 'Saudi',
    national_id VARCHAR(20) UNIQUE, -- Saudi National ID or Iqama
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Medical Information
    diagnosis_ar TEXT,
    diagnosis_en TEXT,
    severity_level VARCHAR(20) CHECK (severity_level IN ('mild', 'moderate', 'severe')),
    allergies_ar TEXT,
    allergies_en TEXT,
    medications_ar TEXT,
    medications_en TEXT,
    special_needs_ar TEXT,
    special_needs_en TEXT,
    
    -- Educational Information
    school_name_ar TEXT,
    school_name_en TEXT,
    grade_level VARCHAR(20),
    educational_support_ar TEXT,
    educational_support_en TEXT,
    
    -- Therapy Information
    referral_source_ar TEXT,
    referral_source_en TEXT,
    therapy_goals_ar TEXT,
    therapy_goals_en TEXT,
    
    -- System Fields
    registration_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: STU-2025-0001
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended')),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    last_assessment_date DATE,
    next_review_date DATE,
    
    -- File Attachments
    profile_photo_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_registration_number ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_name_ar ON students(first_name_ar, last_name_ar);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);

-- =============================================================================
-- PARENTS/GUARDIANS TABLE
-- Information about parents and guardians with relationship types
-- =============================================================================
CREATE TABLE IF NOT EXISTS parents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Personal Details
    relationship_to_student VARCHAR(20) CHECK (relationship_to_student IN ('father', 'mother', 'guardian', 'caregiver', 'other')) NOT NULL,
    national_id VARCHAR(20) UNIQUE, -- Saudi National ID or Iqama
    date_of_birth DATE,
    nationality_ar TEXT DEFAULT 'سعودي',
    nationality_en TEXT DEFAULT 'Saudi',
    
    -- Contact Information
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    preferred_contact_method VARCHAR(20) DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'email', 'whatsapp', 'sms')),
    preferred_language VARCHAR(5) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    
    -- Address Information
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Professional Information
    occupation_ar TEXT,
    occupation_en TEXT,
    employer_ar TEXT,
    employer_en TEXT,
    work_phone VARCHAR(20),
    
    -- Emergency Contact Priority
    is_primary_contact BOOLEAN DEFAULT false,
    is_emergency_contact BOOLEAN DEFAULT false,
    can_pickup_student BOOLEAN DEFAULT false,
    
    -- Communication Preferences
    receive_appointment_reminders BOOLEAN DEFAULT true,
    receive_progress_updates BOOLEAN DEFAULT true,
    receive_newsletters BOOLEAN DEFAULT true,
    receive_emergency_notifications BOOLEAN DEFAULT true,
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_primary_phone ON parents(primary_phone);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_national_id ON parents(national_id);
CREATE INDEX IF NOT EXISTS idx_parents_name_ar ON parents(first_name_ar, last_name_ar);

-- =============================================================================
-- STUDENT-PARENT RELATIONSHIPS
-- Many-to-many relationship between students and parents
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_parents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    
    -- Relationship Details
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('father', 'mother', 'guardian', 'caregiver', 'emergency_contact')),
    is_primary_guardian BOOLEAN DEFAULT false,
    custody_details_ar TEXT,
    custody_details_en TEXT,
    
    -- Permissions
    can_authorize_treatment BOOLEAN DEFAULT false,
    can_pickup_student BOOLEAN DEFAULT false,
    can_access_records BOOLEAN DEFAULT false,
    can_receive_reports BOOLEAN DEFAULT false,
    
    -- Contact Priority
    contact_priority INTEGER DEFAULT 1, -- 1 = primary, 2 = secondary, etc.
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique student-parent relationships
    UNIQUE(student_id, parent_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON student_parents(parent_id);

-- =============================================================================
-- EMERGENCY CONTACTS
-- Additional emergency contacts beyond parents
-- =============================================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Contact Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Relationship and Contact Details
    relationship_ar TEXT NOT NULL, -- e.g., "عم", "خال", "صديق العائلة"
    relationship_en TEXT,
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Address Information
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT,
    city_en TEXT,
    
    -- Permissions and Priority
    contact_priority INTEGER DEFAULT 1, -- 1 = first emergency contact, 2 = second, etc.
    can_pickup_student BOOLEAN DEFAULT false,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_student_id ON emergency_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(student_id, contact_priority);

-- =============================================================================
-- STUDENT DOCUMENTS
-- File management for student documents and medical records
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Document Information (Bilingual)
    document_name_ar TEXT NOT NULL,
    document_name_en TEXT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'medical_report', 'assessment_report', 'therapy_plan', 'progress_report',
        'educational_report', 'psychological_evaluation', 'speech_evaluation',
        'occupational_evaluation', 'behavioral_plan', 'iep', 'legal_document',
        'insurance_document', 'photo', 'other'
    )),
    
    -- File Information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_size BIGINT, -- File size in bytes
    file_type VARCHAR(50), -- MIME type
    file_url TEXT, -- Supabase public URL (if public)
    
    -- Document Metadata
    document_date DATE,
    expiry_date DATE,
    is_confidential BOOLEAN DEFAULT true,
    requires_authorization BOOLEAN DEFAULT false,
    
    -- Description and Notes (Bilingual)
    description_ar TEXT,
    description_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON student_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_student_documents_date ON student_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents(status);

-- =============================================================================
-- MEDICAL HISTORY
-- Detailed medical history and health information
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Medical Condition Information (Bilingual)
    condition_name_ar TEXT NOT NULL,
    condition_name_en TEXT,
    diagnosis_code VARCHAR(20), -- ICD-10 or similar
    
    -- Medical Details
    date_diagnosed DATE,
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'managed', 'inactive')),
    
    -- Treatment Information (Bilingual)
    treatment_ar TEXT,
    treatment_en TEXT,
    medications_ar TEXT,
    medications_en TEXT,
    side_effects_ar TEXT,
    side_effects_en TEXT,
    
    -- Healthcare Provider Information (Bilingual)
    doctor_name_ar TEXT,
    doctor_name_en TEXT,
    hospital_clinic_ar TEXT,
    hospital_clinic_en TEXT,
    doctor_phone VARCHAR(20),
    doctor_email VARCHAR(255),
    
    -- Additional Information (Bilingual)
    symptoms_ar TEXT,
    symptoms_en TEXT,
    triggers_ar TEXT,
    triggers_en TEXT,
    precautions_ar TEXT,
    precautions_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- System Fields
    requires_immediate_attention BOOLEAN DEFAULT false,
    affects_therapy BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_history_student_id ON medical_history(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_status ON medical_history(status);
CREATE INDEX IF NOT EXISTS idx_medical_history_immediate_attention ON medical_history(requires_immediate_attention);

-- =============================================================================
-- STUDENT THERAPY PLANS
-- Assignment of therapy plans to students with customization
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_therapy_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_plan_id UUID NOT NULL REFERENCES therapy_plans(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'paused', 'cancelled')),
    
    -- Plan Customization (Bilingual)
    custom_goals_ar TEXT,
    custom_goals_en TEXT,
    custom_notes_ar TEXT,
    custom_notes_en TEXT,
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_milestone_ar TEXT,
    current_milestone_en TEXT,
    
    -- Pricing and Billing
    agreed_price DECIMAL(10, 2),
    payment_schedule VARCHAR(20) DEFAULT 'monthly' CHECK (payment_schedule IN ('weekly', 'monthly', 'quarterly', 'full')),
    discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    total_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Therapist Assignment
    primary_therapist_id UUID REFERENCES auth.users(id),
    secondary_therapist_id UUID REFERENCES auth.users(id),
    
    -- Scheduling Information
    sessions_per_week INTEGER DEFAULT 2,
    session_duration_minutes INTEGER DEFAULT 45,
    preferred_time_slot VARCHAR(20), -- e.g., "morning", "afternoon", "evening"
    preferred_days TEXT, -- JSON array of preferred days
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique active plan per student per therapy type
    UNIQUE(student_id, therapy_plan_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_student_id ON student_therapy_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_therapy_plan_id ON student_therapy_plans(therapy_plan_id);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_status ON student_therapy_plans(status);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_start_date ON student_therapy_plans(start_date);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_therapist ON student_therapy_plans(primary_therapist_id);

-- =============================================================================
-- STUDENT ASSESSMENTS
-- Track various assessments and evaluations
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Assessment Information (Bilingual)
    assessment_name_ar TEXT NOT NULL,
    assessment_name_en TEXT,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN (
        'initial_assessment', 'progress_assessment', 'final_assessment',
        'speech_evaluation', 'occupational_evaluation', 'psychological_evaluation',
        'educational_assessment', 'behavioral_assessment', 'cognitive_assessment'
    )),
    
    -- Assessment Details
    assessment_date DATE NOT NULL,
    conducted_by UUID REFERENCES auth.users(id),
    duration_minutes INTEGER,
    
    -- Results and Scores
    overall_score DECIMAL(5, 2),
    max_possible_score DECIMAL(5, 2),
    percentage_score DECIMAL(5, 2),
    performance_level VARCHAR(20) CHECK (performance_level IN ('below_average', 'average', 'above_average', 'excellent')),
    
    -- Detailed Results (Bilingual)
    strengths_ar TEXT,
    strengths_en TEXT,
    weaknesses_ar TEXT,
    weaknesses_en TEXT,
    recommendations_ar TEXT,
    recommendations_en TEXT,
    
    -- Assessment Data (JSON for flexible structure)
    assessment_data JSONB,
    
    -- File Attachments
    report_file_path TEXT, -- Supabase Storage path for full report
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    is_baseline BOOLEAN DEFAULT false, -- Mark as baseline assessment
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_id ON student_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_type ON student_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_student_assessments_date ON student_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_student_assessments_conducted_by ON student_assessments(conducted_by);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables that have updated_at column
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_parents_updated_at BEFORE UPDATE ON student_parents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON student_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON medical_history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_therapy_plans_updated_at BEFORE UPDATE ON student_therapy_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_assessments_updated_at BEFORE UPDATE ON student_assessments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================================================

-- Generate unique registration number for students
CREATE OR REPLACE FUNCTION generate_student_registration_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    registration_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(students.registration_number FROM 'STU-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM students
    WHERE students.registration_number LIKE 'STU-' || current_year || '-%';
    
    -- Format with leading zeros
    registration_number := 'STU-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN registration_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate registration number before insert
CREATE OR REPLACE FUNCTION set_student_registration_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_number IS NULL OR NEW.registration_number = '' THEN
        NEW.registration_number := generate_student_registration_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_student_registration_number
    BEFORE INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION set_student_registration_number();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE students IS 'Core table storing comprehensive student information with bilingual support';
COMMENT ON TABLE parents IS 'Parent and guardian information with contact preferences and permissions';
COMMENT ON TABLE student_parents IS 'Many-to-many relationship between students and their parents/guardians';
COMMENT ON TABLE emergency_contacts IS 'Additional emergency contacts beyond parents for each student';
COMMENT ON TABLE student_documents IS 'File management system for student documents and medical records';
COMMENT ON TABLE medical_history IS 'Detailed medical history and health information for each student';
COMMENT ON TABLE student_therapy_plans IS 'Assignment and tracking of therapy plans for students';
COMMENT ON TABLE student_assessments IS 'Various assessments and evaluations conducted for students';

-- End of Student Management Schema
-- This schema provides a comprehensive foundation for managing students,
-- their relationships, medical information, documents, and therapy assignments
-- in the Arkan Al-Numo Center ERP system.