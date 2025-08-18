import { z } from 'zod'

// Session type schema
export const sessionTypeSchema = z.object({
  type: z.enum(['speech_language', 'occupational', 'psychological', 'educational'], {
    required_error: 'يجب اختيار نوع الجلسة'
  }),
  duration_minutes: z.number()
    .min(15, 'مدة الجلسة يجب أن تكون 15 دقيقة على الأقل')
    .max(180, 'مدة الجلسة لا يجب أن تتجاوز 180 دقيقة'),
  sessions_per_week: z.number()
    .min(1, 'عدد الجلسات يجب أن يكون جلسة واحدة على الأقل')
    .max(7, 'عدد الجلسات لا يجب أن يتجاوز 7 جلسات في الأسبوع'),
  duration_weeks: z.number()
    .min(1, 'مدة البرنامج يجب أن تكون أسبوع واحد على الأقل')
    .max(52, 'مدة البرنامج لا يجب أن تتجاوز 52 أسبوع')
})

// Plan validation schema
export const planSchema = z.object({
  name_ar: z.string()
    .min(3, 'اسم البرنامج يجب أن يكون 3 أحرف على الأقل')
    .max(100, 'اسم البرنامج لا يجب أن يتجاوز 100 حرف'),
  
  name_en: z.string()
    .max(100, 'Program name should not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  
  description_ar: z.string()
    .max(1000, 'الوصف لا يجب أن يتجاوز 1000 حرف')
    .optional()
    .or(z.literal('')),
  
  description_en: z.string()
    .max(1000, 'Description should not exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  
  category_id: z.string()
    .min(1, 'يجب اختيار تصنيف'),
  
  // Session types array
  session_types: z.array(sessionTypeSchema)
    .min(1, 'يجب إضافة نوع جلسة واحد على الأقل'),
  
  // Program price (not per session)
  program_price: z.number()
    .min(0, 'سعر البرنامج يجب أن يكون أكبر من أو يساوي صفر'),
  
  // Price includes follow-up appointments
  price_includes_followup: z.boolean().default(false),
  
  // Legacy fields for compatibility (will be calculated from session_types)
  duration_weeks: z.number()
    .min(1, 'مدة البرنامج يجب أن تكون أسبوع واحد على الأقل')
    .max(52, 'مدة البرنامج لا يجب أن تتجاوز 52 أسبوع'),
  
  sessions_per_week: z.number()
    .min(1, 'عدد الجلسات يجب أن يكون جلسة واحدة على الأقل')
    .max(7, 'عدد الجلسات لا يجب أن يتجاوز 7 جلسات في الأسبوع'),
  
  price_per_session: z.number()
    .min(0, 'سعر الجلسة يجب أن يكون أكبر من أو يساوي صفر'),
  
  discount_percentage: z.number()
    .min(0, 'نسبة الخصم يجب أن تكون أكبر من أو تساوي صفر')
    .max(100, 'نسبة الخصم لا يجب أن تتجاوز 100%')
    .default(0),
  
  target_age_min: z.number()
    .min(0, 'العمر الأدنى يجب أن يكون أكبر من أو يساوي صفر')
    .max(18, 'العمر الأدنى لا يجب أن يتجاوز 18 سنة')
    .optional(),
  
  target_age_max: z.number()
    .min(0, 'العمر الأعلى يجب أن يكون أكبر من أو يساوي صفر')
    .max(18, 'العمر الأعلى لا يجب أن يتجاوز 18 سنة')
    .optional(),
  
  max_students_per_session: z.number()
    .min(1, 'عدد الطلاب يجب أن يكون طالب واحد على الأقل')
    .max(10, 'عدد الطلاب لا يجب أن يتجاوز 10 طلاب')
    .default(1),
  
  materials_needed: z.array(z.string()).default([]),
  learning_objectives: z.array(z.string()).default([]),
  prerequisites: z.string().optional().or(z.literal('')),
  is_featured: z.boolean().default(false),
}).refine((data) => {
  if (data.target_age_min !== undefined && data.target_age_max !== undefined) {
    return data.target_age_min <= data.target_age_max
  }
  return true
}, {
  message: 'العمر الأدنى يجب أن يكون أقل من أو يساوي العمر الأعلى',
  path: ['target_age_max'],
})

export type PlanFormData = z.infer<typeof planSchema>

// Category validation schema
export const categorySchema = z.object({
  name_ar: z.string()
    .min(2, 'اسم التصنيف يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم التصنيف لا يجب أن يتجاوز 50 حرف'),
  
  name_en: z.string()
    .max(50, 'Category name should not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  
  description_ar: z.string()
    .max(500, 'الوصف لا يجب أن يتجاوز 500 حرف')
    .optional()
    .or(z.literal('')),
  
  description_en: z.string()
    .max(500, 'Description should not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  
  color_code: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'يجب إدخال لون صالح'),
  
  icon_name: z.string()
    .min(1, 'يجب اختيار أيقونة'),
  
  sort_order: z.number()
    .min(0, 'ترتيب التصنيف يجب أن يكون أكبر من أو يساوي صفر')
    .default(0),
})

export type CategoryFormData = z.infer<typeof categorySchema>

// Search and filter schemas
export const planFiltersSchema = z.object({
  category_id: z.string().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  search: z.string().optional(),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  duration_min: z.number().min(1).optional(),
  duration_max: z.number().max(52).optional(),
  target_age: z.number().min(0).max(18).optional(),
})

export type PlanFiltersData = z.infer<typeof planFiltersSchema>

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string()
    .email('يجب إدخال بريد إلكتروني صالح'),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z.string()
    .email('يجب إدخال بريد إلكتروني صالح'),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
  name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  role: z.enum(['admin', 'manager', 'therapist_lead', 'receptionist']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>