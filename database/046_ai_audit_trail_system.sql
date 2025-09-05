-- AI Audit Trail System
-- Comprehensive audit trail for AI recommendations and model performance
-- Story 5.1: AI-Powered Therapy Plan Recommendations

-- Audit Trail Table for all AI recommendation activities
CREATE TABLE ai_recommendation_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id),
    therapist_id UUID REFERENCES therapists(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'recommendation_generated',
        'feedback_provided',
        'outcome_recorded',
        'explanation_viewed',
        'recommendation_modified',
        'model_prediction_made'
    )),
    model_version TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Recommendation Accuracy Metrics
CREATE TABLE ai_recommendation_accuracy_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES ai_recommendations(id) ON DELETE CASCADE UNIQUE,
    accuracy_rating DECIMAL(3,2) CHECK (accuracy_rating >= 0 AND accuracy_rating <= 1),
    implementation_success BOOLEAN,
    usefulness_rating DECIMAL(3,2) CHECK (usefulness_rating >= 0 AND usefulness_rating <= 1),
    confidence_alignment DECIMAL(3,2), -- How well confidence matched actual accuracy
    time_to_feedback_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Longitudinal Outcome Tracking
CREATE TABLE ai_recommendation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    goal_progress DECIMAL(5,2) CHECK (goal_progress >= 0 AND goal_progress <= 100),
    student_engagement DECIMAL(3,2) CHECK (student_engagement >= 0 AND student_engagement <= 10),
    effectiveness_rating DECIMAL(3,2) CHECK (effectiveness_rating >= 0 AND effectiveness_rating <= 5),
    adaptations_needed TEXT[],
    unexpected_challenges TEXT[],
    session_id UUID REFERENCES therapy_sessions(id),
    outcome_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Version Performance Tracking
CREATE TABLE ai_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    model_type TEXT NOT NULL DEFAULT 'therapy_recommendation',
    status TEXT NOT NULL CHECK (status IN ('training', 'testing', 'deployed', 'deprecated', 'failed')),
    performance_metrics JSONB DEFAULT '{}',
    bias_report JSONB DEFAULT '{}',
    training_data_size INTEGER,
    validation_accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    training_config JSONB DEFAULT '{}',
    trained_at TIMESTAMP WITH TIME ZONE,
    deployed_at TIMESTAMP WITH TIME ZONE,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Accuracy and Bias Alerts
CREATE TABLE ai_accuracy_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'accuracy_degradation',
        'bias_drift',
        'low_accuracy',
        'model_failure',
        'compliance_violation'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    therapist_id UUID REFERENCES therapists(id),
    recommendation_id UUID REFERENCES ai_recommendations(id),
    model_version TEXT,
    metadata JSONB DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bias Analysis Results
CREATE TABLE ai_bias_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE NOT NULL,
    model_version TEXT NOT NULL,
    demographic_dimension TEXT NOT NULL CHECK (demographic_dimension IN (
        'gender', 'age', 'cultural_background', 'diagnosis_category', 'socioeconomic_status'
    )),
    bias_score DECIMAL(5,4) CHECK (bias_score >= 0 AND bias_score <= 1),
    affected_groups JSONB,
    statistical_significance DECIMAL(5,4),
    sample_size INTEGER NOT NULL,
    mitigation_actions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Audit Log
CREATE TABLE ai_compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_date DATE NOT NULL,
    compliance_area TEXT NOT NULL CHECK (compliance_area IN (
        'audit_trail', 'explainability', 'consent', 'data_retention', 'human_oversight'
    )),
    compliance_score DECIMAL(3,2) CHECK (compliance_score >= 0 AND compliance_score <= 1),
    issues_identified TEXT[],
    remediation_plan JSONB,
    auditor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_audit_trail_recommendation_id ON ai_recommendation_audit_trail(recommendation_id);
CREATE INDEX idx_audit_trail_student_id ON ai_recommendation_audit_trail(student_id);
CREATE INDEX idx_audit_trail_therapist_id ON ai_recommendation_audit_trail(therapist_id);
CREATE INDEX idx_audit_trail_action_type ON ai_recommendation_audit_trail(action_type);
CREATE INDEX idx_audit_trail_created_at ON ai_recommendation_audit_trail(created_at);
CREATE INDEX idx_audit_trail_model_version ON ai_recommendation_audit_trail(model_version);

CREATE INDEX idx_accuracy_metrics_recommendation_id ON ai_recommendation_accuracy_metrics(recommendation_id);
CREATE INDEX idx_accuracy_metrics_accuracy_rating ON ai_recommendation_accuracy_metrics(accuracy_rating);
CREATE INDEX idx_accuracy_metrics_created_at ON ai_recommendation_accuracy_metrics(created_at);

CREATE INDEX idx_outcomes_recommendation_id ON ai_recommendation_outcomes(recommendation_id);
CREATE INDEX idx_outcomes_outcome_date ON ai_recommendation_outcomes(outcome_date);
CREATE INDEX idx_outcomes_effectiveness ON ai_recommendation_outcomes(effectiveness_rating);

CREATE INDEX idx_model_versions_status ON ai_model_versions(status);
CREATE INDEX idx_model_versions_version ON ai_model_versions(version);
CREATE INDEX idx_model_versions_deployed_at ON ai_model_versions(deployed_at);

CREATE INDEX idx_alerts_alert_type ON ai_accuracy_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON ai_accuracy_alerts(severity);
CREATE INDEX idx_alerts_created_at ON ai_accuracy_alerts(created_at);
CREATE INDEX idx_alerts_resolved_at ON ai_accuracy_alerts(resolved_at);

CREATE INDEX idx_bias_analysis_date ON ai_bias_analysis_results(analysis_date);
CREATE INDEX idx_bias_analysis_dimension ON ai_bias_analysis_results(demographic_dimension);
CREATE INDEX idx_bias_analysis_score ON ai_bias_analysis_results(bias_score);

-- Row Level Security Policies

-- Audit Trail Access (therapists can only see their own actions)
ALTER TABLE ai_recommendation_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY therapist_audit_trail_access ON ai_recommendation_audit_trail
    FOR SELECT TO authenticated
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM therapists WHERE user_id = auth.uid()
        )
        OR therapist_id::text = (
            SELECT id::text FROM therapists WHERE user_id = auth.uid()
        )
    );

CREATE POLICY admin_audit_trail_access ON ai_recommendation_audit_trail
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Accuracy Metrics Access
ALTER TABLE ai_recommendation_accuracy_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY therapist_accuracy_access ON ai_recommendation_accuracy_metrics
    FOR SELECT TO authenticated
    USING (
        recommendation_id IN (
            SELECT id FROM ai_recommendations ar
            JOIN students s ON ar.student_id = s.id
            JOIN student_enrollments se ON s.id = se.student_id
            JOIN therapists t ON se.primary_therapist_id = t.id
            WHERE t.user_id = auth.uid()
        )
    );

-- Model Versions (read-only for therapists, full access for admins)
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY model_versions_read ON ai_model_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM therapists WHERE user_id = auth.uid()
        )
    );

CREATE POLICY model_versions_admin ON ai_model_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Alerts (therapists see their alerts, admins see all)
ALTER TABLE ai_accuracy_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY therapist_alerts ON ai_accuracy_alerts
    FOR SELECT TO authenticated
    USING (
        therapist_id::text = (
            SELECT id::text FROM therapists WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Outcomes tracking
ALTER TABLE ai_recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY outcomes_access ON ai_recommendation_outcomes
    FOR ALL TO authenticated
    USING (
        recommendation_id IN (
            SELECT id FROM ai_recommendations ar
            JOIN students s ON ar.student_id = s.id
            JOIN student_enrollments se ON s.id = se.student_id
            JOIN therapists t ON se.primary_therapist_id = t.id
            WHERE t.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Bias Analysis (admin access only for sensitive data)
ALTER TABLE ai_bias_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY bias_analysis_admin_only ON ai_bias_analysis_results
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Compliance Audit (admin access only)
ALTER TABLE ai_compliance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_audit_admin_only ON ai_compliance_audit_log
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM therapists 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Triggers for automatic timestamping
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accuracy_metrics_updated_at
    BEFORE UPDATE ON ai_recommendation_accuracy_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_outcomes_updated_at
    BEFORE UPDATE ON ai_recommendation_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Automatic audit trail insertion trigger for recommendations
CREATE OR REPLACE FUNCTION create_audit_trail_on_recommendation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_recommendation_audit_trail (
        recommendation_id,
        student_id,
        therapist_id,
        action_type,
        model_version,
        input_data,
        output_data,
        created_by
    ) VALUES (
        NEW.id,
        NEW.student_id,
        NEW.therapist_id,
        'recommendation_generated',
        NEW.model_version,
        NEW.input_features,
        jsonb_build_object(
            'recommendations', NEW.recommendations,
            'confidence_scores', NEW.confidence_scores,
            'explanation', NEW.explanation
        ),
        auth.uid()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_recommendation_creation
    AFTER INSERT ON ai_recommendations
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail_on_recommendation();

-- View for comprehensive recommendation analytics
CREATE OR REPLACE VIEW ai_recommendation_analytics AS
SELECT 
    ar.id as recommendation_id,
    ar.student_id,
    ar.therapist_id,
    ar.model_version,
    ar.confidence_score,
    ar.created_at as recommendation_date,
    
    -- Accuracy metrics
    arm.accuracy_rating,
    arm.implementation_success,
    arm.usefulness_rating,
    arm.time_to_feedback_hours,
    
    -- Outcomes
    aro.goal_progress,
    aro.student_engagement,
    aro.effectiveness_rating,
    array_length(aro.adaptations_needed, 1) as adaptations_count,
    
    -- Student demographics (for bias analysis)
    s.age,
    s.gender,
    s.cultural_background,
    
    -- Therapist info
    t.specialization,
    t.experience_years
    
FROM ai_recommendations ar
LEFT JOIN ai_recommendation_accuracy_metrics arm ON ar.id = arm.recommendation_id
LEFT JOIN ai_recommendation_outcomes aro ON ar.id = aro.recommendation_id
LEFT JOIN students s ON ar.student_id = s.id
LEFT JOIN therapists t ON ar.therapist_id = t.id;

-- View for model performance tracking
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT 
    mv.version,
    mv.status,
    mv.validation_accuracy,
    mv.f1_score,
    mv.deployed_at,
    
    -- Aggregated accuracy from real usage
    AVG(arm.accuracy_rating) as real_world_accuracy,
    COUNT(arm.id) as feedback_count,
    
    -- Bias scores
    AVG(CASE WHEN bar.demographic_dimension = 'gender' THEN bar.bias_score END) as gender_bias_score,
    AVG(CASE WHEN bar.demographic_dimension = 'age' THEN bar.bias_score END) as age_bias_score,
    AVG(CASE WHEN bar.demographic_dimension = 'cultural_background' THEN bar.bias_score END) as cultural_bias_score
    
FROM ai_model_versions mv
LEFT JOIN ai_recommendations ar ON mv.version = ar.model_version
LEFT JOIN ai_recommendation_accuracy_metrics arm ON ar.id = arm.recommendation_id
LEFT JOIN ai_bias_analysis_results bar ON mv.version = bar.model_version
GROUP BY mv.version, mv.status, mv.validation_accuracy, mv.f1_score, mv.deployed_at;

-- Comments for documentation
COMMENT ON TABLE ai_recommendation_audit_trail IS 'Complete audit trail of all AI recommendation system activities';
COMMENT ON TABLE ai_recommendation_accuracy_metrics IS 'Therapist feedback on recommendation accuracy and usefulness';
COMMENT ON TABLE ai_recommendation_outcomes IS 'Long-term outcome tracking for recommendation validation';
COMMENT ON TABLE ai_model_versions IS 'Version control and performance tracking for AI models';
COMMENT ON TABLE ai_accuracy_alerts IS 'Automated alerts for accuracy issues and bias detection';
COMMENT ON TABLE ai_bias_analysis_results IS 'Regular bias analysis results across demographic dimensions';
COMMENT ON TABLE ai_compliance_audit_log IS 'Compliance audit results for medical AI regulations';

COMMENT ON VIEW ai_recommendation_analytics IS 'Comprehensive analytics view combining recommendations, accuracy, outcomes, and demographics';
COMMENT ON VIEW model_performance_summary IS 'Summary view of model performance metrics combining validation and real-world usage data';