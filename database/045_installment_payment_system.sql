-- Installment Payment System Schema Implementation
-- Story 4.2: installment-payment-system
-- This migration creates the database schema for managing installment payment plans

-- Create installment_plans table
CREATE TABLE IF NOT EXISTS installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  subscription_id UUID REFERENCES student_subscriptions(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  
  -- Plan details
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
  installment_amount NUMERIC(12, 2) NOT NULL CHECK (installment_amount > 0),
  frequency installment_frequency NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  
  -- Status
  status installment_plan_status NOT NULL DEFAULT 'active',
  
  -- Terms and conditions
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_date TIMESTAMP WITH TIME ZONE,
  late_fees_enabled BOOLEAN NOT NULL DEFAULT true,
  late_fee_amount NUMERIC(12, 2) CHECK (late_fee_amount >= 0),
  grace_period_days INTEGER NOT NULL DEFAULT 3 CHECK (grace_period_days >= 0),
  
  -- Reminder settings (JSONB for flexibility)
  reminder_settings JSONB NOT NULL DEFAULT '{
    "days_before_due": [7, 3, 1],
    "days_after_due": [1, 7, 14],
    "methods": ["email", "whatsapp"]
  }'::jsonb,
  
  -- Audit trail
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create installment_payments table for tracking individual payments
CREATE TABLE IF NOT EXISTS installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  installment_plan_id UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  
  -- Installment details
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  paid_amount NUMERIC(12, 2) CHECK (paid_amount >= 0),
  
  -- Status
  status installment_payment_status NOT NULL DEFAULT 'pending',
  
  -- Payment details
  payment_method payment_method_type,
  transaction_id TEXT,
  receipt_number TEXT,
  
  -- Late fees
  late_fee_applied BOOLEAN NOT NULL DEFAULT false,
  late_fee_amount NUMERIC(12, 2) DEFAULT 0 CHECK (late_fee_amount >= 0),
  
  -- Reminders tracking
  reminders_sent JSONB DEFAULT '[]'::jsonb,
  
  -- Notes
  notes TEXT,
  
  -- Audit trail
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create custom ENUM types
CREATE TYPE IF NOT EXISTS installment_frequency AS ENUM (
  'weekly',
  'biweekly', 
  'monthly'
);

CREATE TYPE IF NOT EXISTS installment_plan_status AS ENUM (
  'active',
  'completed',
  'cancelled',
  'defaulted'
);

CREATE TYPE IF NOT EXISTS installment_payment_status AS ENUM (
  'pending',
  'paid',
  'overdue',
  'partial'
);

CREATE TYPE IF NOT EXISTS payment_method_type AS ENUM (
  'cash',
  'mada',
  'visa',
  'mastercard',
  'stc_pay',
  'bank_transfer',
  'apple_pay',
  'google_pay',
  'insurance',
  'check'
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_installment_plans_subscription_id 
ON installment_plans(subscription_id);

CREATE INDEX IF NOT EXISTS idx_installment_plans_invoice_id 
ON installment_plans(invoice_id);

CREATE INDEX IF NOT EXISTS idx_installment_plans_student_id 
ON installment_plans(student_id);

CREATE INDEX IF NOT EXISTS idx_installment_plans_status 
ON installment_plans(status) WHERE status IN ('active', 'defaulted');

CREATE INDEX IF NOT EXISTS idx_installment_plans_start_date 
ON installment_plans(start_date);

CREATE INDEX IF NOT EXISTS idx_installment_payments_plan_id 
ON installment_payments(installment_plan_id);

CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date 
ON installment_payments(due_date);

CREATE INDEX IF NOT EXISTS idx_installment_payments_status 
ON installment_payments(status) WHERE status IN ('pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_installment_payments_status_due_date 
ON installment_payments(status, due_date) WHERE status IN ('pending', 'overdue');

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan_status_due 
ON installment_payments(installment_plan_id, status, due_date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_installment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_installment_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_installment_plans_updated_at_trigger
  BEFORE UPDATE ON installment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_plans_updated_at();

CREATE TRIGGER update_installment_payments_updated_at_trigger
  BEFORE UPDATE ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_payments_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on both tables
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

-- installment_plans RLS policies
CREATE POLICY "Users can view installment plans for their organization" 
ON installment_plans FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = installment_plans.student_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

CREATE POLICY "Admins and managers can insert installment plans" 
ON installment_plans FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'manager', 'receptionist') AND
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = installment_plans.student_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

CREATE POLICY "Admins and managers can update installment plans" 
ON installment_plans FOR UPDATE 
TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('admin', 'manager', 'receptionist') AND
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = installment_plans.student_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

-- installment_payments RLS policies
CREATE POLICY "Users can view installment payments for their organization" 
ON installment_payments FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM installment_plans ip
    JOIN students s ON s.id = ip.student_id
    WHERE ip.id = installment_payments.installment_plan_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

CREATE POLICY "Admins and managers can insert installment payments" 
ON installment_payments FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'manager', 'receptionist') AND
  EXISTS (
    SELECT 1 FROM installment_plans ip
    JOIN students s ON s.id = ip.student_id
    WHERE ip.id = installment_payments.installment_plan_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

CREATE POLICY "Admins and managers can update installment payments" 
ON installment_payments FOR UPDATE 
TO authenticated 
USING (
  auth.jwt() ->> 'role' IN ('admin', 'manager', 'receptionist') AND
  EXISTS (
    SELECT 1 FROM installment_plans ip
    JOIN students s ON s.id = ip.student_id
    WHERE ip.id = installment_payments.installment_plan_id 
    AND s.organization_id = auth.jwt() ->> 'organization_id'
  )
);

-- Create views for common queries

-- View for dashboard - active installment plans with payment status
CREATE OR REPLACE VIEW installment_dashboard_view AS
SELECT 
  ip.id,
  ip.student_id,
  s.name_ar as student_name_ar,
  s.name_en as student_name_en,
  ip.total_amount,
  ip.number_of_installments,
  ip.installment_amount,
  ip.frequency,
  ip.start_date,
  ip.status as plan_status,
  
  -- Payment statistics
  COUNT(ipt.*) as total_installments,
  COUNT(ipt.*) FILTER (WHERE ipt.status = 'paid') as paid_installments,
  COUNT(ipt.*) FILTER (WHERE ipt.status = 'pending') as pending_installments,
  COUNT(ipt.*) FILTER (WHERE ipt.status = 'overdue') as overdue_installments,
  COUNT(ipt.*) FILTER (WHERE ipt.status = 'partial') as partial_installments,
  
  -- Amount statistics
  COALESCE(SUM(ipt.paid_amount), 0) as total_paid,
  ip.total_amount - COALESCE(SUM(ipt.paid_amount), 0) as remaining_balance,
  
  -- Next due payment
  MIN(ipt.due_date) FILTER (WHERE ipt.status IN ('pending', 'overdue')) as next_due_date,
  MIN(ipt.amount) FILTER (WHERE ipt.status IN ('pending', 'overdue')) as next_due_amount,
  
  ip.created_at,
  ip.updated_at
FROM installment_plans ip
LEFT JOIN installment_payments ipt ON ipt.installment_plan_id = ip.id
LEFT JOIN students s ON s.id = ip.student_id
WHERE ip.status IN ('active')
GROUP BY ip.id, s.name_ar, s.name_en;

-- View for overdue installments
CREATE OR REPLACE VIEW overdue_installments_view AS
SELECT 
  ipt.id,
  ipt.installment_plan_id,
  ip.student_id,
  s.name_ar as student_name_ar,
  s.name_en as student_name_en,
  ipt.installment_number,
  ipt.amount,
  ipt.due_date,
  ipt.paid_amount,
  CURRENT_DATE - ipt.due_date as days_overdue,
  ipt.late_fee_applied,
  ipt.late_fee_amount,
  ipt.reminders_sent,
  ip.grace_period_days,
  ip.late_fees_enabled
FROM installment_payments ipt
JOIN installment_plans ip ON ip.id = ipt.installment_plan_id
JOIN students s ON s.id = ip.student_id
WHERE ipt.status = 'overdue' 
  AND ip.status = 'active'
  AND ipt.due_date < CURRENT_DATE;

-- Function to automatically generate installment payment records
CREATE OR REPLACE FUNCTION generate_installment_payments(plan_id UUID)
RETURNS VOID AS $$
DECLARE
  plan_record installment_plans%ROWTYPE;
  payment_date DATE;
  i INTEGER;
  days_increment INTEGER;
BEGIN
  -- Get the installment plan
  SELECT * INTO plan_record FROM installment_plans WHERE id = plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Installment plan not found';
  END IF;
  
  -- Calculate days increment based on frequency
  days_increment := CASE plan_record.frequency
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'monthly' THEN 30
  END;
  
  -- Generate installment payment records
  FOR i IN 1..plan_record.number_of_installments LOOP
    payment_date := plan_record.start_date + ((i - 1) * days_increment);
    
    INSERT INTO installment_payments (
      installment_plan_id,
      installment_number,
      amount,
      due_date,
      status,
      created_by,
      updated_by
    ) VALUES (
      plan_id,
      i,
      plan_record.installment_amount,
      payment_date,
      'pending',
      plan_record.created_by,
      plan_record.created_by
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update installment payment status based on due date
CREATE OR REPLACE FUNCTION update_overdue_installments()
RETURNS VOID AS $$
BEGIN
  -- Update pending payments that are past due date + grace period to overdue
  UPDATE installment_payments ipt
  SET 
    status = 'overdue',
    updated_at = NOW()
  FROM installment_plans ip
  WHERE ipt.installment_plan_id = ip.id
    AND ipt.status = 'pending'
    AND ipt.due_date + INTERVAL '1 day' * ip.grace_period_days < CURRENT_DATE
    AND ip.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment the tables and important columns
COMMENT ON TABLE installment_plans IS 'Installment payment plans for student therapy programs';
COMMENT ON TABLE installment_payments IS 'Individual installment payment records within payment plans';

COMMENT ON COLUMN installment_plans.reminder_settings IS 'JSON configuration for payment reminder scheduling';
COMMENT ON COLUMN installment_payments.reminders_sent IS 'Array of reminder delivery records with dates and methods';
COMMENT ON COLUMN installment_plans.grace_period_days IS 'Number of days after due date before marking as overdue';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON installment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON installment_payments TO authenticated;
GRANT SELECT ON installment_dashboard_view TO authenticated;
GRANT SELECT ON overdue_installments_view TO authenticated;