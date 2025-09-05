-- Story 6.1: Program Templates Schema
-- Creates program_templates table for base program configurations

CREATE TABLE program_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_type VARCHAR(100) NOT NULL,
    program_name_ar VARCHAR(200) NOT NULL,
    program_name_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    base_duration_weeks INTEGER NOT NULL CHECK (base_duration_weeks > 0),
    base_sessions_per_week INTEGER NOT NULL CHECK (base_sessions_per_week > 0),
    default_goals JSONB DEFAULT '[]',
    customization_options JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_program_templates_type ON program_templates(program_type);
CREATE INDEX idx_program_templates_active ON program_templates(is_active);
CREATE INDEX idx_program_templates_created_at ON program_templates(created_at);
CREATE INDEX idx_program_templates_goals ON program_templates USING GIN(default_goals);
CREATE INDEX idx_program_templates_customization ON program_templates USING GIN(customization_options);

-- RLS policies
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

-- Policy for viewing program templates
CREATE POLICY "All authenticated users can view active templates" ON program_templates
    FOR SELECT USING (
        auth.role() = 'authenticated' AND is_active = true
    );

-- Policy for admins to view all templates
CREATE POLICY "Admins can view all templates" ON program_templates
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    );

-- Policy for managing templates
CREATE POLICY "Admins and managers can manage templates" ON program_templates
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Audit trail function for program templates
CREATE OR REPLACE FUNCTION update_program_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating timestamps
CREATE TRIGGER trigger_update_program_template_timestamp
    BEFORE UPDATE ON program_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_program_template_timestamp();

-- Insert default program templates with bilingual support
INSERT INTO program_templates (
    program_type,
    program_name_ar,
    program_name_en,
    description_ar,
    description_en,
    base_duration_weeks,
    base_sessions_per_week,
    default_goals,
    customization_options,
    created_by
) VALUES 
(
    'growth_program_annual',
    'برنامج النمو - السنوي',
    'Annual Growth Program',
    'برنامج شامل لتطوير المهارات على مدار السنة',
    'Comprehensive skills development program over the course of a year',
    52,
    2,
    '[
        {"goal_ar": "تطوير مهارات التواصل", "goal_en": "Develop communication skills", "priority": "high"},
        {"goal_ar": "تحسين المهارات الحركية", "goal_en": "Improve motor skills", "priority": "medium"},
        {"goal_ar": "تعزيز المهارات الاجتماعية", "goal_en": "Enhance social skills", "priority": "high"}
    ]'::jsonb,
    '{
        "schedule_flexibility": true,
        "therapist_rotation": false,
        "intensity_levels": ["low", "medium", "high"],
        "assessment_frequency": "monthly"
    }'::jsonb,
    '00000000-0000-0000-0000-000000000000'  -- System user
),
(
    'intensive_speech',
    'برنامج النطق المكثف',
    'Intensive Speech Program',
    'برنامج مكثف لتطوير مهارات النطق والكلام',
    'Intensive program for developing speech and articulation skills',
    24,
    3,
    '[
        {"goal_ar": "تحسين وضوح النطق", "goal_en": "Improve speech clarity", "priority": "high"},
        {"goal_ar": "زيادة المفردات", "goal_en": "Increase vocabulary", "priority": "medium"},
        {"goal_ar": "تطوير الطلاقة", "goal_en": "Develop fluency", "priority": "high"}
    ]'::jsonb,
    '{
        "schedule_flexibility": false,
        "therapist_rotation": false,
        "intensity_levels": ["high"],
        "assessment_frequency": "bi-weekly"
    }'::jsonb,
    '00000000-0000-0000-0000-000000000000'
),
(
    'behavioral_intervention',
    'برنامج التدخل السلوكي',
    'Behavioral Intervention Program',
    'برنامج متخصص في تعديل السلوك والتدخل المبكر',
    'Specialized program for behavior modification and early intervention',
    36,
    2,
    '[
        {"goal_ar": "تقليل السلوكيات المشكلة", "goal_en": "Reduce problem behaviors", "priority": "high"},
        {"goal_ar": "تطوير المهارات البديلة", "goal_en": "Develop replacement skills", "priority": "high"},
        {"goal_ar": "تحسين التنظيم الذاتي", "goal_en": "Improve self-regulation", "priority": "medium"}
    ]'::jsonb,
    '{
        "schedule_flexibility": true,
        "therapist_rotation": true,
        "intensity_levels": ["medium", "high"],
        "assessment_frequency": "weekly"
    }'::jsonb,
    '00000000-0000-0000-0000-000000000000'
);

-- Add comments for documentation
COMMENT ON TABLE program_templates IS 'Base program templates that can be customized for individual student enrollments';
COMMENT ON COLUMN program_templates.program_type IS 'Unique identifier for the program type';
COMMENT ON COLUMN program_templates.program_name_ar IS 'Program name in Arabic';
COMMENT ON COLUMN program_templates.program_name_en IS 'Program name in English';
COMMENT ON COLUMN program_templates.base_duration_weeks IS 'Default program duration in weeks';
COMMENT ON COLUMN program_templates.base_sessions_per_week IS 'Default number of sessions per week';
COMMENT ON COLUMN program_templates.default_goals IS 'JSONB array of default goals for this program type';
COMMENT ON COLUMN program_templates.customization_options IS 'JSONB object defining what aspects can be customized per student';