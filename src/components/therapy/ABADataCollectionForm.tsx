// ABA Data Collection Form Component
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
import { X, Plus, Target, Clock, TrendingUp, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'

// ABA Data Collection Schema
const abaBehaviorProgramSchema = z.object({
  program_name: z.string().min(1, 'Program name is required'),
  target_skill: z.string().min(1, 'Target skill is required'),
  current_phase: z.string().min(1, 'Current phase is required'),
  trials_run: z.number().min(0),
  correct_responses: z.number().min(0),
  incorrect_responses: z.number().min(0),
  prompted_responses: z.number().min(0),
  independent_responses: z.number().min(0),
  accuracy_percentage: z.number().min(0).max(100),
  notes: z.string().optional()
})

const abaTrialDataSchema = z.object({
  program_id: z.string().min(1),
  trial_number: z.number().min(1),
  stimulus_presented: z.string().min(1),
  response_given: z.string().min(1),
  prompt_level: z.enum(['none', 'gesture', 'verbal', 'model', 'physical']),
  correct: z.boolean(),
  latency_seconds: z.number().min(0).optional(),
  notes: z.string().optional()
})

const abaBehaviorTrackingSchema = z.object({
  behavior_name: z.string().min(1),
  target_type: z.enum(['increase', 'decrease', 'maintain']),
  measurement_type: z.enum(['frequency', 'duration', 'intensity', 'latency']),
  baseline_data: z.number().min(0),
  session_data: z.number().min(0),
  progress_status: z.enum(['improving', 'maintaining', 'regressing']),
  intervention_used: z.string().min(1)
})

const abaBehaviorIncidentSchema = z.object({
  behavior_name: z.string().min(1),
  time_occurred: z.string().min(1),
  duration_minutes: z.number().min(0),
  intensity: z.number().min(1).max(10),
  antecedent: z.string().min(1),
  consequence_applied: z.string().min(1),
  effectiveness_of_intervention: z.number().min(1).max(10)
})

const abaDataCollectionSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  therapist_id: z.string().min(1, 'Therapist is required'),
  session_date: z.string().min(1, 'Session date is required'),
  session_duration_minutes: z.number().min(1).max(480),
  session_location: z.string().min(1, 'Session location is required'),
  session_goals: z.array(z.string()).min(1, 'At least one session goal is required'),
  materials_used: z.array(z.string()).optional(),
  environmental_factors: z.array(z.string()).optional(),
  overall_performance_rating: z.number().min(1).max(10),
  student_engagement_level: z.number().min(1).max(10),
  session_notes: z.string().optional(),
  
  // ABA Specific Fields
  behavior_programs: z.array(abaBehaviorProgramSchema).min(1, 'At least one behavior program is required'),
  trial_data: z.array(abaTrialDataSchema).optional(),
  target_behaviors: z.array(abaBehaviorTrackingSchema).optional(),
  challenging_behaviors: z.array(abaBehaviorIncidentSchema).optional(),
  reinforcement_schedule: z.string().min(1, 'Reinforcement schedule is required'),
  reinforcers_used: z.array(z.string()).min(1, 'At least one reinforcer must be used'),
  reinforcement_effectiveness: z.number().min(1).max(10),
  prompting_levels_used: z.array(z.string()).optional(),
  mastery_criteria_met: z.array(z.string()).optional(),
  programs_to_modify: z.array(z.string()).optional(),
  next_session_targets: z.array(z.string()).optional()
})

export type ABADataFormData = z.infer<typeof abaDataCollectionSchema>

// Predefined options
const promptLevels = [
  { value: 'none', ar: 'لا يوجد', en: 'None' },
  { value: 'gesture', ar: 'إيماءة', en: 'Gesture' },
  { value: 'verbal', ar: 'لفظي', en: 'Verbal' },
  { value: 'model', ar: 'نموذج', en: 'Model' },
  { value: 'physical', ar: 'جسدي', en: 'Physical' }
]

const targetTypes = [
  { value: 'increase', ar: 'زيادة', en: 'Increase' },
  { value: 'decrease', ar: 'تقليل', en: 'Decrease' },
  { value: 'maintain', ar: 'المحافظة', en: 'Maintain' }
]

const measurementTypes = [
  { value: 'frequency', ar: 'تكرار', en: 'Frequency' },
  { value: 'duration', ar: 'مدة', en: 'Duration' },
  { value: 'intensity', ar: 'شدة', en: 'Intensity' },
  { value: 'latency', ar: 'كمون', en: 'Latency' }
]

const progressStatuses = [
  { value: 'improving', ar: 'تحسن', en: 'Improving' },
  { value: 'maintaining', ar: 'ثبات', en: 'Maintaining' },
  { value: 'regressing', ar: 'تراجع', en: 'Regressing' }
]

const reinforcementSchedules = [
  'Continuous Reinforcement (CR)',
  'Fixed Ratio (FR)',
  'Variable Ratio (VR)',
  'Fixed Interval (FI)',
  'Variable Interval (VI)',
  'Differential Reinforcement'
]

const commonReinforcers = [
  'Verbal praise', 'High-five', 'Stickers', 'Token', 'Preferred activity',
  'Food item', 'Toy access', 'Social attention', 'Break time', 'Music'
]

const commonPrograms = [
  'Receptive Language', 'Expressive Language', 'Imitation', 'Play Skills',
  'Social Skills', 'Academic Skills', 'Self-Help Skills', 'Gross Motor',
  'Fine Motor', 'Pre-Academic Skills'
]

interface ABADataCollectionFormProps {
  initialData?: Partial<ABADataFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  therapists?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: ABADataFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const ABADataCollectionForm = ({
  initialData,
  students = [],
  therapists = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: ABADataCollectionFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newGoal, setNewGoal] = useState('')
  const [newMaterial, setNewMaterial] = useState('')
  const [newReinforcer, setNewReinforcer] = useState('')

  const form = useForm<ABADataFormData>({
    resolver: zodResolver(abaDataCollectionSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      therapist_id: initialData?.therapist_id || '',
      session_date: initialData?.session_date || new Date().toISOString().split('T')[0],
      session_duration_minutes: initialData?.session_duration_minutes || 60,
      session_location: initialData?.session_location || '',
      session_goals: initialData?.session_goals || [],
      materials_used: initialData?.materials_used || [],
      environmental_factors: initialData?.environmental_factors || [],
      overall_performance_rating: initialData?.overall_performance_rating || 5,
      student_engagement_level: initialData?.student_engagement_level || 5,
      session_notes: initialData?.session_notes || '',
      behavior_programs: initialData?.behavior_programs || [{
        program_name: '',
        target_skill: '',
        current_phase: '',
        trials_run: 0,
        correct_responses: 0,
        incorrect_responses: 0,
        prompted_responses: 0,
        independent_responses: 0,
        accuracy_percentage: 0,
        notes: ''
      }],
      trial_data: initialData?.trial_data || [],
      target_behaviors: initialData?.target_behaviors || [],
      challenging_behaviors: initialData?.challenging_behaviors || [],
      reinforcement_schedule: initialData?.reinforcement_schedule || '',
      reinforcers_used: initialData?.reinforcers_used || [],
      reinforcement_effectiveness: initialData?.reinforcement_effectiveness || 5,
      prompting_levels_used: initialData?.prompting_levels_used || [],
      mastery_criteria_met: initialData?.mastery_criteria_met || [],
      programs_to_modify: initialData?.programs_to_modify || [],
      next_session_targets: initialData?.next_session_targets || []
    }
  })

  const { fields: programFields, append: appendProgram, remove: removeProgram } = useFieldArray({
    control: form.control,
    name: 'behavior_programs'
  })

  const { fields: trialFields, append: appendTrial, remove: removeTrial } = useFieldArray({
    control: form.control,
    name: 'trial_data'
  })

  const { fields: behaviorFields, append: appendBehavior, remove: removeBehavior } = useFieldArray({
    control: form.control,
    name: 'target_behaviors'
  })

  const { fields: incidentFields, append: appendIncident, remove: removeIncident } = useFieldArray({
    control: form.control,
    name: 'challenging_behaviors'
  })

  const handleFormSubmit = async (data: ABADataFormData) => {
    try {
      // Calculate accuracy percentages for programs
      const updatedPrograms = data.behavior_programs.map(program => ({
        ...program,
        accuracy_percentage: program.trials_run > 0 
          ? Math.round((program.correct_responses / program.trials_run) * 100) 
          : 0
      }))
      
      await onSubmit({
        ...data,
        behavior_programs: updatedPrograms
      })
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

  const addQuickReinforcer = (reinforcer: string) => {
    const currentReinforcers = form.getValues('reinforcers_used') || []
    if (!currentReinforcers.includes(reinforcer)) {
      form.setValue('reinforcers_used', [...currentReinforcers, reinforcer])
    }
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Basic Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {language === 'ar' ? 'معلومات الجلسة الأساسية' : 'Basic Session Information'}
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
                        {language === 'ar' ? 'مدة الجلسة (دقيقة)' : 'Session Duration (minutes)'} *
                      </FormLabel>
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

                <FormField
                  control={form.control}
                  name="session_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مكان الجلسة' : 'Session Location'} *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={language === 'ar' ? 'غرفة العلاج، المنزل، إلخ' : 'Therapy room, home, etc.'} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overall_performance_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تقييم الأداء العام (1-10)' : 'Overall Performance Rating (1-10)'} *
                      </FormLabel>
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

                <FormField
                  control={form.control}
                  name="student_engagement_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى التفاعل (1-10)' : 'Student Engagement Level (1-10)'} *
                      </FormLabel>
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
              </div>

              {/* Session Goals */}
              <FormField
                control={form.control}
                name="session_goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'أهداف الجلسة' : 'Session Goals'} *
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل هدف الجلسة' : 'Enter session goal'}
                          value={newGoal}
                          onChange={(e) => setNewGoal(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addArrayItem('session_goals', newGoal, setNewGoal)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addArrayItem('session_goals', newGoal, setNewGoal)}
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
                              onClick={() => removeArrayItem('session_goals', index)}
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

          {/* ABA Specific Data */}
          <Tabs defaultValue="programs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="programs">
                {language === 'ar' ? 'البرامج السلوكية' : 'Behavior Programs'}
              </TabsTrigger>
              <TabsTrigger value="reinforcement">
                {language === 'ar' ? 'التعزيز' : 'Reinforcement'}
              </TabsTrigger>
              <TabsTrigger value="behaviors">
                {language === 'ar' ? 'السلوكيات المستهدفة' : 'Target Behaviors'}
              </TabsTrigger>
              <TabsTrigger value="incidents">
                {language === 'ar' ? 'السلوكيات التحدية' : 'Challenging Behaviors'}
              </TabsTrigger>
            </TabsList>

            {/* Behavior Programs Tab */}
            <TabsContent value="programs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {language === 'ar' ? 'البرامج السلوكية' : 'Behavior Programs'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {programFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">
                          {language === 'ar' ? `برنامج ${index + 1}` : `Program ${index + 1}`}
                        </CardTitle>
                        {programFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProgram(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`behavior_programs.${index}.program_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'اسم البرنامج' : 'Program Name'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {commonPrograms.map((program) => (
                                      <SelectItem key={program} value={program}>
                                        {program}
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
                            name={`behavior_programs.${index}.target_skill`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المهارة المستهدفة' : 'Target Skill'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`behavior_programs.${index}.current_phase`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المرحلة الحالية' : 'Current Phase'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`behavior_programs.${index}.trials_run`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'عدد المحاولات' : 'Trials Run'}</FormLabel>
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
                            name={`behavior_programs.${index}.correct_responses`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الاستجابات الصحيحة' : 'Correct Responses'}</FormLabel>
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
                            name={`behavior_programs.${index}.incorrect_responses`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الاستجابات الخاطئة' : 'Incorrect Responses'}</FormLabel>
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
                            name={`behavior_programs.${index}.prompted_responses`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الاستجابات بمساعدة' : 'Prompted Responses'}</FormLabel>
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
                            name={`behavior_programs.${index}.independent_responses`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الاستجابات المستقلة' : 'Independent Responses'}</FormLabel>
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
                        </div>

                        <FormField
                          control={form.control}
                          name={`behavior_programs.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{language === 'ar' ? 'ملاحظات' : 'Notes'}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={language === 'ar' ? 'ملاحظات حول أداء البرنامج...' : 'Notes about program performance...'}
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
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendProgram({
                      program_name: '',
                      target_skill: '',
                      current_phase: '',
                      trials_run: 0,
                      correct_responses: 0,
                      incorrect_responses: 0,
                      prompted_responses: 0,
                      independent_responses: 0,
                      accuracy_percentage: 0,
                      notes: ''
                    })}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة برنامج جديد' : 'Add New Program'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reinforcement Tab */}
            <TabsContent value="reinforcement">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {language === 'ar' ? 'بيانات التعزيز' : 'Reinforcement Data'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reinforcement_schedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'جدول التعزيز' : 'Reinforcement Schedule'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {reinforcementSchedules.map((schedule) => (
                                <SelectItem key={schedule} value={schedule}>
                                  {schedule}
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
                      name="reinforcement_effectiveness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'فعالية التعزيز (1-10)' : 'Reinforcement Effectiveness (1-10)'}</FormLabel>
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
                  </div>

                  {/* Reinforcers Used */}
                  <FormField
                    control={form.control}
                    name="reinforcers_used"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المعززات المستخدمة' : 'Reinforcers Used'}</FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {commonReinforcers.map((reinforcer) => (
                              <Button
                                key={reinforcer}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuickReinforcer(reinforcer)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {reinforcer}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={language === 'ar' ? 'أدخل معزز' : 'Enter reinforcer'}
                              value={newReinforcer}
                              onChange={(e) => setNewReinforcer(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addArrayItem('reinforcers_used', newReinforcer, setNewReinforcer)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addArrayItem('reinforcers_used', newReinforcer, setNewReinforcer)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(field.value || []).map((reinforcer, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {reinforcer}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeArrayItem('reinforcers_used', index)}
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
            </TabsContent>

            {/* Target Behaviors Tab */}
            <TabsContent value="behaviors">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {language === 'ar' ? 'السلوكيات المستهدفة' : 'Target Behaviors'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBehavior({
                        behavior_name: '',
                        target_type: 'increase',
                        measurement_type: 'frequency',
                        baseline_data: 0,
                        session_data: 0,
                        progress_status: 'maintaining',
                        intervention_used: ''
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة سلوك' : 'Add Behavior'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {behaviorFields.map((field, index) => (
                    <Card key={field.id} className="border">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `السلوك ${index + 1}` : `Behavior ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBehavior(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`target_behaviors.${index}.behavior_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'اسم السلوك' : 'Behavior Name'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`target_behaviors.${index}.target_type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'نوع الهدف' : 'Target Type'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {targetTypes.map((type) => (
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
                            name={`target_behaviors.${index}.measurement_type`}
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
                                    {measurementTypes.map((type) => (
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
                            name={`target_behaviors.${index}.baseline_data`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'البيانات الأساسية' : 'Baseline Data'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
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
                            name={`target_behaviors.${index}.session_data`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'بيانات الجلسة' : 'Session Data'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
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
                            name={`target_behaviors.${index}.progress_status`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'حالة التقدم' : 'Progress Status'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {progressStatuses.map((status) => (
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

                        <FormField
                          control={form.control}
                          name={`target_behaviors.${index}.intervention_used`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{language === 'ar' ? 'التدخل المستخدم' : 'Intervention Used'}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  
                  {behaviorFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد سلوكيات مستهدفة' : 'No target behaviors added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Challenging Behaviors Tab */}
            <TabsContent value="incidents">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {language === 'ar' ? 'السلوكيات التحدية' : 'Challenging Behaviors'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendIncident({
                        behavior_name: '',
                        time_occurred: '',
                        duration_minutes: 0,
                        intensity: 1,
                        antecedent: '',
                        consequence_applied: '',
                        effectiveness_of_intervention: 1
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة حادثة' : 'Add Incident'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incidentFields.map((field, index) => (
                    <Card key={field.id} className="border border-orange-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `حادثة ${index + 1}` : `Incident ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIncident(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.behavior_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'اسم السلوك' : 'Behavior Name'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.time_occurred`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'وقت الحدوث' : 'Time Occurred'}</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.duration_minutes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المدة (دقيقة)' : 'Duration (minutes)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
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
                            name={`challenging_behaviors.${index}.intensity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الشدة (1-10)' : 'Intensity (1-10)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.effectiveness_of_intervention`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'فعالية التدخل (1-10)' : 'Intervention Effectiveness (1-10)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.antecedent`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'السابق (المثير)' : 'Antecedent'}</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`challenging_behaviors.${index}.consequence_applied`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النتيجة المطبقة' : 'Consequence Applied'}</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {incidentFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد سلوكيات تحدية مسجلة' : 'No challenging behaviors recorded'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Session Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {language === 'ar' ? 'ملاحظات الجلسة والتوصيات' : 'Session Notes & Recommendations'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="session_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'ملاحظات عامة حول الجلسة...' : 'General session notes...'}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                : (language === 'ar' ? 'حفظ بيانات ABA' : 'Save ABA Data')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default ABADataCollectionForm