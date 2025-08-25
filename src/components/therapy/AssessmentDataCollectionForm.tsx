// Assessment Data Collection Form Component
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState } from 'react'
import { X, Plus, ClipboardList, BarChart3, FileText, Lightbulb, TrendingUp, Users, AlertCircle } from 'lucide-react'

// Assessment Data Collection Schema
const assessmentAreaSchema = z.object({
  area_name: z.string().min(1, 'Area name is required'),
  subdomain: z.string().min(1, 'Subdomain is required'),
  raw_score: z.number().min(0),
  standard_score: z.number().optional(),
  percentile: z.number().min(0).max(100).optional(),
  age_equivalent: z.string().optional(),
  performance_level: z.enum(['below_average', 'low_average', 'average', 'high_average', 'above_average']),
  qualitative_description: z.string().min(1, 'Qualitative description is required')
})

const assessmentScoreSchema = z.object({
  score_type: z.string().min(1, 'Score type is required'),
  score_value: z.number(),
  confidence_interval: z.string().optional(),
  interpretation: z.string().min(1, 'Interpretation is required')
})

const serviceRecommendationSchema = z.object({
  service_type: z.enum(['speech_therapy', 'occupational_therapy', 'physical_therapy', 'aba_therapy', 'other']),
  frequency_per_week: z.number().min(1).max(7),
  session_duration_minutes: z.number().min(15).max(180),
  service_delivery_model: z.enum(['individual', 'group', 'consultation', 'collaborative']),
  setting: z.enum(['clinic', 'school', 'home', 'community']),
  priority_level: z.enum(['high', 'medium', 'low']),
  justification: z.string().min(1, 'Justification is required')
})

const assessmentDataCollectionSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_type: z.enum(['initial', 'progress', 'discharge', 'annual', 'diagnostic']),
  therapy_domain: z.enum(['aba', 'speech', 'occupational', 'physical', 'multi_domain']),
  
  // Assessment Details
  assessment_name: z.string().min(1, 'Assessment name is required'),
  assessment_tool: z.string().min(1, 'Assessment tool is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  assessment_location: z.string().min(1, 'Assessment location is required'),
  assessment_duration_minutes: z.number().min(1).max(480),
  
  // Assessment Areas
  areas_assessed: z.array(assessmentAreaSchema).min(1, 'At least one assessment area is required'),
  
  // Results
  overall_score: z.number().optional(),
  overall_percentile: z.number().min(0).max(100).optional(),
  age_equivalent: z.string().optional(),
  standard_scores: z.array(assessmentScoreSchema).optional(),
  
  // Clinical Observations
  behavioral_observations: z.array(z.string()).optional(),
  environmental_factors: z.array(z.string()).optional(),
  student_cooperation_level: z.number().min(1).max(10),
  validity_concerns: z.array(z.string()).optional(),
  
  // Recommendations
  strengths_identified: z.array(z.string()).min(1, 'At least one strength is required'),
  areas_of_need: z.array(z.string()).min(1, 'At least one area of need is required'),
  recommended_goals: z.array(z.string()).optional(),
  service_recommendations: z.array(serviceRecommendationSchema).optional(),
  
  // Follow-up
  reassessment_timeline: z.string().min(1, 'Reassessment timeline is required'),
  monitoring_plan: z.string().min(1, 'Monitoring plan is required'),
  
  // Documentation
  assessment_report: z.string().min(1, 'Assessment report is required'),
  supporting_documents: z.array(z.string()).optional(),
  parent_input: z.string().optional(),
  teacher_input: z.string().optional()
})

export type AssessmentDataFormData = z.infer<typeof assessmentDataCollectionSchema>

// Predefined options
const assessmentTypeOptions = [
  { value: 'initial', ar: 'أولي', en: 'Initial' },
  { value: 'progress', ar: 'تقدم', en: 'Progress' },
  { value: 'discharge', ar: 'خروج', en: 'Discharge' },
  { value: 'annual', ar: 'سنوي', en: 'Annual' },
  { value: 'diagnostic', ar: 'تشخيصي', en: 'Diagnostic' }
]

const therapyDomainOptions = [
  { value: 'aba', ar: 'تحليل السلوك التطبيقي', en: 'ABA' },
  { value: 'speech', ar: 'علاج النطق', en: 'Speech Therapy' },
  { value: 'occupational', ar: 'العلاج المهني', en: 'Occupational Therapy' },
  { value: 'physical', ar: 'العلاج الطبيعي', en: 'Physical Therapy' },
  { value: 'multi_domain', ar: 'متعدد المجالات', en: 'Multi-Domain' }
]

const performanceLevelOptions = [
  { value: 'below_average', ar: 'أقل من المتوسط', en: 'Below Average' },
  { value: 'low_average', ar: 'متوسط منخفض', en: 'Low Average' },
  { value: 'average', ar: 'متوسط', en: 'Average' },
  { value: 'high_average', ar: 'متوسط عالي', en: 'High Average' },
  { value: 'above_average', ar: 'أعلى من المتوسط', en: 'Above Average' }
]

const serviceTypeOptions = [
  { value: 'speech_therapy', ar: 'علاج النطق', en: 'Speech Therapy' },
  { value: 'occupational_therapy', ar: 'العلاج المهني', en: 'Occupational Therapy' },
  { value: 'physical_therapy', ar: 'العلاج الطبيعي', en: 'Physical Therapy' },
  { value: 'aba_therapy', ar: 'تحليل السلوك التطبيقي', en: 'ABA Therapy' },
  { value: 'other', ar: 'أخرى', en: 'Other' }
]

const serviceDeliveryModelOptions = [
  { value: 'individual', ar: 'فردي', en: 'Individual' },
  { value: 'group', ar: 'جماعي', en: 'Group' },
  { value: 'consultation', ar: 'استشارة', en: 'Consultation' },
  { value: 'collaborative', ar: 'تعاوني', en: 'Collaborative' }
]

const settingOptions = [
  { value: 'clinic', ar: 'العيادة', en: 'Clinic' },
  { value: 'school', ar: 'المدرسة', en: 'School' },
  { value: 'home', ar: 'المنزل', en: 'Home' },
  { value: 'community', ar: 'المجتمع', en: 'Community' }
]

const priorityLevelOptions = [
  { value: 'high', ar: 'عالي', en: 'High' },
  { value: 'medium', ar: 'متوسط', en: 'Medium' },
  { value: 'low', ar: 'منخفض', en: 'Low' }
]

const commonAssessmentAreas = {
  aba: ['Communication', 'Social Skills', 'Academic Skills', 'Daily Living Skills', 'Motor Skills', 'Cognitive Skills'],
  speech: ['Receptive Language', 'Expressive Language', 'Articulation', 'Phonology', 'Fluency', 'Voice', 'Pragmatics'],
  occupational: ['Fine Motor Skills', 'Visual Motor Skills', 'Sensory Processing', 'Activities of Daily Living', 'Cognitive Skills'],
  physical: ['Range of Motion', 'Muscle Strength', 'Balance', 'Coordination', 'Gait', 'Functional Mobility'],
  multi_domain: ['Communication', 'Motor Skills', 'Cognitive Skills', 'Social Skills', 'Behavioral Skills', 'Daily Living Skills']
}

const commonAssessmentTools = {
  aba: ['VB-MAPP', 'ABLLS-R', 'AFLS', 'EFL', 'Vineland-3'],
  speech: ['CELF-5', 'PLS-5', 'GFTA-3', 'EVT-3', 'PPVT-5', 'CASL-2'],
  occupational: ['MVPT-4', 'VMI-6', 'BOT-2', 'SPM-2', 'WeeFIM'],
  physical: ['PDMS-2', 'BOT-2', 'PEDI-CAT', 'WeeFIM', 'GMFM'],
  multi_domain: ['Battelle-3', 'Bayley-4', 'Vineland-3', 'DAYC-2']
}

const commonBehavioralObservations = [
  'Cooperative throughout assessment', 'Required frequent breaks', 'Showed attention difficulties',
  'Demonstrated good effort', 'Appeared anxious', 'Needed encouragement', 'Self-regulated well',
  'Required prompting', 'Showed frustration with difficult tasks', 'Maintained good eye contact'
]

const commonEnvironmentalFactors = [
  'Quiet testing environment', 'Distractions present', 'Familiar setting', 'Novel environment',
  'Optimal lighting', 'Background noise', 'Comfortable temperature', 'Accommodations provided'
]

const commonValidityConcerns = [
  'Limited attention span', 'Language barriers', 'Fatigue observed', 'Non-compliance with instructions',
  'Illness during assessment', 'Testing anxiety', 'Medication effects', 'Cultural factors'
]

interface AssessmentDataCollectionFormProps {
  initialData?: Partial<AssessmentDataFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  assessors?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: AssessmentDataFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const AssessmentDataCollectionForm = ({
  initialData,
  students = [],
  assessors = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: AssessmentDataCollectionFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newObservation, setNewObservation] = useState('')
  const [newStrength, setNewStrength] = useState('')
  const [newNeed, setNewNeed] = useState('')
  const [newGoal, setNewGoal] = useState('')

  const form = useForm<AssessmentDataFormData>({
    resolver: zodResolver(assessmentDataCollectionSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      assessor_id: initialData?.assessor_id || '',
      assessment_type: initialData?.assessment_type || 'initial',
      therapy_domain: initialData?.therapy_domain || 'multi_domain',
      assessment_name: initialData?.assessment_name || '',
      assessment_tool: initialData?.assessment_tool || '',
      assessment_date: initialData?.assessment_date || new Date().toISOString().split('T')[0],
      assessment_location: initialData?.assessment_location || '',
      assessment_duration_minutes: initialData?.assessment_duration_minutes || 120,
      areas_assessed: initialData?.areas_assessed || [],
      overall_score: initialData?.overall_score,
      overall_percentile: initialData?.overall_percentile,
      age_equivalent: initialData?.age_equivalent || '',
      standard_scores: initialData?.standard_scores || [],
      behavioral_observations: initialData?.behavioral_observations || [],
      environmental_factors: initialData?.environmental_factors || [],
      student_cooperation_level: initialData?.student_cooperation_level || 5,
      validity_concerns: initialData?.validity_concerns || [],
      strengths_identified: initialData?.strengths_identified || [],
      areas_of_need: initialData?.areas_of_need || [],
      recommended_goals: initialData?.recommended_goals || [],
      service_recommendations: initialData?.service_recommendations || [],
      reassessment_timeline: initialData?.reassessment_timeline || '',
      monitoring_plan: initialData?.monitoring_plan || '',
      assessment_report: initialData?.assessment_report || '',
      supporting_documents: initialData?.supporting_documents || [],
      parent_input: initialData?.parent_input || '',
      teacher_input: initialData?.teacher_input || ''
    }
  })

  const { fields: areaFields, append: appendArea, remove: removeArea } = useFieldArray({
    control: form.control,
    name: 'areas_assessed'
  })

  const { fields: scoreFields, append: appendScore, remove: removeScore } = useFieldArray({
    control: form.control,
    name: 'standard_scores'
  })

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: 'service_recommendations'
  })

  const selectedTherapyDomain = form.watch('therapy_domain')

  const handleFormSubmit = async (data: AssessmentDataFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('❌ Assessment form submission error:', error)
    }
  }

  const addArrayItem = (fieldName: string, value: string, setValue: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) {
      const currentValue = form.getValues(fieldName as any) || []
      form.setValue(fieldName as any, [...currentValue, value.trim()])
      setValue('')
    }
  }

  const removeArrayItem = (fieldName: string, index: number) => {
    const currentValue = form.getValues(fieldName as any) || []
    form.setValue(fieldName as any, currentValue.filter((_: any, i: number) => i !== index))
  }

  const addQuickObservation = (observation: string) => {
    const currentObservations = form.getValues('behavioral_observations') || []
    if (!currentObservations.includes(observation)) {
      form.setValue('behavioral_observations', [...currentObservations, observation])
    }
  }

  const addQuickEnvironmentalFactor = (factor: string) => {
    const currentFactors = form.getValues('environmental_factors') || []
    if (!currentFactors.includes(factor)) {
      form.setValue('environmental_factors', [...currentFactors, factor])
    }
  }

  const addQuickValidityConcern = (concern: string) => {
    const currentConcerns = form.getValues('validity_concerns') || []
    if (!currentConcerns.includes(concern)) {
      form.setValue('validity_concerns', [...currentConcerns, concern])
    }
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Assessment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {language === 'ar' ? 'معلومات التقييم الأساسية' : 'Assessment Overview'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الطالب' : 'Student'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {language === 'ar' ? student.name_ar : student.name_en || student.name_ar}
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
                  name="assessment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'نوع التقييم' : 'Assessment Type'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assessmentTypeOptions.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {language === 'ar' ? type.ar : type.en}
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
                  name="therapy_domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'مجال العلاج' : 'Therapy Domain'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapyDomainOptions.map((domain) => (
                            <SelectItem key={domain.value} value={domain.value}>
                              {language === 'ar' ? domain.ar : domain.en}
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
                  name="assessment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'تاريخ التقييم' : 'Assessment Date'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'مكان التقييم' : 'Assessment Location'}</FormLabel>
                      <FormControl>
                        <Input placeholder={language === 'ar' ? 'مثل: العيادة، المدرسة' : 'e.g., Clinic, School'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'مدة التقييم (دقيقة)' : 'Duration (minutes)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="480"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessment_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'اسم التقييم' : 'Assessment Name'}</FormLabel>
                      <FormControl>
                        <Input placeholder={language === 'ar' ? 'اسم التقييم الشامل' : 'Comprehensive assessment name'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment_tool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'أداة التقييم' : 'Assessment Tool'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر أداة التقييم' : 'Select assessment tool'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(commonAssessmentTools[selectedTherapyDomain as keyof typeof commonAssessmentTools] || []).map((tool) => (
                            <SelectItem key={tool} value={tool}>
                              {tool}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assessment Content */}
          <Tabs defaultValue="areas" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="areas">
                {language === 'ar' ? 'المجالات' : 'Areas'}
              </TabsTrigger>
              <TabsTrigger value="scores">
                {language === 'ar' ? 'النتائج' : 'Scores'}
              </TabsTrigger>
              <TabsTrigger value="observations">
                {language === 'ar' ? 'الملاحظات' : 'Observations'}
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                {language === 'ar' ? 'التوصيات' : 'Recommendations'}
              </TabsTrigger>
              <TabsTrigger value="report">
                {language === 'ar' ? 'التقرير' : 'Report'}
              </TabsTrigger>
            </TabsList>

            {/* Areas Assessed Tab */}
            <TabsContent value="areas">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {language === 'ar' ? 'المجالات المُقيمة' : 'Areas Assessed'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendArea({
                        area_name: '',
                        subdomain: '',
                        raw_score: 0,
                        standard_score: undefined,
                        percentile: undefined,
                        age_equivalent: '',
                        performance_level: 'average',
                        qualitative_description: ''
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة مجال' : 'Add Area'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {areaFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `مجال التقييم ${index + 1}` : `Assessment Area ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArea(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`areas_assessed.${index}.area_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'اسم المجال' : 'Area Name'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(commonAssessmentAreas[selectedTherapyDomain as keyof typeof commonAssessmentAreas] || []).map((area) => (
                                      <SelectItem key={area} value={area}>
                                        {area}
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
                            name={`areas_assessed.${index}.subdomain`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المجال الفرعي' : 'Subdomain'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`areas_assessed.${index}.performance_level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مستوى الأداء' : 'Performance Level'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {performanceLevelOptions.map((level) => (
                                      <SelectItem key={level.value} value={level.value}>
                                        {language === 'ar' ? level.ar : level.en}
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
                            name={`areas_assessed.${index}.raw_score`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النتيجة الخام' : 'Raw Score'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`areas_assessed.${index}.standard_score`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النتيجة المعيارية' : 'Standard Score'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`areas_assessed.${index}.percentile`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المئوية' : 'Percentile'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`areas_assessed.${index}.qualitative_description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{language === 'ar' ? 'الوصف النوعي' : 'Qualitative Description'}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={language === 'ar' ? 'وصف مفصل للأداء في هذا المجال...' : 'Detailed description of performance in this area...'}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  {areaFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد مجالات تقييم مضافة' : 'No assessment areas added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scores Tab */}
            <TabsContent value="scores">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {language === 'ar' ? 'النتائج الإجمالية' : 'Overall Scores'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="overall_score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="overall_percentile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'المئوية الإجمالية' : 'Overall Percentile'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age_equivalent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'المعادل العمري' : 'Age Equivalent'}</FormLabel>
                          <FormControl>
                            <Input placeholder={language === 'ar' ? 'مثل: 4 سنوات 6 أشهر' : 'e.g., 4 years 6 months'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Observations Tab */}
            <TabsContent value="observations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {language === 'ar' ? 'الملاحظات السريرية' : 'Clinical Observations'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Behavioral Observations */}
                  <FormField
                    control={form.control}
                    name="behavioral_observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الملاحظات السلوكية' : 'Behavioral Observations'}</FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonBehavioralObservations.map((observation) => (
                              <Button
                                key={observation}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickObservation(observation)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {observation}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل ملاحظة سلوكية' : 'Enter behavioral observation'}
                              value={newObservation}
                              onChange={(e) => setNewObservation(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('behavioral_observations', newObservation, setNewObservation)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('behavioral_observations', newObservation, setNewObservation)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((observation, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {observation}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('behavioral_observations', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="student_cooperation_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'مستوى تعاون الطالب (1-10)' : 'Student Cooperation Level (1-10)'}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Strengths */}
                  <FormField
                    control={form.control}
                    name="strengths_identified"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'نقاط القوة المحددة' : 'Strengths Identified'} *</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل نقطة قوة' : 'Enter strength'}
                              value={newStrength}
                              onChange={(e) => setNewStrength(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('strengths_identified', newStrength, setNewStrength)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('strengths_identified', newStrength, setNewStrength)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((strength, index) => (
                              <Badge key={index} variant="default" className="gap-1">
                                {strength}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('strengths_identified', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Areas of Need */}
                  <FormField
                    control={form.control}
                    name="areas_of_need"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'مجالات الحاجة' : 'Areas of Need'} *</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل مجال حاجة' : 'Enter area of need'}
                              value={newNeed}
                              onChange={(e) => setNewNeed(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('areas_of_need', newNeed, setNewNeed)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('areas_of_need', newNeed, setNewNeed)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((need, index) => (
                              <Badge key={index} variant="destructive" className="gap-1">
                                {need}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-white"
                                  onClick={() => removeArrayItem('areas_of_need', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Recommended Goals */}
                  <FormField
                    control={form.control}
                    name="recommended_goals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الأهداف الموصى بها' : 'Recommended Goals'}</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل هدف موصى به' : 'Enter recommended goal'}
                              value={newGoal}
                              onChange={(e) => setNewGoal(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('recommended_goals', newGoal, setNewGoal)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('recommended_goals', newGoal, setNewGoal)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((goal, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {goal}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('recommended_goals', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reassessment_timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'جدولة إعادة التقييم' : 'Reassessment Timeline'}</FormLabel>
                          <FormControl>
                            <Input placeholder={language === 'ar' ? 'مثل: 6 أشهر، سنوياً' : 'e.g., 6 months, annually'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monitoring_plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'خطة المتابعة' : 'Monitoring Plan'}</FormLabel>
                          <FormControl>
                            <Input placeholder={language === 'ar' ? 'خطة مراقبة التقدم' : 'Progress monitoring plan'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Report Tab */}
            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {language === 'ar' ? 'تقرير التقييم' : 'Assessment Report'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assessment_report"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'تقرير التقييم الكامل' : 'Complete Assessment Report'} *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' 
                              ? 'اكتب تقريراً شاملاً عن نتائج التقييم وتفسير النتائج والتوصيات...'
                              : 'Write a comprehensive report of assessment results, interpretation, and recommendations...'
                            }
                            className="min-h-[200px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="parent_input"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'مدخلات الوالدين' : 'Parent Input'}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'ملاحظات ومخاوف الوالدين...' : 'Parent observations and concerns...'}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="teacher_input"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'مدخلات المعلم' : 'Teacher Input'}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'ملاحظات المعلم والأداء الأكاديمي...' : 'Teacher observations and academic performance...'}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {submitLabel || (isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ التقييم' : 'Save Assessment')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default AssessmentDataCollectionForm