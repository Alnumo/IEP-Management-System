/**
 * IEP Creation Wizard - Step-by-Step IEP Creation
 * Multi-step wizard for creating IEPs with guidance and validation
 * IDEA 2024 Compliant - Bilingual Support
 */

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  FileText,
  Target,
  Users,
  Calendar,
  BookOpen,
  Award
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateIEP } from '@/hooks/useIEPs'
import { useStudents } from '@/hooks/useStudents'
import type { CreateIEPData, IEPType, GoalDomain, ServiceCategory } from '@/types/iep'
import { cn } from '@/lib/utils'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const basicInfoSchema = z.object({
  student_id: z.string().min(1, 'Student selection is required'),
  academic_year: z.string().min(1, 'Academic year is required'),
  iep_type: z.enum(['initial', 'annual', 'triennial', 'amendment']),
  effective_date: z.string().min(1, 'Effective date is required'),
  annual_review_date: z.string().min(1, 'Annual review date is required'),
  triennial_evaluation_due: z.string().optional()
})

const presentLevelsSchema = z.object({
  present_levels_academic_ar: z.string().min(10, 'Academic performance description (Arabic) is required'),
  present_levels_academic_en: z.string().optional(),
  present_levels_functional_ar: z.string().min(10, 'Functional performance description (Arabic) is required'),
  present_levels_functional_en: z.string().optional()
})

const assessmentSchema = z.object({
  state_assessment_accommodations_ar: z.array(z.string()).optional().default([]),
  state_assessment_accommodations_en: z.array(z.string()).optional().default([]),
  alternate_assessment_justification_ar: z.string().optional(),
  alternate_assessment_justification_en: z.string().optional()
})

const accommodationsSchema = z.object({
  accommodations_ar: z.array(z.string()).min(1, 'At least one accommodation is required'),
  accommodations_en: z.array(z.string()).optional().default([]),
  modifications_ar: z.array(z.string()).optional().default([]),
  modifications_en: z.array(z.string()).optional().default([])
})

const lreSchema = z.object({
  lre_justification_ar: z.string().min(10, 'LRE justification (Arabic) is required'),
  lre_justification_en: z.string().optional(),
  mainstreaming_percentage: z.number().min(0).max(100),
  special_education_setting: z.string().min(1, 'Special education setting is required')
})

const servicesSchema = z.object({
  transition_services_needed: z.boolean(),
  behavior_plan_needed: z.boolean(),
  esy_services_needed: z.boolean(),
  post_secondary_goals_ar: z.string().optional(),
  post_secondary_goals_en: z.string().optional(),
  behavior_goals_ar: z.string().optional(),
  behavior_goals_en: z.string().optional(),
  esy_justification_ar: z.string().optional(),
  esy_justification_en: z.string().optional()
})

const wizardSchema = basicInfoSchema
  .merge(presentLevelsSchema)
  .merge(accommodationsSchema)
  .merge(assessmentSchema)
  .merge(lreSchema)
  .merge(servicesSchema)

type WizardFormData = z.infer<typeof wizardSchema>

// =============================================================================
// WIZARD STEPS CONFIGURATION
// =============================================================================

interface WizardStep {
  id: string
  title_ar: string
  title_en: string
  description_ar: string
  description_en: string
  icon: React.ReactNode
  schema: z.ZodSchema
}

const wizardSteps: WizardStep[] = [
  {
    id: 'basic_info',
    title_ar: 'المعلومات الأساسية',
    title_en: 'Basic Information',
    description_ar: 'معلومات الطالب ونوع البرنامج التعليمي الفردي',
    description_en: 'Student information and IEP type',
    icon: <FileText className="w-5 h-5" />,
    schema: basicInfoSchema
  },
  {
    id: 'present_levels',
    title_ar: 'المستويات الحالية',
    title_en: 'Present Levels',
    description_ar: 'الأداء الأكاديمي والوظيفي الحالي للطالب',
    description_en: 'Student\'s current academic and functional performance',
    icon: <BookOpen className="w-5 h-5" />,
    schema: presentLevelsSchema
  },
  {
    id: 'accommodations',
    title_ar: 'التسهيلات والتعديلات',
    title_en: 'Accommodations',
    description_ar: 'التسهيلات والتعديلات المطلوبة للطالب',
    description_en: 'Required accommodations and modifications',
    icon: <Target className="w-5 h-5" />,
    schema: accommodationsSchema
  },
  {
    id: 'assessments',
    title_ar: 'تسهيلات التقييم',
    title_en: 'Assessment Accommodations',
    description_ar: 'تسهيلات الاختبارات والتقييمات البديلة',
    description_en: 'Test accommodations and alternate assessments',
    icon: <CheckCircle className="w-5 h-5" />,
    schema: assessmentSchema
  },
  {
    id: 'lre',
    title_ar: 'البيئة التعليمية',
    title_en: 'Learning Environment',
    description_ar: 'البيئة التعليمية الأقل تقييداً والدمج',
    description_en: 'Least Restrictive Environment and inclusion',
    icon: <Users className="w-5 h-5" />,
    schema: lreSchema
  },
  {
    id: 'services',
    title_ar: 'الخدمات الإضافية',
    title_en: 'Additional Services',
    description_ar: 'خدمات الانتقال والسلوك والخدمات الصيفية',
    description_en: 'Transition, behavior, and extended year services',
    icon: <Award className="w-5 h-5" />,
    schema: servicesSchema
  }
]

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface IEPCreationWizardProps {
  onComplete: (iep: any) => void
  onCancel: () => void
  initialData?: Partial<CreateIEPData>
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IEPCreationWizard({ 
  onComplete, 
  onCancel, 
  initialData 
}: IEPCreationWizardProps) {
  const { language, isRTL } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: students } = useStudents()
  const createIEPMutation = useCreateIEP()

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    mode: 'onChange',
    defaultValues: {
      student_id: initialData?.student_id || '',
      academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      iep_type: initialData?.iep_type || 'initial',
      effective_date: initialData?.effective_date || '',
      annual_review_date: initialData?.annual_review_date || '',
      triennial_evaluation_due: initialData?.triennial_evaluation_due || '',
      present_levels_academic_ar: initialData?.present_levels_academic_ar || '',
      present_levels_academic_en: initialData?.present_levels_academic_en || '',
      present_levels_functional_ar: initialData?.present_levels_functional_ar || '',
      present_levels_functional_en: initialData?.present_levels_functional_en || '',
      accommodations_ar: initialData?.accommodations_ar || [''],
      accommodations_en: initialData?.accommodations_en || [''],
      modifications_ar: initialData?.modifications_ar || [''],
      modifications_en: initialData?.modifications_en || [''],
      state_assessment_accommodations_ar: initialData?.state_assessment_accommodations_ar || [''],
      state_assessment_accommodations_en: initialData?.state_assessment_accommodations_en || [''],
      alternate_assessment_justification_ar: initialData?.alternate_assessment_justification_ar || '',
      alternate_assessment_justification_en: initialData?.alternate_assessment_justification_en || '',
      lre_justification_ar: initialData?.lre_justification_ar || '',
      lre_justification_en: initialData?.lre_justification_en || '',
      mainstreaming_percentage: initialData?.mainstreaming_percentage || 80,
      special_education_setting: initialData?.special_education_setting || '',
      transition_services_needed: initialData?.transition_services_needed || false,
      behavior_plan_needed: initialData?.behavior_plan_needed || false,
      esy_services_needed: initialData?.esy_services_needed || false,
      post_secondary_goals_ar: initialData?.post_secondary_goals_ar || '',
      post_secondary_goals_en: initialData?.post_secondary_goals_en || '',
      behavior_goals_ar: initialData?.behavior_goals_ar || '',
      behavior_goals_en: initialData?.behavior_goals_en || '',
      esy_justification_ar: initialData?.esy_justification_ar || '',
      esy_justification_en: initialData?.esy_justification_en || ''
    }
  })

  const { fields: accommodationsArFields, append: appendAccommodationAr, remove: removeAccommodationAr } = 
    useFieldArray({ control: form.control, name: 'accommodations_ar' })

  const { fields: accommodationsEnFields, append: appendAccommodationEn, remove: removeAccommodationEn } = 
    useFieldArray({ control: form.control, name: 'accommodations_en' })

  const { fields: modificationsArFields, append: appendModificationAr, remove: removeModificationAr } = 
    useFieldArray({ control: form.control, name: 'modifications_ar' })

  const { fields: modificationsEnFields, append: appendModificationEn, remove: removeModificationEn } = 
    useFieldArray({ control: form.control, name: 'modifications_en' })

  const { fields: stateAssessmentArFields, append: appendStateAssessmentAr, remove: removeStateAssessmentAr } = 
    useFieldArray({ control: form.control, name: 'state_assessment_accommodations_ar' })

  const { fields: stateAssessmentEnFields, append: appendStateAssessmentEn, remove: removeStateAssessmentEn } = 
    useFieldArray({ control: form.control, name: 'state_assessment_accommodations_en' })

  // Validate current step
  const validateCurrentStep = async () => {
    const currentStepConfig = wizardSteps[currentStep]
    const isValid = await form.trigger()
    
    if (isValid) {
      setCompletedSteps(prev => new Set(prev).add(currentStep))
      return true
    }
    return false
  }

  // Navigation handlers
  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex)
    }
  }

  // Form submission
  const handleSubmit = async (data: WizardFormData) => {
    setIsSubmitting(true)
    
    try {
      const iepData: CreateIEPData = {
        ...data,
        accommodations_ar: data.accommodations_ar.filter(item => item.trim() !== ''),
        accommodations_en: data.accommodations_en?.filter(item => item.trim() !== '') || [],
        modifications_ar: data.modifications_ar?.filter(item => item.trim() !== '') || [],
        modifications_en: data.modifications_en?.filter(item => item.trim() !== '') || [],
        state_assessment_accommodations_ar: data.state_assessment_accommodations_ar?.filter(item => item.trim() !== '') || [],
        state_assessment_accommodations_en: data.state_assessment_accommodations_en?.filter(item => item.trim() !== '') || []
      }

      const createdIEP = await createIEPMutation.mutateAsync(iepData)
      onComplete(createdIEP)
    } catch (error) {
      console.error('Failed to create IEP:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentStep + 1) / wizardSteps.length) * 100

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className={cn(
          "text-3xl font-bold",
          isRTL ? "font-arabic" : ""
        )}>
          {language === 'ar' ? 'معالج إنشاء البرنامج التعليمي الفردي' : 'IEP Creation Wizard'}
        </h1>
        <Progress value={progress} className="w-full h-2" />
        <p className="text-sm text-muted-foreground">
          {language === 'ar' 
            ? `الخطوة ${currentStep + 1} من ${wizardSteps.length}`
            : `Step ${currentStep + 1} of ${wizardSteps.length}`
          }
        </p>
      </div>

      {/* Steps Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center space-x-2">
            {wizardSteps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <Button
                  variant={currentStep === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStepClick(index)}
                  disabled={index > currentStep && !completedSteps.has(index)}
                  className={cn(
                    "w-12 h-12 rounded-full p-0",
                    completedSteps.has(index) && currentStep !== index && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {completedSteps.has(index) && currentStep !== index ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </Button>
                <span className={cn(
                  "text-xs text-center max-w-20",
                  isRTL ? "font-arabic" : "",
                  currentStep === index ? "font-semibold" : "text-muted-foreground"
                )}>
                  {language === 'ar' ? step.title_ar : step.title_en}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-3",
                isRTL ? "font-arabic" : ""
              )}>
                {wizardSteps[currentStep].icon}
                {language === 'ar' 
                  ? wizardSteps[currentStep].title_ar 
                  : wizardSteps[currentStep].title_en
                }
              </CardTitle>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? wizardSteps[currentStep].description_ar 
                  : wizardSteps[currentStep].description_en
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step Content Rendering */}
              {currentStep === 0 && <BasicInfoStep form={form} students={students} language={language} />}
              {currentStep === 1 && <PresentLevelsStep form={form} language={language} />}
              {currentStep === 2 && (
                <AccommodationsStep 
                  form={form} 
                  language={language}
                  accommodationsArFields={accommodationsArFields}
                  accommodationsEnFields={accommodationsEnFields}
                  modificationsArFields={modificationsArFields}
                  modificationsEnFields={modificationsEnFields}
                  appendAccommodationAr={appendAccommodationAr}
                  removeAccommodationAr={removeAccommodationAr}
                  appendAccommodationEn={appendAccommodationEn}
                  removeAccommodationEn={removeAccommodationEn}
                  appendModificationAr={appendModificationAr}
                  removeModificationAr={removeModificationAr}
                  appendModificationEn={appendModificationEn}
                  removeModificationEn={removeModificationEn}
                />
              )}
              {currentStep === 3 && (
                <AssessmentStep 
                  form={form} 
                  language={language}
                  stateAssessmentArFields={stateAssessmentArFields}
                  stateAssessmentEnFields={stateAssessmentEnFields}
                  appendStateAssessmentAr={appendStateAssessmentAr}
                  removeStateAssessmentAr={removeStateAssessmentAr}
                  appendStateAssessmentEn={appendStateAssessmentEn}
                  removeStateAssessmentEn={removeStateAssessmentEn}
                />
              )}
              {currentStep === 4 && <LREStep form={form} language={language} />}
              {currentStep === 5 && <ServicesStep form={form} language={language} />}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className={cn(
            "flex justify-between items-center",
            isRTL ? "flex-row-reverse" : ""
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrevious}
              className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}
            >
              {currentStep === 0 ? null : <ChevronLeft className="w-4 h-4" />}
              {currentStep === 0 
                ? (language === 'ar' ? 'إلغاء' : 'Cancel')
                : (language === 'ar' ? 'السابق' : 'Previous')
              }
            </Button>

            {currentStep === wizardSteps.length - 1 ? (
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}
              >
                {isSubmitting ? (
                  language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'
                ) : (
                  language === 'ar' ? 'إنشاء البرنامج التعليمي الفردي' : 'Create IEP'
                )}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleNext}
                className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}
              >
                {language === 'ar' ? 'التالي' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function BasicInfoStep({ form, students, language }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="student_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'الطالب *' : 'Student *'}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {students?.map((student: any) => (
                  <SelectItem key={student.id} value={student.id}>
                    {language === 'ar' 
                      ? `${student.first_name_ar} ${student.last_name_ar}`
                      : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="iep_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'نوع البرنامج *' : 'IEP Type *'}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="initial">
                  {language === 'ar' ? 'برنامج أولي' : 'Initial'}
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
        name="academic_year"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'السنة الدراسية *' : 'Academic Year *'}</FormLabel>
            <FormControl>
              <Input {...field} placeholder="2024-2025" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="effective_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'تاريخ البدء *' : 'Effective Date *'}</FormLabel>
            <FormControl>
              <Input {...field} type="date" />
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
            <FormLabel>{language === 'ar' ? 'تاريخ المراجعة السنوية *' : 'Annual Review Date *'}</FormLabel>
            <FormControl>
              <Input {...field} type="date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="triennial_evaluation_due"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'تاريخ التقييم الثلاثي' : 'Triennial Evaluation Due'}</FormLabel>
            <FormControl>
              <Input {...field} type="date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function PresentLevelsStep({ form, language }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="present_levels_academic_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'المستوى الأكاديمي الحالي (عربي) *' : 'Current Academic Level (Arabic) *'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={8}
                  placeholder={language === 'ar' 
                    ? 'صف الأداء الأكاديمي الحالي للطالب...'
                    : 'Describe student\'s current academic performance...'
                  }
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
              <FormLabel>{language === 'ar' ? 'المستوى الأكاديمي الحالي (إنجليزي)' : 'Current Academic Level (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={8}
                  placeholder={language === 'ar' 
                    ? 'صف الأداء الأكاديمي الحالي للطالب بالإنجليزية...'
                    : 'Describe student\'s current academic performance in English...'
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="present_levels_functional_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'المستوى الوظيفي الحالي (عربي) *' : 'Current Functional Level (Arabic) *'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={8}
                  placeholder={language === 'ar' 
                    ? 'صف الأداء الوظيفي الحالي للطالب...'
                    : 'Describe student\'s current functional performance...'
                  }
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
              <FormLabel>{language === 'ar' ? 'المستوى الوظيفي الحالي (إنجليزي)' : 'Current Functional Level (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={8}
                  placeholder={language === 'ar' 
                    ? 'صف الأداء الوظيفي الحالي للطالب بالإنجليزية...'
                    : 'Describe student\'s current functional performance in English...'
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function AssessmentStep({ form, language, stateAssessmentArFields, stateAssessmentEnFields, appendStateAssessmentAr, removeStateAssessmentAr, appendStateAssessmentEn, removeStateAssessmentEn }: any) {
  return (
    <div className="space-y-8">
      {/* State Assessment Accommodations Arabic */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === 'ar' ? 'تسهيلات اختبارات الدولة (عربي)' : 'State Assessment Accommodations (Arabic)'}
        </h3>
        <div className="space-y-3">
          {stateAssessmentArFields.map((field: any, index: number) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`state_assessment_accommodations_ar.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'أدخل تسهيل الاختبار' : 'Enter assessment accommodation'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeStateAssessmentAr(index)}
                disabled={stateAssessmentArFields.length === 1}
              >
                {language === 'ar' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendStateAssessmentAr('')}
          >
            {language === 'ar' ? 'إضافة تسهيل اختبار' : 'Add Assessment Accommodation'}
          </Button>
        </div>
      </div>

      {/* State Assessment Accommodations English */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === 'ar' ? 'تسهيلات اختبارات الدولة (إنجليزي)' : 'State Assessment Accommodations (English)'}
        </h3>
        <div className="space-y-3">
          {stateAssessmentEnFields.map((field: any, index: number) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`state_assessment_accommodations_en.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'أدخل تسهيل الاختبار بالإنجليزية' : 'Enter assessment accommodation in English'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeStateAssessmentEn(index)}
                disabled={stateAssessmentEnFields.length === 1}
              >
                {language === 'ar' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendStateAssessmentEn('')}
          >
            {language === 'ar' ? 'إضافة تسهيل اختبار' : 'Add Assessment Accommodation'}
          </Button>
        </div>
      </div>

      {/* Alternate Assessment Justification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="alternate_assessment_justification_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'مبرر التقييم البديل (عربي)' : 'Alternate Assessment Justification (Arabic)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح مبرر استخدام التقييم البديل...' : 'Explain justification for alternate assessment...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alternate_assessment_justification_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'مبرر التقييم البديل (إنجليزي)' : 'Alternate Assessment Justification (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح مبرر استخدام التقييم البديل بالإنجليزية...' : 'Explain justification for alternate assessment in English...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function AccommodationsStep({ form, language, accommodationsArFields, accommodationsEnFields, modificationsArFields, modificationsEnFields, appendAccommodationAr, removeAccommodationAr, appendAccommodationEn, removeAccommodationEn, appendModificationAr, removeModificationAr, appendModificationEn, removeModificationEn }: any) {
  return (
    <div className="space-y-8">
      {/* Accommodations Arabic */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === 'ar' ? 'التسهيلات (عربي) *' : 'Accommodations (Arabic) *'}
        </h3>
        <div className="space-y-3">
          {accommodationsArFields.map((field: any, index: number) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`accommodations_ar.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'أدخل التسهيل المطلوب' : 'Enter accommodation'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeAccommodationAr(index)}
                disabled={accommodationsArFields.length === 1}
              >
                {language === 'ar' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendAccommodationAr('')}
          >
            {language === 'ar' ? 'إضافة تسهيل' : 'Add Accommodation'}
          </Button>
        </div>
      </div>

      {/* Accommodations English */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === 'ar' ? 'التسهيلات (إنجليزي)' : 'Accommodations (English)'}
        </h3>
        <div className="space-y-3">
          {accommodationsEnFields.map((field: any, index: number) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`accommodations_en.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'أدخل التسهيل المطلوب بالإنجليزية' : 'Enter accommodation in English'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeAccommodationEn(index)}
                disabled={accommodationsEnFields.length === 1}
              >
                {language === 'ar' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendAccommodationEn('')}
          >
            {language === 'ar' ? 'إضافة تسهيل' : 'Add Accommodation'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LREStep({ form, language }: any) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="mainstreaming_percentage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{language === 'ar' ? 'نسبة الدمج (%) *' : 'Mainstreaming Percentage (%) *'}</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                type="number"
                min="0"
                max="100"
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
            <FormLabel>{language === 'ar' ? 'بيئة التعليم الخاص *' : 'Special Education Setting *'}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="lre_justification_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'مبرر البيئة التعليمية (عربي) *' : 'LRE Justification (Arabic) *'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={6}
                  placeholder={language === 'ar' ? 'اشرح مبرر اختيار هذه البيئة التعليمية...' : 'Explain the justification for this educational environment...'}
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
              <FormLabel>{language === 'ar' ? 'مبرر البيئة التعليمية (إنجليزي)' : 'LRE Justification (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={6}
                  placeholder={language === 'ar' ? 'اشرح مبرر اختيار هذه البيئة التعليمية بالإنجليزية...' : 'Explain the justification for this educational environment in English...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function ServicesStep({ form, language }: any) {
  return (
    <div className="space-y-8">
      {/* Service Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="transition_services_needed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-2"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{language === 'ar' ? 'خدمات الانتقال مطلوبة' : 'Transition Services Needed'}</FormLabel>
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
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-2"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{language === 'ar' ? 'خطة سلوكية مطلوبة' : 'Behavior Plan Needed'}</FormLabel>
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
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-2"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{language === 'ar' ? 'خدمات السنة الممتدة مطلوبة' : 'Extended Year Services Needed'}</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Post-Secondary Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="post_secondary_goals_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'أهداف ما بعد المدرسة (عربي)' : 'Post-Secondary Goals (Arabic)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'أهداف الطالب بعد انتهاء المرحلة الدراسية...' : 'Student goals after completing education...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="post_secondary_goals_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'أهداف ما بعد المدرسة (إنجليزي)' : 'Post-Secondary Goals (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'أهداف الطالب بعد انتهاء المرحلة الدراسية بالإنجليزية...' : 'Student goals after completing education in English...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Behavior Goals (if behavior plan needed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="behavior_goals_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'أهداف سلوكية (عربي)' : 'Behavioral Goals (Arabic)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'أهداف الطالب السلوكية المحددة...' : 'Specific behavioral goals for the student...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="behavior_goals_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'أهداف سلوكية (إنجليزي)' : 'Behavioral Goals (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'أهداف الطالب السلوكية المحددة بالإنجليزية...' : 'Specific behavioral goals for the student in English...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* ESY Justification (if ESY services needed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="esy_justification_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'مبرر خدمات السنة الممتدة (عربي)' : 'ESY Services Justification (Arabic)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح مبرر الحاجة لخدمات السنة الممتدة...' : 'Explain justification for extended year services...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="esy_justification_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === 'ar' ? 'مبرر خدمات السنة الممتدة (إنجليزي)' : 'ESY Services Justification (English)'}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder={language === 'ar' ? 'اشرح مبرر الحاجة لخدمات السنة الممتدة بالإنجليزية...' : 'Explain justification for extended year services in English...'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}