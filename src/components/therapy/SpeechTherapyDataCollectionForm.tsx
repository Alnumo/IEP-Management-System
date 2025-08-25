// Speech Therapy Data Collection Form Component
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
import { X, Plus, MessageCircle, Volume2, Mic, Users, Activity, BookOpen } from 'lucide-react'

// Speech Therapy Data Collection Schema
const articulationTargetSchema = z.object({
  phoneme: z.string().min(1, 'Phoneme is required'),
  position: z.enum(['initial', 'medial', 'final', 'clusters']),
  word_level: z.enum(['isolation', 'syllable', 'word', 'phrase', 'sentence', 'conversation']),
  trials_attempted: z.number().min(0),
  correct_productions: z.number().min(0),
  cueing_required: z.boolean().default(false),
  accuracy_percentage: z.number().min(0).max(100),
  notes: z.string().optional()
})

const languageTargetSchema = z.object({
  skill_area: z.enum(['vocabulary', 'grammar', 'syntax', 'semantics', 'pragmatics']),
  specific_target: z.string().min(1, 'Specific target is required'),
  complexity_level: z.number().min(1).max(5),
  trials_attempted: z.number().min(0),
  correct_responses: z.number().min(0),
  support_level: z.enum(['independent', 'minimal', 'moderate', 'maximum']),
  generalization_observed: z.boolean().default(false)
})

const fluencyDataSchema = z.object({
  speaking_rate_wpm: z.number().min(0),
  disfluency_count: z.number().min(0),
  disfluency_types: z.array(z.string()).optional(),
  secondary_behaviors: z.array(z.string()).optional(),
  tension_rating: z.number().min(1).max(10),
  avoidance_behaviors: z.array(z.string()).optional()
}).optional()

const voiceDataSchema = z.object({
  vocal_quality: z.array(z.string()).optional(),
  pitch_appropriateness: z.number().min(1).max(10),
  volume_appropriateness: z.number().min(1).max(10),
  resonance_rating: z.number().min(1).max(10),
  breath_support_rating: z.number().min(1).max(10)
}).optional()

const speechTherapyDataCollectionSchema = z.object({
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
  
  // Speech Therapy Specific Fields
  articulation_targets: z.array(articulationTargetSchema).optional(),
  language_targets: z.array(languageTargetSchema).optional(),
  fluency_data: fluencyDataSchema,
  voice_data: voiceDataSchema,
  communication_modalities_used: z.array(z.string()).optional(),
  aac_device_used: z.string().optional(),
  aac_effectiveness: z.number().min(1).max(10).optional(),
  intelligibility_rating: z.number().min(1).max(10),
  communication_attempts: z.number().min(0),
  successful_communications: z.number().min(0),
  home_practice_assigned: z.array(z.string()).optional(),
  parent_training_provided: z.array(z.string()).optional()
})

export type SpeechTherapyDataFormData = z.infer<typeof speechTherapyDataCollectionSchema>

// Predefined options
const phonemeOptions = [
  '/p/', '/b/', '/t/', '/d/', '/k/', '/g/', '/f/', '/v/', '/θ/', '/ð/',
  '/s/', '/z/', '/ʃ/', '/ʒ/', '/tʃ/', '/dʒ/', '/m/', '/n/', '/ŋ/',
  '/l/', '/r/', '/w/', '/j/', '/h/', 'consonant clusters', 'vowels'
]

const positionOptions = [
  { value: 'initial', ar: 'البداية', en: 'Initial' },
  { value: 'medial', ar: 'الوسط', en: 'Medial' },
  { value: 'final', ar: 'النهاية', en: 'Final' },
  { value: 'clusters', ar: 'مجموعات', en: 'Clusters' }
]

const wordLevelOptions = [
  { value: 'isolation', ar: 'منعزل', en: 'Isolation' },
  { value: 'syllable', ar: 'مقطع', en: 'Syllable' },
  { value: 'word', ar: 'كلمة', en: 'Word' },
  { value: 'phrase', ar: 'عبارة', en: 'Phrase' },
  { value: 'sentence', ar: 'جملة', en: 'Sentence' },
  { value: 'conversation', ar: 'محادثة', en: 'Conversation' }
]

const skillAreaOptions = [
  { value: 'vocabulary', ar: 'المفردات', en: 'Vocabulary' },
  { value: 'grammar', ar: 'القواعد', en: 'Grammar' },
  { value: 'syntax', ar: 'التركيب', en: 'Syntax' },
  { value: 'semantics', ar: 'المعنى', en: 'Semantics' },
  { value: 'pragmatics', ar: 'الاستخدام العملي', en: 'Pragmatics' }
]

const supportLevelOptions = [
  { value: 'independent', ar: 'مستقل', en: 'Independent' },
  { value: 'minimal', ar: 'مساعدة قليلة', en: 'Minimal' },
  { value: 'moderate', ar: 'مساعدة متوسطة', en: 'Moderate' },
  { value: 'maximum', ar: 'مساعدة كبيرة', en: 'Maximum' }
]

const communicationModalities = [
  'Verbal speech', 'Sign language', 'Picture cards', 'AAC device', 'Gestures',
  'Written communication', 'Eye gaze', 'Voice output device', 'Communication board'
]

const disfluencyTypes = [
  'Repetitions', 'Prolongations', 'Blocks', 'Interjections', 'Revisions',
  'Phrase repetitions', 'Incomplete phrases', 'Broken words'
]

const secondaryBehaviors = [
  'Eye blinking', 'Head jerking', 'Facial tension', 'Body movement',
  'Lip tremor', 'Jaw tension', 'Throat clearing', 'Breath holding'
]

const vocalQualities = [
  'Breathy', 'Hoarse', 'Harsh', 'Strained', 'Weak', 'Tremulous',
  'Monotone', 'Hypernasality', 'Hyponasality', 'Normal'
]

interface SpeechTherapyDataCollectionFormProps {
  initialData?: Partial<SpeechTherapyDataFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  therapists?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: SpeechTherapyDataFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const SpeechTherapyDataCollectionForm = ({
  initialData,
  students = [],
  therapists = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: SpeechTherapyDataCollectionFormProps) => {
  const { language, isRTL } = useLanguage()
  const [newGoal, setNewGoal] = useState('')
  const [newMaterial, setNewMaterial] = useState('')
  const [newModality, setNewModality] = useState('')
  const [newHomeActivity, setNewHomeActivity] = useState('')

  const form = useForm<SpeechTherapyDataFormData>({
    resolver: zodResolver(speechTherapyDataCollectionSchema),
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
      articulation_targets: initialData?.articulation_targets || [],
      language_targets: initialData?.language_targets || [],
      fluency_data: initialData?.fluency_data,
      voice_data: initialData?.voice_data,
      communication_modalities_used: initialData?.communication_modalities_used || [],
      aac_device_used: initialData?.aac_device_used || '',
      aac_effectiveness: initialData?.aac_effectiveness,
      intelligibility_rating: initialData?.intelligibility_rating || 5,
      communication_attempts: initialData?.communication_attempts || 0,
      successful_communications: initialData?.successful_communications || 0,
      home_practice_assigned: initialData?.home_practice_assigned || [],
      parent_training_provided: initialData?.parent_training_provided || []
    }
  })

  const { fields: articulationFields, append: appendArticulation, remove: removeArticulation } = useFieldArray({
    control: form.control,
    name: 'articulation_targets'
  })

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: 'language_targets'
  })

  const handleFormSubmit = async (data: SpeechTherapyDataFormData) => {
    try {
      // Calculate accuracy percentages for articulation targets
      const updatedArticulationTargets = (data.articulation_targets || []).map(target => ({
        ...target,
        accuracy_percentage: target.trials_attempted > 0 
          ? Math.round((target.correct_productions / target.trials_attempted) * 100) 
          : 0
      }))
      
      await onSubmit({
        ...data,
        articulation_targets: updatedArticulationTargets
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

  const addQuickModality = (modality: string) => {
    const currentModalities = form.getValues('communication_modalities_used') || []
    if (!currentModalities.includes(modality)) {
      form.setValue('communication_modalities_used', [...currentModalities, modality])
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
                <MessageCircle className="h-5 w-5" />
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
                  name="intelligibility_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تقييم الوضوح (1-10)' : 'Intelligibility Rating (1-10)'} *
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
                  name="communication_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'محاولات التواصل' : 'Communication Attempts'}
                      </FormLabel>
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
                  name="successful_communications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'التواصل الناجح' : 'Successful Communications'}
                      </FormLabel>
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

              {/* Communication Modalities */}
              <FormField
                control={form.control}
                name="communication_modalities_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'طرق التواصل المستخدمة' : 'Communication Modalities Used'}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {communicationModalities.map((modality) => (
                          <Button
                            key={modality}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickModality(modality)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {modality}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل طريقة تواصل' : 'Enter communication modality'}
                          value={newModality}
                          onChange={(e) => setNewModality(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addArrayItem('communication_modalities_used', newModality, setNewModality)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addArrayItem('communication_modalities_used', newModality, setNewModality)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((modality, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {modality}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeArrayItem('communication_modalities_used', index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AAC Device */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="aac_device_used"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'جهاز AAC المستخدم' : 'AAC Device Used'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'اسم الجهاز أو التطبيق' : 'Device name or app'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('aac_device_used') && (
                  <FormField
                    control={form.control}
                    name="aac_effectiveness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'فعالية AAC (1-10)' : 'AAC Effectiveness (1-10)'}
                        </FormLabel>
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Speech Therapy Specific Data */}
          <Tabs defaultValue="articulation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="articulation">
                {language === 'ar' ? 'النطق' : 'Articulation'}
              </TabsTrigger>
              <TabsTrigger value="language">
                {language === 'ar' ? 'اللغة' : 'Language'}
              </TabsTrigger>
              <TabsTrigger value="fluency">
                {language === 'ar' ? 'الطلاقة' : 'Fluency'}
              </TabsTrigger>
              <TabsTrigger value="voice">
                {language === 'ar' ? 'الصوت' : 'Voice'}
              </TabsTrigger>
            </TabsList>

            {/* Articulation Tab */}
            <TabsContent value="articulation">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5" />
                      {language === 'ar' ? 'أهداف النطق' : 'Articulation Targets'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendArticulation({
                        phoneme: '',
                        position: 'initial',
                        word_level: 'word',
                        trials_attempted: 0,
                        correct_productions: 0,
                        cueing_required: false,
                        accuracy_percentage: 0,
                        notes: ''
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة هدف نطق' : 'Add Articulation Target'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {articulationFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `هدف النطق ${index + 1}` : `Articulation Target ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArticulation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`articulation_targets.${index}.phoneme`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الصوت' : 'Phoneme'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {phonemeOptions.map((phoneme) => (
                                      <SelectItem key={phoneme} value={phoneme}>
                                        {phoneme}
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
                            name={`articulation_targets.${index}.position`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الموقع' : 'Position'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {positionOptions.map((position) => (
                                      <SelectItem key={position.value} value={position.value}>
                                        {language === 'ar' ? position.ar : position.en}
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
                            name={`articulation_targets.${index}.word_level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مستوى الكلمة' : 'Word Level'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {wordLevelOptions.map((level) => (
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
                            name={`articulation_targets.${index}.trials_attempted`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المحاولات' : 'Trials Attempted'}</FormLabel>
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
                            name={`articulation_targets.${index}.correct_productions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'النطق الصحيح' : 'Correct Productions'}</FormLabel>
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
                            name={`articulation_targets.${index}.cueing_required`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{language === 'ar' ? 'يحتاج إشارات' : 'Cueing Required'}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`articulation_targets.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{language === 'ar' ? 'ملاحظات' : 'Notes'}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={language === 'ar' ? 'ملاحظات حول أداء النطق...' : 'Notes about articulation performance...'}
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
                  
                  {articulationFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أهداف نطق' : 'No articulation targets added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {language === 'ar' ? 'أهداف اللغة' : 'Language Targets'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendLanguage({
                        skill_area: 'vocabulary',
                        specific_target: '',
                        complexity_level: 1,
                        trials_attempted: 0,
                        correct_responses: 0,
                        support_level: 'moderate',
                        generalization_observed: false
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة هدف لغوي' : 'Add Language Target'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {languageFields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">
                          {language === 'ar' ? `هدف اللغة ${index + 1}` : `Language Target ${index + 1}`}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLanguage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`language_targets.${index}.skill_area`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مجال المهارة' : 'Skill Area'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {skillAreaOptions.map((area) => (
                                      <SelectItem key={area.value} value={area.value}>
                                        {language === 'ar' ? area.ar : area.en}
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
                            name={`language_targets.${index}.specific_target`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'الهدف المحدد' : 'Specific Target'}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`language_targets.${index}.complexity_level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مستوى التعقيد (1-5)' : 'Complexity Level (1-5)'}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="5"
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
                            name={`language_targets.${index}.trials_attempted`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'المحاولات' : 'Trials Attempted'}</FormLabel>
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
                            name={`language_targets.${index}.correct_responses`}
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
                            name={`language_targets.${index}.support_level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === 'ar' ? 'مستوى الدعم' : 'Support Level'}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {supportLevelOptions.map((level) => (
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

                        <FormField
                          control={form.control}
                          name={`language_targets.${index}.generalization_observed`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>{language === 'ar' ? 'لوحظ تعميم' : 'Generalization Observed'}</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  
                  {languageFields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أهداف لغوية' : 'No language targets added'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fluency Tab */}
            <TabsContent value="fluency">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {language === 'ar' ? 'بيانات الطلاقة' : 'Fluency Data'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="fluency_data.speaking_rate_wpm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'معدل الكلام (كلمة/دقيقة)' : 'Speaking Rate (WPM)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
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
                      name="fluency_data.disfluency_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'عدد التعثر' : 'Disfluency Count'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
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
                      name="fluency_data.tension_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تقييم التوتر (1-10)' : 'Tension Rating (1-10)'}</FormLabel>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Tab */}
            <TabsContent value="voice">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    {language === 'ar' ? 'بيانات الصوت' : 'Voice Data'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="voice_data.pitch_appropriateness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'مناسبة النغمة (1-10)' : 'Pitch Appropriateness (1-10)'}</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="voice_data.volume_appropriateness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'مناسبة الصوت (1-10)' : 'Volume Appropriateness (1-10)'}</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="voice_data.resonance_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تقييم الرنين (1-10)' : 'Resonance Rating (1-10)'}</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="voice_data.breath_support_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'تقييم دعم التنفس (1-10)' : 'Breath Support Rating (1-10)'}</FormLabel>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Home Program */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {language === 'ar' ? 'البرنامج المنزلي وتدريب الوالدين' : 'Home Program & Parent Training'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="home_practice_assigned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'الممارسة المنزلية المكلفة' : 'Home Practice Assigned'}</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={language === 'ar' ? 'أدخل نشاط منزلي' : 'Enter home activity'}
                          value={newHomeActivity}
                          onChange={(e) => setNewHomeActivity(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addArrayItem('home_practice_assigned', newHomeActivity, setNewHomeActivity)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addArrayItem('home_practice_assigned', newHomeActivity, setNewHomeActivity)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((activity, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {activity}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeArrayItem('home_practice_assigned', index)}
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
                name="session_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'ملاحظات عامة حول جلسة علاج الكلام...' : 'General notes about speech therapy session...'}
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
                : (language === 'ar' ? 'حفظ بيانات علاج الكلام' : 'Save Speech Therapy Data')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default SpeechTherapyDataCollectionForm