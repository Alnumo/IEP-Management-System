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
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Enable Row Level Security
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Insert default categories
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
);-- Add allowed_freeze_days column to therapy_plans table
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