-- IEP Management System Schema
-- IDEA 2024 Compliant - Individualized Education Program Management
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- IEP DOCUMENTS TABLE
-- Core table for IEP documents with IDEA 2024 compliance
-- =============================================================================
CREATE TABLE IF NOT EXISTS ieps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- IEP Classification and Dates (IDEA Required)
    academic_year VARCHAR(9) NOT NULL, -- e.g., "2024-2025"
    iep_type VARCHAR(20) NOT NULL CHECK (iep_type IN ('initial', 'annual', 'triennial', 'amendment')),
    effective_date DATE NOT NULL,
    review_date DATE, -- Next quarterly/progress review
    annual_review_date DATE NOT NULL, -- Must be within 365 days of effective_date
    triennial_evaluation_due DATE, -- Required every 3 years
    
    -- Present Levels of Academic and Functional Performance (IDEA Required - Bilingual)
    present_levels_academic_ar TEXT NOT NULL,
    present_levels_academic_en TEXT,
    present_levels_functional_ar TEXT NOT NULL,
    present_levels_functional_en TEXT,
    
    -- Measurable Annual Goals (stored separately in iep_goals table)
    -- This field indicates the total count for validation
    annual_goals_count INTEGER DEFAULT 0,
    
    -- Special Education Services (IDEA Required - Bilingual)
    special_education_services JSONB NOT NULL DEFAULT '[]',
    related_services JSONB DEFAULT '[]',
    supplementary_services JSONB DEFAULT '[]',
    
    -- Program Modifications/Accommodations (IDEA Required - Bilingual)
    accommodations_ar TEXT[] DEFAULT '{}',
    accommodations_en TEXT[] DEFAULT '{}',
    modifications_ar TEXT[] DEFAULT '{}',
    modifications_en TEXT[] DEFAULT '{}',
    
    -- Assessment Accommodations (IDEA Required - Bilingual)
    state_assessment_accommodations_ar TEXT[] DEFAULT '{}',
    state_assessment_accommodations_en TEXT[] DEFAULT '{}',
    alternate_assessment_justification_ar TEXT,
    alternate_assessment_justification_en TEXT,
    
    -- Least Restrictive Environment (LRE) Information (IDEA Required - Bilingual)
    lre_justification_ar TEXT NOT NULL,
    lre_justification_en TEXT,
    mainstreaming_percentage INTEGER DEFAULT 0, -- Percentage of time in general education
    special_education_setting VARCHAR(50) NOT NULL,
    
    -- Transition Planning (Required at age 16+ - Bilingual)
    transition_services_needed BOOLEAN DEFAULT false,
    post_secondary_goals_ar TEXT,
    post_secondary_goals_en TEXT,
    transition_services JSONB DEFAULT '{}',
    
    -- Behavior Intervention Plan (if needed - Bilingual)
    behavior_plan_needed BOOLEAN DEFAULT false,
    behavior_goals_ar TEXT,
    behavior_goals_en TEXT,
    behavior_interventions JSONB DEFAULT '{}',
    
    -- Extended School Year (ESY) Services
    esy_services_needed BOOLEAN DEFAULT false,
    esy_justification_ar TEXT,
    esy_justification_en TEXT,
    esy_services JSONB DEFAULT '{}',
    
    -- Workflow and Status Management
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'active', 'expired', 'archived')),
    workflow_stage VARCHAR(30) DEFAULT 'drafting' CHECK (workflow_stage IN (
        'drafting', 'team_review', 'parent_review', 'signatures_pending', 
        'approved', 'active', 'monitoring', 'expired'
    )),
    
    -- Compliance and Quality Assurance
    compliance_check_passed BOOLEAN DEFAULT false,
    compliance_issues JSONB DEFAULT '[]',
    quality_review_passed BOOLEAN DEFAULT false,
    quality_review_notes_ar TEXT,
    quality_review_notes_en TEXT,
    
    -- Meeting Information
    last_iep_meeting_date DATE,
    next_iep_meeting_date DATE,
    meeting_frequency VARCHAR(20) DEFAULT 'quarterly' CHECK (meeting_frequency IN ('monthly', 'quarterly', 'annually')),
    
    -- Document Management
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    parent_iep_id UUID REFERENCES ieps(id), -- For version tracking
    
    -- File Attachments
    pdf_file_path TEXT, -- Generated PDF storage path
    attachments JSONB DEFAULT '[]', -- Array of attached documents
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints for IDEA Compliance
    CONSTRAINT iep_annual_review_within_365_days 
        CHECK (annual_review_date <= effective_date + INTERVAL '365 days'),
    CONSTRAINT iep_mainstreaming_percentage_valid 
        CHECK (mainstreaming_percentage >= 0 AND mainstreaming_percentage <= 100)
);

-- Indexes for IEP table
CREATE INDEX IF NOT EXISTS idx_ieps_student_id ON ieps(student_id);
CREATE INDEX IF NOT EXISTS idx_ieps_status ON ieps(status);
CREATE INDEX IF NOT EXISTS idx_ieps_academic_year ON ieps(academic_year);
CREATE INDEX IF NOT EXISTS idx_ieps_effective_date ON ieps(effective_date);
CREATE INDEX IF NOT EXISTS idx_ieps_annual_review_date ON ieps(annual_review_date);
CREATE INDEX IF NOT EXISTS idx_ieps_current_version ON ieps(is_current_version) WHERE is_current_version = true;

-- =============================================================================
-- IEP GOALS TABLE
-- Measurable Annual Goals (IDEA Required)
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Goal Classification
    goal_number INTEGER NOT NULL, -- Sequential numbering within IEP
    domain VARCHAR(30) NOT NULL CHECK (domain IN (
        'academic_reading', 'academic_writing', 'academic_math', 'academic_science',
        'communication_expressive', 'communication_receptive', 'communication_social',
        'behavioral_social', 'behavioral_attention', 'behavioral_self_regulation',
        'functional_daily_living', 'functional_mobility', 'functional_self_care',
        'motor_fine', 'motor_gross', 'vocational', 'transition'
    )),
    
    -- Present Level of Performance (Baseline - Bilingual)
    baseline_performance_ar TEXT NOT NULL,
    baseline_performance_en TEXT,
    baseline_date DATE DEFAULT CURRENT_DATE,
    
    -- Measurable Annual Goal Statement (IDEA Required - Bilingual)
    goal_statement_ar TEXT NOT NULL,
    goal_statement_en TEXT,
    
    -- Measurement Criteria (IDEA Required)
    measurement_method VARCHAR(50) NOT NULL CHECK (measurement_method IN (
        'frequency', 'percentage', 'duration', 'trials', 'observation', 
        'checklist', 'rating_scale', 'portfolio', 'other'
    )),
    measurement_criteria TEXT NOT NULL, -- Specific criteria for success
    evaluation_frequency VARCHAR(20) NOT NULL CHECK (evaluation_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    evaluation_method_ar TEXT NOT NULL,
    evaluation_method_en TEXT,
    
    -- Target Criteria for Success
    target_percentage INTEGER, -- If percentage-based goal
    target_frequency INTEGER, -- If frequency-based goal
    target_duration_minutes INTEGER, -- If duration-based goal
    target_accuracy_percentage INTEGER, -- General accuracy target
    mastery_criteria_ar TEXT NOT NULL, -- When goal is considered met
    mastery_criteria_en TEXT,
    
    -- Goal Timeline
    target_completion_date DATE NOT NULL,
    is_continuing_goal BOOLEAN DEFAULT false, -- Continues from previous IEP
    
    -- Progress Tracking
    current_progress_percentage INTEGER DEFAULT 0 CHECK (current_progress_percentage >= 0 AND current_progress_percentage <= 100),
    progress_status VARCHAR(20) DEFAULT 'not_started' CHECK (progress_status IN (
        'not_started', 'introduced', 'progressing', 'mastered', 'maintained', 'discontinued'
    )),
    last_progress_update DATE,
    
    -- Service Delivery Information
    responsible_provider VARCHAR(100), -- Who will work on this goal
    service_frequency VARCHAR(50), -- How often services are provided
    service_location VARCHAR(50), -- Where services are provided
    
    -- Goal Status
    is_active BOOLEAN DEFAULT true,
    goal_status VARCHAR(20) DEFAULT 'active' CHECK (goal_status IN ('active', 'achieved', 'modified', 'discontinued')),
    
    -- Goal Hierarchy (for breaking down complex goals)
    parent_goal_id UUID REFERENCES iep_goals(id),
    goal_order INTEGER DEFAULT 1, -- Order within the IEP
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Unique constraint for goal numbering within IEP
    UNIQUE(iep_id, goal_number)
);

-- Indexes for IEP Goals
CREATE INDEX IF NOT EXISTS idx_iep_goals_iep_id ON iep_goals(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_goals_domain ON iep_goals(domain);
CREATE INDEX IF NOT EXISTS idx_iep_goals_status ON iep_goals(goal_status);
CREATE INDEX IF NOT EXISTS idx_iep_goals_progress ON iep_goals(progress_status);
CREATE INDEX IF NOT EXISTS idx_iep_goals_target_date ON iep_goals(target_completion_date);

-- =============================================================================
-- IEP GOAL OBJECTIVES TABLE
-- Short-term objectives or benchmarks for goals
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_goal_objectives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES iep_goals(id) ON DELETE CASCADE,
    
    -- Objective Information (Bilingual)
    objective_number INTEGER NOT NULL, -- Sequential within goal
    objective_statement_ar TEXT NOT NULL,
    objective_statement_en TEXT,
    
    -- Measurement Criteria
    measurement_criteria TEXT NOT NULL,
    target_percentage INTEGER,
    target_frequency INTEGER,
    evaluation_method_ar TEXT NOT NULL,
    evaluation_method_en TEXT,
    
    -- Progress Tracking
    current_progress_percentage INTEGER DEFAULT 0,
    mastery_date DATE,
    is_mastered BOOLEAN DEFAULT false,
    
    -- Timeline
    target_date DATE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(goal_id, objective_number)
);

-- Indexes for Objectives
CREATE INDEX IF NOT EXISTS idx_iep_objectives_goal_id ON iep_goal_objectives(goal_id);
CREATE INDEX IF NOT EXISTS idx_iep_objectives_mastery ON iep_goal_objectives(is_mastered);

-- =============================================================================
-- IEP PROGRESS TRACKING TABLE
-- Data collection for goal progress
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_progress_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES iep_goals(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES iep_goal_objectives(id) ON DELETE CASCADE,
    
    -- Data Collection Information
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collected_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Progress Data
    score_achieved INTEGER,
    score_possible INTEGER,
    percentage_achieved DECIMAL(5,2),
    duration_minutes INTEGER,
    frequency_count INTEGER,
    
    -- Trial Data (for discrete trial teaching)
    trials_attempted INTEGER,
    trials_successful INTEGER,
    
    -- Qualitative Data (Bilingual)
    observations_ar TEXT,
    observations_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Context Information
    setting VARCHAR(50), -- Where data was collected
    activity VARCHAR(100), -- Activity during data collection
    support_level VARCHAR(30) CHECK (support_level IN (
        'independent', 'verbal_prompt', 'gestural_prompt', 
        'physical_prompt', 'full_assistance'
    )),
    
    -- Data Quality
    data_reliability VARCHAR(20) DEFAULT 'reliable' CHECK (data_reliability IN ('reliable', 'questionable', 'invalid')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Progress Data
CREATE INDEX IF NOT EXISTS idx_iep_progress_goal_id ON iep_progress_data(goal_id);
CREATE INDEX IF NOT EXISTS idx_iep_progress_date ON iep_progress_data(collection_date);
CREATE INDEX IF NOT EXISTS idx_iep_progress_collected_by ON iep_progress_data(collected_by);

-- =============================================================================
-- IEP SERVICES TABLE
-- Special education and related services
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Service Information (Bilingual)
    service_name_ar TEXT NOT NULL,
    service_name_en TEXT,
    service_category VARCHAR(30) NOT NULL CHECK (service_category IN (
        'special_education', 'speech_therapy', 'occupational_therapy', 
        'physical_therapy', 'behavioral_support', 'counseling', 
        'transportation', 'nursing', 'other_related_service'
    )),
    
    -- Service Provider
    provider_name VARCHAR(100),
    provider_qualification VARCHAR(100),
    provider_id UUID REFERENCES auth.users(id),
    
    -- Service Delivery Details
    frequency_per_week INTEGER NOT NULL,
    session_duration_minutes INTEGER NOT NULL,
    total_minutes_per_week INTEGER GENERATED ALWAYS AS (frequency_per_week * session_duration_minutes) STORED,
    
    -- Service Location and Setting
    service_location VARCHAR(50) NOT NULL CHECK (service_location IN (
        'general_education_classroom', 'special_education_classroom',
        'therapy_room', 'home', 'community', 'online', 'other'
    )),
    service_setting_ar TEXT,
    service_setting_en TEXT,
    
    -- Service Timeline
    start_date DATE NOT NULL,
    end_date DATE,
    total_service_hours DECIMAL(6,2),
    
    -- Service Goals and Objectives (links to specific goals)
    related_goal_ids UUID[] DEFAULT '{}', -- Array of goal IDs this service supports
    
    -- Progress and Outcomes
    service_status VARCHAR(20) DEFAULT 'active' CHECK (service_status IN ('active', 'completed', 'discontinued', 'modified')),
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for Services
CREATE INDEX IF NOT EXISTS idx_iep_services_iep_id ON iep_services(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_services_category ON iep_services(service_category);
CREATE INDEX IF NOT EXISTS idx_iep_services_provider ON iep_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_iep_services_status ON iep_services(service_status);

-- =============================================================================
-- IEP TEAM MEMBERS TABLE
-- IEP team composition and roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Team Member Information
    user_id UUID REFERENCES auth.users(id), -- If internal staff
    external_member_name VARCHAR(100), -- If external member
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Role Information (Bilingual)
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'parent_guardian', 'special_education_teacher', 'general_education_teacher',
        'speech_therapist', 'occupational_therapist', 'physical_therapist',
        'school_psychologist', 'behavior_specialist', 'administrator',
        'related_service_provider', 'student', 'advocate', 'interpreter'
    )),
    role_description_ar TEXT,
    role_description_en TEXT,
    
    -- Participation Details
    is_required_member BOOLEAN DEFAULT true,
    participation_status VARCHAR(20) DEFAULT 'active' CHECK (participation_status IN ('active', 'inactive', 'excused')),
    
    -- Meeting Participation
    attends_meetings BOOLEAN DEFAULT true,
    meeting_participation_mode VARCHAR(20) DEFAULT 'in_person' CHECK (meeting_participation_mode IN ('in_person', 'virtual', 'phone')),
    
    -- Contact Preferences (Bilingual)
    preferred_language VARCHAR(5) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    communication_notes_ar TEXT,
    communication_notes_en TEXT,
    
    -- Metadata
    added_date DATE DEFAULT CURRENT_DATE,
    added_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique role per IEP (where applicable)
    UNIQUE(iep_id, user_id, role)
);

-- Indexes for Team Members
CREATE INDEX IF NOT EXISTS idx_iep_team_iep_id ON iep_team_members(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_team_user_id ON iep_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_iep_team_role ON iep_team_members(role);

-- =============================================================================
-- IEP MEETINGS TABLE
-- Meeting management and documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Meeting Information (Bilingual)
    meeting_title_ar TEXT NOT NULL,
    meeting_title_en TEXT,
    meeting_type VARCHAR(30) NOT NULL CHECK (meeting_type IN (
        'initial_meeting', 'annual_review', 'quarterly_review',
        'amendment_meeting', 'transition_meeting', 'disciplinary_meeting'
    )),
    
    -- Meeting Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_location_ar TEXT,
    meeting_location_en TEXT,
    meeting_mode VARCHAR(20) DEFAULT 'in_person' CHECK (meeting_mode IN ('in_person', 'virtual', 'hybrid')),
    
    -- Meeting Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    
    -- Meeting Documentation (Bilingual)
    agenda_ar TEXT,
    agenda_en TEXT,
    minutes_ar TEXT,
    minutes_en TEXT,
    decisions_made_ar TEXT,
    decisions_made_en TEXT,
    action_items_ar TEXT,
    action_items_en TEXT,
    
    -- Meeting Outcomes
    iep_changes_made BOOLEAN DEFAULT false,
    next_meeting_scheduled BOOLEAN DEFAULT false,
    next_meeting_date DATE,
    
    -- Attendance
    total_invited INTEGER DEFAULT 0,
    total_attended INTEGER DEFAULT 0,
    
    -- File Attachments
    meeting_recording_path TEXT, -- If recorded
    presentation_files JSONB DEFAULT '[]',
    supporting_documents JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for Meetings
CREATE INDEX IF NOT EXISTS idx_iep_meetings_iep_id ON iep_meetings(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_date ON iep_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_status ON iep_meetings(status);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_type ON iep_meetings(meeting_type);

-- =============================================================================
-- IEP MEETING ATTENDANCE TABLE
-- Track attendance for each meeting
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_meeting_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES iep_meetings(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES iep_team_members(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN (
        'present', 'absent', 'excused', 'partial'
    )),
    arrival_time TIME,
    departure_time TIME,
    
    -- Participation Notes (Bilingual)
    participation_notes_ar TEXT,
    participation_notes_en TEXT,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(meeting_id, team_member_id)
);

-- Indexes for Meeting Attendance
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting ON iep_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member ON iep_meeting_attendance(team_member_id);

-- =============================================================================
-- IEP APPROVALS TABLE
-- Digital signature and approval workflow
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Approver Information
    approver_id UUID REFERENCES auth.users(id),
    approver_name VARCHAR(100) NOT NULL, -- For external approvers
    approver_role VARCHAR(50) NOT NULL,
    approver_email VARCHAR(255),
    
    -- Approval Details
    approval_type VARCHAR(30) NOT NULL CHECK (approval_type IN (
        'parent_consent', 'team_member_signature', 'administrator_approval',
        'student_signature', 'external_agency_approval'
    )),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'withdrawn'
    )),
    
    -- Digital Signature
    signature_data TEXT, -- Base64 encoded signature or signature hash
    signature_method VARCHAR(20) DEFAULT 'digital' CHECK (signature_method IN ('digital', 'electronic', 'wet_signature')),
    ip_address INET, -- IP address of signer
    user_agent TEXT, -- Browser/device information
    
    -- Approval Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Signature expiration
    
    -- Comments and Notes (Bilingual)
    approval_comments_ar TEXT,
    approval_comments_en TEXT,
    rejection_reason_ar TEXT,
    rejection_reason_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Approvals
CREATE INDEX IF NOT EXISTS idx_iep_approvals_iep_id ON iep_approvals(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_approver ON iep_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_status ON iep_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_type ON iep_approvals(approval_type);

-- =============================================================================
-- IEP COMPLIANCE ALERTS TABLE
-- Automated compliance monitoring and alerts
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_compliance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Alert Information (Bilingual)
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'annual_review_due', 'quarterly_review_due', 'service_hours_missing',
        'goal_progress_overdue', 'meeting_not_scheduled', 'approval_missing',
        'document_incomplete', 'compliance_violation'
    )),
    alert_title_ar TEXT NOT NULL,
    alert_title_en TEXT,
    alert_message_ar TEXT NOT NULL,
    alert_message_en TEXT,
    
    -- Alert Severity and Priority
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1 = highest priority
    
    -- Alert Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    
    -- Timeline Information
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE, -- When action must be taken
    days_until_due INTEGER GENERATED ALWAYS AS (due_date - CURRENT_DATE) STORED,
    
    -- Assignment and Resolution
    assigned_to UUID REFERENCES auth.users(id),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes_ar TEXT,
    resolution_notes_en TEXT,
    
    -- Notification Status
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Compliance Alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_iep ON iep_compliance_alerts(iep_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON iep_compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON iep_compliance_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON iep_compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_due_date ON iep_compliance_alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_assigned ON iep_compliance_alerts(assigned_to);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps automatically
CREATE TRIGGER update_ieps_updated_at 
    BEFORE UPDATE ON ieps 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_goals_updated_at 
    BEFORE UPDATE ON iep_goals 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_progress_data_updated_at 
    BEFORE UPDATE ON iep_progress_data 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_services_updated_at 
    BEFORE UPDATE ON iep_services 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_meetings_updated_at 
    BEFORE UPDATE ON iep_meetings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_approvals_updated_at 
    BEFORE UPDATE ON iep_approvals 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_iep_compliance_alerts_updated_at 
    BEFORE UPDATE ON iep_compliance_alerts 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Update goal count in IEP when goals are added/removed
CREATE OR REPLACE FUNCTION update_iep_goals_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = NEW.iep_id AND is_active = true
        )
        WHERE id = NEW.iep_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = NEW.iep_id AND is_active = true
        )
        WHERE id = NEW.iep_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = OLD.iep_id AND is_active = true
        )
        WHERE id = OLD.iep_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_iep_goals_count
    AFTER INSERT OR UPDATE OR DELETE ON iep_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_iep_goals_count();

-- Generate IEP number automatically
CREATE OR REPLACE FUNCTION generate_iep_number(student_reg_number TEXT, academic_year TEXT)
RETURNS TEXT AS $$
DECLARE
    iep_number TEXT;
    year_short TEXT;
BEGIN
    -- Extract last 2 digits of academic year (e.g., "2024-2025" -> "24")
    year_short := SUBSTRING(academic_year FROM 1 FOR 2);
    
    -- Generate IEP number: IEP-STU-2025-0001-24
    iep_number := 'IEP-' || student_reg_number || '-' || year_short;
    
    RETURN iep_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE ieps IS 'Core IEP documents with IDEA 2024 compliance features and bilingual support';
COMMENT ON TABLE iep_goals IS 'Measurable annual goals as required by IDEA with progress tracking';
COMMENT ON TABLE iep_goal_objectives IS 'Short-term objectives and benchmarks for IEP goals';
COMMENT ON TABLE iep_progress_data IS 'Data collection for tracking progress toward IEP goals';
COMMENT ON TABLE iep_services IS 'Special education and related services as specified in IEP';
COMMENT ON TABLE iep_team_members IS 'IEP team composition and member roles';
COMMENT ON TABLE iep_meetings IS 'IEP meeting management and documentation';
COMMENT ON TABLE iep_meeting_attendance IS 'Attendance tracking for IEP meetings';
COMMENT ON TABLE iep_approvals IS 'Digital signature and approval workflow for IEPs';
COMMENT ON TABLE iep_compliance_alerts IS 'Automated compliance monitoring and alert system';

-- End of IEP Management Schema
-- This schema provides comprehensive IDEA 2024 compliant IEP management
-- with bilingual support, progress tracking, and compliance monitoring
-- for the Arkan Al-Numo Center ERP system.