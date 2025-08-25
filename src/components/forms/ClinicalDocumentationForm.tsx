// Clinical Documentation Form Component
import { useForm } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState } from 'react'
import { X, Plus, FileText, User, Target, Calendar, AlertTriangle } from 'lucide-react'
import type { ClinicalDocumentation, Student } from '@/types'

// Validation Schema
const clinicalDocumentationSchema = z.object({
  // Basic Information
  student_id: z.string().min(1, 'Student is required'),
  medical_consultant_id: z.string().optional(),
  documentation_type: z.enum(['soap_note', 'progress_note', 'assessment_note', 'consultation_note', 'incident_report', 'medical_review', 'discharge_summary']),
  
  // Session Details
  session_date: z.string().min(1, 'Session date is required'),
  session_duration_minutes: z.number().min(1).max(300).optional(),
  session_location_ar: z.string().optional(),
  session_location_en: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  
  // SOAP Structure
  subjective_ar: z.string().optional(),
  subjective_en: z.string().optional(),
  parent_report_ar: z.string().optional(),
  parent_report_en: z.string().optional(),
  patient_mood_ar: z.string().optional(),
  patient_mood_en: z.string().optional(),
  recent_events_ar: z.string().optional(),
  recent_events_en: z.string().optional(),
  
  objective_ar: z.string().optional(),
  objective_en: z.string().optional(),
  observed_behaviors: z.array(z.string()).optional(),
  physical_observations_ar: z.string().optional(),
  physical_observations_en: z.string().optional(),
  
  assessment_ar: z.string().min(1, 'Assessment is required'),
  assessment_en: z.string().optional(),
  clinical_impression_ar: z.string().optional(),
  clinical_impression_en: z.string().optional(),
  progress_toward_goals_ar: z.string().optional(),
  progress_toward_goals_en: z.string().optional(),
  concerns_identified: z.array(z.string()).optional(),
  risk_factors: z.array(z.string()).optional(),
  
  plan_ar: z.string().min(1, 'Plan is required'),
  plan_en: z.string().optional(),
  next_session_focus_ar: z.string().optional(),
  next_session_focus_en: z.string().optional(),
  home_program_ar: z.string().optional(),
  home_program_en: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  referrals_needed: z.array(z.string()).optional(),
  
  // Interventions and Progress
  interventions_used: z.array(z.string()).optional(),
  materials_utilized: z.array(z.string()).optional(),
  modifications_made_ar: z.string().optional(),
  modifications_made_en: z.string().optional(),
  goal_achievement_percentage: z.number().min(0).max(100).optional(),
  session_effectiveness_rating: z.number().min(1).max(10).optional(),
  
  // Medical Considerations
  medical_observations_ar: z.string().optional(),
  medical_observations_en: z.string().optional(),
  medication_effects_noted_ar: z.string().optional(),
  medication_effects_noted_en: z.string().optional(),
  side_effects_observed: z.array(z.string()).optional(),
  contraindications_noted: z.array(z.string()).optional(),
  
  // Follow-up
  follow_up_needed: z.boolean().default(false),
  follow_up_timeframe: z.string().optional(),
  follow_up_type: z.string().optional(),
  urgency_level: z.enum(['routine', 'urgent', 'immediate', 'scheduled']).default('routine'),
  
  // Quality and Review
  requires_medical_review: z.boolean().default(false),
  status: z.enum(['draft', 'pending_review', 'reviewed', 'approved', 'finalized']).default('draft')
})

export type ClinicalDocumentationFormData = z.infer<typeof clinicalDocumentationSchema>

// Predefined options
const documentationTypes = [
  { value: 'soap_note', ar: 'ملاحظة SOAP', en: 'SOAP Note' },
  { value: 'progress_note', ar: 'ملاحظة تقدم', en: 'Progress Note' },
  { value: 'assessment_note', ar: 'ملاحظة تقييم', en: 'Assessment Note' },
  { value: 'consultation_note', ar: 'ملاحظة استشارة', en: 'Consultation Note' },
  { value: 'incident_report', ar: 'تقرير حادث', en: 'Incident Report' },
  { value: 'medical_review', ar: 'مراجعة طبية', en: 'Medical Review' },
  { value: 'discharge_summary', ar: 'ملخص خروج', en: 'Discharge Summary' }
]

const urgencyLevels = [
  { value: 'routine', ar: 'روتيني', en: 'Routine' },
  { value: 'urgent', ar: 'عاجل', en: 'Urgent' },
  { value: 'immediate', ar: 'فوري', en: 'Immediate' },
  { value: 'scheduled', ar: 'مجدول', en: 'Scheduled' }
]

const statusOptions = [
  { value: 'draft', ar: 'مسودة', en: 'Draft' },
  { value: 'pending_review', ar: 'في انتظار المراجعة', en: 'Pending Review' },
  { value: 'reviewed', ar: 'تم المراجعة', en: 'Reviewed' },
  { value: 'approved', ar: 'معتمد', en: 'Approved' },
  { value: 'finalized', ar: 'نهائي', en: 'Finalized' }
]

const commonBehaviors = [
  'Eye contact', 'Attention to task', 'Following instructions', 'Social interaction',
  'Communication attempts', 'Self-regulation', 'Motor coordination', 'Sensory responses'
]

const commonInterventions = [
  'ABA techniques', 'Speech therapy', 'Occupational therapy', 'Sensory integration',
  'Social stories', 'Visual supports', 'Behavioral modification', 'Communication devices'
]

const commonConcerns = [
  'Regression noted', 'Behavioral challenges', 'Communication difficulties', 'Social withdrawal',
  'Sensory issues', 'Motor skill delays', 'Attention problems', 'Safety concerns'
]

interface ClinicalDocumentationFormProps {
  initialData?: Partial<ClinicalDocumentation>
  students?: Student[]
  onSubmit: (data: ClinicalDocumentationFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const ClinicalDocumentationForm = ({
  initialData,
  students = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: ClinicalDocumentationFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newBehavior, setNewBehavior] = useState('')
  const [newIntervention, setNewIntervention] = useState('')
  const [newConcern, setNewConcern] = useState('')
  const [newRecommendation, setNewRecommendation] = useState('')

  const form = useForm<ClinicalDocumentationFormData>({
    resolver: zodResolver(clinicalDocumentationSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      medical_consultant_id: initialData?.medical_consultant_id || '',
      documentation_type: initialData?.documentation_type || 'soap_note',
      session_date: initialData?.session_date || new Date().toISOString().split('T')[0],
      session_duration_minutes: initialData?.session_duration_minutes || 60,
      session_location_ar: initialData?.session_location_ar || '',
      session_location_en: initialData?.session_location_en || '',
      attendees: initialData?.attendees || [],
      subjective_ar: initialData?.subjective_ar || '',
      subjective_en: initialData?.subjective_en || '',
      parent_report_ar: initialData?.parent_report_ar || '',
      parent_report_en: initialData?.parent_report_en || '',
      patient_mood_ar: initialData?.patient_mood_ar || '',
      patient_mood_en: initialData?.patient_mood_en || '',
      recent_events_ar: initialData?.recent_events_ar || '',
      recent_events_en: initialData?.recent_events_en || '',
      objective_ar: initialData?.objective_ar || '',
      objective_en: initialData?.objective_en || '',
      observed_behaviors: initialData?.observed_behaviors || [],
      physical_observations_ar: initialData?.physical_observations_ar || '',
      physical_observations_en: initialData?.physical_observations_en || '',
      assessment_ar: initialData?.assessment_ar || '',
      assessment_en: initialData?.assessment_en || '',
      clinical_impression_ar: initialData?.clinical_impression_ar || '',
      clinical_impression_en: initialData?.clinical_impression_en || '',
      progress_toward_goals_ar: initialData?.progress_toward_goals_ar || '',
      progress_toward_goals_en: initialData?.progress_toward_goals_en || '',
      concerns_identified: initialData?.concerns_identified || [],
      risk_factors: initialData?.risk_factors || [],
      plan_ar: initialData?.plan_ar || '',
      plan_en: initialData?.plan_en || '',
      next_session_focus_ar: initialData?.next_session_focus_ar || '',
      next_session_focus_en: initialData?.next_session_focus_en || '',
      home_program_ar: initialData?.home_program_ar || '',
      home_program_en: initialData?.home_program_en || '',
      recommendations: initialData?.recommendations || [],
      referrals_needed: initialData?.referrals_needed || [],
      interventions_used: initialData?.interventions_used || [],
      materials_utilized: initialData?.materials_utilized || [],
      modifications_made_ar: initialData?.modifications_made_ar || '',
      modifications_made_en: initialData?.modifications_made_en || '',
      goal_achievement_percentage: initialData?.goal_achievement_percentage || undefined,
      session_effectiveness_rating: initialData?.session_effectiveness_rating || undefined,
      medical_observations_ar: initialData?.medical_observations_ar || '',
      medical_observations_en: initialData?.medical_observations_en || '',
      medication_effects_noted_ar: initialData?.medication_effects_noted_ar || '',
      medication_effects_noted_en: initialData?.medication_effects_noted_en || '',
      side_effects_observed: initialData?.side_effects_observed || [],
      contraindications_noted: initialData?.contraindications_noted || [],
      follow_up_needed: initialData?.follow_up_needed || false,
      follow_up_timeframe: initialData?.follow_up_timeframe || '',
      follow_up_type: initialData?.follow_up_type || '',
      urgency_level: initialData?.urgency_level || 'routine',
      requires_medical_review: initialData?.requires_medical_review || false,
      status: initialData?.status || 'draft'
    }
  })

  const handleFormSubmit = async (data: ClinicalDocumentationFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('❌ Form submission error:', error)
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

  const addQuickBehavior = (behavior: string) => {
    const currentBehaviors = form.getValues('observed_behaviors') || []
    if (!currentBehaviors.includes(behavior)) {
      form.setValue('observed_behaviors', [...currentBehaviors, behavior])
    }
  }

  const addQuickIntervention = (intervention: string) => {
    const currentInterventions = form.getValues('interventions_used') || []
    if (!currentInterventions.includes(intervention)) {
      form.setValue('interventions_used', [...currentInterventions, intervention])
    }
  }

  const addQuickConcern = (concern: string) => {
    const currentConcerns = form.getValues('concerns_identified') || []
    if (!currentConcerns.includes(concern)) {
      form.setValue('concerns_identified', [...currentConcerns, concern])
    }
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              {language === 'ar' 
                                ? `${student.first_name_ar} ${student.last_name_ar}`
                                : student.first_name_en && student.last_name_en 
                                  ? `${student.first_name_en} ${student.last_name_en}`
                                  : `${student.first_name_ar} ${student.last_name_ar}`
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
                  name="documentation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع التوثيق' : 'Documentation Type'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentationTypes.map((type) => (
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
                  name="session_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ الجلسة' : 'Session Date'} *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="session_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مدة الجلسة (دقيقة)' : 'Session Duration (minutes)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="300"
                          placeholder="60"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SOAP Notes Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {language === 'ar' ? 'توثيق SOAP' : 'SOAP Documentation'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="subjective" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="subjective">
                    {language === 'ar' ? 'ذاتي (S)' : 'Subjective (S)'}
                  </TabsTrigger>
                  <TabsTrigger value="objective">
                    {language === 'ar' ? 'موضوعي (O)' : 'Objective (O)'}
                  </TabsTrigger>
                  <TabsTrigger value="assessment">
                    {language === 'ar' ? 'تقييم (A)' : 'Assessment (A)'}
                  </TabsTrigger>
                  <TabsTrigger value="plan">
                    {language === 'ar' ? 'خطة (P)' : 'Plan (P)'}
                  </TabsTrigger>
                </TabsList>

                {/* Subjective Tab */}
                <TabsContent value="subjective" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subjective_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التقرير الذاتي (عربي)' : 'Subjective Report (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'ما يقوله المريض أو الوالدين...' : 'What patient/parents report...'}
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subjective_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التقرير الذاتي (إنجليزي)' : 'Subjective Report (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What patient/parents report..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parent_report_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تقرير الوالدين (عربي)' : 'Parent Report (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'ملاحظات الوالدين منذ الجلسة الأخيرة...' : 'Parent observations since last session...'}
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patient_mood_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مزاج المريض' : 'Patient Mood'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={language === 'ar' ? 'مزاج المريض اليوم...' : 'Patient mood today...'}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Objective Tab */}
                <TabsContent value="objective" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="objective_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الملاحظات الموضوعية (عربي)' : 'Objective Observations (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'الملاحظات المباشرة والقياسات...' : 'Direct observations and measurements...'}
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="objective_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الملاحظات الموضوعية (إنجليزي)' : 'Objective Observations (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Direct observations and measurements..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Observed Behaviors */}
                  <FormField
                    control={form.control}
                    name="observed_behaviors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'السلوكيات المرصودة' : 'Observed Behaviors'}
                        </FormLabel>
                        <div className="space-y-2">
                          {/* Quick add buttons */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonBehaviors.map((behavior) => (
                              <Button
                                key={behavior}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickBehavior(behavior)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {behavior}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل سلوك مرصود' : 'Enter observed behavior'}
                              value={newBehavior}
                              onChange={(e) => setNewBehavior(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('observed_behaviors', newBehavior, setNewBehavior)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('observed_behaviors', newBehavior, setNewBehavior)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((behavior, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {behavior}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('observed_behaviors', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Assessment Tab */}
                <TabsContent value="assessment" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="assessment_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التقييم (عربي)' : 'Assessment (Arabic)'} *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'التحليل الإكلينيكي والتقييم المهني...' : 'Clinical analysis and professional assessment...'}
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assessment_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التقييم (إنجليزي)' : 'Assessment (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Clinical analysis and professional assessment..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="progress_toward_goals_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'التقدم نحو الأهداف' : 'Progress Toward Goals'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'تقييم التقدم نحو الأهداف المحددة...' : 'Assessment of progress toward established goals...'}
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="goal_achievement_percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'نسبة تحقيق الأهداف (%)' : 'Goal Achievement Percentage (%)'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="75"
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
                        name="session_effectiveness_rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'تقييم فعالية الجلسة (1-10)' : 'Session Effectiveness Rating (1-10)'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="8"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Concerns Identified */}
                  <FormField
                    control={form.control}
                    name="concerns_identified"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'المخاوف المحددة' : 'Concerns Identified'}
                        </FormLabel>
                        <div className="space-y-2">
                          {/* Quick add buttons */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonConcerns.map((concern) => (
                              <Button
                                key={concern}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickConcern(concern)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {concern}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل مخاوف محددة' : 'Enter identified concern'}
                              value={newConcern}
                              onChange={(e) => setNewConcern(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('concerns_identified', newConcern, setNewConcern)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('concerns_identified', newConcern, setNewConcern)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((concern, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {concern}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('concerns_identified', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Plan Tab */}
                <TabsContent value="plan" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plan_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الخطة (عربي)' : 'Plan (Arabic)'} *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'خطة العلاج والتدخلات المقترحة...' : 'Treatment plan and proposed interventions...'}
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الخطة (إنجليزي)' : 'Plan (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Treatment plan and proposed interventions..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_session_focus_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تركيز الجلسة القادمة' : 'Next Session Focus'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'ما سيكون تركيز الجلسة القادمة...' : 'What will be the focus of next session...'}
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="home_program_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'البرنامج المنزلي' : 'Home Program'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'الأنشطة والتمارين للمنزل...' : 'Activities and exercises for home...'}
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Recommendations */}
                  <FormField
                    control={form.control}
                    name="recommendations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                        </FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل توصية' : 'Enter recommendation'}
                              value={newRecommendation}
                              onChange={(e) => setNewRecommendation(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('recommendations', newRecommendation, setNewRecommendation)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('recommendations', newRecommendation, setNewRecommendation)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((recommendation, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {recommendation}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('recommendations', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Interventions and Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {language === 'ar' ? 'التدخلات والتقدم' : 'Interventions & Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="interventions_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'التدخلات المستخدمة' : 'Interventions Used'}
                    </FormLabel>
                    <div className="space-y-2">
                      {/* Quick add buttons */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {commonInterventions.map((intervention) => (
                          <Button
                            key={intervention}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickIntervention(intervention)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {intervention}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل تدخل مستخدم' : 'Enter intervention used'}
                          value={newIntervention}
                          onChange={(e) => setNewIntervention(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addArrayItem('interventions_used', newIntervention, setNewIntervention)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addArrayItem('interventions_used', newIntervention, setNewIntervention)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((intervention, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {intervention}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeArrayItem('interventions_used', index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Follow-up and Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'المتابعة والحالة' : 'Follow-up & Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="follow_up_needed"
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
                          {language === 'ar' ? 'يحتاج متابعة' : 'Follow-up Needed'}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requires_medical_review"
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
                          {language === 'ar' ? 'يحتاج مراجعة طبية' : 'Requires Medical Review'}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الأولوية' : 'Urgency Level'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {urgencyLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div className="flex items-center gap-2">
                                {level.value === 'immediate' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                {level.value === 'urgent' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                {language === 'ar' ? level.ar : level.en}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="follow_up_timeframe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'إطار زمني للمتابعة' : 'Follow-up Timeframe'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'خلال أسبوع، شهر، إلخ' : 'Within a week, month, etc'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'حالة التوثيق' : 'Documentation Status'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {language === 'ar' ? status.ar : status.en}
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
                : (language === 'ar' ? 'حفظ التوثيق الإكلينيكي' : 'Save Clinical Documentation')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default ClinicalDocumentationForm