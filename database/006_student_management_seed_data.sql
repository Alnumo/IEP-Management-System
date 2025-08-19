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