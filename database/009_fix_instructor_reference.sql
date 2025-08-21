-- Fix instructor_id foreign key constraint to reference instructors table instead of users table

-- Drop the existing constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

-- Add new constraint to reference instructors table
ALTER TABLE courses ADD CONSTRAINT courses_instructor_id_fkey 
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN courses.instructor_id IS 'References instructors.id for proper instructor assignment';