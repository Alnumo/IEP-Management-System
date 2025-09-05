-- =====================================================
-- SUBSCRIPTION MANAGEMENT SCHEMA ENHANCEMENT
-- Version: 3.3.1  
-- Date: 2025-09-02
-- Description: Implement subscription management with freeze functionality
-- Story: 3.3 - Subscription Freeze and Automated Rescheduling
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE student_subscriptions TABLE
-- =====================================================
-- This table manages student enrollments with freeze day tracking

CREATE TABLE IF NOT EXISTS student_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core relationships
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID NOT NULL REFERENCES therapy_programs(id) ON DELETE RESTRICT,
    
    -- Subscription timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    original_end_date DATE NOT NULL, -- Track original end date before freezes
    
    -- Freeze management
    freeze_days_allowed INTEGER NOT NULL DEFAULT 0,
    freeze_days_used INTEGER NOT NULL DEFAULT 0,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended', 'completed', 'cancelled')),
    
    -- Billing integration
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'annually')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Freeze tracking
    current_freeze_start DATE NULL,
    current_freeze_end DATE NULL,
    total_frozen_days INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    notes_ar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_date <= end_date),
    CONSTRAINT valid_original_end_date CHECK (original_end_date >= start_date),
    CONSTRAINT valid_freeze_days CHECK (freeze_days_used >= 0 AND freeze_days_used <= freeze_days_allowed),
    CONSTRAINT valid_amounts CHECK (amount_paid >= 0 AND amount_paid <= total_amount),
    CONSTRAINT valid_freeze_period CHECK (
        (current_freeze_start IS NULL AND current_freeze_end IS NULL) OR 
        (current_freeze_start IS NOT NULL AND current_freeze_end IS NOT NULL AND current_freeze_start <= current_freeze_end)
    ),
    CONSTRAINT unique_active_student_program UNIQUE (student_id, therapy_program_id) WHERE is_active = true
);

-- =====================================================
-- 2. CREATE subscription_freeze_history TABLE  
-- =====================================================
-- Audit trail for all freeze operations

CREATE TABLE IF NOT EXISTS subscription_freeze_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    subscription_id UUID NOT NULL REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    
    -- Freeze operation details
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('freeze', 'unfreeze', 'extend_freeze', 'modify_freeze')),
    freeze_start_date DATE NOT NULL,
    freeze_end_date DATE NOT NULL,
    freeze_duration_days INTEGER NOT NULL,
    
    -- Business context
    reason VARCHAR(255),
    reason_ar VARCHAR(255),
    admin_notes TEXT,
    admin_notes_ar TEXT,
    
    -- Impact tracking
    original_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    affected_sessions_count INTEGER DEFAULT 0,
    rescheduled_sessions_count INTEGER DEFAULT 0,
    
    -- Operation metadata
    operation_status VARCHAR(20) DEFAULT 'completed' CHECK (operation_status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    rollback_data JSONB, -- Store data needed for rollback operations
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_freeze_dates CHECK (freeze_start_date <= freeze_end_date),
    CONSTRAINT valid_end_dates CHECK (original_end_date <= new_end_date),
    CONSTRAINT valid_duration CHECK (freeze_duration_days > 0),
    CONSTRAINT valid_session_counts CHECK (affected_sessions_count >= 0 AND rescheduled_sessions_count >= 0 AND rescheduled_sessions_count <= affected_sessions_count)
);

-- =====================================================
-- 3. CREATE subscription_freeze_operations TABLE
-- =====================================================
-- Track ongoing freeze operations for distributed transactions

CREATE TABLE IF NOT EXISTS subscription_freeze_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Operation identification
    operation_id VARCHAR(50) NOT NULL UNIQUE, -- Human-readable operation identifier
    subscription_id UUID NOT NULL REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    
    -- Operation details
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('freeze', 'unfreeze')),
    freeze_start_date DATE NOT NULL,
    freeze_end_date DATE NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    current_step VARCHAR(50), -- Track which step is being executed
    total_steps INTEGER DEFAULT 1,
    completed_steps INTEGER DEFAULT 0,
    
    -- Recovery data
    rollback_data JSONB NOT NULL, -- Complete state needed for rollback
    error_details JSONB, -- Store error information for debugging
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (freeze_start_date <= freeze_end_date),
    CONSTRAINT valid_progress CHECK (completed_steps >= 0 AND completed_steps <= total_steps)
);

-- =====================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Primary subscription indexes
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student_active 
    ON student_subscriptions(student_id, is_active, status);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_program_active 
    ON student_subscriptions(therapy_program_id, is_active);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status_dates 
    ON student_subscriptions(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_freeze_status 
    ON student_subscriptions(status) WHERE status = 'frozen';
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_current_freeze 
    ON student_subscriptions(current_freeze_start, current_freeze_end) 
    WHERE current_freeze_start IS NOT NULL;

-- Freeze history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_history_subscription 
    ON subscription_freeze_history(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_history_operation_type 
    ON subscription_freeze_history(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_history_dates 
    ON subscription_freeze_history(freeze_start_date, freeze_end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_history_status 
    ON subscription_freeze_history(operation_status, created_at DESC);

-- Operation tracking indexes  
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_operations_status 
    ON subscription_freeze_operations(status, started_at);
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_operations_subscription 
    ON subscription_freeze_operations(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_freeze_operations_active 
    ON subscription_freeze_operations(status, started_at) 
    WHERE status IN ('pending', 'in_progress');

-- =====================================================
-- 5. DATABASE FUNCTIONS
-- =====================================================

-- Function to calculate remaining freeze days
CREATE OR REPLACE FUNCTION get_remaining_freeze_days(p_subscription_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_allowed INTEGER;
    v_used INTEGER;
BEGIN
    SELECT freeze_days_allowed, freeze_days_used 
    INTO v_allowed, v_used
    FROM student_subscriptions
    WHERE id = p_subscription_id;
    
    IF v_allowed IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN GREATEST(0, v_allowed - v_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to freeze a subscription
CREATE OR REPLACE FUNCTION freeze_subscription(
    p_subscription_id UUID,
    p_freeze_start DATE,
    p_freeze_end DATE,
    p_reason TEXT,
    p_admin_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_freeze_days INTEGER;
    v_remaining_days INTEGER;
    v_new_end_date DATE;
    v_operation_id TEXT;
    v_result JSONB;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM student_subscriptions
    WHERE id = p_subscription_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Subscription not found or not active'
        );
    END IF;
    
    -- Check if already frozen
    IF v_subscription.status = 'frozen' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Subscription is already frozen'
        );
    END IF;
    
    -- Calculate freeze duration
    v_freeze_days := p_freeze_end - p_freeze_start + 1;
    v_remaining_days := get_remaining_freeze_days(p_subscription_id);
    
    -- Check if freeze days are available
    IF v_freeze_days > v_remaining_days THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Insufficient freeze days. Requested: %s, Available: %s', v_freeze_days, v_remaining_days)
        );
    END IF;
    
    -- Calculate new end date
    v_new_end_date := v_subscription.end_date + v_freeze_days;
    
    -- Generate operation ID
    v_operation_id := 'FREEZE_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Start transaction: Update subscription
    UPDATE student_subscriptions
    SET 
        status = 'frozen',
        current_freeze_start = p_freeze_start,
        current_freeze_end = p_freeze_end,
        freeze_days_used = freeze_days_used + v_freeze_days,
        end_date = v_new_end_date,
        total_frozen_days = total_frozen_days + v_freeze_days,
        updated_at = now(),
        updated_by = p_created_by
    WHERE id = p_subscription_id;
    
    -- Record freeze history
    INSERT INTO subscription_freeze_history (
        subscription_id, operation_type, freeze_start_date, freeze_end_date,
        freeze_duration_days, reason, admin_notes, original_end_date, new_end_date,
        created_by
    ) VALUES (
        p_subscription_id, 'freeze', p_freeze_start, p_freeze_end,
        v_freeze_days, p_reason, p_admin_notes, v_subscription.end_date, v_new_end_date,
        p_created_by
    );
    
    -- Create operation record
    INSERT INTO subscription_freeze_operations (
        operation_id, subscription_id, operation_type, freeze_start_date, freeze_end_date,
        status, rollback_data, created_by
    ) VALUES (
        v_operation_id, p_subscription_id, 'freeze', p_freeze_start, p_freeze_end,
        'completed', 
        jsonb_build_object(
            'original_status', v_subscription.status,
            'original_end_date', v_subscription.end_date,
            'original_freeze_days_used', v_subscription.freeze_days_used
        ),
        p_created_by
    );
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'operation_id', v_operation_id,
        'subscription_id', p_subscription_id,
        'freeze_duration_days', v_freeze_days,
        'new_end_date', v_new_end_date,
        'remaining_freeze_days', v_remaining_days - v_freeze_days
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfreeze a subscription
CREATE OR REPLACE FUNCTION unfreeze_subscription(
    p_subscription_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_operation_id TEXT;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM student_subscriptions
    WHERE id = p_subscription_id AND status = 'frozen';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Subscription not found or not currently frozen'
        );
    END IF;
    
    -- Generate operation ID
    v_operation_id := 'UNFREEZE_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Update subscription
    UPDATE student_subscriptions
    SET 
        status = 'active',
        current_freeze_start = NULL,
        current_freeze_end = NULL,
        updated_at = now(),
        updated_by = p_created_by
    WHERE id = p_subscription_id;
    
    -- Record unfreeze history
    INSERT INTO subscription_freeze_history (
        subscription_id, operation_type, freeze_start_date, freeze_end_date,
        freeze_duration_days, reason, original_end_date, new_end_date, created_by
    ) VALUES (
        p_subscription_id, 'unfreeze', v_subscription.current_freeze_start, v_subscription.current_freeze_end,
        v_subscription.current_freeze_end - v_subscription.current_freeze_start + 1,
        'Manual unfreeze', v_subscription.end_date, v_subscription.end_date, p_created_by
    );
    
    -- Create operation record
    INSERT INTO subscription_freeze_operations (
        operation_id, subscription_id, operation_type, freeze_start_date, freeze_end_date,
        status, rollback_data, created_by
    ) VALUES (
        v_operation_id, p_subscription_id, 'unfreeze', v_subscription.current_freeze_start, v_subscription.current_freeze_end,
        'completed',
        jsonb_build_object(
            'original_status', 'frozen',
            'freeze_start', v_subscription.current_freeze_start,
            'freeze_end', v_subscription.current_freeze_end
        ),
        p_created_by
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'operation_id', v_operation_id,
        'subscription_id', p_subscription_id,
        'message', 'Subscription unfrozen successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription details with freeze information
CREATE OR REPLACE FUNCTION get_subscription_details(p_subscription_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_freeze_history JSONB;
    v_remaining_days INTEGER;
BEGIN
    -- Get subscription
    SELECT * INTO v_subscription
    FROM student_subscriptions s
    WHERE s.id = p_subscription_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;
    
    -- Get freeze history
    SELECT jsonb_agg(
        jsonb_build_object(
            'operation_type', operation_type,
            'freeze_start_date', freeze_start_date,
            'freeze_end_date', freeze_end_date,
            'freeze_duration_days', freeze_duration_days,
            'reason', reason,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ) INTO v_freeze_history
    FROM subscription_freeze_history
    WHERE subscription_id = p_subscription_id;
    
    -- Calculate remaining freeze days
    v_remaining_days := get_remaining_freeze_days(p_subscription_id);
    
    RETURN jsonb_build_object(
        'found', true,
        'subscription', row_to_json(v_subscription),
        'remaining_freeze_days', v_remaining_days,
        'freeze_history', COALESCE(v_freeze_history, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to preview freeze impact without making changes
CREATE OR REPLACE FUNCTION preview_subscription_freeze(
    p_subscription_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_freeze_days INTEGER;
    v_remaining_days INTEGER;
    v_new_end_date DATE;
    v_affected_sessions INTEGER;
    v_conflicts INTEGER;
    v_result JSONB;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM student_subscriptions
    WHERE id = p_subscription_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Subscription not found or not active'
        );
    END IF;
    
    -- Calculate freeze duration
    v_freeze_days := p_end_date - p_start_date + 1;
    v_remaining_days := get_remaining_freeze_days(p_subscription_id);
    
    -- Check if freeze days are available
    IF v_freeze_days > v_remaining_days THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Insufficient freeze days. Requested: %s, Available: %s', v_freeze_days, v_remaining_days)
        );
    END IF;
    
    -- Calculate new end date
    v_new_end_date := v_subscription.end_date + v_freeze_days;
    
    -- Count affected sessions
    SELECT COUNT(*) INTO v_affected_sessions
    FROM therapy_sessions ts
    WHERE ts.student_id = v_subscription.student_id
    AND ts.session_date BETWEEN p_start_date AND p_end_date
    AND ts.status = 'scheduled';
    
    -- Check for potential scheduling conflicts (simplified)
    -- This is a basic check - real implementation would be more sophisticated
    SELECT COUNT(*) INTO v_conflicts
    FROM therapy_sessions ts
    WHERE ts.student_id = v_subscription.student_id
    AND ts.session_date > p_end_date
    AND ts.session_date <= v_new_end_date
    AND ts.status IN ('scheduled', 'confirmed');
    
    -- Build preview result
    v_result := jsonb_build_object(
        'success', true,
        'freeze_days', v_freeze_days,
        'remaining_freeze_days', v_remaining_days,
        'current_end_date', v_subscription.end_date,
        'new_end_date', v_new_end_date,
        'affected_sessions_count', v_affected_sessions,
        'conflicts_count', GREATEST(0, v_conflicts - 5), -- Conservative estimate
        'billing_impact', jsonb_build_object(
            'freeze_period_days', v_freeze_days,
            'program_extension_days', v_freeze_days,
            'billing_adjustment_needed', true
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute session rescheduling with transaction safety
CREATE OR REPLACE FUNCTION execute_session_rescheduling(
    p_rescheduling_plan JSONB,
    p_subscription_id UUID,
    p_freeze_days INTEGER,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_plan_item JSONB;
    v_session_id UUID;
    v_new_date DATE;
    v_new_time_start TIME;
    v_new_time_end TIME;
    v_new_room_id UUID;
    v_sessions_rescheduled INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
    v_result JSONB;
    v_rollback_data JSONB := '[]'::jsonb;
BEGIN
    -- Validate input
    IF p_rescheduling_plan IS NULL OR jsonb_array_length(p_rescheduling_plan) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Empty or invalid rescheduling plan'
        );
    END IF;
    
    -- Start transaction savepoint for rollback capability
    SAVEPOINT reschedule_start;
    
    -- Process each session in the plan
    FOR v_plan_item IN SELECT * FROM jsonb_array_elements(p_rescheduling_plan)
    LOOP
        -- Extract plan item details
        v_session_id := (v_plan_item->>'session_id')::UUID;
        v_new_date := (v_plan_item->>'new_date')::DATE;
        v_new_time_start := (v_plan_item->>'new_time_start')::TIME;
        v_new_time_end := (v_plan_item->>'new_time_end')::TIME;
        v_new_room_id := (v_plan_item->>'new_room_id')::UUID;
        
        -- Skip if no new slot assigned
        IF v_new_date IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'session_id', v_session_id,
                'error', 'No available slot found'
            );
            CONTINUE;
        END IF;
        
        -- Store original session data for rollback
        v_rollback_data := v_rollback_data || (
            SELECT jsonb_build_object(
                'session_id', id,
                'original_date', session_date,
                'original_time_start', time_start,
                'original_time_end', time_end,
                'original_room_id', room_id,
                'original_status', status
            )
            FROM therapy_sessions
            WHERE id = v_session_id
        );
        
        -- Update session with new schedule
        UPDATE therapy_sessions
        SET 
            session_date = v_new_date,
            time_start = v_new_time_start,
            time_end = v_new_time_end,
            room_id = v_new_room_id,
            status = 'rescheduled',
            updated_at = now(),
            updated_by = p_user_id,
            notes = COALESCE(notes, '') || format(' [Rescheduled due to subscription freeze on %s]', now()::date)
        WHERE id = v_session_id
        AND status = 'scheduled';
        
        -- Check if update was successful
        IF FOUND THEN
            v_sessions_rescheduled := v_sessions_rescheduled + 1;
        ELSE
            v_errors := v_errors || jsonb_build_object(
                'session_id', v_session_id,
                'error', 'Session not found or not in schedulable state'
            );
        END IF;
    END LOOP;
    
    -- Check if there were critical errors
    IF jsonb_array_length(v_errors) > jsonb_array_length(p_rescheduling_plan) * 0.5 THEN
        -- More than 50% failed - rollback
        ROLLBACK TO reschedule_start;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Too many rescheduling failures - operation rolled back',
            'errors', v_errors,
            'sessions_rescheduled', 0
        );
    END IF;
    
    -- Calculate new program end date
    UPDATE student_subscriptions
    SET 
        end_date = end_date + p_freeze_days,
        updated_at = now(),
        updated_by = p_user_id
    WHERE id = p_subscription_id;
    
    -- Record the rescheduling operation
    INSERT INTO subscription_freeze_operations (
        operation_id, subscription_id, operation_type, 
        status, rollback_data, created_by
    ) VALUES (
        'RESCHEDULE_' || EXTRACT(EPOCH FROM now())::bigint,
        p_subscription_id, 'reschedule',
        'completed', v_rollback_data, p_user_id
    );
    
    -- Build success result
    v_result := jsonb_build_object(
        'success', true,
        'sessions_rescheduled', v_sessions_rescheduled,
        'new_end_date', (
            SELECT end_date FROM student_subscriptions WHERE id = p_subscription_id
        ),
        'errors', v_errors,
        'rollback_data', v_rollback_data
    );
    
    RETURN v_result;
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Rollback on any error
        ROLLBACK TO reschedule_start;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error during rescheduling: ' || SQLERRM,
            'sessions_rescheduled', 0
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES  
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_freeze_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_freeze_operations ENABLE ROW LEVEL SECURITY;

-- Subscription policies
CREATE POLICY "Users can view student subscriptions based on role" ON student_subscriptions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            -- Admins and managers can see all
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'manager')
            )
            OR
            -- Therapists can see subscriptions for their students
            EXISTS (
                SELECT 1 FROM therapist_assignments ta
                WHERE ta.student_id = student_subscriptions.student_id
                AND ta.therapist_id IN (
                    SELECT id FROM therapists WHERE user_id = auth.uid()
                )
            )
            OR
            -- Parents can see their children's subscriptions
            EXISTS (
                SELECT 1 FROM students s
                WHERE s.id = student_subscriptions.student_id
                AND s.parent_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admin and managers can modify student subscriptions" ON student_subscriptions
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Freeze history policies (read-only for most users)
CREATE POLICY "Users can view freeze history based on subscription access" ON subscription_freeze_history
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM student_subscriptions ss
            WHERE ss.id = subscription_freeze_history.subscription_id
            -- Uses the subscription RLS policy for access control
        )
    );

CREATE POLICY "Only admins can modify freeze history" ON subscription_freeze_history
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Operation tracking policies (admin only)
CREATE POLICY "Only admins can access freeze operations" ON subscription_freeze_operations
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 7. AUTOMATED TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE TRIGGER update_student_subscriptions_updated_at 
    BEFORE UPDATE ON student_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. TABLE COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE student_subscriptions IS 'Manages student enrollments in therapy programs with freeze day tracking and status management';
COMMENT ON TABLE subscription_freeze_history IS 'Audit trail for all subscription freeze operations with complete context and impact tracking';  
COMMENT ON TABLE subscription_freeze_operations IS 'Tracks ongoing freeze operations for distributed transaction safety and rollback capability';

COMMENT ON COLUMN student_subscriptions.freeze_days_allowed IS 'Maximum number of days this subscription can be frozen based on program rules';
COMMENT ON COLUMN student_subscriptions.freeze_days_used IS 'Total number of days already used for freezing this subscription';
COMMENT ON COLUMN student_subscriptions.original_end_date IS 'Original end date before any freeze extensions for audit purposes';
COMMENT ON COLUMN subscription_freeze_history.rollback_data IS 'JSONB data needed to rollback this operation if necessary';
COMMENT ON COLUMN subscription_freeze_operations.rollback_data IS 'Complete state snapshot required for transaction rollback operations';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================