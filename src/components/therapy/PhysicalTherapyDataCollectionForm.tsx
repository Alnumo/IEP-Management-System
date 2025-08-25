// Physical Therapy Data Collection Form Component
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
import { X, Plus, Zap, Activity, Target, Heart, Scale, Gauge } from 'lucide-react'

// Physical Therapy Data Collection Schema
const romMeasurementSchema = z.object({
  joint: z.string().min(1, 'Joint is required'),
  movement: z.string().min(1, 'Movement is required'),
  active_rom_degrees: z.number().min(0).max(360),
  passive_rom_degrees: z.number().min(0).max(360),
  pain_during_movement: z.boolean().default(false),
  quality_of_movement: z.number().min(1).max(10),
  limitations_noted: z.string().optional()
})

const strengthAssessmentSchema = z.object({
  muscle_group: z.string().min(1, 'Muscle group is required'),
  manual_muscle_test_grade: z.string().min(1, 'MMT grade is required'),
  repetitions_completed: z.number().min(0),
  endurance_rating: z.number().min(1).max(10),
  compensation_patterns: z.array(z.string()).optional()
})

const balanceActivitySchema = z.object({
  activity_name: z.string().min(1, 'Activity name is required'),
  surface_type: z.string().min(1, 'Surface type is required'),
  support_needed: z.enum(['none', 'minimal', 'moderate', 'maximum']),
  duration_maintained_seconds: z.number().min(0),
  fall_risk_level: z.enum(['low', 'moderate', 'high']),
  strategies_used: z.array(z.string()).optional()
})

const gaitDataSchema = z.object({
  distance_walked_meters: z.number().min(0),
  assistive_device_used: z.string().optional(),
  gait_speed_mps: z.number().min(0),
  step_length_cm: z.number().min(0),
  gait_deviations: z.array(z.string()).optional(),
  endurance_rating: z.number().min(1).max(10),
  safety_concerns: z.array(z.string()).optional()
}).optional()

const therapeuticExerciseSchema = z.object({
  exercise_name: z.string().min(1, 'Exercise name is required'),
  muscle_groups_targeted: z.array(z.string()).min(1, 'At least one muscle group is required'),
  sets_completed: z.number().min(0),
  repetitions_per_set: z.number().min(0),
  resistance_level: z.string().min(1, 'Resistance level is required'),
  form_quality: z.number().min(1).max(10),
  patient_tolerance: z.number().min(1).max(10),
  modifications_made: z.array(z.string()).optional()
})

const painAssessmentSchema = z.object({
  location: z.string().min(1, 'Pain location is required'),
  pain_scale_0_10: z.number().min(0).max(10),
  pain_quality: z.array(z.string()).optional(),
  pain_triggers: z.array(z.string()).optional(),
  relief_methods_effective: z.array(z.string()).optional()
})

const mobilityAssessmentSchema = z.object({
  task: z.string().min(1, 'Task is required'),
  independence_level: z.number().min(1).max(10),
  time_to_complete_seconds: z.number().min(0),
  quality_of_movement: z.number().min(1).max(10),
  safety_level: z.number().min(1).max(10),
  assistive_devices_needed: z.array(z.string()).optional()
})

const physicalTherapyDataCollectionSchema = z.object({
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
  
  // PT Specific Fields
  rom_measurements: z.array(romMeasurementSchema).optional(),
  strength_assessments: z.array(strengthAssessmentSchema).optional(),
  balance_activities: z.array(balanceActivitySchema).optional(),
  gait_data: gaitDataSchema,
  therapeutic_exercises: z.array(therapeuticExerciseSchema).optional(),
  pain_levels: z.array(painAssessmentSchema).optional(),
  mobility_assessments: z.array(mobilityAssessmentSchema).optional(),
  equipment_devices: z.array(z.string()).optional(),
  modifications_made: z.array(z.string()).optional()
})

export type PhysicalTherapyDataFormData = z.infer<typeof physicalTherapyDataCollectionSchema>

// Predefined options
const commonJoints = [
  'Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee', 'Ankle', 
  'Cervical spine', 'Thoracic spine', 'Lumbar spine', 'Fingers', 'Toes'
]

const commonMovements = [
  'Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal rotation',
  'External rotation', 'Dorsiflexion', 'Plantarflexion', 'Inversion', 'Eversion'
]

const muscleGroups = [
  'Deltoids', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Gastrocnemius',
  'Core muscles', 'Hip flexors', 'Glutes', 'Rotator cuff', 'Neck muscles', 'Back extensors'
]

const mmtGrades = [
  { value: '0', label: '0 - No contraction' },
  { value: '1', label: '1 - Trace contraction' },
  { value: '2', label: '2 - Poor ROM without gravity' },
  { value: '3', label: '3 - Fair - Full ROM against gravity' },
  { value: '4', label: '4 - Good - Full ROM against some resistance' },
  { value: '5', label: '5 - Normal - Full ROM against full resistance' }
]

const supportLevelOptions = [
  { value: 'none', ar: 'لا يحتاج', en: 'None' },
  { value: 'minimal', ar: 'مساعدة قليلة', en: 'Minimal' },
  { value: 'moderate', ar: 'مساعدة متوسطة', en: 'Moderate' },
  { value: 'maximum', ar: 'مساعدة كبيرة', en: 'Maximum' }
]

const fallRiskOptions = [
  { value: 'low', ar: 'منخفض', en: 'Low' },
  { value: 'moderate', ar: 'متوسط', en: 'Moderate' },
  { value: 'high', ar: 'عالي', en: 'High' }
]

const commonEquipment = [
  'Walker', 'Crutches', 'Cane', 'Wheelchair', 'Parallel bars', 'Exercise ball',
  'Resistance bands', 'Weights', 'Balance pad', 'Therapy mat', 'Standing frame'
]

const commonPainQualities = [
  'Sharp', 'Dull', 'Aching', 'Burning', 'Stabbing', 'Throbbing',
  'Tingling', 'Numbness', 'Cramping', 'Stiffness'
]

const commonGaitDeviations = [
  'Trendelenburg gait', 'Antalgic gait', 'Steppage gait', 'Scissoring',
  'Circumduction', 'Hip hiking', 'Toe walking', 'Heel strike absence',
  'Reduced push-off', 'Shortened stride length'
]

const surfaceTypes = [
  'Firm surface', 'Soft surface', 'Uneven surface', 'Moving surface',
  'Elevated surface', 'Narrow surface', 'Compliant foam', 'Eyes closed'
]

interface PhysicalTherapyDataCollectionFormProps {
  initialData?: Partial<PhysicalTherapyDataFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  therapists?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: PhysicalTherapyDataFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const PhysicalTherapyDataCollectionForm = ({
  initialData,
  students = [],
  therapists = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: PhysicalTherapyDataCollectionFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newGoal, setNewGoal] = useState('')
  const [newEquipment, setNewEquipment] = useState('')

  const form = useForm<PhysicalTherapyDataFormData>({
    resolver: zodResolver(physicalTherapyDataCollectionSchema),
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
      rom_measurements: initialData?.rom_measurements || [],
      strength_assessments: initialData?.strength_assessments || [],
      balance_activities: initialData?.balance_activities || [],
      gait_data: initialData?.gait_data,
      therapeutic_exercises: initialData?.therapeutic_exercises || [],
      pain_levels: initialData?.pain_levels || [],
      mobility_assessments: initialData?.mobility_assessments || [],
      equipment_devices: initialData?.equipment_devices || [],
      modifications_made: initialData?.modifications_made || []
    }
  })

  const { fields: romFields, append: appendROM, remove: removeROM } = useFieldArray({
    control: form.control,
    name: 'rom_measurements'
  })

  const { fields: strengthFields, append: appendStrength, remove: removeStrength } = useFieldArray({
    control: form.control,
    name: 'strength_assessments'
  })

  const { fields: balanceFields, append: appendBalance, remove: removeBalance } = useFieldArray({
    control: form.control,
    name: 'balance_activities'
  })

  const { fields: exerciseFields, append: appendExercise, remove: removeExercise } = useFieldArray({
    control: form.control,
    name: 'therapeutic_exercises'
  })

  const { fields: painFields, append: appendPain, remove: removePain } = useFieldArray({
    control: form.control,
    name: 'pain_levels'
  })

  const { fields: mobilityFields, append: appendMobility, remove: removeMobility } = useFieldArray({
    control: form.control,
    name: 'mobility_assessments'
  })

  const handleFormSubmit = async (data: PhysicalTherapyDataFormData) => {
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

  const addQuickEquipment = (equipment: string) => {
    const currentEquipment = form.getValues('equipment_devices') || []
    if (!currentEquipment.includes(equipment)) {
      form.setValue('equipment_devices', [...currentEquipment, equipment])
    }
  }

  const addFieldToArray = (fieldName: string, arrayName: string, value: string) => {
    const currentArray = form.getValues(`${fieldName}.${arrayName}` as any) || []
    if (!currentArray.includes(value)) {
      form.setValue(`${fieldName}.${arrayName}` as any, [...currentArray, value])
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
                <Zap className="h-5 w-5" />
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
                  name="overall_performance_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تقييم الأداء العام (1-10)' : 'Overall Performance (1-10)'} *
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
                        {language === 'ar' ? 'مستوى التفاعل (1-10)' : 'Student Engagement (1-10)'} *
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

              {/* Equipment and Devices */}
              <FormField
                control={form.control}
                name="equipment_devices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المعدات والأجهزة المستخدمة' : 'Equipment & Devices Used'}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {commonEquipment.map((equipment) => (
                          <Button
                            key={equipment}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickEquipment(equipment)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {equipment}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل معدة أو جهاز' : 'Enter equipment or device'}
                          value={newEquipment}
                          onChange={(e) => setNewEquipment(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addArrayItem('equipment_devices', newEquipment, setNewEquipment)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addArrayItem('equipment_devices', newEquipment, setNewEquipment)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((equipment, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {equipment}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeArrayItem('equipment_devices', index)}
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

          {/* Physical Therapy Specific Data */}
          <Tabs defaultValue="rom" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="rom">
                {language === 'ar' ? 'نطاق الحركة' : 'ROM'}
              </TabsTrigger>
              <TabsTrigger value="strength">
                {language === 'ar' ? 'القوة' : 'Strength'}
              </TabsTrigger>
              <TabsTrigger value="balance">
                {language === 'ar' ? 'التوازن' : 'Balance'}
              </TabsTrigger>
              <TabsTrigger value="gait">
                {language === 'ar' ? 'المشي' : 'Gait'}
              </TabsTrigger>
              <TabsTrigger value="exercises">
                {language === 'ar' ? 'التمارين' : 'Exercises'}
              </TabsTrigger>
              <TabsTrigger value="pain">
                {language === 'ar' ? 'الألم' : 'Pain'}
              </TabsTrigger>
            </TabsList>

            {/* ROM Tab */}
            <TabsContent value="rom">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {language === 'ar' ? 'قياسات نطاق الحركة' : 'Range of Motion Measurements'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendROM({
                        joint: '',
                        movement: '',
                        active_rom_degrees: 0,
                        passive_rom_degrees: 0,
                        pain_during_movement: false,
                        quality_of_movement: 5,
                        limitations_noted: ''
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة قياس نطاق الحركة' : 'Add ROM Measurement'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {romFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `قياس نطاق الحركة ${index + 1}` : `ROM Measurement ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeROM(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`rom_measurements.${index}.joint`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المفصل' : 'Joint'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {commonJoints.map((joint) => (
                                      <SelectItem key={joint} value={joint}>
                                        {joint}
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
                            name={`rom_measurements.${index}.movement`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الحركة' : 'Movement'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {commonMovements.map((movement) => (
                                      <SelectItem key={movement} value={movement}>
                                        {movement}
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
                            name={`rom_measurements.${index}.quality_of_movement`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'جودة الحركة (1-10)' : 'Movement Quality (1-10)'}</FormLabel>
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
                            name={`rom_measurements.${index}.active_rom_degrees`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النطاق النشط (درجة)' : 'Active ROM (degrees)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="360"
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
                            name={`rom_measurements.${index}.passive_rom_degrees`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النطاق السلبي (درجة)' : 'Passive ROM (degrees)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="360"
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
                            name={`rom_measurements.${index}.pain_during_movement`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{language === 'ar' ? 'ألم أثناء الحركة' : 'Pain During Movement'}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`rom_measurements.${index}.limitations_noted`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{language === 'ar' ? 'القيود المُلاحظة' : 'Limitations Noted'}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={language === 'ar' ? 'وصف أي قيود أو صعوبات...' : 'Describe any limitations or difficulties...'}
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
                  
                  {romFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد قياسات نطاق الحركة' : 'No ROM measurements added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strength Tab */}
            <TabsContent value="strength">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      {language === 'ar' ? 'تقييمات القوة' : 'Strength Assessments'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendStrength({
                        muscle_group: '',
                        manual_muscle_test_grade: '3',
                        repetitions_completed: 0,
                        endurance_rating: 5,
                        compensation_patterns: []
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة تقييم القوة' : 'Add Strength Assessment'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strengthFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `تقييم القوة ${index + 1}` : `Strength Assessment ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStrength(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`strength_assessments.${index}.muscle_group`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مجموعة العضلات' : 'Muscle Group'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {muscleGroups.map((muscle) => (
                                      <SelectItem key={muscle} value={muscle}>
                                        {muscle}
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
                            name={`strength_assessments.${index}.manual_muscle_test_grade`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'درجة اختبار العضلات اليدوي' : 'Manual Muscle Test Grade'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {mmtGrades.map((grade) => (
                                      <SelectItem key={grade.value} value={grade.value}>
                                        {grade.label}
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
                            name={`strength_assessments.${index}.repetitions_completed`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'التكرارات المنجزة' : 'Repetitions Completed'}</FormLabel>
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
                            name={`strength_assessments.${index}.endurance_rating`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'تقييم التحمل (1-10)' : 'Endurance Rating (1-10)'}</FormLabel>
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
                      </CardContent>
                    </Card>
                  ))}
                  
                  {strengthFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد تقييمات قوة' : 'No strength assessments added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs placeholder for brevity */}
            <TabsContent value="balance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {language === 'ar' ? 'أنشطة التوازن' : 'Balance Activities'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'تسجيل أنشطة التوازن والثبات' : 'Record balance and stability activities'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gait">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    {language === 'ar' ? 'بيانات المشي' : 'Gait Data'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="gait_data.distance_walked_meters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'المسافة المشي (متر)' : 'Distance Walked (meters)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
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
                      name="gait_data.gait_speed_mps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'سرعة المشي (متر/ثانية)' : 'Gait Speed (m/s)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
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
                      name="gait_data.endurance_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تقييم التحمل (1-10)' : 'Endurance Rating (1-10)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
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
                    name="gait_data.assistive_device_used"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الجهاز المساعد المستخدم' : 'Assistive Device Used'}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={language === 'ar' ? 'مثل: عكاز، ووكر...' : 'e.g., walker, cane...'}
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

            <TabsContent value="exercises">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    {language === 'ar' ? 'التمارين العلاجية' : 'Therapeutic Exercises'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'تسجيل التمارين العلاجية المنجزة' : 'Record therapeutic exercises completed'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pain">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'تقييم الألم' : 'Pain Assessment'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'تسجيل مستويات الألم وخصائصه' : 'Record pain levels and characteristics'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Session Notes */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="session_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'ملاحظات عامة حول جلسة العلاج الطبيعي...' : 'General notes about physical therapy session...'}
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
                : (language === 'ar' ? 'حفظ بيانات العلاج الطبيعي' : 'Save Physical Therapy Data')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default PhysicalTherapyDataCollectionForm