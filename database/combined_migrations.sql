-- Combined Migration File
-- Generated on: 2025-08-20T15:23:44.108Z
-- 
-- This file combines all migration files for easy execution in Supabase Dashboard
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file content
-- 3. Click "Run" to execute all migrations
--
-- Files included: 001_create_tables.sql, 002_create_policies.sql, 003_insert_seed_data.sql, 004_student_management_tables.sql, 005_student_management_policies.sql, 006_student_management_seed_data.sql, 007_add_allowed_freeze_days.sql
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
