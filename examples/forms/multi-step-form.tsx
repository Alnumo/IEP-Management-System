/**
 * Multi-Step Form Examples for IEP Goal Creation
 * 
 * Why: Demonstrates complex form workflows for therapy applications:
 * - Multi-step IEP goal creation process
 * - Arabic/English bilingual form fields
 * - Form validation with Zod and React Hook Form
 * - Progress tracking and step navigation
 * - Conditional field rendering
 * - Form data persistence across steps
 */

import React, { useState, useEffect } from 'react'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Check, AlertCircle, Save } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'

// Form validation schemas
const goalBasicsSchema = z.object({
  titleEn: z.string().min(5, 'English title must be at least 5 characters'),
  titleAr: z.string().min(3, 'العنوان العربي يجب أن يكون 3 أحرف على الأقل').regex(/[\u0600-\u06FF]/, 'يجب أن يحتوي على أحرف عربية'),
  descriptionEn: z.string().min(20, 'English description must be at least 20 characters'),
  descriptionAr: z.string().min(15, 'الوصف العربي يجب أن يكون 15 حرف على الأقل').regex(/[\u0600-\u06FF]/, 'يجب أن يحتوي على أحرف عربية'),
  category: z.enum(['speech', 'occupational', 'physical', 'behavioral', 'academic']),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
})

const measurementSchema = z.object({
  measurementType: z.enum(['percentage', 'frequency', 'duration', 'accuracy', 'independence']),
  currentLevel: z.number().min(0).max(100),
  targetLevel: z.number().min(0).max(100),
  timeframe: z.enum(['1_month', '3_months', '6_months', '1_year']),
  measurementMethod: z.string().min(10, 'Measurement method must be detailed'),
  measurementMethodAr: z.string().min(8, 'طريقة القياس يجب أن تكون مفصلة').regex(/[\u0600-\u06FF]/, 'يجب أن يحتوي على أحرف عربية')
}).refine(data => data.targetLevel > data.currentLevel, {
  message: 'Target level must be higher than current level',
  path: ['targetLevel']
})

const strategiesSchema = z.object({
  strategies: z.array(z.object({
    titleEn: z.string().min(5, 'Strategy title required'),
    titleAr: z.string().min(3, 'عنوان الاستراتيجية مطلوب').regex(/[\u0600-\u06FF]/, 'يجب أن يحتوي على أحرف عربية'),
    descriptionEn: z.string().min(15, 'Strategy description required'),
    descriptionAr: z.string().min(10, 'وصف الاستراتيجية مطلوب').regex(/[\u0600-\u06FF]/, 'يجب أن يحتوي على أحرف عربية'),
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    duration: z.number().min(5).max(120), // minutes
    materials: z.array(z.string()).optional()
  })).min(1, 'At least one strategy is required').max(5, 'Maximum 5 strategies allowed')
})

const reviewSchema = z.object({
  reviewFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
  dataCollection: z.enum(['daily', 'weekly', 'per_session', 'monthly']),
  responsibleParties: z.array(z.string()).min(1, 'At least one responsible party required'),
  parentInvolvement: z.boolean(),
  parentInvolvementDetails: z.string().optional(),
  parentInvolvementDetailsAr: z.string().optional(),
  accommodations: z.array(z.string()).optional(),
  accommodationsAr: z.array(z.string()).optional()
}).refine(data => {
  if (data.parentInvolvement) {
    return data.parentInvolvementDetails && data.parentInvolvementDetails.length > 10
  }
  return true
}, {
  message: 'Parent involvement details required when parent involvement is selected',
  path: ['parentInvolvementDetails']
})

// Combined schema
const iepGoalSchema = z.object({
  basics: goalBasicsSchema,
  measurement: measurementSchema,
  strategies: strategiesSchema,
  review: reviewSchema
})

type IEPGoalFormData = z.infer<typeof iepGoalSchema>

// Step configuration
const STEPS = [
  { id: 'basics', titleEn: 'Goal Basics', titleAr: 'أساسيات الهدف', icon: '📝' },
  { id: 'measurement', titleEn: 'Measurement', titleAr: 'القياس', icon: '📊' },
  { id: 'strategies', titleEn: 'Strategies', titleAr: 'الاستراتيجيات', icon: '🎯' },
  { id: 'review', titleEn: 'Review & Approval', titleAr: 'المراجعة والموافقة', icon: '✅' }
]

// Step 1: Goal Basics Component
const GoalBasicsStep: React.FC = () => {
  const { register, formState: { errors }, watch } = useFormContext<IEPGoalFormData>()
  const { language } = useLanguage()
  
  const categoryOptions = [
    { value: 'speech', labelEn: 'Speech Therapy', labelAr: 'علاج النطق' },
    { value: 'occupational', labelEn: 'Occupational Therapy', labelAr: 'العلاج الوظيفي' },
    { value: 'physical', labelEn: 'Physical Therapy', labelAr: 'العلاج الطبيعي' },
    { value: 'behavioral', labelEn: 'Behavioral Support', labelAr: 'الدعم السلوكي' },
    { value: 'academic', labelEn: 'Academic Support', labelAr: 'الدعم الأكاديمي' }
  ]

  const priorityOptions = [
    { value: 'low', labelEn: 'Low Priority', labelAr: 'أولوية منخفضة' },
    { value: 'medium', labelEn: 'Medium Priority', labelAr: 'أولوية متوسطة' },
    { value: 'high', labelEn: 'High Priority', labelAr: 'أولوية عالية' },
    { value: 'critical', labelEn: 'Critical Priority', labelAr: 'أولوية حرجة' }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
          </label>
          <input
            {...register('basics.titleEn')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder={language === 'ar' ? 'أدخل العنوان بالإنجليزية' : 'Enter goal title in English'}
          />
          {errors.basics?.titleEn && (
            <p className="text-red-500 text-sm mt-1">{errors.basics.titleEn.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
          </label>
          <input
            {...register('basics.titleAr')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 text-right"
            placeholder={language === 'ar' ? 'أدخل العنوان بالعربية' : 'Enter goal title in Arabic'}
            dir="rtl"
          />
          {errors.basics?.titleAr && (
            <p className="text-red-500 text-sm mt-1 text-right" dir="rtl">
              {errors.basics.titleAr.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
          </label>
          <textarea
            {...register('basics.descriptionEn')}
            rows={4}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder={language === 'ar' ? 'وصف مفصل للهدف بالإنجليزية' : 'Detailed description of the goal in English'}
          />
          {errors.basics?.descriptionEn && (
            <p className="text-red-500 text-sm mt-1">{errors.basics.descriptionEn.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
          </label>
          <textarea
            {...register('basics.descriptionAr')}
            rows={4}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 text-right"
            placeholder={language === 'ar' ? 'وصف مفصل للهدف بالعربية' : 'Detailed description of the goal in Arabic'}
            dir="rtl"
          />
          {errors.basics?.descriptionAr && (
            <p className="text-red-500 text-sm mt-1 text-right" dir="rtl">
              {errors.basics.descriptionAr.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'فئة العلاج' : 'Therapy Category'}
          </label>
          <select
            {...register('basics.category')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{language === 'ar' ? 'اختر الفئة' : 'Select category'}</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {language === 'ar' ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
          {errors.basics?.category && (
            <p className="text-red-500 text-sm mt-1">{errors.basics.category.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'الأولوية' : 'Priority'}
          </label>
          <select
            {...register('basics.priority')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{language === 'ar' ? 'اختر الأولوية' : 'Select priority'}</option>
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {language === 'ar' ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
          {errors.basics?.priority && (
            <p className="text-red-500 text-sm mt-1">{errors.basics.priority.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 2: Measurement Component
const MeasurementStep: React.FC = () => {
  const { register, formState: { errors }, watch } = useFormContext<IEPGoalFormData>()
  const { language } = useLanguage()
  
  const measurementTypes = [
    { value: 'percentage', labelEn: 'Percentage (%)', labelAr: 'نسبة مئوية (%)' },
    { value: 'frequency', labelEn: 'Frequency (times)', labelAr: 'تكرار (مرات)' },
    { value: 'duration', labelEn: 'Duration (minutes)', labelAr: 'مدة (دقائق)' },
    { value: 'accuracy', labelEn: 'Accuracy (%)', labelAr: 'دقة (%)' },
    { value: 'independence', labelEn: 'Independence Level', labelAr: 'مستوى الاستقلالية' }
  ]

  const timeframes = [
    { value: '1_month', labelEn: '1 Month', labelAr: 'شهر واحد' },
    { value: '3_months', labelEn: '3 Months', labelAr: '3 أشهر' },
    { value: '6_months', labelEn: '6 Months', labelAr: '6 أشهر' },
    { value: '1_year', labelEn: '1 Year', labelAr: 'سنة واحدة' }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'نوع القياس' : 'Measurement Type'}
          </label>
          <select
            {...register('measurement.measurementType')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{language === 'ar' ? 'اختر نوع القياس' : 'Select measurement type'}</option>
            {measurementTypes.map(type => (
              <option key={type.value} value={type.value}>
                {language === 'ar' ? type.labelAr : type.labelEn}
              </option>
            ))}
          </select>
          {errors.measurement?.measurementType && (
            <p className="text-red-500 text-sm mt-1">{errors.measurement.measurementType.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'الإطار الزمني' : 'Timeframe'}
          </label>
          <select
            {...register('measurement.timeframe')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{language === 'ar' ? 'اختر الإطار الزمني' : 'Select timeframe'}</option>
            {timeframes.map(timeframe => (
              <option key={timeframe.value} value={timeframe.value}>
                {language === 'ar' ? timeframe.labelAr : timeframe.labelEn}
              </option>
            ))}
          </select>
          {errors.measurement?.timeframe && (
            <p className="text-red-500 text-sm mt-1">{errors.measurement.timeframe.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'المستوى الحالي' : 'Current Level'}
          </label>
          <input
            {...register('measurement.currentLevel', { valueAsNumber: true })}
            type="number"
            min="0"
            max="100"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder={language === 'ar' ? 'المستوى الحالي' : 'Current level'}
          />
          {errors.measurement?.currentLevel && (
            <p className="text-red-500 text-sm mt-1">{errors.measurement.currentLevel.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'المستوى المستهدف' : 'Target Level'}
          </label>
          <input
            {...register('measurement.targetLevel', { valueAsNumber: true })}
            type="number"
            min="0"
            max="100"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder={language === 'ar' ? 'المستوى المستهدف' : 'Target level'}
          />
          {errors.measurement?.targetLevel && (
            <p className="text-red-500 text-sm mt-1">{errors.measurement.targetLevel.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'طريقة القياس (إنجليزي)' : 'Measurement Method (English)'}
          </label>
          <textarea
            {...register('measurement.measurementMethod')}
            rows={3}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder={language === 'ar' ? 'كيف سيتم قياس التقدم؟' : 'How will progress be measured?'}
          />
          {errors.measurement?.measurementMethod && (
            <p className="text-red-500 text-sm mt-1">{errors.measurement.measurementMethod.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ar' ? 'طريقة القياس (عربي)' : 'Measurement Method (Arabic)'}
          </label>
          <textarea
            {...register('measurement.measurementMethodAr')}
            rows={3}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 text-right"
            placeholder={language === 'ar' ? 'كيف سيتم قياس التقدم؟' : 'How will progress be measured?'}
            dir="rtl"
          />
          {errors.measurement?.measurementMethodAr && (
            <p className="text-red-500 text-sm mt-1 text-right" dir="rtl">
              {errors.measurement.measurementMethodAr.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Multi-Step Form Component
export const MultiStepIEPGoalForm: React.FC<{
  onSubmit: (data: IEPGoalFormData) => void
  onSaveDraft?: (data: Partial<IEPGoalFormData>) => void
  initialData?: Partial<IEPGoalFormData>
}> = ({ onSubmit, onSaveDraft, initialData }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const { language } = useLanguage()

  const methods = useForm<IEPGoalFormData>({
    resolver: zodResolver(iepGoalSchema),
    defaultValues: initialData,
    mode: 'onChange'
  })

  const { handleSubmit, trigger, getValues, formState: { isValid, errors } } = methods

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!onSaveDraft) return

    const interval = setInterval(() => {
      const currentData = getValues()
      onSaveDraft(currentData)
    }, 30000)

    return () => clearInterval(interval)
  }, [getValues, onSaveDraft])

  const nextStep = async () => {
    const stepFields = getStepFields(currentStep)
    const isStepValid = await trigger(stepFields as any)
    
    if (isStepValid) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])])
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const goToStep = async (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.includes(stepIndex - 1)) {
      setCurrentStep(stepIndex)
    }
  }

  const getStepFields = (stepIndex: number): string[] => {
    switch (stepIndex) {
      case 0: return ['basics.titleEn', 'basics.titleAr', 'basics.descriptionEn', 'basics.descriptionAr', 'basics.category', 'basics.priority']
      case 1: return ['measurement.measurementType', 'measurement.currentLevel', 'measurement.targetLevel', 'measurement.timeframe', 'measurement.measurementMethod', 'measurement.measurementMethodAr']
      case 2: return ['strategies.strategies']
      case 3: return ['review.reviewFrequency', 'review.dataCollection', 'review.responsibleParties']
      default: return []
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <GoalBasicsStep />
      case 1: return <MeasurementStep />
      case 2: return <div>Strategies Step (Implementation needed)</div>
      case 3: return <div>Review Step (Implementation needed)</div>
      default: return null
    }
  }

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 'completed'
    if (stepIndex === currentStep) return 'current'
    if (stepIndex < currentStep) return 'completed'
    return 'upcoming'
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const status = getStepStatus(index)
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => goToStep(index)}
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                      ${status === 'completed' ? 'bg-teal-500 text-white' : 
                        status === 'current' ? 'bg-teal-100 text-teal-600 border-2 border-teal-500' :
                        'bg-gray-100 text-gray-400'}
                      ${status !== 'upcoming' ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}
                    `}
                    disabled={status === 'upcoming'}
                  >
                    {status === 'completed' ? <Check size={16} /> : step.icon}
                  </button>
                  <div className="ml-3 text-sm">
                    <p className={`font-medium ${status === 'current' ? 'text-teal-600' : 'text-gray-500'}`}>
                      {language === 'ar' ? step.titleAr : step.titleEn}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${status === 'completed' ? 'bg-teal-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {language === 'ar' ? STEPS[currentStep].titleAr : STEPS[currentStep].titleEn}
          </h2>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="mr-2" />
            {language === 'ar' ? 'السابق' : 'Previous'}
          </button>

          <div className="flex items-center space-x-4">
            {onSaveDraft && (
              <button
                type="button"
                onClick={() => onSaveDraft(getValues())}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Save size={16} className="mr-2" />
                {language === 'ar' ? 'حفظ مسودة' : 'Save Draft'}
              </button>
            )}

            {currentStep === STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={!isValid}
                className="flex items-center px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} className="mr-2" />
                {language === 'ar' ? 'إنشاء الهدف' : 'Create Goal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                {language === 'ar' ? 'التالي' : 'Next'}
                <ChevronRight size={16} className="ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle size={16} className="text-red-500 mr-2" />
              <h3 className="text-red-700 font-medium">
                {language === 'ar' ? 'يرجى تصحيح الأخطاء التالية:' : 'Please correct the following errors:'}
              </h3>
            </div>
            <ul className="text-sm text-red-600 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </FormProvider>
  )
}

// Usage Example
/*
function IEPGoalCreationPage() {
  const handleSubmit = (data: IEPGoalFormData) => {
    console.log('IEP Goal Created:', data)
    // Submit to API
  }

  const handleSaveDraft = (data: Partial<IEPGoalFormData>) => {
    console.log('Draft saved:', data)
    // Save to localStorage or API
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <MultiStepIEPGoalForm
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        initialData={{
          basics: {
            category: 'speech',
            priority: 'high'
          }
        }}
      />
    </div>
  )
}
*/
