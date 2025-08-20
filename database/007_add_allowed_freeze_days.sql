-- Add allowed_freeze_days column to therapy_plans table
-- This field represents the number of days a subscription can be frozen

ALTER TABLE therapy_plans 
ADD COLUMN allowed_freeze_days INTEGER DEFAULT 30 CHECK (allowed_freeze_days >= 0);

-- Add comment to document the new column
COMMENT ON COLUMN therapy_plans.allowed_freeze_days IS 'Number of days a subscription can be frozen/suspended';

-- Update existing records to have a default value
UPDATE therapy_plans 
SET allowed_freeze_days = 30 
WHERE allowed_freeze_days IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE therapy_plans 
ALTER COLUMN allowed_freeze_days SET NOT NULL;