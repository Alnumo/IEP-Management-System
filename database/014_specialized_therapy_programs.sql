-- =====================================================================
-- Migration 14: Specialized Therapy Programs Schema
-- Phase 2: 12 Specialized therapy programs with program-specific features
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- THERAPY PROGRAMS TABLE
-- Configuration for 12 specialized therapy programs
-- =============================================================================
CREATE TABLE IF NOT EXISTS therapy_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Program Identification
    program_code VARCHAR(10) UNIQUE NOT NULL, -- ABA, ST, OT, PT, etc.
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    -- Program Classification
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'intensive', 'therapeutic', 'educational', 'behavioral', 
        'developmental', 'sensory', 'communication', 'motor'
    )),
    intensity_level VARCHAR(20) CHECK (intensity_level IN (
        'low', 'moderate', 'high', 'intensive'
    )),
    
    -- Program Configuration
    default_sessions_per_week INTEGER DEFAULT 2 CHECK (default_sessions_per_week > 0),
    default_session_duration_minutes INTEGER DEFAULT 45 CHECK (default_session_duration_minutes > 0),
    minimum_age_months INTEGER DEFAULT 12,
    maximum_age_months INTEGER DEFAULT 216, -- 18 years
    
    -- Assessment and Documentation
    assessment_tools JSONB DEFAULT '[]', -- Array of standard assessment tools
    documentation_template JSONB DEFAULT '{}', -- Program-specific documentation
    intervention_protocols JSONB DEFAULT '{}', -- Standard intervention protocols
    
    -- Billing and Pricing
    billing_codes TEXT[], -- Insurance billing codes
    default_price_per_session DECIMAL(10,2),
    group_session_multiplier DECIMAL(3,2) DEFAULT 1.0,
    
    -- Medical Requirements
    requires_medical_clearance BOOLEAN DEFAULT false,
    contraindications TEXT[],
    precautions_ar TEXT,
    precautions_en TEXT,
    
    -- Program Description
    description_ar TEXT,
    description_en TEXT,
    objectives_ar TEXT[],
    objectives_en TEXT[],
    target_conditions TEXT[], -- Conditions this program addresses
    
    -- Resource Requirements
    required_materials JSONB DEFAULT '[]',
    required_space_type VARCHAR(50), -- therapy_room, gym, sensory_room, etc.
    equipment_needed TEXT[],
    staff_qualifications TEXT[],
    
    -- Quality Metrics
    success_metrics JSONB DEFAULT '{}', -- How success is measured
    typical_duration_weeks INTEGER,
    graduation_criteria_ar TEXT,
    graduation_criteria_en TEXT,
    
    -- Status and Availability
    is_active BOOLEAN DEFAULT true,
    is_available_for_new_patients BOOLEAN DEFAULT true,
    waitlist_limit INTEGER DEFAULT 10,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for therapy programs
CREATE INDEX IF NOT EXISTS idx_therapy_programs_code ON therapy_programs(program_code);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_category ON therapy_programs(category);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_active ON therapy_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_age_range ON therapy_programs(minimum_age_months, maximum_age_months);

-- =============================================================================
-- PROGRAM-SPECIFIC DATA COLLECTION TABLES
-- =============================================================================

-- ABA (Applied Behavior Analysis) Data Collection
CREATE TABLE IF NOT EXISTS aba_data_collection (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- ABC Data (Antecedent, Behavior, Consequence)
    antecedent_ar TEXT,
    antecedent_en TEXT,
    behavior_description_ar TEXT NOT NULL,
    behavior_description_en TEXT,
    consequence_ar TEXT,
    consequence_en TEXT,
    
    -- Behavior Measurement
    behavior_frequency INTEGER DEFAULT 0,
    behavior_duration_seconds INTEGER,
    behavior_intensity INTEGER CHECK (behavior_intensity BETWEEN 1 AND 5),
    intervention_used TEXT,
    
    -- Discrete Trial Data
    trial_number INTEGER,
    target_skill_ar TEXT,
    target_skill_en TEXT,
    prompt_level VARCHAR(20), -- independent, gestural, verbal, physical
    response_accuracy BOOLEAN,
    response_latency_seconds INTEGER,
    
    -- Reinforcement Data
    reinforcer_used TEXT,
    reinforcement_schedule VARCHAR(30), -- continuous, fixed_ratio, variable_ratio, etc.
    reinforcement_effectiveness INTEGER CHECK (reinforcement_effectiveness BETWEEN 1 AND 5),
    
    -- Environmental Factors
    environment_description TEXT,
    distractors_present TEXT[],
    staff_present TEXT[],
    
    -- Observation Details
    observation_start_time TIME,
    observation_end_time TIME,
    observation_date DATE DEFAULT CURRENT_DATE,
    observer_id UUID REFERENCES auth.users(id),
    
    -- Data Quality
    data_reliability_score DECIMAL(3,2), -- Inter-observer reliability
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Speech Therapy Progress Tracking
CREATE TABLE IF NOT EXISTS speech_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Articulation Data
    target_sounds TEXT[], -- Sounds being worked on
    sound_accuracy_percentage JSONB DEFAULT '{}', -- {"s": 85, "r": 60}
    sound_position VARCHAR(20), -- initial, medial, final, blends
    
    -- Language Development
    vocabulary_introduced TEXT[],
    vocabulary_mastered TEXT[],
    sentence_length_words INTEGER,
    grammatical_structures TEXT[],
    
    -- Communication Data
    communication_attempts INTEGER DEFAULT 0,
    successful_communications INTEGER DEFAULT 0,
    communication_modality VARCHAR(30), -- verbal, gestural, aac, signs
    
    -- Fluency Measures (if applicable)
    words_per_minute DECIMAL(5,2),
    stuttering_frequency INTEGER,
    stuttering_severity VARCHAR(20), -- mild, moderate, severe
    
    -- Voice Quality (if applicable)
    vocal_quality VARCHAR(30), -- normal, hoarse, breathy, etc.
    vocal_pitch VARCHAR(20), -- appropriate, too_high, too_low
    vocal_volume VARCHAR(20), -- appropriate, too_loud, too_quiet
    
    -- Pragmatic Skills
    eye_contact_rating INTEGER CHECK (eye_contact_rating BETWEEN 1 AND 5),
    turn_taking_rating INTEGER CHECK (turn_taking_rating BETWEEN 1 AND 5),
    topic_maintenance_rating INTEGER CHECK (topic_maintenance_rating BETWEEN 1 AND 5),
    
    -- Session Activities
    activities_completed TEXT[],
    materials_used TEXT[],
    home_practice_assigned TEXT,
    
    -- Progress Notes
    strengths_observed_ar TEXT,
    strengths_observed_en TEXT,
    challenges_noted_ar TEXT,
    challenges_noted_en TEXT,
    recommendations_ar TEXT,
    recommendations_en TEXT,
    
    -- Assessment Scores
    assessment_type VARCHAR(50),
    assessment_score DECIMAL(5,2),
    assessment_percentile INTEGER,
    
    -- Metadata
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- Occupational Therapy Assessment Data
CREATE TABLE IF NOT EXISTS occupational_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Fine Motor Skills
    fine_motor_tasks JSONB DEFAULT '{}', -- Task-specific scores
    grip_strength_kg DECIMAL(4,2),
    pincer_grasp_quality INTEGER CHECK (pincer_grasp_quality BETWEEN 1 AND 5),
    handwriting_quality INTEGER CHECK (handwriting_quality BETWEEN 1 AND 5),
    
    -- Gross Motor Skills
    gross_motor_tasks JSONB DEFAULT '{}',
    balance_score INTEGER CHECK (balance_score BETWEEN 1 AND 5),
    coordination_score INTEGER CHECK (coordination_score BETWEEN 1 AND 5),
    
    -- Sensory Processing
    sensory_profile JSONB DEFAULT '{}', -- Sensory preferences and sensitivities
    sensory_seeking_behaviors TEXT[],
    sensory_avoiding_behaviors TEXT[],
    sensory_diet_activities TEXT[],
    
    -- Activities of Daily Living (ADL)
    dressing_independence INTEGER CHECK (dressing_independence BETWEEN 1 AND 5),
    feeding_independence INTEGER CHECK (feeding_independence BETWEEN 1 AND 5),
    toileting_independence INTEGER CHECK (toileting_independence BETWEEN 1 AND 5),
    grooming_independence INTEGER CHECK (grooming_independence BETWEEN 1 AND 5),
    
    -- Cognitive-Motor Integration
    visual_motor_integration INTEGER CHECK (visual_motor_integration BETWEEN 1 AND 5),
    visual_perceptual_skills INTEGER CHECK (visual_perceptual_skills BETWEEN 1 AND 5),
    motor_planning_ability INTEGER CHECK (motor_planning_ability BETWEEN 1 AND 5),
    
    -- Environmental Modifications
    adaptations_used TEXT[],
    assistive_technology TEXT[],
    environmental_supports TEXT[],
    
    -- Goal Progress
    short_term_goals JSONB DEFAULT '[]',
    goal_progress_percentage JSONB DEFAULT '{}',
    mastered_skills TEXT[],
    emerging_skills TEXT[],
    
    -- Intervention Data
    intervention_techniques TEXT[],
    equipment_used TEXT[],
    session_focus_areas TEXT[],
    
    -- Family Training
    caregiver_training_provided TEXT,
    home_program_activities TEXT[],
    caregiver_competency_level INTEGER CHECK (caregiver_competency_level BETWEEN 1 AND 5),
    
    -- Metadata
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- ASSESSMENT TOOLS MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS assessment_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Tool Identification
    tool_code VARCHAR(20) UNIQUE NOT NULL, -- CARS, ADOS, VB-MAPP, etc.
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    -- Tool Classification
    assessment_type VARCHAR(30) CHECK (assessment_type IN (
        'screening', 'diagnostic', 'progress_monitoring', 'outcome_measurement'
    )),
    domain VARCHAR(30) CHECK (domain IN (
        'autism', 'speech_language', 'occupational', 'behavioral', 
        'cognitive', 'social', 'motor', 'sensory', 'academic'
    )),
    
    -- Age and Population
    minimum_age_months INTEGER,
    maximum_age_months INTEGER,
    target_population_ar TEXT,
    target_population_en TEXT,
    
    -- Administration Details
    administration_time_minutes INTEGER,
    requires_training BOOLEAN DEFAULT false,
    certification_required BOOLEAN DEFAULT false,
    can_be_parent_reported BOOLEAN DEFAULT false,
    
    -- Scoring and Interpretation
    scoring_method VARCHAR(30), -- manual, automated, mixed
    score_range_min DECIMAL(8,2),
    score_range_max DECIMAL(8,2),
    interpretation_guide JSONB DEFAULT '{}',
    
    -- Tool Structure
    sections JSONB DEFAULT '[]', -- Assessment sections/domains
    total_items INTEGER,
    completion_criteria TEXT,
    
    -- Validity and Reliability
    validity_studies TEXT[],
    reliability_coefficient DECIMAL(3,2),
    normative_sample_size INTEGER,
    cultural_adaptations TEXT[],
    
    -- Digital Implementation
    digital_version_available BOOLEAN DEFAULT false,
    scoring_algorithm JSONB DEFAULT '{}',
    report_template JSONB DEFAULT '{}',
    
    -- Usage and Licensing
    is_free BOOLEAN DEFAULT false,
    license_cost DECIMAL(10,2),
    license_expiry_date DATE,
    usage_restrictions TEXT,
    
    -- Quality Assurance
    last_updated_version DATE,
    evidence_base_strength VARCHAR(20), -- strong, moderate, limited
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_approved_for_use BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INTERVENTION PROTOCOLS
-- =============================================================================
CREATE TABLE IF NOT EXISTS intervention_protocols (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Protocol Identification
    protocol_name_ar TEXT NOT NULL,
    protocol_name_en TEXT NOT NULL,
    protocol_code VARCHAR(20) UNIQUE,
    
    -- Protocol Details
    description_ar TEXT,
    description_en TEXT,
    target_skills TEXT[],
    prerequisites TEXT[],
    
    -- Implementation Guidelines
    step_by_step_instructions JSONB DEFAULT '[]',
    materials_required TEXT[],
    environmental_setup_ar TEXT,
    environmental_setup_en TEXT,
    
    -- Measurement and Data Collection
    data_collection_method VARCHAR(30),
    frequency_of_measurement VARCHAR(20),
    success_criteria JSONB DEFAULT '{}',
    mastery_criteria_ar TEXT,
    mastery_criteria_en TEXT,
    
    -- Progression and Modification
    progression_steps JSONB DEFAULT '[]',
    modification_guidelines TEXT[],
    troubleshooting_tips JSONB DEFAULT '{}',
    
    -- Evidence Base
    research_evidence TEXT[],
    evidence_quality VARCHAR(20), -- high, moderate, low
    recommended_age_range VARCHAR(50),
    
    -- Safety and Contraindications
    safety_considerations TEXT[],
    contraindications TEXT[],
    precautions TEXT[],
    
    -- Training Requirements
    staff_training_required BOOLEAN DEFAULT false,
    training_duration_hours INTEGER,
    competency_requirements TEXT[],
    
    -- Approval and Quality
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'under_review', 'rejected'
    )),
    approved_by UUID REFERENCES medical_consultants(id),
    approval_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- PROGRAM ENROLLMENTS AND PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID NOT NULL REFERENCES therapy_programs(id),
    
    -- Enrollment Details
    enrollment_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    expected_end_date DATE,
    actual_end_date DATE,
    
    -- Program Configuration for Student
    sessions_per_week INTEGER DEFAULT 2,
    session_duration_minutes INTEGER DEFAULT 45,
    total_sessions_planned INTEGER,
    
    -- Goals and Objectives
    individual_goals JSONB DEFAULT '[]',
    modified_protocols JSONB DEFAULT '[]',
    accommodation_needs TEXT[],
    
    -- Progress Tracking
    sessions_completed INTEGER DEFAULT 0,
    sessions_missed INTEGER DEFAULT 0,
    current_mastery_level DECIMAL(5,2), -- Percentage
    
    -- Status and Outcomes
    enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN (
        'active', 'paused', 'completed', 'withdrawn', 'transferred'
    )),
    completion_reason VARCHAR(30),
    outcome_summary_ar TEXT,
    outcome_summary_en TEXT,
    
    -- Team Assignment
    primary_therapist_id UUID REFERENCES therapists(id),
    secondary_therapist_id UUID REFERENCES therapists(id),
    supervising_consultant_id UUID REFERENCES medical_consultants(id),
    
    -- Billing and Payments
    total_cost DECIMAL(10,2),
    payment_plan VARCHAR(20),
    insurance_coverage_percentage INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(student_id, therapy_program_id, enrollment_status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- ABA Data Collection Indexes
CREATE INDEX IF NOT EXISTS idx_aba_data_student_id ON aba_data_collection(student_id);
CREATE INDEX IF NOT EXISTS idx_aba_data_session_id ON aba_data_collection(session_id);
CREATE INDEX IF NOT EXISTS idx_aba_data_date ON aba_data_collection(observation_date);
CREATE INDEX IF NOT EXISTS idx_aba_data_behavior ON aba_data_collection(behavior_description_ar);

-- Speech Therapy Data Indexes
CREATE INDEX IF NOT EXISTS idx_speech_data_student_id ON speech_therapy_data(student_id);
CREATE INDEX IF NOT EXISTS idx_speech_data_session_id ON speech_therapy_data(session_id);
CREATE INDEX IF NOT EXISTS idx_speech_data_date ON speech_therapy_data(session_date);

-- Occupational Therapy Data Indexes
CREATE INDEX IF NOT EXISTS idx_ot_data_student_id ON occupational_therapy_data(student_id);
CREATE INDEX IF NOT EXISTS idx_ot_data_session_id ON occupational_therapy_data(session_id);
CREATE INDEX IF NOT EXISTS idx_ot_data_date ON occupational_therapy_data(session_date);

-- Assessment Tools Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_tools_code ON assessment_tools(tool_code);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_type ON assessment_tools(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_domain ON assessment_tools(domain);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_active ON assessment_tools(is_active);

-- Intervention Protocols Indexes
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_program ON intervention_protocols(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_code ON intervention_protocols(protocol_code);
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_status ON intervention_protocols(approval_status);

-- Program Enrollments Indexes
CREATE INDEX IF NOT EXISTS idx_program_enrollments_student ON program_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_status ON program_enrollments(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_therapist ON program_enrollments(primary_therapist_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_dates ON program_enrollments(start_date, expected_end_date);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_therapy_programs_updated_at 
    BEFORE UPDATE ON therapy_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aba_data_collection_updated_at 
    BEFORE UPDATE ON aba_data_collection 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speech_therapy_data_updated_at 
    BEFORE UPDATE ON speech_therapy_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occupational_therapy_data_updated_at 
    BEFORE UPDATE ON occupational_therapy_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_tools_updated_at 
    BEFORE UPDATE ON assessment_tools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_protocols_updated_at 
    BEFORE UPDATE ON intervention_protocols 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_enrollments_updated_at 
    BEFORE UPDATE ON program_enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE therapy_programs IS '12 specialized therapy programs with configurations and requirements';
COMMENT ON TABLE aba_data_collection IS 'Applied Behavior Analysis data collection and tracking';
COMMENT ON TABLE speech_therapy_data IS 'Speech and Language therapy progress and assessment data';
COMMENT ON TABLE occupational_therapy_data IS 'Occupational therapy assessment and intervention data';
COMMENT ON TABLE assessment_tools IS 'Standardized assessment tools library with scoring and interpretation';
COMMENT ON TABLE intervention_protocols IS 'Evidence-based intervention protocols for each therapy program';
COMMENT ON TABLE program_enrollments IS 'Student enrollment and progress tracking across therapy programs';

-- Success verification
SELECT 'Specialized Therapy Programs Schema created successfully!' as status;