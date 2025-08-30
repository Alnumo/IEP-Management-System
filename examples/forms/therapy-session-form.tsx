/**
 * Therapy Session Form Examples
 * 
 * Why: Demonstrates form patterns for therapy applications:
 * - React Hook Form + Zod validation with Arabic text
 * - Bilingual form fields and error messages
 * - Multi-step form workflows for complex therapy data
 * - Real-time validation with Arabic text patterns
 * - Accessibility features for Arabic forms
 * - File upload integration for therapy documents
 */

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLanguage } from '../hooks/useLanguage'
import { BilingualText } from '../types/therapy-types'

// Zod schema with Arabic text validation
const therapySessionSchema = z.object({
  // Basic session info
  studentId: z.string().min(1, {
    message: 'Student selection is required'
  }),
  therapistId: z.string().min(1, {
    message: 'Therapist selection is required'
  }),
  type: z.enum(['speech', 'physical', 'occupational', 'behavioral', 'cognitive'], {
    errorMap: () => ({ message: 'Please select a therapy type' })
  }),
  
  // Bilingual titles
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  titleAr: z.string()
    .min(3, 'العنوان يجب أن يكون 3 أحرف على الأقل')
    .max(100, 'العنوان يجب ألا يتجاوز 100 حرف')
    .regex(/[\u0600-\u06FF]/, 'العنوان يجب أن يحتوي على نص عربي'),
  
  // Bilingual descriptions
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  descriptionAr: z.string()
    .min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل')
    .max(500, 'الوصف يجب ألا يتجاوز 500 حرف')
    .regex(/[\u0600-\u06FF]/, 'الوصف يجب أن يحتوي على نص عربي'),
  
  // Session scheduling
  scheduledDate: z.string()
    .min(1, 'Session date is required')
    .refine((date) => new Date(date) > new Date(), {
      message: 'Session date must be in the future'
    }),
  duration: z.number()
    .min(15, 'Session must be at least 15 minutes')
    .max(180, 'Session cannot exceed 3 hours'),
  
  // Goals (array of strings)
  goals: z.array(z.string().min(5, 'Goal must be at least 5 characters'))
    .min(1, 'At least one goal is required')
    .max(5, 'Maximum 5 goals allowed'),
  goalsAr: z.array(z.string()
    .min(5, 'الهدف يجب أن يكون 5 أحرف على الأقل')
    .regex(/[\u0600-\u06FF]/, 'الهدف يجب أن يحتوي على نص عربي'))
    .min(1, 'هدف واحد على الأقل مطلوب')
    .max(5, 'الحد الأقصى 5 أهداف'),
  
  // Session location
  isVirtual: z.boolean(),
  location: z.string().optional(),
  meetingLink: z.string().url('Invalid meeting link').optional(),
  
  // Notes
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  notesAr: z.string().max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف').optional(),
  
  // File attachments
  attachments: z.array(z.object({
    file: z.instanceof(File),
    title: z.string().min(1, 'File title is required'),
    titleAr: z.string().min(1, 'عنوان الملف مطلوب')
  })).optional()
}).refine((data) => {
  // Custom validation: if virtual, meeting link is required
  if (data.isVirtual && !data.meetingLink) {
    return false
  }
  // If not virtual, location is required
  if (!data.isVirtual && !data.location) {
    return false
  }
  return true
}, {
  message: 'Meeting link is required for virtual sessions, location is required for in-person sessions',
  path: ['meetingLink'] // This will show the error on the meetingLink field
})

type TherapySessionFormData = z.infer<typeof therapySessionSchema>

interface TherapySessionFormProps {
  initialData?: Partial<TherapySessionFormData>
  onSubmit: (data: TherapySessionFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export const TherapySessionForm: React.FC<TherapySessionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { language, isRTL, formatText } = useLanguage()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
    trigger,
    getValues
  } = useForm<TherapySessionFormData>({
    resolver: zodResolver(therapySessionSchema),
    defaultValues: {
      studentId: '',
      therapistId: '',
      type: 'speech',
      title: '',
      titleAr: '',
      description: '',
      descriptionAr: '',
      scheduledDate: '',
      duration: 45,
      goals: [''],
      goalsAr: [''],
      isVirtual: false,
      location: '',
      meetingLink: '',
      notes: '',
      notesAr: '',
      attachments: [],
      ...initialData
    },
    mode: 'onChange'
  })

  const watchIsVirtual = watch('isVirtual')
  const watchGoals = watch('goals')
  const watchGoalsAr = watch('goalsAr')

  // Form labels based on language
  const labels = {
    ar: {
      basicInfo: 'المعلومات الأساسية',
      sessionDetails: 'تفاصيل الجلسة',
      goalsAndNotes: 'الأهداف والملاحظات',
      attachments: 'المرفقات',
      student: 'الطالب',
      therapist: 'المعالج',
      therapyType: 'نوع العلاج',
      title: 'عنوان الجلسة',
      description: 'وصف الجلسة',
      date: 'تاريخ الجلسة',
      duration: 'مدة الجلسة (بالدقائق)',
      goals: 'أهداف الجلسة',
      addGoal: 'إضافة هدف',
      removeGoal: 'إزالة الهدف',
      isVirtual: 'جلسة افتراضية',
      location: 'موقع الجلسة',
      meetingLink: 'رابط الاجتماع',
      notes: 'ملاحظات إضافية',
      attachments: 'المرفقات',
      addAttachment: 'إضافة مرفق',
      next: 'التالي',
      previous: 'السابق',
      submit: 'حفظ الجلسة',
      cancel: 'إلغاء'
    },
    en: {
      basicInfo: 'Basic Information',
      sessionDetails: 'Session Details',
      goalsAndNotes: 'Goals and Notes',
      attachments: 'Attachments',
      student: 'Student',
      therapist: 'Therapist',
      therapyType: 'Therapy Type',
      title: 'Session Title',
      description: 'Session Description',
      date: 'Session Date',
      duration: 'Duration (minutes)',
      goals: 'Session Goals',
      addGoal: 'Add Goal',
      removeGoal: 'Remove Goal',
      isVirtual: 'Virtual Session',
      location: 'Session Location',
      meetingLink: 'Meeting Link',
      notes: 'Additional Notes',
      attachments: 'Attachments',
      addAttachment: 'Add Attachment',
      next: 'Next',
      previous: 'Previous',
      submit: 'Save Session',
      cancel: 'Cancel'
    }
  }

  const t = labels[language]

  // Add new goal
  const addGoal = () => {
    const currentGoals = getValues('goals')
    const currentGoalsAr = getValues('goalsAr')
    
    if (currentGoals.length < 5) {
      setValue('goals', [...currentGoals, ''])
      setValue('goalsAr', [...currentGoalsAr, ''])
    }
  }

  // Remove goal
  const removeGoal = (index: number) => {
    const currentGoals = getValues('goals')
    const currentGoalsAr = getValues('goalsAr')
    
    if (currentGoals.length > 1) {
      setValue('goals', currentGoals.filter((_, i) => i !== index))
      setValue('goalsAr', currentGoalsAr.filter((_, i) => i !== index))
    }
  }

  // Step navigation
  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isStepValid = await trigger(fieldsToValidate)
    
    if (isStepValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Get fields to validate for each step
  const getFieldsForStep = (step: number): (keyof TherapySessionFormData)[] => {
    switch (step) {
      case 1:
        return ['studentId', 'therapistId', 'type']
      case 2:
        return ['title', 'titleAr', 'description', 'descriptionAr', 'scheduledDate', 'duration']
      case 3:
        return ['goals', 'goalsAr', 'isVirtual', 'location', 'meetingLink']
      case 4:
        return ['notes', 'notesAr', 'attachments']
      default:
        return []
    }
  }

  // Form submission
  const onFormSubmit = async (data: TherapySessionFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Render form field with error handling
  const renderField = (
    name: keyof TherapySessionFormData,
    label: string,
    component: React.ReactNode
  ) => (
    <div className={`form-field ${isRTL ? 'rtl' : 'ltr'}`}>
      <label className="block text-sm font-medium mb-2" dir={isRTL ? 'rtl' : 'ltr'}>
        {label}
      </label>
      {component}
      {errors[name] && (
        <p className="text-red-500 text-sm mt-1" dir={isRTL ? 'rtl' : 'ltr'}>
          {errors[name]?.message}
        </p>
      )}
    </div>
  )

  // Step 1: Basic Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.basicInfo}</h3>
      
      {renderField('studentId', t.student,
        <Controller
          name="studentId"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <option value="">
                {language === 'ar' ? 'اختر الطالب' : 'Select Student'}
              </option>
              <option value="student-1">أحمد محمد - Ahmed Mohammed</option>
              <option value="student-2">سارة علي - Sara Ali</option>
            </select>
          )}
        />
      )}

      {renderField('therapistId', t.therapist,
        <Controller
          name="therapistId"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <option value="">
                {language === 'ar' ? 'اختر المعالج' : 'Select Therapist'}
              </option>
              <option value="therapist-1">د. فاطمة أحمد - Dr. Fatima Ahmed</option>
              <option value="therapist-2">د. محمد علي - Dr. Mohammed Ali</option>
            </select>
          )}
        />
      )}

      {renderField('type', t.therapyType,
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <option value="speech">
                {language === 'ar' ? 'علاج النطق' : 'Speech Therapy'}
              </option>
              <option value="physical">
                {language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy'}
              </option>
              <option value="occupational">
                {language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy'}
              </option>
              <option value="behavioral">
                {language === 'ar' ? 'العلاج السلوكي' : 'Behavioral Therapy'}
              </option>
              <option value="cognitive">
                {language === 'ar' ? 'العلاج المعرفي' : 'Cognitive Therapy'}
              </option>
            </select>
          )}
        />
      )}
    </div>
  )

  // Step 2: Session Details
  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.sessionDetails}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('title', `${t.title} (English)`,
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Enter session title in English"
                dir="ltr"
              />
            )}
          />
        )}

        {renderField('titleAr', `${t.title} (العربية)`,
          <Controller
            name="titleAr"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="أدخل عنوان الجلسة بالعربية"
                dir="rtl"
              />
            )}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('description', `${t.description} (English)`,
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Enter session description in English"
                dir="ltr"
              />
            )}
          />
        )}

        {renderField('descriptionAr', `${t.description} (العربية)`,
          <Controller
            name="descriptionAr"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="أدخل وصف الجلسة بالعربية"
                dir="rtl"
              />
            )}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('scheduledDate', t.date,
          <Controller
            name="scheduledDate"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="datetime-local"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          />
        )}

        {renderField('duration', t.duration,
          <Controller
            name="duration"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                min="15"
                max="180"
                step="15"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        )}
      </div>
    </div>
  )

  // Step 3: Goals and Location
  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.goalsAndNotes}</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{t.goals}</label>
          <button
            type="button"
            onClick={addGoal}
            className="px-3 py-1 bg-teal-500 text-white rounded text-sm hover:bg-teal-600"
            disabled={watchGoals.length >= 5}
          >
            {t.addGoal}
          </button>
        </div>

        {watchGoals.map((_, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Controller
                name={`goals.${index}`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder={`Goal ${index + 1} (English)`}
                    dir="ltr"
                  />
                )}
              />
              {errors.goals?.[index] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.goals[index]?.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Controller
                name={`goalsAr.${index}`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder={`الهدف ${index + 1} (العربية)`}
                    dir="rtl"
                  />
                )}
              />
              {watchGoals.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
            {errors.goalsAr?.[index] && (
              <p className="text-red-500 text-sm mt-1 md:col-start-2">
                {errors.goalsAr[index]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Controller
          name="isVirtual"
          control={control}
          render={({ field }) => (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="w-4 h-4 text-teal-600"
              />
              <span>{t.isVirtual}</span>
            </label>
          )}
        />

        {watchIsVirtual ? (
          renderField('meetingLink', t.meetingLink,
            <Controller
              name="meetingLink"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="url"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="https://meet.google.com/..."
                  dir="ltr"
                />
              )}
            />
          )
        ) : (
          renderField('location', t.location,
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder={language === 'ar' ? 'أدخل موقع الجلسة' : 'Enter session location'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              )}
            />
          )
        )}
      </div>
    </div>
  )

  // Step 4: Notes and Attachments
  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.attachments}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('notes', `${t.notes} (English)`,
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Additional notes in English (optional)"
                dir="ltr"
              />
            )}
          />
        )}

        {renderField('notesAr', `${t.notes} (العربية)`,
          <Controller
            name="notesAr"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="ملاحظات إضافية بالعربية (اختياري)"
                dir="rtl"
              />
            )}
          />
        )}
      </div>

      {/* File attachments would be implemented here */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-gray-500">
          {language === 'ar' ? 'سيتم إضافة رفع الملفات قريباً' : 'File upload coming soon'}
        </p>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-4xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step <= currentStep
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form steps */}
      <div className="min-h-[400px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Navigation buttons */}
      <div className={`flex justify-between mt-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={previousStep}
          disabled={currentStep === 1}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.previous}
        </button>

        <div className="flex gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t.cancel}
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </span>
              ) : (
                t.submit
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

// Usage example:
/*
function CreateSessionPage() {
  const handleSubmit = async (data: TherapySessionFormData) => {
    try {
      const response = await createTherapySession(data)
      if (response.success) {
        toast.success('Session created successfully')
        navigate('/sessions')
      } else {
        toast.error(response.error?.message_ar || 'Failed to create session')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">
        إنشاء جلسة علاج جديدة
      </h1>
      <TherapySessionForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/sessions')}
      />
    </div>
  )
}
*/
