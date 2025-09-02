-- =====================================================
-- ENHANCED INSTALLMENT PLANS SCHEMA - Story 2.3 Task 1
-- Comprehensive installment payment management
-- =====================================================

-- Enhanced Payment Plans Table (extends existing payment_plans)
CREATE TABLE IF NOT EXISTS enhanced_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    
    -- Plan details
    plan_name VARCHAR(100) NOT NULL,
    plan_name_ar VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
    installment_amount DECIMAL(10,2) NOT NULL,
    first_installment_amount DECIMAL(10,2), -- Can be different
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    start_date DATE NOT NULL,
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'defaulted')),
    created_from_template_id UUID,
    
    -- Terms and conditions
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_date TIMESTAMP WITH TIME ZONE,
    terms_accepted_ip INET,
    terms_version VARCHAR(10) DEFAULT '1.0',
    
    -- Late fees configuration
    late_fees_enabled BOOLEAN DEFAULT true,
    late_fee_type VARCHAR(20) DEFAULT 'percentage' CHECK (late_fee_type IN ('fixed', 'percentage')),
    late_fee_amount DECIMAL(8,2) DEFAULT 5.00,
    grace_period_days INTEGER DEFAULT 7,
    
    -- Auto-payment settings
    auto_pay_enabled BOOLEAN DEFAULT false,
    auto_pay_method VARCHAR(50),
    auto_pay_token VARCHAR(255), -- Encrypted payment method token
    
    -- Reminder settings
    reminder_settings JSONB DEFAULT '{
        "days_before_due": [7, 3, 1],
        "days_after_due": [1, 7, 14],
        "methods": ["email", "sms"],
        "escalation_days": [30, 60]
    }'::jsonb,
    
    -- Progress tracking
    payments_made INTEGER DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    last_payment_date DATE,
    next_due_date DATE,
    
    -- Risk assessment
    risk_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    risk_factors JSONB, -- Array of risk indicators
    
    -- Modification tracking
    modification_count INTEGER DEFAULT 0,
    last_modified_by UUID REFERENCES users(id),
    last_modified_reason TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes for performance
    INDEX idx_enhanced_payment_plans_invoice (invoice_id),
    INDEX idx_enhanced_payment_plans_student (student_id),
    INDEX idx_enhanced_payment_plans_status (status),
    INDEX idx_enhanced_payment_plans_next_due (next_due_date),
    INDEX idx_enhanced_payment_plans_risk_score (risk_score)
);

-- Enhanced Payment Installments Table
CREATE TABLE IF NOT EXISTS enhanced_payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES enhanced_payment_plans(id) ON DELETE CASCADE,
    
    -- Installment details
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial', 'waived', 'cancelled')),
    days_overdue INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN status IN ('overdue', 'partial') AND due_date < CURRENT_DATE 
            THEN CURRENT_DATE - due_date 
            ELSE 0 
        END
    ) STORED,
    
    -- Payment processing
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(50),
    gateway_provider VARCHAR(50),
    gateway_response JSONB,
    processing_fees DECIMAL(8,2) DEFAULT 0,
    
    -- Late fees
    late_fee_applied BOOLEAN DEFAULT false,
    late_fee_amount DECIMAL(8,2) DEFAULT 0,
    late_fee_date DATE,
    late_fee_waived BOOLEAN DEFAULT false,
    late_fee_waived_reason TEXT,
    
    -- Auto-payment attempts
    auto_payment_attempts INTEGER DEFAULT 0,
    last_auto_payment_attempt TIMESTAMP WITH TIME ZONE,
    auto_payment_failures JSONB, -- Array of failure reasons
    
    -- Reminders tracking
    reminders_sent JSONB DEFAULT '[]'::jsonb, -- Array of reminder records
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    
    -- Modification history
    original_amount DECIMAL(10,2), -- Original amount before modifications
    amount_adjustments JSONB, -- Array of adjustment records
    
    -- Notes and documentation
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(payment_plan_id, installment_number),
    
    -- Indexes
    INDEX idx_enhanced_installments_plan (payment_plan_id),
    INDEX idx_enhanced_installments_due_date (due_date),
    INDEX idx_enhanced_installments_status (status),
    INDEX idx_enhanced_installments_overdue (days_overdue) WHERE status IN ('overdue', 'partial'),
    INDEX idx_enhanced_installments_auto_pay (auto_payment_attempts) WHERE auto_payment_attempts > 0
);

-- Payment Plan Templates Table
CREATE TABLE IF NOT EXISTS payment_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Template configuration
    default_installments INTEGER NOT NULL,
    default_frequency VARCHAR(20) NOT NULL CHECK (default_frequency IN ('weekly', 'biweekly', 'monthly')),
    min_amount DECIMAL(10,2) DEFAULT 100,
    max_amount DECIMAL(10,2),
    
    -- Terms configuration
    grace_period_days INTEGER DEFAULT 7,
    late_fees_enabled BOOLEAN DEFAULT true,
    late_fee_type VARCHAR(20) DEFAULT 'percentage',
    late_fee_amount DECIMAL(8,2) DEFAULT 5.00,
    
    -- Eligibility criteria
    eligibility_criteria JSONB DEFAULT '{
        "min_credit_score": 0,
        "requires_parent_consent": true,
        "max_outstanding_balance": 10000,
        "excluded_service_types": [],
        "min_student_age": 0
    }'::jsonb,
    
    -- Default reminder schedule
    reminder_schedule JSONB DEFAULT '{
        "days_before_due": [7, 3, 1],
        "days_after_due": [1, 7, 14],
        "escalation_days": [30, 60]
    }'::jsonb,
    
    -- Terms and conditions
    terms_template TEXT,
    terms_template_ar TEXT,
    terms_version VARCHAR(10) DEFAULT '1.0',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of completed plans
    average_completion_time INTEGER, -- Days
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes
    INDEX idx_payment_plan_templates_active (is_active),
    INDEX idx_payment_plan_templates_usage (usage_count),
    INDEX idx_payment_plan_templates_success (success_rate)
);

-- Payment Plan Modifications Log
CREATE TABLE IF NOT EXISTS payment_plan_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES enhanced_payment_plans(id) ON DELETE CASCADE,
    
    -- Modification details
    modification_type VARCHAR(50) NOT NULL CHECK (modification_type IN (
        'amount_change', 'schedule_change', 'pause', 'resume', 
        'late_fee_adjustment', 'terms_update', 'cancellation', 'reactivation'
    )),
    
    -- Change tracking
    field_changed VARCHAR(100),
    previous_value JSONB,
    new_value JSONB,
    
    -- Justification
    reason TEXT NOT NULL,
    reason_ar TEXT,
    supporting_documents JSONB, -- Array of document references
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    
    -- Impact assessment
    financial_impact DECIMAL(10,2), -- Change in total plan amount
    schedule_impact_days INTEGER, -- Change in completion timeline
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_payment_plan_modifications_plan (payment_plan_id),
    INDEX idx_payment_plan_modifications_type (modification_type),
    INDEX idx_payment_plan_modifications_approval (approval_status)
);

-- Financial Transactions Enhanced (extends existing payments table)
CREATE TABLE IF NOT EXISTS enhanced_financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_plan_id UUID REFERENCES enhanced_payment_plans(id) ON DELETE SET NULL,
    installment_id UUID REFERENCES enhanced_payment_installments(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'payment', 'refund', 'late_fee', 'adjustment', 'write_off', 'discount'
    )),
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Payment method details
    payment_method VARCHAR(50) NOT NULL,
    payment_source VARCHAR(50), -- 'manual', 'auto_pay', 'gateway', 'cash'
    
    -- Gateway processing
    gateway_provider VARCHAR(50),
    gateway_transaction_id VARCHAR(100),
    gateway_response JSONB,
    gateway_fees DECIMAL(8,2) DEFAULT 0,
    processing_time_ms INTEGER,
    
    -- Status and timing
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
    )),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Reconciliation
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    settlement_date DATE,
    settlement_batch_id VARCHAR(100),
    
    -- Audit and security
    initiated_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Documentation
    description TEXT,
    description_ar TEXT,
    notes TEXT,
    supporting_documents JSONB, -- Array of document references
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes
    INDEX idx_enhanced_transactions_invoice (invoice_id),
    INDEX idx_enhanced_transactions_plan (payment_plan_id),
    INDEX idx_enhanced_transactions_student (student_id),
    INDEX idx_enhanced_transactions_status (status),
    INDEX idx_enhanced_transactions_type (transaction_type),
    INDEX idx_enhanced_transactions_gateway (gateway_provider),
    INDEX idx_enhanced_transactions_settlement (settlement_date, reconciled),
    INDEX idx_enhanced_transactions_created (created_at)
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update payment plan progress
CREATE OR REPLACE FUNCTION update_payment_plan_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update payment plan totals when installment is paid
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        UPDATE enhanced_payment_plans 
        SET 
            payments_made = payments_made + 1,
            total_paid = total_paid + NEW.paid_amount,
            last_payment_date = NEW.paid_date,
            next_due_date = (
                SELECT MIN(due_date) 
                FROM enhanced_payment_installments 
                WHERE payment_plan_id = NEW.payment_plan_id 
                AND status = 'pending'
            ),
            updated_at = now()
        WHERE id = NEW.payment_plan_id;
        
        -- Check if plan is completed
        UPDATE enhanced_payment_plans 
        SET status = 'completed'
        WHERE id = NEW.payment_plan_id 
        AND payments_made >= number_of_installments;
    END IF;
    
    -- Calculate days overdue for installments
    IF NEW.status IN ('overdue', 'partial') AND NEW.due_date < CURRENT_DATE THEN
        NEW.days_overdue = CURRENT_DATE - NEW.due_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update payment plan progress
CREATE TRIGGER trigger_update_payment_plan_progress
    AFTER UPDATE ON enhanced_payment_installments
    FOR EACH ROW EXECUTE FUNCTION update_payment_plan_progress();

-- Function to apply late fees automatically
CREATE OR REPLACE FUNCTION apply_late_fees()
RETURNS void AS $$
DECLARE
    overdue_installment RECORD;
    plan_config RECORD;
    late_fee_amount DECIMAL(10,2);
BEGIN
    -- Process overdue installments that don't have late fees applied yet
    FOR overdue_installment IN 
        SELECT ei.*, epp.late_fees_enabled, epp.late_fee_type, epp.late_fee_amount, epp.grace_period_days
        FROM enhanced_payment_installments ei
        JOIN enhanced_payment_plans epp ON ei.payment_plan_id = epp.id
        WHERE ei.status = 'overdue'
        AND ei.late_fee_applied = false
        AND epp.late_fees_enabled = true
        AND ei.due_date < CURRENT_DATE - INTERVAL '1 day' * epp.grace_period_days
    LOOP
        -- Calculate late fee
        IF overdue_installment.late_fee_type = 'percentage' THEN
            late_fee_amount = overdue_installment.amount * (overdue_installment.late_fee_amount / 100);
        ELSE
            late_fee_amount = overdue_installment.late_fee_amount;
        END IF;
        
        -- Apply late fee
        UPDATE enhanced_payment_installments
        SET 
            late_fee_applied = true,
            late_fee_amount = late_fee_amount,
            late_fee_date = CURRENT_DATE,
            amount = amount + late_fee_amount,
            updated_at = now()
        WHERE id = overdue_installment.id;
        
        -- Log the late fee as a transaction
        INSERT INTO enhanced_financial_transactions (
            payment_plan_id,
            installment_id,
            student_id,
            transaction_type,
            amount,
            payment_method,
            status,
            description,
            completed_at
        ) VALUES (
            overdue_installment.payment_plan_id,
            overdue_installment.id,
            (SELECT student_id FROM enhanced_payment_plans WHERE id = overdue_installment.payment_plan_id),
            'late_fee',
            late_fee_amount,
            'system_adjustment',
            'completed',
            'Late fee applied for overdue installment #' || overdue_installment.installment_number,
            now()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Payment Plan Templates
INSERT INTO payment_plan_templates (
    name, name_ar, description, description_ar,
    default_installments, default_frequency,
    min_amount, max_amount, is_default
) VALUES 
(
    'Standard 3-Month Plan', 'خطة 3 أشهر قياسية',
    'Standard 3-month payment plan with monthly installments',
    'خطة دفع قياسية لمدة 3 أشهر بأقساط شهرية',
    3, 'monthly', 300, 5000, true
),
(
    'Extended 6-Month Plan', 'خطة 6 أشهر ممتدة',
    'Extended 6-month payment plan for larger amounts',
    'خطة دفع ممتدة لمدة 6 أشهر للمبالغ الأكبر',
    6, 'monthly', 1000, 15000, false
),
(
    'Weekly Payment Plan', 'خطة دفع أسبوعية',
    'Weekly payment plan for smaller amounts',
    'خطة دفع أسبوعية للمبالغ الصغيرة',
    12, 'weekly', 100, 2000, false
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_payment_plans_composite 
    ON enhanced_payment_plans(status, next_due_date, student_id);

CREATE INDEX IF NOT EXISTS idx_enhanced_installments_composite 
    ON enhanced_payment_installments(status, due_date, payment_plan_id);

CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_composite 
    ON enhanced_financial_transactions(status, transaction_type, created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE enhanced_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_financial_transactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your user roles)
CREATE POLICY "Users can view payment plans for their organization" ON enhanced_payment_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = enhanced_payment_plans.student_id 
            AND s.organization_id = (auth.jwt() ->> 'organization_id')::UUID
        )
    );

CREATE POLICY "Billing users can manage payment plans" ON enhanced_payment_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'billing_admin')
        )
    );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE enhanced_payment_plans IS 'Enhanced payment plans with comprehensive installment management';
COMMENT ON TABLE enhanced_payment_installments IS 'Individual installments with automated processing and late fee management';
COMMENT ON TABLE payment_plan_templates IS 'Reusable templates for payment plan creation';
COMMENT ON TABLE payment_plan_modifications IS 'Audit trail for all payment plan modifications';
COMMENT ON TABLE enhanced_financial_transactions IS 'Comprehensive financial transaction log with gateway integration';

-- =====================================================
-- END OF ENHANCED INSTALLMENT PLANS SCHEMA
-- =====================================================