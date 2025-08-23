-- =====================================================================
-- MISSING TABLES SUPPLEMENT
-- Adding the remaining 9 missing tables
-- =====================================================================

-- Medical Supervision Assignments
CREATE TABLE IF NOT EXISTS medical_supervision_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medical_consultant_id UUID NOT NULL REFERENCES medical_consultants(id),
    student_id UUID REFERENCES students(id),
    therapist_id UUID REFERENCES therapists(id),
    
    supervision_type VARCHAR(50) CHECK (supervision_type IN (
        'direct_patient_care', 'therapist_supervision', 'program_oversight', 
        'case_consultation', 'emergency_consultation', 'periodic_review'
    )),
    
    supervision_frequency VARCHAR(30),
    scheduled_days TEXT[],
    supervision_duration_minutes INTEGER DEFAULT 60,
    
    scope_description_ar TEXT,
    scope_description_en TEXT,
    responsibilities TEXT[],
    authority_level VARCHAR(30) CHECK (authority_level IN (
        'advisory', 'oversight', 'direct_supervision', 'full_authority'
    )),
    
    communication_method VARCHAR(30) CHECK (communication_method IN (
        'in_person', 'video_call', 'phone', 'written_reports', 'combination'
    )),
    emergency_contact_required BOOLEAN DEFAULT false,
    
    assignment_start_date DATE DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'paused', 'completed', 'terminated'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id)
);

-- ABA Data Collection
CREATE TABLE IF NOT EXISTS aba_data_collection (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
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
    prompt_level VARCHAR(20) CHECK (prompt_level IN (
        'independent', 'gestural', 'verbal', 'physical'
    )),
    response_accuracy BOOLEAN,
    response_latency_seconds INTEGER,
    
    -- Reinforcement Data
    reinforcer_used TEXT,
    reinforcement_schedule TEXT,
    reinforcement_effectiveness INTEGER CHECK (reinforcement_effectiveness BETWEEN 1 AND 5),
    
    -- Environmental Factors
    environment_description TEXT,
    distractors_present TEXT[],
    staff_present TEXT[],
    
    -- Observation Details
    observation_start_time TIME,
    observation_end_time TIME,
    observation_date DATE NOT NULL,
    observer_id UUID REFERENCES auth.users(id),
    
    -- Data Quality
    data_reliability_score DECIMAL(3,2),
    notes_ar TEXT,
    notes_en TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Speech Therapy Data
CREATE TABLE IF NOT EXISTS speech_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Articulation Data
    target_sounds TEXT[],
    sound_accuracy_percentage JSONB DEFAULT '{}',
    sound_position VARCHAR(20) CHECK (sound_position IN (
        'initial', 'medial', 'final', 'blends'
    )),
    
    -- Language Development
    vocabulary_introduced TEXT[],
    vocabulary_mastered TEXT[],
    sentence_length_words INTEGER,
    grammatical_structures TEXT[],
    
    -- Communication Data
    communication_attempts INTEGER DEFAULT 0,
    successful_communications INTEGER DEFAULT 0,
    communication_modality VARCHAR(20) CHECK (communication_modality IN (
        'verbal', 'gestural', 'aac', 'signs'
    )),
    
    -- Fluency Measures
    words_per_minute INTEGER,
    stuttering_frequency INTEGER,
    stuttering_severity VARCHAR(10) CHECK (stuttering_severity IN (
        'mild', 'moderate', 'severe'
    )),
    
    -- Voice Quality
    vocal_quality VARCHAR(20) CHECK (vocal_quality IN (
        'normal', 'hoarse', 'breathy', 'strained'
    )),
    vocal_pitch VARCHAR(20) CHECK (vocal_pitch IN (
        'appropriate', 'too_high', 'too_low'
    )),
    vocal_volume VARCHAR(20) CHECK (vocal_volume IN (
        'appropriate', 'too_loud', 'too_quiet'
    )),
    
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
    assessment_type TEXT,
    assessment_score DECIMAL(8,2),
    assessment_percentile DECIMAL(5,2),
    
    session_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- Occupational Therapy Data
CREATE TABLE IF NOT EXISTS occupational_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Fine Motor Skills
    fine_motor_tasks JSONB DEFAULT '{}',
    grip_strength_kg DECIMAL(5,2),
    pincer_grasp_quality INTEGER CHECK (pincer_grasp_quality BETWEEN 1 AND 5),
    handwriting_quality INTEGER CHECK (handwriting_quality BETWEEN 1 AND 5),
    
    -- Gross Motor Skills
    gross_motor_tasks JSONB DEFAULT '{}',
    balance_score INTEGER CHECK (balance_score BETWEEN 1 AND 5),
    coordination_score INTEGER CHECK (coordination_score BETWEEN 1 AND 5),
    
    -- Sensory Processing
    sensory_profile JSONB DEFAULT '{}',
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
    
    session_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- Intervention Protocols
CREATE TABLE IF NOT EXISTS intervention_protocols (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    protocol_name_ar TEXT NOT NULL,
    protocol_name_en TEXT NOT NULL,
    protocol_code VARCHAR(20) UNIQUE,
    
    description_ar TEXT,
    description_en TEXT,
    target_skills TEXT[],
    prerequisites TEXT[],
    
    step_by_step_instructions JSONB DEFAULT '[]',
    materials_required TEXT[],
    environmental_setup_ar TEXT,
    environmental_setup_en TEXT,
    
    data_collection_method TEXT,
    frequency_of_measurement TEXT,
    success_criteria JSONB DEFAULT '{}',
    mastery_criteria_ar TEXT,
    mastery_criteria_en TEXT,
    
    progression_steps JSONB DEFAULT '[]',
    modification_guidelines TEXT[],
    troubleshooting_tips JSONB DEFAULT '{}',
    
    research_evidence TEXT[],
    evidence_quality VARCHAR(10) CHECK (evidence_quality IN ('high', 'moderate', 'low')),
    recommended_age_range TEXT,
    
    safety_considerations TEXT[],
    contraindications TEXT[],
    precautions TEXT[],
    
    staff_training_required BOOLEAN DEFAULT false,
    training_duration_hours INTEGER,
    competency_requirements TEXT[],
    
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'under_review', 'rejected'
    )),
    approved_by UUID REFERENCES auth.users(id),
    approval_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Program Enrollments
CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID NOT NULL REFERENCES therapy_programs(id),
    
    enrollment_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    expected_end_date DATE,
    actual_end_date DATE,
    
    sessions_per_week INTEGER DEFAULT 2,
    session_duration_minutes INTEGER DEFAULT 45,
    total_sessions_planned INTEGER,
    
    individual_goals JSONB DEFAULT '[]',
    modified_protocols JSONB DEFAULT '[]',
    accommodation_needs TEXT[],
    
    sessions_completed INTEGER DEFAULT 0,
    sessions_missed INTEGER DEFAULT 0,
    current_mastery_level DECIMAL(5,2) DEFAULT 0,
    
    enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN (
        'active', 'paused', 'completed', 'withdrawn', 'transferred'
    )),
    completion_reason TEXT,
    outcome_summary_ar TEXT,
    outcome_summary_en TEXT,
    
    primary_therapist_id UUID REFERENCES therapists(id),
    secondary_therapist_id UUID REFERENCES therapists(id),
    supervising_consultant_id UUID REFERENCES medical_consultants(id),
    
    total_cost DECIMAL(10,2),
    payment_plan TEXT,
    insurance_coverage_percentage DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Progress Tracking
CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id),
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    tracking_period_start DATE NOT NULL,
    tracking_period_end DATE NOT NULL,
    measurement_frequency VARCHAR(20) CHECK (measurement_frequency IN (
        'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly'
    )),
    
    goals_progress JSONB DEFAULT '{}',
    goals_achieved INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goal_achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN goals_total > 0 THEN (goals_achieved::decimal / goals_total) * 100
            ELSE 0 
        END
    ) STORED,
    
    skills_targeted INTEGER DEFAULT 0,
    skills_emerging INTEGER DEFAULT 0,
    skills_acquired INTEGER DEFAULT 0,
    skills_mastered INTEGER DEFAULT 0,
    skills_generalized INTEGER DEFAULT 0,
    
    acquisition_rate_weekly DECIMAL(5,2),
    mastery_rate_weekly DECIMAL(5,2),
    generalization_rate DECIMAL(5,2),
    
    target_behaviors JSONB DEFAULT '{}',
    behavior_frequency_data JSONB DEFAULT '{}',
    behavior_duration_data JSONB DEFAULT '{}',
    behavior_intensity_data JSONB DEFAULT '{}',
    
    independence_scores JSONB DEFAULT '{}',
    functional_skills_progress JSONB DEFAULT '{}',
    adaptive_behavior_scores JSONB DEFAULT '{}',
    
    developmental_milestones JSONB DEFAULT '{}',
    academic_progress JSONB DEFAULT '{}',
    cognitive_development JSONB DEFAULT '{}',
    
    social_skills_progress JSONB DEFAULT '{}',
    emotional_regulation JSONB DEFAULT '{}',
    communication_progress JSONB DEFAULT '{}',
    
    regression_indicators JSONB DEFAULT '{}',
    regression_alerts BOOLEAN DEFAULT false,
    regression_severity VARCHAR(10) CHECK (regression_severity IN ('mild', 'moderate', 'severe')),
    regression_response_plan TEXT,
    
    generalization_settings TEXT[],
    generalization_people TEXT[],
    generalization_materials TEXT[],
    generalization_success_rate DECIMAL(5,2),
    
    data_collection_reliability DECIMAL(5,2),
    sessions_with_data INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    data_completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_sessions > 0 THEN (sessions_with_data::decimal / total_sessions) * 100
            ELSE 0 
        END
    ) STORED,
    
    trend_direction VARCHAR(15) CHECK (trend_direction IN (
        'improving', 'stable', 'declining', 'variable'
    )),
    trend_strength DECIMAL(4,3),
    predicted_outcome JSONB DEFAULT '{}',
    
    clinically_significant_change BOOLEAN DEFAULT false,
    effect_size DECIMAL(6,3),
    meaningful_change_indicators JSONB DEFAULT '{}',
    
    environmental_factors JSONB DEFAULT '{}',
    family_factors JSONB DEFAULT '{}',
    medical_factors JSONB DEFAULT '{}',
    
    overall_progress_rating INTEGER CHECK (overall_progress_rating BETWEEN 1 AND 5),
    progress_summary_ar TEXT,
    progress_summary_en TEXT,
    challenges_identified TEXT[],
    
    intervention_modifications TEXT[],
    intensity_recommendations TEXT,
    goal_adjustments TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Student Milestone Progress
CREATE TABLE IF NOT EXISTS student_milestone_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES developmental_milestones(id),
    
    status VARCHAR(15) DEFAULT 'not_emerged' CHECK (status IN (
        'not_emerged', 'emerging', 'achieved', 'mastered', 'regressed'
    )),
    achievement_date DATE,
    age_at_achievement_months INTEGER,
    
    evidence_source VARCHAR(20) CHECK (evidence_source IN (
        'observation', 'assessment', 'parent_report'
    )),
    evidence_description TEXT,
    documented_by UUID REFERENCES auth.users(id),
    
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    support_needed VARCHAR(15) CHECK (support_needed IN (
        'independent', 'minimal', 'moderate', 'maximum'
    )),
    
    context_achieved VARCHAR(15) CHECK (context_achieved IN (
        'home', 'clinic', 'school', 'community'
    )),
    generalization_contexts TEXT[],
    
    verified_by UUID REFERENCES auth.users(id),
    verification_date DATE,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Regression Monitoring
CREATE TABLE IF NOT EXISTS regression_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    detection_date DATE NOT NULL,
    detected_by UUID REFERENCES auth.users(id),
    
    skills_affected TEXT[],
    severity_level VARCHAR(10) CHECK (severity_level IN (
        'mild', 'moderate', 'severe', 'profound'
    )),
    domains_affected TEXT[],
    
    onset_type VARCHAR(15) CHECK (onset_type IN ('gradual', 'sudden', 'fluctuating')),
    duration_observed TEXT,
    pattern_description TEXT,
    
    previous_performance_level JSONB DEFAULT '{}',
    current_performance_level JSONB DEFAULT '{}',
    percentage_decline DECIMAL(5,2),
    
    potential_causes TEXT[],
    recent_changes JSONB DEFAULT '{}',
    medical_factors TEXT[],
    environmental_factors TEXT[],
    
    formal_assessments_completed TEXT[],
    medical_consultation_required BOOLEAN DEFAULT false,
    medical_consultation_completed BOOLEAN DEFAULT false,
    consultation_findings TEXT,
    
    intervention_modifications TEXT[],
    response_plan_implemented TEXT,
    response_effectiveness TEXT,
    
    recovery_initiated_date DATE,
    recovery_milestones JSONB DEFAULT '{}',
    full_recovery_date DATE,
    residual_effects TEXT[],
    
    prevention_strategies TEXT[],
    monitoring_modifications TEXT[],
    early_warning_indicators TEXT[],
    
    team_members_notified TEXT[],
    family_notification_date DATE,
    medical_team_notification_date DATE,
    
    follow_up_assessments JSONB DEFAULT '[]',
    long_term_monitoring_plan TEXT,
    
    status VARCHAR(15) DEFAULT 'active' CHECK (status IN (
        'active', 'resolved', 'monitoring', 'chronic'
    )),
    resolution_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_aba_data_student_date ON aba_data_collection(student_id, observation_date);
CREATE INDEX IF NOT EXISTS idx_speech_data_student_date ON speech_therapy_data(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_ot_data_student_date ON occupational_therapy_data(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_student ON progress_tracking(student_id, tracking_period_start);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_student ON student_milestone_progress(student_id, status);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_student ON regression_monitoring(student_id, detection_date);

-- Success message
SELECT 'Supplementary tables created successfully!' as status,
       'Missing tables have been added to complete the schema' as message;