-- =====================================================
-- PAYMENT GATEWAY INTEGRATION SCHEMA
-- Story 2.3: Financial Management - Task 1
-- Saudi Arabia Payment Methods: MADA, STC Pay, Bank Transfer
-- =====================================================

-- Payment Gateway Credentials Storage
CREATE TABLE IF NOT EXISTS payment_gateway_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    
    -- Encrypted credentials
    credentials JSONB NOT NULL, -- Encrypted API keys, merchant IDs, etc.
    encrypted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    encryption_key_id VARCHAR(50),
    
    -- Validation
    last_validated TIMESTAMP WITH TIME ZONE,
    validation_status VARCHAR(20) CHECK (validation_status IN ('valid', 'invalid', 'expired', 'pending')),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(gateway_id, environment)
);

-- Payment Transactions Log
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_id VARCHAR(100) NOT NULL, -- Gateway transaction ID
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
        'cash', 'mada', 'visa', 'mastercard', 'stc_pay', 
        'bank_transfer', 'apple_pay', 'google_pay', 'insurance'
    )),
    
    -- Amount and currency
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD', 'EUR')),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'requires_action', 'completed', 
        'failed', 'cancelled', 'refunded', 'partially_refunded'
    )),
    
    -- Gateway information
    gateway_provider VARCHAR(50) NOT NULL,
    gateway_response JSONB, -- Complete gateway response
    gateway_fees DECIMAL(8,2) DEFAULT 0,
    
    -- Processing times
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_seconds INTEGER,
    
    -- Customer information
    customer_info JSONB, -- Customer details used in transaction
    
    -- Security and fraud prevention
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    fraud_score DECIMAL(5,2),
    fraud_checks JSONB, -- Results of fraud detection
    
    -- 3D Secure / Additional authentication
    requires_authentication BOOLEAN DEFAULT false,
    authentication_url TEXT,
    authentication_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Reconciliation
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    settlement_date DATE,
    settlement_amount DECIMAL(10,2),
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    error_message_ar TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Indexes
    INDEX idx_payment_transactions_transaction_id (transaction_id),
    INDEX idx_payment_transactions_invoice_id (invoice_id),
    INDEX idx_payment_transactions_student_id (student_id),
    INDEX idx_payment_transactions_status (status),
    INDEX idx_payment_transactions_gateway (gateway_provider),
    INDEX idx_payment_transactions_created_at (created_at),
    INDEX idx_payment_transactions_settlement_date (settlement_date)
);

-- Payment Gateway Webhooks Log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Webhook details
    gateway_provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_id VARCHAR(100), -- Gateway's event ID
    
    -- Related transaction
    transaction_id VARCHAR(100),
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    
    -- Webhook payload
    raw_payload JSONB NOT NULL,
    processed_payload JSONB,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processed', 'failed', 'ignored', 'duplicate'
    )),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Security verification
    signature_verified BOOLEAN DEFAULT false,
    signature_header TEXT,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_webhook_events_transaction_id (transaction_id),
    INDEX idx_webhook_events_gateway_event (gateway_provider, event_type),
    INDEX idx_webhook_events_status (processing_status),
    INDEX idx_webhook_events_received_at (received_at)
);

-- Payment Reconciliation Records
CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reconciliation period
    reconciliation_date DATE NOT NULL,
    gateway_provider VARCHAR(50) NOT NULL,
    
    -- Settlement information
    settlement_id VARCHAR(100),
    settlement_file_url TEXT,
    settlement_amount DECIMAL(12,2) NOT NULL,
    settlement_currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Matching results
    total_transactions INTEGER NOT NULL DEFAULT 0,
    matched_transactions INTEGER NOT NULL DEFAULT 0,
    unmatched_transactions INTEGER NOT NULL DEFAULT 0,
    amount_discrepancies INTEGER NOT NULL DEFAULT 0,
    
    -- Reconciliation status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'failed', 'manual_review'
    )),
    
    -- Discrepancies
    discrepancies JSONB, -- Details of unmatched transactions
    
    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Metadata
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(reconciliation_date, gateway_provider, settlement_id),
    INDEX idx_reconciliation_date_gateway (reconciliation_date, gateway_provider),
    INDEX idx_reconciliation_status (status)
);

-- Payment Method Configuration
CREATE TABLE IF NOT EXISTS payment_method_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_method VARCHAR(50) NOT NULL UNIQUE,
    
    -- Display information
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    icon_url TEXT,
    
    -- Configuration
    is_enabled BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Limits and fees
    min_amount DECIMAL(8,2),
    max_amount DECIMAL(10,2),
    daily_limit DECIMAL(12,2),
    monthly_limit DECIMAL(12,2),
    
    -- Processing
    average_processing_time INTEGER, -- seconds
    requires_authentication BOOLEAN DEFAULT false,
    supports_recurring BOOLEAN DEFAULT false,
    supports_refunds BOOLEAN DEFAULT false,
    
    -- Fee structure
    fee_structure JSONB, -- Fee configuration
    
    -- Availability
    available_currencies JSONB, -- Supported currencies array
    geographic_restrictions JSONB, -- Country/region restrictions
    
    -- Features
    features JSONB, -- Additional features and capabilities
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Gateway Health Monitoring
CREATE TABLE IF NOT EXISTS payment_gateway_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_provider VARCHAR(50) NOT NULL,
    
    -- Health metrics
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    response_time_ms INTEGER,
    success_rate DECIMAL(5,2), -- Percentage
    error_rate DECIMAL(5,2), -- Percentage
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance')),
    uptime_percentage DECIMAL(5,2),
    
    -- Error details
    last_error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Transaction volume (last 24h)
    transaction_count_24h INTEGER DEFAULT 0,
    transaction_volume_24h DECIMAL(12,2) DEFAULT 0,
    
    -- Automated checks
    api_connectivity BOOLEAN,
    webhook_connectivity BOOLEAN,
    settlement_connectivity BOOLEAN,
    
    INDEX idx_gateway_health_provider_timestamp (gateway_provider, check_timestamp),
    INDEX idx_gateway_health_status (status)
);

-- =====================================================
-- INSERT DEFAULT CONFIGURATION DATA
-- =====================================================

-- Default Payment Method Configuration
INSERT INTO payment_method_config (payment_method, name, name_ar, is_enabled, sort_order, min_amount, max_amount, average_processing_time, requires_authentication, supports_recurring, supports_refunds, fee_structure, available_currencies) VALUES
('cash', 'Cash Payment', 'دفع نقدي', true, 1, 1, 10000, 0, false, false, false, '{"type": "none"}', '["SAR"]'),
('mada', 'MADA Card', 'بطاقة مدى', true, 2, 5, 50000, 10, true, true, true, '{"type": "percentage", "rate": 0.025, "min": 2, "max": 50}', '["SAR"]'),
('visa', 'Visa Card', 'بطاقة فيزا', true, 3, 5, 50000, 15, true, true, true, '{"type": "percentage", "rate": 0.03, "min": 2, "max": 75}', '["SAR", "USD", "EUR"]'),
('mastercard', 'Mastercard', 'ماستركارد', true, 4, 5, 50000, 15, true, true, true, '{"type": "percentage", "rate": 0.03, "min": 2, "max": 75}', '["SAR", "USD", "EUR"]'),
('stc_pay', 'STC Pay', 'دفع إس تي سي', true, 5, 1, 10000, 5, true, false, true, '{"type": "fixed", "amount": 2}', '["SAR"]'),
('bank_transfer', 'Bank Transfer', 'تحويل بنكي', true, 6, 50, 1000000, 300, false, false, false, '{"type": "fixed", "amount": 5}', '["SAR"]'),
('apple_pay', 'Apple Pay', 'أبل باي', false, 7, 5, 10000, 8, true, false, true, '{"type": "percentage", "rate": 0.025, "min": 2}', '["SAR"]'),
('google_pay', 'Google Pay', 'جوجل باي', false, 8, 5, 10000, 8, true, false, true, '{"type": "percentage", "rate": 0.025, "min": 2}', '["SAR"]'),
('insurance', 'Insurance Payment', 'دفع التأمين', true, 9, 0, 100000, 0, false, false, false, '{"type": "none"}', '["SAR"]')
ON CONFLICT (payment_method) DO NOTHING;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update payment transaction status
CREATE OR REPLACE FUNCTION update_payment_transaction_timing()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate processing time when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = now();
        NEW.processing_time_seconds = EXTRACT(EPOCH FROM (now() - NEW.initiated_at));
    END IF;
    
    -- Update timestamps
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment transaction updates
CREATE TRIGGER trigger_update_payment_transaction_timing
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_payment_transaction_timing();

-- Function to update invoice payment status when transaction completes
CREATE OR REPLACE FUNCTION update_invoice_on_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if transaction is newly completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update invoice paid amount
        UPDATE invoices 
        SET 
            paid_amount = paid_amount + NEW.amount,
            updated_at = now()
        WHERE id = NEW.invoice_id;
        
        -- Update invoice status based on balance
        UPDATE invoices 
        SET 
            status = CASE 
                WHEN total_amount - paid_amount <= 0 THEN 'paid'
                WHEN due_date < now() AND total_amount - paid_amount > 0 THEN 'overdue'
                ELSE status
            END,
            balance_amount = total_amount - paid_amount
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice on payment completion
CREATE TRIGGER trigger_update_invoice_on_payment_completion
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment_completion();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reconciled ON payment_transactions(reconciled, settlement_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_fraud_score ON payment_transactions(fraud_score) WHERE fraud_score > 50;
CREATE INDEX IF NOT EXISTS idx_webhook_events_duplicate_check ON payment_webhook_events(gateway_provider, event_id, event_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on payment tables
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_credentials ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your user roles)
CREATE POLICY "Users can view payment transactions for their organization" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = payment_transactions.student_id 
            AND s.organization_id = (auth.jwt() ->> 'organization_id')::UUID
        )
    );

CREATE POLICY "Billing users can manage payment transactions" ON payment_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'billing_admin')
        )
    );

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Payment summary by method
CREATE OR REPLACE VIEW payment_method_summary AS
SELECT 
    pt.payment_method,
    pmc.name,
    pmc.name_ar,
    COUNT(*) as transaction_count,
    SUM(pt.amount) as total_amount,
    AVG(pt.amount) as average_amount,
    AVG(pt.processing_time_seconds) as avg_processing_time,
    COUNT(CASE WHEN pt.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*) * 100 as success_rate,
    SUM(pt.gateway_fees) as total_fees,
    DATE_TRUNC('month', pt.created_at) as month
FROM payment_transactions pt
LEFT JOIN payment_method_config pmc ON pt.payment_method = pmc.payment_method
WHERE pt.status = 'completed'
GROUP BY pt.payment_method, pmc.name, pmc.name_ar, DATE_TRUNC('month', pt.created_at)
ORDER BY month DESC, total_amount DESC;

-- Daily payment analytics
CREATE OR REPLACE VIEW daily_payment_analytics AS
SELECT 
    DATE(pt.created_at) as payment_date,
    pt.gateway_provider,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as successful_transactions,
    COUNT(CASE WHEN pt.status = 'failed' THEN 1 END) as failed_transactions,
    SUM(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE 0 END) as total_amount,
    AVG(CASE WHEN pt.status = 'completed' THEN pt.processing_time_seconds ELSE NULL END) as avg_processing_time,
    SUM(pt.gateway_fees) as total_fees
FROM payment_transactions pt
WHERE pt.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(pt.created_at), pt.gateway_provider
ORDER BY payment_date DESC;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE payment_transactions IS 'Complete payment transaction log with gateway integration';
COMMENT ON TABLE payment_gateway_credentials IS 'Encrypted storage for payment gateway API credentials';
COMMENT ON TABLE payment_webhook_events IS 'Webhook events from payment gateways for real-time updates';
COMMENT ON TABLE payment_reconciliation IS 'Daily reconciliation records for payment settlement';
COMMENT ON TABLE payment_method_config IS 'Configuration and limits for each payment method';
COMMENT ON TABLE payment_gateway_health IS 'Health monitoring for payment gateway services';

-- =====================================================
-- END OF PAYMENT GATEWAY INTEGRATION SCHEMA
-- =====================================================