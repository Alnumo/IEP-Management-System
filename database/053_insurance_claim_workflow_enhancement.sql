-- Insurance Claim Workflow Enhancement
-- Adds missing tables for comprehensive insurance claim processing

-- Insurance Pre-Authorization Requests
CREATE TABLE IF NOT EXISTS insurance_pre_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    insurance_provider VARCHAR(50) NOT NULL,
    
    -- Request details
    approval_number VARCHAR(100),
    requested_sessions INTEGER NOT NULL,
    approved_sessions INTEGER,
    requested_services TEXT[] NOT NULL,
    diagnosis_codes TEXT[] NOT NULL,
    treatment_plan TEXT NOT NULL,
    estimated_cost DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'expired')),
    submitted_date TIMESTAMP WITH TIME ZONE,
    approved_date TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Additional information
    notes TEXT,
    rejection_reason TEXT,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance Claim Activities Log
CREATE TABLE IF NOT EXISTS insurance_claim_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID, -- Can reference insurance_claims.id or be 'bulk_submission', 'error', etc.
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'claim_submitted', 'claim_approved', 'claim_rejected', 'claim_paid',
        'status_update', 'bulk_claim_submitted', 'claim_error', 'preauth_submitted'
    )),
    activity_data JSONB NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enhance existing insurance_claims table with additional fields
ALTER TABLE insurance_claims 
ADD COLUMN IF NOT EXISTS service_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS session_date DATE,
ADD COLUMN IF NOT EXISTS session_duration INTEGER,
ADD COLUMN IF NOT EXISTS diagnosis_codes TEXT[],
ADD COLUMN IF NOT EXISTS treatment_notes TEXT,
ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES therapists(id),
ADD COLUMN IF NOT EXISTS pre_auth_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expected_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS processing_notes TEXT,
ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;

-- Update insurance_claims status constraint to include more statuses
ALTER TABLE insurance_claims 
DROP CONSTRAINT IF EXISTS insurance_claims_status_check,
ADD CONSTRAINT insurance_claims_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled', 'pending_review'));

-- Insurance Provider API Configuration
CREATE TABLE IF NOT EXISTS insurance_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(20) UNIQUE NOT NULL,
    provider_name_en VARCHAR(100) NOT NULL,
    provider_name_ar VARCHAR(100) NOT NULL,
    
    -- API Configuration
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    requires_pre_auth BOOLEAN DEFAULT false,
    supported_services TEXT[] NOT NULL DEFAULT '{}',
    max_sessions_per_month INTEGER DEFAULT 20,
    copay_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Business Rules
    coverage_percentage DECIMAL(5,2) DEFAULT 70.00,
    processing_days INTEGER DEFAULT 7,
    requires_diagnosis_code BOOLEAN DEFAULT true,
    requires_treatment_notes BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    integration_status VARCHAR(20) DEFAULT 'configured' CHECK (integration_status IN ('configured', 'testing', 'live', 'disabled')),
    last_sync TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance Claim Batch Processing
CREATE TABLE IF NOT EXISTS insurance_claim_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Batch details
    insurance_provider VARCHAR(50) NOT NULL,
    submission_date DATE NOT NULL,
    total_claims INTEGER NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'submitted', 'processing', 'completed', 'failed')),
    processed_claims INTEGER DEFAULT 0,
    approved_claims INTEGER DEFAULT 0,
    rejected_claims INTEGER DEFAULT 0,
    
    -- Results
    total_approved_amount DECIMAL(12,2) DEFAULT 0,
    processing_notes TEXT,
    completion_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link claims to batches
ALTER TABLE insurance_claims 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES insurance_claim_batches(id);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_student ON insurance_pre_authorizations(student_id);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_provider ON insurance_pre_authorizations(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_status ON insurance_pre_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_valid_until ON insurance_pre_authorizations(valid_until);

CREATE INDEX IF NOT EXISTS idx_insurance_claim_activities_claim_id ON insurance_claim_activities(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_activities_type ON insurance_claim_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_activities_created_at ON insurance_claim_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_service_type ON insurance_claims(service_type);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_session_date ON insurance_claims(session_date);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_therapist_id ON insurance_claims(therapist_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_pre_auth ON insurance_claims(pre_auth_number);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_batch_id ON insurance_claims(batch_id);

CREATE INDEX IF NOT EXISTS idx_insurance_provider_configs_code ON insurance_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_insurance_provider_configs_active ON insurance_provider_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_insurance_batches_provider ON insurance_claim_batches(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_insurance_batches_submission_date ON insurance_claim_batches(submission_date);
CREATE INDEX IF NOT EXISTS idx_insurance_batches_status ON insurance_claim_batches(status);

-- Row Level Security Policies
ALTER TABLE insurance_pre_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claim_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claim_batches ENABLE ROW LEVEL SECURITY;

-- Pre-authorization RLS policies
CREATE POLICY "Users can view pre-authorizations for their authorized students" ON insurance_pre_authorizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = insurance_pre_authorizations.student_id
            AND (
                auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
                OR auth.uid() IN (SELECT therapist_id FROM therapy_sessions WHERE student_id = s.id)
            )
        )
    );

CREATE POLICY "Authorized users can insert pre-authorizations" ON insurance_pre_authorizations
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager', 'therapist_lead'))
    );

CREATE POLICY "Authorized users can update pre-authorizations" ON insurance_pre_authorizations
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Claim activities RLS policies
CREATE POLICY "Authorized users can view claim activities" ON insurance_claim_activities
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager', 'therapist_lead'))
    );

CREATE POLICY "System can insert claim activities" ON insurance_claim_activities
    FOR INSERT WITH CHECK (true); -- Allow system logging

-- Provider configs RLS policies
CREATE POLICY "Authorized users can view provider configs" ON insurance_provider_configs
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

CREATE POLICY "Admins can manage provider configs" ON insurance_provider_configs
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    );

-- Batch processing RLS policies
CREATE POLICY "Authorized users can view claim batches" ON insurance_claim_batches
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

CREATE POLICY "Authorized users can manage claim batches" ON insurance_claim_batches
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Insert Saudi insurance provider configurations
INSERT INTO insurance_provider_configs (
    provider_code, provider_name_en, provider_name_ar, supported_services,
    max_sessions_per_month, copay_amount, coverage_percentage, requires_pre_auth
) VALUES 
('BUPA', 'Bupa Arabia', 'بوبا العربية', ARRAY['ABA', 'SPEECH', 'OT', 'PT', 'ASSESSMENT'], 20, 50.00, 75.00, true),
('TAWUNIYA', 'Tawuniya', 'التعاونية', ARRAY['ABA', 'SPEECH', 'OT', 'ASSESSMENT'], 16, 75.00, 70.00, true),
('MEDGULF', 'MedGulf', 'مدجلف', ARRAY['SPEECH', 'OT', 'PT', 'ASSESSMENT'], 12, 100.00, 65.00, false),
('ALRAJHI', 'Al Rajhi Takaful', 'الراجحي تكافل', ARRAY['ABA', 'SPEECH', 'OT', 'ASSESSMENT'], 24, 25.00, 60.00, true),
('NPHIES', 'NPHIES Platform', 'منصة نفيس', ARRAY['ABA', 'SPEECH', 'OT', 'PT', 'ASSESSMENT', 'CONSULTATION'], 30, 0.00, 100.00, true)
ON CONFLICT (provider_code) DO NOTHING;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insurance_pre_auth_updated_at 
    BEFORE UPDATE ON insurance_pre_authorizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_provider_configs_updated_at 
    BEFORE UPDATE ON insurance_provider_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_batches_updated_at 
    BEFORE UPDATE ON insurance_claim_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create batch for multiple claims
CREATE OR REPLACE FUNCTION create_insurance_batch(
    p_insurance_provider VARCHAR,
    p_claim_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
    v_batch_id UUID;
    v_batch_number VARCHAR;
    v_total_claims INTEGER;
    v_total_amount DECIMAL(12,2);
BEGIN
    -- Generate batch number
    v_batch_number := p_insurance_provider || '-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
    
    -- Calculate totals
    SELECT COUNT(*), COALESCE(SUM(claim_amount), 0)
    INTO v_total_claims, v_total_amount
    FROM insurance_claims 
    WHERE id = ANY(p_claim_ids);
    
    -- Create batch
    INSERT INTO insurance_claim_batches (
        batch_number, insurance_provider, submission_date,
        total_claims, total_amount, status
    ) VALUES (
        v_batch_number, p_insurance_provider, CURRENT_DATE,
        v_total_claims, v_total_amount, 'created'
    ) RETURNING id INTO v_batch_id;
    
    -- Update claims with batch_id
    UPDATE insurance_claims 
    SET batch_id = v_batch_id
    WHERE id = ANY(p_claim_ids);
    
    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE insurance_pre_authorizations IS 'Pre-authorization requests for insurance coverage approval';
COMMENT ON TABLE insurance_claim_activities IS 'Activity log for all insurance claim processing events';
COMMENT ON TABLE insurance_provider_configs IS 'Configuration settings for Saudi insurance provider integrations';
COMMENT ON TABLE insurance_claim_batches IS 'Batch processing records for bulk insurance claim submissions';
COMMENT ON FUNCTION create_insurance_batch IS 'Creates a new batch for grouping insurance claims for submission';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON insurance_pre_authorizations TO authenticated;
GRANT SELECT, INSERT ON insurance_claim_activities TO authenticated;
GRANT SELECT ON insurance_provider_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON insurance_claim_batches TO authenticated;