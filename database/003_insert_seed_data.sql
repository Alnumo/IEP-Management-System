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