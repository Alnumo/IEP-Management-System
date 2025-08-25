-- AI-Powered Analytics & Advanced Therapy Management Schema
-- Phase 6: Machine Learning and Predictive Analytics System

-- =====================================================================
-- AI TREATMENT RECOMMENDATION ENGINE
-- =====================================================================

-- ML Models Registry
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    model_type TEXT CHECK (model_type IN ('recommendation', 'prediction', 'classification', 'regression')),
    description_ar TEXT,
    description_en TEXT,
    training_data_size INTEGER,
    accuracy_score DECIMAL(5,4), -- 0.0000 to 1.0000
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    model_file_path TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment Recommendations
CREATE TABLE IF NOT EXISTS treatment_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ml_models(id),
    
    -- Recommendation Details
    recommended_therapy_program_id UUID REFERENCES therapy_programs(id),
    confidence_score DECIMAL(5,4), -- Model confidence (0.0000-1.0000)
    recommendation_type TEXT CHECK (recommendation_type IN ('initial', 'adjustment', 'continuation', 'transition')),
    
    -- Input Features (JSON for flexibility)
    input_features JSONB DEFAULT '{}', -- Age, diagnosis, previous progress, etc.
    
    -- Recommendation Content
    recommended_goals JSONB DEFAULT '[]',
    recommended_sessions_per_week INTEGER,
    recommended_session_duration INTEGER,
    recommended_intensity TEXT CHECK (recommended_intensity IN ('low', 'medium', 'high', 'intensive')),
    
    -- Status and Feedback
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')) DEFAULT 'pending',
    therapist_feedback TEXT,
    actual_outcome TEXT,
    effectiveness_score DECIMAL(3,2), -- 1-5 rating
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    
    INDEX idx_treatment_recommendations_student (student_id),
    INDEX idx_treatment_recommendations_model (model_id),
    INDEX idx_treatment_recommendations_confidence (confidence_score)
);

-- =====================================================================
-- PREDICTIVE ANALYTICS SYSTEM
-- =====================================================================

-- Progress Predictions
CREATE TABLE IF NOT EXISTS progress_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    model_id UUID REFERENCES ml_models(id),
    
    -- Prediction Details
    prediction_type TEXT CHECK (prediction_type IN ('short_term', 'medium_term', 'long_term')), -- 1 month, 6 months, 1 year
    predicted_outcome JSONB DEFAULT '{}', -- Predicted scores, milestones, etc.
    confidence_interval JSONB DEFAULT '{}', -- Lower and upper bounds
    prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    target_date TIMESTAMP WITH TIME ZONE,
    
    -- Risk Assessment
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB DEFAULT '[]',
    intervention_recommendations JSONB DEFAULT '[]',
    
    -- Validation
    actual_outcome JSONB DEFAULT '{}',
    prediction_accuracy DECIMAL(5,4),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_progress_predictions_student (student_id),
    INDEX idx_progress_predictions_risk (risk_level),
    INDEX idx_progress_predictions_date (prediction_date)
);

-- Alert System
CREATE TABLE IF NOT EXISTS intelligent_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT CHECK (alert_type IN ('progress_concern', 'attendance_drop', 'goal_deviation', 'regression_risk', 'optimization_opportunity')),
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'urgent')) DEFAULT 'info',
    
    -- Target Information
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    therapist_id UUID REFERENCES auth.users(id),
    
    -- Alert Content
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    recommended_actions JSONB DEFAULT '[]',
    
    -- AI Analysis
    generated_by_model UUID REFERENCES ml_models(id),
    confidence_score DECIMAL(5,4),
    supporting_data JSONB DEFAULT '{}',
    
    -- Status Management
    status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')) DEFAULT 'active',
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_intelligent_alerts_student (student_id),
    INDEX idx_intelligent_alerts_severity (severity),
    INDEX idx_intelligent_alerts_status (status),
    INDEX idx_intelligent_alerts_created (created_at)
);

-- =====================================================================
-- SMART SESSION OPTIMIZATION
-- =====================================================================

-- Schedule Optimization Engine
CREATE TABLE IF NOT EXISTS schedule_optimizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    optimization_date DATE DEFAULT CURRENT_DATE,
    optimization_type TEXT CHECK (optimization_type IN ('daily', 'weekly', 'monthly', 'on_demand')),
    
    -- Optimization Parameters
    constraints JSONB DEFAULT '{}', -- Room availability, therapist preferences, etc.
    objectives JSONB DEFAULT '{}', -- Minimize conflicts, maximize efficiency, etc.
    
    -- Results
    original_schedule_efficiency DECIMAL(5,4),
    optimized_schedule_efficiency DECIMAL(5,4),
    improvement_percentage DECIMAL(5,2),
    conflicts_resolved INTEGER DEFAULT 0,
    
    -- Optimization Details
    changes_made JSONB DEFAULT '[]',
    model_id UUID REFERENCES ml_models(id),
    execution_time_ms INTEGER,
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'completed', 'applied', 'rejected')) DEFAULT 'pending',
    applied_by UUID REFERENCES auth.users(id),
    applied_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_schedule_optimizations_date (optimization_date),
    INDEX idx_schedule_optimizations_status (status)
);

-- Resource Allocation Intelligence
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    allocation_date DATE DEFAULT CURRENT_DATE,
    resource_type TEXT CHECK (resource_type IN ('therapist', 'room', 'equipment', 'materials')),
    
    -- Allocation Details
    resource_id TEXT NOT NULL, -- Reference to therapist, room, equipment ID
    allocated_to_student_id UUID REFERENCES students(id),
    session_id UUID, -- Reference to session if applicable
    
    -- AI Optimization
    allocation_score DECIMAL(5,4), -- How optimal this allocation is
    efficiency_metrics JSONB DEFAULT '{}',
    utilization_rate DECIMAL(5,4),
    
    -- Time Management
    allocated_from TIMESTAMP WITH TIME ZONE,
    allocated_until TIMESTAMP WITH TIME ZONE,
    actual_duration INTEGER, -- in minutes
    
    -- Performance Tracking
    satisfaction_score DECIMAL(3,2), -- 1-5 rating from therapist/student
    outcome_quality DECIMAL(3,2), -- 1-5 session quality rating
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_resource_allocations_date (allocation_date),
    INDEX idx_resource_allocations_resource (resource_type, resource_id),
    INDEX idx_resource_allocations_student (allocated_to_student_id)
);

-- =====================================================================
-- INTELLIGENT DOCUMENTATION SYSTEM
-- =====================================================================

-- AI-Generated Session Notes
CREATE TABLE IF NOT EXISTS ai_session_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL, -- Reference to actual session
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES auth.users(id),
    
    -- AI-Generated Content
    auto_generated_notes_ar TEXT,
    auto_generated_notes_en TEXT,
    confidence_score DECIMAL(5,4),
    model_id UUID REFERENCES ml_models(id),
    
    -- Structured Analysis
    session_analysis JSONB DEFAULT '{}', -- Automated analysis of session activities
    progress_indicators JSONB DEFAULT '[]', -- Detected progress markers
    concerns_identified JSONB DEFAULT '[]', -- Potential issues detected
    goal_achievements JSONB DEFAULT '[]', -- Goals addressed in session
    
    -- Therapist Review
    therapist_approved BOOLEAN DEFAULT false,
    therapist_modifications TEXT,
    manual_notes TEXT,
    final_notes TEXT,
    
    -- Quality Metrics
    accuracy_rating DECIMAL(3,2), -- Therapist rating of AI accuracy (1-5)
    usefulness_rating DECIMAL(3,2), -- How useful the AI notes were (1-5)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_ai_session_notes_session (session_id),
    INDEX idx_ai_session_notes_student (student_id),
    INDEX idx_ai_session_notes_created (created_at)
);

-- Smart Goal Recommendations
CREATE TABLE IF NOT EXISTS smart_goal_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Goal Details
    goal_category TEXT, -- Communication, Social, Motor, etc.
    recommended_goal_ar TEXT NOT NULL,
    recommended_goal_en TEXT NOT NULL,
    goal_type TEXT CHECK (goal_type IN ('short_term', 'long_term', 'milestone')),
    
    -- AI Analysis
    recommendation_rationale JSONB DEFAULT '{}', -- Why this goal was recommended
    supporting_data JSONB DEFAULT '{}', -- Student data supporting this recommendation
    confidence_score DECIMAL(5,4),
    model_id UUID REFERENCES ml_models(id),
    
    -- Implementation Details
    suggested_activities JSONB DEFAULT '[]',
    estimated_timeline_weeks INTEGER,
    prerequisite_goals JSONB DEFAULT '[]',
    success_criteria JSONB DEFAULT '[]',
    
    -- Status and Feedback
    status TEXT CHECK (status IN ('suggested', 'accepted', 'modified', 'rejected')) DEFAULT 'suggested',
    therapist_feedback TEXT,
    implementation_date DATE,
    actual_outcome TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    
    INDEX idx_smart_goal_recommendations_student (student_id),
    INDEX idx_smart_goal_recommendations_status (status),
    INDEX idx_smart_goal_recommendations_confidence (confidence_score)
);

-- =====================================================================
-- ADVANCED ANALYTICS TABLES
-- =====================================================================

-- Therapy Effectiveness Metrics
CREATE TABLE IF NOT EXISTS therapy_effectiveness_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Effectiveness Measures
    overall_effectiveness_score DECIMAL(5,4), -- 0-1 scale
    improvement_rate DECIMAL(5,4), -- Rate of student improvement
    goal_achievement_rate DECIMAL(5,4), -- Percentage of goals achieved
    session_completion_rate DECIMAL(5,4), -- Session attendance rate
    
    -- Comparative Analysis
    program_ranking INTEGER, -- Ranking among all programs
    benchmark_comparison DECIMAL(5,4), -- Compared to industry standards
    
    -- Student Outcomes
    students_analyzed INTEGER,
    significant_improvements INTEGER,
    plateaued_students INTEGER,
    concerning_cases INTEGER,
    
    -- Detailed Metrics
    metrics_breakdown JSONB DEFAULT '{}', -- Detailed breakdown by skill areas
    demographic_analysis JSONB DEFAULT '{}', -- Effectiveness by age, gender, diagnosis
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculated_by_model UUID REFERENCES ml_models(id),
    
    INDEX idx_therapy_effectiveness_period (analysis_period_start, analysis_period_end),
    INDEX idx_therapy_effectiveness_program (therapy_program_id),
    INDEX idx_therapy_effectiveness_score (overall_effectiveness_score)
);

-- Predictive Dashboards Data
CREATE TABLE IF NOT EXISTS dashboard_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    insight_type TEXT CHECK (insight_type IN ('trend', 'prediction', 'anomaly', 'recommendation', 'alert')),
    scope TEXT CHECK (scope IN ('individual', 'program', 'center', 'system')),
    
    -- Insight Content
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    
    -- Data and Visualization
    insight_data JSONB DEFAULT '{}', -- Raw data for visualization
    chart_type TEXT, -- line, bar, pie, scatter, etc.
    chart_config JSONB DEFAULT '{}', -- Chart configuration
    
    -- Relevance and Priority
    relevance_score DECIMAL(5,4), -- How relevant this insight is
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    target_audience JSONB DEFAULT '[]', -- Who should see this insight
    
    -- AI Generation
    generated_by_model UUID REFERENCES ml_models(id),
    confidence_level DECIMAL(5,4),
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_dashboard_insights_type (insight_type),
    INDEX idx_dashboard_insights_priority (priority),
    INDEX idx_dashboard_insights_active (is_active, created_at)
);

-- =====================================================================
-- SYSTEM CONFIGURATION AND METADATA
-- =====================================================================

-- AI System Configuration
CREATE TABLE IF NOT EXISTS ai_system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB DEFAULT '{}',
    description_ar TEXT,
    description_en TEXT,
    config_type TEXT CHECK (config_type IN ('model', 'threshold', 'feature', 'integration')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Training Jobs
CREATE TABLE IF NOT EXISTS model_training_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID REFERENCES ml_models(id),
    job_name TEXT NOT NULL,
    job_type TEXT CHECK (job_type IN ('training', 'retraining', 'validation', 'deployment')),
    
    -- Job Configuration
    training_parameters JSONB DEFAULT '{}',
    dataset_info JSONB DEFAULT '{}',
    
    -- Job Status
    status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    training_metrics JSONB DEFAULT '{}',
    model_performance JSONB DEFAULT '{}',
    error_log TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_model_training_jobs_status (status),
    INDEX idx_model_training_jobs_model (model_id),
    INDEX idx_model_training_jobs_created (created_at)
);

-- =====================================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================================

-- Update triggers
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_system_config_updated_at BEFORE UPDATE ON ai_system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_treatment_recommendations_generated 
    ON treatment_recommendations(generated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_predictions_target 
    ON progress_predictions(target_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligent_alerts_expires 
    ON intelligent_alerts(expires_at) WHERE expires_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_session_notes_student_date 
    ON ai_session_notes(student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_insights_active_priority 
    ON dashboard_insights(is_active, priority, created_at DESC) WHERE is_active = true;

-- =====================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE ml_models IS 'Registry of machine learning models used in the AI therapy management system';
COMMENT ON TABLE treatment_recommendations IS 'AI-generated treatment recommendations for students with confidence scoring';
COMMENT ON TABLE progress_predictions IS 'Predictive analytics for student progress and risk assessment';
COMMENT ON TABLE intelligent_alerts IS 'AI-generated alerts for therapists and administrators about important events or concerns';
COMMENT ON TABLE schedule_optimizations IS 'Results from AI-powered schedule optimization algorithms';
COMMENT ON TABLE resource_allocations IS 'Intelligent resource allocation tracking and optimization';
COMMENT ON TABLE ai_session_notes IS 'AI-generated session notes with therapist review and approval workflow';
COMMENT ON TABLE smart_goal_recommendations IS 'AI-suggested therapy goals based on student progress and data analysis';
COMMENT ON TABLE therapy_effectiveness_metrics IS 'Advanced analytics on therapy program effectiveness and outcomes';
COMMENT ON TABLE dashboard_insights IS 'AI-generated insights and visualizations for management dashboards';
COMMENT ON TABLE ai_system_config IS 'Configuration parameters for AI models and features';
COMMENT ON TABLE model_training_jobs IS 'Tracking and management of ML model training processes';

-- End of AI Analytics Schema
-- This schema provides comprehensive AI-powered analytics and management capabilities
-- for advanced therapy management with machine learning integration