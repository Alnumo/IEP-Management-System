-- Add therapy_program_id field to students table
-- This allows linking students to specific therapy programs

ALTER TABLE students 
ADD COLUMN therapy_program_id UUID REFERENCES therapy_plans(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_students_therapy_program_id ON students(therapy_program_id);

-- Add comment for documentation
COMMENT ON COLUMN students.therapy_program_id IS 'Reference to the therapy plan assigned to this student';