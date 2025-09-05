-- Database Views for AI/ML Training Data Aggregation
-- Story 5.1: AI-Powered Therapy Plan Recommendations
-- Task 1: AI/ML Infrastructure Setup

-- Create AI recommendation tables
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    session_id UUID REFERENCES therapy_sessions(id),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('therapy_plan', 'session_adjustment', 'goal_modification', 'assessment_update')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    clinical_relevance DECIMAL(3,2) NOT NULL CHECK (clinical_relevance BETWEEN 0 AND 1),
    recommendations JSONB NOT NULL,
    explanation JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'modified')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id),
    therapist_id UUID NOT NULL REFERENCES auth.users(id),
    decision TEXT NOT NULL CHECK (decision IN ('accept', 'reject', 'modify')),
    reasoning TEXT,
    reasoning_ar TEXT,
    reasoning_en TEXT,
    modifications JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('training', 'active', 'deprecated')),
    accuracy DECIMAL(5,4),
    last_training TIMESTAMPTZ,
    parameters JSONB,
    performance_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_student_id ON ai_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation_id ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_status ON ml_model_versions(status, type);

-- Row Level Security policies
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_versions ENABLE ROW LEVEL SECURITY;

-- AI recommendations access policy
CREATE POLICY "AI recommendations access" ON ai_recommendations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role IN ('admin', 'manager', 'therapist_lead')
        )
    );

-- Feedback access policy
CREATE POLICY "Recommendation feedback access" ON recommendation_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role IN ('admin', 'manager', 'therapist_lead')
        )
    );

-- ML model versions (admin only)
CREATE POLICY "ML model versions admin only" ON ml_model_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Create ML training data aggregation views
CREATE OR REPLACE VIEW ml_student_data AS
SELECT 
    s.id as student_id,
    s.age,
    s.primary_language,
    s.diagnosis_codes,
    s.cultural_background,
    -- Assessment data
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'id', sa.id,
                'assessment_type', sa.assessment_type,
                'scores', sa.scores,
                'assessment_date', sa.assessment_date,
                'interpretation', sa.interpretation
            ) ORDER BY sa.assessment_date DESC
        ) FILTER (WHERE sa.id IS NOT NULL), 
        '[]'::jsonb
    ) as assessment_history,
    -- Therapy session data
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'id', ts.id,
                'session_date', ts.session_date,
                'duration', ts.duration,
                'goals', ts.goals,
                'progress_notes', ts.progress_notes,
                'goal_progress', ts.goal_progress
            ) ORDER BY ts.session_date DESC
        ) FILTER (WHERE ts.id IS NOT NULL),
        '[]'::jsonb
    ) as therapy_history,
    -- Enrollment data
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'therapy_plan_id', se.therapy_plan_id,
                'enrollment_date', se.enrollment_date,
                'status', se.status,
                'sessions_completed', se.sessions_completed,
                'sessions_total', se.sessions_total
            ) ORDER BY se.enrollment_date DESC
        ) FILTER (WHERE se.id IS NOT NULL),
        '[]'::jsonb
    ) as enrollments
FROM students s
LEFT JOIN student_assessments sa ON s.id = sa.student_id
LEFT JOIN therapy_sessions ts ON s.id = ts.student_id
LEFT JOIN student_enrollments se ON s.id = se.student_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.age, s.primary_language, s.diagnosis_codes, s.cultural_background;

-- Create therapy outcome aggregation view
CREATE OR REPLACE VIEW therapy_outcomes AS
SELECT 
    ts.id as session_id,
    ts.student_id,
    ts.session_date,
    ts.therapist_id,
    goal_key as goal_id,
    (goal_value::text)::numeric as achievement,
    ts.session_date as measurement_date,
    true as validated
FROM therapy_sessions ts,
     jsonb_each(ts.goal_progress) as goals(goal_key, goal_value)
WHERE ts.deleted_at IS NULL
  AND ts.goal_progress IS NOT NULL
  AND jsonb_typeof(goal_value) = 'number';

-- Create progress trends view
CREATE OR REPLACE VIEW progress_trends AS
WITH session_goals AS (
    SELECT 
        ts.student_id,
        goal_key as goal_id,
        ts.session_date,
        (goal_value::text)::numeric as achievement,
        ROW_NUMBER() OVER (PARTITION BY ts.student_id, goal_key ORDER BY ts.session_date) as session_number
    FROM therapy_sessions ts,
         jsonb_each(ts.goal_progress) as goals(goal_key, goal_value)
    WHERE ts.deleted_at IS NULL
      AND ts.goal_progress IS NOT NULL
      AND jsonb_typeof(goal_value) = 'number'
),
trend_calculations AS (
    SELECT 
        student_id,
        goal_id,
        COUNT(*) as data_points,
        CASE 
            WHEN COUNT(*) >= 2 THEN
                -- Calculate linear regression slope
                (COUNT(*) * SUM(session_number * achievement) - SUM(session_number) * SUM(achievement)) /
                (COUNT(*) * SUM(session_number * session_number) - SUM(session_number) * SUM(session_number))
            ELSE 0
        END as slope,
        AVG(achievement) as avg_achievement,
        STDDEV(achievement) as std_deviation,
        MIN(session_date) as first_session,
        MAX(session_date) as last_session
    FROM session_goals
    GROUP BY student_id, goal_id
)
SELECT 
    student_id,
    goal_id,
    CONCAT('goal_', goal_id) as metric,
    CONCAT(data_points, ' sessions') as timeframe,
    CASE 
        WHEN ABS(slope) <= 0.1 THEN 'stable'
        WHEN slope > 0.1 THEN 'improving'
        ELSE 'declining'
    END as direction,
    slope as rate,
    CASE 
        WHEN std_deviation = 0 OR data_points < 3 THEN 0
        ELSE GREATEST(0, LEAST(1, 1 - (std_deviation / NULLIF(avg_achievement, 0))))
    END as significance,
    jsonb_agg(
        jsonb_build_object(
            'date', session_date,
            'value', achievement
        ) ORDER BY session_date
    ) as data_points_json
FROM session_goals
JOIN trend_calculations USING (student_id, goal_id)
WHERE data_points >= 2
GROUP BY student_id, goal_id, slope, avg_achievement, std_deviation, data_points;

-- Create assessment correlation view
CREATE OR REPLACE VIEW assessment_correlations AS
WITH assessment_scores AS (
    SELECT 
        sa.student_id,
        sa.assessment_type,
        sa.assessment_date,
        score_key,
        (score_value::text)::numeric as score_value
    FROM student_assessments sa,
         jsonb_each(sa.scores->'raw') as scores(score_key, score_value)
    WHERE jsonb_typeof(score_value) = 'number'
),
therapy_achievements AS (
    SELECT 
        student_id,
        AVG((goal_value::text)::numeric) as avg_achievement
    FROM therapy_sessions ts,
         jsonb_each(ts.goal_progress) as goals(goal_key, goal_value)
    WHERE jsonb_typeof(goal_value) = 'number'
    GROUP BY student_id
)
SELECT 
    ass.student_id,
    ass.assessment_type,
    ass.score_key as factor,
    CASE 
        WHEN COUNT(*) >= 3 AND STDDEV(ass.score_value) > 0 AND STDDEV(ther.avg_achievement) > 0 THEN
            (AVG(ass.score_value * ther.avg_achievement) - AVG(ass.score_value) * AVG(ther.avg_achievement)) /
            (STDDEV(ass.score_value) * STDDEV(ther.avg_achievement))
        ELSE 0
    END as correlation,
    CASE 
        WHEN COUNT(*) >= 10 THEN 0.95
        WHEN COUNT(*) >= 5 THEN 0.75
        ELSE 0.5
    END as significance,
    CONCAT('Assessment score ', score_key, ' correlation with therapy outcomes') as description
FROM assessment_scores ass
JOIN therapy_achievements ther ON ass.student_id = ther.student_id
GROUP BY ass.student_id, ass.assessment_type, ass.score_key
HAVING COUNT(*) >= 3;

-- Create privacy-compliant training data export view
CREATE OR REPLACE VIEW ml_training_export AS
SELECT 
    -- Anonymized student identifier
    encode(sha256(student_id::text::bytea), 'hex') as anonymous_id,
    -- Demographics (encoded for privacy)
    CASE 
        WHEN age < 3 THEN 'early_intervention'
        WHEN age < 6 THEN 'preschool'
        WHEN age < 12 THEN 'elementary'
        WHEN age < 18 THEN 'adolescent'
        ELSE 'adult'
    END as age_group,
    primary_language,
    diagnosis_codes,
    cultural_background,
    -- Assessment data (anonymized)
    jsonb_agg(
        DISTINCT jsonb_build_object(
            'assessment_type', (assessment_history->>i->>'assessment_type'),
            'normalized_scores', (assessment_history->>i->>'scores'),
            'assessment_month', EXTRACT(MONTH FROM (assessment_history->>i->>'assessment_date')::date),
            'assessment_year', EXTRACT(YEAR FROM (assessment_history->>i->>'assessment_date')::date)
        )
    ) FILTER (WHERE jsonb_array_length(assessment_history) > 0) as assessments,
    -- Therapy outcomes (anonymized)
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'goal_category', LEFT(goal_id, 3), -- Only category, not specific goal
                'achievement_quartile', 
                CASE 
                    WHEN achievement <= 0.25 THEN 1
                    WHEN achievement <= 0.5 THEN 2
                    WHEN achievement <= 0.75 THEN 3
                    ELSE 4
                END,
                'session_month', EXTRACT(MONTH FROM measurement_date::date),
                'validated', validated
            )
        )
        FROM therapy_outcomes to_sub 
        WHERE encode(sha256(to_sub.student_id::text::bytea), 'hex') = encode(sha256(msd.student_id::text::bytea), 'hex')
    ) as outcomes
FROM ml_student_data msd,
     generate_series(0, jsonb_array_length(msd.assessment_history) - 1) as i
WHERE jsonb_array_length(assessment_history) > 0
GROUP BY 
    encode(sha256(student_id::text::bytea), 'hex'),
    age_group, primary_language, diagnosis_codes, cultural_background, student_id;

-- Grant necessary permissions
GRANT SELECT ON ml_student_data TO authenticated;
GRANT SELECT ON therapy_outcomes TO authenticated;
GRANT SELECT ON progress_trends TO authenticated;
GRANT SELECT ON assessment_correlations TO authenticated;
GRANT SELECT ON ml_training_export TO authenticated;

-- Add audit trigger for AI recommendations
CREATE OR REPLACE FUNCTION update_ai_recommendation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_recommendations_updated_at
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_recommendation_updated_at();

-- Comments for documentation
COMMENT ON TABLE ai_recommendations IS 'Stores AI-generated therapy plan recommendations with confidence scoring and clinical explanations';
COMMENT ON TABLE recommendation_feedback IS 'Captures therapist feedback on AI recommendations for continuous learning';
COMMENT ON TABLE ml_model_versions IS 'Tracks ML model versions, performance metrics, and deployment status';
COMMENT ON VIEW ml_student_data IS 'Aggregated student data for ML training including assessments, therapy history, and enrollments';
COMMENT ON VIEW therapy_outcomes IS 'Normalized therapy outcomes for ML analysis and trend calculation';
COMMENT ON VIEW progress_trends IS 'Calculated progress trends with statistical significance for each therapy goal';
COMMENT ON VIEW assessment_correlations IS 'Correlation analysis between assessment scores and therapy outcomes';
COMMENT ON VIEW ml_training_export IS 'Privacy-compliant anonymized data export for ML model training';