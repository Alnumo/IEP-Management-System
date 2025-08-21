-- Course Enrollments Table
-- Manages student enrollment in courses

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'pending')),
    grade VARCHAR(10),
    completion_date DATE,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT unique_student_course_enrollment UNIQUE (student_id, course_id),
    CONSTRAINT valid_amount_paid CHECK (amount_paid >= 0),
    CONSTRAINT valid_completion_date CHECK (completion_date IS NULL OR completion_date >= enrollment_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_enrollment_date ON course_enrollments(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_payment_status ON course_enrollments(payment_status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_course_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrollments_updated_at();

-- RLS Policies (initially disabled for testing)
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "course_enrollments_read_policy" ON course_enrollments
    FOR SELECT TO authenticated
    USING (true);

-- Allow insert/update/delete to all authenticated users (can be restricted later)
CREATE POLICY "course_enrollments_write_policy" ON course_enrollments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Function to update course enrolled_students count when enrollment changes
CREATE OR REPLACE FUNCTION update_course_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the enrolled_students count for the affected course(s)
    IF TG_OP = 'DELETE' THEN
        UPDATE courses 
        SET enrolled_students = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE course_id = OLD.course_id 
            AND status IN ('enrolled', 'completed')
        )
        WHERE id = OLD.course_id;
        RETURN OLD;
    ELSE
        UPDATE courses 
        SET enrolled_students = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE course_id = NEW.course_id 
            AND status IN ('enrolled', 'completed')
        )
        WHERE id = NEW.course_id;
        
        -- If this is an update and course_id changed, update the old course too
        IF TG_OP = 'UPDATE' AND OLD.course_id != NEW.course_id THEN
            UPDATE courses 
            SET enrolled_students = (
                SELECT COUNT(*) 
                FROM course_enrollments 
                WHERE course_id = OLD.course_id 
                AND status IN ('enrolled', 'completed')
            )
            WHERE id = OLD.course_id;
        END IF;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update enrolled_students count
CREATE TRIGGER trigger_update_course_enrolled_count_insert
    AFTER INSERT ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrolled_count();

CREATE TRIGGER trigger_update_course_enrolled_count_update
    AFTER UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrolled_count();

CREATE TRIGGER trigger_update_course_enrolled_count_delete
    AFTER DELETE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrolled_count();

-- Insert sample enrollment data
INSERT INTO course_enrollments (student_id, course_id, enrollment_date, status, payment_status, amount_paid, notes) VALUES
-- Course 1 enrollments
('123e4567-e89b-12d3-a456-426614174000', '7c41e8b5-8c91-4a97-b8f1-4d5e6f789012', '2024-01-15', 'enrolled', 'paid', 500.00, 'Regular enrollment'),
('123e4567-e89b-12d3-a456-426614174001', '7c41e8b5-8c91-4a97-b8f1-4d5e6f789012', '2024-01-16', 'enrolled', 'partial', 250.00, 'Partial payment received'),
('123e4567-e89b-12d3-a456-426614174002', '7c41e8b5-8c91-4a97-b8f1-4d5e6f789012', '2024-01-17', 'enrolled', 'paid', 500.00, 'Early bird discount applied'),

-- Course 2 enrollments  
('123e4567-e89b-12d3-a456-426614174003', '8d52f9c6-9d92-5ba8-c9g2-5e6f7g890123', '2024-02-01', 'enrolled', 'paid', 750.00, 'Premium enrollment'),
('123e4567-e89b-12d3-a456-426614174004', '8d52f9c6-9d92-5ba8-c9g2-5e6f7g890123', '2024-02-02', 'enrolled', 'pending', 0.00, 'Awaiting payment'),

-- Course 3 enrollments
('123e4567-e89b-12d3-a456-426614174005', '9e63g0d7-0e03-6cb9-d0h3-6f7g8h901234', '2024-01-20', 'completed', 'paid', 600.00, 'Successfully completed course'),
('123e4567-e89b-12d3-a456-426614174006', '9e63g0d7-0e03-6cb9-d0h3-6f7g8h901234', '2024-01-22', 'dropped', 'refunded', 0.00, 'Student withdrew, full refund issued'),

-- Course 4 enrollments
('123e4567-e89b-12d3-a456-426614174007', '0f74h1e8-1f14-7dca-e1i4-7g8h9i012345', '2024-03-01', 'enrolled', 'paid', 400.00, 'Scholarship recipient'),
('123e4567-e89b-12d3-a456-426614174008', '0f74h1e8-1f14-7dca-e1i4-7g8h9i012345', '2024-03-02', 'pending', 'pending', 0.00, 'Application under review'),

-- Course 5 enrollments
('123e4567-e89b-12d3-a456-426614174009', '1g85i2f9-2g25-8edb-f2j5-8h9i0j123456', '2024-02-15', 'enrolled', 'paid', 300.00, 'Group discount applied');

COMMENT ON TABLE course_enrollments IS 'Manages student enrollment in courses with payment tracking';
COMMENT ON COLUMN course_enrollments.status IS 'Enrollment status: enrolled, completed, dropped, pending';
COMMENT ON COLUMN course_enrollments.payment_status IS 'Payment status: pending, paid, partial, refunded';
COMMENT ON COLUMN course_enrollments.amount_paid IS 'Total amount paid by student for this course';
COMMENT ON COLUMN course_enrollments.grade IS 'Final grade received by student';
COMMENT ON COLUMN course_enrollments.completion_date IS 'Date when student completed the course';