-- =====================================================================
-- Migration 16: Assessment & Clinical Documentation Enhancement
-- Phase 3: SOAP notes, standardized assessments, and progress tracking
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- ENHANCED SOAP NOTES STRUCTURE
-- Structured SOAP documentation with therapy-specific templates
-- =============================================================================

-- Extend clinical_documentation with enhanced SOAP structure
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS soap_template_id UUID;
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS structured_soap JSONB DEFAULT '{}';
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS therapy_specific_data JSONB DEFAULT '{}';

-- SOAP Templates for different therapy types
CREATE TABLE IF NOT EXISTS soap_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Template Identification
    template_name_ar TEXT NOT NULL,
    template_name_en TEXT NOT NULL,
    template_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- SOAP Structure Definition
    subjective_fields JSONB DEFAULT '[]', -- Field definitions for subjective section
    objective_fields JSONB DEFAULT '[]', -- Field definitions for objective section
    assessment_fields JSONB DEFAULT '[]', -- Field definitions for assessment section
    plan_fields JSONB DEFAULT '[]', -- Field definitions for plan section
    
    -- Additional Sections
    additional_sections JSONB DEFAULT '{}', -- Therapy-specific additional sections
    required_fields TEXT[], -- Fields that must be completed
    conditional_fields JSONB DEFAULT '{}', -- Fields shown based on conditions
    
    -- Data Validation
    validation_rules JSONB DEFAULT '{}', -- Field validation rules
    score_calculations JSONB DEFAULT '{}', -- Automatic score calculations
    
    -- Template Configuration
    is_active BOOLEAN DEFAULT true,
    is_default_for_program BOOLEAN DEFAULT false,
    version VARCHAR(10) DEFAULT '1.0',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- STANDARDIZED ASSESSMENT RESULTS
-- Comprehensive assessment scoring and interpretation
-- =============================================================================
CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_tool_id UUID NOT NULL REFERENCES assessment_tools(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Assessment Session Details
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL REFERENCES auth.users(id),
    assessment_location VARCHAR(100),
    session_duration_minutes INTEGER,
    
    -- Assessment Context
    assessment_purpose VARCHAR(50) CHECK (assessment_purpose IN (
        'baseline', 'progress_monitoring', 'annual_review', 'discharge', 
        'diagnostic', 'program_planning', 'research'
    )),
    assessment_conditions TEXT, -- Testing conditions and environment
    accommodations_provided TEXT[], -- Any accommodations used
    
    -- Raw Scores and Responses
    raw_scores JSONB DEFAULT '{}', -- All raw scores by domain/subtest
    item_responses JSONB DEFAULT '{}', -- Individual item responses
    behavioral_observations JSONB DEFAULT '{}', -- Observations during testing
    
    -- Standard Scores and Interpretations
    standard_scores JSONB DEFAULT '{}', -- Converted standard scores
    percentile_ranks JSONB DEFAULT '{}', -- Percentile rankings
    age_equivalents JSONB DEFAULT '{}', -- Age equivalent scores
    grade_equivalents JSONB DEFAULT '{}', -- Grade equivalent scores
    
    -- Overall Results
    overall_score DECIMAL(8,2),
    composite_scores JSONB DEFAULT '{}', -- Composite domain scores
    confidence_intervals JSONB DEFAULT '{}', -- 95% confidence intervals
    
    -- Clinical Interpretation
    interpretation_summary_ar TEXT,
    interpretation_summary_en TEXT,
    strengths_identified TEXT[],
    areas_of_concern TEXT[],
    
    -- Recommendations
    immediate_recommendations TEXT[],
    long_term_recommendations TEXT[],
    referrals_suggested TEXT[],
    reassessment_timeline VARCHAR(50),
    
    -- Validity and Reliability
    test_validity VARCHAR(20) CHECK (test_validity IN (
        'valid', 'questionable', 'invalid'
    )),
    validity_concerns TEXT,
    cooperation_level INTEGER CHECK (cooperation_level BETWEEN 1 AND 5),
    effort_level INTEGER CHECK (effort_level BETWEEN 1 AND 5),
    
    -- Comparison Data
    previous_assessment_id UUID REFERENCES assessment_results(id),
    change_from_previous JSONB DEFAULT '{}', -- Changes since last assessment
    progress_indicators JSONB DEFAULT '{}', -- Specific progress measures
    
    -- Report Generation
    report_generated BOOLEAN DEFAULT false,
    report_path TEXT, -- Path to generated report
    report_shared_with_parents BOOLEAN DEFAULT false,
    report_shared_date DATE,
    
    -- Status and Approval
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    reviewed_by UUID REFERENCES medical_consultants(id),
    review_date DATE,
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MULTI-DIMENSIONAL PROGRESS TRACKING
-- Comprehensive progress measurement across domains
-- =============================================================================
CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id),
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Progress Period
    tracking_period_start DATE NOT NULL,
    tracking_period_end DATE NOT NULL,
    measurement_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (measurement_frequency IN (
        'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly'
    )),
    
    -- Goal-Based Progress
    goals_progress JSONB DEFAULT '{}', -- Progress on each individual goal
    goals_achieved INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goal_achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN goals_total > 0 THEN (goals_achieved::DECIMAL / goals_total) * 100 ELSE 0 END
    ) STORED,
    
    -- Skill Acquisition Data
    skills_targeted INTEGER DEFAULT 0,
    skills_emerging INTEGER DEFAULT 0,
    skills_acquired INTEGER DEFAULT 0,
    skills_mastered INTEGER DEFAULT 0,
    skills_generalized INTEGER DEFAULT 0,
    
    -- Skill Acquisition Rates
    acquisition_rate_weekly DECIMAL(5,2), -- Skills acquired per week
    mastery_rate_weekly DECIMAL(5,2), -- Skills mastered per week
    generalization_rate DECIMAL(5,2), -- Percentage of mastered skills generalized
    
    -- Behavioral Measurements
    target_behaviors JSONB DEFAULT '{}', -- Tracked target behaviors
    behavior_frequency_data JSONB DEFAULT '{}', -- Frequency measurements
    behavior_duration_data JSONB DEFAULT '{}', -- Duration measurements
    behavior_intensity_data JSONB DEFAULT '{}', -- Intensity measurements
    
    -- Functional Independence
    independence_scores JSONB DEFAULT '{}', -- Independence in various domains
    functional_skills_progress JSONB DEFAULT '{}', -- Progress in functional skills
    adaptive_behavior_scores JSONB DEFAULT '{}', -- Adaptive behavior measurements
    
    -- Academic/Developmental Milestones
    developmental_milestones JSONB DEFAULT '{}', -- Age-appropriate milestones
    academic_progress JSONB DEFAULT '{}', -- Academic skill progress
    cognitive_development JSONB DEFAULT '{}', -- Cognitive skill development
    
    -- Social-Emotional Progress
    social_skills_progress JSONB DEFAULT '{}', -- Social interaction skills
    emotional_regulation JSONB DEFAULT '{}', -- Emotional regulation abilities
    communication_progress JSONB DEFAULT '{}', -- Communication skill development
    
    -- Regression Monitoring
    regression_indicators JSONB DEFAULT '{}', -- Signs of skill regression
    regression_alerts BOOLEAN DEFAULT false,
    regression_severity VARCHAR(20), -- mild, moderate, severe
    regression_response_plan TEXT,
    
    -- Generalization Tracking
    generalization_settings TEXT[], -- Settings where skills are generalized
    generalization_people TEXT[], -- People with whom skills are generalized
    generalization_materials TEXT[], -- Materials across which skills generalize
    generalization_success_rate DECIMAL(5,2),
    
    -- Data Quality Metrics
    data_collection_reliability DECIMAL(3,2), -- Inter-observer agreement
    sessions_with_data INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    data_completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_sessions > 0 THEN (sessions_with_data::DECIMAL / total_sessions) * 100 ELSE 0 END
    ) STORED,
    
    -- Trend Analysis
    trend_direction VARCHAR(20) CHECK (trend_direction IN (
        'improving', 'stable', 'declining', 'variable'
    )),
    trend_strength DECIMAL(3,2), -- Correlation coefficient for trend
    predicted_outcome JSONB DEFAULT '{}', -- Predictive analytics
    
    -- Clinical Significance
    clinically_significant_change BOOLEAN DEFAULT false,
    effect_size DECIMAL(4,2), -- Statistical effect size
    meaningful_change_indicators JSONB DEFAULT '{}',
    
    -- Contextual Factors
    environmental_factors JSONB DEFAULT '{}', -- Environmental influences
    family_factors JSONB DEFAULT '{}', -- Family-related factors
    medical_factors JSONB DEFAULT '{}', -- Medical factors affecting progress
    
    -- Progress Summary
    overall_progress_rating INTEGER CHECK (overall_progress_rating BETWEEN 1 AND 5),
    progress_summary_ar TEXT,
    progress_summary_en TEXT,
    challenges_identified TEXT[],
    
    -- Recommendations
    intervention_modifications TEXT[],
    intensity_recommendations TEXT,
    goal_adjustments TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- GOAL MANAGEMENT SYSTEM
-- Structured goal setting, tracking, and achievement
-- =============================================================================
CREATE TABLE IF NOT EXISTS therapeutic_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id),
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Goal Identification
    goal_number INTEGER NOT NULL,
    goal_category VARCHAR(50) NOT NULL, -- communication, motor, social, academic, etc.
    goal_domain VARCHAR(50) NOT NULL, -- specific domain within category
    
    -- SMART Goal Structure
    goal_statement_ar TEXT NOT NULL,
    goal_statement_en TEXT,
    specific_criteria JSONB DEFAULT '{}', -- Specific measurable criteria
    measurable_outcomes JSONB DEFAULT '{}', -- How progress will be measured
    achievable_steps TEXT[], -- Steps to achieve the goal
    relevant_justification TEXT, -- Why this goal is relevant
    time_bound_deadline DATE,
    
    -- Goal Hierarchy
    parent_goal_id UUID REFERENCES therapeutic_goals(id), -- For sub-goals
    goal_level INTEGER DEFAULT 1, -- 1=main goal, 2=sub-goal, etc.
    prerequisite_goals UUID[], -- Goals that must be achieved first
    
    -- Baseline and Target
    baseline_data JSONB DEFAULT '{}', -- Initial performance level
    target_criteria JSONB DEFAULT '{}', -- Target performance level
    mastery_criteria_ar TEXT,
    mastery_criteria_en TEXT,
    generalization_criteria TEXT[],
    
    -- Progress Tracking Configuration
    measurement_method VARCHAR(50), -- How progress is measured
    data_collection_frequency VARCHAR(20),
    progress_indicators JSONB DEFAULT '{}', -- What indicates progress
    
    -- Current Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'achieved', 'discontinued', 'modified', 'on_hold'
    )),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_performance_level JSONB DEFAULT '{}',
    
    -- Achievement Data
    date_initiated DATE DEFAULT CURRENT_DATE,
    date_achieved DATE,
    sessions_to_achieve INTEGER,
    trials_to_mastery INTEGER,
    
    -- Intervention Information
    intervention_strategies TEXT[],
    materials_needed TEXT[],
    environmental_arrangements TEXT,
    prompting_procedures JSONB DEFAULT '{}',
    reinforcement_schedule JSONB DEFAULT '{}',
    
    -- Team Assignment
    primary_therapist_id UUID REFERENCES therapists(id),
    secondary_therapist_id UUID REFERENCES therapists(id),
    family_involvement_level VARCHAR(20),
    
    -- Review and Modification
    last_review_date DATE,
    next_review_date DATE,
    review_frequency VARCHAR(20) DEFAULT 'monthly',
    modification_history JSONB DEFAULT '[]',
    
    -- Data Quality
    reliability_checks JSONB DEFAULT '{}',
    inter_observer_agreement DECIMAL(3,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- MILESTONE TRACKING SYSTEM
-- Developmental milestone achievement tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS developmental_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Milestone Definition
    milestone_code VARCHAR(20) UNIQUE NOT NULL,
    milestone_name_ar TEXT NOT NULL,
    milestone_name_en TEXT,
    
    -- Age and Development
    typical_age_months_min INTEGER,
    typical_age_months_max INTEGER,
    developmental_domain VARCHAR(30), -- gross_motor, fine_motor, language, social, cognitive
    
    -- Description
    description_ar TEXT,
    description_en TEXT,
    observable_behaviors TEXT[],
    assessment_criteria JSONB DEFAULT '{}',
    
    -- Prerequisites and Progressions
    prerequisite_milestones UUID[],
    next_milestones UUID[],
    
    -- Documentation
    evidence_source TEXT, -- Research or clinical source
    cultural_considerations TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student milestone achievement tracking
CREATE TABLE IF NOT EXISTS student_milestone_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES developmental_milestones(id),
    
    -- Achievement Status
    status VARCHAR(20) DEFAULT 'not_emerged' CHECK (status IN (
        'not_emerged', 'emerging', 'achieved', 'mastered', 'regressed'
    )),
    achievement_date DATE,
    age_at_achievement_months INTEGER,
    
    -- Evidence and Documentation
    evidence_source VARCHAR(30), -- observation, assessment, parent_report
    evidence_description TEXT,
    documented_by UUID REFERENCES auth.users(id),
    
    -- Progress Notes
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    support_needed VARCHAR(50), -- independent, minimal, moderate, maximum
    
    -- Context
    context_achieved VARCHAR(50), -- home, clinic, school, community
    generalization_contexts TEXT[],
    
    -- Quality Assurance
    verified_by UUID REFERENCES auth.users(id),
    verification_date DATE,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(student_id, milestone_id)
);

-- =============================================================================
-- REGRESSION DETECTION AND MONITORING
-- Early detection and response to skill regression
-- =============================================================================
CREATE TABLE IF NOT EXISTS regression_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Regression Incident
    detection_date DATE NOT NULL,
    detected_by UUID REFERENCES auth.users(id),
    
    -- Regression Details
    skills_affected TEXT[],
    severity_level VARCHAR(20) CHECK (severity_level IN (
        'mild', 'moderate', 'severe', 'profound'
    )),
    domains_affected VARCHAR(30)[], -- communication, motor, social, behavioral
    
    -- Regression Pattern
    onset_type VARCHAR(20) CHECK (onset_type IN (
        'gradual', 'sudden', 'fluctuating'
    )),
    duration_observed VARCHAR(20), -- days, weeks, months
    pattern_description TEXT,
    
    -- Baseline Comparison
    previous_performance_level JSONB DEFAULT '{}',
    current_performance_level JSONB DEFAULT '{}',
    percentage_decline DECIMAL(5,2),
    
    -- Contributing Factors
    potential_causes TEXT[], -- medical, environmental, behavioral, unknown
    recent_changes JSONB DEFAULT '{}', -- medication, environment, routine
    medical_factors TEXT[],
    environmental_factors TEXT[],
    
    -- Assessment and Investigation
    formal_assessments_completed TEXT[],
    medical_consultation_required BOOLEAN DEFAULT false,
    medical_consultation_completed BOOLEAN DEFAULT false,
    consultation_findings TEXT,
    
    -- Intervention Response
    intervention_modifications TEXT[],
    response_plan_implemented TEXT,
    response_effectiveness VARCHAR(20),
    
    -- Recovery Tracking
    recovery_initiated_date DATE,
    recovery_milestones JSONB DEFAULT '{}',
    full_recovery_date DATE,
    residual_effects TEXT[],
    
    -- Prevention Measures
    prevention_strategies TEXT[],
    monitoring_modifications TEXT[],
    early_warning_indicators TEXT[],
    
    -- Team Response
    team_members_notified TEXT[],
    family_notification_date DATE,
    medical_team_notification_date DATE,
    
    -- Follow-up
    follow_up_assessments JSONB DEFAULT '[]',
    long_term_monitoring_plan TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'resolved', 'monitoring', 'chronic'
    )),
    resolution_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- SOAP Templates
CREATE INDEX IF NOT EXISTS idx_soap_templates_program ON soap_templates(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_soap_templates_code ON soap_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_soap_templates_active ON soap_templates(is_active);

-- Assessment Results
CREATE INDEX IF NOT EXISTS idx_assessment_results_student ON assessment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_tool ON assessment_results(assessment_tool_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_date ON assessment_results(assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessor ON assessment_results(assessor_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_purpose ON assessment_results(assessment_purpose);
CREATE INDEX IF NOT EXISTS idx_assessment_results_status ON assessment_results(status);

-- Progress Tracking
CREATE INDEX IF NOT EXISTS idx_progress_tracking_student ON progress_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_program ON progress_tracking(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_period ON progress_tracking(tracking_period_start, tracking_period_end);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_achievement ON progress_tracking(goal_achievement_percentage);

-- Therapeutic Goals
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_student ON therapeutic_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_program ON therapeutic_goals(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_category ON therapeutic_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_status ON therapeutic_goals(status);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_deadline ON therapeutic_goals(time_bound_deadline);

-- Milestone Progress
CREATE INDEX IF NOT EXISTS idx_student_milestone_student ON student_milestone_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_milestone_milestone ON student_milestone_progress(milestone_id);
CREATE INDEX IF NOT EXISTS idx_student_milestone_status ON student_milestone_progress(status);
CREATE INDEX IF NOT EXISTS idx_student_milestone_achievement ON student_milestone_progress(achievement_date);

-- Regression Monitoring
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_student ON regression_monitoring(student_id);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_date ON regression_monitoring(detection_date);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_severity ON regression_monitoring(severity_level);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_status ON regression_monitoring(status);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_soap_templates_updated_at 
    BEFORE UPDATE ON soap_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_results_updated_at 
    BEFORE UPDATE ON assessment_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_tracking_updated_at 
    BEFORE UPDATE ON progress_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapeutic_goals_updated_at 
    BEFORE UPDATE ON therapeutic_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_milestone_progress_updated_at 
    BEFORE UPDATE ON student_milestone_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regression_monitoring_updated_at 
    BEFORE UPDATE ON regression_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to detect potential regression
CREATE OR REPLACE FUNCTION detect_potential_regression()
RETURNS TRIGGER AS $$
DECLARE
    decline_threshold DECIMAL := 20.0; -- 20% decline threshold
    prev_performance DECIMAL;
    current_performance DECIMAL;
    decline_percentage DECIMAL;
BEGIN
    -- Check if this is a progress update with concerning decline
    IF TG_OP = 'UPDATE' AND NEW.goal_achievement_percentage < OLD.goal_achievement_percentage THEN
        decline_percentage := OLD.goal_achievement_percentage - NEW.goal_achievement_percentage;
        
        -- If decline is significant, create regression monitoring record
        IF decline_percentage >= decline_threshold THEN
            INSERT INTO regression_monitoring (
                student_id,
                detection_date,
                detected_by,
                skills_affected,
                severity_level,
                onset_type,
                previous_performance_level,
                current_performance_level,
                percentage_decline,
                potential_causes
            ) VALUES (
                NEW.student_id,
                CURRENT_DATE,
                auth.uid(),
                ARRAY['goal_achievement'],
                CASE 
                    WHEN decline_percentage >= 50 THEN 'severe'
                    WHEN decline_percentage >= 30 THEN 'moderate'
                    ELSE 'mild'
                END,
                'gradual',
                jsonb_build_object('goal_achievement', OLD.goal_achievement_percentage),
                jsonb_build_object('goal_achievement', NEW.goal_achievement_percentage),
                decline_percentage,
                ARRAY['unknown']
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply regression detection trigger
CREATE TRIGGER detect_regression_trigger
    AFTER UPDATE ON progress_tracking
    FOR EACH ROW
    EXECUTE FUNCTION detect_potential_regression();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE soap_templates IS 'Structured SOAP note templates for different therapy programs';
COMMENT ON TABLE assessment_results IS 'Comprehensive standardized assessment results and interpretations';
COMMENT ON TABLE progress_tracking IS 'Multi-dimensional progress tracking across all domains';
COMMENT ON TABLE therapeutic_goals IS 'SMART goal management system with achievement tracking';
COMMENT ON TABLE developmental_milestones IS 'Developmental milestone definitions and criteria';
COMMENT ON TABLE student_milestone_progress IS 'Individual student milestone achievement tracking';
COMMENT ON TABLE regression_monitoring IS 'Early detection and monitoring of skill regression';

COMMENT ON FUNCTION detect_potential_regression() IS 'Automatically detects significant performance declines and creates regression monitoring records';

-- Success verification
SELECT 'Assessment & Clinical Documentation Enhancement created successfully!' as status;