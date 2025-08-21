-- Course Management System Database Schema
-- This migration creates comprehensive tables for course management, scheduling, and enrollments

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Course Information
    course_code VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: CRS-2025-001
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    
    -- Instructor Information
    instructor_id UUID REFERENCES auth.users(id),
    instructor_name TEXT, -- Manual entry if no auth user
    
    -- Scheduling Information
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_days TEXT[] NOT NULL DEFAULT '{}', -- ['monday', 'wednesday', 'friday']
    schedule_time VARCHAR(20) NOT NULL, -- '10:00-12:00'
    
    -- Capacity and Pricing
    max_students INTEGER NOT NULL DEFAULT 10 CHECK (max_students > 0),
    enrolled_students INTEGER DEFAULT 0 CHECK (enrolled_students >= 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- Course Status and Details
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    location TEXT,
    requirements TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Enrollment Information
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'pending')),
    
    -- Academic Information
    grade VARCHAR(10), -- A+, A, B+, etc.
    completion_date DATE,
    attendance_percentage DECIMAL(5,2), -- 0.00 to 100.00
    
    -- Payment Information
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
    amount_paid DECIMAL(10,2) DEFAULT 0.00 CHECK (amount_paid >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount_paid * (1 - discount_percentage/100)) STORED,
    
    -- Notes and Comments
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(student_id, course_id) -- One enrollment per student per course
);

-- Create course_sessions table for detailed session tracking
CREATE TABLE IF NOT EXISTS course_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Session Information
    session_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    session_time VARCHAR(20) NOT NULL, -- '10:00-12:00'
    duration_minutes INTEGER DEFAULT 120 CHECK (duration_minutes > 0),
    
    -- Session Details
    topic_ar TEXT,
    topic_en TEXT,
    objectives TEXT[],
    materials_needed TEXT[],
    homework_assigned TEXT,
    
    -- Session Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    completion_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(course_id, session_number)
);

-- Create course_attendance table for tracking student attendance
CREATE TABLE IF NOT EXISTS course_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    course_session_id UUID NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_status VARCHAR(20) DEFAULT 'absent' CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
    arrival_time TIME,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(course_session_id, student_id)
);

-- Create instructors table for instructor management
CREATE TABLE IF NOT EXISTS instructors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Personal Information
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Contact Information
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    
    -- Professional Information
    specialization_ar TEXT,
    specialization_en TEXT,
    qualifications TEXT[],
    experience_years INTEGER DEFAULT 0,
    hourly_rate DECIMAL(10,2),
    
    -- Employment Information
    employment_type VARCHAR(20) DEFAULT 'part_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'volunteer')),
    hire_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    
    -- Authorization
    user_id UUID REFERENCES auth.users(id), -- Link to auth user if they have login access
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_course_sessions_course ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_date ON course_sessions(session_date);

CREATE INDEX IF NOT EXISTS idx_course_attendance_session ON course_attendance(course_session_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_student ON course_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_instructors_status ON instructors(status);
CREATE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_enrollments_updated_at BEFORE UPDATE ON course_enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_sessions_updated_at BEFORE UPDATE ON course_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to generate unique course codes
CREATE OR REPLACE FUNCTION generate_course_code()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    new_code TEXT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequential number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(course_code FROM 'CRS-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM courses
    WHERE course_code LIKE 'CRS-' || current_year || '-%';
    
    -- Format the new code with zero padding
    new_code := 'CRS-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate course codes
CREATE OR REPLACE FUNCTION auto_generate_course_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.course_code IS NULL OR NEW.course_code = '' THEN
        NEW.course_code := generate_course_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_course_code
    BEFORE INSERT ON courses
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_course_code();

-- Function to update enrolled_students count
CREATE OR REPLACE FUNCTION update_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE courses 
        SET enrolled_students = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE course_id = NEW.course_id 
            AND status IN ('enrolled', 'completed')
        )
        WHERE id = NEW.course_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE courses 
        SET enrolled_students = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE course_id = NEW.course_id 
            AND status IN ('enrolled', 'completed')
        )
        WHERE id = NEW.course_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses 
        SET enrolled_students = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE course_id = OLD.course_id 
            AND status IN ('enrolled', 'completed')
        )
        WHERE id = OLD.course_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_count
    AFTER INSERT OR UPDATE OR DELETE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrollment_count();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Core courses table storing course information, scheduling, and basic details';
COMMENT ON TABLE course_enrollments IS 'Student enrollments in courses with payment and academic tracking';
COMMENT ON TABLE course_sessions IS 'Individual session details for each course including topics and status';
COMMENT ON TABLE course_attendance IS 'Student attendance tracking for each course session';
COMMENT ON TABLE instructors IS 'Instructor information and professional details';

COMMENT ON COLUMN courses.schedule_days IS 'Array of weekday names: monday, tuesday, wednesday, thursday, friday, saturday, sunday';
COMMENT ON COLUMN courses.schedule_time IS 'Time range in HH:MM-HH:MM format, e.g., 10:00-12:00';
COMMENT ON COLUMN course_enrollments.final_amount IS 'Calculated field: amount_paid * (1 - discount_percentage/100)';
COMMENT ON COLUMN instructors.qualifications IS 'Array of qualifications and certifications';

-- Insert sample data for testing
INSERT INTO instructors (
    first_name_ar, last_name_ar, first_name_en, last_name_en,
    email, phone, specialization_ar, specialization_en,
    qualifications, experience_years, hourly_rate
) VALUES 
(
    'سارة', 'أحمد', 'Sarah', 'Ahmed',
    'sarah.ahmed@example.com', '+966501234567',
    'العلاج النطقي', 'Speech Therapy',
    ARRAY['ماجستير العلاج النطقي', 'شهادة معتمدة في التخاطب'], 5, 150.00
),
(
    'محمد', 'عبدالله', 'Mohammed', 'Abdullah', 
    'mohammed.abdullah@example.com', '+966507654321',
    'العلاج الوظيفي', 'Occupational Therapy',
    ARRAY['دكتوراه العلاج الوظيفي', 'رخصة مزاولة مهنة'], 8, 200.00
),
(
    'فاطمة', 'خالد', 'Fatimah', 'Khalid',
    'fatimah.khalid@example.com', '+966509876543',
    'تطوير المهارات الحركية', 'Motor Skills Development',
    ARRAY['ماجستير العلاج الطبيعي', 'دبلوم تطوير المهارات'], 3, 120.00
);

-- Insert sample courses
INSERT INTO courses (
    name_ar, name_en, description_ar, description_en,
    instructor_name, start_date, end_date,
    schedule_days, schedule_time, max_students, price,
    status, location
) VALUES 
(
    'العلاج النطقي المتقدم', 'Advanced Speech Therapy',
    'دورة متقدمة في العلاج النطقي للأطفال', 'Advanced speech therapy course for children',
    'د. سارة أحمد', '2024-03-01', '2024-04-26',
    ARRAY['monday', 'wednesday'], '10:00-12:00', 20, 1500.00,
    'active', 'قاعة التدريب الأولى'
),
(
    'العلاج الوظيفي الأساسي', 'Basic Occupational Therapy',
    'أساسيات العلاج الوظيفي', 'Fundamentals of occupational therapy',
    'د. محمد عبدالله', '2024-04-01', '2024-05-13',
    ARRAY['tuesday', 'thursday'], '14:00-16:00', 15, 1200.00,
    'planned', 'قاعة التدريب الثانية'
),
(
    'تطوير المهارات الحركية', 'Motor Skills Development',
    'تطوير وتعزيز المهارات الحركية للأطفال', 'Developing and enhancing motor skills for children',
    'د. فاطمة خالد', '2024-01-15', '2024-03-26',
    ARRAY['sunday', 'tuesday', 'thursday'], '09:00-11:00', 15, 1800.00,
    'completed', 'صالة الأنشطة'
);

-- Create views for easy data retrieval
CREATE OR REPLACE VIEW course_summary AS
SELECT 
    c.id,
    c.course_code,
    c.name_ar,
    c.name_en,
    c.instructor_name,
    c.start_date,
    c.end_date,
    c.status,
    c.max_students,
    c.enrolled_students,
    c.price,
    ROUND((c.enrolled_students::NUMERIC / c.max_students * 100), 2) as occupancy_percentage,
    COUNT(cs.id) as total_sessions,
    COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions
FROM courses c
LEFT JOIN course_sessions cs ON c.id = cs.course_id
GROUP BY c.id, c.course_code, c.name_ar, c.name_en, c.instructor_name, 
         c.start_date, c.end_date, c.status, c.max_students, c.enrolled_students, c.price;

COMMENT ON VIEW course_summary IS 'Summary view of courses with enrollment statistics and session counts';