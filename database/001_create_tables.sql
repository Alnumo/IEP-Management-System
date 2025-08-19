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