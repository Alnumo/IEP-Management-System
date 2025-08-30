import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEPValidation } from '@/hooks/useIEPs'
import type { CreateIEPData, UpdateIEPData, IEP, GoalDomain, MeasurementMethod, EvaluationFrequency } from '@/types/iep'
import { useState, useEffect } from 'react'

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

// IEP Goal schema for dynamic array
const iepGoalSchema = z.object({
  domain: z.enum(['academic_reading', 'academic_writing', 'academic_math', 'academic_science', 
                 'communication_expressive', 'communication_receptive', 'communication_social',
                 'behavioral_social', 'behavioral_attention', 'behavioral_self_regulation',
                 'functional_daily_living', 'functional_mobility', 'functional_self_care',
                 'motor_fine', 'motor_gross', 'vocational', 'transition'] as const),
  goal_statement_ar: z.string().min(10, 'يجب أن يكون بيان الهدف 10 أحرف على الأقل'),
  goal_statement_en: z.string().optional().or(z.literal('')),
  baseline_performance_ar: z.string().min(5, 'وصف الأداء الحالي مطلوب'),
  baseline_performance_en: z.string().optional().or(z.literal('')),
  measurement_method: z.enum(['frequency', 'percentage', 'duration', 'trials', 'observation', 
                             'checklist', 'rating_scale', 'portfolio', 'other'] as const),
  measurement_criteria: z.string().min(3, 'معايير القياس مطلوبة'),
  evaluation_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly'] as const),
  evaluation_method_ar: z.string().min(3, 'طريقة التقييم مطلوبة'),
  evaluation_method_en: z.string().optional().or(z.literal('')),
  mastery_criteria_ar: z.string().min(5, 'معايير الإتقان مطلوبة'),
  mastery_criteria_en: z.string().optional().or(z.literal('')),
  target_completion_date: z.string().min(1, 'تاريخ الإنجاز المستهدف مطلوب'),
  responsible_provider: z.string().optional().or(z.literal('')),
  service_frequency: z.string().optional().or(z.literal('')),
  service_location: z.string().optional().or(z.literal(''))
})

// Main IEP form validation schema
const iepFormSchema = z.object({
  // Student and IEP Classification
  student_id: z.string().min(1, 'معرف الطالب مطلوب'),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/, 'صيغة العام الدراسي يجب أن تكون YYYY-YYYY'),
  iep_type: z.enum(['initial', 'annual', 'triennial', 'amendment'], {
    required_error: 'نوع الخطة التعليمية مطلوب',
  }),
  effective_date: z.string().min(1, 'تاريخ السريان مطلوب'),
  annual_review_date: z.string().min(1, 'تاريخ المراجعة السنوية مطلوب'),
  
  // Present Levels of Performance (IDEA Required - Bilingual)
  present_levels_academic_ar: z.string().min(20, 'وصف الوضع الحالي للأداء الأكاديمي مطلوب (20 حرف على الأقل)'),
  present_levels_academic_en: z.string().optional().or(z.literal('')),
  present_levels_functional_ar: z.string().min(20, 'وصف الوضع الحالي للأداء الوظيفي مطلوب (20 حرف على الأقل)'),
  present_levels_functional_en: z.string().optional().or(z.literal('')),
  
  // Least Restrictive Environment (LRE) - IDEA Required
  lre_justification_ar: z.string().min(20, 'مبرر البيئة الأقل تقييداً مطلوب (20 حرف على الأقل)'),
  lre_justification_en: z.string().optional().or(z.literal('')),
  mainstreaming_percentage: z.number().min(0).max(100, 'النسبة يجب أن تكون بين 0 و 100'),
  special_education_setting: z.string().min(1, 'إعداد التربية الخاصة مطلوب'),
  
  // Accommodations and Modifications
  accommodations_ar: z.array(z.string()).default([]),
  accommodations_en: z.array(z.string()).default([]),
  modifications_ar: z.array(z.string()).default([]),
  modifications_en: z.array(z.string()).default([]),
  
  // Assessment Accommodations
  state_assessment_accommodations_ar: z.array(z.string()).default([]),
  state_assessment_accommodations_en: z.array(z.string()).default([]),
  alternate_assessment_justification_ar: z.string().optional().or(z.literal('')),
  alternate_assessment_justification_en: z.string().optional().or(z.literal('')),
  
  // Transition Services (Age 16+)
  transition_services_needed: z.boolean().default(false),
  post_secondary_goals_ar: z.string().optional().or(z.literal('')),
  post_secondary_goals_en: z.string().optional().or(z.literal('')),
  
  // Behavior Plan
  behavior_plan_needed: z.boolean().default(false),
  behavior_goals_ar: z.string().optional().or(z.literal('')),
  behavior_goals_en: z.string().optional().or(z.literal('')),
  
  // Extended School Year (ESY)
  esy_services_needed: z.boolean().default(false),
  esy_justification_ar: z.string().optional().or(z.literal('')),
  esy_justification_en: z.string().optional().or(z.literal('')),
  
  // Annual Goals (Dynamic Array)
  annual_goals: z.array(iepGoalSchema).min(1, 'يجب وجود هدف سنوي واحد على الأقل')
}).refine((data) => {
  // Annual review date must be within 365 days of effective date
  const effective = new Date(data.effective_date)
  const annual = new Date(data.annual_review_date)
  const daysDiff = (annual.getTime() - effective.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff >= 1 && daysDiff <= 365
}, {
  message: 'تاريخ المراجعة السنوية يجب أن يكون خلال 365 يوماً من تاريخ السريان',
  path: ['annual_review_date']
})

type IEPFormData = z.infer<typeof iepFormSchema>

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface IEPFormProps {
  initialData?: IEP | null
  studentId?: string
  onSubmit: (data: CreateIEPData | UpdateIEPData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPForm = ({ initialData, studentId, onSubmit, onCancel, isLoading = false }: IEPFormProps) => {
  const { language, isRTL } = useLanguage()
  const [accommodationInput, setAccommodationInput] = useState('')
  const [modificationInput, setModificationInput] = useState('')
  const [assessmentAccommodationInput, setAssessmentAccommodationInput] = useState('')

  const form = useForm<IEPFormData>({
    resolver: zodResolver(iepFormSchema),
    defaultValues: {
      student_id: initialData?.student_id || studentId || '',
      academic_year: initialData?.academic_year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      iep_type: initialData?.iep_type || 'initial',
      effective_date: initialData?.effective_date || '',
      annual_review_date: initialData?.annual_review_date || '',
      present_levels_academic_ar: initialData?.present_levels_academic_ar || '',
      present_levels_academic_en: initialData?.present_levels_academic_en || '',
      present_levels_functional_ar: initialData?.present_levels_functional_ar || '',
      present_levels_functional_en: initialData?.present_levels_functional_en || '',
      lre_justification_ar: initialData?.lre_justification_ar || '',
      lre_justification_en: initialData?.lre_justification_en || '',
      mainstreaming_percentage: initialData?.mainstreaming_percentage || 0,
      special_education_setting: initialData?.special_education_setting || '',
      accommodations_ar: initialData?.accommodations_ar || [],
      accommodations_en: initialData?.accommodations_en || [],
      modifications_ar: initialData?.modifications_ar || [],
      modifications_en: initialData?.modifications_en || [],
      state_assessment_accommodations_ar: initialData?.state_assessment_accommodations_ar || [],
      state_assessment_accommodations_en: initialData?.state_assessment_accommodations_en || [],
      alternate_assessment_justification_ar: initialData?.alternate_assessment_justification_ar || '',
      alternate_assessment_justification_en: initialData?.alternate_assessment_justification_en || '',
      transition_services_needed: initialData?.transition_services_needed || false,
      post_secondary_goals_ar: initialData?.post_secondary_goals_ar || '',
      post_secondary_goals_en: initialData?.post_secondary_goals_en || '',
      behavior_plan_needed: initialData?.behavior_plan_needed || false,
      behavior_goals_ar: initialData?.behavior_goals_ar || '',
      behavior_goals_en: initialData?.behavior_goals_en || '',
      esy_services_needed: initialData?.esy_services_needed || false,
      esy_justification_ar: initialData?.esy_justification_ar || '',
      esy_justification_en: initialData?.esy_justification_en || '',
      annual_goals: initialData?.goals?.map(goal => ({
        domain: goal.domain,
        goal_statement_ar: goal.goal_statement_ar,
        goal_statement_en: goal.goal_statement_en || '',
        baseline_performance_ar: goal.baseline_performance_ar,
        baseline_performance_en: goal.baseline_performance_en || '',
        measurement_method: goal.measurement_method,
        measurement_criteria: goal.measurement_criteria,
        evaluation_frequency: goal.evaluation_frequency,
        evaluation_method_ar: goal.evaluation_method_ar,
        evaluation_method_en: goal.evaluation_method_en || '',
        mastery_criteria_ar: goal.mastery_criteria_ar,
        mastery_criteria_en: goal.mastery_criteria_en || '',
        target_completion_date: goal.target_completion_date,
        responsible_provider: goal.responsible_provider || '',
        service_frequency: goal.service_frequency || '',
        service_location: goal.service_location || ''
      })) || [
        {
          domain: 'academic_reading' as GoalDomain,
          goal_statement_ar: '',
          goal_statement_en: '',
          baseline_performance_ar: '',
          baseline_performance_en: '',
          measurement_method: 'percentage' as MeasurementMethod,
          measurement_criteria: '',
          evaluation_frequency: 'weekly' as EvaluationFrequency,
          evaluation_method_ar: '',
          evaluation_method_en: '',
          mastery_criteria_ar: '',
          mastery_criteria_en: '',
          target_completion_date: '',
          responsible_provider: '',
          service_frequency: '',
          service_location: ''
        }
      ]
    },
  })

  // Dynamic goals array management
  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({
    control: form.control,
    name: 'annual_goals'
  })

  // Real-time validation
  const formData = form.watch()
  const { data: validationResult } = useIEPValidation(formData)

  // Auto-calculate annual review date when effective date changes
  useEffect(() => {
    const effectiveDate = form.watch('effective_date')
    if (effectiveDate && !initialData) {
      const effective = new Date(effectiveDate)
      const annual = new Date(effective)
      annual.setDate(annual.getDate() + 365)
      form.setValue('annual_review_date', annual.toISOString().split('T')[0])
    }
  }, [form.watch('effective_date')])

  const handleSubmit = async (data: IEPFormData) => {
    console.log('🔍 IEPForm: Form submitted with data:', data)
    try {
      // Transform form data to API format
      const iepData = {
        ...data,
        // Convert goals array to the format expected by the API
        goals: data.annual_goals
      } as CreateIEPData

      await onSubmit(iepData)
      console.log('✅ IEPForm: Form submission successful')
    } catch (error) {
      console.error('❌ IEPForm: Form submission error:', error)
      throw error
    }
  }

  // Helper functions for array management
  const addAccommodation = (type: 'ar' | 'en', value: string) => {
    if (!value.trim()) return
    const currentArray = form.getValues(`accommodations_${type}`)
    form.setValue(`accommodations_${type}`, [...currentArray, value.trim()])
    if (type === 'ar') setAccommodationInput('')
  }

  const removeAccommodation = (type: 'ar' | 'en', index: number) => {
    const currentArray = form.getValues(`accommodations_${type}`)
    form.setValue(`accommodations_${type}`, currentArray.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {initialData 
              ? (language === 'ar' ? 'تعديل الخطة التعليمية الفردية' : 'Edit IEP')
              : (language === 'ar' ? 'إنشاء خطة تعليمية فردية جديدة' : 'Create New IEP')
            }
            {validationResult && !validationResult.isValid && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationResult.issues.length} {language === 'ar' ? 'مشاكل' : 'Issues'}
              </Badge>
            )}
          </CardTitle>
          {validationResult && validationResult.issues.length > 0 && (
            <div className="text-sm text-red-600 space-y-1">
              {validationResult.issues.slice(0, 3).map((issue, index) => (
                <div key={index}>
                  • {language === 'ar' ? issue.description_ar : (issue.description_en || issue.description_ar)}
                </div>
              ))}
              {validationResult.issues.length > 3 && (
                <div>... {validationResult.issues.length - 3} {language === 'ar' ? 'مشاكل أخرى' : 'more issues'}</div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
              console.error('❌ IEP Form validation errors:', errors)
            })} className="space-y-4 sm:space-y-6">
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className={`grid w-full grid-cols-5 ${language === 'ar' ? 'font-arabic' : ''} text-xs sm:text-sm`}>
                  <TabsTrigger value="basic" className="px-1 sm:px-3">
                    {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}
                  </TabsTrigger>
                  <TabsTrigger value="present-levels" className="px-1 sm:px-3">
                    {language === 'ar' ? 'الوضع الحالي' : 'Present Levels'}
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="px-1 sm:px-3">
                    {language === 'ar' ? 'الأهداف السنوية' : 'Annual Goals'}
                  </TabsTrigger>
                  <TabsTrigger value="services" className="px-1 sm:px-3">
                    {language === 'ar' ? 'الخدمات والدعم' : 'Services & Support'}
                  </TabsTrigger>
                  <TabsTrigger value="additional" className="px-1 sm:px-3">
                    {language === 'ar' ? 'معلومات إضافية' : 'Additional'}
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    
                    <FormField
                      control={form.control}
                      name="academic_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'العام الدراسي *' : 'Academic Year *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? '2024-2025' : '2024-2025'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iep_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'نوع الخطة التعليمية *' : 'IEP Type *'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر نوع الخطة' : 'Select IEP type'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                              <SelectItem value="initial">
                                {language === 'ar' ? 'خطة أولية' : 'Initial IEP'}
                              </SelectItem>
                              <SelectItem value="annual">
                                {language === 'ar' ? 'مراجعة سنوية' : 'Annual Review'}
                              </SelectItem>
                              <SelectItem value="triennial">
                                {language === 'ar' ? 'مراجعة ثلاثية' : 'Triennial Review'}
                              </SelectItem>
                              <SelectItem value="amendment">
                                {language === 'ar' ? 'تعديل' : 'Amendment'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="effective_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ السريان *' : 'Effective Date *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annual_review_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ المراجعة السنوية *' : 'Annual Review Date *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mainstreaming_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'نسبة الدمج (%) *' : 'Mainstreaming Percentage (%) *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              placeholder={language === 'ar' ? '80' : '80'}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="special_education_setting"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'بيئة التربية الخاصة *' : 'Special Education Setting *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? 'فصل التربية الخاصة' : 'Special education classroom'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Present Levels Tab */}
                <TabsContent value="present-levels" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="space-y-6">
                    
                    <FormField
                      control={form.control}
                      name="present_levels_academic_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوضع الحالي للأداء الأكاديمي (عربي) *' : 'Present Levels of Academic Performance (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'اكتب وصفاً مفصلاً للوضع الحالي للطالب في الأداء الأكاديمي...' : 'Describe the student\'s current academic performance...'}
                              className={`min-h-32 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="present_levels_academic_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوضع الحالي للأداء الأكاديمي (إنجليزي)' : 'Present Levels of Academic Performance (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الوصف بالإنجليزية (اختياري)' : 'English description (optional)'}
                              className="min-h-32"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="present_levels_functional_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوضع الحالي للأداء الوظيفي (عربي) *' : 'Present Levels of Functional Performance (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'اكتب وصفاً مفصلاً للوضع الحالي للطالب في الأداء الوظيفي...' : 'Describe the student\'s current functional performance...'}
                              className={`min-h-32 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="present_levels_functional_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوضع الحالي للأداء الوظيفي (إنجليزي)' : 'Present Levels of Functional Performance (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'الوصف بالإنجليزية (اختياري)' : 'English description (optional)'}
                              className="min-h-32"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lre_justification_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مبرر البيئة الأقل تقييداً (عربي) *' : 'LRE Justification (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'اكتب مبرراً لاختيار البيئة الأقل تقييداً للطالب...' : 'Provide justification for the least restrictive environment...'}
                              className={`min-h-24 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lre_justification_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مبرر البيئة الأقل تقييداً (إنجليزي)' : 'LRE Justification (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'المبرر بالإنجليزية (اختياري)' : 'English justification (optional)'}
                              className="min-h-24"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </TabsContent>

                {/* Annual Goals Tab */}
                <TabsContent value="goals" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className={`text-lg font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الأهداف السنوية' : 'Annual Goals'}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendGoal({
                        domain: 'academic_reading' as GoalDomain,
                        goal_statement_ar: '',
                        goal_statement_en: '',
                        baseline_performance_ar: '',
                        baseline_performance_en: '',
                        measurement_method: 'percentage' as MeasurementMethod,
                        measurement_criteria: '',
                        evaluation_frequency: 'weekly' as EvaluationFrequency,
                        evaluation_method_ar: '',
                        evaluation_method_en: '',
                        mastery_criteria_ar: '',
                        mastery_criteria_en: '',
                        target_completion_date: '',
                        responsible_provider: '',
                        service_frequency: '',
                        service_location: ''
                      })}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {goalFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className={`text-md font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? `الهدف ${index + 1}` : `Goal ${index + 1}`}
                          </h4>
                          {goalFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeGoal(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.domain`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مجال الهدف *' : 'Goal Domain *'}
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === 'ar' ? 'اختر المجال' : 'Select domain'} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                                    <SelectItem value="academic_reading">
                                      {language === 'ar' ? 'أكاديمي - القراءة' : 'Academic - Reading'}
                                    </SelectItem>
                                    <SelectItem value="academic_writing">
                                      {language === 'ar' ? 'أكاديمي - الكتابة' : 'Academic - Writing'}
                                    </SelectItem>
                                    <SelectItem value="academic_math">
                                      {language === 'ar' ? 'أكاديمي - الرياضيات' : 'Academic - Math'}
                                    </SelectItem>
                                    <SelectItem value="communication_expressive">
                                      {language === 'ar' ? 'التواصل - التعبيري' : 'Communication - Expressive'}
                                    </SelectItem>
                                    <SelectItem value="communication_receptive">
                                      {language === 'ar' ? 'التواصل - الاستقبالي' : 'Communication - Receptive'}
                                    </SelectItem>
                                    <SelectItem value="behavioral_social">
                                      {language === 'ar' ? 'السلوكي - الاجتماعي' : 'Behavioral - Social'}
                                    </SelectItem>
                                    <SelectItem value="functional_daily_living">
                                      {language === 'ar' ? 'وظيفي - المعيشة اليومية' : 'Functional - Daily Living'}
                                    </SelectItem>
                                    <SelectItem value="motor_fine">
                                      {language === 'ar' ? 'حركي - دقيق' : 'Motor - Fine'}
                                    </SelectItem>
                                    <SelectItem value="motor_gross">
                                      {language === 'ar' ? 'حركي - كبير' : 'Motor - Gross'}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.target_completion_date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'تاريخ الإنجاز المستهدف *' : 'Target Completion Date *'}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.goal_statement_ar`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'بيان الهدف (عربي) *' : 'Goal Statement (Arabic) *'}
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder={language === 'ar' ? 'اكتب بيان الهدف السنوي بطريقة قابلة للقياس...' : 'Write a measurable annual goal statement...'}
                                    className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.baseline_performance_ar`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'الأداء الأساسي (عربي) *' : 'Baseline Performance (Arabic) *'}
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder={language === 'ar' ? 'اكتب وصف الأداء الحالي للطالب في هذا المجال...' : 'Describe the student\'s current performance in this area...'}
                                    className={`min-h-16 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.measurement_method`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'طريقة القياس *' : 'Measurement Method *'}
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === 'ar' ? 'اختر طريقة القياس' : 'Select method'} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                                    <SelectItem value="percentage">
                                      {language === 'ar' ? 'نسبة مئوية' : 'Percentage'}
                                    </SelectItem>
                                    <SelectItem value="frequency">
                                      {language === 'ar' ? 'التكرار' : 'Frequency'}
                                    </SelectItem>
                                    <SelectItem value="duration">
                                      {language === 'ar' ? 'المدة' : 'Duration'}
                                    </SelectItem>
                                    <SelectItem value="trials">
                                      {language === 'ar' ? 'المحاولات' : 'Trials'}
                                    </SelectItem>
                                    <SelectItem value="observation">
                                      {language === 'ar' ? 'الملاحظة' : 'Observation'}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.evaluation_frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'تكرار التقييم *' : 'Evaluation Frequency *'}
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === 'ar' ? 'اختر التكرار' : 'Select frequency'} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                                    <SelectItem value="daily">
                                      {language === 'ar' ? 'يومي' : 'Daily'}
                                    </SelectItem>
                                    <SelectItem value="weekly">
                                      {language === 'ar' ? 'أسبوعي' : 'Weekly'}
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      {language === 'ar' ? 'شهري' : 'Monthly'}
                                    </SelectItem>
                                    <SelectItem value="quarterly">
                                      {language === 'ar' ? 'ربع سنوي' : 'Quarterly'}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.measurement_criteria`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'معايير القياس *' : 'Measurement Criteria *'}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={language === 'ar' ? '80% دقة' : '80% accuracy'}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.responsible_provider`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مقدم الخدمة المسؤول' : 'Responsible Provider'}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={language === 'ar' ? 'معلم التربية الخاصة' : 'Special Education Teacher'}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.evaluation_method_ar`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'طريقة التقييم (عربي) *' : 'Evaluation Method (Arabic) *'}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={language === 'ar' ? 'ملاحظة مباشرة وتسجيل البيانات' : 'Direct observation and data recording'}
                                    className={language === 'ar' ? 'font-arabic text-right' : ''}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`annual_goals.${index}.mastery_criteria_ar`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'معايير الإتقان (عربي) *' : 'Mastery Criteria (Arabic) *'}
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder={language === 'ar' ? 'اكتب معايير إتقان الهدف...' : 'Write the criteria for goal mastery...'}
                                    className={`min-h-16 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Services & Support Tab */}
                <TabsContent value="services" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="space-y-6">
                    
                    {/* Accommodations */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التسهيلات' : 'Accommodations'}
                      </h3>
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أضف تسهيلاً جديداً' : 'Add new accommodation'}
                          value={accommodationInput}
                          onChange={(e) => setAccommodationInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addAccommodation('ar', accommodationInput)
                            }
                          }}
                          className={language === 'ar' ? 'font-arabic text-right' : ''}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addAccommodation('ar', accommodationInput)}
                        >
                          {language === 'ar' ? 'إضافة' : 'Add'}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {form.watch('accommodations_ar').map((accommodation, index) => (
                          <Badge key={index} variant="secondary" className="gap-2">
                            <span className={language === 'ar' ? 'font-arabic' : ''}>{accommodation}</span>
                            <button
                              type="button"
                              onClick={() => removeAccommodation('ar', index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Checkboxes for Additional Services */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transition_services_needed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'خدمات انتقالية مطلوبة' : 'Transition Services Needed'}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="behavior_plan_needed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'خطة سلوكية مطلوبة' : 'Behavior Plan Needed'}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="esy_services_needed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'خدمات السنة الدراسية الممتدة' : 'Extended School Year Services'}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                  </div>
                </TabsContent>

                {/* Additional Information Tab */}
                <TabsContent value="additional" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <div className="space-y-6">
                    
                    {/* Conditional fields based on checkboxes */}
                    {form.watch('transition_services_needed') && (
                      <FormField
                        control={form.control}
                        name="post_secondary_goals_ar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'أهداف ما بعد المرحلة الثانوية (عربي)' : 'Post-Secondary Goals (Arabic)'}
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={language === 'ar' ? 'اكتب أهداف الطالب لما بعد المرحلة الثانوية...' : 'Write the student\'s post-secondary goals...'}
                                className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch('behavior_plan_needed') && (
                      <FormField
                        control={form.control}
                        name="behavior_goals_ar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'الأهداف السلوكية (عربي)' : 'Behavior Goals (Arabic)'}
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={language === 'ar' ? 'اكتب الأهداف السلوكية للطالب...' : 'Write the student\'s behavior goals...'}
                                className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch('esy_services_needed') && (
                      <FormField
                        control={form.control}
                        name="esy_justification_ar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'مبرر خدمات السنة الدراسية الممتدة (عربي)' : 'ESY Services Justification (Arabic)'}
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={language === 'ar' ? 'اكتب مبرر الحاجة لخدمات السنة الدراسية الممتدة...' : 'Justify the need for extended school year services...'}
                                className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="alternate_assessment_justification_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مبرر التقييم البديل (عربي)' : 'Alternate Assessment Justification (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={language === 'ar' ? 'اكتب مبرر استخدام التقييم البديل إذا لزم الأمر...' : 'Justify alternate assessment if needed...'}
                              className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className={`flex gap-4 pt-6 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="min-w-[120px]"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid || (validationResult && validationResult.issues.some(i => i.severity === 'critical'))}
                  className="min-w-[120px]"
                >
                  {isLoading 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : initialData 
                      ? (language === 'ar' ? 'تحديث الخطة التعليمية' : 'Update IEP')
                      : (language === 'ar' ? 'إنشاء الخطة التعليمية' : 'Create IEP')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}