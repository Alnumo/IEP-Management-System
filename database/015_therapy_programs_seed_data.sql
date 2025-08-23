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