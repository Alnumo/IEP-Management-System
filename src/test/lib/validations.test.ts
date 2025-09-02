import { describe, it, expect } from 'vitest'
import { 
  sessionTypeSchema,
  planSchema,
  categorySchema,
  planFiltersSchema,
  loginSchema,
  registerSchema,
  type PlanFormData,
  type CategoryFormData,
  type PlanFiltersData,
  type LoginFormData,
  type RegisterFormData
} from '@/lib/validations'

describe('Validations', () => {
  describe('sessionTypeSchema', () => {
    it('should accept valid session type data', () => {
      const validData = {
        type: 'speech_language' as const,
        duration_minutes: 60,
        sessions_per_week: 2,
        duration_weeks: 12
      }
      
      expect(() => sessionTypeSchema.parse(validData)).not.toThrow()
      const result = sessionTypeSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should reject invalid session types', () => {
      const invalidData = {
        type: 'invalid_type',
        duration_minutes: 60,
        sessions_per_week: 2,
        duration_weeks: 12
      }
      
      expect(() => sessionTypeSchema.parse(invalidData)).toThrow()
    })

    it('should enforce duration_minutes limits', () => {
      const tooShort = {
        type: 'speech_language' as const,
        duration_minutes: 10, // Too short
        sessions_per_week: 2,
        duration_weeks: 12
      }
      
      const tooLong = {
        type: 'speech_language' as const,
        duration_minutes: 200, // Too long
        sessions_per_week: 2,
        duration_weeks: 12
      }
      
      expect(() => sessionTypeSchema.parse(tooShort)).toThrow('مدة الجلسة يجب أن تكون 15 دقيقة على الأقل')
      expect(() => sessionTypeSchema.parse(tooLong)).toThrow('مدة الجلسة لا يجب أن تتجاوز 180 دقيقة')
    })

    it('should enforce sessions_per_week limits', () => {
      const tooFew = {
        type: 'speech_language' as const,
        duration_minutes: 60,
        sessions_per_week: 0,
        duration_weeks: 12
      }
      
      const tooMany = {
        type: 'speech_language' as const,
        duration_minutes: 60,
        sessions_per_week: 8,
        duration_weeks: 12
      }
      
      expect(() => sessionTypeSchema.parse(tooFew)).toThrow('عدد الجلسات يجب أن يكون جلسة واحدة على الأقل')
      expect(() => sessionTypeSchema.parse(tooMany)).toThrow('عدد الجلسات لا يجب أن يتجاوز 7 جلسات في الأسبوع')
    })

    it('should enforce duration_weeks limits', () => {
      const tooShort = {
        type: 'speech_language' as const,
        duration_minutes: 60,
        sessions_per_week: 2,
        duration_weeks: 0
      }
      
      const tooLong = {
        type: 'speech_language' as const,
        duration_minutes: 60,
        sessions_per_week: 2,
        duration_weeks: 60
      }
      
      expect(() => sessionTypeSchema.parse(tooShort)).toThrow('مدة البرنامج يجب أن تكون أسبوع واحد على الأقل')
      expect(() => sessionTypeSchema.parse(tooLong)).toThrow('مدة البرنامج لا يجب أن تتجاوز 52 أسبوع')
    })
  })

  describe('planSchema', () => {
    const validPlanData: PlanFormData = {
      name_ar: 'برنامج علاج النطق',
      name_en: 'Speech Therapy Program',
      description_ar: 'برنامج شامل لعلاج اضطرابات النطق',
      description_en: 'Comprehensive speech therapy program',
      category_id: 'cat-123',
      session_types: [{
        type: 'speech_language',
        duration_minutes: 60,
        sessions_per_week: 2,
        duration_weeks: 12
      }],
      program_price: 5000,
      price_includes_followup: false,
      duration_weeks: 12,
      sessions_per_week: 2,
      price_per_session: 200,
      discount_percentage: 10,
      target_age_min: 3,
      target_age_max: 12,
      max_students_per_session: 1,
      materials_needed: ['كتب', 'ألعاب'],
      learning_objectives: ['تحسين النطق', 'زيادة الثقة'],
      prerequisites: 'تقييم أولي',
      allowed_freeze_days: 30,
      is_featured: false
    }

    it('should accept valid plan data', () => {
      expect(() => planSchema.parse(validPlanData)).not.toThrow()
      const result = planSchema.parse(validPlanData)
      expect(result.name_ar).toBe('برنامج علاج النطق')
    })

    it('should enforce name_ar requirements', () => {
      const shortName = { ...validPlanData, name_ar: 'قص' } // Too short
      const longName = { ...validPlanData, name_ar: 'ا'.repeat(101) } // Too long
      
      expect(() => planSchema.parse(shortName)).toThrow('اسم البرنامج يجب أن يكون 3 أحرف على الأقل')
      expect(() => planSchema.parse(longName)).toThrow('اسم البرنامج لا يجب أن يتجاوز 100 حرف')
    })

    it('should allow optional empty name_en', () => {
      const withEmptyNameEn = { ...validPlanData, name_en: '' }
      const withoutNameEn = { ...validPlanData, name_en: undefined }
      
      expect(() => planSchema.parse(withEmptyNameEn)).not.toThrow()
      expect(() => planSchema.parse(withoutNameEn)).not.toThrow()
    })

    it('should enforce session_types minimum requirement', () => {
      const noSessionTypes = { ...validPlanData, session_types: [] }
      
      expect(() => planSchema.parse(noSessionTypes)).toThrow('يجب إضافة نوع جلسة واحد على الأقل')
    })

    it('should validate age range consistency', () => {
      const invalidAgeRange = { 
        ...validPlanData, 
        target_age_min: 10,
        target_age_max: 5 // max < min
      }
      
      expect(() => planSchema.parse(invalidAgeRange)).toThrow('العمر الأدنى يجب أن يكون أقل من أو يساوي العمر الأعلى')
    })

    it('should enforce price constraints', () => {
      const negativeProgramPrice = { ...validPlanData, program_price: -100 }
      const negativeSessionPrice = { ...validPlanData, price_per_session: -50 }
      
      expect(() => planSchema.parse(negativeProgramPrice)).toThrow('سعر البرنامج يجب أن يكون أكبر من أو يساوي صفر')
      expect(() => planSchema.parse(negativeSessionPrice)).toThrow('سعر الجلسة يجب أن يكون أكبر من أو يساوي صفر')
    })

    it('should enforce discount percentage limits', () => {
      const negativeDiscount = { ...validPlanData, discount_percentage: -5 }
      const excessiveDiscount = { ...validPlanData, discount_percentage: 105 }
      
      expect(() => planSchema.parse(negativeDiscount)).toThrow('نسبة الخصم يجب أن تكون أكبر من أو تساوي صفر')
      expect(() => planSchema.parse(excessiveDiscount)).toThrow('نسبة الخصم لا يجب أن تتجاوز 100%')
    })

    it('should apply default values correctly', () => {
      const minimalData = {
        name_ar: 'برنامج اختبار',
        category_id: 'cat-123',
        session_types: [{
          type: 'speech_language' as const,
          duration_minutes: 60,
          sessions_per_week: 2,
          duration_weeks: 12
        }],
        duration_weeks: 12,
        sessions_per_week: 2,
        price_per_session: 200
      }
      
      const result = planSchema.parse(minimalData)
      expect(result.program_price).toBe(0)
      expect(result.price_includes_followup).toBe(false)
      expect(result.discount_percentage).toBe(0)
      expect(result.max_students_per_session).toBe(1)
      expect(result.materials_needed).toEqual([])
      expect(result.learning_objectives).toEqual([])
      expect(result.allowed_freeze_days).toBe(30)
      expect(result.is_featured).toBe(false)
    })
  })

  describe('categorySchema', () => {
    const validCategoryData: CategoryFormData = {
      name_ar: 'علاج النطق',
      name_en: 'Speech Therapy',
      description_ar: 'تصنيف لبرامج علاج النطق',
      description_en: 'Category for speech therapy programs',
      color_code: '#3B82F6',
      icon_name: 'speech',
      sort_order: 1
    }

    it('should accept valid category data', () => {
      expect(() => categorySchema.parse(validCategoryData)).not.toThrow()
      const result = categorySchema.parse(validCategoryData)
      expect(result.name_ar).toBe('علاج النطق')
    })

    it('should enforce name_ar length requirements', () => {
      const shortName = { ...validCategoryData, name_ar: 'ا' } // Too short
      const longName = { ...validCategoryData, name_ar: 'ا'.repeat(51) } // Too long
      
      expect(() => categorySchema.parse(shortName)).toThrow('اسم التصنيف يجب أن يكون حرفين على الأقل')
      expect(() => categorySchema.parse(longName)).toThrow('اسم التصنيف لا يجب أن يتجاوز 50 حرف')
    })

    it('should validate color code format', () => {
      const invalidColorCodes = [
        { ...validCategoryData, color_code: '#GGG' }, // Invalid characters
        { ...validCategoryData, color_code: '#12345' }, // Too short
        { ...validCategoryData, color_code: '#1234567' }, // Too long
        { ...validCategoryData, color_code: '3B82F6' }, // Missing #
      ]
      
      invalidColorCodes.forEach(data => {
        expect(() => categorySchema.parse(data)).toThrow('يجب إدخال لون صالح')
      })
    })

    it('should require icon_name', () => {
      const emptyIcon = { ...validCategoryData, icon_name: '' }
      
      expect(() => categorySchema.parse(emptyIcon)).toThrow('يجب اختيار أيقونة')
    })

    it('should apply default sort_order', () => {
      const withoutSortOrder = {
        name_ar: 'تصنيف جديد',
        color_code: '#FF0000',
        icon_name: 'new-icon'
      }
      
      const result = categorySchema.parse(withoutSortOrder)
      expect(result.sort_order).toBe(0)
    })
  })

  describe('planFiltersSchema', () => {
    it('should accept valid filter data', () => {
      const validFilters: PlanFiltersData = {
        category_id: 'cat-123',
        is_active: true,
        is_featured: false,
        search: 'علاج النطق',
        price_min: 100,
        price_max: 1000,
        duration_min: 4,
        duration_max: 24,
        target_age: 8
      }
      
      expect(() => planFiltersSchema.parse(validFilters)).not.toThrow()
      const result = planFiltersSchema.parse(validFilters)
      expect(result.search).toBe('علاج النطق')
    })

    it('should enforce price constraints', () => {
      const negativePrice = { price_min: -100 }
      
      expect(() => planFiltersSchema.parse(negativePrice)).toThrow()
    })

    it('should enforce duration and age limits', () => {
      const invalidDuration = { duration_min: 0 }
      const excessiveDuration = { duration_max: 60 }
      const negativeAge = { target_age: -1 }
      const excessiveAge = { target_age: 20 }
      
      expect(() => planFiltersSchema.parse(invalidDuration)).toThrow()
      expect(() => planFiltersSchema.parse(excessiveDuration)).toThrow()
      expect(() => planFiltersSchema.parse(negativeAge)).toThrow()
      expect(() => planFiltersSchema.parse(excessiveAge)).toThrow()
    })

    it('should allow all fields to be optional', () => {
      const emptyFilters = {}
      
      expect(() => planFiltersSchema.parse(emptyFilters)).not.toThrow()
      const result = planFiltersSchema.parse(emptyFilters)
      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validLogin: LoginFormData = {
        email: 'test@example.com',
        password: 'password123'
      }
      
      expect(() => loginSchema.parse(validLogin)).not.toThrow()
      const result = loginSchema.parse(validLogin)
      expect(result.email).toBe('test@example.com')
    })

    it('should validate email format', () => {
      const invalidEmails = [
        { email: 'invalid-email', password: 'password123' },
        { email: 'test@', password: 'password123' },
        { email: '@example.com', password: 'password123' },
        { email: 'test..test@example.com', password: 'password123' }
      ]
      
      invalidEmails.forEach(data => {
        expect(() => loginSchema.parse(data)).toThrow('يجب إدخال بريد إلكتروني صالح')
      })
    })

    it('should enforce password minimum length', () => {
      const shortPassword = {
        email: 'test@example.com',
        password: '12345' // Too short
      }
      
      expect(() => loginSchema.parse(shortPassword)).toThrow('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    })
  })

  describe('registerSchema', () => {
    const validRegisterData: RegisterFormData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      name: 'أحمد محمد',
      role: 'therapist_lead'
    }

    it('should accept valid registration data', () => {
      expect(() => registerSchema.parse(validRegisterData)).not.toThrow()
      const result = registerSchema.parse(validRegisterData)
      expect(result.name).toBe('أحمد محمد')
      expect(result.role).toBe('therapist_lead')
    })

    it('should validate password confirmation', () => {
      const mismatchedPasswords = {
        ...validRegisterData,
        confirmPassword: 'different-password'
      }
      
      expect(() => registerSchema.parse(mismatchedPasswords)).toThrow('كلمتا المرور غير متطابقتين')
    })

    it('should enforce name minimum length', () => {
      const shortName = { ...validRegisterData, name: 'ا' }
      
      expect(() => registerSchema.parse(shortName)).toThrow('الاسم يجب أن يكون حرفين على الأقل')
    })

    it('should validate role enum', () => {
      const invalidRole = { ...validRegisterData, role: 'invalid_role' }
      
      expect(() => registerSchema.parse(invalidRole)).toThrow()
    })

    it('should accept all valid roles', () => {
      const validRoles = ['admin', 'manager', 'therapist_lead', 'receptionist'] as const
      
      validRoles.forEach(role => {
        const dataWithRole = { ...validRegisterData, role }
        expect(() => registerSchema.parse(dataWithRole)).not.toThrow()
        const result = registerSchema.parse(dataWithRole)
        expect(result.role).toBe(role)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values appropriately', () => {
      expect(() => planSchema.parse(null)).toThrow()
      expect(() => planSchema.parse(undefined)).toThrow()
      expect(() => categorySchema.parse({})).toThrow()
    })

    it('should preserve Arabic error messages', () => {
      try {
        sessionTypeSchema.parse({ type: 'speech_language', duration_minutes: 5 })
      } catch (error: any) {
        expect(error.issues[0].message).toContain('مدة الجلسة يجب أن تكون 15 دقيقة على الأقل')
      }
    })

    it('should handle mixed language validation correctly', () => {
      const mixedData = {
        name_ar: 'برنامج اختبار',
        name_en: 'Test Program',
        category_id: 'cat-123',
        session_types: [{
          type: 'educational' as const,
          duration_minutes: 45,
          sessions_per_week: 3,
          duration_weeks: 8
        }],
        duration_weeks: 8,
        sessions_per_week: 3,
        price_per_session: 150
      }
      
      expect(() => planSchema.parse(mixedData)).not.toThrow()
      const result = planSchema.parse(mixedData)
      expect(result.name_ar).toBe('برنامج اختبار')
      expect(result.name_en).toBe('Test Program')
    })
  })
})