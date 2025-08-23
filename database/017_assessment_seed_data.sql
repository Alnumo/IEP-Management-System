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