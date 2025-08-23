-- =====================================================================
-- NEW MIGRATIONS ONLY - Missing Tables from Phase 1-3
-- Apply these if you already have the basic therapy plans system
-- =====================================================================

-- Check if we need to run these migrations
DO $$
BEGIN
    -- Only proceed if medical_records table doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_records') THEN
        RAISE NOTICE 'Applying new migrations for medical foundation, therapy programs, and assessments...';
    ELSE
        RAISE NOTICE 'Medical tables already exist, skipping migrations...';
    END IF;
END $$;

-- =====================================================================
-- MEDICAL FOUNDATION SCHEMA
-- =====================================================================

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Medical Identification
    medical_record_number VARCHAR(50) UNIQUE NOT NULL,
    primary_diagnosis_code TEXT[],
    secondary_diagnosis_codes TEXT[],
    
    -- Comprehensive Medical History (Encrypted JSONB)
    medical_history JSONB DEFAULT '{}',
    current_medications JSONB DEFAULT '{}',
    allergies TEXT[],
    emergency_protocol TEXT,
    
    -- Vital Information
    blood_type VARCHAR(5),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    bmi DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN height_cm > 0 THEN weight_kg / POWER(height_cm / 100, 2)
            ELSE NULL 
        END
    ) STORED,
    
    -- Insurance Information
    insurance_provider_ar TEXT,
    insurance_provider_en TEXT,
    policy_number VARCHAR(50),
    insurance_expiry_date DATE,
    coverage_details JSONB DEFAULT '{}',
    
    -- Compliance and Security
    last_medical_review_date DATE,
    next_review_due_date DATE,
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(100),
    data_classification VARCHAR(20) DEFAULT 'confidential',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    audit_log JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS medical_consultants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID REFERENCES therapists(id),
    
    -- Professional Information
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    title_ar TEXT,
    title_en TEXT,
    
    -- Medical Credentials
    license_number TEXT NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL,
    license_expiry_date DATE,
    
    -- Specialization Information
    primary_specialization_ar TEXT NOT NULL,
    primary_specialization_en TEXT,
    secondary_specializations TEXT[],
    
    -- Contact Information
    primary_phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Supervision Details
    supervision_level VARCHAR(30) CHECK (supervision_level IN (
        'attending_physician', 'consulting_physician', 'supervising_specialist',
        'medical_director', 'clinical_consultant', 'external_consultant'
    )),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'suspended', 'on_leave', 'terminated'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    medical_consultant_id UUID REFERENCES medical_consultants(id),
    
    documentation_type VARCHAR(30) DEFAULT 'soap_note',
    soap_notes JSONB DEFAULT '{}',
    
    -- SOAP Structure
    subjective_ar TEXT,
    subjective_en TEXT,
    objective_ar TEXT,
    objective_en TEXT,
    assessment_ar TEXT NOT NULL,
    assessment_en TEXT,
    plan_ar TEXT NOT NULL,
    plan_en TEXT,
    
    -- Session Details
    session_date DATE NOT NULL,
    session_duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================================
-- SPECIALIZED THERAPY PROGRAMS
-- =====================================================================

CREATE TABLE IF NOT EXISTS therapy_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    program_code VARCHAR(10) UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'intensive', 'therapeutic', 'educational', 'behavioral', 
        'developmental', 'sensory', 'communication', 'motor'
    )),
    intensity_level VARCHAR(20) CHECK (intensity_level IN (
        'low', 'moderate', 'high', 'intensive'
    )),
    
    default_sessions_per_week INTEGER DEFAULT 2,
    default_session_duration_minutes INTEGER DEFAULT 45,
    minimum_age_months INTEGER DEFAULT 12,
    maximum_age_months INTEGER DEFAULT 216,
    
    assessment_tools JSONB DEFAULT '[]',
    intervention_protocols JSONB DEFAULT '{}',
    billing_codes TEXT[],
    default_price_per_session DECIMAL(10,2),
    
    description_ar TEXT,
    description_en TEXT,
    objectives_ar TEXT[],
    objectives_en TEXT[],
    target_conditions TEXT[],
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    tool_code VARCHAR(20) UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    assessment_type VARCHAR(30) CHECK (assessment_type IN (
        'screening', 'diagnostic', 'progress_monitoring', 'outcome_measurement'
    )),
    domain VARCHAR(30) CHECK (domain IN (
        'autism', 'speech_language', 'occupational', 'behavioral', 
        'cognitive', 'social', 'motor', 'sensory', 'academic'
    )),
    
    minimum_age_months INTEGER,
    maximum_age_months INTEGER,
    administration_time_minutes INTEGER,
    
    is_active BOOLEAN DEFAULT true,
    is_approved_for_use BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- ASSESSMENT & CLINICAL DOCUMENTATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS soap_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    template_name_ar TEXT NOT NULL,
    template_name_en TEXT NOT NULL,
    template_code VARCHAR(20) UNIQUE NOT NULL,
    
    subjective_fields JSONB DEFAULT '[]',
    objective_fields JSONB DEFAULT '[]',
    assessment_fields JSONB DEFAULT '[]',
    plan_fields JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT true,
    is_default_for_program BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_tool_id UUID NOT NULL REFERENCES assessment_tools(id),
    
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL REFERENCES auth.users(id),
    assessment_purpose VARCHAR(50),
    
    raw_scores JSONB DEFAULT '{}',
    standard_scores JSONB DEFAULT '{}',
    percentile_ranks JSONB DEFAULT '{}',
    overall_score DECIMAL(8,2),
    
    interpretation_summary_ar TEXT,
    interpretation_summary_en TEXT,
    strengths_identified TEXT[],
    areas_of_concern TEXT[],
    
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS therapeutic_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    goal_number INTEGER NOT NULL,
    goal_category VARCHAR(50) NOT NULL,
    goal_domain VARCHAR(50) NOT NULL,
    
    goal_statement_ar TEXT NOT NULL,
    goal_statement_en TEXT,
    
    baseline_data JSONB DEFAULT '{}',
    target_criteria JSONB DEFAULT '{}',
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'achieved', 'discontinued', 'modified', 'on_hold'
    )),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    time_bound_deadline DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS developmental_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    milestone_code VARCHAR(20) UNIQUE NOT NULL,
    milestone_name_ar TEXT NOT NULL,
    milestone_name_en TEXT,
    
    typical_age_months_min INTEGER,
    typical_age_months_max INTEGER,
    developmental_domain VARCHAR(30),
    
    description_ar TEXT,
    description_en TEXT,
    observable_behaviors TEXT[],
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- INSERT SAMPLE DATA
-- =====================================================================

-- Insert therapy programs
INSERT INTO therapy_programs (
    program_code, name_ar, name_en, category, intensity_level,
    default_sessions_per_week, default_session_duration_minutes,
    minimum_age_months, maximum_age_months,
    description_ar, description_en, is_active
) VALUES
('ABA', 'تحليل السلوك التطبيقي', 'Applied Behavior Analysis', 'intensive', 'intensive', 20, 180, 18, 216, 'برنامج مكثف لتحليل السلوك التطبيقي', 'Intensive Applied Behavior Analysis program', true),
('ST', 'علاج النطق واللغة', 'Speech & Language Therapy', 'therapeutic', 'moderate', 3, 45, 12, 216, 'برنامج شامل لعلاج اضطرابات النطق واللغة', 'Comprehensive speech and language therapy program', true),
('OT', 'العلاج الوظيفي', 'Occupational Therapy', 'therapeutic', 'moderate', 4, 45, 6, 216, 'برنامج العلاج الوظيفي', 'Occupational therapy program', true)
ON CONFLICT (program_code) DO NOTHING;

-- Insert assessment tools
INSERT INTO assessment_tools (
    tool_code, name_ar, name_en, assessment_type, domain,
    minimum_age_months, maximum_age_months, administration_time_minutes,
    is_active, is_approved_for_use
) VALUES
('VB-MAPP', 'تقييم معالم السلوك اللفظي', 'Verbal Behavior Milestones Assessment', 'progress_monitoring', 'autism', 18, 216, 120, true, true),
('CARS-2', 'مقياس تقدير التوحد في الطفولة', 'Childhood Autism Rating Scale', 'diagnostic', 'autism', 24, 72, 30, true, true),
('PLS-5', 'مقاييس لغة ما قبل المدرسة', 'Preschool Language Scales', 'diagnostic', 'speech_language', 0, 89, 45, true, true)
ON CONFLICT (tool_code) DO NOTHING;

-- Insert developmental milestones
INSERT INTO developmental_milestones (
    milestone_code, milestone_name_ar, milestone_name_en,
    typical_age_months_min, typical_age_months_max, developmental_domain,
    description_ar, description_en, observable_behaviors
) VALUES
('COMM_001', 'الابتسامة الاجتماعية', 'Social Smile', 2, 4, 'communication', 'ابتسامة استجابة للتفاعل الاجتماعي', 'Smile in response to social interaction', ARRAY['smiles_at_faces', 'responds_to_voice']),
('COMM_002', 'المناغاة', 'Babbling', 4, 7, 'communication', 'إنتاج أصوات متكررة', 'Production of repetitive sounds', ARRAY['repetitive_syllables', 'consonant_vowel_combinations']),
('MOTOR_001', 'رفع الرأس', 'Head Lift', 1, 3, 'gross_motor', 'رفع الرأس أثناء الاستلقاء على البطن', 'Lifting head while lying on stomach', ARRAY['head_control', 'neck_strength'])
ON CONFLICT (milestone_code) DO NOTHING;

-- Insert SOAP templates
INSERT INTO soap_templates (
    therapy_program_id, template_name_ar, template_name_en, template_code,
    subjective_fields, objective_fields, assessment_fields, plan_fields,
    is_active, is_default_for_program
) VALUES
(
    (SELECT id FROM therapy_programs WHERE program_code = 'ABA'),
    'قالب SOAP لتحليل السلوك التطبيقي', 'ABA SOAP Template', 'SOAP_ABA_001',
    '[{"id": "parent_report", "label_ar": "تقرير الوالدين", "label_en": "Parent Report", "type": "textarea", "required": true}]'::jsonb,
    '[{"id": "target_behaviors", "label_ar": "السلوكيات المستهدفة", "label_en": "Target Behaviors", "type": "behavior_tracker", "required": true}]'::jsonb,
    '[{"id": "goal_progress", "label_ar": "تقدم الأهداف", "label_en": "Goal Progress", "type": "goal_tracker", "required": true}]'::jsonb,
    '[{"id": "next_session_focus", "label_ar": "تركيز الجلسة القادمة", "label_en": "Next Session Focus", "type": "textarea", "required": true}]'::jsonb,
    true, true
)
ON CONFLICT (template_code) DO NOTHING;

-- Add medical record number generation function
CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    record_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(medical_records.medical_record_number FROM 'MED-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM medical_records
    WHERE medical_records.medical_record_number LIKE 'MED-' || current_year || '-%';
    
    record_number := 'MED-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN record_number;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for medical record number generation
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

-- Success message
SELECT 'New migrations applied successfully!' as status,
       'Medical Foundation: ' || (SELECT COUNT(*) FROM medical_records) as medical_count,
       'Therapy Programs: ' || (SELECT COUNT(*) FROM therapy_programs) as programs_count,
       'Assessment Tools: ' || (SELECT COUNT(*) FROM assessment_tools) as tools_count,
       'Milestones: ' || (SELECT COUNT(*) FROM developmental_milestones) as milestones_count,
       'SOAP Templates: ' || (SELECT COUNT(*) FROM soap_templates) as soap_count;