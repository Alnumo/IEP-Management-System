// Goal Tracking Form Component
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
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState } from 'react'
import { X, Plus, Target, TrendingUp, Calendar, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

// Goal Tracking Schema
const goalMeasurementSchema = z.object({
  measurement_type: z.enum(['frequency', 'duration', 'percentage', 'rate', 'level_of_assistance', 'accuracy']),
  baseline_value: z.number().min(0),
  baseline_date: z.string().min(1, 'Baseline date is required'),
  measurement_unit: z.string().min(1, 'Measurement unit is required'),
  measurement_context: z.string().min(1, 'Measurement context is required')
})

const goalCriteriaSchema = z.object({
  target_value: z.number().min(0),
  target_unit: z.string().min(1, 'Target unit is required'),
  success_criteria: z.string().min(1, 'Success criteria is required'),
  consecutive_sessions_required: z.number().min(1).max(20),
  generalization_required: z.boolean().default(false),
  maintenance_period_days: z.number().min(0).max(365)
})

const goalProgressDataSchema = z.object({
  measurement_date: z.string().min(1, 'Measurement date is required'),
  session_id: z.string().optional(),
  measured_value: z.number().min(0),
  measurement_context: z.string().min(1, 'Context is required'),
  notes: z.string().optional(),
  recorded_by: z.string().min(1, 'Recorded by is required'),
  trend_direction: z.enum(['improving', 'maintaining', 'declining'])
})

const goalReviewNoteSchema = z.object({
  review_date: z.string().min(1, 'Review date is required'),
  review_type: z.enum(['weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc']),
  progress_summary: z.string().min(1, 'Progress summary is required'),
  current_performance_level: z.number().min(0).max(100),
  challenges_identified: z.array(z.string()).optional(),
  strategy_modifications: z.array(z.string()).optional(),
  next_steps: z.array(z.string()).optional(),
  reviewed_by: z.string().min(1, 'Reviewed by is required')
})

const goalTrackingSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  therapist_id: z.string().min(1, 'Therapist is required'),
  therapy_type: z.enum(['aba', 'speech', 'occupational', 'physical']),
  
  // Goal Definition
  goal_category: z.string().min(1, 'Goal category is required'),
  goal_description: z.string().min(1, 'Goal description is required'),
  target_behavior: z.string().min(1, 'Target behavior is required'),
  baseline_measurement: goalMeasurementSchema,
  target_criteria: goalCriteriaSchema,
  
  // Goal Details
  priority_level: z.enum(['high', 'medium', 'low']),
  goal_status: z.enum(['active', 'achieved', 'discontinued', 'modified']),
  start_date: z.string().min(1, 'Start date is required'),
  target_date: z.string().min(1, 'Target date is required'),
  actual_achievement_date: z.string().optional(),
  
  // Progress Tracking
  data_collection_method: z.string().min(1, 'Data collection method is required'),
  measurement_frequency: z.string().min(1, 'Measurement frequency is required'),
  progress_data: z.array(goalProgressDataSchema).optional(),
  
  // Support Information
  strategies_interventions: z.array(z.string()).min(1, 'At least one strategy is required'),
  materials_resources: z.array(z.string()).optional(),
  environmental_supports: z.array(z.string()).optional(),
  
  // Review Information
  review_notes: z.array(goalReviewNoteSchema).optional(),
  mastery_criteria_met: z.boolean().default(false),
  generalization_settings: z.array(z.string()).optional(),
  maintenance_plan: z.string().optional()
})

export type GoalTrackingFormData = z.infer<typeof goalTrackingSchema>

// Predefined options
const therapyTypeOptions = [
  { value: 'aba', ar: 'تحليل السلوك التطبيقي', en: 'ABA' },
  { value: 'speech', ar: 'علاج النطق', en: 'Speech Therapy' },
  { value: 'occupational', ar: 'العلاج المهني', en: 'Occupational Therapy' },
  { value: 'physical', ar: 'العلاج الطبيعي', en: 'Physical Therapy' }
]

const priorityLevelOptions = [
  { value: 'high', ar: 'عالي', en: 'High' },
  { value: 'medium', ar: 'متوسط', en: 'Medium' },
  { value: 'low', ar: 'منخفض', en: 'Low' }
]

const goalStatusOptions = [
  { value: 'active', ar: 'نشط', en: 'Active' },
  { value: 'achieved', ar: 'محقق', en: 'Achieved' },
  { value: 'discontinued', ar: 'متوقف', en: 'Discontinued' },
  { value: 'modified', ar: 'معدل', en: 'Modified' }
]

const measurementTypeOptions = [
  { value: 'frequency', ar: 'التكرار', en: 'Frequency' },
  { value: 'duration', ar: 'المدة', en: 'Duration' },
  { value: 'percentage', ar: 'النسبة المئوية', en: 'Percentage' },
  { value: 'rate', ar: 'المعدل', en: 'Rate' },
  { value: 'level_of_assistance', ar: 'مستوى المساعدة', en: 'Level of Assistance' },
  { value: 'accuracy', ar: 'الدقة', en: 'Accuracy' }
]

const reviewTypeOptions = [
  { value: 'weekly', ar: 'أسبوعي', en: 'Weekly' },
  { value: 'monthly', ar: 'شهري', en: 'Monthly' },
  { value: 'quarterly', ar: 'ربع سنوي', en: 'Quarterly' },
  { value: 'annual', ar: 'سنوي', en: 'Annual' },
  { value: 'ad_hoc', ar: 'حسب الحاجة', en: 'Ad Hoc' }
]

const trendDirectionOptions = [
  { value: 'improving', ar: 'يتحسن', en: 'Improving' },
  { value: 'maintaining', ar: 'يحافظ', en: 'Maintaining' },
  { value: 'declining', ar: 'يتراجع', en: 'Declining' }
]

const commonGoalCategories = {
  aba: ['Communication', 'Social Skills', 'Academic Skills', 'Daily Living', 'Behavior Reduction'],
  speech: ['Articulation', 'Language', 'Fluency', 'Voice', 'Communication'],
  occupational: ['Fine Motor', 'Gross Motor', 'Sensory Integration', 'ADL', 'Cognitive'],
  physical: ['Mobility', 'Strength', 'Range of Motion', 'Balance', 'Coordination']
}

const commonStrategies = [
  'Visual supports', 'Task analysis', 'Prompting hierarchy', 'Reinforcement schedule',
  'Environmental modifications', 'Peer modeling', 'Self-monitoring', 'Practice activities'
]

const commonDataCollectionMethods = [
  'Frequency count', 'Duration recording', 'Trial-by-trial data', 'Percentage correct',
  'Task completion checklist', 'Rating scale', 'Anecdotal notes', 'Video analysis'
]

const commonMeasurementFrequencies = [
  'Every session', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As needed'
]

interface GoalTrackingFormProps {
  initialData?: Partial<GoalTrackingFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  therapists?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: GoalTrackingFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
  mode?: 'create' | 'edit' | 'review'
}

export const GoalTrackingForm = ({
  initialData,
  students = [],
  therapists = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel,
  mode = 'create'
}: GoalTrackingFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newStrategy, setNewStrategy] = useState('')
  const [newResource, setNewResource] = useState('')
  const [newSupport, setNewSupport] = useState('')

  const form = useForm<GoalTrackingFormData>({
    resolver: zodResolver(goalTrackingSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      therapist_id: initialData?.therapist_id || '',
      therapy_type: initialData?.therapy_type || 'aba',
      goal_category: initialData?.goal_category || '',
      goal_description: initialData?.goal_description || '',
      target_behavior: initialData?.target_behavior || '',
      baseline_measurement: initialData?.baseline_measurement || {
        measurement_type: 'percentage',
        baseline_value: 0,
        baseline_date: new Date().toISOString().split('T')[0],
        measurement_unit: '%',
        measurement_context: ''
      },
      target_criteria: initialData?.target_criteria || {
        target_value: 80,
        target_unit: '%',
        success_criteria: '',
        consecutive_sessions_required: 3,
        generalization_required: false,
        maintenance_period_days: 30
      },
      priority_level: initialData?.priority_level || 'medium',
      goal_status: initialData?.goal_status || 'active',
      start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
      target_date: initialData?.target_date || '',
      actual_achievement_date: initialData?.actual_achievement_date,
      data_collection_method: initialData?.data_collection_method || '',
      measurement_frequency: initialData?.measurement_frequency || '',
      progress_data: initialData?.progress_data || [],
      strategies_interventions: initialData?.strategies_interventions || [],
      materials_resources: initialData?.materials_resources || [],
      environmental_supports: initialData?.environmental_supports || [],
      review_notes: initialData?.review_notes || [],
      mastery_criteria_met: initialData?.mastery_criteria_met || false,
      generalization_settings: initialData?.generalization_settings || [],
      maintenance_plan: initialData?.maintenance_plan || ''
    }
  })

  const { fields: progressFields, append: appendProgress, remove: removeProgress } = useFieldArray({
    control: form.control,
    name: 'progress_data'
  })

  const { fields: reviewFields, append: appendReview, remove: removeReview } = useFieldArray({
    control: form.control,
    name: 'review_notes'
  })

  const selectedTherapyType = form.watch('therapy_type')
  const goalStatus = form.watch('goal_status')
  const masteryMet = form.watch('mastery_criteria_met')

  const handleFormSubmit = async (data: GoalTrackingFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('❌ Goal tracking form submission error:', error)
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

  const addQuickStrategy = (strategy: string) => {
    const currentStrategies = form.getValues('strategies_interventions') || []
    if (!currentStrategies.includes(strategy)) {
      form.setValue('strategies_interventions', [...currentStrategies, strategy])
    }
  }

  const calculateProgressPercentage = () => {
    const progressData = form.watch('progress_data') || []
    const targetValue = form.watch('target_criteria.target_value')
    const baselineValue = form.watch('baseline_measurement.baseline_value')
    
    if (progressData.length === 0) return 0
    
    const latestProgress = progressData[progressData.length - 1]
    const currentValue = latestProgress?.measured_value || baselineValue
    
    return Math.min(100, Math.max(0, (currentValue / targetValue) * 100))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'active': return <Target className="h-4 w-4 text-blue-500" />
      case 'discontinued': return <X className="h-4 w-4 text-red-500" />
      case 'modified': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const progressPercentage = calculateProgressPercentage()

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Goal Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {language === 'ar' ? 'نظرة عامة على الهدف' : 'Goal Overview'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusIcon(goalStatus)}
                  <Badge variant={goalStatus === 'achieved' ? 'default' : goalStatus === 'active' ? 'secondary' : 'destructive'}>
                    {goalStatusOptions.find(s => s.value === goalStatus)?.[language] || goalStatus}
                  </Badge>
                </div>
              </div>
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
                  name="therapy_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع العلاج' : 'Therapy Type'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapyTypeOptions.map((type) => (
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
                  name="priority_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الأولوية' : 'Priority Level'} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityLevelOptions.map((level) => (
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
              </div>

              {/* Progress Indicator */}
              {mode !== 'create' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>{language === 'ar' ? 'التقدم نحو الهدف' : 'Progress Toward Goal'}</FormLabel>
                    <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goal Definition */}
          <Tabs defaultValue="definition" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="definition">
                {language === 'ar' ? 'تعريف الهدف' : 'Definition'}
              </TabsTrigger>
              <TabsTrigger value="measurement">
                {language === 'ar' ? 'القياس' : 'Measurement'}
              </TabsTrigger>
              <TabsTrigger value="strategies">
                {language === 'ar' ? 'الاستراتيجيات' : 'Strategies'}
              </TabsTrigger>
              <TabsTrigger value="progress">
                {language === 'ar' ? 'التقدم' : 'Progress'}
              </TabsTrigger>
            </TabsList>

            {/* Definition Tab */}
            <TabsContent value="definition">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {language === 'ar' ? 'تعريف الهدف وتفاصيله' : 'Goal Definition & Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="goal_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'فئة الهدف' : 'Goal Category'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر فئة الهدف' : 'Select Goal Category'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(commonGoalCategories[selectedTherapyType as keyof typeof commonGoalCategories] || []).map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
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
                      name="goal_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'حالة الهدف' : 'Goal Status'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {goalStatusOptions.map((status) => (
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

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="target_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'التاريخ المستهدف' : 'Target Date'}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="goal_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'وصف الهدف' : 'Goal Description'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'اكتب وصفاً مفصلاً للهدف...' : 'Write a detailed description of the goal...'}
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
                    name="target_behavior"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'السلوك المستهدف' : 'Target Behavior'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'وصف محدد للسلوك المراد تحقيقه...' : 'Specific description of the behavior to be achieved...'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {goalStatus === 'achieved' && (
                    <FormField
                      control={form.control}
                      name="actual_achievement_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تاريخ التحقيق الفعلي' : 'Actual Achievement Date'}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Measurement Tab */}
            <TabsContent value="measurement">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {language === 'ar' ? 'القياس والمعايير' : 'Measurement & Criteria'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Baseline Measurement */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{language === 'ar' ? 'القياس الأساسي' : 'Baseline Measurement'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="baseline_measurement.measurement_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'نوع القياس' : 'Measurement Type'}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {measurementTypeOptions.map((type) => (
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
                        name="baseline_measurement.baseline_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'القيمة الأساسية' : 'Baseline Value'}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="baseline_measurement.measurement_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'وحدة القياس' : 'Measurement Unit'}</FormLabel>
                            <FormControl>
                              <Input placeholder={language === 'ar' ? 'مثل: %، دقيقة، مرة' : 'e.g., %, minutes, times'} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="baseline_measurement.baseline_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'تاريخ القياس الأساسي' : 'Baseline Date'}</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="baseline_measurement.measurement_context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'سياق القياس' : 'Measurement Context'}</FormLabel>
                            <FormControl>
                              <Input placeholder={language === 'ar' ? 'الظروف أو البيئة' : 'Conditions or environment'} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Target Criteria */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{language === 'ar' ? 'معايير الهدف' : 'Target Criteria'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="target_criteria.target_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'القيمة المستهدفة' : 'Target Value'}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_criteria.target_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'وحدة الهدف' : 'Target Unit'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_criteria.consecutive_sessions_required"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'الجلسات المتتالية المطلوبة' : 'Consecutive Sessions Required'}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="target_criteria.success_criteria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'معايير النجاح' : 'Success Criteria'}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? 'وصف دقيق لمعايير تحقيق الهدف...' : 'Precise description of goal achievement criteria...'}
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
                        name="target_criteria.generalization_required"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>{language === 'ar' ? 'يتطلب تعميم' : 'Generalization Required'}</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_criteria.maintenance_period_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ar' ? 'فترة الصيانة (أيام)' : 'Maintenance Period (days)'}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="365"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Data Collection Method */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="data_collection_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'طريقة جمع البيانات' : 'Data Collection Method'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر طريقة جمع البيانات' : 'Select data collection method'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {commonDataCollectionMethods.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
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
                      name="measurement_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تكرار القياس' : 'Measurement Frequency'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر تكرار القياس' : 'Select measurement frequency'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {commonMeasurementFrequencies.map((freq) => (
                                <SelectItem key={freq} value={freq}>
                                  {freq}
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
            </TabsContent>

            {/* Strategies Tab */}
            <TabsContent value="strategies">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'الاستراتيجيات والدعم' : 'Strategies & Support'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Strategies and Interventions */}
                  <FormField
                    control={form.control}
                    name="strategies_interventions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'الاستراتيجيات والتدخلات' : 'Strategies & Interventions'} *
                        </FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonStrategies.map((strategy) => (
                              <Button
                                key={strategy}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickStrategy(strategy)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {strategy}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل استراتيجية' : 'Enter strategy'}
                              value={newStrategy}
                              onChange={(e) => setNewStrategy(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('strategies_interventions', newStrategy, setNewStrategy)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('strategies_interventions', newStrategy, setNewStrategy)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((strategy, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {strategy}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('strategies_interventions', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Materials and Resources */}
                  <FormField
                    control={form.control}
                    name="materials_resources"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المواد والموارد' : 'Materials & Resources'}</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل مادة أو مورد' : 'Enter material or resource'}
                              value={newResource}
                              onChange={(e) => setNewResource(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('materials_resources', newResource, setNewResource)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('materials_resources', newResource, setNewResource)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((resource, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {resource}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('materials_resources', index)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Environmental Supports */}
                  <FormField
                    control={form.control}
                    name="environmental_supports"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الدعم البيئي' : 'Environmental Supports'}</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل دعم بيئي' : 'Enter environmental support'}
                              value={newSupport}
                              onChange={(e) => setNewSupport(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('environmental_supports', newSupport, setNewSupport)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('environmental_supports', newSupport, setNewSupport)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((support, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {support}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('environmental_supports', index)}
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
                    name="maintenance_plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'خطة الصيانة' : 'Maintenance Plan'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'وصف خطة صيانة المهارة بعد تحقيق الهدف...' : 'Describe plan for maintaining skill after goal achievement...'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {language === 'ar' ? 'تتبع التقدم والمراجعات' : 'Progress Tracking & Reviews'}
                    </CardTitle>
                    <FormField
                      control={form.control}
                      name="mastery_criteria_met"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{language === 'ar' ? 'معايير الإتقان محققة' : 'Mastery Criteria Met'}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {language === 'ar' 
                      ? 'سيتم تتبع بيانات التقدم تلقائياً من جلسات العلاج. يمكنك إضافة مراجعات دورية هنا.'
                      : 'Progress data will be automatically tracked from therapy sessions. You can add periodic reviews here.'
                    }
                  </p>

                  {mode === 'create' && (
                    <div className="text-center py-8 text-muted-foreground">
                      {language === 'ar' 
                        ? 'بيانات التقدم ستظهر هنا بعد إنشاء الهدف وبدء جمع البيانات.'
                        : 'Progress data will appear here after goal creation and data collection begins.'
                      }
                    </div>
                  )}
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
                : (language === 'ar' ? 'حفظ الهدف' : 'Save Goal')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default GoalTrackingForm