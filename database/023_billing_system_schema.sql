-- =====================================================
-- BILLING SYSTEM SCHEMA
-- Phase 6: Financial Management & Billing
-- Saudi Arabia Compliant with 15% VAT
-- =====================================================

-- Invoice Management
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    
    -- Invoice dates
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status and currency
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    currency VARCHAR(3) DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD')),
    
    -- Financial totals
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- VAT 15%
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Payment terms
    payment_terms INTEGER DEFAULT 30, -- Days
    payment_method VARCHAR(50),
    
    -- Insurance information
    insurance_provider VARCHAR(100),
    insurance_coverage DECIMAL(5,2) DEFAULT 0, -- Percentage
    insurance_amount DECIMAL(10,2) DEFAULT 0,
    patient_responsibility DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Indexes for performance
    INDEX idx_invoices_student_id (student_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_due_date (due_date),
    INDEX idx_invoices_invoice_number (invoice_number)
);

-- Invoice Items (Billing Items)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    session_id UUID REFERENCES therapy_sessions(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
    
    -- Service details
    service_type VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1, -- Duration in hours or sessions
    unit_price DECIMAL(8,2) NOT NULL,
    
    -- Calculations
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Additional info
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_invoice_items_invoice_id (invoice_id),
    INDEX idx_invoice_items_session_id (session_id),
    INDEX idx_invoice_items_service_type (service_type)
);

-- Payment Records
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
        'cash', 'card', 'bank_transfer', 'stc_pay', 'mada', 'insurance', 'check'
    )),
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Transaction details
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    reference_number VARCHAR(100),
    
    -- Payment gateway information
    gateway_provider VARCHAR(50),
    gateway_response JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Insurance payments
    is_insurance_payment BOOLEAN DEFAULT false,
    insurance_provider VARCHAR(100),
    claim_number VARCHAR(50),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    notes TEXT,
    
    INDEX idx_payments_invoice_id (invoice_id),
    INDEX idx_payments_student_id (student_id),
    INDEX idx_payments_payment_date (payment_date),
    INDEX idx_payments_payment_method (payment_method),
    INDEX idx_payments_receipt_number (receipt_number)
);

-- Payment Plans
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Plan details
    total_amount DECIMAL(10,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installment_amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    start_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_payment_plans_invoice_id (invoice_id),
    INDEX idx_payment_plans_student_id (student_id),
    INDEX idx_payment_plans_status (status)
);

-- Payment Installments
CREATE TABLE IF NOT EXISTS payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,
    
    -- Installment details
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(10,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    
    -- Payment details
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(50),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_payment_installments_plan_id (payment_plan_id),
    INDEX idx_payment_installments_due_date (due_date),
    INDEX idx_payment_installments_status (status)
);

-- Insurance Providers
CREATE TABLE IF NOT EXISTS insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    
    -- API integration
    api_endpoint VARCHAR(200),
    api_key_encrypted TEXT,
    authorization_required BOOLEAN DEFAULT true,
    
    -- Coverage details
    coverage_percentage DECIMAL(5,2) DEFAULT 0,
    max_sessions_per_year INTEGER,
    supported_services JSONB, -- Array of service types
    
    -- Contact information
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    website VARCHAR(200),
    address TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_insurance_providers_name (name),
    INDEX idx_insurance_providers_active (is_active)
);

-- Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    insurance_provider_id UUID REFERENCES insurance_providers(id) ON DELETE SET NULL,
    
    -- Claim details
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    claim_amount DECIMAL(10,2) NOT NULL,
    submitted_date DATE NOT NULL,
    processed_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'approved', 'rejected', 'paid'
    )),
    
    -- Authorization
    authorization_number VARCHAR(50),
    authorization_date DATE,
    
    -- Response details
    approved_amount DECIMAL(10,2),
    rejection_reason TEXT,
    payment_date DATE,
    payment_reference VARCHAR(50),
    
    -- Documents
    supporting_documents JSONB, -- Array of document references
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    notes TEXT,
    
    INDEX idx_insurance_claims_claim_number (claim_number),
    INDEX idx_insurance_claims_student_id (student_id),
    INDEX idx_insurance_claims_status (status),
    INDEX idx_insurance_claims_submitted_date (submitted_date)
);

-- Service Rates Configuration
CREATE TABLE IF NOT EXISTS service_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL UNIQUE,
    service_name VARCHAR(100) NOT NULL,
    service_name_ar VARCHAR(100) NOT NULL,
    
    -- Pricing
    standard_rate DECIMAL(8,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Rate variations
    group_rate DECIMAL(8,2), -- For group sessions
    home_visit_rate DECIMAL(8,2), -- For home visits
    assessment_rate DECIMAL(8,2), -- For assessments
    
    -- Billing settings
    billing_unit VARCHAR(20) DEFAULT 'hour' CHECK (billing_unit IN ('hour', 'session', 'month')),
    minimum_units DECIMAL(4,2) DEFAULT 1,
    
    -- Insurance
    insurance_covered BOOLEAN DEFAULT true,
    typical_insurance_coverage DECIMAL(5,2) DEFAULT 50, -- Percentage
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_service_rates_service_type (service_type),
    INDEX idx_service_rates_active (is_active),
    INDEX idx_service_rates_effective_date (effective_date)
);

-- Billing Settings
CREATE TABLE IF NOT EXISTS billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES users(id)
);

-- Financial Reports Cache
CREATE TABLE IF NOT EXISTS financial_reports_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    parameters JSONB,
    
    -- Report data
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_financial_reports_type_date (report_type, date_range_start, date_range_end),
    INDEX idx_financial_reports_expires (expires_at)
);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Service Rates (in Saudi Riyals)
INSERT INTO service_rates (service_type, service_name, service_name_ar, standard_rate, effective_date) VALUES
('aba_session', 'ABA Therapy Session', 'جلسة العلاج السلوكي التطبيقي', 250.00, CURRENT_DATE),
('speech_therapy', 'Speech Therapy Session', 'جلسة علاج النطق', 200.00, CURRENT_DATE),
('occupational_therapy', 'Occupational Therapy Session', 'جلسة العلاج الوظيفي', 180.00, CURRENT_DATE),
('physical_therapy', 'Physical Therapy Session', 'جلسة العلاج الطبيعي', 180.00, CURRENT_DATE),
('behavioral_therapy', 'Behavioral Therapy Session', 'جلسة العلاج السلوكي', 220.00, CURRENT_DATE),
('assessment', 'Initial Assessment', 'التقييم الأولي', 400.00, CURRENT_DATE),
('consultation', 'Consultation Meeting', 'اجتماع استشاري', 300.00, CURRENT_DATE),
('group_session', 'Group Therapy Session', 'جلسة علاج جماعي', 150.00, CURRENT_DATE),
('home_program', 'Home Program Training', 'تدريب البرنامج المنزلي', 100.00, CURRENT_DATE),
('parent_training', 'Parent Training Session', 'جلسة تدريب الوالدين', 180.00, CURRENT_DATE),
('music_therapy', 'Music Therapy Session', 'جلسة العلاج بالموسيقى', 160.00, CURRENT_DATE),
('art_therapy', 'Art Therapy Session', 'جلسة العلاج بالفن', 160.00, CURRENT_DATE),
('social_skills', 'Social Skills Group', 'مجموعة المهارات الاجتماعية', 140.00, CURRENT_DATE),
('feeding_therapy', 'Feeding Therapy Session', 'جلسة علاج التغذية', 200.00, CURRENT_DATE),
('early_intervention', 'Early Intervention Session', 'جلسة التدخل المبكر', 190.00, CURRENT_DATE)
ON CONFLICT (service_type) DO NOTHING;

-- Major Saudi Insurance Providers
INSERT INTO insurance_providers (name, name_ar, coverage_percentage, is_active) VALUES
('Bupa Arabia', 'بوبا العربية', 75.0, true),
('Tawuniya (The Company for Cooperative Insurance)', 'التعاونية', 70.0, true),
('MedGulf', 'مدجلف', 65.0, true),
('Al Rajhi Takaful', 'الراجحي تكافل', 60.0, true),
('SABB Takaful', 'ساب تكافل', 65.0, true),
('Solidarity Saudi Takaful', 'التضامن', 60.0, true),
('Malath Insurance', 'ملاذ للتأمين', 55.0, true),
('Wataniya Insurance', 'الوطنية للتأمين', 60.0, true),
('Gulf General Cooperative Insurance', 'الخليج العامة', 50.0, true),
('Saudi Enaya Cooperative Insurance', 'عناية', 55.0, true)
ON CONFLICT DO NOTHING;

-- Default Billing Settings
INSERT INTO billing_settings (setting_key, setting_value, description) VALUES
('vat_rate', '0.15', 'Saudi Arabia VAT rate (15%)'),
('default_currency', '"SAR"', 'Default currency for invoices'),
('invoice_prefix', '"INV"', 'Prefix for invoice numbers'),
('receipt_prefix', '"REC"', 'Prefix for receipt numbers'),
('payment_terms', '30', 'Default payment terms in days'),
('late_fee_enabled', 'true', 'Enable late fees for overdue payments'),
('late_fee_percentage', '0.05', 'Late fee percentage (5%)'),
('late_fee_grace_period', '7', 'Grace period for late fees in days'),
('reminder_first_days', '7', 'Send first reminder X days before due date'),
('reminder_second_days', '3', 'Send second reminder X days after due date'),
('reminder_final_days', '10', 'Send final notice X days after due date'),
('enabled_payment_methods', '["cash", "card", "bank_transfer", "stc_pay", "mada", "insurance"]', 'Enabled payment methods')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update invoice totals when items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        discount_amount = (
            SELECT COALESCE(SUM(discount_amount), 0) 
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0) 
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        total_amount = (
            SELECT COALESCE(SUM(total_amount), 0) 
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Update balance amount
    UPDATE invoices 
    SET balance_amount = total_amount - paid_amount
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice totals
CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM payments 
            WHERE invoice_id = NEW.invoice_id AND status = 'completed'
        ),
        updated_at = now()
    WHERE id = NEW.invoice_id;
    
    -- Update balance and status
    UPDATE invoices 
    SET 
        balance_amount = total_amount - paid_amount,
        status = CASE 
            WHEN total_amount - paid_amount <= 0 THEN 'paid'
            WHEN due_date < now() AND total_amount - paid_amount > 0 THEN 'overdue'
            ELSE status
        END
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice on payment
CREATE TRIGGER trigger_update_invoice_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_status_on_payment();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_parent_id ON invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_date ON invoice_items(service_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all billing tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic examples - adjust based on your user roles)
CREATE POLICY "Users can view their organization's invoices" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = invoices.student_id 
            AND s.organization_id = auth.jwt() ->> 'organization_id'::UUID
        )
    );

CREATE POLICY "Users can create invoices for their organization" ON invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = invoices.student_id 
            AND s.organization_id = auth.jwt() ->> 'organization_id'::UUID
        )
    );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoices IS 'Main invoice table for billing management with Saudi VAT compliance';
COMMENT ON TABLE invoice_items IS 'Individual line items for each invoice linking to therapy sessions';
COMMENT ON TABLE payments IS 'Payment records with Saudi payment method support';
COMMENT ON TABLE payment_plans IS 'Installment payment plans for invoices';
COMMENT ON TABLE insurance_providers IS 'Saudi insurance providers with API integration support';
COMMENT ON TABLE insurance_claims IS 'Insurance claims processing and tracking';
COMMENT ON TABLE service_rates IS 'Configurable service rates for different therapy types';
COMMENT ON COLUMN invoices.tax_amount IS 'VAT amount calculated at 15% for Saudi Arabia';
COMMENT ON COLUMN payments.payment_method IS 'Supports Saudi payment methods: STC Pay, MADA, etc.';

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for overdue invoices
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT 
    i.*,
    s.name as student_name,
    s.name_ar as student_name_ar,
    p.email as parent_email,
    p.phone as parent_phone,
    (now()::date - i.due_date::date) as days_overdue
FROM invoices i
JOIN students s ON i.student_id = s.id
LEFT JOIN parents p ON i.parent_id = p.id
WHERE i.due_date < now()
AND i.balance_amount > 0
AND i.status != 'cancelled';

-- View for payment summary by method
CREATE OR REPLACE VIEW payment_method_summary AS
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    DATE_TRUNC('month', payment_date) as month
FROM payments
WHERE status = 'completed'
GROUP BY payment_method, DATE_TRUNC('month', payment_date)
ORDER BY month DESC, total_amount DESC;

-- =====================================================
-- END OF BILLING SYSTEM SCHEMA
-- =====================================================