-- Rename instructors table and related references to therapists
-- This migration changes terminology from "instructor" to "therapist" throughout the database

-- Step 1: Rename the instructors table to therapists
ALTER TABLE instructors RENAME TO therapists;

-- Step 2: Update column names and references in courses table
-- Note: The foreign key constraint will be updated to reference therapists table
ALTER TABLE courses RENAME COLUMN instructor_id TO therapist_id;
ALTER TABLE courses RENAME COLUMN instructor_name TO therapist_name;

-- Step 3: Drop existing foreign key constraint (if exists)
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

-- Step 4: Add new foreign key constraint to reference therapists table
ALTER TABLE courses ADD CONSTRAINT courses_therapist_id_fkey 
    FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE SET NULL;

-- Step 5: Update indexes
DROP INDEX IF EXISTS idx_courses_instructor_id;
CREATE INDEX idx_courses_therapist_id ON courses(therapist_id);

-- Step 6: Update RLS policies for therapists table
-- Drop old policies
DROP POLICY IF EXISTS "instructors_read_policy" ON therapists;
DROP POLICY IF EXISTS "instructors_write_policy" ON therapists;

-- Create new policies with therapist naming
CREATE POLICY "therapists_read_policy" ON therapists
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "therapists_write_policy" ON therapists
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 7: Update comments and descriptions
COMMENT ON TABLE therapists IS 'Manages therapy specialists and their information';
COMMENT ON COLUMN courses.therapist_id IS 'References therapists.id for therapy specialist assignment';
COMMENT ON COLUMN courses.therapist_name IS 'Name of the assigned therapy specialist';

-- Step 8: Update any triggers or functions (if they reference the old table name)
-- Note: This may need to be done manually depending on existing functions

-- Step 9: Verification query (for logging purposes)
-- This will help verify the changes were applied correctly
SELECT 
    'Therapists table created: ' || CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'therapists'
    ) THEN 'YES' ELSE 'NO' END as status
UNION ALL
SELECT 
    'Courses.therapist_id column exists: ' || CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'therapist_id'
    ) THEN 'YES' ELSE 'NO' END as status
UNION ALL
SELECT 
    'Foreign key constraint exists: ' || CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_therapist_id_fkey'
    ) THEN 'YES' ELSE 'NO' END as status;