-- Story 5.3: Predictive Analytics Database Schema
-- Creates tables for predictive analytics data infrastructure

-- Predictive Analytics Results Table
CREATE TABLE predictive_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('therapy_outcome', 'goal_timeline', 'success_rate')),
    prediction_value JSONB NOT NULL,
    confidence_interval JSONB NOT NULL,
    risk_factors JSONB,
    clinical_explanations JSONB,
    model_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Risk Assessment Table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB NOT NULL,
    intervention_recommendations JSONB,
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP WITH TIME ZONE,
    attendance_score DECIMAL(5,4),
    progress_score DECIMAL(5,4),
    engagement_score DECIMAL(5,4),
    assessment_trend_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Operational Forecasts Table  
CREATE TABLE operational_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('capacity', 'workload', 'enrollment', 'revenue', 'staffing')),
    time_period VARCHAR(20) NOT NULL CHECK (time_period IN ('monthly', 'quarterly', 'yearly')),
    forecast_date DATE NOT NULL,
    predicted_value DECIMAL(12,2) NOT NULL,
    confidence_interval JSONB NOT NULL,
    seasonal_patterns JSONB,
    accuracy_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Prediction Accuracy Tracking Table
CREATE TABLE prediction_accuracy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL, -- References predictive_analytics.id or risk_assessments.id
    prediction_table VARCHAR(50) NOT NULL CHECK (prediction_table IN ('predictive_analytics', 'risk_assessments', 'operational_forecasts')),
    actual_outcome JSONB NOT NULL,
    accuracy_score DECIMAL(5,4),
    error_metrics JSONB,
    validation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    validated_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Clinical Outcomes Tracking Table
CREATE TABLE clinical_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES therapy_sessions(id),
    outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN ('goal_achieved', 'goal_progress', 'therapy_completion', 'dropout', 'plan_modified')),
    outcome_value JSONB NOT NULL,
    measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    baseline_prediction_id UUID, -- Links to original prediction
    therapist_notes TEXT,
    objective_measurements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Historical Data Aggregation View for ML Training
CREATE VIEW ml_training_data AS
SELECT 
    s.id as student_id,
    s.created_at as enrollment_date,
    s.medical_records,
    COUNT(ts.id) as total_sessions,
    AVG(CASE WHEN ts.attendance_status = 'present' THEN 1.0 ELSE 0.0 END) as attendance_rate,
    AVG(sa.score) as avg_assessment_score,
    COUNT(DISTINCT sa.assessment_type) as assessment_variety,
    AVG(EXTRACT(EPOCH FROM ts.session_duration)/3600.0) as avg_session_hours,
    COUNT(CASE WHEN co.outcome_type = 'goal_achieved' THEN 1 END) as goals_achieved,
    COUNT(CASE WHEN co.outcome_type = 'dropout' THEN 1 END) as dropout_events,
    tp.difficulty_level,
    tp.duration_weeks,
    tp.sessions_per_week
FROM students s
LEFT JOIN therapy_sessions ts ON s.id = ts.student_id
LEFT JOIN student_assessments sa ON s.id = sa.student_id  
LEFT JOIN clinical_outcomes co ON s.id = co.student_id
LEFT JOIN student_enrollments se ON s.id = se.student_id
LEFT JOIN therapy_plans tp ON se.therapy_plan_id = tp.id
WHERE s.created_at >= NOW() - INTERVAL '2 years' -- Limit to recent data
GROUP BY s.id, s.medical_records, tp.difficulty_level, tp.duration_weeks, tp.sessions_per_week;

-- Indexes for Performance
CREATE INDEX idx_predictive_analytics_student_type ON predictive_analytics(student_id, prediction_type);
CREATE INDEX idx_predictive_analytics_created_at ON predictive_analytics(created_at);
CREATE INDEX idx_predictive_analytics_expires_at ON predictive_analytics(expires_at);

CREATE INDEX idx_risk_assessments_student ON risk_assessments(student_id);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_created_at ON risk_assessments(created_at);
CREATE INDEX idx_risk_assessments_alert ON risk_assessments(alert_triggered, alert_sent_at);

CREATE INDEX idx_operational_forecasts_type_period ON operational_forecasts(forecast_type, time_period);
CREATE INDEX idx_operational_forecasts_date ON operational_forecasts(forecast_date);

CREATE INDEX idx_prediction_accuracy_prediction ON prediction_accuracy(prediction_id, prediction_table);
CREATE INDEX idx_prediction_accuracy_validation_date ON prediction_accuracy(validation_date);

CREATE INDEX idx_clinical_outcomes_student ON clinical_outcomes(student_id);
CREATE INDEX idx_clinical_outcomes_session ON clinical_outcomes(session_id);
CREATE INDEX idx_clinical_outcomes_type_date ON clinical_outcomes(outcome_type, measurement_date);

-- Row Level Security Policies
ALTER TABLE predictive_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;  
ALTER TABLE operational_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_outcomes ENABLE ROW LEVEL SECURITY;

-- Predictive Analytics RLS Policies
CREATE POLICY "Users can view predictive analytics for their authorized students" ON predictive_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = predictive_analytics.student_id
            AND (
                auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
                OR auth.uid() IN (SELECT therapist_id FROM therapy_sessions WHERE student_id = s.id)
            )
        )
    );

CREATE POLICY "Admins and managers can insert predictive analytics" ON predictive_analytics
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Risk Assessments RLS Policies  
CREATE POLICY "Users can view risk assessments for their authorized students" ON risk_assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = risk_assessments.student_id
            AND (
                auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
                OR auth.uid() IN (SELECT therapist_id FROM therapy_sessions WHERE student_id = s.id)
            )
        )
    );

CREATE POLICY "Admins and managers can insert risk assessments" ON risk_assessments
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Operational Forecasts RLS Policies
CREATE POLICY "Admins and managers can view operational forecasts" ON operational_forecasts
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

CREATE POLICY "Admins can insert operational forecasts" ON operational_forecasts
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    );

-- Prediction Accuracy RLS Policies
CREATE POLICY "Authorized users can view prediction accuracy" ON prediction_accuracy
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager', 'therapist_lead'))
    );

CREATE POLICY "Authorized users can insert prediction accuracy" ON prediction_accuracy
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager', 'therapist_lead'))
    );

-- Clinical Outcomes RLS Policies
CREATE POLICY "Users can view clinical outcomes for their authorized students" ON clinical_outcomes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = clinical_outcomes.student_id
            AND (
                auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
                OR auth.uid() IN (SELECT therapist_id FROM therapy_sessions WHERE student_id = s.id)
            )
        )
    );

CREATE POLICY "Therapists can insert clinical outcomes for their students" ON clinical_outcomes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM therapy_sessions ts
            WHERE ts.student_id = clinical_outcomes.student_id
            AND ts.therapist_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Data Cleanup Function for Expired Predictions
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS void AS $$
BEGIN
    DELETE FROM predictive_analytics WHERE expires_at < NOW();
    DELETE FROM risk_assessments WHERE expires_at < NOW();
    DELETE FROM operational_forecasts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
SELECT cron.schedule('cleanup-expired-predictions', '0 2 * * *', 'SELECT cleanup_expired_predictions();');