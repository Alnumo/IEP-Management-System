-- =====================================================
-- Schedule Optimization Indexes and Performance Enhancements
-- Story 3.1: Automated Scheduling Engine
-- =====================================================

-- =====================================================
-- Advanced Indexes for Schedule Generation Algorithms
-- =====================================================

-- Composite indexes for common scheduling queries
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_composite_search 
    ON scheduled_sessions(therapist_id, scheduled_date, start_time, status)
    WHERE status IN ('scheduled', 'confirmed');

-- Index for finding available time slots
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_time_slots 
    ON scheduled_sessions(scheduled_date, start_time, end_time)
    INCLUDE (therapist_id, status, duration_minutes);

-- Index for conflict detection queries  
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_conflict_detection
    ON scheduled_sessions(therapist_id, scheduled_date)
    INCLUDE (start_time, end_time, status)
    WHERE status NOT IN ('cancelled', 'no_show');

-- Partial index for active sessions requiring optimization
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_optimization
    ON scheduled_sessions(optimization_score, therapist_id, scheduled_date)
    WHERE optimization_score < 80 AND status = 'scheduled';

-- Index for rescheduling operations
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_reschedule_tracking
    ON scheduled_sessions(original_session_id, reschedule_count)
    WHERE reschedule_count > 0;

-- =====================================================
-- Therapist Availability Optimization Indexes
-- =====================================================

-- Composite index for availability lookup during scheduling
CREATE INDEX IF NOT EXISTS idx_therapist_availability_scheduling_lookup
    ON therapist_availability(therapist_id, is_available, day_of_week, start_time)
    WHERE is_time_off = false;

-- Index for specific date overrides
CREATE INDEX IF NOT EXISTS idx_therapist_availability_date_overrides
    ON therapist_availability(therapist_id, specific_date, is_available)
    WHERE specific_date IS NOT NULL;

-- Index for capacity-based scheduling
CREATE INDEX IF NOT EXISTS idx_therapist_availability_capacity
    ON therapist_availability(therapist_id, max_sessions_per_slot, current_bookings)
    WHERE (max_sessions_per_slot - current_bookings) > 0;

-- =====================================================
-- Schedule Template Optimization Indexes
-- =====================================================

-- Index for template matching during schedule generation
CREATE INDEX IF NOT EXISTS idx_schedule_templates_matching
    ON schedule_templates(template_type, is_active, session_duration, sessions_per_week);

-- Index for therapist-specific templates
CREATE INDEX IF NOT EXISTS idx_schedule_templates_therapist_specific
    ON schedule_templates(preferred_therapist_id, is_active)
    WHERE preferred_therapist_id IS NOT NULL;

-- GIN index for pattern configuration searches
CREATE INDEX IF NOT EXISTS idx_schedule_templates_pattern_config
    ON schedule_templates USING GIN (pattern_config)
    WHERE is_active = true;

-- =====================================================
-- Conflict Resolution Indexes
-- =====================================================

-- Index for active conflicts requiring resolution
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_active
    ON schedule_conflicts(resolution_status, conflict_type, severity, detected_at)
    WHERE resolution_status IN ('pending', 'in_progress');

-- Index for conflict history and analytics
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_analytics
    ON schedule_conflicts(conflict_type, severity, detected_at DESC)
    INCLUDE (resolution_status, resolved_at);

-- =====================================================
-- Student Subscription Scheduling Indexes  
-- =====================================================

-- Index for active subscriptions needing scheduling
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_active_scheduling
    ON student_subscriptions(is_active, start_date, end_date)
    WHERE is_active = true AND end_date >= CURRENT_DATE;

-- Index for freeze status tracking
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_freeze_status
    ON student_subscriptions(freeze_days_used, freeze_days_allowed)
    WHERE freeze_days_used < freeze_days_allowed;

-- =====================================================
-- Performance Views for Common Scheduling Queries
-- =====================================================

-- View for therapist weekly availability summary
CREATE OR REPLACE VIEW weekly_therapist_availability AS
SELECT 
    ta.therapist_id,
    ta.day_of_week,
    ta.start_time,
    ta.end_time,
    ta.max_sessions_per_slot,
    ta.current_bookings,
    (ta.max_sessions_per_slot - ta.current_bookings) as available_slots,
    EXTRACT(EPOCH FROM (ta.end_time - ta.start_time))/60 as duration_minutes,
    t.name_en as therapist_name,
    t.name_ar as therapist_name_ar,
    tsp.max_sessions_per_day,
    tsp.flexibility_score
FROM therapist_availability ta
JOIN therapists t ON ta.therapist_id = t.id
LEFT JOIN therapist_schedule_preferences tsp ON ta.therapist_id = tsp.therapist_id
WHERE ta.is_recurring = true 
AND ta.is_available = true 
AND ta.is_time_off = false
AND t.is_active = true;

-- Index for the view
CREATE INDEX IF NOT EXISTS idx_weekly_availability_lookup
    ON therapist_availability(therapist_id, day_of_week, start_time)
    WHERE is_recurring = true AND is_available = true AND is_time_off = false;

-- View for daily scheduling conflicts
CREATE OR REPLACE VIEW daily_scheduling_conflicts AS
SELECT 
    ss.scheduled_date,
    ss.therapist_id,
    t.name_en as therapist_name,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE ss.has_conflicts = true) as conflicted_sessions,
    ARRAY_AGG(ss.id) FILTER (WHERE ss.has_conflicts = true) as conflict_session_ids,
    MIN(ss.start_time) as earliest_session,
    MAX(ss.end_time) as latest_session,
    SUM(ss.duration_minutes) as total_minutes
FROM scheduled_sessions ss
JOIN therapists t ON ss.therapist_id = t.id
WHERE ss.scheduled_date >= CURRENT_DATE
AND ss.status IN ('scheduled', 'confirmed')
GROUP BY ss.scheduled_date, ss.therapist_id, t.name_en
HAVING COUNT(*) FILTER (WHERE ss.has_conflicts = true) > 0
ORDER BY ss.scheduled_date, COUNT(*) FILTER (WHERE ss.has_conflicts = true) DESC;

-- =====================================================
-- Stored Procedures for Optimization
-- =====================================================

-- Function to find optimal time slots for scheduling
CREATE OR REPLACE FUNCTION find_optimal_time_slots(
    p_therapist_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_duration_minutes INTEGER,
    p_sessions_needed INTEGER DEFAULT 1
) RETURNS TABLE (
    suggested_date DATE,
    suggested_start_time TIME,
    suggested_end_time TIME,
    confidence_score INTEGER,
    conflicts INTEGER,
    utilization_impact DECIMAL
) AS $$
DECLARE
    current_date DATE;
    day_of_week_num INTEGER;
    availability_record RECORD;
    existing_sessions_count INTEGER;
    gap_before INTEGER;
    gap_after INTEGER;
    score INTEGER;
BEGIN
    -- Loop through each date in the range
    current_date := p_start_date;
    
    WHILE current_date <= p_end_date LOOP
        day_of_week_num := EXTRACT(dow FROM current_date);
        
        -- Check therapist availability for this day
        FOR availability_record IN
            SELECT ta.start_time, ta.end_time, ta.max_sessions_per_slot, ta.current_bookings
            FROM therapist_availability ta
            WHERE ta.therapist_id = p_therapist_id
            AND (
                (ta.is_recurring = true AND ta.day_of_week = day_of_week_num) OR
                ta.specific_date = current_date
            )
            AND ta.is_available = true
            AND ta.is_time_off = false
            AND (ta.max_sessions_per_slot - ta.current_bookings) >= p_sessions_needed
            ORDER BY ta.start_time
        LOOP
            -- Check for existing sessions that might conflict
            SELECT COUNT(*)
            INTO existing_sessions_count
            FROM scheduled_sessions ss
            WHERE ss.therapist_id = p_therapist_id
            AND ss.scheduled_date = current_date
            AND ss.start_time < (availability_record.end_time)
            AND ss.end_time > availability_record.start_time
            AND ss.status IN ('scheduled', 'confirmed');
            
            -- Calculate confidence score based on various factors
            score := 100;
            
            -- Reduce score for conflicts
            score := score - (existing_sessions_count * 20);
            
            -- Calculate gaps and adjust score
            SELECT 
                COALESCE(EXTRACT(EPOCH FROM (availability_record.start_time - MAX(ss.end_time)))/60, 60),
                COALESCE(EXTRACT(EPOCH FROM (MIN(ss.start_time) - availability_record.end_time))/60, 60)
            INTO gap_before, gap_after
            FROM scheduled_sessions ss
            WHERE ss.therapist_id = p_therapist_id
            AND ss.scheduled_date = current_date
            AND ss.status IN ('scheduled', 'confirmed');
            
            -- Prefer slots with reasonable gaps
            IF gap_before BETWEEN 15 AND 30 THEN score := score + 10; END IF;
            IF gap_after BETWEEN 15 AND 30 THEN score := score + 10; END IF;
            
            -- Ensure minimum score
            score := GREATEST(score, 0);
            
            -- Return the suggestion if score is reasonable
            IF score >= 30 THEN
                suggested_date := current_date;
                suggested_start_time := availability_record.start_time;
                suggested_end_time := (availability_record.start_time::TIME + INTERVAL '1 minute' * p_duration_minutes)::TIME;
                confidence_score := score;
                conflicts := existing_sessions_count;
                utilization_impact := (existing_sessions_count + p_sessions_needed)::DECIMAL / availability_record.max_sessions_per_slot * 100;
                
                RETURN NEXT;
            END IF;
        END LOOP;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate schedule optimization score
CREATE OR REPLACE FUNCTION calculate_schedule_optimization_score(
    p_therapist_id UUID,
    p_date DATE
) RETURNS DECIMAL AS $$
DECLARE
    total_sessions INTEGER;
    total_duration_minutes INTEGER;
    total_gaps_minutes INTEGER;
    back_to_back_count INTEGER;
    utilization_rate DECIMAL;
    efficiency_score DECIMAL;
    final_score DECIMAL;
BEGIN
    -- Get basic session metrics
    SELECT 
        COUNT(*),
        SUM(duration_minutes)
    INTO total_sessions, total_duration_minutes
    FROM scheduled_sessions
    WHERE therapist_id = p_therapist_id
    AND scheduled_date = p_date
    AND status IN ('scheduled', 'confirmed');
    
    -- If no sessions, return neutral score
    IF total_sessions = 0 THEN
        RETURN 50;
    END IF;
    
    -- Calculate gaps between sessions
    WITH session_gaps AS (
        SELECT 
            EXTRACT(EPOCH FROM (
                start_time - LAG(end_time) OVER (ORDER BY start_time)
            ))/60 as gap_minutes
        FROM scheduled_sessions
        WHERE therapist_id = p_therapist_id
        AND scheduled_date = p_date
        AND status IN ('scheduled', 'confirmed')
        ORDER BY start_time
    )
    SELECT 
        COALESCE(SUM(gap_minutes), 0),
        COUNT(*) FILTER (WHERE gap_minutes = 0)
    INTO total_gaps_minutes, back_to_back_count
    FROM session_gaps
    WHERE gap_minutes IS NOT NULL;
    
    -- Calculate utilization rate
    SELECT 
        CASE 
            WHEN SUM(EXTRACT(EPOCH FROM (end_time - start_time))/60) > 0
            THEN (total_duration_minutes / SUM(EXTRACT(EPOCH FROM (end_time - start_time))/60)) * 100
            ELSE 0
        END
    INTO utilization_rate
    FROM therapist_availability
    WHERE therapist_id = p_therapist_id
    AND (
        (is_recurring = true AND day_of_week = EXTRACT(dow FROM p_date)) OR
        specific_date = p_date
    )
    AND is_available = true;
    
    -- Calculate efficiency score
    efficiency_score := 100;
    
    -- Penalize excessive gaps (over 60 minutes total)
    IF total_gaps_minutes > 60 THEN
        efficiency_score := efficiency_score - ((total_gaps_minutes - 60) * 0.5);
    END IF;
    
    -- Bonus for reasonable number of back-to-back sessions
    IF back_to_back_count BETWEEN 1 AND 3 THEN
        efficiency_score := efficiency_score + 5;
    ELSIF back_to_back_count > 5 THEN
        efficiency_score := efficiency_score - 10;
    END IF;
    
    -- Combine utilization and efficiency
    final_score := (COALESCE(utilization_rate, 0) * 0.6) + (efficiency_score * 0.4);
    
    -- Ensure score is within bounds
    final_score := GREATEST(LEAST(final_score, 100), 0);
    
    RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Materialized View for Schedule Optimization Dashboard
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS schedule_optimization_summary AS
SELECT 
    ss.therapist_id,
    t.name_en as therapist_name,
    ss.scheduled_date,
    COUNT(*) as total_sessions,
    SUM(ss.duration_minutes) as total_duration_minutes,
    AVG(ss.optimization_score) as avg_optimization_score,
    COUNT(*) FILTER (WHERE ss.has_conflicts = true) as conflicted_sessions,
    COUNT(*) FILTER (WHERE ss.status = 'cancelled') as cancelled_sessions,
    
    -- Time efficiency metrics
    MIN(ss.start_time) as first_session_start,
    MAX(ss.end_time) as last_session_end,
    EXTRACT(EPOCH FROM (MAX(ss.end_time) - MIN(ss.start_time)))/60 as working_span_minutes,
    
    -- Utilization metrics
    calculate_schedule_optimization_score(ss.therapist_id, ss.scheduled_date) as daily_optimization_score,
    
    -- Availability context
    (
        SELECT COUNT(*) 
        FROM therapist_availability ta 
        WHERE ta.therapist_id = ss.therapist_id 
        AND (
            (ta.is_recurring = true AND ta.day_of_week = EXTRACT(dow FROM ss.scheduled_date)) OR
            ta.specific_date = ss.scheduled_date
        )
        AND ta.is_available = true
    ) as available_slots,
    
    CURRENT_TIMESTAMP as last_updated
    
FROM scheduled_sessions ss
JOIN therapists t ON ss.therapist_id = t.id
WHERE ss.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
AND ss.status IN ('scheduled', 'confirmed', 'completed')
GROUP BY ss.therapist_id, t.name_en, ss.scheduled_date
ORDER BY ss.scheduled_date DESC, ss.therapist_id;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_optimization_summary_unique
    ON schedule_optimization_summary(therapist_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_optimization_summary_score
    ON schedule_optimization_summary(daily_optimization_score DESC, scheduled_date);

-- =====================================================
-- Automated Refresh Function for Materialized Views
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_scheduling_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_therapist_availability;
    REFRESH MATERIALIZED VIEW CONCURRENTLY schedule_optimization_summary;
    
    -- Log refresh
    INSERT INTO system_logs (log_level, message, created_at)
    VALUES ('INFO', 'Scheduling materialized views refreshed', now());
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    INSERT INTO system_logs (log_level, message, error_details, created_at)
    VALUES ('ERROR', 'Failed to refresh scheduling views', SQLERRM, now());
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Performance Analysis Functions
-- =====================================================

-- Function to analyze scheduling performance over time
CREATE OR REPLACE FUNCTION analyze_scheduling_performance(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    metric_name VARCHAR,
    metric_value DECIMAL,
    metric_unit VARCHAR,
    benchmark_value DECIMAL,
    status VARCHAR
) AS $$
BEGIN
    -- Overall utilization rate
    RETURN QUERY
    SELECT 
        'overall_utilization_rate'::VARCHAR,
        ROUND(AVG(daily_optimization_score), 2),
        'percentage'::VARCHAR,
        75.00::DECIMAL,
        CASE WHEN AVG(daily_optimization_score) >= 75 THEN 'good' ELSE 'needs_improvement' END::VARCHAR
    FROM schedule_optimization_summary
    WHERE scheduled_date BETWEEN p_start_date AND p_end_date;
    
    -- Average conflicts per day
    RETURN QUERY
    SELECT 
        'avg_conflicts_per_day'::VARCHAR,
        ROUND(AVG(conflicted_sessions), 2),
        'count'::VARCHAR,
        2.00::DECIMAL,
        CASE WHEN AVG(conflicted_sessions) <= 2 THEN 'good' ELSE 'needs_improvement' END::VARCHAR
    FROM schedule_optimization_summary
    WHERE scheduled_date BETWEEN p_start_date AND p_end_date;
    
    -- Schedule efficiency (sessions per working hour)
    RETURN QUERY
    SELECT 
        'schedule_efficiency'::VARCHAR,
        ROUND(AVG(total_sessions::DECIMAL / NULLIF(working_span_minutes/60, 0)), 2),
        'sessions_per_hour'::VARCHAR,
        1.50::DECIMAL,
        CASE WHEN AVG(total_sessions::DECIMAL / NULLIF(working_span_minutes/60, 0)) >= 1.5 THEN 'good' ELSE 'needs_improvement' END::VARCHAR
    FROM schedule_optimization_summary
    WHERE scheduled_date BETWEEN p_start_date AND p_end_date
    AND working_span_minutes > 0;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION find_optimal_time_slots IS 'Find optimal scheduling slots for a therapist within a date range with confidence scoring';
COMMENT ON FUNCTION calculate_schedule_optimization_score IS 'Calculate comprehensive optimization score for a therapist schedule on a specific date';
COMMENT ON MATERIALIZED VIEW schedule_optimization_summary IS 'Daily scheduling performance metrics and optimization scores for all therapists';
COMMENT ON FUNCTION analyze_scheduling_performance IS 'Analyze overall scheduling system performance metrics over a specified time period';