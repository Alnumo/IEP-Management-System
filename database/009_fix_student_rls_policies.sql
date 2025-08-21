-- Temporarily add a more permissive RLS policy for student creation during testing
-- This allows authenticated users to create students without requiring specific roles

-- Add a temporary policy for any authenticated user to create students
CREATE POLICY "Authenticated users can create students (testing)"
ON students
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also add a policy for any authenticated user to view students they created
CREATE POLICY "Users can view students they created (testing)"
ON students
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Add a policy for any authenticated user to update students they created
CREATE POLICY "Users can update students they created (testing)"
ON students
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Note: These are temporary testing policies. In production, you should use
-- proper role-based policies with is_admin(), is_receptionist(), etc.