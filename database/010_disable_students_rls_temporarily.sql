-- Temporarily disable RLS on students table for testing
-- This will allow student creation without authentication

-- Disable RLS on students table
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. In production, you should:
-- 1. Enable RLS: ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- 2. Use proper authentication and role-based policies
-- 3. Or create test users with proper roles in the profiles table