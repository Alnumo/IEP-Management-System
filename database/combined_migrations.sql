-- Combined Migration File
-- Generated on: 2025-08-22T03:20:45.817Z
-- 
-- This file combines all migration files for easy execution in Supabase Dashboard
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file content
-- 3. Click "Run" to execute all migrations
--
-- Files included: 001_create_tables.sql, 002_create_policies.sql, 003_insert_seed_data.sql, 004_student_management_tables.sql, 005_student_management_policies.sql, 006_student_management_seed_data.sql, 007_add_allowed_freeze_days.sql, 008_add_therapy_program_id.sql, 008_create_course_enrollments.sql, 009_fix_instructor_reference.sql, 009_fix_student_rls_policies.sql, 010_disable_students_rls_temporarily.sql, 010_rename_instructors_to_therapists.sql, 011_create_courses_system.sql, 012_medical_foundation_schema.sql, 013_medical_policies.sql, 014_specialized_therapy_programs.sql, 015_therapy_programs_seed_data.sql, 016_assessment_clinical_documentation.sql, 017_assessment_seed_data.sql
-- =====================================================================

-- =====================================================================
-- Migration 1: 001_create_tables.sql
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create plan_categories table
CREATE TABLE plan_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL UNIQUE,
  name_en TEXT UNIQUE,
  description_ar TEXT,
  description_en TEXT,
  color_code TEXT DEFAULT '#3B82F6' CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  icon_name TEXT DEFAULT 'stethoscope',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create therapy_plans table
CREATE TABLE therapy_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  category_id UUID REFERENCES plan_categories(id),
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks > 0),
  sessions_per_week INTEGER NOT NULL CHECK (sessions_per_week > 0),
  total_sessions INTEGER GENERATED ALWAYS AS (duration_weeks * sessions_per_week) STORED,
  price_per_session DECIMAL(10,2) NOT NULL CHECK (price_per_session >= 0),
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (duration_weeks * sessions_per_week * price_per_session) STORED,
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  final_price DECIMAL(10,2) GENERATED ALWAYS AS (duration_weeks * sessions_per_week * price_per_session * (1 - discount_percentage/100)) STORED,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  prerequisites TEXT,
  target_age_min INTEGER,
  target_age_max INTEGER,
  max_students_per_session INTEGER DEFAULT 1,
  materials_needed JSONB DEFAULT '[]',
  learning_objectives JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_sessions table
CREATE TABLE plan_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES therapy_plans(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_name_ar TEXT NOT NULL,
  session_name_en TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  objectives_ar TEXT[],
  objectives_en TEXT[],
  materials_needed TEXT[],
  homework_activities TEXT[],
  assessment_criteria JSONB,
  is_assessment_session BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, session_number)
);

-- Create plan_templates table
CREATE TABLE plan_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  category_id UUID REFERENCES plan_categories(id),
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for user management
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'therapist_lead', 'receptionist')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_therapy_plans_category ON therapy_plans(category_id);
CREATE INDEX idx_therapy_plans_active ON therapy_plans(is_active);
CREATE INDEX idx_therapy_plans_featured ON therapy_plans(is_featured);
CREATE INDEX idx_therapy_plans_price ON therapy_plans(final_price);
CREATE INDEX idx_therapy_plans_created_at ON therapy_plans(created_at);

-- Full-text search indexes for Arabic and English
CREATE INDEX idx_therapy_plans_search_ar ON therapy_plans 
USING gin(to_tsvector('arabic', name_ar || ' ' || COALESCE(description_ar, '')));
CREATE INDEX idx_therapy_plans_search_en ON therapy_plans 
USING gin(to_tsvector('english', COALESCE(name_en, '') || ' ' || COALESCE(description_en, '')));

CREATE INDEX idx_plan_categories_active ON plan_categories(is_active);
CREATE INDEX idx_plan_categories_sort ON plan_categories(sort_order);

CREATE INDEX idx_plan_sessions_plan_id ON plan_sessions(plan_id);
CREATE INDEX idx_plan_sessions_number ON plan_sessions(session_number);

CREATE INDEX idx_profiles_role ON profiles(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_therapy_plans_updated_at BEFORE UPDATE ON therapy_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_categories_updated_at BEFORE UPDATE ON plan_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_sessions_updated_at BEFORE UPDATE ON plan_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_templates_updated_at BEFORE UPDATE ON plan_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- End of 001_create_tables.sql

-- =====================================================================
-- Migration 2: 002_create_policies.sql
-- =====================================================================

-- Enable Row Level Security
ALTER TABLE therapy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Therapy Plans Policies
CREATE POLICY "Anyone can view active therapy plans" ON therapy_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all therapy plans" ON therapy_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and managers can insert therapy plans" ON therapy_plans
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and managers can update therapy plans" ON therapy_plans
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and managers can delete therapy plans" ON therapy_plans
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Plan Categories Policies
CREATE POLICY "Anyone can view active categories" ON plan_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all categories" ON plan_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage categories" ON plan_categories
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Plan Sessions Policies
CREATE POLICY "View sessions of viewable plans" ON plan_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapy_plans 
      WHERE id = plan_sessions.plan_id 
      AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can view all sessions" ON plan_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and managers can manage sessions" ON plan_sessions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Plan Templates Policies
CREATE POLICY "View public templates" ON plan_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "View own templates" ON plan_templates
  FOR SELECT TO authenticated 
  USING (created_by = auth.uid());

CREATE POLICY "Admin can view all templates" ON plan_templates
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create templates" ON plan_templates
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates" ON plan_templates
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid());

CREATE POLICY "Admin can update all templates" ON plan_templates
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "Admin can manage all profiles" ON profiles
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'receptionist')
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- End of 002_create_policies.sql

-- =====================================================================
-- Migration 3: 003_insert_seed_data.sql
-- =====================================================================

-- Insert default categories
INSERT INTO plan_categories (name_ar, name_en, color_code, icon_name, sort_order) VALUES
('علاج النطق واللغة', 'Speech & Language Therapy', '#10B981', 'mic', 1),
('العلاج الوظيفي', 'Occupational Therapy', '#F59E0B', 'hand', 2),
('العلاج السلوكي', 'Behavioral Therapy', '#8B5CF6', 'brain', 3),
('العلاج الطبيعي', 'Physical Therapy', '#06B6D4', 'activity', 4),
('التربية الخاصة', 'Special Education', '#EF4444', 'book-open', 5),
('الدمج الحسي', 'Sensory Integration', '#84CC16', 'eye', 6);

-- Insert sample therapy plans
INSERT INTO therapy_plans (
  name_ar, name_en, description_ar, description_en,
  category_id, duration_weeks, sessions_per_week, price_per_session,
  discount_percentage, is_featured, target_age_min, target_age_max,
  materials_needed, learning_objectives, prerequisites
) VALUES
(
  'برنامج علاج النطق المتقدم',
  'Advanced Speech Therapy Program',
  'برنامج شامل لعلاج اضطرابات النطق واللغة للأطفال من عمر 3-8 سنوات',
  'Comprehensive program for treating speech and language disorders in children aged 3-8 years',
  (SELECT id FROM plan_categories WHERE name_ar = 'علاج النطق واللغة'),
  12, 2, 150.00, 10, true, 3, 8,
  '["بطاقات صور", "مرآة", "ألعاب تفاعلية", "كتب قصص"]'::jsonb,
  '["تحسين نطق الأصوات", "زيادة المفردات", "تطوير مهارات التواصل"]'::jsonb,
  'تقييم أولي لحالة الطفل'
),
(
  'برنامج العلاج الوظيفي للأطفال',
  'Pediatric Occupational Therapy',
  'برنامج مخصص لتطوير المهارات الحركية الدقيقة والكبيرة',
  'Specialized program for developing fine and gross motor skills',
  (SELECT id FROM plan_categories WHERE name_ar = 'العلاج الوظيفي'),
  16, 3, 120.00, 15, true, 2, 10,
  '["كرات علاجية", "أدوات حرفية", "ألعاب توازن"]'::jsonb,
  '["تحسين التوازن", "تطوير المهارات الحركية", "زيادة التناسق"]'::jsonb,
  'فحص طبي شامل'
),
(
  'برنامج تعديل السلوك',
  'Behavior Modification Program',
  'برنامج لتعديل السلوكيات غير المرغوبة وتعزيز السلوكيات الإيجابية',
  'Program for modifying unwanted behaviors and reinforcing positive behaviors',
  (SELECT id FROM plan_categories WHERE name_ar = 'العلاج السلوكي'),
  20, 2, 180.00, 5, false, 4, 12,
  '["جداول التعزيز", "بطاقات المراقبة", "ألعاب تحفيزية"]'::jsonb,
  '["تقليل السلوك المشكل", "زيادة الانتباه", "تحسين التفاعل الاجتماعي"]'::jsonb,
  'تقييم سلوكي شامل'
),
(
  'برنامج العلاج الطبيعي المكثف',
  'Intensive Physical Therapy',
  'برنامج علاج طبيعي مكثف لتحسين القوة والمرونة',
  'Intensive physical therapy program to improve strength and flexibility',
  (SELECT id FROM plan_categories WHERE name_ar = 'العلاج الطبيعي'),
  8, 4, 100.00, 20, false, 1, 15,
  '["أوزان خفيفة", "أحزمة مقاومة", "كرات علاجية"]'::jsonb,
  '["زيادة القوة العضلية", "تحسين المرونة", "تطوير التوازن"]'::jsonb,
  'موافقة طبية للعلاج الطبيعي'
);

-- Insert sample sessions for the first plan
WITH speech_plan AS (
  SELECT id FROM therapy_plans WHERE name_ar = 'برنامج علاج النطق المتقدم' LIMIT 1
),
session_numbers AS (
  SELECT generate_series(1, 24) as session_number
)
INSERT INTO plan_sessions (
  plan_id, session_number, session_name_ar, session_name_en,
  duration_minutes, objectives_ar, objectives_en, materials_needed,
  is_assessment_session
) 
SELECT 
  speech_plan.id,
  sn.session_number,
  CASE 
    WHEN sn.session_number = 1 THEN 'التقييم الأولي'
    WHEN sn.session_number <= 12 THEN 'تدريب النطق - المرحلة الأولى'
    ELSE 'تدريب النطق - المرحلة المتقدمة'
  END,
  CASE 
    WHEN sn.session_number = 1 THEN 'Initial Assessment'
    WHEN sn.session_number <= 12 THEN 'Speech Training - Phase 1'
    ELSE 'Speech Training - Advanced Phase'
  END,
  CASE 
    WHEN sn.session_number = 1 THEN 60
    ELSE 45
  END,
  ARRAY['تحسين النطق', 'زيادة الوضوح'],
  ARRAY['Improve articulation', 'Increase clarity'],
  ARRAY['مرآة', 'بطاقات صور', 'ألعاب'],
  sn.session_number = 1
FROM speech_plan, session_numbers sn;

-- Create some plan templates
INSERT INTO plan_templates (
  name_ar, name_en, description_ar, description_en,
  category_id, template_data, is_public
) VALUES
(
  'قالب علاج النطق الأساسي',
  'Basic Speech Therapy Template',
  'قالب أساسي لبرامج علاج النطق',
  'Basic template for speech therapy programs',
  (SELECT id FROM plan_categories WHERE name_ar = 'علاج النطق واللغة'),
  '{
    "duration_weeks": 8,
    "sessions_per_week": 2,
    "price_per_session": 120,
    "materials_needed": ["مرآة", "بطاقات صور", "ألعاب تفاعلية"],
    "learning_objectives": ["تحسين النطق", "زيادة المفردات"]
  }'::jsonb,
  true
),
(
  'قالب العلاج الوظيفي',
  'Occupational Therapy Template',
  'قالب لبرامج العلاج الوظيفي',
  'Template for occupational therapy programs',
  (SELECT id FROM plan_categories WHERE name_ar = 'العلاج الوظيفي'),
  '{
    "duration_weeks": 12,
    "sessions_per_week": 3,
    "price_per_session": 100,
    "materials_needed": ["كرات علاجية", "أدوات حرفية"],
    "learning_objectives": ["تحسين المهارات الحركية", "زيادة التناسق"]
  }'::jsonb,
  true
);

-- End of 003_insert_seed_data.sql

-- =====================================================================
-- Migration 4: 004_student_management_tables.sql
-- =====================================================================

-- Student Management System Tables
-- Phase 2: Database Schema for Students, Parents, and Document Management
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- STUDENTS TABLE
-- Core table for student information with bilingual support
-- =============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Personal Details
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
    nationality_ar TEXT DEFAULT 'سعودي',
    nationality_en TEXT DEFAULT 'Saudi',
    national_id VARCHAR(20) UNIQUE, -- Saudi National ID or Iqama
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Medical Information
    diagnosis_ar TEXT,
    diagnosis_en TEXT,
    severity_level VARCHAR(20) CHECK (severity_level IN ('mild', 'moderate', 'severe')),
    allergies_ar TEXT,
    allergies_en TEXT,
    medications_ar TEXT,
    medications_en TEXT,
    special_needs_ar TEXT,
    special_needs_en TEXT,
    
    -- Educational Information
    school_name_ar TEXT,
    school_name_en TEXT,
    grade_level VARCHAR(20),
    educational_support_ar TEXT,
    educational_support_en TEXT,
    
    -- Therapy Information
    referral_source_ar TEXT,
    referral_source_en TEXT,
    therapy_goals_ar TEXT,
    therapy_goals_en TEXT,
    
    -- System Fields
    registration_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: STU-2025-0001
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended')),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    last_assessment_date DATE,
    next_review_date DATE,
    
    -- File Attachments
    profile_photo_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_registration_number ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_name_ar ON students(first_name_ar, last_name_ar);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);

-- =============================================================================
-- PARENTS/GUARDIANS TABLE
-- Information about parents and guardians with relationship types
-- =============================================================================
CREATE TABLE IF NOT EXISTS parents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Personal Details
    relationship_to_student VARCHAR(20) CHECK (relationship_to_student IN ('father', 'mother', 'guardian', 'caregiver', 'other')) NOT NULL,
    national_id VARCHAR(20) UNIQUE, -- Saudi National ID or Iqama
    date_of_birth DATE,
    nationality_ar TEXT DEFAULT 'سعودي',
    nationality_en TEXT DEFAULT 'Saudi',
    
    -- Contact Information
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    preferred_contact_method VARCHAR(20) DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'email', 'whatsapp', 'sms')),
    preferred_language VARCHAR(5) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    
    -- Address Information
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Professional Information
    occupation_ar TEXT,
    occupation_en TEXT,
    employer_ar TEXT,
    employer_en TEXT,
    work_phone VARCHAR(20),
    
    -- Emergency Contact Priority
    is_primary_contact BOOLEAN DEFAULT false,
    is_emergency_contact BOOLEAN DEFAULT false,
    can_pickup_student BOOLEAN DEFAULT false,
    
    -- Communication Preferences
    receive_appointment_reminders BOOLEAN DEFAULT true,
    receive_progress_updates BOOLEAN DEFAULT true,
    receive_newsletters BOOLEAN DEFAULT true,
    receive_emergency_notifications BOOLEAN DEFAULT true,
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_primary_phone ON parents(primary_phone);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_national_id ON parents(national_id);
CREATE INDEX IF NOT EXISTS idx_parents_name_ar ON parents(first_name_ar, last_name_ar);

-- =============================================================================
-- STUDENT-PARENT RELATIONSHIPS
-- Many-to-many relationship between students and parents
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_parents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    
    -- Relationship Details
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('father', 'mother', 'guardian', 'caregiver', 'emergency_contact')),
    is_primary_guardian BOOLEAN DEFAULT false,
    custody_details_ar TEXT,
    custody_details_en TEXT,
    
    -- Permissions
    can_authorize_treatment BOOLEAN DEFAULT false,
    can_pickup_student BOOLEAN DEFAULT false,
    can_access_records BOOLEAN DEFAULT false,
    can_receive_reports BOOLEAN DEFAULT false,
    
    -- Contact Priority
    contact_priority INTEGER DEFAULT 1, -- 1 = primary, 2 = secondary, etc.
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique student-parent relationships
    UNIQUE(student_id, parent_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON student_parents(parent_id);

-- =============================================================================
-- EMERGENCY CONTACTS
-- Additional emergency contacts beyond parents
-- =============================================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Contact Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    
    -- Relationship and Contact Details
    relationship_ar TEXT NOT NULL, -- e.g., "عم", "خال", "صديق العائلة"
    relationship_en TEXT,
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Address Information
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT,
    city_en TEXT,
    
    -- Permissions and Priority
    contact_priority INTEGER DEFAULT 1, -- 1 = first emergency contact, 2 = second, etc.
    can_pickup_student BOOLEAN DEFAULT false,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_student_id ON emergency_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(student_id, contact_priority);

-- =============================================================================
-- STUDENT DOCUMENTS
-- File management for student documents and medical records
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Document Information (Bilingual)
    document_name_ar TEXT NOT NULL,
    document_name_en TEXT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'medical_report', 'assessment_report', 'therapy_plan', 'progress_report',
        'educational_report', 'psychological_evaluation', 'speech_evaluation',
        'occupational_evaluation', 'behavioral_plan', 'iep', 'legal_document',
        'insurance_document', 'photo', 'other'
    )),
    
    -- File Information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_size BIGINT, -- File size in bytes
    file_type VARCHAR(50), -- MIME type
    file_url TEXT, -- Supabase public URL (if public)
    
    -- Document Metadata
    document_date DATE,
    expiry_date DATE,
    is_confidential BOOLEAN DEFAULT true,
    requires_authorization BOOLEAN DEFAULT false,
    
    -- Description and Notes (Bilingual)
    description_ar TEXT,
    description_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON student_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_student_documents_date ON student_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents(status);

-- =============================================================================
-- MEDICAL HISTORY
-- Detailed medical history and health information
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Medical Condition Information (Bilingual)
    condition_name_ar TEXT NOT NULL,
    condition_name_en TEXT,
    diagnosis_code VARCHAR(20), -- ICD-10 or similar
    
    -- Medical Details
    date_diagnosed DATE,
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'managed', 'inactive')),
    
    -- Treatment Information (Bilingual)
    treatment_ar TEXT,
    treatment_en TEXT,
    medications_ar TEXT,
    medications_en TEXT,
    side_effects_ar TEXT,
    side_effects_en TEXT,
    
    -- Healthcare Provider Information (Bilingual)
    doctor_name_ar TEXT,
    doctor_name_en TEXT,
    hospital_clinic_ar TEXT,
    hospital_clinic_en TEXT,
    doctor_phone VARCHAR(20),
    doctor_email VARCHAR(255),
    
    -- Additional Information (Bilingual)
    symptoms_ar TEXT,
    symptoms_en TEXT,
    triggers_ar TEXT,
    triggers_en TEXT,
    precautions_ar TEXT,
    precautions_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- System Fields
    requires_immediate_attention BOOLEAN DEFAULT false,
    affects_therapy BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_history_student_id ON medical_history(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_status ON medical_history(status);
CREATE INDEX IF NOT EXISTS idx_medical_history_immediate_attention ON medical_history(requires_immediate_attention);

-- =============================================================================
-- STUDENT THERAPY PLANS
-- Assignment of therapy plans to students with customization
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_therapy_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_plan_id UUID NOT NULL REFERENCES therapy_plans(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'paused', 'cancelled')),
    
    -- Plan Customization (Bilingual)
    custom_goals_ar TEXT,
    custom_goals_en TEXT,
    custom_notes_ar TEXT,
    custom_notes_en TEXT,
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_milestone_ar TEXT,
    current_milestone_en TEXT,
    
    -- Pricing and Billing
    agreed_price DECIMAL(10, 2),
    payment_schedule VARCHAR(20) DEFAULT 'monthly' CHECK (payment_schedule IN ('weekly', 'monthly', 'quarterly', 'full')),
    discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    total_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Therapist Assignment
    primary_therapist_id UUID REFERENCES auth.users(id),
    secondary_therapist_id UUID REFERENCES auth.users(id),
    
    -- Scheduling Information
    sessions_per_week INTEGER DEFAULT 2,
    session_duration_minutes INTEGER DEFAULT 45,
    preferred_time_slot VARCHAR(20), -- e.g., "morning", "afternoon", "evening"
    preferred_days TEXT, -- JSON array of preferred days
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique active plan per student per therapy type
    UNIQUE(student_id, therapy_plan_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_student_id ON student_therapy_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_therapy_plan_id ON student_therapy_plans(therapy_plan_id);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_status ON student_therapy_plans(status);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_start_date ON student_therapy_plans(start_date);
CREATE INDEX IF NOT EXISTS idx_student_therapy_plans_therapist ON student_therapy_plans(primary_therapist_id);

-- =============================================================================
-- STUDENT ASSESSMENTS
-- Track various assessments and evaluations
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Assessment Information (Bilingual)
    assessment_name_ar TEXT NOT NULL,
    assessment_name_en TEXT,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN (
        'initial_assessment', 'progress_assessment', 'final_assessment',
        'speech_evaluation', 'occupational_evaluation', 'psychological_evaluation',
        'educational_assessment', 'behavioral_assessment', 'cognitive_assessment'
    )),
    
    -- Assessment Details
    assessment_date DATE NOT NULL,
    conducted_by UUID REFERENCES auth.users(id),
    duration_minutes INTEGER,
    
    -- Results and Scores
    overall_score DECIMAL(5, 2),
    max_possible_score DECIMAL(5, 2),
    percentage_score DECIMAL(5, 2),
    performance_level VARCHAR(20) CHECK (performance_level IN ('below_average', 'average', 'above_average', 'excellent')),
    
    -- Detailed Results (Bilingual)
    strengths_ar TEXT,
    strengths_en TEXT,
    weaknesses_ar TEXT,
    weaknesses_en TEXT,
    recommendations_ar TEXT,
    recommendations_en TEXT,
    
    -- Assessment Data (JSON for flexible structure)
    assessment_data JSONB,
    
    -- File Attachments
    report_file_path TEXT, -- Supabase Storage path for full report
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    is_baseline BOOLEAN DEFAULT false, -- Mark as baseline assessment
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_id ON student_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_type ON student_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_student_assessments_date ON student_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_student_assessments_conducted_by ON student_assessments(conducted_by);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables that have updated_at column
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_parents_updated_at BEFORE UPDATE ON student_parents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON student_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON medical_history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_therapy_plans_updated_at BEFORE UPDATE ON student_therapy_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_assessments_updated_at BEFORE UPDATE ON student_assessments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================================================

-- Generate unique registration number for students
CREATE OR REPLACE FUNCTION generate_student_registration_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    registration_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(students.registration_number FROM 'STU-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM students
    WHERE students.registration_number LIKE 'STU-' || current_year || '-%';
    
    -- Format with leading zeros
    registration_number := 'STU-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN registration_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate registration number before insert
CREATE OR REPLACE FUNCTION set_student_registration_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_number IS NULL OR NEW.registration_number = '' THEN
        NEW.registration_number := generate_student_registration_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_student_registration_number
    BEFORE INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION set_student_registration_number();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE students IS 'Core table storing comprehensive student information with bilingual support';
COMMENT ON TABLE parents IS 'Parent and guardian information with contact preferences and permissions';
COMMENT ON TABLE student_parents IS 'Many-to-many relationship between students and their parents/guardians';
COMMENT ON TABLE emergency_contacts IS 'Additional emergency contacts beyond parents for each student';
COMMENT ON TABLE student_documents IS 'File management system for student documents and medical records';
COMMENT ON TABLE medical_history IS 'Detailed medical history and health information for each student';
COMMENT ON TABLE student_therapy_plans IS 'Assignment and tracking of therapy plans for students';
COMMENT ON TABLE student_assessments IS 'Various assessments and evaluations conducted for students';

-- End of Student Management Schema
-- This schema provides a comprehensive foundation for managing students,
-- their relationships, medical information, documents, and therapy assignments
-- in the Arkan Al-Numo Center ERP system.

-- End of 004_student_management_tables.sql

-- =====================================================================
-- Migration 5: 005_student_management_policies.sql
-- =====================================================================

-- Row Level Security Policies for Student Management System
-- Phase 2: Security policies for student data protection and access control
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_therapy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- =============================================================================

-- Function to check if current user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') = 'admin' OR
      (auth.jwt() ->> 'user_role') = 'manager',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a therapist
CREATE OR REPLACE FUNCTION is_therapist()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') IN ('therapist_lead', 'therapist', 'admin', 'manager'),
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a receptionist
CREATE OR REPLACE FUNCTION is_receptionist()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() ->> 'user_role') IN ('receptionist', 'admin', 'manager'),
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is assigned to a specific student
CREATE OR REPLACE FUNCTION is_assigned_therapist(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM student_therapy_plans stp
    WHERE stp.student_id = student_uuid
    AND (stp.primary_therapist_id = auth.uid() OR stp.secondary_therapist_id = auth.uid())
    AND stp.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a parent of a specific student
CREATE OR REPLACE FUNCTION is_student_parent(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM student_parents sp
    JOIN parents p ON p.id = sp.parent_id
    WHERE sp.student_id = student_uuid
    AND p.email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STUDENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all students"
ON students
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can view students they are assigned to
CREATE POLICY "Therapists can view assigned students"
ON students
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(id) OR
    is_admin()
  )
);

-- Receptionists: Can view and create students for registration
CREATE POLICY "Receptionists can manage students for registration"
ON students
FOR ALL
TO authenticated
USING (is_receptionist());

-- Parents: Can view their own children's basic information
CREATE POLICY "Parents can view their children"
ON students
FOR SELECT
TO authenticated
USING (is_student_parent(id));

-- Therapists can update students they are assigned to (limited fields)
CREATE POLICY "Therapists can update assigned students"
ON students
FOR UPDATE
TO authenticated
USING (
  is_therapist() AND is_assigned_therapist(id)
)
WITH CHECK (
  is_therapist() AND is_assigned_therapist(id)
);

-- =============================================================================
-- PARENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all parents"
ON parents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage parents for registration
CREATE POLICY "Receptionists can manage parents"
ON parents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view parents of their assigned students
CREATE POLICY "Therapists can view parents of assigned students"
ON parents
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    EXISTS (
      SELECT 1 FROM student_parents sp
      WHERE sp.parent_id = parents.id
      AND is_assigned_therapist(sp.student_id)
    ) OR is_admin()
  )
);

-- Parents: Can view and update their own information
CREATE POLICY "Parents can manage their own information"
ON parents
FOR ALL
TO authenticated
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- =============================================================================
-- STUDENT_PARENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student-parent relationships"
ON student_parents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage relationships for registration
CREATE POLICY "Receptionists can manage student-parent relationships"
ON student_parents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view relationships for their assigned students
CREATE POLICY "Therapists can view student-parent relationships for assigned students"
ON student_parents
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view relationships for their children
CREATE POLICY "Parents can view their relationships with children"
ON student_parents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parents p
    WHERE p.id = parent_id AND p.email = auth.email()
  )
);

-- =============================================================================
-- EMERGENCY_CONTACTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all emergency contacts"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage emergency contacts
CREATE POLICY "Receptionists can manage emergency contacts"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view emergency contacts for assigned students
CREATE POLICY "Therapists can view emergency contacts for assigned students"
ON emergency_contacts
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view and manage emergency contacts for their children
CREATE POLICY "Parents can manage emergency contacts for their children"
ON emergency_contacts
FOR ALL
TO authenticated
USING (is_student_parent(student_id))
WITH CHECK (is_student_parent(student_id));

-- =============================================================================
-- STUDENT_DOCUMENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student documents"
ON student_documents
FOR ALL
TO authenticated
USING (is_admin());

-- Receptionists: Can manage documents for registration
CREATE POLICY "Receptionists can manage student documents"
ON student_documents
FOR ALL
TO authenticated
USING (is_receptionist());

-- Therapists: Can view and upload documents for assigned students
CREATE POLICY "Therapists can manage documents for assigned students"
ON student_documents
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Parents: Can view documents that are not confidential for their children
CREATE POLICY "Parents can view non-confidential documents for their children"
ON student_documents
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  (is_confidential = false OR NOT requires_authorization)
);

-- Parents: Can upload certain types of documents for their children
CREATE POLICY "Parents can upload documents for their children"
ON student_documents
FOR INSERT
TO authenticated
WITH CHECK (
  is_student_parent(student_id) AND
  document_type IN ('medical_report', 'educational_report', 'other')
);

-- =============================================================================
-- MEDICAL_HISTORY TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all medical history"
ON medical_history
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can view and update medical history for assigned students
CREATE POLICY "Therapists can manage medical history for assigned students"
ON medical_history
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR is_admin()
  )
);

-- Receptionists: Can view medical history for registration purposes
CREATE POLICY "Receptionists can view medical history"
ON medical_history
FOR SELECT
TO authenticated
USING (is_receptionist());

-- Parents: Can view non-sensitive medical history for their children
CREATE POLICY "Parents can view medical history for their children"
ON medical_history
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  NOT requires_immediate_attention
);

-- =============================================================================
-- STUDENT_THERAPY_PLANS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student therapy plans"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can manage therapy plans for their assigned students
CREATE POLICY "Therapists can manage therapy plans for assigned students"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    primary_therapist_id = auth.uid() OR
    secondary_therapist_id = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    primary_therapist_id = auth.uid() OR
    secondary_therapist_id = auth.uid() OR
    is_admin()
  )
);

-- Receptionists: Can view and assign therapy plans
CREATE POLICY "Receptionists can manage therapy plan assignments"
ON student_therapy_plans
FOR ALL
TO authenticated
USING (is_receptionist());

-- Parents: Can view therapy plans for their children (limited information)
CREATE POLICY "Parents can view therapy plans for their children"
ON student_therapy_plans
FOR SELECT
TO authenticated
USING (is_student_parent(student_id));

-- =============================================================================
-- STUDENT_ASSESSMENTS TABLE POLICIES
-- =============================================================================

-- Admin and Manager: Full access
CREATE POLICY "Admins can manage all student assessments"
ON student_assessments
FOR ALL
TO authenticated
USING (is_admin());

-- Therapists: Can manage assessments for their assigned students
CREATE POLICY "Therapists can manage assessments for assigned students"
ON student_assessments
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    conducted_by = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    conducted_by = auth.uid() OR
    is_admin()
  )
);

-- Receptionists: Can view assessments for scheduling and coordination
CREATE POLICY "Receptionists can view student assessments"
ON student_assessments
FOR SELECT
TO authenticated
USING (is_receptionist());

-- Parents: Can view assessment results for their children
CREATE POLICY "Parents can view assessments for their children"
ON student_assessments
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  status = 'completed'
);

-- =============================================================================
-- SPECIAL POLICIES FOR DATA PRIVACY
-- =============================================================================

-- Ensure users can only see their own authentication data
CREATE POLICY "Users can only see their own auth data"
ON auth.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- =============================================================================
-- FUNCTIONS FOR AUDIT LOGGING
-- =============================================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_role TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Function to log sensitive data changes
CREATE OR REPLACE FUNCTION log_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to sensitive tables
    IF TG_TABLE_NAME IN ('students', 'medical_history', 'student_documents') THEN
        INSERT INTO audit_logs (
            table_name,
            operation,
            record_id,
            old_data,
            new_data,
            user_id,
            user_role
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid(),
            (auth.jwt() ->> 'user_role')
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_students_changes
    AFTER INSERT OR UPDATE OR DELETE ON students
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

CREATE TRIGGER audit_medical_history_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_history
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

CREATE TRIGGER audit_student_documents_changes
    AFTER INSERT OR UPDATE OR DELETE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin or manager role';
COMMENT ON FUNCTION is_therapist() IS 'Check if current user has therapist role';
COMMENT ON FUNCTION is_receptionist() IS 'Check if current user has receptionist role';
COMMENT ON FUNCTION is_assigned_therapist(UUID) IS 'Check if current user is assigned as therapist to specific student';
COMMENT ON FUNCTION is_student_parent(UUID) IS 'Check if current user is parent of specific student';
COMMENT ON FUNCTION log_sensitive_changes() IS 'Audit function to log changes to sensitive data';

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive data changes and access';

-- End of Student Management Security Policies
-- These policies ensure proper data access control and privacy protection
-- for student information in compliance with healthcare data regulations

-- End of 005_student_management_policies.sql

-- =====================================================================
-- Migration 6: 006_student_management_seed_data.sql
-- =====================================================================

-- Seed Data for Student Management System
-- Phase 2: Sample data for testing student registration and management
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- SAMPLE STUDENTS DATA
-- =============================================================================

-- Insert sample students
INSERT INTO students (
    first_name_ar, last_name_ar, first_name_en, last_name_en,
    date_of_birth, gender, nationality_ar, nationality_en,
    national_id, phone, email,
    address_ar, address_en, city_ar, city_en,
    diagnosis_ar, diagnosis_en, severity_level,
    allergies_ar, allergies_en,
    school_name_ar, school_name_en, grade_level,
    referral_source_ar, referral_source_en,
    therapy_goals_ar, therapy_goals_en,
    status, enrollment_date
) VALUES
-- Student 1: Ahmed Al-Rashid
(
    'أحمد', 'الراشد', 'Ahmed', 'Al-Rashid',
    '2018-05-15', 'male', 'سعودي', 'Saudi',
    '1234567890', '+966501234567', 'ahmed.parent@email.com',
    'حي النرجس، شارع الأمير سلطان', 'Al-Narjes District, Prince Sultan Street', 'الرياض', 'Riyadh',
    'تأخر في النطق واللغة', 'Speech and Language Delay', 'moderate',
    'حساسية من الفول السوداني', 'Peanut Allergy',
    'مدرسة النور الابتدائية', 'Al-Noor Elementary School', 'Grade 1',
    'طبيب الأطفال', 'Pediatrician',
    'تحسين النطق وزيادة المفردات', 'Improve speech clarity and vocabulary',
    'active', '2024-09-01'
),
-- Student 2: Fatima Al-Zahra
(
    'فاطمة', 'الزهراء', 'Fatima', 'Al-Zahra',
    '2017-03-22', 'female', 'سعودي', 'Saudi',
    '1234567891', '+966501234568', 'fatima.parent@email.com',
    'حي الملك فهد، شارع العليا', 'King Fahd District, Al-Olaya Street', 'الرياض', 'Riyadh',
    'اضطراب طيف التوحد', 'Autism Spectrum Disorder', 'mild',
    'لا توجد حساسيات معروفة', 'No known allergies',
    'مدرسة الفيصلية', 'Al-Faisaliah School', 'Grade 2',
    'مركز التوحد', 'Autism Center',
    'تطوير المهارات الاجتماعية والتواصل', 'Develop social skills and communication',
    'active', '2024-08-15'
),
-- Student 3: Omar Al-Mahmoud
(
    'عمر', 'المحمود', 'Omar', 'Al-Mahmoud',
    '2019-11-08', 'male', 'سعودي', 'Saudi',
    '1234567892', '+966501234569', 'omar.parent@email.com',
    'حي الياسمين، شارع الملك عبدالعزيز', 'Al-Yasmin District, King Abdulaziz Street', 'الرياض', 'Riyadh',
    'صعوبات في التعلم', 'Learning Difficulties', 'moderate',
    'حساسية من اللاكتوز', 'Lactose Intolerance',
    'مدرسة الروضة الأهلية', 'Al-Rawda Private School', 'KG2',
    'أخصائي نفسي', 'Psychologist',
    'تحسين المهارات الأكاديمية والتركيز', 'Improve academic skills and focus',
    'active', '2024-10-01'
),
-- Student 4: Noor Al-Anzi
(
    'نور', 'العنزي', 'Noor', 'Al-Anzi',
    '2016-07-12', 'female', 'سعودي', 'Saudi',
    '1234567893', '+966501234570', 'noor.parent@email.com',
    'حي الربوة، شارع التحلية', 'Al-Rabwa District, Tahlia Street', 'الرياض', 'Riyadh',
    'متلازمة داون', 'Down Syndrome', 'moderate',
    'لا توجد حساسيات', 'No allergies',
    'مدرسة التربية الخاصة', 'Special Education School', 'Grade 3',
    'طبيب الأطفال', 'Pediatrician',
    'تطوير المهارات الحركية والاستقلالية', 'Develop motor skills and independence',
    'active', '2024-07-20'
);

-- =============================================================================
-- SAMPLE PARENTS DATA
-- =============================================================================

-- Insert sample parents
INSERT INTO parents (
    first_name_ar, last_name_ar, first_name_en, last_name_en,
    relationship_to_student, national_id,
    primary_phone, secondary_phone, email, whatsapp_number,
    preferred_contact_method, preferred_language,
    address_ar, address_en, city_ar, city_en,
    occupation_ar, occupation_en,
    is_primary_contact, is_emergency_contact, can_pickup_student,
    receive_appointment_reminders, receive_progress_updates
) VALUES
-- Ahmed's Father
(
    'خالد', 'الراشد', 'Khalid', 'Al-Rashid',
    'father', '2234567890',
    '+966501111111', '+966112345678', 'khalid.rashid@email.com', '+966501111111',
    'whatsapp', 'ar',
    'حي النرجس، شارع الأمير سلطان', 'Al-Narjes District, Prince Sultan Street', 'الرياض', 'Riyadh',
    'مهندس', 'Engineer',
    true, true, true,
    true, true
),
-- Ahmed's Mother
(
    'عائشة', 'الراشد', 'Aisha', 'Al-Rashid',
    'mother', '3234567890',
    '+966501111112', null, 'aisha.rashid@email.com', '+966501111112',
    'phone', 'ar',
    'حي النرجس، شارع الأمير سلطان', 'Al-Narjes District, Prince Sultan Street', 'الرياض', 'Riyadh',
    'ربة منزل', 'Homemaker',
    true, true, true,
    true, true
),
-- Fatima's Father
(
    'محمد', 'الزهراء', 'Mohammed', 'Al-Zahra',
    'father', '2234567891',
    '+966501111113', '+966112345679', 'mohammed.zahra@email.com', '+966501111113',
    'whatsapp', 'ar',
    'حي الملك فهد، شارع العليا', 'King Fahd District, Al-Olaya Street', 'الرياض', 'Riyadh',
    'طبيب', 'Doctor',
    true, true, true,
    true, true
),
-- Fatima's Mother
(
    'زينب', 'الزهراء', 'Zainab', 'Al-Zahra',
    'mother', '3234567891',
    '+966501111114', null, 'zainab.zahra@email.com', '+966501111114',
    'phone', 'ar',
    'حي الملك فهد، شارع العليا', 'King Fahd District, Al-Olaya Street', 'الرياض', 'Riyadh',
    'معلمة', 'Teacher',
    true, true, true,
    true, true
),
-- Omar's Father
(
    'عبدالله', 'المحمود', 'Abdullah', 'Al-Mahmoud',
    'father', '2234567892',
    '+966501111115', '+966112345680', 'abdullah.mahmoud@email.com', '+966501111115',
    'email', 'ar',
    'حي الياسمين، شارع الملك عبدالعزيز', 'Al-Yasmin District, King Abdulaziz Street', 'الرياض', 'Riyadh',
    'رجل أعمال', 'Businessman',
    true, true, true,
    true, true
),
-- Omar's Mother
(
    'سارة', 'المحمود', 'Sara', 'Al-Mahmoud',
    'mother', '3234567892',
    '+966501111116', null, 'sara.mahmoud@email.com', '+966501111116',
    'whatsapp', 'ar',
    'حي الياسمين، شارع الملك عبدالعزيز', 'Al-Yasmin District, King Abdulaziz Street', 'الرياض', 'Riyadh',
    'مصممة', 'Designer',
    true, true, true,
    true, true
),
-- Noor's Father
(
    'فهد', 'العنزي', 'Fahd', 'Al-Anzi',
    'father', '2234567893',
    '+966501111117', '+966112345681', 'fahd.anzi@email.com', '+966501111117',
    'phone', 'ar',
    'حي الربوة، شارع التحلية', 'Al-Rabwa District, Tahlia Street', 'الرياض', 'Riyadh',
    'محاسب', 'Accountant',
    true, true, true,
    true, true
),
-- Noor's Mother
(
    'منى', 'العنزي', 'Mona', 'Al-Anzi',
    'mother', '3234567893',
    '+966501111118', null, 'mona.anzi@email.com', '+966501111118',
    'whatsapp', 'ar',
    'حي الربوة، شارع التحلية', 'Al-Rabwa District, Tahlia Street', 'الرياض', 'Riyadh',
    'ممرضة', 'Nurse',
    true, true, true,
    true, true
);

-- =============================================================================
-- LINK STUDENTS WITH PARENTS
-- =============================================================================

-- Link students with their parents
INSERT INTO student_parents (
    student_id, parent_id, relationship_type,
    is_primary_guardian, can_authorize_treatment,
    can_pickup_student, can_access_records, can_receive_reports,
    contact_priority
) 
SELECT 
    s.id as student_id,
    p.id as parent_id,
    p.relationship_to_student as relationship_type,
    true as is_primary_guardian,
    true as can_authorize_treatment,
    true as can_pickup_student,
    true as can_access_records,
    true as can_receive_reports,
    CASE WHEN p.relationship_to_student = 'father' THEN 1 ELSE 2 END as contact_priority
FROM students s
JOIN parents p ON (
    (s.first_name_ar = 'أحمد' AND p.first_name_ar IN ('خالد', 'عائشة')) OR
    (s.first_name_ar = 'فاطمة' AND p.first_name_ar IN ('محمد', 'زينب')) OR
    (s.first_name_ar = 'عمر' AND p.first_name_ar IN ('عبدالله', 'سارة')) OR
    (s.first_name_ar = 'نور' AND p.first_name_ar IN ('فهد', 'منى'))
);

-- =============================================================================
-- SAMPLE EMERGENCY CONTACTS
-- =============================================================================

-- Insert emergency contacts for students
INSERT INTO emergency_contacts (
    student_id, first_name_ar, last_name_ar, first_name_en, last_name_en,
    relationship_ar, relationship_en, primary_phone, email,
    address_ar, address_en, contact_priority, can_pickup_student
)
SELECT 
    s.id,
    'أحمد', 'الراشد', 'Ahmed', 'Al-Rashid',
    'العم', 'Uncle', '+966501222222', 'uncle.rashid@email.com',
    'حي الملك فيصل', 'King Faisal District', 1, true
FROM students s WHERE s.first_name_ar = 'أحمد'
UNION ALL
SELECT 
    s.id,
    'سلمى', 'الزهراء', 'Salma', 'Al-Zahra',
    'الخالة', 'Aunt', '+966501222223', 'aunt.zahra@email.com',
    'حي الوادي', 'Al-Wadi District', 1, true
FROM students s WHERE s.first_name_ar = 'فاطمة'
UNION ALL
SELECT 
    s.id,
    'ناصر', 'المحمود', 'Nasser', 'Al-Mahmoud',
    'الجد', 'Grandfather', '+966501222224', 'grandfather.mahmoud@email.com',
    'حي السليمانية', 'Al-Sulimaniyah District', 1, false
FROM students s WHERE s.first_name_ar = 'عمر'
UNION ALL
SELECT 
    s.id,
    'هند', 'العنزي', 'Hind', 'Al-Anzi',
    'الجدة', 'Grandmother', '+966501222225', 'grandmother.anzi@email.com',
    'حي المروج', 'Al-Murooj District', 1, true
FROM students s WHERE s.first_name_ar = 'نور';

-- =============================================================================
-- SAMPLE MEDICAL HISTORY
-- =============================================================================

-- Insert medical history for students
INSERT INTO medical_history (
    student_id, condition_name_ar, condition_name_en,
    date_diagnosed, severity, status,
    treatment_ar, treatment_en,
    doctor_name_ar, doctor_name_en,
    hospital_clinic_ar, hospital_clinic_en,
    doctor_phone, symptoms_ar, symptoms_en,
    requires_immediate_attention, affects_therapy
)
SELECT 
    s.id,
    'تأخر في النطق', 'Speech Delay',
    '2020-03-15'::DATE, 'moderate', 'active',
    'جلسات علاج النطق', 'Speech therapy sessions',
    'د. أحمد السالم', 'Dr. Ahmed Al-Salem',
    'مستشفى الملك فيصل التخصصي', 'King Faisal Specialist Hospital',
    '+966112345555', 
    'صعوبة في نطق الأصوات', 'Difficulty pronouncing sounds',
    false, true
FROM students s WHERE s.first_name_ar = 'أحمد'
UNION ALL
SELECT 
    s.id,
    'اضطراب طيف التوحد', 'Autism Spectrum Disorder',
    '2019-11-20'::DATE, 'mild', 'active',
    'العلاج السلوكي والتعليمي', 'Behavioral and educational therapy',
    'د. فاطمة النور', 'Dr. Fatima Al-Noor',
    'مركز الأمير سلطان للتوحد', 'Prince Sultan Autism Center',
    '+966112345556',
    'صعوبات في التفاعل الاجتماعي', 'Difficulties in social interaction',
    false, true
FROM students s WHERE s.first_name_ar = 'فاطمة'
UNION ALL
SELECT 
    s.id,
    'صعوبات التعلم', 'Learning Difficulties',
    '2021-05-10'::DATE, 'moderate', 'active',
    'التعليم المتخصص', 'Specialized education',
    'د. سارة الحربي', 'Dr. Sara Al-Harbi',
    'مركز صعوبات التعلم', 'Learning Difficulties Center',
    '+966112345557',
    'صعوبة في القراءة والكتابة', 'Difficulty in reading and writing',
    false, true
FROM students s WHERE s.first_name_ar = 'عمر'
UNION ALL
SELECT 
    s.id,
    'متلازمة داون', 'Down Syndrome',
    '2016-07-12'::DATE, 'moderate', 'active',
    'العلاج المتعدد التخصصات', 'Multi-disciplinary therapy',
    'د. محمد القحطاني', 'Dr. Mohammed Al-Qahtani',
    'مستشفى الأطفال', 'Children''s Hospital',
    '+966112345558',
    'تأخر في النمو', 'Developmental delays',
    false, true
FROM students s WHERE s.first_name_ar = 'نور';

-- =============================================================================
-- SAMPLE THERAPY PLAN ASSIGNMENTS
-- =============================================================================

-- Assign therapy plans to students
INSERT INTO student_therapy_plans (
    student_id, therapy_plan_id, start_date, end_date,
    status, custom_goals_ar, custom_goals_en,
    agreed_price, payment_schedule, sessions_per_week,
    session_duration_minutes, preferred_time_slot
)
SELECT 
    s.id, 
    tp.id,
    '2024-09-01'::DATE, '2024-12-01'::DATE,
    'active',
    'تحسين نطق الأصوات الصعبة', 'Improve pronunciation of difficult sounds',
    3200.00, 'monthly', 2, 45, 'morning'
FROM students s
JOIN therapy_plans tp ON tp.name_ar = 'برنامج علاج النطق المتقدم'
WHERE s.first_name_ar = 'أحمد'
UNION ALL
SELECT 
    s.id, 
    tp.id,
    '2024-08-15'::DATE, '2024-12-15'::DATE,
    'active',
    'تطوير التفاعل الاجتماعي', 'Develop social interaction skills',
    4200.00, 'monthly', 3, 45, 'afternoon'
FROM students s
JOIN therapy_plans tp ON tp.name_ar = 'برنامج تعديل السلوك'
WHERE s.first_name_ar = 'فاطمة'
UNION ALL
SELECT 
    s.id, 
    tp.id,
    '2024-10-01'::DATE, '2025-02-01'::DATE,
    'active',
    'تحسين المهارات الأكاديمية', 'Improve academic skills',
    2800.00, 'monthly', 2, 60, 'afternoon'
FROM students s
JOIN therapy_plans tp ON tp.name_ar = 'برنامج العلاج الوظيفي للأطفال'
WHERE s.first_name_ar = 'عمر'
UNION ALL
SELECT 
    s.id, 
    tp.id,
    '2024-07-20'::DATE, '2024-11-20'::DATE,
    'active',
    'تطوير المهارات الحركية', 'Develop motor skills',
    3800.00, 'monthly', 3, 45, 'morning'
FROM students s
JOIN therapy_plans tp ON tp.name_ar = 'برنامج العلاج المكثف'
WHERE s.first_name_ar = 'نور';

-- =============================================================================
-- SAMPLE ASSESSMENTS
-- =============================================================================

-- Insert sample assessments
INSERT INTO student_assessments (
    student_id, assessment_name_ar, assessment_name_en,
    assessment_type, assessment_date, duration_minutes,
    overall_score, max_possible_score, percentage_score,
    performance_level, strengths_ar, strengths_en,
    weaknesses_ar, weaknesses_en, recommendations_ar, recommendations_en,
    status, is_baseline
)
SELECT 
    s.id,
    'تقييم النطق الأولي', 'Initial Speech Assessment',
    'initial_assessment', '2024-08-20'::DATE, 60,
    65.0, 100.0, 65.0, 'average',
    'نطق واضح للأصوات البسيطة', 'Clear pronunciation of simple sounds',
    'صعوبة في الأصوات المركبة', 'Difficulty with complex sounds',
    'زيادة جلسات النطق', 'Increase speech therapy sessions',
    'completed', true
FROM students s WHERE s.first_name_ar = 'أحمد'
UNION ALL
SELECT 
    s.id,
    'تقييم السلوك الأولي', 'Initial Behavioral Assessment',
    'behavioral_assessment', '2024-08-10'::DATE, 90,
    70.0, 100.0, 70.0, 'above_average',
    'استجابة جيدة للتعليمات', 'Good response to instructions',
    'تحديات في التفاعل الاجتماعي', 'Challenges in social interaction',
    'التركيز على المهارات الاجتماعية', 'Focus on social skills',
    'completed', true
FROM students s WHERE s.first_name_ar = 'فاطمة'
UNION ALL
SELECT 
    s.id,
    'تقييم صعوبات التعلم', 'Learning Difficulties Assessment',
    'educational_assessment', '2024-09-25'::DATE, 120,
    55.0, 100.0, 55.0, 'below_average',
    'ذاكرة بصرية جيدة', 'Good visual memory',
    'صعوبة في الذاكرة السمعية', 'Difficulty with auditory memory',
    'استخدام أساليب التعلم البصري', 'Use visual learning methods',
    'completed', true
FROM students s WHERE s.first_name_ar = 'عمر'
UNION ALL
SELECT 
    s.id,
    'تقييم المهارات الحركية', 'Motor Skills Assessment',
    'occupational_evaluation', '2024-07-15'::DATE, 75,
    60.0, 100.0, 60.0, 'average',
    'مهارات حركية كبيرة جيدة', 'Good gross motor skills',
    'تحديات في المهارات الدقيقة', 'Challenges in fine motor skills',
    'التركيز على الأنشطة الحركية الدقيقة', 'Focus on fine motor activities',
    'completed', true
FROM students s WHERE s.first_name_ar = 'نور';

-- =============================================================================
-- SAMPLE DOCUMENT RECORDS (File paths would be added when files are uploaded)
-- =============================================================================

-- Insert sample document records
INSERT INTO student_documents (
    student_id, document_name_ar, document_name_en,
    document_type, file_name, file_path, document_date,
    description_ar, description_en, is_confidential
)
SELECT 
    s.id,
    'تقرير طبي أولي', 'Initial Medical Report',
    'medical_report', 'ahmed_medical_report.pdf', '/student_documents/ahmed_medical_report.pdf',
    '2024-08-15'::DATE,
    'تقرير طبي شامل للحالة', 'Comprehensive medical report',
    true
FROM students s WHERE s.first_name_ar = 'أحمد'
UNION ALL
SELECT 
    s.id,
    'تقرير التوحد', 'Autism Evaluation Report',
    'assessment_report', 'fatima_autism_report.pdf', '/student_documents/fatima_autism_report.pdf',
    '2024-08-05'::DATE,
    'تقرير تشخيص التوحد', 'Autism diagnosis report',
    true
FROM students s WHERE s.first_name_ar = 'فاطمة'
UNION ALL
SELECT 
    s.id,
    'تقرير صعوبات التعلم', 'Learning Difficulties Report',
    'educational_report', 'omar_learning_report.pdf', '/student_documents/omar_learning_report.pdf',
    '2024-09-20'::DATE,
    'تقييم صعوبات التعلم', 'Learning difficulties evaluation',
    true
FROM students s WHERE s.first_name_ar = 'عمر'
UNION ALL
SELECT 
    s.id,
    'صورة شخصية', 'Profile Photo',
    'photo', 'noor_profile.jpg', '/student_documents/noor_profile.jpg',
    '2024-07-20'::DATE,
    'صورة شخصية للطالبة', 'Student profile photo',
    false
FROM students s WHERE s.first_name_ar = 'نور';

-- =============================================================================
-- UPDATE STATISTICS AND SEQUENCES
-- =============================================================================

-- Update table statistics for better query performance
ANALYZE students;
ANALYZE parents;
ANALYZE student_parents;
ANALYZE emergency_contacts;
ANALYZE student_documents;
ANALYZE medical_history;
ANALYZE student_therapy_plans;
ANALYZE student_assessments;

-- Add helpful comments for data understanding
COMMENT ON TABLE students IS 'Contains 4 sample students with diverse conditions and backgrounds';
COMMENT ON TABLE parents IS 'Contains 8 parents (2 per student) with complete contact information';
COMMENT ON TABLE student_parents IS 'Links students with their parents with proper permissions';
COMMENT ON TABLE emergency_contacts IS 'Additional emergency contacts for each student';
COMMENT ON TABLE medical_history IS 'Medical conditions and treatment information for each student';
COMMENT ON TABLE student_therapy_plans IS 'Active therapy plan assignments with pricing';
COMMENT ON TABLE student_assessments IS 'Baseline assessments for all students';
COMMENT ON TABLE student_documents IS 'Sample document records (actual files would be uploaded separately)';

-- End of Student Management Seed Data
-- This provides a comprehensive set of test data for the student management system
-- including students, parents, medical history, therapy assignments, and assessments

-- End of 006_student_management_seed_data.sql

-- =====================================================================
-- Migration 7: 007_add_allowed_freeze_days.sql
-- =====================================================================

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

-- End of 007_add_allowed_freeze_days.sql

-- =====================================================================
-- Migration 8: 008_add_therapy_program_id.sql
-- =====================================================================

-- Add therapy_program_id field to students table
-- This allows linking students to specific therapy programs

ALTER TABLE students 
ADD COLUMN therapy_program_id UUID REFERENCES therapy_plans(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_students_therapy_program_id ON students(therapy_program_id);

-- Add comment for documentation
COMMENT ON COLUMN students.therapy_program_id IS 'Reference to the therapy plan assigned to this student';

-- End of 008_add_therapy_program_id.sql

-- =====================================================================
-- Migration 9: 008_create_course_enrollments.sql
-- =====================================================================

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

-- End of 008_create_course_enrollments.sql

-- =====================================================================
-- Migration 10: 009_fix_instructor_reference.sql
-- =====================================================================

-- Fix instructor_id foreign key constraint to reference instructors table instead of users table

-- Drop the existing constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

-- Add new constraint to reference instructors table
ALTER TABLE courses ADD CONSTRAINT courses_instructor_id_fkey 
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN courses.instructor_id IS 'References instructors.id for proper instructor assignment';

-- End of 009_fix_instructor_reference.sql

-- =====================================================================
-- Migration 11: 009_fix_student_rls_policies.sql
-- =====================================================================

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

-- End of 009_fix_student_rls_policies.sql

-- =====================================================================
-- Migration 12: 010_disable_students_rls_temporarily.sql
-- =====================================================================

-- Temporarily disable RLS on students table for testing
-- This will allow student creation without authentication

-- Disable RLS on students table
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. In production, you should:
-- 1. Enable RLS: ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- 2. Use proper authentication and role-based policies
-- 3. Or create test users with proper roles in the profiles table

-- End of 010_disable_students_rls_temporarily.sql

-- =====================================================================
-- Migration 13: 010_rename_instructors_to_therapists.sql
-- =====================================================================

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

-- End of 010_rename_instructors_to_therapists.sql

-- =====================================================================
-- Migration 14: 011_create_courses_system.sql
-- =====================================================================

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

-- End of 011_create_courses_system.sql

-- =====================================================================
-- Migration 15: 012_medical_foundation_schema.sql
-- =====================================================================

-- =====================================================================
-- Migration 12: Medical Foundation Schema Extensions
-- Phase 1: Healthcare compliance and medical record management
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- MEDICAL RECORDS TABLE
-- Core table for comprehensive medical record management with encryption
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Medical Identification
    medical_record_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: MED-2025-0001
    primary_diagnosis_code TEXT[], -- ICD-10 codes array
    secondary_diagnosis_codes TEXT[], -- Additional ICD-10 codes
    
    -- Comprehensive Medical History (Encrypted JSONB)
    medical_history JSONB DEFAULT '{}', -- Encrypted medical data
    current_medications JSONB DEFAULT '{}', -- Medication details with dosages
    allergies TEXT[], -- Known allergies list
    emergency_protocol TEXT, -- Emergency procedures specific to patient
    
    -- Vital Information
    blood_type VARCHAR(5), -- A+, B-, O+, etc.
    weight_kg DECIMAL(5,2), -- Current weight in kg
    height_cm DECIMAL(5,2), -- Current height in cm
    bmi DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN height_cm > 0 THEN weight_kg / POWER(height_cm / 100, 2)
            ELSE NULL 
        END
    ) STORED,
    
    -- Medical Team Information
    primary_physician_ar TEXT,
    primary_physician_en TEXT,
    primary_physician_phone VARCHAR(20),
    primary_physician_email VARCHAR(255),
    hospital_clinic_ar TEXT,
    hospital_clinic_en TEXT,
    
    -- Insurance Information
    insurance_provider_ar TEXT,
    insurance_provider_en TEXT,
    policy_number VARCHAR(50),
    insurance_expiry_date DATE,
    coverage_details JSONB DEFAULT '{}',
    
    -- Emergency Contacts (Medical)
    emergency_medical_contact_name_ar TEXT,
    emergency_medical_contact_name_en TEXT,
    emergency_medical_contact_phone VARCHAR(20),
    emergency_medical_contact_relationship_ar TEXT,
    emergency_medical_contact_relationship_en TEXT,
    
    -- Medical Restrictions and Precautions
    activity_restrictions_ar TEXT,
    activity_restrictions_en TEXT,
    dietary_restrictions_ar TEXT,
    dietary_restrictions_en TEXT,
    medication_allergies TEXT[],
    environmental_allergies TEXT[],
    
    -- Therapy-Related Medical Information
    contraindications_ar TEXT, -- Medical reasons to avoid certain therapies
    contraindications_en TEXT,
    special_accommodations_ar TEXT, -- Required medical accommodations
    special_accommodations_en TEXT,
    therapy_clearance_date DATE, -- Date cleared for therapy activities
    therapy_clearance_notes_ar TEXT,
    therapy_clearance_notes_en TEXT,
    
    -- Compliance and Security
    last_medical_review_date DATE,
    next_review_due_date DATE,
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(100), -- Reference to encryption key
    data_classification VARCHAR(20) DEFAULT 'confidential' CHECK (
        data_classification IN ('public', 'internal', 'confidential', 'restricted')
    ),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    audit_log JSONB DEFAULT '[]' -- Audit trail for all changes
);

-- Add indexes for medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_student_id ON medical_records(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_number ON medical_records(medical_record_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_diagnosis ON medical_records USING GIN(primary_diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_review_date ON medical_records(next_review_due_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_insurance ON medical_records(insurance_provider_ar, policy_number);

-- =============================================================================
-- MEDICAL CONSULTANTS TABLE
-- Healthcare professionals and medical supervision
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_consultants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID REFERENCES therapists(id), -- Link to existing therapist if applicable
    
    -- Professional Information (Bilingual)
    first_name_ar TEXT NOT NULL,
    last_name_ar TEXT NOT NULL,
    first_name_en TEXT,
    last_name_en TEXT,
    title_ar TEXT, -- د., أ.د., بروفيسور
    title_en TEXT, -- Dr., Prof., etc.
    
    -- Medical Credentials
    license_number TEXT NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL, -- Medical Doctor, Specialist, etc.
    license_expiry_date DATE,
    license_issuing_authority_ar TEXT,
    license_issuing_authority_en TEXT,
    
    -- Specialization Information
    primary_specialization_ar TEXT NOT NULL,
    primary_specialization_en TEXT,
    secondary_specializations TEXT[], -- Additional specialties
    board_certifications TEXT[], -- Board certifications
    fellowship_training TEXT[], -- Fellowship details
    
    -- Practice Information
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    education_background JSONB DEFAULT '{}', -- Medical education details
    professional_memberships TEXT[], -- Medical associations
    
    -- Contact Information
    primary_phone VARCHAR(20),
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    
    -- Practice Address
    clinic_name_ar TEXT,
    clinic_name_en TEXT,
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT DEFAULT 'الرياض',
    city_en TEXT DEFAULT 'Riyadh',
    postal_code VARCHAR(10),
    
    -- Supervision Details
    supervision_level VARCHAR(30) CHECK (supervision_level IN (
        'attending_physician', 'consulting_physician', 'supervising_specialist',
        'medical_director', 'clinical_consultant', 'external_consultant'
    )),
    supervision_scope_ar TEXT,
    supervision_scope_en TEXT,
    available_hours JSONB DEFAULT '{}', -- Availability schedule
    
    -- Center-Specific Information
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    contract_type VARCHAR(20) CHECK (contract_type IN (
        'full_time', 'part_time', 'consultant', 'on_call', 'contractual'
    )),
    hourly_rate DECIMAL(10,2),
    consultation_fee DECIMAL(10,2),
    
    -- Emergency Availability
    emergency_contact BOOLEAN DEFAULT false,
    emergency_phone VARCHAR(20),
    emergency_availability_notes_ar TEXT,
    emergency_availability_notes_en TEXT,
    
    -- Performance and Quality
    patient_satisfaction_rating DECIMAL(3,2) CHECK (
        patient_satisfaction_rating >= 0 AND patient_satisfaction_rating <= 5
    ),
    clinical_performance_notes JSONB DEFAULT '{}',
    
    -- Status and Compliance
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'suspended', 'on_leave', 'terminated'
    )),
    background_check_date DATE,
    background_check_status VARCHAR(20),
    insurance_coverage JSONB DEFAULT '{}', -- Professional liability insurance
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for medical consultants
CREATE INDEX IF NOT EXISTS idx_medical_consultants_license ON medical_consultants(license_number);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_specialization ON medical_consultants(primary_specialization_ar);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_status ON medical_consultants(status);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_supervision ON medical_consultants(supervision_level);
CREATE INDEX IF NOT EXISTS idx_medical_consultants_name_ar ON medical_consultants(first_name_ar, last_name_ar);

-- =============================================================================
-- CLINICAL DOCUMENTATION TABLE
-- SOAP notes and clinical session documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS clinical_documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE, -- Link to therapy session
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    medical_consultant_id UUID REFERENCES medical_consultants(id),
    
    -- Documentation Type
    documentation_type VARCHAR(30) DEFAULT 'soap_note' CHECK (documentation_type IN (
        'soap_note', 'progress_note', 'assessment_note', 'consultation_note',
        'incident_report', 'medical_review', 'discharge_summary'
    )),
    
    -- SOAP Notes Structure (Encrypted JSONB)
    soap_notes JSONB DEFAULT '{}', -- Complete SOAP documentation
    
    -- Subjective (Patient/Parent Report)
    subjective_ar TEXT,
    subjective_en TEXT,
    parent_report_ar TEXT,
    parent_report_en TEXT,
    patient_mood_ar TEXT,
    patient_mood_en TEXT,
    recent_events_ar TEXT,
    recent_events_en TEXT,
    
    -- Objective (Clinical Observations)
    objective_ar TEXT,
    objective_en TEXT,
    observed_behaviors TEXT[],
    vital_signs JSONB DEFAULT '{}', -- If applicable
    physical_observations_ar TEXT,
    physical_observations_en TEXT,
    
    -- Assessment (Clinical Analysis)
    assessment_ar TEXT NOT NULL,
    assessment_en TEXT,
    clinical_impression_ar TEXT,
    clinical_impression_en TEXT,
    progress_toward_goals_ar TEXT,
    progress_toward_goals_en TEXT,
    concerns_identified TEXT[],
    risk_factors TEXT[],
    
    -- Plan (Treatment Plan)
    plan_ar TEXT NOT NULL,
    plan_en TEXT,
    next_session_focus_ar TEXT,
    next_session_focus_en TEXT,
    home_program_ar TEXT,
    home_program_en TEXT,
    recommendations TEXT[],
    referrals_needed TEXT[],
    
    -- Behavioral Data (Quantitative)
    behavioral_data JSONB DEFAULT '{}', -- Structured behavioral observations
    frequency_data JSONB DEFAULT '{}', -- Behavior frequency tracking
    duration_data JSONB DEFAULT '{}', -- Activity duration tracking
    intensity_scores JSONB DEFAULT '{}', -- Behavior intensity ratings
    
    -- Progress Metrics (Quantitative)
    progress_metrics JSONB DEFAULT '{}', -- Measurable progress indicators
    goal_achievement_percentage INTEGER CHECK (
        goal_achievement_percentage >= 0 AND goal_achievement_percentage <= 100
    ),
    session_effectiveness_rating INTEGER CHECK (
        session_effectiveness_rating >= 1 AND session_effectiveness_rating <= 5
    ),
    
    -- Interventions Used
    interventions_used TEXT[],
    materials_utilized TEXT[],
    modifications_made_ar TEXT,
    modifications_made_en TEXT,
    
    -- Session Details
    session_date DATE NOT NULL,
    session_duration_minutes INTEGER,
    session_location_ar TEXT,
    session_location_en TEXT,
    attendees TEXT[], -- Who was present during session
    
    -- Medical Considerations
    medical_observations_ar TEXT,
    medical_observations_en TEXT,
    medication_effects_noted_ar TEXT,
    medication_effects_noted_en TEXT,
    side_effects_observed TEXT[],
    contraindications_noted TEXT[],
    
    -- Follow-up Requirements
    follow_up_needed BOOLEAN DEFAULT false,
    follow_up_timeframe VARCHAR(20),
    follow_up_type VARCHAR(30),
    urgency_level VARCHAR(20) DEFAULT 'routine' CHECK (urgency_level IN (
        'routine', 'urgent', 'immediate', 'scheduled'
    )),
    
    -- Quality and Compliance
    is_encrypted BOOLEAN DEFAULT true,
    requires_medical_review BOOLEAN DEFAULT false,
    reviewed_by_medical_consultant UUID REFERENCES medical_consultants(id),
    medical_review_date DATE,
    medical_review_notes_ar TEXT,
    medical_review_notes_en TEXT,
    
    -- Digital Signatures
    therapist_signature JSONB DEFAULT '{}', -- Digital signature data
    medical_consultant_signature JSONB DEFAULT '{}',
    parent_acknowledgment JSONB DEFAULT '{}',
    
    -- Status and Workflow
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    approval_workflow JSONB DEFAULT '{}', -- Approval process tracking
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for clinical documentation
CREATE INDEX IF NOT EXISTS idx_clinical_docs_session_id ON clinical_documentation(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_student_id ON clinical_documentation(student_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_date ON clinical_documentation(session_date);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_type ON clinical_documentation(documentation_type);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_status ON clinical_documentation(status);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_consultant ON clinical_documentation(medical_consultant_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_follow_up ON clinical_documentation(follow_up_needed, urgency_level);

-- =============================================================================
-- MEDICAL SUPERVISION ASSIGNMENTS
-- Track which consultants supervise which students/therapists
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_supervision_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medical_consultant_id UUID NOT NULL REFERENCES medical_consultants(id),
    student_id UUID REFERENCES students(id), -- If supervising specific student
    therapist_id UUID REFERENCES therapists(id), -- If supervising specific therapist
    therapy_plan_id UUID REFERENCES therapy_plans(id), -- If supervising specific plan
    
    -- Supervision Details
    supervision_type VARCHAR(30) CHECK (supervision_type IN (
        'direct_patient_care', 'therapist_supervision', 'program_oversight',
        'case_consultation', 'emergency_consultation', 'periodic_review'
    )),
    
    -- Schedule Information
    supervision_frequency VARCHAR(20), -- weekly, bi-weekly, monthly, as-needed
    scheduled_days TEXT[], -- Days of week for supervision
    supervision_duration_minutes INTEGER DEFAULT 60,
    
    -- Supervision Scope
    scope_description_ar TEXT,
    scope_description_en TEXT,
    responsibilities TEXT[],
    authority_level VARCHAR(20) CHECK (authority_level IN (
        'advisory', 'oversight', 'direct_supervision', 'full_authority'
    )),
    
    -- Communication Preferences
    communication_method VARCHAR(20) DEFAULT 'in_person' CHECK (communication_method IN (
        'in_person', 'video_call', 'phone', 'written_reports', 'combination'
    )),
    emergency_contact_required BOOLEAN DEFAULT false,
    
    -- Assignment Dates
    assignment_start_date DATE DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'paused', 'completed', 'terminated'
    )),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    
    -- Ensure logical constraints
    CHECK (
        (student_id IS NOT NULL) OR 
        (therapist_id IS NOT NULL) OR 
        (therapy_plan_id IS NOT NULL)
    )
);

-- Add indexes for supervision assignments
CREATE INDEX IF NOT EXISTS idx_supervision_consultant ON medical_supervision_assignments(medical_consultant_id);
CREATE INDEX IF NOT EXISTS idx_supervision_student ON medical_supervision_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_supervision_therapist ON medical_supervision_assignments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_supervision_type ON medical_supervision_assignments(supervision_type);
CREATE INDEX IF NOT EXISTS idx_supervision_status ON medical_supervision_assignments(status);

-- =============================================================================
-- UPDATE EXISTING TABLES FOR MEDICAL COMPLIANCE
-- =============================================================================

-- Add medical supervision fields to therapy_plans
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS requires_medical_supervision BOOLEAN DEFAULT false;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_clearance_required BOOLEAN DEFAULT false;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS contraindications TEXT[];
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_precautions_ar TEXT;
ALTER TABLE therapy_plans ADD COLUMN IF NOT EXISTS medical_precautions_en TEXT;

-- Add medical fields to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS requires_medical_review BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS medical_notes_ar TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS medical_notes_en TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vital_signs_required BOOLEAN DEFAULT false;

-- Add medical fields to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS requires_medical_monitoring BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_emergency_protocol TEXT;

-- =============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================================================

-- Generate unique medical record number
CREATE OR REPLACE FUNCTION generate_medical_record_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    record_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(medical_records.medical_record_number FROM 'MED-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM medical_records
    WHERE medical_records.medical_record_number LIKE 'MED-' || current_year || '-%';
    
    -- Format with leading zeros
    record_number := 'MED-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN record_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate medical record number before insert
CREATE OR REPLACE FUNCTION set_medical_record_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.medical_record_number IS NULL OR NEW.medical_record_number = '' THEN
        NEW.medical_record_number := generate_medical_record_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_medical_record_number
    BEFORE INSERT ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION set_medical_record_number();

-- Function to update BMI when weight or height changes
CREATE OR REPLACE FUNCTION update_medical_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- BMI is automatically calculated as a generated column
    -- This function can be extended for other calculated medical metrics
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medical_metrics
    BEFORE UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_metrics();

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_medical_records_updated_at 
    BEFORE UPDATE ON medical_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_consultants_updated_at 
    BEFORE UPDATE ON medical_consultants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_documentation_updated_at 
    BEFORE UPDATE ON clinical_documentation 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_supervision_assignments_updated_at 
    BEFORE UPDATE ON medical_supervision_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE medical_records IS 'Comprehensive medical records with encryption and compliance features';
COMMENT ON TABLE medical_consultants IS 'Healthcare professionals providing medical supervision and consultation';
COMMENT ON TABLE clinical_documentation IS 'SOAP notes and clinical session documentation with medical review';
COMMENT ON TABLE medical_supervision_assignments IS 'Assignment of medical consultants to students, therapists, or programs';

COMMENT ON COLUMN medical_records.medical_history IS 'Encrypted JSONB containing comprehensive medical history';
COMMENT ON COLUMN medical_records.audit_log IS 'Complete audit trail of all record changes';
COMMENT ON COLUMN clinical_documentation.soap_notes IS 'Structured SOAP notes in encrypted JSONB format';
COMMENT ON COLUMN medical_consultants.supervision_level IS 'Level of medical supervision authority';

-- =============================================================================
-- INITIAL DATA FOR TESTING
-- =============================================================================

-- Insert sample medical consultant
INSERT INTO medical_consultants (
    first_name_ar, last_name_ar, first_name_en, last_name_en,
    title_ar, title_en, license_number, license_type,
    primary_specialization_ar, primary_specialization_en,
    supervision_level, years_of_experience,
    primary_phone, email, clinic_name_ar, clinic_name_en,
    status, contract_type
) VALUES (
    'أيمن', 'الحازمي', 'Ayman', 'Al-Hazimi',
    'د.', 'Dr.', 'MD-2024-001', 'Medical Doctor',
    'طب الأطفال التطويري', 'Developmental Pediatrics',
    'medical_director', 15,
    '+966501234567', 'dr.ayman@arkancenter.com',
    'مركز أركان النمو', 'Arkan Growth Center',
    'active', 'full_time'
);

-- Success verification
SELECT 'Medical Foundation Schema created successfully!' as status;

-- End of 012_medical_foundation_schema.sql

-- =====================================================================
-- Migration 16: 013_medical_policies.sql
-- =====================================================================

-- =====================================================================
-- Migration 13: Medical Foundation Security Policies
-- Phase 1: Healthcare-grade security and compliance policies
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY FOR MEDICAL TABLES
-- =============================================================================

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_supervision_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ENHANCED HELPER FUNCTIONS FOR MEDICAL ACCESS CONTROL
-- =============================================================================

-- Function to check if current user is a medical consultant
CREATE OR REPLACE FUNCTION is_medical_consultant()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM medical_consultants mc
    WHERE mc.status = 'active'
    AND (
      -- Check if user is linked to a therapist who is a medical consultant
      EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
      OR
      -- Check if user email matches consultant email
      mc.email = auth.email()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has medical supervision access to student
CREATE OR REPLACE FUNCTION has_medical_supervision_access(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM medical_supervision_assignments msa
    JOIN medical_consultants mc ON mc.id = msa.medical_consultant_id
    WHERE msa.student_id = student_uuid
    AND msa.status = 'active'
    AND (
      -- User is the medical consultant
      EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
      OR mc.email = auth.email()
      OR is_admin()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific medical record
CREATE OR REPLACE FUNCTION can_access_medical_record(record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  student_id_var UUID;
BEGIN
  -- Get student ID from medical record
  SELECT mr.student_id INTO student_id_var
  FROM medical_records mr
  WHERE mr.id = record_id;
  
  -- Check access permissions
  RETURN (
    is_admin() OR
    is_medical_consultant() OR
    has_medical_supervision_access(student_id_var) OR
    is_assigned_therapist(student_id_var)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create/modify clinical documentation
CREATE OR REPLACE FUNCTION can_modify_clinical_docs(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    is_admin() OR
    is_medical_consultant() OR
    has_medical_supervision_access(student_uuid) OR
    is_assigned_therapist(student_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MEDICAL RECORDS POLICIES
-- =============================================================================

-- Admins: Full access to all medical records
CREATE POLICY "Admins can manage all medical records"
ON medical_records
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Access to records they supervise
CREATE POLICY "Medical consultants can access supervised records"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Medical consultants: Can update records they supervise
CREATE POLICY "Medical consultants can update supervised records"
ON medical_records
FOR UPDATE
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
)
WITH CHECK (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Medical consultants: Can create new medical records
CREATE POLICY "Medical consultants can create medical records"
ON medical_records
FOR INSERT
TO authenticated
WITH CHECK (
  is_medical_consultant() OR is_admin()
);

-- Therapists: Limited read access to assigned students' medical records
CREATE POLICY "Therapists can view basic medical info for assigned students"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    is_admin()
  )
);

-- Receptionists: Very limited access for registration purposes only
CREATE POLICY "Receptionists can view basic medical info for registration"
ON medical_records
FOR SELECT
TO authenticated
USING (
  is_receptionist() AND
  data_classification IN ('public', 'internal')
);

-- =============================================================================
-- MEDICAL CONSULTANTS POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all medical consultants"
ON medical_consultants
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Can view colleague information
CREATE POLICY "Medical consultants can view colleague information"
ON medical_consultants
FOR SELECT
TO authenticated
USING (is_medical_consultant() OR is_admin());

-- Medical consultants: Can update their own profile
CREATE POLICY "Medical consultants can update own profile"
ON medical_consultants
FOR UPDATE
TO authenticated
USING (
  email = auth.email() OR
  EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = therapist_id 
    AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  email = auth.email() OR
  EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = therapist_id 
    AND t.user_id = auth.uid()
  )
);

-- Therapists and staff: Can view active consultants for referrals
CREATE POLICY "Staff can view active medical consultants"
ON medical_consultants
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    is_therapist() OR 
    is_receptionist() OR 
    is_admin()
  )
);

-- =============================================================================
-- CLINICAL DOCUMENTATION POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all clinical documentation"
ON clinical_documentation
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Full access to documentation they supervise
CREATE POLICY "Medical consultants can manage supervised clinical docs"
ON clinical_documentation
FOR ALL
TO authenticated
USING (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    medical_consultant_id IN (
      SELECT mc.id FROM medical_consultants mc
      WHERE mc.email = auth.email()
      OR EXISTS (
        SELECT 1 FROM therapists t 
        WHERE t.id = mc.therapist_id 
        AND t.user_id = auth.uid()
      )
    ) OR
    is_admin()
  )
)
WITH CHECK (
  is_medical_consultant() AND (
    has_medical_supervision_access(student_id) OR
    is_admin()
  )
);

-- Therapists: Can create and view documentation for assigned students
CREATE POLICY "Therapists can manage clinical docs for assigned students"
ON clinical_documentation
FOR ALL
TO authenticated
USING (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    created_by = auth.uid() OR
    is_admin()
  )
)
WITH CHECK (
  is_therapist() AND (
    is_assigned_therapist(student_id) OR
    is_admin()
  )
);

-- Receptionists: Limited view access for scheduling coordination
CREATE POLICY "Receptionists can view clinical docs for coordination"
ON clinical_documentation
FOR SELECT
TO authenticated
USING (
  is_receptionist() AND
  status IN ('reviewed', 'approved', 'finalized')
);

-- Parents: Very limited access to finalized, non-confidential notes
CREATE POLICY "Parents can view approved clinical summaries for their children"
ON clinical_documentation
FOR SELECT
TO authenticated
USING (
  is_student_parent(student_id) AND
  status = 'finalized' AND
  documentation_type = 'progress_note'
);

-- =============================================================================
-- MEDICAL SUPERVISION ASSIGNMENTS POLICIES
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all supervision assignments"
ON medical_supervision_assignments
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Medical consultants: Can view their own assignments
CREATE POLICY "Medical consultants can view their assignments"
ON medical_supervision_assignments
FOR SELECT
TO authenticated
USING (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  ) OR is_admin()
);

-- Medical consultants: Can update their own assignment details
CREATE POLICY "Medical consultants can update their assignment details"
ON medical_supervision_assignments
FOR UPDATE
TO authenticated
USING (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  medical_consultant_id IN (
    SELECT mc.id FROM medical_consultants mc
    WHERE mc.email = auth.email()
    OR EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = mc.therapist_id 
      AND t.user_id = auth.uid()
    )
  )
);

-- Therapists: Can view assignments related to their students
CREATE POLICY "Therapists can view supervision for their students"
ON medical_supervision_assignments
FOR SELECT
TO authenticated
USING (
  is_therapist() AND (
    (student_id IS NOT NULL AND is_assigned_therapist(student_id)) OR
    (therapist_id IN (
      SELECT t.id FROM therapists t WHERE t.user_id = auth.uid()
    )) OR
    is_admin()
  )
);

-- =============================================================================
-- ENHANCED AUDIT LOGGING FOR MEDICAL DATA
-- =============================================================================

-- Enhanced audit function for medical data
CREATE OR REPLACE FUNCTION log_medical_data_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to all medical tables with enhanced details
    INSERT INTO audit_logs (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        user_id,
        user_role,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        (auth.jwt() ->> 'user_role'),
        (current_setting('request.headers', true)::json ->> 'x-forwarded-for'),
        (current_setting('request.headers', true)::json ->> 'user-agent')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply enhanced audit triggers to medical tables
CREATE TRIGGER audit_medical_records_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

CREATE TRIGGER audit_medical_consultants_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_consultants
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

CREATE TRIGGER audit_clinical_documentation_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinical_documentation
    FOR EACH ROW EXECUTE FUNCTION log_medical_data_changes();

-- =============================================================================
-- DATA ENCRYPTION POLICIES
-- =============================================================================

-- Function to check if user can access encrypted medical data
CREATE OR REPLACE FUNCTION can_access_encrypted_data(record_id UUID, data_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only medical consultants and admins can access encrypted medical data
  RETURN (
    is_admin() OR
    (is_medical_consultant() AND data_type = 'medical_record') OR
    (is_medical_consultant() AND data_type = 'clinical_documentation')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMPLIANCE AND REPORTING FUNCTIONS
-- =============================================================================

-- Function to get medical record access log for compliance reporting
CREATE OR REPLACE FUNCTION get_medical_access_log(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  access_date TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_role TEXT,
  table_accessed TEXT,
  record_id UUID,
  operation TEXT,
  ip_address TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins and medical consultants can access audit logs
  IF NOT (is_admin() OR is_medical_consultant()) THEN
    RAISE EXCEPTION 'Insufficient permissions to access audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.timestamp,
    al.user_id,
    al.user_role,
    al.table_name,
    al.record_id,
    al.operation,
    al.ip_address
  FROM audit_logs al
  WHERE al.timestamp >= start_date
    AND al.timestamp <= end_date + INTERVAL '1 day'
    AND al.table_name IN ('medical_records', 'clinical_documentation', 'medical_consultants')
  ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BACKUP AND RECOVERY POLICIES
-- =============================================================================

-- Function to create secure medical data backup
CREATE OR REPLACE FUNCTION create_medical_backup()
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  backup_id TEXT;
BEGIN
  -- Only admins can create backups
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create medical data backups';
  END IF;
  
  backup_id := 'BACKUP-' || EXTRACT(EPOCH FROM NOW())::TEXT;
  
  -- Log the backup creation
  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    new_data,
    user_id,
    user_role
  ) VALUES (
    'system_backup',
    'CREATE',
    gen_random_uuid(),
    jsonb_build_object('backup_id', backup_id, 'timestamp', NOW()),
    auth.uid(),
    'admin'
  );
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANT PERMISSIONS FOR MEDICAL FUNCTIONS
-- =============================================================================

-- Grant execute permissions on medical functions
GRANT EXECUTE ON FUNCTION is_medical_consultant() TO authenticated;
GRANT EXECUTE ON FUNCTION has_medical_supervision_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_medical_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify_clinical_docs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_encrypted_data(UUID, TEXT) TO authenticated;

-- Grant limited access to audit functions
GRANT EXECUTE ON FUNCTION get_medical_access_log(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_medical_backup() TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_medical_consultant() IS 'Check if current user is an active medical consultant';
COMMENT ON FUNCTION has_medical_supervision_access(UUID) IS 'Check if user has medical supervision access to specific student';
COMMENT ON FUNCTION can_access_medical_record(UUID) IS 'Check if user can access specific medical record';
COMMENT ON FUNCTION can_modify_clinical_docs(UUID) IS 'Check if user can create/modify clinical documentation for student';
COMMENT ON FUNCTION log_medical_data_changes() IS 'Enhanced audit logging for medical data with IP and user agent tracking';
COMMENT ON FUNCTION get_medical_access_log(DATE, DATE) IS 'Generate compliance report of medical data access';
COMMENT ON FUNCTION create_medical_backup() IS 'Create secure backup of medical data (admin only)';

-- =============================================================================
-- EMERGENCY ACCESS PROCEDURES
-- =============================================================================

-- Function for emergency medical data access
CREATE OR REPLACE FUNCTION emergency_medical_access(
  student_uuid UUID,
  emergency_reason TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  medical_data JSONB;
  emergency_log_id UUID;
BEGIN
  -- Log emergency access attempt
  emergency_log_id := gen_random_uuid();
  
  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    new_data,
    user_id,
    user_role
  ) VALUES (
    'emergency_access',
    'EMERGENCY_ACCESS',
    emergency_log_id,
    jsonb_build_object(
      'student_id', student_uuid,
      'reason', emergency_reason,
      'timestamp', NOW(),
      'user_id', auth.uid()
    ),
    auth.uid(),
    COALESCE((auth.jwt() ->> 'user_role'), 'unknown')
  );
  
  -- Return essential medical information for emergencies
  SELECT jsonb_build_object(
    'allergies', mr.allergies,
    'emergency_protocol', mr.emergency_protocol,
    'blood_type', mr.blood_type,
    'emergency_contact_name', mr.emergency_medical_contact_name_ar,
    'emergency_contact_phone', mr.emergency_medical_contact_phone,
    'current_medications', mr.current_medications,
    'contraindications', mr.contraindications_ar
  ) INTO medical_data
  FROM medical_records mr
  WHERE mr.student_id = student_uuid;
  
  RETURN COALESCE(medical_data, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION emergency_medical_access(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION emergency_medical_access(UUID, TEXT) IS 'Emergency access to critical medical information with full audit logging';

-- Success message
SELECT 'Medical Foundation Security Policies created successfully!' as status;

-- End of 013_medical_policies.sql

-- =====================================================================
-- Migration 17: 014_specialized_therapy_programs.sql
-- =====================================================================

-- =====================================================================
-- Migration 14: Specialized Therapy Programs Schema
-- Phase 2: 12 Specialized therapy programs with program-specific features
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- THERAPY PROGRAMS TABLE
-- Configuration for 12 specialized therapy programs
-- =============================================================================
CREATE TABLE IF NOT EXISTS therapy_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Program Identification
    program_code VARCHAR(10) UNIQUE NOT NULL, -- ABA, ST, OT, PT, etc.
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    -- Program Classification
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'intensive', 'therapeutic', 'educational', 'behavioral', 
        'developmental', 'sensory', 'communication', 'motor'
    )),
    intensity_level VARCHAR(20) CHECK (intensity_level IN (
        'low', 'moderate', 'high', 'intensive'
    )),
    
    -- Program Configuration
    default_sessions_per_week INTEGER DEFAULT 2 CHECK (default_sessions_per_week > 0),
    default_session_duration_minutes INTEGER DEFAULT 45 CHECK (default_session_duration_minutes > 0),
    minimum_age_months INTEGER DEFAULT 12,
    maximum_age_months INTEGER DEFAULT 216, -- 18 years
    
    -- Assessment and Documentation
    assessment_tools JSONB DEFAULT '[]', -- Array of standard assessment tools
    documentation_template JSONB DEFAULT '{}', -- Program-specific documentation
    intervention_protocols JSONB DEFAULT '{}', -- Standard intervention protocols
    
    -- Billing and Pricing
    billing_codes TEXT[], -- Insurance billing codes
    default_price_per_session DECIMAL(10,2),
    group_session_multiplier DECIMAL(3,2) DEFAULT 1.0,
    
    -- Medical Requirements
    requires_medical_clearance BOOLEAN DEFAULT false,
    contraindications TEXT[],
    precautions_ar TEXT,
    precautions_en TEXT,
    
    -- Program Description
    description_ar TEXT,
    description_en TEXT,
    objectives_ar TEXT[],
    objectives_en TEXT[],
    target_conditions TEXT[], -- Conditions this program addresses
    
    -- Resource Requirements
    required_materials JSONB DEFAULT '[]',
    required_space_type VARCHAR(50), -- therapy_room, gym, sensory_room, etc.
    equipment_needed TEXT[],
    staff_qualifications TEXT[],
    
    -- Quality Metrics
    success_metrics JSONB DEFAULT '{}', -- How success is measured
    typical_duration_weeks INTEGER,
    graduation_criteria_ar TEXT,
    graduation_criteria_en TEXT,
    
    -- Status and Availability
    is_active BOOLEAN DEFAULT true,
    is_available_for_new_patients BOOLEAN DEFAULT true,
    waitlist_limit INTEGER DEFAULT 10,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for therapy programs
CREATE INDEX IF NOT EXISTS idx_therapy_programs_code ON therapy_programs(program_code);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_category ON therapy_programs(category);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_active ON therapy_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_age_range ON therapy_programs(minimum_age_months, maximum_age_months);

-- =============================================================================
-- PROGRAM-SPECIFIC DATA COLLECTION TABLES
-- =============================================================================

-- ABA (Applied Behavior Analysis) Data Collection
CREATE TABLE IF NOT EXISTS aba_data_collection (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- ABC Data (Antecedent, Behavior, Consequence)
    antecedent_ar TEXT,
    antecedent_en TEXT,
    behavior_description_ar TEXT NOT NULL,
    behavior_description_en TEXT,
    consequence_ar TEXT,
    consequence_en TEXT,
    
    -- Behavior Measurement
    behavior_frequency INTEGER DEFAULT 0,
    behavior_duration_seconds INTEGER,
    behavior_intensity INTEGER CHECK (behavior_intensity BETWEEN 1 AND 5),
    intervention_used TEXT,
    
    -- Discrete Trial Data
    trial_number INTEGER,
    target_skill_ar TEXT,
    target_skill_en TEXT,
    prompt_level VARCHAR(20), -- independent, gestural, verbal, physical
    response_accuracy BOOLEAN,
    response_latency_seconds INTEGER,
    
    -- Reinforcement Data
    reinforcer_used TEXT,
    reinforcement_schedule VARCHAR(30), -- continuous, fixed_ratio, variable_ratio, etc.
    reinforcement_effectiveness INTEGER CHECK (reinforcement_effectiveness BETWEEN 1 AND 5),
    
    -- Environmental Factors
    environment_description TEXT,
    distractors_present TEXT[],
    staff_present TEXT[],
    
    -- Observation Details
    observation_start_time TIME,
    observation_end_time TIME,
    observation_date DATE DEFAULT CURRENT_DATE,
    observer_id UUID REFERENCES auth.users(id),
    
    -- Data Quality
    data_reliability_score DECIMAL(3,2), -- Inter-observer reliability
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Speech Therapy Progress Tracking
CREATE TABLE IF NOT EXISTS speech_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Articulation Data
    target_sounds TEXT[], -- Sounds being worked on
    sound_accuracy_percentage JSONB DEFAULT '{}', -- {"s": 85, "r": 60}
    sound_position VARCHAR(20), -- initial, medial, final, blends
    
    -- Language Development
    vocabulary_introduced TEXT[],
    vocabulary_mastered TEXT[],
    sentence_length_words INTEGER,
    grammatical_structures TEXT[],
    
    -- Communication Data
    communication_attempts INTEGER DEFAULT 0,
    successful_communications INTEGER DEFAULT 0,
    communication_modality VARCHAR(30), -- verbal, gestural, aac, signs
    
    -- Fluency Measures (if applicable)
    words_per_minute DECIMAL(5,2),
    stuttering_frequency INTEGER,
    stuttering_severity VARCHAR(20), -- mild, moderate, severe
    
    -- Voice Quality (if applicable)
    vocal_quality VARCHAR(30), -- normal, hoarse, breathy, etc.
    vocal_pitch VARCHAR(20), -- appropriate, too_high, too_low
    vocal_volume VARCHAR(20), -- appropriate, too_loud, too_quiet
    
    -- Pragmatic Skills
    eye_contact_rating INTEGER CHECK (eye_contact_rating BETWEEN 1 AND 5),
    turn_taking_rating INTEGER CHECK (turn_taking_rating BETWEEN 1 AND 5),
    topic_maintenance_rating INTEGER CHECK (topic_maintenance_rating BETWEEN 1 AND 5),
    
    -- Session Activities
    activities_completed TEXT[],
    materials_used TEXT[],
    home_practice_assigned TEXT,
    
    -- Progress Notes
    strengths_observed_ar TEXT,
    strengths_observed_en TEXT,
    challenges_noted_ar TEXT,
    challenges_noted_en TEXT,
    recommendations_ar TEXT,
    recommendations_en TEXT,
    
    -- Assessment Scores
    assessment_type VARCHAR(50),
    assessment_score DECIMAL(5,2),
    assessment_percentile INTEGER,
    
    -- Metadata
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- Occupational Therapy Assessment Data
CREATE TABLE IF NOT EXISTS occupational_therapy_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Fine Motor Skills
    fine_motor_tasks JSONB DEFAULT '{}', -- Task-specific scores
    grip_strength_kg DECIMAL(4,2),
    pincer_grasp_quality INTEGER CHECK (pincer_grasp_quality BETWEEN 1 AND 5),
    handwriting_quality INTEGER CHECK (handwriting_quality BETWEEN 1 AND 5),
    
    -- Gross Motor Skills
    gross_motor_tasks JSONB DEFAULT '{}',
    balance_score INTEGER CHECK (balance_score BETWEEN 1 AND 5),
    coordination_score INTEGER CHECK (coordination_score BETWEEN 1 AND 5),
    
    -- Sensory Processing
    sensory_profile JSONB DEFAULT '{}', -- Sensory preferences and sensitivities
    sensory_seeking_behaviors TEXT[],
    sensory_avoiding_behaviors TEXT[],
    sensory_diet_activities TEXT[],
    
    -- Activities of Daily Living (ADL)
    dressing_independence INTEGER CHECK (dressing_independence BETWEEN 1 AND 5),
    feeding_independence INTEGER CHECK (feeding_independence BETWEEN 1 AND 5),
    toileting_independence INTEGER CHECK (toileting_independence BETWEEN 1 AND 5),
    grooming_independence INTEGER CHECK (grooming_independence BETWEEN 1 AND 5),
    
    -- Cognitive-Motor Integration
    visual_motor_integration INTEGER CHECK (visual_motor_integration BETWEEN 1 AND 5),
    visual_perceptual_skills INTEGER CHECK (visual_perceptual_skills BETWEEN 1 AND 5),
    motor_planning_ability INTEGER CHECK (motor_planning_ability BETWEEN 1 AND 5),
    
    -- Environmental Modifications
    adaptations_used TEXT[],
    assistive_technology TEXT[],
    environmental_supports TEXT[],
    
    -- Goal Progress
    short_term_goals JSONB DEFAULT '[]',
    goal_progress_percentage JSONB DEFAULT '{}',
    mastered_skills TEXT[],
    emerging_skills TEXT[],
    
    -- Intervention Data
    intervention_techniques TEXT[],
    equipment_used TEXT[],
    session_focus_areas TEXT[],
    
    -- Family Training
    caregiver_training_provided TEXT,
    home_program_activities TEXT[],
    caregiver_competency_level INTEGER CHECK (caregiver_competency_level BETWEEN 1 AND 5),
    
    -- Metadata
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- ASSESSMENT TOOLS MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS assessment_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Tool Identification
    tool_code VARCHAR(20) UNIQUE NOT NULL, -- CARS, ADOS, VB-MAPP, etc.
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    
    -- Tool Classification
    assessment_type VARCHAR(30) CHECK (assessment_type IN (
        'screening', 'diagnostic', 'progress_monitoring', 'outcome_measurement'
    )),
    domain VARCHAR(30) CHECK (domain IN (
        'autism', 'speech_language', 'occupational', 'behavioral', 
        'cognitive', 'social', 'motor', 'sensory', 'academic'
    )),
    
    -- Age and Population
    minimum_age_months INTEGER,
    maximum_age_months INTEGER,
    target_population_ar TEXT,
    target_population_en TEXT,
    
    -- Administration Details
    administration_time_minutes INTEGER,
    requires_training BOOLEAN DEFAULT false,
    certification_required BOOLEAN DEFAULT false,
    can_be_parent_reported BOOLEAN DEFAULT false,
    
    -- Scoring and Interpretation
    scoring_method VARCHAR(30), -- manual, automated, mixed
    score_range_min DECIMAL(8,2),
    score_range_max DECIMAL(8,2),
    interpretation_guide JSONB DEFAULT '{}',
    
    -- Tool Structure
    sections JSONB DEFAULT '[]', -- Assessment sections/domains
    total_items INTEGER,
    completion_criteria TEXT,
    
    -- Validity and Reliability
    validity_studies TEXT[],
    reliability_coefficient DECIMAL(3,2),
    normative_sample_size INTEGER,
    cultural_adaptations TEXT[],
    
    -- Digital Implementation
    digital_version_available BOOLEAN DEFAULT false,
    scoring_algorithm JSONB DEFAULT '{}',
    report_template JSONB DEFAULT '{}',
    
    -- Usage and Licensing
    is_free BOOLEAN DEFAULT false,
    license_cost DECIMAL(10,2),
    license_expiry_date DATE,
    usage_restrictions TEXT,
    
    -- Quality Assurance
    last_updated_version DATE,
    evidence_base_strength VARCHAR(20), -- strong, moderate, limited
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_approved_for_use BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INTERVENTION PROTOCOLS
-- =============================================================================
CREATE TABLE IF NOT EXISTS intervention_protocols (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Protocol Identification
    protocol_name_ar TEXT NOT NULL,
    protocol_name_en TEXT NOT NULL,
    protocol_code VARCHAR(20) UNIQUE,
    
    -- Protocol Details
    description_ar TEXT,
    description_en TEXT,
    target_skills TEXT[],
    prerequisites TEXT[],
    
    -- Implementation Guidelines
    step_by_step_instructions JSONB DEFAULT '[]',
    materials_required TEXT[],
    environmental_setup_ar TEXT,
    environmental_setup_en TEXT,
    
    -- Measurement and Data Collection
    data_collection_method VARCHAR(30),
    frequency_of_measurement VARCHAR(20),
    success_criteria JSONB DEFAULT '{}',
    mastery_criteria_ar TEXT,
    mastery_criteria_en TEXT,
    
    -- Progression and Modification
    progression_steps JSONB DEFAULT '[]',
    modification_guidelines TEXT[],
    troubleshooting_tips JSONB DEFAULT '{}',
    
    -- Evidence Base
    research_evidence TEXT[],
    evidence_quality VARCHAR(20), -- high, moderate, low
    recommended_age_range VARCHAR(50),
    
    -- Safety and Contraindications
    safety_considerations TEXT[],
    contraindications TEXT[],
    precautions TEXT[],
    
    -- Training Requirements
    staff_training_required BOOLEAN DEFAULT false,
    training_duration_hours INTEGER,
    competency_requirements TEXT[],
    
    -- Approval and Quality
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'under_review', 'rejected'
    )),
    approved_by UUID REFERENCES medical_consultants(id),
    approval_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- PROGRAM ENROLLMENTS AND PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    therapy_program_id UUID NOT NULL REFERENCES therapy_programs(id),
    
    -- Enrollment Details
    enrollment_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    expected_end_date DATE,
    actual_end_date DATE,
    
    -- Program Configuration for Student
    sessions_per_week INTEGER DEFAULT 2,
    session_duration_minutes INTEGER DEFAULT 45,
    total_sessions_planned INTEGER,
    
    -- Goals and Objectives
    individual_goals JSONB DEFAULT '[]',
    modified_protocols JSONB DEFAULT '[]',
    accommodation_needs TEXT[],
    
    -- Progress Tracking
    sessions_completed INTEGER DEFAULT 0,
    sessions_missed INTEGER DEFAULT 0,
    current_mastery_level DECIMAL(5,2), -- Percentage
    
    -- Status and Outcomes
    enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN (
        'active', 'paused', 'completed', 'withdrawn', 'transferred'
    )),
    completion_reason VARCHAR(30),
    outcome_summary_ar TEXT,
    outcome_summary_en TEXT,
    
    -- Team Assignment
    primary_therapist_id UUID REFERENCES therapists(id),
    secondary_therapist_id UUID REFERENCES therapists(id),
    supervising_consultant_id UUID REFERENCES medical_consultants(id),
    
    -- Billing and Payments
    total_cost DECIMAL(10,2),
    payment_plan VARCHAR(20),
    insurance_coverage_percentage INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(student_id, therapy_program_id, enrollment_status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- ABA Data Collection Indexes
CREATE INDEX IF NOT EXISTS idx_aba_data_student_id ON aba_data_collection(student_id);
CREATE INDEX IF NOT EXISTS idx_aba_data_session_id ON aba_data_collection(session_id);
CREATE INDEX IF NOT EXISTS idx_aba_data_date ON aba_data_collection(observation_date);
CREATE INDEX IF NOT EXISTS idx_aba_data_behavior ON aba_data_collection(behavior_description_ar);

-- Speech Therapy Data Indexes
CREATE INDEX IF NOT EXISTS idx_speech_data_student_id ON speech_therapy_data(student_id);
CREATE INDEX IF NOT EXISTS idx_speech_data_session_id ON speech_therapy_data(session_id);
CREATE INDEX IF NOT EXISTS idx_speech_data_date ON speech_therapy_data(session_date);

-- Occupational Therapy Data Indexes
CREATE INDEX IF NOT EXISTS idx_ot_data_student_id ON occupational_therapy_data(student_id);
CREATE INDEX IF NOT EXISTS idx_ot_data_session_id ON occupational_therapy_data(session_id);
CREATE INDEX IF NOT EXISTS idx_ot_data_date ON occupational_therapy_data(session_date);

-- Assessment Tools Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_tools_code ON assessment_tools(tool_code);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_type ON assessment_tools(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_domain ON assessment_tools(domain);
CREATE INDEX IF NOT EXISTS idx_assessment_tools_active ON assessment_tools(is_active);

-- Intervention Protocols Indexes
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_program ON intervention_protocols(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_code ON intervention_protocols(protocol_code);
CREATE INDEX IF NOT EXISTS idx_intervention_protocols_status ON intervention_protocols(approval_status);

-- Program Enrollments Indexes
CREATE INDEX IF NOT EXISTS idx_program_enrollments_student ON program_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_status ON program_enrollments(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_therapist ON program_enrollments(primary_therapist_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_dates ON program_enrollments(start_date, expected_end_date);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_therapy_programs_updated_at 
    BEFORE UPDATE ON therapy_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aba_data_collection_updated_at 
    BEFORE UPDATE ON aba_data_collection 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speech_therapy_data_updated_at 
    BEFORE UPDATE ON speech_therapy_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occupational_therapy_data_updated_at 
    BEFORE UPDATE ON occupational_therapy_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_tools_updated_at 
    BEFORE UPDATE ON assessment_tools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_protocols_updated_at 
    BEFORE UPDATE ON intervention_protocols 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_enrollments_updated_at 
    BEFORE UPDATE ON program_enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE therapy_programs IS '12 specialized therapy programs with configurations and requirements';
COMMENT ON TABLE aba_data_collection IS 'Applied Behavior Analysis data collection and tracking';
COMMENT ON TABLE speech_therapy_data IS 'Speech and Language therapy progress and assessment data';
COMMENT ON TABLE occupational_therapy_data IS 'Occupational therapy assessment and intervention data';
COMMENT ON TABLE assessment_tools IS 'Standardized assessment tools library with scoring and interpretation';
COMMENT ON TABLE intervention_protocols IS 'Evidence-based intervention protocols for each therapy program';
COMMENT ON TABLE program_enrollments IS 'Student enrollment and progress tracking across therapy programs';

-- Success verification
SELECT 'Specialized Therapy Programs Schema created successfully!' as status;

-- End of 014_specialized_therapy_programs.sql

-- =====================================================================
-- Migration 18: 015_therapy_programs_seed_data.sql
-- =====================================================================

-- =====================================================================
-- Migration 15: Specialized Therapy Programs Seed Data
-- Phase 2: Insert 12 specialized therapy programs with configurations
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- INSERT 12 SPECIALIZED THERAPY PROGRAMS
-- Based on roadmap specifications for comprehensive therapy center
-- =============================================================================

INSERT INTO therapy_programs (
    program_code, name_ar, name_en, category, intensity_level,
    default_sessions_per_week, default_session_duration_minutes,
    minimum_age_months, maximum_age_months,
    assessment_tools, documentation_template, intervention_protocols,
    billing_codes, default_price_per_session,
    requires_medical_clearance, contraindications,
    precautions_ar, precautions_en,
    description_ar, description_en,
    objectives_ar, objectives_en,
    target_conditions, required_materials,
    required_space_type, equipment_needed,
    staff_qualifications, success_metrics,
    typical_duration_weeks, graduation_criteria_ar, graduation_criteria_en,
    is_active, is_available_for_new_patients
) VALUES

-- 1. Applied Behavior Analysis (ABA) - Intensive Program
(
    'ABA', 'تحليل السلوك التطبيقي', 'Applied Behavior Analysis', 
    'intensive', 'intensive',
    20, 180, -- 20 sessions/week, 3 hours each
    18, 216, -- 1.5 to 18 years
    '["VB-MAPP", "ABLLS-R", "AFLS", "PEAK"]'::jsonb,
    '{"type": "abc_data", "includes": ["antecedent", "behavior", "consequence", "intervention"]}'::jsonb,
    '{"discrete_trial": {}, "natural_environment": {}, "pivotal_response": {}}'::jsonb,
    ARRAY['97153', '97154', '97155', '97156', '97157', '97158'], -- CPT codes
    200.00,
    true, ARRAY['severe_medical_conditions', 'uncontrolled_seizures'],
    'يتطلب إشراف طبي مستمر للحالات الشديدة', 'Requires continuous medical supervision for severe cases',
    'برنامج مكثف لتحليل السلوك التطبيقي يركز على تطوير المهارات الأساسية والتقليل من السلوكيات المشكلة من خلال التدخلات القائمة على الأدلة',
    'Intensive Applied Behavior Analysis program focusing on developing essential skills and reducing problematic behaviors through evidence-based interventions',
    ARRAY['تطوير مهارات التواصل', 'تحسين السلوك الاجتماعي', 'بناء مهارات الحياة اليومية', 'تقليل السلوكيات المشكلة'],
    ARRAY['Develop communication skills', 'Improve social behavior', 'Build daily living skills', 'Reduce problematic behaviors'],
    ARRAY['autism_spectrum_disorder', 'developmental_delays', 'behavioral_disorders', 'intellectual_disabilities'],
    '["behavioral_data_sheets", "reinforcement_items", "visual_schedules", "communication_devices"]'::jsonb,
    'therapy_room', ARRAY['tables_chairs', 'sensory_toys', 'communication_boards', 'timer'],
    ARRAY['BCBA_certification', 'masters_degree', 'aba_training'],
    '{"skill_acquisition": "monthly", "behavior_reduction": "weekly", "generalization": "quarterly"}'::jsonb,
    52, 'إتقان 80% من الأهداف المحددة مع تعميم المهارات', 'Mastery of 80% of identified goals with skill generalization',
    true, true
),

-- 2. Speech & Language Therapy - Therapeutic Program
(
    'ST', 'علاج النطق واللغة', 'Speech & Language Therapy',
    'therapeutic', 'moderate',
    3, 45, -- 3 sessions/week, 45 minutes each
    12, 216, -- 1 to 18 years
    '["REEL-3", "PLS-5", "CELF-5", "GFTA-3"]'::jsonb,
    '{"type": "speech_progress", "includes": ["articulation", "language", "fluency", "voice"]}'::jsonb,
    '{"articulation_therapy": {}, "language_intervention": {}, "fluency_therapy": {}}'::jsonb,
    ARRAY['92507', '92508', '92521', '92522', '92523'],
    150.00,
    false, ARRAY['severe_hearing_loss_without_aids', 'oral_motor_dysfunction'],
    'يحتاج تقييم سمعي قبل البدء', 'Requires hearing evaluation before starting',
    'برنامج شامل لعلاج اضطرابات النطق واللغة يركز على تطوير مهارات التواصل الفعال',
    'Comprehensive speech and language therapy program focusing on developing effective communication skills',
    ARRAY['تحسين وضوح الكلام', 'تطوير المفردات', 'بناء الجمل', 'تحسين الفهم اللغوي'],
    ARRAY['Improve speech clarity', 'Develop vocabulary', 'Build sentence structure', 'Enhance language comprehension'],
    ARRAY['speech_delay', 'language_disorder', 'articulation_disorder', 'stuttering', 'voice_disorders'],
    '["mirrors", "picture_cards", "language_books", "recording_devices"]'::jsonb,
    'speech_therapy_room', ARRAY['mirror', 'computer', 'speech_software', 'articulation_cards'],
    ARRAY['speech_pathology_degree', 'clinical_certification', 'continuing_education'],
    '{"articulation_accuracy": "monthly", "language_milestones": "bi-monthly", "communication_effectiveness": "quarterly"}'::jsonb,
    24, 'تحقيق أهداف التواصل المحددة في البيئات الطبيعية', 'Achievement of communication goals in natural environments',
    true, true
),

-- 3. Occupational Therapy - Therapeutic Program
(
    'OT', 'العلاج الوظيفي', 'Occupational Therapy',
    'therapeutic', 'moderate',
    4, 45, -- 4 sessions/week, 45 minutes each
    6, 216, -- 6 months to 18 years
    '["SIPT", "BOT-2", "COPM", "WeeFIM"]'::jsonb,
    '{"type": "ot_assessment", "includes": ["fine_motor", "gross_motor", "sensory", "adl"]}'::jsonb,
    '{"sensory_integration": {}, "motor_skills": {}, "adl_training": {}}'::jsonb,
    ARRAY['97530', '97535', '97533', '97110'],
    120.00,
    false, ARRAY['acute_fractures', 'severe_joint_instability'],
    'يتطلب تقييم طبي للحالات العضلية الهيكلية', 'Requires medical evaluation for musculoskeletal conditions',
    'برنامج العلاج الوظيفي يركز على تطوير المهارات الحركية الدقيقة والكبيرة ومهارات الحياة اليومية',
    'Occupational therapy program focusing on developing fine and gross motor skills and daily living activities',
    ARRAY['تحسين المهارات الحركية الدقيقة', 'تطوير التناسق', 'بناء الاستقلالية', 'معالجة التكامل الحسي'],
    ARRAY['Improve fine motor skills', 'Develop coordination', 'Build independence', 'Address sensory integration'],
    ARRAY['sensory_processing_disorder', 'developmental_delays', 'cerebral_palsy', 'down_syndrome'],
    '["therapy_balls", "fine_motor_tools", "sensory_materials", "adaptive_equipment"]'::jsonb,
    'occupational_therapy_room', ARRAY['therapy_table', 'sensory_equipment', 'fine_motor_tools', 'balance_equipment'],
    ARRAY['occupational_therapy_degree', 'pediatric_certification', 'sensory_integration_training'],
    '{"motor_milestones": "monthly", "independence_level": "bi-monthly", "sensory_responses": "weekly"}'::jsonb,
    20, 'تحقيق الاستقلالية في الأنشطة اليومية المستهدفة', 'Achievement of independence in targeted daily activities',
    true, true
),

-- 4. Physical Therapy - Therapeutic Program
(
    'PT', 'العلاج الطبيعي', 'Physical Therapy',
    'therapeutic', 'high',
    4, 60, -- 4 sessions/week, 1 hour each
    3, 216, -- 3 months to 18 years
    '["PDMS-2", "GMFM", "Alberta", "Bayley-III"]'::jsonb,
    '{"type": "pt_assessment", "includes": ["strength", "mobility", "balance", "coordination"]}'::jsonb,
    '{"strengthening": {}, "mobility_training": {}, "gait_training": {}}'::jsonb,
    ARRAY['97110', '97112', '97116', '97140'],
    100.00,
    true, ARRAY['acute_injuries', 'post_surgical_restrictions'],
    'يتطلب موافقة طبية وتقييم شامل', 'Requires medical clearance and comprehensive evaluation',
    'برنامج العلاج الطبيعي لتحسين القوة العضلية والحركة والتوازن',
    'Physical therapy program to improve muscle strength, mobility, and balance',
    ARRAY['تقوية العضلات', 'تحسين التوازن', 'تطوير المهارات الحركية الكبيرة', 'تحسين المشي'],
    ARRAY['Strengthen muscles', 'Improve balance', 'Develop gross motor skills', 'Enhance gait'],
    ARRAY['cerebral_palsy', 'muscular_dystrophy', 'spina_bifida', 'developmental_delays'],
    '["exercise_equipment", "mobility_aids", "balance_tools", "strengthening_devices"]'::jsonb,
    'physical_therapy_gym', ARRAY['parallel_bars', 'exercise_mats', 'weights', 'gait_trainer'],
    ARRAY['physical_therapy_degree', 'pediatric_certification', 'continuing_education'],
    '{"strength_gains": "monthly", "mobility_improvement": "bi-weekly", "functional_goals": "quarterly"}'::jsonb,
    16, 'تحقيق الأهداف الحركية والوظيفية المحددة', 'Achievement of identified motor and functional goals',
    true, true
),

-- 5. Sensory Integration Therapy - Specialized Program
(
    'SI', 'الدمج الحسي', 'Sensory Integration',
    'sensory', 'moderate',
    3, 50, -- 3 sessions/week, 50 minutes each
    18, 144, -- 1.5 to 12 years
    '["SPM-2", "SIPT", "Sensory Profile"]'::jsonb,
    '{"type": "sensory_profile", "includes": ["seeking", "avoiding", "registration", "sensitivity"]}'::jsonb,
    '{"sensory_diet": {}, "environmental_modifications": {}, "coping_strategies": {}}'::jsonb,
    ARRAY['97533', '97535'],
    130.00,
    false, ARRAY['seizure_disorders', 'severe_behavioral_issues'],
    'يحتاج بيئة آمنة ومراقبة مستمرة', 'Requires safe environment and continuous monitoring',
    'برنامج الدمج الحسي لمعالجة اضطرابات المعالجة الحسية وتطوير الاستجابات التكيفية',
    'Sensory integration program to address sensory processing disorders and develop adaptive responses',
    ARRAY['تحسين المعالجة الحسية', 'تطوير الاستجابات التكيفية', 'تقليل السلوكيات الحسية المشكلة'],
    ARRAY['Improve sensory processing', 'Develop adaptive responses', 'Reduce problematic sensory behaviors'],
    ARRAY['sensory_processing_disorder', 'autism_spectrum_disorder', 'adhd'],
    '["sensory_equipment", "weighted_items", "textured_materials", "movement_tools"]'::jsonb,
    'sensory_integration_room', ARRAY['suspended_equipment', 'tactile_materials', 'vestibular_tools', 'proprioceptive_equipment'],
    ARRAY['sensory_integration_certification', 'occupational_therapy_background', 'advanced_training'],
    '{"sensory_responses": "weekly", "behavioral_changes": "monthly", "participation_level": "bi-weekly"}'::jsonb,
    24, 'تطوير استراتيجيات التكيف الحسي الفعالة', 'Development of effective sensory coping strategies',
    true, true
),

-- 6. Music Therapy - Creative Arts Program
(
    'MT', 'العلاج بالموسيقى', 'Music Therapy',
    'therapeutic', 'low',
    2, 45, -- 2 sessions/week, 45 minutes each
    12, 216, -- 1 to 18 years
    '["Music Therapy Assessment", "Social Skills Rating"]'::jsonb,
    '{"type": "music_therapy", "includes": ["participation", "expression", "social_interaction"]}'::jsonb,
    '{"improvisation": {}, "song_writing": {}, "listening": {}}'::jsonb,
    ARRAY['97530', '97535'],
    90.00,
    false, ARRAY['severe_hearing_impairment', 'noise_sensitivity'],
    'يحتاج تقييم سمعي أولي', 'Requires initial hearing assessment',
    'برنامج العلاج بالموسيقى لتطوير التواصل والتفاعل الاجتماعي والتعبير العاطفي',
    'Music therapy program to develop communication, social interaction, and emotional expression',
    ARRAY['تحسين التواصل', 'تطوير المهارات الاجتماعية', 'التعبير العاطفي', 'تحسين الانتباه'],
    ARRAY['Improve communication', 'Develop social skills', 'Emotional expression', 'Enhance attention'],
    ARRAY['autism_spectrum_disorder', 'communication_disorders', 'emotional_disorders'],
    '["musical_instruments", "sound_equipment", "recording_devices"]'::jsonb,
    'music_therapy_room', ARRAY['piano', 'percussion_instruments', 'sound_system', 'recording_equipment'],
    ARRAY['music_therapy_certification', 'clinical_training', 'music_background'],
    '{"participation_level": "weekly", "communication_attempts": "session", "social_engagement": "monthly"}'::jsonb,
    16, 'تحقيق أهداف التواصل والتفاعل الاجتماعي', 'Achievement of communication and social interaction goals',
    true, true
),

-- 7. Art Therapy - Creative Arts Program
(
    'AT', 'العلاج بالفن', 'Art Therapy',
    'therapeutic', 'low',
    2, 60, -- 2 sessions/week, 1 hour each
    24, 216, -- 2 to 18 years
    '["Art Therapy Assessment", "Emotional Regulation Scale"]'::jsonb,
    '{"type": "art_therapy", "includes": ["expression", "processing", "motor_skills"]}'::jsonb,
    '{"drawing": {}, "painting": {}, "sculpture": {}}'::jsonb,
    ARRAY['97530'],
    85.00,
    false, ARRAY['severe_allergies_to_materials'],
    'يحتاج اختبار حساسية للمواد الفنية', 'Requires allergy testing for art materials',
    'برنامج العلاج بالفن لتطوير التعبير الإبداعي والمعالجة العاطفية',
    'Art therapy program to develop creative expression and emotional processing',
    ARRAY['التعبير الإبداعي', 'المعالجة العاطفية', 'تطوير المهارات الحركية الدقيقة'],
    ARRAY['Creative expression', 'Emotional processing', 'Fine motor development'],
    ARRAY['trauma', 'emotional_disorders', 'communication_difficulties'],
    '["art_supplies", "easels", "clay", "painting_materials"]'::jsonb,
    'art_therapy_studio', ARRAY['easels', 'art_supplies', 'washable_surfaces', 'storage'],
    ARRAY['art_therapy_certification', 'psychology_background', 'artistic_training'],
    '{"creative_expression": "session", "emotional_regulation": "weekly", "motor_skills": "monthly"}'::jsonb,
    20, 'تطوير مهارات التعبير والتنظيم العاطفي', 'Development of expression and emotional regulation skills',
    true, true
),

-- 8. Social Skills Training - Behavioral Program
(
    'SST', 'تدريب المهارات الاجتماعية', 'Social Skills Training',
    'behavioral', 'moderate',
    2, 90, -- 2 sessions/week, 1.5 hours each (group sessions)
    36, 216, -- 3 to 18 years
    '["SSIS", "Vineland-3", "ABAS-3"]'::jsonb,
    '{"type": "social_skills", "includes": ["peer_interaction", "communication", "problem_solving"]}'::jsonb,
    '{"role_playing": {}, "social_stories": {}, "peer_mediated": {}}'::jsonb,
    ARRAY['97530', '97535'],
    75.00,
    false, ARRAY['severe_aggressive_behavior'],
    'يحتاج تقييم سلوكي أولي', 'Requires initial behavioral assessment',
    'برنامج تدريب المهارات الاجتماعية لتطوير التفاعل الاجتماعي وحل المشكلات',
    'Social skills training program to develop social interaction and problem-solving abilities',
    ARRAY['تطوير التفاعل مع الأقران', 'تحسين التواصل الاجتماعي', 'بناء الصداقات'],
    ARRAY['Develop peer interaction', 'Improve social communication', 'Build friendships'],
    ARRAY['autism_spectrum_disorder', 'social_anxiety', 'adhd'],
    '["social_stories", "role_play_scenarios", "group_activities"]'::jsonb,
    'group_therapy_room', ARRAY['comfortable_seating', 'games', 'social_materials'],
    ARRAY['behavioral_training', 'social_skills_certification', 'group_facilitation'],
    '{"peer_interactions": "session", "social_initiations": "weekly", "friendship_development": "monthly"}'::jsonb,
    24, 'تكوين علاقات اجتماعية مستقلة', 'Formation of independent social relationships',
    true, true
),

-- 9. Cognitive Behavioral Therapy - Psychological Program
(
    'CBT', 'العلاج المعرفي السلوكي', 'Cognitive Behavioral Therapy',
    'behavioral', 'moderate',
    1, 60, -- 1 session/week, 1 hour each
    72, 216, -- 6 to 18 years
    '["Beck Inventories", "CBCL", "Emotional Regulation Assessment"]'::jsonb,
    '{"type": "cbt_session", "includes": ["thoughts", "feelings", "behaviors", "coping"]}'::jsonb,
    '{"cognitive_restructuring": {}, "behavioral_activation": {}, "exposure_therapy": {}}'::jsonb,
    ARRAY['90834', '90837'],
    120.00,
    false, ARRAY['active_psychosis', 'severe_suicidal_ideation'],
    'يتطلب تقييم نفسي شامل قبل البدء', 'Requires comprehensive psychological evaluation before starting',
    'برنامج العلاج المعرفي السلوكي لمعالجة القلق والاكتئاب واضطرابات المزاج',
    'Cognitive behavioral therapy program to address anxiety, depression, and mood disorders',
    ARRAY['تنظيم العواطف', 'تطوير مهارات التكيف', 'تحدي الأفكار السلبية'],
    ARRAY['Emotional regulation', 'Develop coping skills', 'Challenge negative thoughts'],
    ARRAY['anxiety_disorders', 'depression', 'ocd', 'trauma'],
    '["workbooks", "thought_records", "relaxation_materials"]'::jsonb,
    'counseling_office', ARRAY['comfortable_seating', 'privacy', 'calming_environment'],
    ARRAY['psychology_degree', 'cbt_certification', 'child_therapy_training'],
    '{"symptom_reduction": "weekly", "coping_skills": "bi-weekly", "functional_improvement": "monthly"}'::jsonb,
    16, 'تطوير استراتيجيات التكيف المستقلة', 'Development of independent coping strategies',
    true, true
),

-- 10. Feeding Therapy - Specialized Program
(
    'FT', 'علاج صعوبات التغذية', 'Feeding Therapy',
    'therapeutic', 'high',
    3, 45, -- 3 sessions/week, 45 minutes each
    6, 144, -- 6 months to 12 years
    '["Feeding Assessment", "Oral Motor Evaluation"]'::jsonb,
    '{"type": "feeding_therapy", "includes": ["intake", "textures", "oral_motor", "behavior"]}'::jsonb,
    '{"oral_motor": {}, "desensitization": {}, "behavioral_feeding": {}}'::jsonb,
    ARRAY['92507', '97530'],
    140.00,
    true, ARRAY['swallowing_disorders', 'aspiration_risk'],
    'يتطلب تقييم البلع وموافقة طبية', 'Requires swallowing evaluation and medical clearance',
    'برنامج علاج صعوبات التغذية لتطوير مهارات الأكل الآمن والمتنوع',
    'Feeding therapy program to develop safe and varied eating skills',
    ARRAY['تطوير مهارات الأكل', 'توسيع أنواع الطعام', 'تحسين الأمان أثناء البلع'],
    ARRAY['Develop eating skills', 'Expand food variety', 'Improve swallowing safety'],
    ARRAY['feeding_disorders', 'oral_motor_dysfunction', 'sensory_feeding_issues'],
    '["feeding_supplies", "various_textures", "oral_motor_tools"]'::jsonb,
    'feeding_therapy_room', ARRAY['high_chair', 'feeding_tools', 'suction_equipment', 'various_foods'],
    ARRAY['feeding_therapy_certification', 'swallowing_training', 'medical_background'],
    '{"food_acceptance": "session", "oral_motor_skills": "weekly", "safety_measures": "daily"}'::jsonb,
    20, 'تحقيق التغذية الآمنة والمتنوعة', 'Achievement of safe and varied nutrition',
    true, true
),

-- 11. Early Intervention - Developmental Program
(
    'EI', 'التدخل المبكر', 'Early Intervention',
    'developmental', 'intensive',
    5, 60, -- 5 sessions/week, 1 hour each
    6, 36, -- 6 months to 3 years
    '["Bayley-III", "AEPS-3", "Carolina Curriculum"]'::jsonb,
    '{"type": "early_intervention", "includes": ["developmental_milestones", "family_training"]}'::jsonb,
    '{"naturalistic_teaching": {}, "family_coaching": {}, "developmental_activities": {}}'::jsonb,
    ARRAY['97110', '97530', '97535'],
    180.00,
    false, ARRAY['unstable_medical_conditions'],
    'يحتاج تنسيق مع الفريق الطبي', 'Requires coordination with medical team',
    'برنامج التدخل المبكر الشامل للأطفال من 6 شهور إلى 3 سنوات',
    'Comprehensive early intervention program for children from 6 months to 3 years',
    ARRAY['تطوير المعالم التطويرية', 'تدريب الأسرة', 'بناء الأساس للتعلم'],
    ARRAY['Develop developmental milestones', 'Family training', 'Build learning foundation'],
    ARRAY['developmental_delays', 'autism_risk', 'genetic_disorders'],
    '["developmental_toys", "family_training_materials", "assessment_tools"]'::jsonb,
    'early_intervention_room', ARRAY['age_appropriate_toys', 'floor_space', 'family_seating'],
    ARRAY['early_intervention_certification', 'developmental_training', 'family_systems'],
    '{"milestone_achievement": "monthly", "family_competency": "bi-weekly", "school_readiness": "quarterly"}'::jsonb,
    24, 'الاستعداد للمرحلة التعليمية التالية', 'Readiness for next educational phase',
    true, true
),

-- 12. Transition to Adulthood - Life Skills Program
(
    'TAP', 'برنامج الانتقال للبلوغ', 'Transition to Adulthood Program',
    'educational', 'moderate',
    3, 90, -- 3 sessions/week, 1.5 hours each
    180, 216, -- 15 to 18 years
    '["Transition Planning Inventory", "Life Skills Assessment"]'::jsonb,
    '{"type": "transition_planning", "includes": ["vocational", "independent_living", "community"]}'::jsonb,
    '{"job_coaching": {}, "life_skills_training": {}, "community_integration": {}}'::jsonb,
    ARRAY['97530', '97535'],
    100.00,
    false, ARRAY['severe_cognitive_impairment'],
    'يحتاج تقييم شامل للمهارات الحياتية', 'Requires comprehensive life skills assessment',
    'برنامج الانتقال للبلوغ لإعداد المراهقين للحياة المستقلة والعمل',
    'Transition to adulthood program to prepare adolescents for independent living and employment',
    ARRAY['تطوير المهارات المهنية', 'بناء الاستقلالية', 'التكامل المجتمعي'],
    ARRAY['Develop vocational skills', 'Build independence', 'Community integration'],
    ARRAY['intellectual_disabilities', 'autism_spectrum_disorder', 'developmental_delays'],
    '["job_training_materials", "life_skills_tools", "community_access_training"]'::jsonb,
    'life_skills_training_area', ARRAY['kitchen_setup', 'computer_access', 'job_simulation_tools'],
    ARRAY['transition_specialist_certification', 'vocational_training', 'life_skills_training'],
    '{"skill_mastery": "monthly", "independence_level": "bi-monthly", "employment_readiness": "quarterly"}'::jsonb,
    36, 'الاستعداد للحياة المستقلة والعمل', 'Readiness for independent living and employment',
    true, true
);

-- =============================================================================
-- INSERT ASSESSMENT TOOLS
-- =============================================================================

INSERT INTO assessment_tools (
    tool_code, name_ar, name_en, assessment_type, domain,
    minimum_age_months, maximum_age_months, target_population_ar, target_population_en,
    administration_time_minutes, requires_training, certification_required,
    scoring_method, score_range_min, score_range_max,
    sections, total_items, completion_criteria,
    validity_studies, reliability_coefficient, normative_sample_size,
    digital_version_available, is_free, evidence_base_strength,
    is_active, is_approved_for_use
) VALUES

-- VB-MAPP (Verbal Behavior Milestones Assessment)
(
    'VB-MAPP', 'تقييم معالم السلوك اللفظي', 'Verbal Behavior Milestones Assessment',
    'progress_monitoring', 'autism', 18, 216,
    'الأطفال ذوي اضطراب طيف التوحد', 'Children with Autism Spectrum Disorder',
    120, true, true, 'manual', 0, 170,
    '["Milestones", "Barriers", "Transition", "EESA"]'::jsonb, 170,
    'Complete all applicable sections',
    ARRAY['Sundberg (2008)', 'Dixon et al. (2014)'], 0.95, 200,
    false, false, 'strong', true, true
),

-- ABLLS-R (Assessment of Basic Language and Learning Skills)
(
    'ABLLS-R', 'تقييم مهارات اللغة والتعلم الأساسية', 'Assessment of Basic Language and Learning Skills',
    'diagnostic', 'autism', 36, 108,
    'الأطفال ذوي اضطرابات التطور', 'Children with developmental disorders',
    90, true, false, 'manual', 0, 544,
    '["Basic Skills", "Academic Skills", "Self-Help", "Motor Skills"]'::jsonb, 544,
    'Complete relevant sections based on functioning level',
    ARRAY['Partington (2006)'], 0.92, 150,
    true, false, 'strong', true, true
),

-- CARS-2 (Childhood Autism Rating Scale)
(
    'CARS-2', 'مقياس تقدير التوحد في الطفولة', 'Childhood Autism Rating Scale',
    'diagnostic', 'autism', 24, 72,
    'الأطفال المشتبه بإصابتهم بالتوحد', 'Children suspected of having autism',
    30, true, true, 'manual', 15, 60,
    '["Social Interaction", "Communication", "Stereotyped Behaviors"]'::jsonb, 15,
    'Complete all 15 items',
    ARRAY['Schopler et al. (2010)'], 0.94, 1034,
    false, false, 'strong', true, true
),

-- PLS-5 (Preschool Language Scales)
(
    'PLS-5', 'مقاييس لغة ما قبل المدرسة', 'Preschool Language Scales',
    'diagnostic', 'speech_language', 0, 89,
    'الأطفال من الولادة حتى 7 سنوات', 'Children from birth to 7 years',
    45, true, false, 'automated', 50, 150,
    '["Auditory Comprehension", "Expressive Communication"]'::jsonb, 76,
    'Complete both auditory and expressive scales',
    ARRAY['Zimmerman et al. (2011)'], 0.91, 1564,
    true, false, 'strong', true, true
),

-- SIPT (Sensory Integration and Praxis Tests)
(
    'SIPT', 'اختبارات التكامل الحسي والتخطيط الحركي', 'Sensory Integration and Praxis Tests',
    'diagnostic', 'occupational', 48, 105,
    'الأطفال ذوي صعوبات التكامل الحسي', 'Children with sensory integration difficulties',
    90, true, true, 'manual', 0, 100,
    '["Praxis", "Sensory Processing", "Motor Skills"]'::jsonb, 17,
    'Complete all 17 subtests',
    ARRAY['Ayres (1989)', 'Mulligan (1998)'], 0.89, 2000,
    false, false, 'strong', true, true
);

-- =============================================================================
-- INSERT INTERVENTION PROTOCOLS
-- =============================================================================

INSERT INTO intervention_protocols (
    therapy_program_id, protocol_name_ar, protocol_name_en, protocol_code,
    description_ar, description_en, target_skills, prerequisites,
    step_by_step_instructions, materials_required,
    environmental_setup_ar, environmental_setup_en,
    data_collection_method, frequency_of_measurement,
    success_criteria, mastery_criteria_ar, mastery_criteria_en,
    progression_steps, modification_guidelines,
    research_evidence, evidence_quality, recommended_age_range,
    safety_considerations, contraindications, precautions,
    staff_training_required, training_duration_hours,
    approval_status, created_by
) VALUES

-- ABA Discrete Trial Training Protocol
(
    (SELECT id FROM therapy_programs WHERE program_code = 'ABA'),
    'التدريب بالمحاولات المنفصلة', 'Discrete Trial Training', 'DTT-001',
    'بروتوكول التدريب بالمحاولات المنفصلة لتعليم المهارات الأساسية',
    'Discrete Trial Training protocol for teaching fundamental skills',
    ARRAY['attention', 'imitation', 'receptive_language', 'expressive_language'],
    ARRAY['basic_compliance', 'attention_to_task'],
    '[{"step": 1, "instruction": "Present clear instruction"}, {"step": 2, "instruction": "Wait for response"}, {"step": 3, "instruction": "Provide consequence"}]'::jsonb,
    ARRAY['data_sheets', 'reinforcers', 'instructional_materials'],
    'بيئة هادئة مع طاولة وكرسيين', 'Quiet environment with table and two chairs',
    'trial_by_trial', 'each_trial',
    '{"accuracy": "80%", "independence": "3_consecutive_sessions"}'::jsonb,
    'إتقان 80% من المحاولات لثلاث جلسات متتالية', 'Mastery of 80% trials for 3 consecutive sessions',
    '[{"level": 1, "description": "Full prompts"}, {"level": 2, "description": "Partial prompts"}, {"level": 3, "description": "Independent"}]'::jsonb,
    ARRAY['reduce_prompts_gradually', 'increase_complexity', 'generalize_across_settings'],
    ARRAY['Lovaas (1987)', 'Smith (2001)', 'Eldevik et al. (2009)'],
    'high', '2-12 years',
    ARRAY['ensure_child_safety', 'monitor_stress_levels'],
    ARRAY['severe_behavioral_issues', 'medical_instability'],
    ARRAY['gentle_physical_guidance', 'respect_child_limits'],
    true, 40, 'approved', NULL
),

-- Speech Articulation Therapy Protocol
(
    (SELECT id FROM therapy_programs WHERE program_code = 'ST'),
    'بروتوكول علاج النطق', 'Articulation Therapy Protocol', 'ART-001',
    'بروتوكول منظم لعلاج اضطرابات النطق والتصويت',
    'Structured protocol for treating articulation and phonological disorders',
    ARRAY['sound_production', 'sound_discrimination', 'speech_clarity'],
    ARRAY['hearing_within_normal_limits', 'basic_attention'],
    '[{"step": 1, "instruction": "Sound isolation"}, {"step": 2, "instruction": "Syllable level"}, {"step": 3, "instruction": "Word level"}, {"step": 4, "instruction": "Sentence level"}]'::jsonb,
    ARRAY['mirror', 'articulation_cards', 'recording_device'],
    'غرفة هادئة مع مرآة وإضاءة جيدة', 'Quiet room with mirror and good lighting',
    'percentage_accuracy', 'weekly',
    '{"accuracy": "90%", "generalization": "multiple_contexts"}'::jsonb,
    '90% دقة في الإنتاج عبر بيئات متعددة', '90% accuracy in production across multiple environments',
    '[{"level": 1, "description": "Isolation"}, {"level": 2, "description": "Syllables"}, {"level": 3, "description": "Words"}, {"level": 4, "description": "Sentences"}, {"level": 5, "description": "Conversation"}]'::jsonb,
    ARRAY['adjust_complexity', 'use_visual_cues', 'practice_in_natural_contexts'],
    ARRAY['Van Riper (1978)', 'Bernthal et al. (2017)'],
    'high', '3-12 years',
    ARRAY['monitor_vocal_fatigue', 'ensure_proper_posture'],
    ARRAY['severe_hearing_loss', 'oral_motor_dysfunction'],
    ARRAY['avoid_forcing_sounds', 'take_vocal_breaks'],
    true, 20, 'approved', NULL
);

-- =============================================================================
-- UPDATE COMBINED MIGRATIONS
-- =============================================================================

-- Success message
SELECT 'Specialized Therapy Programs Seed Data inserted successfully!' as status,
       'Total Programs: ' || (SELECT COUNT(*) FROM therapy_programs) as program_count,
       'Total Assessment Tools: ' || (SELECT COUNT(*) FROM assessment_tools) as assessment_count,
       'Total Protocols: ' || (SELECT COUNT(*) FROM intervention_protocols) as protocol_count;

-- End of 015_therapy_programs_seed_data.sql

-- =====================================================================
-- Migration 19: 016_assessment_clinical_documentation.sql
-- =====================================================================

-- =====================================================================
-- Migration 16: Assessment & Clinical Documentation Enhancement
-- Phase 3: SOAP notes, standardized assessments, and progress tracking
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- ENHANCED SOAP NOTES STRUCTURE
-- Structured SOAP documentation with therapy-specific templates
-- =============================================================================

-- Extend clinical_documentation with enhanced SOAP structure
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS soap_template_id UUID;
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS structured_soap JSONB DEFAULT '{}';
ALTER TABLE clinical_documentation ADD COLUMN IF NOT EXISTS therapy_specific_data JSONB DEFAULT '{}';

-- SOAP Templates for different therapy types
CREATE TABLE IF NOT EXISTS soap_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Template Identification
    template_name_ar TEXT NOT NULL,
    template_name_en TEXT NOT NULL,
    template_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- SOAP Structure Definition
    subjective_fields JSONB DEFAULT '[]', -- Field definitions for subjective section
    objective_fields JSONB DEFAULT '[]', -- Field definitions for objective section
    assessment_fields JSONB DEFAULT '[]', -- Field definitions for assessment section
    plan_fields JSONB DEFAULT '[]', -- Field definitions for plan section
    
    -- Additional Sections
    additional_sections JSONB DEFAULT '{}', -- Therapy-specific additional sections
    required_fields TEXT[], -- Fields that must be completed
    conditional_fields JSONB DEFAULT '{}', -- Fields shown based on conditions
    
    -- Data Validation
    validation_rules JSONB DEFAULT '{}', -- Field validation rules
    score_calculations JSONB DEFAULT '{}', -- Automatic score calculations
    
    -- Template Configuration
    is_active BOOLEAN DEFAULT true,
    is_default_for_program BOOLEAN DEFAULT false,
    version VARCHAR(10) DEFAULT '1.0',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- STANDARDIZED ASSESSMENT RESULTS
-- Comprehensive assessment scoring and interpretation
-- =============================================================================
CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_tool_id UUID NOT NULL REFERENCES assessment_tools(id),
    clinical_doc_id UUID REFERENCES clinical_documentation(id),
    
    -- Assessment Session Details
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL REFERENCES auth.users(id),
    assessment_location VARCHAR(100),
    session_duration_minutes INTEGER,
    
    -- Assessment Context
    assessment_purpose VARCHAR(50) CHECK (assessment_purpose IN (
        'baseline', 'progress_monitoring', 'annual_review', 'discharge', 
        'diagnostic', 'program_planning', 'research'
    )),
    assessment_conditions TEXT, -- Testing conditions and environment
    accommodations_provided TEXT[], -- Any accommodations used
    
    -- Raw Scores and Responses
    raw_scores JSONB DEFAULT '{}', -- All raw scores by domain/subtest
    item_responses JSONB DEFAULT '{}', -- Individual item responses
    behavioral_observations JSONB DEFAULT '{}', -- Observations during testing
    
    -- Standard Scores and Interpretations
    standard_scores JSONB DEFAULT '{}', -- Converted standard scores
    percentile_ranks JSONB DEFAULT '{}', -- Percentile rankings
    age_equivalents JSONB DEFAULT '{}', -- Age equivalent scores
    grade_equivalents JSONB DEFAULT '{}', -- Grade equivalent scores
    
    -- Overall Results
    overall_score DECIMAL(8,2),
    composite_scores JSONB DEFAULT '{}', -- Composite domain scores
    confidence_intervals JSONB DEFAULT '{}', -- 95% confidence intervals
    
    -- Clinical Interpretation
    interpretation_summary_ar TEXT,
    interpretation_summary_en TEXT,
    strengths_identified TEXT[],
    areas_of_concern TEXT[],
    
    -- Recommendations
    immediate_recommendations TEXT[],
    long_term_recommendations TEXT[],
    referrals_suggested TEXT[],
    reassessment_timeline VARCHAR(50),
    
    -- Validity and Reliability
    test_validity VARCHAR(20) CHECK (test_validity IN (
        'valid', 'questionable', 'invalid'
    )),
    validity_concerns TEXT,
    cooperation_level INTEGER CHECK (cooperation_level BETWEEN 1 AND 5),
    effort_level INTEGER CHECK (effort_level BETWEEN 1 AND 5),
    
    -- Comparison Data
    previous_assessment_id UUID REFERENCES assessment_results(id),
    change_from_previous JSONB DEFAULT '{}', -- Changes since last assessment
    progress_indicators JSONB DEFAULT '{}', -- Specific progress measures
    
    -- Report Generation
    report_generated BOOLEAN DEFAULT false,
    report_path TEXT, -- Path to generated report
    report_shared_with_parents BOOLEAN DEFAULT false,
    report_shared_date DATE,
    
    -- Status and Approval
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'reviewed', 'approved', 'finalized'
    )),
    reviewed_by UUID REFERENCES medical_consultants(id),
    review_date DATE,
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MULTI-DIMENSIONAL PROGRESS TRACKING
-- Comprehensive progress measurement across domains
-- =============================================================================
CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id),
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Progress Period
    tracking_period_start DATE NOT NULL,
    tracking_period_end DATE NOT NULL,
    measurement_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (measurement_frequency IN (
        'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly'
    )),
    
    -- Goal-Based Progress
    goals_progress JSONB DEFAULT '{}', -- Progress on each individual goal
    goals_achieved INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goal_achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN goals_total > 0 THEN (goals_achieved::DECIMAL / goals_total) * 100 ELSE 0 END
    ) STORED,
    
    -- Skill Acquisition Data
    skills_targeted INTEGER DEFAULT 0,
    skills_emerging INTEGER DEFAULT 0,
    skills_acquired INTEGER DEFAULT 0,
    skills_mastered INTEGER DEFAULT 0,
    skills_generalized INTEGER DEFAULT 0,
    
    -- Skill Acquisition Rates
    acquisition_rate_weekly DECIMAL(5,2), -- Skills acquired per week
    mastery_rate_weekly DECIMAL(5,2), -- Skills mastered per week
    generalization_rate DECIMAL(5,2), -- Percentage of mastered skills generalized
    
    -- Behavioral Measurements
    target_behaviors JSONB DEFAULT '{}', -- Tracked target behaviors
    behavior_frequency_data JSONB DEFAULT '{}', -- Frequency measurements
    behavior_duration_data JSONB DEFAULT '{}', -- Duration measurements
    behavior_intensity_data JSONB DEFAULT '{}', -- Intensity measurements
    
    -- Functional Independence
    independence_scores JSONB DEFAULT '{}', -- Independence in various domains
    functional_skills_progress JSONB DEFAULT '{}', -- Progress in functional skills
    adaptive_behavior_scores JSONB DEFAULT '{}', -- Adaptive behavior measurements
    
    -- Academic/Developmental Milestones
    developmental_milestones JSONB DEFAULT '{}', -- Age-appropriate milestones
    academic_progress JSONB DEFAULT '{}', -- Academic skill progress
    cognitive_development JSONB DEFAULT '{}', -- Cognitive skill development
    
    -- Social-Emotional Progress
    social_skills_progress JSONB DEFAULT '{}', -- Social interaction skills
    emotional_regulation JSONB DEFAULT '{}', -- Emotional regulation abilities
    communication_progress JSONB DEFAULT '{}', -- Communication skill development
    
    -- Regression Monitoring
    regression_indicators JSONB DEFAULT '{}', -- Signs of skill regression
    regression_alerts BOOLEAN DEFAULT false,
    regression_severity VARCHAR(20), -- mild, moderate, severe
    regression_response_plan TEXT,
    
    -- Generalization Tracking
    generalization_settings TEXT[], -- Settings where skills are generalized
    generalization_people TEXT[], -- People with whom skills are generalized
    generalization_materials TEXT[], -- Materials across which skills generalize
    generalization_success_rate DECIMAL(5,2),
    
    -- Data Quality Metrics
    data_collection_reliability DECIMAL(3,2), -- Inter-observer agreement
    sessions_with_data INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    data_completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_sessions > 0 THEN (sessions_with_data::DECIMAL / total_sessions) * 100 ELSE 0 END
    ) STORED,
    
    -- Trend Analysis
    trend_direction VARCHAR(20) CHECK (trend_direction IN (
        'improving', 'stable', 'declining', 'variable'
    )),
    trend_strength DECIMAL(3,2), -- Correlation coefficient for trend
    predicted_outcome JSONB DEFAULT '{}', -- Predictive analytics
    
    -- Clinical Significance
    clinically_significant_change BOOLEAN DEFAULT false,
    effect_size DECIMAL(4,2), -- Statistical effect size
    meaningful_change_indicators JSONB DEFAULT '{}',
    
    -- Contextual Factors
    environmental_factors JSONB DEFAULT '{}', -- Environmental influences
    family_factors JSONB DEFAULT '{}', -- Family-related factors
    medical_factors JSONB DEFAULT '{}', -- Medical factors affecting progress
    
    -- Progress Summary
    overall_progress_rating INTEGER CHECK (overall_progress_rating BETWEEN 1 AND 5),
    progress_summary_ar TEXT,
    progress_summary_en TEXT,
    challenges_identified TEXT[],
    
    -- Recommendations
    intervention_modifications TEXT[],
    intensity_recommendations TEXT,
    goal_adjustments TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- GOAL MANAGEMENT SYSTEM
-- Structured goal setting, tracking, and achievement
-- =============================================================================
CREATE TABLE IF NOT EXISTS therapeutic_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id),
    therapy_program_id UUID REFERENCES therapy_programs(id),
    
    -- Goal Identification
    goal_number INTEGER NOT NULL,
    goal_category VARCHAR(50) NOT NULL, -- communication, motor, social, academic, etc.
    goal_domain VARCHAR(50) NOT NULL, -- specific domain within category
    
    -- SMART Goal Structure
    goal_statement_ar TEXT NOT NULL,
    goal_statement_en TEXT,
    specific_criteria JSONB DEFAULT '{}', -- Specific measurable criteria
    measurable_outcomes JSONB DEFAULT '{}', -- How progress will be measured
    achievable_steps TEXT[], -- Steps to achieve the goal
    relevant_justification TEXT, -- Why this goal is relevant
    time_bound_deadline DATE,
    
    -- Goal Hierarchy
    parent_goal_id UUID REFERENCES therapeutic_goals(id), -- For sub-goals
    goal_level INTEGER DEFAULT 1, -- 1=main goal, 2=sub-goal, etc.
    prerequisite_goals UUID[], -- Goals that must be achieved first
    
    -- Baseline and Target
    baseline_data JSONB DEFAULT '{}', -- Initial performance level
    target_criteria JSONB DEFAULT '{}', -- Target performance level
    mastery_criteria_ar TEXT,
    mastery_criteria_en TEXT,
    generalization_criteria TEXT[],
    
    -- Progress Tracking Configuration
    measurement_method VARCHAR(50), -- How progress is measured
    data_collection_frequency VARCHAR(20),
    progress_indicators JSONB DEFAULT '{}', -- What indicates progress
    
    -- Current Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'achieved', 'discontinued', 'modified', 'on_hold'
    )),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_performance_level JSONB DEFAULT '{}',
    
    -- Achievement Data
    date_initiated DATE DEFAULT CURRENT_DATE,
    date_achieved DATE,
    sessions_to_achieve INTEGER,
    trials_to_mastery INTEGER,
    
    -- Intervention Information
    intervention_strategies TEXT[],
    materials_needed TEXT[],
    environmental_arrangements TEXT,
    prompting_procedures JSONB DEFAULT '{}',
    reinforcement_schedule JSONB DEFAULT '{}',
    
    -- Team Assignment
    primary_therapist_id UUID REFERENCES therapists(id),
    secondary_therapist_id UUID REFERENCES therapists(id),
    family_involvement_level VARCHAR(20),
    
    -- Review and Modification
    last_review_date DATE,
    next_review_date DATE,
    review_frequency VARCHAR(20) DEFAULT 'monthly',
    modification_history JSONB DEFAULT '[]',
    
    -- Data Quality
    reliability_checks JSONB DEFAULT '{}',
    inter_observer_agreement DECIMAL(3,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- MILESTONE TRACKING SYSTEM
-- Developmental milestone achievement tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS developmental_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Milestone Definition
    milestone_code VARCHAR(20) UNIQUE NOT NULL,
    milestone_name_ar TEXT NOT NULL,
    milestone_name_en TEXT,
    
    -- Age and Development
    typical_age_months_min INTEGER,
    typical_age_months_max INTEGER,
    developmental_domain VARCHAR(30), -- gross_motor, fine_motor, language, social, cognitive
    
    -- Description
    description_ar TEXT,
    description_en TEXT,
    observable_behaviors TEXT[],
    assessment_criteria JSONB DEFAULT '{}',
    
    -- Prerequisites and Progressions
    prerequisite_milestones UUID[],
    next_milestones UUID[],
    
    -- Documentation
    evidence_source TEXT, -- Research or clinical source
    cultural_considerations TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student milestone achievement tracking
CREATE TABLE IF NOT EXISTS student_milestone_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES developmental_milestones(id),
    
    -- Achievement Status
    status VARCHAR(20) DEFAULT 'not_emerged' CHECK (status IN (
        'not_emerged', 'emerging', 'achieved', 'mastered', 'regressed'
    )),
    achievement_date DATE,
    age_at_achievement_months INTEGER,
    
    -- Evidence and Documentation
    evidence_source VARCHAR(30), -- observation, assessment, parent_report
    evidence_description TEXT,
    documented_by UUID REFERENCES auth.users(id),
    
    -- Progress Notes
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    support_needed VARCHAR(50), -- independent, minimal, moderate, maximum
    
    -- Context
    context_achieved VARCHAR(50), -- home, clinic, school, community
    generalization_contexts TEXT[],
    
    -- Quality Assurance
    verified_by UUID REFERENCES auth.users(id),
    verification_date DATE,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(student_id, milestone_id)
);

-- =============================================================================
-- REGRESSION DETECTION AND MONITORING
-- Early detection and response to skill regression
-- =============================================================================
CREATE TABLE IF NOT EXISTS regression_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Regression Incident
    detection_date DATE NOT NULL,
    detected_by UUID REFERENCES auth.users(id),
    
    -- Regression Details
    skills_affected TEXT[],
    severity_level VARCHAR(20) CHECK (severity_level IN (
        'mild', 'moderate', 'severe', 'profound'
    )),
    domains_affected VARCHAR(30)[], -- communication, motor, social, behavioral
    
    -- Regression Pattern
    onset_type VARCHAR(20) CHECK (onset_type IN (
        'gradual', 'sudden', 'fluctuating'
    )),
    duration_observed VARCHAR(20), -- days, weeks, months
    pattern_description TEXT,
    
    -- Baseline Comparison
    previous_performance_level JSONB DEFAULT '{}',
    current_performance_level JSONB DEFAULT '{}',
    percentage_decline DECIMAL(5,2),
    
    -- Contributing Factors
    potential_causes TEXT[], -- medical, environmental, behavioral, unknown
    recent_changes JSONB DEFAULT '{}', -- medication, environment, routine
    medical_factors TEXT[],
    environmental_factors TEXT[],
    
    -- Assessment and Investigation
    formal_assessments_completed TEXT[],
    medical_consultation_required BOOLEAN DEFAULT false,
    medical_consultation_completed BOOLEAN DEFAULT false,
    consultation_findings TEXT,
    
    -- Intervention Response
    intervention_modifications TEXT[],
    response_plan_implemented TEXT,
    response_effectiveness VARCHAR(20),
    
    -- Recovery Tracking
    recovery_initiated_date DATE,
    recovery_milestones JSONB DEFAULT '{}',
    full_recovery_date DATE,
    residual_effects TEXT[],
    
    -- Prevention Measures
    prevention_strategies TEXT[],
    monitoring_modifications TEXT[],
    early_warning_indicators TEXT[],
    
    -- Team Response
    team_members_notified TEXT[],
    family_notification_date DATE,
    medical_team_notification_date DATE,
    
    -- Follow-up
    follow_up_assessments JSONB DEFAULT '[]',
    long_term_monitoring_plan TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'resolved', 'monitoring', 'chronic'
    )),
    resolution_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- SOAP Templates
CREATE INDEX IF NOT EXISTS idx_soap_templates_program ON soap_templates(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_soap_templates_code ON soap_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_soap_templates_active ON soap_templates(is_active);

-- Assessment Results
CREATE INDEX IF NOT EXISTS idx_assessment_results_student ON assessment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_tool ON assessment_results(assessment_tool_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_date ON assessment_results(assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessor ON assessment_results(assessor_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_purpose ON assessment_results(assessment_purpose);
CREATE INDEX IF NOT EXISTS idx_assessment_results_status ON assessment_results(status);

-- Progress Tracking
CREATE INDEX IF NOT EXISTS idx_progress_tracking_student ON progress_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_program ON progress_tracking(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_period ON progress_tracking(tracking_period_start, tracking_period_end);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_achievement ON progress_tracking(goal_achievement_percentage);

-- Therapeutic Goals
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_student ON therapeutic_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_program ON therapeutic_goals(therapy_program_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_category ON therapeutic_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_status ON therapeutic_goals(status);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_deadline ON therapeutic_goals(time_bound_deadline);

-- Milestone Progress
CREATE INDEX IF NOT EXISTS idx_student_milestone_student ON student_milestone_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_milestone_milestone ON student_milestone_progress(milestone_id);
CREATE INDEX IF NOT EXISTS idx_student_milestone_status ON student_milestone_progress(status);
CREATE INDEX IF NOT EXISTS idx_student_milestone_achievement ON student_milestone_progress(achievement_date);

-- Regression Monitoring
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_student ON regression_monitoring(student_id);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_date ON regression_monitoring(detection_date);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_severity ON regression_monitoring(severity_level);
CREATE INDEX IF NOT EXISTS idx_regression_monitoring_status ON regression_monitoring(status);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_soap_templates_updated_at 
    BEFORE UPDATE ON soap_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_results_updated_at 
    BEFORE UPDATE ON assessment_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_tracking_updated_at 
    BEFORE UPDATE ON progress_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapeutic_goals_updated_at 
    BEFORE UPDATE ON therapeutic_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_milestone_progress_updated_at 
    BEFORE UPDATE ON student_milestone_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regression_monitoring_updated_at 
    BEFORE UPDATE ON regression_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to detect potential regression
CREATE OR REPLACE FUNCTION detect_potential_regression()
RETURNS TRIGGER AS $$
DECLARE
    decline_threshold DECIMAL := 20.0; -- 20% decline threshold
    prev_performance DECIMAL;
    current_performance DECIMAL;
    decline_percentage DECIMAL;
BEGIN
    -- Check if this is a progress update with concerning decline
    IF TG_OP = 'UPDATE' AND NEW.goal_achievement_percentage < OLD.goal_achievement_percentage THEN
        decline_percentage := OLD.goal_achievement_percentage - NEW.goal_achievement_percentage;
        
        -- If decline is significant, create regression monitoring record
        IF decline_percentage >= decline_threshold THEN
            INSERT INTO regression_monitoring (
                student_id,
                detection_date,
                detected_by,
                skills_affected,
                severity_level,
                onset_type,
                previous_performance_level,
                current_performance_level,
                percentage_decline,
                potential_causes
            ) VALUES (
                NEW.student_id,
                CURRENT_DATE,
                auth.uid(),
                ARRAY['goal_achievement'],
                CASE 
                    WHEN decline_percentage >= 50 THEN 'severe'
                    WHEN decline_percentage >= 30 THEN 'moderate'
                    ELSE 'mild'
                END,
                'gradual',
                jsonb_build_object('goal_achievement', OLD.goal_achievement_percentage),
                jsonb_build_object('goal_achievement', NEW.goal_achievement_percentage),
                decline_percentage,
                ARRAY['unknown']
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply regression detection trigger
CREATE TRIGGER detect_regression_trigger
    AFTER UPDATE ON progress_tracking
    FOR EACH ROW
    EXECUTE FUNCTION detect_potential_regression();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE soap_templates IS 'Structured SOAP note templates for different therapy programs';
COMMENT ON TABLE assessment_results IS 'Comprehensive standardized assessment results and interpretations';
COMMENT ON TABLE progress_tracking IS 'Multi-dimensional progress tracking across all domains';
COMMENT ON TABLE therapeutic_goals IS 'SMART goal management system with achievement tracking';
COMMENT ON TABLE developmental_milestones IS 'Developmental milestone definitions and criteria';
COMMENT ON TABLE student_milestone_progress IS 'Individual student milestone achievement tracking';
COMMENT ON TABLE regression_monitoring IS 'Early detection and monitoring of skill regression';

COMMENT ON FUNCTION detect_potential_regression() IS 'Automatically detects significant performance declines and creates regression monitoring records';

-- Success verification
SELECT 'Assessment & Clinical Documentation Enhancement created successfully!' as status;

-- End of 016_assessment_clinical_documentation.sql

-- =====================================================================
-- Migration 20: 017_assessment_seed_data.sql
-- =====================================================================

-- =====================================================================
-- Migration 17: Assessment & Clinical Documentation Seed Data
-- Phase 3: Sample data for SOAP templates, milestones, and assessments
-- Arkan Al-Numo Center - Medical-grade Therapy ERP System
-- =====================================================================

-- =============================================================================
-- SOAP TEMPLATES FOR EACH THERAPY PROGRAM
-- =============================================================================

INSERT INTO soap_templates (
    therapy_program_id, template_name_ar, template_name_en, template_code,
    subjective_fields, objective_fields, assessment_fields, plan_fields,
    additional_sections, required_fields, validation_rules,
    is_active, is_default_for_program
) VALUES

-- ABA SOAP Template
(
    (SELECT id FROM therapy_programs WHERE program_code = 'ABA'),
    'قالب SOAP لتحليل السلوك التطبيقي', 'ABA SOAP Template', 'SOAP_ABA_001',
    '[
        {"id": "parent_report", "label_ar": "تقرير الوالدين", "label_en": "Parent Report", "type": "textarea", "required": true},
        {"id": "child_mood", "label_ar": "مزاج الطفل", "label_en": "Child Mood", "type": "select", "options": ["happy", "calm", "anxious", "irritable"]},
        {"id": "sleep_quality", "label_ar": "جودة النوم", "label_en": "Sleep Quality", "type": "select", "options": ["good", "fair", "poor"]},
        {"id": "appetite", "label_ar": "الشهية", "label_en": "Appetite", "type": "select", "options": ["normal", "increased", "decreased"]},
        {"id": "recent_events", "label_ar": "الأحداث الحديثة", "label_en": "Recent Events", "type": "textarea"}
    ]'::jsonb,
    '[
        {"id": "target_behaviors", "label_ar": "السلوكيات المستهدفة", "label_en": "Target Behaviors", "type": "behavior_tracker", "required": true},
        {"id": "abc_data", "label_ar": "بيانات ABC", "label_en": "ABC Data", "type": "abc_table", "required": true},
        {"id": "trial_data", "label_ar": "بيانات المحاولات", "label_en": "Trial Data", "type": "trial_tracker"},
        {"id": "reinforcement_data", "label_ar": "بيانات التعزيز", "label_en": "Reinforcement Data", "type": "reinforcement_tracker"},
        {"id": "environmental_factors", "label_ar": "العوامل البيئية", "label_en": "Environmental Factors", "type": "checklist"}
    ]'::jsonb,
    '[
        {"id": "goal_progress", "label_ar": "تقدم الأهداف", "label_en": "Goal Progress", "type": "goal_tracker", "required": true},
        {"id": "behavior_analysis", "label_ar": "تحليل السلوك", "label_en": "Behavior Analysis", "type": "textarea", "required": true},
        {"id": "skill_acquisition", "label_ar": "اكتساب المهارات", "label_en": "Skill Acquisition", "type": "skill_tracker"},
        {"id": "generalization", "label_ar": "التعميم", "label_en": "Generalization", "type": "generalization_tracker"},
        {"id": "challenges", "label_ar": "التحديات", "label_en": "Challenges", "type": "textarea"}
    ]'::jsonb,
    '[
        {"id": "next_session_focus", "label_ar": "تركيز الجلسة القادمة", "label_en": "Next Session Focus", "type": "textarea", "required": true},
        {"id": "intervention_modifications", "label_ar": "تعديلات التدخل", "label_en": "Intervention Modifications", "type": "textarea"},
        {"id": "home_program", "label_ar": "البرنامج المنزلي", "label_en": "Home Program", "type": "textarea"},
        {"id": "parent_training", "label_ar": "تدريب الوالدين", "label_en": "Parent Training", "type": "textarea"},
        {"id": "data_collection_plan", "label_ar": "خطة جمع البيانات", "label_en": "Data Collection Plan", "type": "textarea"}
    ]'::jsonb,
    '{"behavior_frequency": {"type": "frequency_chart"}, "reinforcement_schedule": {"type": "schedule_tracker"}}'::jsonb,
    ARRAY['parent_report', 'target_behaviors', 'abc_data', 'goal_progress', 'behavior_analysis', 'next_session_focus'],
    '{"target_behaviors": {"min_entries": 1}, "abc_data": {"min_entries": 3}}'::jsonb,
    true, true
),

-- Speech Therapy SOAP Template
(
    (SELECT id FROM therapy_programs WHERE program_code = 'ST'),
    'قالب SOAP لعلاج النطق', 'Speech Therapy SOAP Template', 'SOAP_ST_001',
    '[
        {"id": "parent_report", "label_ar": "تقرير الوالدين", "label_en": "Parent Report", "type": "textarea", "required": true},
        {"id": "communication_attempts", "label_ar": "محاولات التواصل", "label_en": "Communication Attempts", "type": "number"},
        {"id": "home_practice", "label_ar": "الممارسة المنزلية", "label_en": "Home Practice", "type": "select", "options": ["daily", "frequent", "occasional", "none"]},
        {"id": "voice_quality", "label_ar": "جودة الصوت", "label_en": "Voice Quality", "type": "select", "options": ["normal", "hoarse", "breathy", "strained"]}
    ]'::jsonb,
    '[
        {"id": "articulation_data", "label_ar": "بيانات النطق", "label_en": "Articulation Data", "type": "articulation_tracker", "required": true},
        {"id": "language_samples", "label_ar": "عينات اللغة", "label_en": "Language Samples", "type": "language_tracker"},
        {"id": "fluency_measures", "label_ar": "قياسات الطلاقة", "label_en": "Fluency Measures", "type": "fluency_tracker"},
        {"id": "communication_modalities", "label_ar": "وسائل التواصل", "label_en": "Communication Modalities", "type": "modality_tracker"}
    ]'::jsonb,
    '[
        {"id": "speech_clarity", "label_ar": "وضوح الكلام", "label_en": "Speech Clarity", "type": "rating", "scale": 5, "required": true},
        {"id": "language_comprehension", "label_ar": "فهم اللغة", "label_en": "Language Comprehension", "type": "rating", "scale": 5, "required": true},
        {"id": "expressive_language", "label_ar": "اللغة التعبيرية", "label_en": "Expressive Language", "type": "rating", "scale": 5},
        {"id": "pragmatic_skills", "label_ar": "المهارات العملية", "label_en": "Pragmatic Skills", "type": "rating", "scale": 5}
    ]'::jsonb,
    '[
        {"id": "target_sounds", "label_ar": "الأصوات المستهدفة", "label_en": "Target Sounds", "type": "sound_selector", "required": true},
        {"id": "therapy_techniques", "label_ar": "تقنيات العلاج", "label_en": "Therapy Techniques", "type": "technique_selector"},
        {"id": "home_exercises", "label_ar": "التمارين المنزلية", "label_en": "Home Exercises", "type": "textarea"},
        {"id": "family_strategies", "label_ar": "استراتيجيات الأسرة", "label_en": "Family Strategies", "type": "textarea"}
    ]'::jsonb,
    '{"sound_inventory": {"type": "phoneme_chart"}, "progress_chart": {"type": "articulation_progress"}}'::jsonb,
    ARRAY['parent_report', 'articulation_data', 'speech_clarity', 'language_comprehension', 'target_sounds'],
    '{"articulation_data": {"min_sounds": 3}, "target_sounds": {"max_sounds": 5}}'::jsonb,
    true, true
),

-- Occupational Therapy SOAP Template
(
    (SELECT id FROM therapy_programs WHERE program_code = 'OT'),
    'قالب SOAP للعلاج الوظيفي', 'Occupational Therapy SOAP Template', 'SOAP_OT_001',
    '[
        {"id": "parent_report", "label_ar": "تقرير الوالدين", "label_en": "Parent Report", "type": "textarea", "required": true},
        {"id": "daily_activities", "label_ar": "الأنشطة اليومية", "label_en": "Daily Activities", "type": "adl_checklist"},
        {"id": "sensory_responses", "label_ar": "الاستجابات الحسية", "label_en": "Sensory Responses", "type": "sensory_checklist"},
        {"id": "motor_activities", "label_ar": "الأنشطة الحركية", "label_en": "Motor Activities", "type": "motor_checklist"}
    ]'::jsonb,
    '[
        {"id": "fine_motor_assessment", "label_ar": "تقييم المهارات الحركية الدقيقة", "label_en": "Fine Motor Assessment", "type": "motor_tracker", "required": true},
        {"id": "gross_motor_assessment", "label_ar": "تقييم المهارات الحركية الكبيرة", "label_en": "Gross Motor Assessment", "type": "motor_tracker"},
        {"id": "sensory_processing", "label_ar": "المعالجة الحسية", "label_en": "Sensory Processing", "type": "sensory_tracker"},
        {"id": "visual_motor_integration", "label_ar": "التكامل البصري الحركي", "label_en": "Visual Motor Integration", "type": "vmi_tracker"}
    ]'::jsonb,
    '[
        {"id": "motor_skills_progress", "label_ar": "تقدم المهارات الحركية", "label_en": "Motor Skills Progress", "type": "progress_tracker", "required": true},
        {"id": "sensory_regulation", "label_ar": "التنظيم الحسي", "label_en": "Sensory Regulation", "type": "rating", "scale": 5},
        {"id": "independence_level", "label_ar": "مستوى الاستقلالية", "label_en": "Independence Level", "type": "rating", "scale": 5},
        {"id": "participation_quality", "label_ar": "جودة المشاركة", "label_en": "Participation Quality", "type": "rating", "scale": 5}
    ]'::jsonb,
    '[
        {"id": "motor_goals", "label_ar": "الأهداف الحركية", "label_en": "Motor Goals", "type": "goal_selector", "required": true},
        {"id": "sensory_strategies", "label_ar": "الاستراتيجيات الحسية", "label_en": "Sensory Strategies", "type": "strategy_selector"},
        {"id": "equipment_recommendations", "label_ar": "توصيات المعدات", "label_en": "Equipment Recommendations", "type": "equipment_selector"},
        {"id": "environmental_modifications", "label_ar": "التعديلات البيئية", "label_en": "Environmental Modifications", "type": "textarea"}
    ]'::jsonb,
    '{"sensory_profile": {"type": "sensory_wheel"}, "motor_development": {"type": "developmental_chart"}}'::jsonb,
    ARRAY['parent_report', 'fine_motor_assessment', 'motor_skills_progress', 'motor_goals'],
    '{"fine_motor_assessment": {"min_tasks": 3}, "motor_goals": {"max_goals": 4}}'::jsonb,
    true, true
);

-- =============================================================================
-- DEVELOPMENTAL MILESTONES LIBRARY
-- =============================================================================

INSERT INTO developmental_milestones (
    milestone_code, milestone_name_ar, milestone_name_en,
    typical_age_months_min, typical_age_months_max, developmental_domain,
    description_ar, description_en, observable_behaviors,
    assessment_criteria, evidence_source
) VALUES

-- Communication Milestones
('COMM_001', 'الابتسامة الاجتماعية', 'Social Smile', 2, 4, 'communication',
'ابتسامة استجابة للتفاعل الاجتماعي', 'Smile in response to social interaction',
ARRAY['smiles_at_faces', 'responds_to_voice', 'eye_contact'],
'{"criteria": ["spontaneous_smile", "responsive_smile"], "duration": "consistent_over_week"}'::jsonb,
'CDC Developmental Milestones'),

('COMM_002', 'المناغاة', 'Babbling', 4, 7, 'communication',
'إنتاج أصوات متكررة مثل با-با، ما-ما', 'Production of repetitive sounds like ba-ba, ma-ma',
ARRAY['repetitive_syllables', 'consonant_vowel_combinations', 'vocal_play'],
'{"criteria": ["canonical_babbling", "variety_of_sounds"], "frequency": "daily"}'::jsonb,
'CDC Developmental Milestones'),

('COMM_003', 'الكلمة الأولى', 'First Word', 10, 14, 'communication',
'إنتاج أول كلمة ذات معنى', 'Production of first meaningful word',
ARRAY['consistent_word_use', 'meaningful_context', 'intentional_communication'],
'{"criteria": ["consistent_usage", "meaningful_context"], "witnesses": "multiple_people"}'::jsonb,
'CDC Developmental Milestones'),

('COMM_004', 'مفردات 50 كلمة', '50 Word Vocabulary', 18, 24, 'communication',
'استخدام 50 كلمة مختلفة بوضوح', 'Use of 50 different words clearly',
ARRAY['variety_of_words', 'clear_pronunciation', 'functional_use'],
'{"criteria": ["word_count", "clarity", "functionality"], "assessment": "parent_report_plus_observation"}'::jsonb,
'MacArthur-Bates CDI'),

-- Motor Milestones
('MOTOR_001', 'رفع الرأس', 'Head Lift', 1, 3, 'gross_motor',
'رفع الرأس أثناء الاستلقاء على البطن', 'Lifting head while lying on stomach',
ARRAY['head_control', 'neck_strength', 'prone_position'],
'{"criteria": ["45_degree_lift", "sustained_hold"], "duration": "few_seconds"}'::jsonb,
'WHO Motor Development'),

('MOTOR_002', 'الجلوس المستقل', 'Independent Sitting', 6, 9, 'gross_motor',
'الجلوس بدون دعم لفترة مستقلة', 'Sitting without support independently',
ARRAY['balance_while_sitting', 'no_hand_support', 'stable_posture'],
'{"criteria": ["no_support", "stable_balance"], "duration": "30_seconds"}'::jsonb,
'WHO Motor Development'),

('MOTOR_003', 'المشي المستقل', 'Independent Walking', 9, 18, 'gross_motor',
'المشي بشكل مستقل بدون دعم', 'Walking independently without support',
ARRAY['steps_without_support', 'balance_during_walking', 'coordinated_movement'],
'{"criteria": ["consecutive_steps", "balance", "coordination"], "minimum": "10_steps"}'::jsonb,
'WHO Motor Development'),

-- Fine Motor Milestones
('FINE_001', 'القبضة البدائية', 'Primitive Grasp', 0, 4, 'fine_motor',
'إغلاق الأصابع حول الأشياء', 'Closing fingers around objects',
ARRAY['reflex_grasp', 'finger_closure', 'object_holding'],
'{"criteria": ["automatic_response", "finger_involvement"], "trigger": "palm_stimulation"}'::jsonb,
'Erhardt Developmental Prehension Assessment'),

('FINE_002', 'القبضة الكماشية', 'Pincer Grasp', 8, 12, 'fine_motor',
'استخدام الإبهام والسبابة لالتقاط الأشياء الصغيرة', 'Using thumb and index finger to pick up small objects',
ARRAY['thumb_index_opposition', 'precise_pickup', 'small_object_manipulation'],
'{"criteria": ["thumb_index_use", "precision", "control"], "object_size": "small_items"}'::jsonb,
'Peabody Developmental Motor Scales'),

-- Social-Emotional Milestones
('SOCIAL_001', 'التقليد الاجتماعي', 'Social Imitation', 12, 18, 'social_emotional',
'تقليد الأفعال البسيطة للآخرين', 'Imitating simple actions of others',
ARRAY['copies_actions', 'social_engagement', 'intentional_imitation'],
'{"criteria": ["deliberate_copying", "social_context"], "examples": ["clapping", "waving"]}'::jsonb,
'Early Social Communication Scales'),

('SOCIAL_002', 'اللعب التظاهري', 'Pretend Play', 18, 24, 'social_emotional',
'الانخراط في اللعب التخيلي البسيط', 'Engaging in simple pretend play',
ARRAY['symbolic_play', 'imagination_use', 'role_playing'],
'{"criteria": ["symbolic_representation", "sustained_play"], "examples": ["feeding_doll", "talking_on_phone"]}'::jsonb,
'Transdisciplinary Play-Based Assessment'),

-- Cognitive Milestones
('COG_001', 'دوام الشيء', 'Object Permanence', 8, 12, 'cognitive',
'فهم أن الأشياء تستمر في الوجود حتى لو لم تعد مرئية', 'Understanding that objects continue to exist even when not visible',
ARRAY['searches_for_hidden_objects', 'remembers_object_location', 'problem_solving'],
'{"criteria": ["active_search", "persistence"], "test": "hidden_object_task"}'::jsonb,
'Piaget Sensorimotor Stages'),

('COG_002', 'حل المشكلات البسيط', 'Simple Problem Solving', 12, 18, 'cognitive',
'استخدام الأدوات أو الاستراتيجيات لحل المشكلات البسيطة', 'Using tools or strategies to solve simple problems',
ARRAY['tool_use', 'goal_directed_behavior', 'problem_solving_persistence'],
'{"criteria": ["means_end_behavior", "tool_use"], "examples": ["using_stick_to_reach", "stacking_to_climb"]}'::jsonb,
'Bayley Scales of Infant Development');

-- =============================================================================
-- SAMPLE ASSESSMENT RESULTS
-- =============================================================================

-- Insert sample assessment results for existing students
INSERT INTO assessment_results (
    student_id, assessment_tool_id, assessment_date, assessor_id,
    assessment_purpose, session_duration_minutes,
    raw_scores, standard_scores, percentile_ranks,
    overall_score, interpretation_summary_ar, interpretation_summary_en,
    strengths_identified, areas_of_concern,
    immediate_recommendations, long_term_recommendations,
    test_validity, cooperation_level, effort_level,
    status
) VALUES

-- Ahmed's VB-MAPP Assessment
(
    (SELECT id FROM students WHERE first_name_ar = 'أحمد' LIMIT 1),
    (SELECT id FROM assessment_tools WHERE tool_code = 'VB-MAPP' LIMIT 1),
    '2024-08-20', NULL, 'baseline', 90,
    '{"mand": 15, "tact": 12, "listener": 18, "intraverbal": 8, "social": 10}'::jsonb,
    '{"total": 63, "mand": 75, "tact": 60, "listener": 90, "intraverbal": 40}'::jsonb,
    '{"total": 25, "mand": 40, "tact": 20, "listener": 60, "intraverbal": 10}'::jsonb,
    63.0,
    'يُظهر أحمد نقاط قوة في مهارات الاستماع مع تحديات في المهارات اللفظية والتفاعل الاجتماعي',
    'Ahmed demonstrates strengths in listener skills with challenges in verbal and social interaction skills',
    ARRAY['good_listener_skills', 'follows_simple_instructions', 'attentive_to_environment'],
    ARRAY['limited_expressive_language', 'social_interaction_deficits', 'restricted_intraverbal_skills'],
    ARRAY['increase_mand_training', 'focus_on_tact_development', 'enhance_social_interaction'],
    ARRAY['comprehensive_language_program', 'social_skills_training', 'family_training'],
    'valid', 4, 4, 'finalized'
),

-- Fatima's CARS-2 Assessment
(
    (SELECT id FROM students WHERE first_name_ar = 'فاطمة' LIMIT 1),
    (SELECT id FROM assessment_tools WHERE tool_code = 'CARS-2' LIMIT 1),
    '2024-08-10', NULL, 'diagnostic', 45,
    '{"social_interaction": 2.5, "communication": 3.0, "stereotyped_behaviors": 2.0, "resistance_to_change": 2.5}'::jsonb,
    '{"total": 32.5}'::jsonb,
    '{"total": 75}'::jsonb,
    32.5,
    'تُظهر فاطمة خصائص اضطراب طيف التوحد بدرجة خفيفة إلى متوسطة',
    'Fatima demonstrates characteristics of autism spectrum disorder in the mild to moderate range',
    ARRAY['good_eye_contact', 'responds_to_name', 'shows_affection'],
    ARRAY['social_communication_delays', 'repetitive_behaviors', 'difficulty_with_transitions'],
    ARRAY['structured_social_skills_training', 'communication_intervention', 'behavioral_support'],
    ARRAY['comprehensive_autism_program', 'family_education', 'school_support'],
    'valid', 5, 4, 'finalized'
);

-- =============================================================================
-- SAMPLE THERAPEUTIC GOALS
-- =============================================================================

INSERT INTO therapeutic_goals (
    student_id, program_enrollment_id, therapy_program_id,
    goal_number, goal_category, goal_domain,
    goal_statement_ar, goal_statement_en,
    specific_criteria, measurable_outcomes,
    achievable_steps, time_bound_deadline,
    baseline_data, target_criteria,
    mastery_criteria_ar, mastery_criteria_en,
    measurement_method, data_collection_frequency,
    intervention_strategies, status, progress_percentage
) VALUES

-- Ahmed's Communication Goals
(
    (SELECT id FROM students WHERE first_name_ar = 'أحمد' LIMIT 1),
    NULL,
    (SELECT id FROM therapy_programs WHERE program_code = 'ST'),
    1, 'communication', 'expressive_language',
    'سيطلب أحمد 10 أشياء مفضلة باستخدام كلمات واضحة في 80% من الفرص عبر 3 أشخاص مختلفين',
    'Ahmed will request 10 preferred items using clear words in 80% of opportunities across 3 different people',
    '{"items": 10, "clarity": "clear_words", "accuracy": "80%", "people": 3}'::jsonb,
    '{"frequency": "daily_opportunities", "measurement": "percentage_correct", "generalization": "across_people"}'::jsonb,
    ARRAY['identify_preferred_items', 'teach_each_word_individually', 'practice_with_different_people', 'generalize_across_settings'],
    '2024-12-20',
    '{"current_requests": 3, "accuracy": "30%", "people": 1}'::jsonb,
    '{"target_requests": 10, "accuracy": "80%", "people": 3}'::jsonb,
    'إتقان 80% من الطلبات لثلاث جلسات متتالية مع أشخاص مختلفين',
    'Mastery of 80% requests for 3 consecutive sessions with different people',
    'direct_observation', 'daily',
    ARRAY['mand_training', 'naturalistic_teaching', 'prompting_hierarchy'],
    'active', 45.0
),

-- Fatima's Social Skills Goal
(
    (SELECT id FROM students WHERE first_name_ar = 'فاطمة' LIMIT 1),
    NULL,
    (SELECT id FROM therapy_programs WHERE program_code = 'SST'),
    1, 'social', 'peer_interaction',
    'ستبدأ فاطمة التفاعل مع أقرانها في 5 أنشطة مختلفة لمدة 10 دقائق على الأقل في كل نشاط',
    'Fatima will initiate peer interaction in 5 different activities for at least 10 minutes each activity',
    '{"activities": 5, "duration": "10_minutes", "initiation": "student_led"}'::jsonb,
    '{"frequency": "weekly_sessions", "measurement": "duration_and_quality", "activities": "varied"}'::jsonb,
    ARRAY['identify_preferred_activities', 'teach_initiation_skills', 'practice_with_peers', 'extend_duration'],
    '2024-11-15',
    '{"current_activities": 2, "duration": "5_minutes", "initiation": "prompted"}'::jsonb,
    '{"target_activities": 5, "duration": "10_minutes", "initiation": "independent"}'::jsonb,
    'المشاركة المستقلة لمدة 10 دقائق في 5 أنشطة مختلفة لأسبوعين متتاليين',
    'Independent participation for 10 minutes in 5 different activities for 2 consecutive weeks',
    'time_sampling', 'weekly',
    ARRAY['social_stories', 'peer_mediated_intervention', 'structured_play'],
    'active', 60.0
);

-- =============================================================================
-- SAMPLE PROGRESS TRACKING RECORDS
-- =============================================================================

INSERT INTO progress_tracking (
    student_id, therapy_program_id, tracking_period_start, tracking_period_end,
    measurement_frequency, goals_total, goals_achieved,
    skills_targeted, skills_emerging, skills_acquired, skills_mastered,
    acquisition_rate_weekly, mastery_rate_weekly,
    target_behaviors, behavior_frequency_data,
    independence_scores, developmental_milestones,
    trend_direction, overall_progress_rating,
    progress_summary_ar, progress_summary_en,
    challenges_identified, intervention_modifications
) VALUES

-- Ahmed's Speech Therapy Progress
(
    (SELECT id FROM students WHERE first_name_ar = 'أحمد' LIMIT 1),
    (SELECT id FROM therapy_programs WHERE program_code = 'ST'),
    '2024-09-01', '2024-10-31',
    'weekly', 5, 2,
    15, 8, 5, 2,
    1.2, 0.5,
    '{"requesting": {"target": "increase", "baseline": 3}, "protesting": {"target": "appropriate_form", "baseline": "tantrums"}}'::jsonb,
    '{"requesting": [3, 4, 5, 6, 7, 8, 9], "protesting": [5, 4, 3, 2, 2, 1, 1]}'::jsonb,
    '{"communication": 3, "daily_living": 2, "social": 2}'::jsonb,
    '{"first_word": "achieved", "50_words": "emerging", "2_word_combinations": "not_emerged"}'::jsonb,
    'improving', 4,
    'يُظهر أحمد تحسناً مستمراً في مهارات التواصل مع زيادة واضحة في الطلبات اللفظية',
    'Ahmed demonstrates consistent improvement in communication skills with clear increase in verbal requests',
    ARRAY['occasional_regression_during_illness', 'difficulty_generalizing_to_home'],
    ARRAY['increase_home_practice', 'add_visual_supports', 'involve_family_more']
),

-- Fatima's ABA Progress
(
    (SELECT id FROM students WHERE first_name_ar = 'فاطمة' LIMIT 1),
    (SELECT id FROM therapy_programs WHERE program_code = 'ABA'),
    '2024-08-15', '2024-10-15',
    'weekly', 8, 4,
    25, 12, 8, 4,
    2.0, 1.0,
    '{"social_initiation": {"target": "increase", "baseline": 1}, "repetitive_behavior": {"target": "decrease", "baseline": 15}}'::jsonb,
    '{"social_initiation": [1, 2, 3, 4, 5, 6, 8], "repetitive_behavior": [15, 13, 10, 8, 6, 5, 4]}'::jsonb,
    '{"social": 3, "communication": 4, "daily_living": 3}'::jsonb,
    '{"social_smile": "achieved", "social_imitation": "achieved", "pretend_play": "emerging"}'::jsonb,
    'improving', 5,
    'تُظهر فاطمة تقدماً ممتازاً في البرنامج مع تحسن كبير في المهارات الاجتماعية والتواصل',
    'Fatima demonstrates excellent progress in the program with significant improvement in social and communication skills',
    ARRAY['sensitivity_to_schedule_changes', 'need_for_consistent_reinforcement'],
    ARRAY['maintain_consistent_schedule', 'fade_prompts_gradually', 'increase_natural_reinforcement']
);

-- =============================================================================
-- UPDATE MIGRATION SCRIPT
-- =============================================================================

-- Update combined migration script
SELECT 'Assessment & Clinical Documentation Seed Data inserted successfully!' as status,
       'SOAP Templates: ' || (SELECT COUNT(*) FROM soap_templates) as soap_count,
       'Milestones: ' || (SELECT COUNT(*) FROM developmental_milestones) as milestone_count,
       'Assessment Results: ' || (SELECT COUNT(*) FROM assessment_results) as assessment_count,
       'Goals: ' || (SELECT COUNT(*) FROM therapeutic_goals) as goals_count,
       'Progress Records: ' || (SELECT COUNT(*) FROM progress_tracking) as progress_count;

-- End of 017_assessment_seed_data.sql


-- =====================================================================
-- Verification Queries (run these to check if setup was successful)
-- =====================================================================

-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('plan_categories', 'therapy_plans', 'plan_sessions', 'plan_templates', 'profiles')
ORDER BY table_name;

-- Check if sample data was inserted
SELECT COUNT(*) as categories_count FROM plan_categories;
SELECT COUNT(*) as plans_count FROM therapy_plans;

-- Success message
SELECT 'Database setup completed successfully!' as status;
-- Parent Portal Database Schema
-- Phase 5: Parent Portal & Engagement System

-- Parent Users Table
CREATE TABLE parent_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id TEXT UNIQUE NOT NULL DEFAULT 'parent-' || extract(epoch from now())::text,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'caregiver')) DEFAULT 'father',
  preferred_language TEXT CHECK (preferred_language IN ('ar', 'en')) DEFAULT 'ar',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  notification_preferences JSONB DEFAULT '{
    "sessionReminders": true,
    "progressUpdates": true,
    "homeProgramUpdates": true,
    "appointmentChanges": true,
    "emergencyAlerts": true,
    "weeklyReports": true,
    "communicationMethod": "email",
    "reminderTiming": 2
  }',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student-Parent Relationships
CREATE TABLE student_parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'caregiver')),
  is_primary_contact BOOLEAN DEFAULT false,
  emergency_contact BOOLEAN DEFAULT false,
  pickup_authorized BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, parent_id)
);

-- Parent Messages System
CREATE TABLE parent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('parent', 'therapist', 'admin', 'system')) NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'voice', 'image', 'document', 'video')) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  reply_to_message_id UUID REFERENCES parent_messages(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_parent_messages_conversation (conversation_id),
  INDEX idx_parent_messages_recipient (recipient_id),
  INDEX idx_parent_messages_sender (sender_id)
);

-- Home Programs for Parents
CREATE TABLE home_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  program_title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL,
  assigned_by_name TEXT NOT NULL,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category TEXT,
  estimated_duration INTEGER, -- in minutes
  instructions JSONB DEFAULT '[]',
  materials JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')) DEFAULT 'assigned',
  completion_date TIMESTAMP WITH TIME ZONE,
  parent_feedback TEXT,
  parent_rating INTEGER CHECK (parent_rating >= 1 AND parent_rating <= 5),
  video_url TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_home_programs_child (child_id),
  INDEX idx_home_programs_status (status),
  INDEX idx_home_programs_assigned (assigned_date)
);

-- Appointment Requests
CREATE TABLE appointment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  request_type TEXT CHECK (request_type IN ('new_session', 'reschedule', 'consultation', 'assessment')) NOT NULL,
  preferred_therapist UUID REFERENCES therapists(id),
  preferred_dates TEXT[],
  preferred_times TEXT[],
  duration INTEGER DEFAULT 60,
  priority TEXT CHECK (priority IN ('routine', 'urgent', 'emergency')) DEFAULT 'routine',
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')) DEFAULT 'pending',
  response_notes TEXT,
  scheduled_date_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_appointment_requests_parent (parent_id),
  INDEX idx_appointment_requests_child (child_id),
  INDEX idx_appointment_requests_status (status)
);

-- Parent Feedback System
CREATE TABLE parent_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  program_id UUID,
  therapist_id UUID REFERENCES therapists(id),
  feedback_type TEXT CHECK (feedback_type IN ('session_feedback', 'program_feedback', 'home_activity', 'concern', 'appreciation')) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT NOT NULL,
  suggestions TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('submitted', 'reviewed', 'responded')) DEFAULT 'submitted',
  admin_response TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_parent_feedback_parent (parent_id),
  INDEX idx_parent_feedback_child (child_id),
  INDEX idx_parent_feedback_status (status)
);

-- Document Access Control
CREATE TABLE document_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES students(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('assessment_report', 'progress_report', 'iep', 'medical_record', 'session_notes', 'home_program', 'photo', 'video')) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confidential BOOLEAN DEFAULT false,
  expiry_date TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  parent_notes TEXT,
  tags TEXT[],
  
  INDEX idx_document_access_child (child_id),
  INDEX idx_document_access_type (document_type),
  INDEX idx_document_access_uploaded (uploaded_at)
);

-- System Announcements
CREATE TABLE system_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('general', 'urgent', 'holiday', 'program_update', 'policy_change')) DEFAULT 'general',
  target_audience TEXT CHECK (target_audience IN ('all_parents', 'specific_program', 'specific_children')) DEFAULT 'all_parents',
  target_criteria JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  attachments TEXT[],
  read_by TEXT[], -- Array of parent IDs who have read the announcement
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_announcements_active (is_active, published_at),
  INDEX idx_announcements_target (target_audience)
);

-- Parent Activity Log
CREATE TABLE parent_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  entity_type TEXT, -- e.g., 'message', 'appointment', 'document'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_parent_activity_parent (parent_id),
  INDEX idx_parent_activity_type (activity_type),
  INDEX idx_parent_activity_created (created_at)
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_parent_users_updated_at BEFORE UPDATE ON parent_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Migration 024: IEP Management System Schema
-- =====================================================================

-- IEP Management System Schema
-- IDEA 2024 Compliant - Individualized Education Program Management
-- Arkan Al-Numo Center - Special Needs Therapy ERP System

-- =============================================================================
-- IEP DOCUMENTS TABLE
-- Core table for IEP documents with IDEA 2024 compliance
-- =============================================================================
CREATE TABLE IF NOT EXISTS ieps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- IEP Classification and Dates (IDEA Required)
    academic_year VARCHAR(9) NOT NULL, -- e.g., "2024-2025"
    iep_type VARCHAR(20) NOT NULL CHECK (iep_type IN ('initial', 'annual', 'triennial', 'amendment')),
    effective_date DATE NOT NULL,
    review_date DATE, -- Next quarterly/progress review
    annual_review_date DATE NOT NULL, -- Must be within 365 days of effective_date
    triennial_evaluation_due DATE, -- Required every 3 years
    
    -- Present Levels of Academic and Functional Performance (IDEA Required - Bilingual)
    present_levels_academic_ar TEXT NOT NULL,
    present_levels_academic_en TEXT,
    present_levels_functional_ar TEXT NOT NULL,
    present_levels_functional_en TEXT,
    
    -- Measurable Annual Goals (stored separately in iep_goals table)
    -- This field indicates the total count for validation
    annual_goals_count INTEGER DEFAULT 0,
    
    -- Special Education Services (IDEA Required - Bilingual)
    special_education_services JSONB NOT NULL DEFAULT '[]',
    related_services JSONB DEFAULT '[]',
    supplementary_services JSONB DEFAULT '[]',
    
    -- Program Modifications/Accommodations (IDEA Required - Bilingual)
    accommodations_ar TEXT[] DEFAULT '{}',
    accommodations_en TEXT[] DEFAULT '{}',
    modifications_ar TEXT[] DEFAULT '{}',
    modifications_en TEXT[] DEFAULT '{}',
    
    -- Assessment Accommodations (IDEA Required - Bilingual)
    state_assessment_accommodations_ar TEXT[] DEFAULT '{}',
    state_assessment_accommodations_en TEXT[] DEFAULT '{}',
    alternate_assessment_justification_ar TEXT,
    alternate_assessment_justification_en TEXT,
    
    -- Least Restrictive Environment (LRE) Information (IDEA Required - Bilingual)
    lre_justification_ar TEXT NOT NULL,
    lre_justification_en TEXT,
    mainstreaming_percentage INTEGER DEFAULT 0, -- Percentage of time in general education
    special_education_setting VARCHAR(50) NOT NULL,
    
    -- Transition Planning (Required at age 16+ - Bilingual)
    transition_services_needed BOOLEAN DEFAULT false,
    post_secondary_goals_ar TEXT,
    post_secondary_goals_en TEXT,
    transition_services JSONB DEFAULT '{}',
    
    -- Behavior Intervention Plan (if needed - Bilingual)
    behavior_plan_needed BOOLEAN DEFAULT false,
    behavior_goals_ar TEXT,
    behavior_goals_en TEXT,
    behavior_interventions JSONB DEFAULT '{}',
    
    -- Extended School Year (ESY) Services
    esy_services_needed BOOLEAN DEFAULT false,
    esy_justification_ar TEXT,
    esy_justification_en TEXT,
    esy_services JSONB DEFAULT '{}',
    
    -- Workflow and Status Management
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'active', 'expired', 'archived')),
    workflow_stage VARCHAR(30) DEFAULT 'drafting' CHECK (workflow_stage IN (
        'drafting', 'team_review', 'parent_review', 'signatures_pending', 
        'approved', 'active', 'monitoring', 'expired'
    )),
    
    -- Compliance and Quality Assurance
    compliance_check_passed BOOLEAN DEFAULT false,
    compliance_issues JSONB DEFAULT '[]',
    quality_review_passed BOOLEAN DEFAULT false,
    quality_review_notes_ar TEXT,
    quality_review_notes_en TEXT,
    
    -- Meeting Information
    last_iep_meeting_date DATE,
    next_iep_meeting_date DATE,
    meeting_frequency VARCHAR(20) DEFAULT 'quarterly' CHECK (meeting_frequency IN ('monthly', 'quarterly', 'annually')),
    
    -- Document Management
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    parent_iep_id UUID REFERENCES ieps(id), -- For version tracking
    
    -- File Attachments
    pdf_file_path TEXT, -- Generated PDF storage path
    attachments JSONB DEFAULT '[]', -- Array of attached documents
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints for IDEA Compliance
    CONSTRAINT iep_annual_review_within_365_days 
        CHECK (annual_review_date <= effective_date + INTERVAL '365 days'),
    CONSTRAINT iep_mainstreaming_percentage_valid 
        CHECK (mainstreaming_percentage >= 0 AND mainstreaming_percentage <= 100)
);

-- Indexes for IEP table
CREATE INDEX IF NOT EXISTS idx_ieps_student_id ON ieps(student_id);
CREATE INDEX IF NOT EXISTS idx_ieps_status ON ieps(status);
CREATE INDEX IF NOT EXISTS idx_ieps_academic_year ON ieps(academic_year);
CREATE INDEX IF NOT EXISTS idx_ieps_effective_date ON ieps(effective_date);
CREATE INDEX IF NOT EXISTS idx_ieps_annual_review_date ON ieps(annual_review_date);
CREATE INDEX IF NOT EXISTS idx_ieps_current_version ON ieps(is_current_version) WHERE is_current_version = true;

-- =============================================================================
-- IEP GOALS TABLE
-- Measurable Annual Goals (IDEA Required)
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Goal Classification
    goal_number INTEGER NOT NULL, -- Sequential numbering within IEP
    domain VARCHAR(30) NOT NULL CHECK (domain IN (
        'academic_reading', 'academic_writing', 'academic_math', 'academic_science',
        'communication_expressive', 'communication_receptive', 'communication_social',
        'behavioral_social', 'behavioral_attention', 'behavioral_self_regulation',
        'functional_daily_living', 'functional_mobility', 'functional_self_care',
        'motor_fine', 'motor_gross', 'vocational', 'transition'
    )),
    
    -- Present Level of Performance (Baseline - Bilingual)
    baseline_performance_ar TEXT NOT NULL,
    baseline_performance_en TEXT,
    baseline_date DATE DEFAULT CURRENT_DATE,
    
    -- Measurable Annual Goal Statement (IDEA Required - Bilingual)
    goal_statement_ar TEXT NOT NULL,
    goal_statement_en TEXT,
    
    -- Measurement Criteria (IDEA Required)
    measurement_method VARCHAR(50) NOT NULL CHECK (measurement_method IN (
        'frequency', 'percentage', 'duration', 'trials', 'observation', 
        'checklist', 'rating_scale', 'portfolio', 'other'
    )),
    measurement_criteria TEXT NOT NULL, -- Specific criteria for success
    evaluation_frequency VARCHAR(20) NOT NULL CHECK (evaluation_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    evaluation_method_ar TEXT NOT NULL,
    evaluation_method_en TEXT,
    
    -- Target Criteria for Success
    target_percentage INTEGER, -- If percentage-based goal
    target_frequency INTEGER, -- If frequency-based goal
    target_duration_minutes INTEGER, -- If duration-based goal
    target_accuracy_percentage INTEGER, -- General accuracy target
    mastery_criteria_ar TEXT NOT NULL, -- When goal is considered met
    mastery_criteria_en TEXT,
    
    -- Goal Timeline
    target_completion_date DATE NOT NULL,
    is_continuing_goal BOOLEAN DEFAULT false, -- Continues from previous IEP
    
    -- Progress Tracking
    current_progress_percentage INTEGER DEFAULT 0 CHECK (current_progress_percentage >= 0 AND current_progress_percentage <= 100),
    progress_status VARCHAR(20) DEFAULT 'not_started' CHECK (progress_status IN (
        'not_started', 'introduced', 'progressing', 'mastered', 'maintained', 'discontinued'
    )),
    last_progress_update DATE,
    
    -- Service Delivery Information
    responsible_provider VARCHAR(100), -- Who will work on this goal
    service_frequency VARCHAR(50), -- How often services are provided
    service_location VARCHAR(50), -- Where services are provided
    
    -- Goal Status
    is_active BOOLEAN DEFAULT true,
    goal_status VARCHAR(20) DEFAULT 'active' CHECK (goal_status IN ('active', 'achieved', 'modified', 'discontinued')),
    
    -- Goal Hierarchy (for breaking down complex goals)
    parent_goal_id UUID REFERENCES iep_goals(id),
    goal_order INTEGER DEFAULT 1, -- Order within the IEP
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Unique constraint for goal numbering within IEP
    UNIQUE(iep_id, goal_number)
);

-- Indexes for IEP Goals
CREATE INDEX IF NOT EXISTS idx_iep_goals_iep_id ON iep_goals(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_goals_domain ON iep_goals(domain);
CREATE INDEX IF NOT EXISTS idx_iep_goals_status ON iep_goals(goal_status);
CREATE INDEX IF NOT EXISTS idx_iep_goals_progress ON iep_goals(progress_status);
CREATE INDEX IF NOT EXISTS idx_iep_goals_target_date ON iep_goals(target_completion_date);

-- =============================================================================
-- IEP GOAL OBJECTIVES TABLE
-- Short-term objectives or benchmarks for goals
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_goal_objectives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES iep_goals(id) ON DELETE CASCADE,
    
    -- Objective Information (Bilingual)
    objective_number INTEGER NOT NULL, -- Sequential within goal
    objective_statement_ar TEXT NOT NULL,
    objective_statement_en TEXT,
    
    -- Measurement Criteria
    measurement_criteria TEXT NOT NULL,
    target_percentage INTEGER,
    target_frequency INTEGER,
    evaluation_method_ar TEXT NOT NULL,
    evaluation_method_en TEXT,
    
    -- Progress Tracking
    current_progress_percentage INTEGER DEFAULT 0,
    mastery_date DATE,
    is_mastered BOOLEAN DEFAULT false,
    
    -- Timeline
    target_date DATE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(goal_id, objective_number)
);

-- Indexes for Objectives
CREATE INDEX IF NOT EXISTS idx_iep_objectives_goal_id ON iep_goal_objectives(goal_id);
CREATE INDEX IF NOT EXISTS idx_iep_objectives_mastery ON iep_goal_objectives(is_mastered);

-- =============================================================================
-- IEP PROGRESS TRACKING TABLE
-- Data collection for goal progress
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_progress_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES iep_goals(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES iep_goal_objectives(id) ON DELETE CASCADE,
    
    -- Data Collection Information
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collected_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Progress Data
    score_achieved INTEGER,
    score_possible INTEGER,
    percentage_achieved DECIMAL(5,2),
    duration_minutes INTEGER,
    frequency_count INTEGER,
    
    -- Trial Data (for discrete trial teaching)
    trials_attempted INTEGER,
    trials_successful INTEGER,
    
    -- Qualitative Data (Bilingual)
    observations_ar TEXT,
    observations_en TEXT,
    notes_ar TEXT,
    notes_en TEXT,
    
    -- Context Information
    setting VARCHAR(50), -- Where data was collected
    activity VARCHAR(100), -- Activity during data collection
    support_level VARCHAR(30) CHECK (support_level IN (
        'independent', 'verbal_prompt', 'gestural_prompt', 
        'physical_prompt', 'full_assistance'
    )),
    
    -- Data Quality
    data_reliability VARCHAR(20) DEFAULT 'reliable' CHECK (data_reliability IN ('reliable', 'questionable', 'invalid')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Progress Data
CREATE INDEX IF NOT EXISTS idx_iep_progress_goal_id ON iep_progress_data(goal_id);
CREATE INDEX IF NOT EXISTS idx_iep_progress_date ON iep_progress_data(collection_date);
CREATE INDEX IF NOT EXISTS idx_iep_progress_collected_by ON iep_progress_data(collected_by);

-- =============================================================================
-- IEP SERVICES TABLE
-- Special education and related services
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Service Information (Bilingual)
    service_name_ar TEXT NOT NULL,
    service_name_en TEXT,
    service_category VARCHAR(30) NOT NULL CHECK (service_category IN (
        'special_education', 'speech_therapy', 'occupational_therapy', 
        'physical_therapy', 'behavioral_support', 'counseling', 
        'transportation', 'nursing', 'other_related_service'
    )),
    
    -- Service Provider
    provider_name VARCHAR(100),
    provider_qualification VARCHAR(100),
    provider_id UUID REFERENCES auth.users(id),
    
    -- Service Delivery Details
    frequency_per_week INTEGER NOT NULL,
    session_duration_minutes INTEGER NOT NULL,
    total_minutes_per_week INTEGER GENERATED ALWAYS AS (frequency_per_week * session_duration_minutes) STORED,
    
    -- Service Location and Setting
    service_location VARCHAR(50) NOT NULL CHECK (service_location IN (
        'general_education_classroom', 'special_education_classroom',
        'therapy_room', 'home', 'community', 'online', 'other'
    )),
    service_setting_ar TEXT,
    service_setting_en TEXT,
    
    -- Service Timeline
    start_date DATE NOT NULL,
    end_date DATE,
    total_service_hours DECIMAL(6,2),
    
    -- Service Goals and Objectives (links to specific goals)
    related_goal_ids UUID[] DEFAULT '{}', -- Array of goal IDs this service supports
    
    -- Progress and Outcomes
    service_status VARCHAR(20) DEFAULT 'active' CHECK (service_status IN ('active', 'completed', 'discontinued', 'modified')),
    progress_notes_ar TEXT,
    progress_notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for Services
CREATE INDEX IF NOT EXISTS idx_iep_services_iep_id ON iep_services(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_services_category ON iep_services(service_category);
CREATE INDEX IF NOT EXISTS idx_iep_services_provider ON iep_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_iep_services_status ON iep_services(service_status);

-- =============================================================================
-- IEP TEAM MEMBERS TABLE
-- IEP team composition and roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Team Member Information
    user_id UUID REFERENCES auth.users(id), -- If internal staff
    external_member_name VARCHAR(100), -- If external member
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Role Information (Bilingual)
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'parent_guardian', 'special_education_teacher', 'general_education_teacher',
        'speech_therapist', 'occupational_therapist', 'physical_therapist',
        'school_psychologist', 'behavior_specialist', 'administrator',
        'related_service_provider', 'student', 'advocate', 'interpreter'
    )),
    role_description_ar TEXT,
    role_description_en TEXT,
    
    -- Participation Details
    is_required_member BOOLEAN DEFAULT true,
    participation_status VARCHAR(20) DEFAULT 'active' CHECK (participation_status IN ('active', 'inactive', 'excused')),
    
    -- Meeting Participation
    attends_meetings BOOLEAN DEFAULT true,
    meeting_participation_mode VARCHAR(20) DEFAULT 'in_person' CHECK (meeting_participation_mode IN ('in_person', 'virtual', 'phone')),
    
    -- Contact Preferences (Bilingual)
    preferred_language VARCHAR(5) DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    communication_notes_ar TEXT,
    communication_notes_en TEXT,
    
    -- Metadata
    added_date DATE DEFAULT CURRENT_DATE,
    added_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique role per IEP (where applicable)
    UNIQUE(iep_id, user_id, role)
);

-- Indexes for Team Members
CREATE INDEX IF NOT EXISTS idx_iep_team_iep_id ON iep_team_members(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_team_user_id ON iep_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_iep_team_role ON iep_team_members(role);

-- =============================================================================
-- IEP MEETINGS TABLE
-- Meeting management and documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Meeting Information (Bilingual)
    meeting_title_ar TEXT NOT NULL,
    meeting_title_en TEXT,
    meeting_type VARCHAR(30) NOT NULL CHECK (meeting_type IN (
        'initial_meeting', 'annual_review', 'quarterly_review',
        'amendment_meeting', 'transition_meeting', 'disciplinary_meeting'
    )),
    
    -- Meeting Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_location_ar TEXT,
    meeting_location_en TEXT,
    meeting_mode VARCHAR(20) DEFAULT 'in_person' CHECK (meeting_mode IN ('in_person', 'virtual', 'hybrid')),
    
    -- Meeting Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    
    -- Meeting Documentation (Bilingual)
    agenda_ar TEXT,
    agenda_en TEXT,
    minutes_ar TEXT,
    minutes_en TEXT,
    decisions_made_ar TEXT,
    decisions_made_en TEXT,
    action_items_ar TEXT,
    action_items_en TEXT,
    
    -- Meeting Outcomes
    iep_changes_made BOOLEAN DEFAULT false,
    next_meeting_scheduled BOOLEAN DEFAULT false,
    next_meeting_date DATE,
    
    -- Attendance
    total_invited INTEGER DEFAULT 0,
    total_attended INTEGER DEFAULT 0,
    
    -- File Attachments
    meeting_recording_path TEXT, -- If recorded
    presentation_files JSONB DEFAULT '[]',
    supporting_documents JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for Meetings
CREATE INDEX IF NOT EXISTS idx_iep_meetings_iep_id ON iep_meetings(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_date ON iep_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_status ON iep_meetings(status);
CREATE INDEX IF NOT EXISTS idx_iep_meetings_type ON iep_meetings(meeting_type);

-- =============================================================================
-- IEP MEETING ATTENDANCE TABLE
-- Track attendance for each meeting
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_meeting_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES iep_meetings(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES iep_team_members(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN (
        'present', 'absent', 'excused', 'partial'
    )),
    arrival_time TIME,
    departure_time TIME,
    
    -- Participation Notes (Bilingual)
    participation_notes_ar TEXT,
    participation_notes_en TEXT,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(meeting_id, team_member_id)
);

-- Indexes for Meeting Attendance
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting ON iep_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member ON iep_meeting_attendance(team_member_id);

-- =============================================================================
-- IEP APPROVALS TABLE
-- Digital signature and approval workflow
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Approver Information
    approver_id UUID REFERENCES auth.users(id),
    approver_name VARCHAR(100) NOT NULL, -- For external approvers
    approver_role VARCHAR(50) NOT NULL,
    approver_email VARCHAR(255),
    
    -- Approval Details
    approval_type VARCHAR(30) NOT NULL CHECK (approval_type IN (
        'parent_consent', 'team_member_signature', 'administrator_approval',
        'student_signature', 'external_agency_approval'
    )),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'withdrawn'
    )),
    
    -- Digital Signature
    signature_data TEXT, -- Base64 encoded signature or signature hash
    signature_method VARCHAR(20) DEFAULT 'digital' CHECK (signature_method IN ('digital', 'electronic', 'wet_signature')),
    ip_address INET, -- IP address of signer
    user_agent TEXT, -- Browser/device information
    
    -- Approval Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Signature expiration
    
    -- Comments and Notes (Bilingual)
    approval_comments_ar TEXT,
    approval_comments_en TEXT,
    rejection_reason_ar TEXT,
    rejection_reason_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Approvals
CREATE INDEX IF NOT EXISTS idx_iep_approvals_iep_id ON iep_approvals(iep_id);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_approver ON iep_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_status ON iep_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_iep_approvals_type ON iep_approvals(approval_type);

-- =============================================================================
-- IEP COMPLIANCE ALERTS TABLE
-- Automated compliance monitoring and alerts
-- =============================================================================
CREATE TABLE IF NOT EXISTS iep_compliance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iep_id UUID NOT NULL REFERENCES ieps(id) ON DELETE CASCADE,
    
    -- Alert Information (Bilingual)
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'annual_review_due', 'quarterly_review_due', 'service_hours_missing',
        'goal_progress_overdue', 'meeting_not_scheduled', 'approval_missing',
        'document_incomplete', 'compliance_violation'
    )),
    alert_title_ar TEXT NOT NULL,
    alert_title_en TEXT,
    alert_message_ar TEXT NOT NULL,
    alert_message_en TEXT,
    
    -- Alert Severity and Priority
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1 = highest priority
    
    -- Alert Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    
    -- Timeline Information
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE, -- When action must be taken
    days_until_due INTEGER GENERATED ALWAYS AS (due_date - CURRENT_DATE) STORED,
    
    -- Assignment and Resolution
    assigned_to UUID REFERENCES auth.users(id),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes_ar TEXT,
    resolution_notes_en TEXT,
    
    -- Notification Status
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Compliance Alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_iep ON iep_compliance_alerts(iep_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON iep_compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON iep_compliance_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON iep_compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_due_date ON iep_compliance_alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_assigned ON iep_compliance_alerts(assigned_to);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps automatically
CREATE OR REPLACE TRIGGER update_ieps_updated_at 
    BEFORE UPDATE ON ieps 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_goals_updated_at 
    BEFORE UPDATE ON iep_goals 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_progress_data_updated_at 
    BEFORE UPDATE ON iep_progress_data 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_services_updated_at 
    BEFORE UPDATE ON iep_services 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_meetings_updated_at 
    BEFORE UPDATE ON iep_meetings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_approvals_updated_at 
    BEFORE UPDATE ON iep_approvals 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_iep_compliance_alerts_updated_at 
    BEFORE UPDATE ON iep_compliance_alerts 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Update goal count in IEP when goals are added/removed
CREATE OR REPLACE FUNCTION update_iep_goals_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = NEW.iep_id AND is_active = true
        )
        WHERE id = NEW.iep_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = NEW.iep_id AND is_active = true
        )
        WHERE id = NEW.iep_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ieps 
        SET annual_goals_count = (
            SELECT COUNT(*) FROM iep_goals WHERE iep_id = OLD.iep_id AND is_active = true
        )
        WHERE id = OLD.iep_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_iep_goals_count
    AFTER INSERT OR UPDATE OR DELETE ON iep_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_iep_goals_count();

-- Generate IEP number automatically
CREATE OR REPLACE FUNCTION generate_iep_number(student_reg_number TEXT, academic_year TEXT)
RETURNS TEXT AS $$
DECLARE
    iep_number TEXT;
    year_short TEXT;
BEGIN
    -- Extract last 2 digits of academic year (e.g., "2024-2025" -> "24")
    year_short := SUBSTRING(academic_year FROM 1 FOR 2);
    
    -- Generate IEP number: IEP-STU-2025-0001-24
    iep_number := 'IEP-' || student_reg_number || '-' || year_short;
    
    RETURN iep_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE ieps IS 'Core IEP documents with IDEA 2024 compliance features and bilingual support';
COMMENT ON TABLE iep_goals IS 'Measurable annual goals as required by IDEA with progress tracking';
COMMENT ON TABLE iep_goal_objectives IS 'Short-term objectives and benchmarks for IEP goals';
COMMENT ON TABLE iep_progress_data IS 'Data collection for tracking progress toward IEP goals';
COMMENT ON TABLE iep_services IS 'Special education and related services as specified in IEP';
COMMENT ON TABLE iep_team_members IS 'IEP team composition and member roles';
COMMENT ON TABLE iep_meetings IS 'IEP meeting management and documentation';
COMMENT ON TABLE iep_meeting_attendance IS 'Attendance tracking for IEP meetings';
COMMENT ON TABLE iep_approvals IS 'Digital signature and approval workflow for IEPs';
COMMENT ON TABLE iep_compliance_alerts IS 'Automated compliance monitoring and alert system';

-- End of IEP Management Schema Migration
CREATE TRIGGER update_home_programs_updated_at BEFORE UPDATE ON home_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();