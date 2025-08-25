// VB-MAPP Assessment Form Component
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
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState, useMemo } from 'react'
import { CheckCircle, Circle, TrendingUp, Users, BookOpen, AlertTriangle, Target, Star } from 'lucide-react'

// VB-MAPP Assessment Schema
const vbmappMilestoneSchema = z.object({
  level: z.enum(['1', '2', '3']),
  domain: z.enum(['mand', 'tact', 'listener', 'visual_perceptual', 'independent_play', 'social', 'motor_imitation', 'echoic', 'spontaneous_vocal', 'listener_responding', 'intraverbal', 'classroom', 'linguistic_structure', 'group', 'reading', 'writing', 'math']),
  milestone_number: z.number().min(1).max(15),
  description: z.string(),
  criteria: z.string(),
  scored: z.boolean().default(false),
  score_date: z.string().optional(),
  notes: z.string().optional()
})

const vbmappBarrierSchema = z.object({
  barrier_type: z.enum(['instructional_control', 'absent_mand', 'impaired_tact', 'impaired_motor_imitation', 'impaired_echoic', 'impaired_matching', 'impaired_listener', 'impaired_intraverbal', 'impaired_social', 'prompt_dependent', 'scrolling', 'impaired_scanning', 'failure_to_generalize', 'weak_conditional_discriminations', 'impaired_verbal_conditional_discriminations']),
  level: z.enum(['1', '2', '3', '4']),
  present: z.boolean().default(false),
  intervention_priority: z.enum(['high', 'medium', 'low']),
  strategies_recommended: z.array(z.string()).optional()
})

const placementRecommendationSchema = z.object({
  current_score: z.number().min(0).max(170),
  recommended_placement: z.enum(['early_intervention', 'special_education_classroom', 'inclusion_with_support', 'typical_classroom', 'vocational_training']),
  rationale: z.string().min(1, 'Rationale is required'),
  support_level: z.enum(['intensive', 'moderate', 'minimal', 'none']),
  specific_recommendations: z.array(z.string()).min(1, 'At least one recommendation is required')
})

const vbmappAssessmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  assessment_location: z.string().min(1, 'Assessment location is required'),
  
  // Milestones Assessment
  milestones: z.array(vbmappMilestoneSchema),
  
  // Barriers Assessment
  barriers: z.array(vbmappBarrierSchema),
  
  // Overall Assessment Information
  chronological_age_months: z.number().min(0).max(240),
  assessment_duration_hours: z.number().min(0.5).max(20),
  assessment_method: z.enum(['direct_testing', 'observation', 'caregiver_interview', 'teacher_interview', 'combination']),
  
  // Results and Recommendations
  placement_recommendation: placementRecommendationSchema,
  intervention_priorities: z.array(z.string()).min(1, 'At least one intervention priority is required'),
  
  // Assessment Notes
  behavioral_observations: z.string().optional(),
  environmental_considerations: z.string().optional(),
  validity_concerns: z.string().optional(),
  additional_notes: z.string().optional()
})

export type VBMAPPAssessmentFormData = z.infer<typeof vbmappAssessmentSchema>

// VB-MAPP Milestone Definitions
const VB_MAPP_MILESTONES = {
  level1: {
    mand: [
      { number: 1, description: "Spontaneously emits 2 different mands without prompts (except 'What do you want?') 5 times per day.", criteria: "Daily frequency count over 1 week" },
      { number: 2, description: "Mands for 20 different missing items without prompts (except 'What do you want?') across 2 days.", criteria: "Direct testing and observation" },
      { number: 3, description: "Mands for 10 different actions needed to continue enjoyable activities without prompts.", criteria: "Direct testing and observation" },
      { number: 4, description: "Mands to remove 5 different aversive items or activities without prompts.", criteria: "Direct testing and observation" },
      { number: 5, description: "Demonstrates 2 different mand functions captured by extinction.", criteria: "Extinction probe testing" }
    ],
    tact: [
      { number: 1, description: "Tacts 2 items without prompts or imitation.", criteria: "Direct testing with 10 trials" },
      { number: 2, description: "Tacts 10 items without prompts or imitation.", criteria: "Direct testing with 2 trials per item" },
      { number: 3, description: "Tacts 25 items without prompts or imitation.", criteria: "Direct testing with 2 trials per item" },
      { number: 4, description: "Tacts 50 items without prompts or imitation.", criteria: "Direct testing with 1 trial per item" },
      { number: 5, description: "Tacts the actions of others or a video 10 times without prompts.", criteria: "Direct testing and observation" }
    ],
    listener: [
      { number: 1, description: "Attends to a speaker's voice by orienting toward the speaker.", criteria: "10 opportunities across 2 days" },
      { number: 2, description: "Looks at or touches a reinforcing item when it is named 10 times.", criteria: "Direct testing with 2 trials per item" },
      { number: 3, description: "Selects the correct item from an array of 10 items 100 times.", criteria: "Direct testing with 2 trials per item" },
      { number: 4, description: "Selects the correct item from an array when asked 'Where is the [item]?' for 25 items.", criteria: "Direct testing with 2 trials per item" },
      { number: 5, description: "Demonstrates listener behavior by following 10 different simple instructions.", criteria: "Direct testing with 2 trials per instruction" }
    ]
    // Additional domains would continue here...
  },
  level2: {
    // Level 2 milestones...
  },
  level3: {
    // Level 3 milestones...
  }
}

// VB-MAPP Barrier Definitions
const VB_MAPP_BARRIERS = [
  {
    type: 'instructional_control',
    levels: [
      { level: 1, description: "The child does not attend to the instructor, does not remain in the designated area, or does not follow simple instructions." },
      { level: 2, description: "The child shows behavioral problems during instruction that interfere with learning." },
      { level: 3, description: "The child requires intensive behavioral intervention to participate in group instruction." },
      { level: 4, description: "The child cannot participate in any form of structured teaching activity." }
    ]
  },
  {
    type: 'absent_mand',
    levels: [
      { level: 1, description: "The child does not mand or mands infrequently." },
      { level: 2, description: "The child mands but only with prompts or in very specific circumstances." },
      { level: 3, description: "The child's manding repertoire is significantly limited compared to peers." },
      { level: 4, description: "The child shows no evidence of manding behavior." }
    ]
  },
  // Additional barriers would continue here...
]

const domainOptions = [
  { value: 'mand', ar: 'الطلب', en: 'Mand' },
  { value: 'tact', ar: 'التسمية', en: 'Tact' },
  { value: 'listener', ar: 'المستمع', en: 'Listener' },
  { value: 'visual_perceptual', ar: 'الإدراك البصري', en: 'Visual Perceptual' },
  { value: 'independent_play', ar: 'اللعب المستقل', en: 'Independent Play' },
  { value: 'social', ar: 'الاجتماعي', en: 'Social' },
  { value: 'motor_imitation', ar: 'التقليد الحركي', en: 'Motor Imitation' },
  { value: 'echoic', ar: 'الترديد', en: 'Echoic' },
  { value: 'spontaneous_vocal', ar: 'الصوت التلقائي', en: 'Spontaneous Vocal' },
  { value: 'listener_responding', ar: 'استجابة المستمع', en: 'Listener Responding' },
  { value: 'intraverbal', ar: 'التفاعل اللفظي', en: 'Intraverbal' },
  { value: 'classroom', ar: 'الفصل الدراسي', en: 'Classroom' },
  { value: 'linguistic_structure', ar: 'البنية اللغوية', en: 'Linguistic Structure' },
  { value: 'group', ar: 'المجموعة', en: 'Group' },
  { value: 'reading', ar: 'القراءة', en: 'Reading' },
  { value: 'writing', ar: 'الكتابة', en: 'Writing' },
  { value: 'math', ar: 'الرياضيات', en: 'Math' }
]

const placementOptions = [
  { value: 'early_intervention', ar: 'التدخل المبكر', en: 'Early Intervention' },
  { value: 'special_education_classroom', ar: 'فصل التربية الخاصة', en: 'Special Education Classroom' },
  { value: 'inclusion_with_support', ar: 'الدمج مع الدعم', en: 'Inclusion with Support' },
  { value: 'typical_classroom', ar: 'الفصل العادي', en: 'Typical Classroom' },
  { value: 'vocational_training', ar: 'التدريب المهني', en: 'Vocational Training' }
]

const supportLevelOptions = [
  { value: 'intensive', ar: 'مكثف', en: 'Intensive' },
  { value: 'moderate', ar: 'متوسط', en: 'Moderate' },
  { value: 'minimal', ar: 'قليل', en: 'Minimal' },
  { value: 'none', ar: 'لا يحتاج', en: 'None' }
]

interface VBMAPPAssessmentFormProps {
  initialData?: Partial<VBMAPPAssessmentFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  assessors?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: VBMAPPAssessmentFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
  mode?: 'assessment' | 'review' | 'report'
}

export const VBMAPPAssessmentForm = ({
  initialData,
  students = [],
  // assessors = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel,
  // mode = 'assessment'
}: VBMAPPAssessmentFormProps) => {
  const { language, isRTL } = useLanguage()
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1)
  const [currentDomain, setCurrentDomain] = useState<string>('mand')

  const form = useForm<VBMAPPAssessmentFormData>({
    resolver: zodResolver(vbmappAssessmentSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      assessor_id: initialData?.assessor_id || '',
      assessment_date: initialData?.assessment_date || new Date().toISOString().split('T')[0],
      assessment_location: initialData?.assessment_location || '',
      milestones: initialData?.milestones || [],
      barriers: initialData?.barriers || [],
      chronological_age_months: initialData?.chronological_age_months || 24,
      assessment_duration_hours: initialData?.assessment_duration_hours || 2,
      assessment_method: initialData?.assessment_method || 'combination',
      placement_recommendation: initialData?.placement_recommendation || {
        current_score: 0,
        recommended_placement: 'early_intervention',
        rationale: '',
        support_level: 'intensive',
        specific_recommendations: []
      },
      intervention_priorities: initialData?.intervention_priorities || [],
      behavioral_observations: initialData?.behavioral_observations || '',
      environmental_considerations: initialData?.environmental_considerations || '',
      validity_concerns: initialData?.validity_concerns || '',
      additional_notes: initialData?.additional_notes || ''
    }
  })

  const milestones = form.watch('milestones')
  const barriers = form.watch('barriers')

  // Calculate progress statistics
  const progressStats = useMemo(() => {
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.scored).length
    const level1Complete = milestones.filter(m => m.level === '1' && m.scored).length
    const level2Complete = milestones.filter(m => m.level === '2' && m.scored).length
    const level3Complete = milestones.filter(m => m.level === '3' && m.scored).length
    const totalBarriers = barriers.filter(b => b.present).length

    return {
      totalMilestones,
      completedMilestones,
      completionPercentage: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      level1Complete,
      level2Complete,
      level3Complete,
      totalBarriers,
      overallScore: completedMilestones
    }
  }, [milestones, barriers])

  const handleFormSubmit = async (data: VBMAPPAssessmentFormData) => {
    try {
      // Update the placement recommendation score based on completed milestones
      const updatedData = {
        ...data,
        placement_recommendation: {
          ...data.placement_recommendation,
          current_score: progressStats.overallScore
        }
      }
      
      await onSubmit(updatedData)
    } catch (error) {
      console.error('❌ VB-MAPP assessment submission error:', error)
    }
  }

  // const generateMilestonesList = (level: 1 | 2 | 3) => {
  //   // This would typically come from a database or configuration file
  //   // For demo purposes, showing a sample structure
  //   return Object.keys(VB_MAPP_MILESTONES.level1).flatMap(domain => 
  //     VB_MAPP_MILESTONES.level1[domain as keyof typeof VB_MAPP_MILESTONES.level1].map(milestone => ({
  //       level: level.toString() as '1' | '2' | '3',
  //       domain: domain as any,
  //       milestone_number: milestone.number,
  //       description: milestone.description,
  //       criteria: milestone.criteria,
  //       scored: false,
  //       score_date: '',
  //       notes: ''
  //     }))
  //   )
  // }

  // const getPlacementRecommendation = (score: number) => {
  //   if (score >= 100) return 'typical_classroom'
  //   if (score >= 75) return 'inclusion_with_support'
  //   if (score >= 50) return 'special_education_classroom'
  //   return 'early_intervention'
  // }

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'mand': return <Target className="h-4 w-4" />
      case 'tact': return <BookOpen className="h-4 w-4" />
      case 'listener': return <Users className="h-4 w-4" />
      case 'social': return <Users className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Assessment Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {language === 'ar' ? 'تقييم VB-MAPP' : 'VB-MAPP Assessment'}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'التقدم الإجمالي' : 'Overall Progress'}
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(progressStats.completionPercentage)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'النتيجة الحالية' : 'Current Score'}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {progressStats.overallScore}/170
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'الطالب' : 'Student'} *</FormLabel>
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
                  name="chronological_age_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'العمر (بالأشهر)' : 'Age (months)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="240"
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
                  name="assessment_duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'مدة التقييم (ساعات)' : 'Duration (hours)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.5"
                          max="20"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progressStats.level1Complete}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المستوى الأول' : 'Level 1'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{progressStats.level2Complete}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المستوى الثاني' : 'Level 2'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{progressStats.level3Complete}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المستوى الثالث' : 'Level 3'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{progressStats.totalBarriers}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الحواجز' : 'Barriers'}
                  </div>
                </div>
              </div>

              <Progress value={progressStats.completionPercentage} className="w-full" />
            </CardContent>
          </Card>

          {/* Assessment Content */}
          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="milestones">
                {language === 'ar' ? 'المعالم' : 'Milestones'}
              </TabsTrigger>
              <TabsTrigger value="barriers">
                {language === 'ar' ? 'الحواجز' : 'Barriers'}
              </TabsTrigger>
              <TabsTrigger value="placement">
                {language === 'ar' ? 'التوصيات' : 'Placement'}
              </TabsTrigger>
              <TabsTrigger value="notes">
                {language === 'ar' ? 'الملاحظات' : 'Notes'}
              </TabsTrigger>
            </TabsList>

            {/* Milestones Tab */}
            <TabsContent value="milestones">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      {language === 'ar' ? 'معالم VB-MAPP' : 'VB-MAPP Milestones'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={currentLevel === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentLevel(1)}
                      >
                        {language === 'ar' ? 'المستوى 1' : 'Level 1'}
                      </Button>
                      <Button
                        type="button"
                        variant={currentLevel === 2 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentLevel(2)}
                      >
                        {language === 'ar' ? 'المستوى 2' : 'Level 2'}
                      </Button>
                      <Button
                        type="button"
                        variant={currentLevel === 3 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentLevel(3)}
                      >
                        {language === 'ar' ? 'المستوى 3' : 'Level 3'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'اختر المعالم المحققة للطالب في كل مجال. كل معلم له معايير محددة للتقييم.'
                        : 'Select achieved milestones for the student in each domain. Each milestone has specific assessment criteria.'
                      }
                    </p>
                    
                    {/* Domain Selection */}
                    <div className="flex flex-wrap gap-2">
                      {domainOptions.map((domain) => (
                        <Button
                          key={domain.value}
                          type="button"
                          variant={currentDomain === domain.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentDomain(domain.value)}
                          className="flex items-center gap-2"
                        >
                          {getDomainIcon(domain.value)}
                          {language === 'ar' ? domain.ar : domain.en}
                        </Button>
                      ))}
                    </div>

                    {/* Sample Milestone Display */}
                    <div className="space-y-3">
                      {VB_MAPP_MILESTONES.level1[currentDomain as keyof typeof VB_MAPP_MILESTONES.level1]?.map((milestone, index) => (
                        <Card key={index} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">
                                    {language === 'ar' ? `المستوى ${currentLevel}` : `Level ${currentLevel}`} - {milestone.number}
                                  </Badge>
                                  <Badge variant="outline">
                                    {language === 'ar' ? domainOptions.find(d => d.value === currentDomain)?.ar : domainOptions.find(d => d.value === currentDomain)?.en}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium mb-2">{milestone.description}</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  <strong>{language === 'ar' ? 'المعايير:' : 'Criteria:'}</strong> {milestone.criteria}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox />
                                <Button variant="ghost" size="sm">
                                  <Circle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) || (
                        <div className="text-center py-8 text-muted-foreground">
                          {language === 'ar' 
                            ? 'لا توجد معالم متاحة لهذا المجال حالياً'
                            : 'No milestones available for this domain currently'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Barriers Tab */}
            <TabsContent value="barriers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {language === 'ar' ? 'حواجز التعلم' : 'Learning Barriers'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'حدد الحواجز التي تمنع أو تعوق تعلم الطالب. كل حاجز له مستويات شدة مختلفة.'
                        : 'Identify barriers that prevent or impede student learning. Each barrier has different severity levels.'
                      }
                    </p>

                    {VB_MAPP_BARRIERS.map((barrier, index) => (
                      <Card key={index} className="border-l-4 border-l-red-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {barrier.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h4>
                            <Checkbox />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {barrier.levels.map((level, levelIndex) => (
                              <div key={levelIndex} className="p-3 bg-gray-50 rounded-md">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={level.level === 4 ? "destructive" : level.level === 3 ? "default" : "secondary"}>
                                    {language === 'ar' ? `المستوى ${level.level}` : `Level ${level.level}`}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{level.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Placement Recommendations Tab */}
            <TabsContent value="placement">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'توصيات التعيين' : 'Placement Recommendations'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="placement_recommendation.recommended_placement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'التعيين الموصى به' : 'Recommended Placement'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {placementOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {language === 'ar' ? option.ar : option.en}
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
                      name="placement_recommendation.support_level"
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
                              {supportLevelOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {language === 'ar' ? option.ar : option.en}
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
                    name="placement_recommendation.rationale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المبررات' : 'Rationale'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'اشرح مبررات هذا التوصية...' : 'Explain the rationale for this recommendation...'}
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
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'ملاحظات التقييم' : 'Assessment Notes'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="behavioral_observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الملاحظات السلوكية' : 'Behavioral Observations'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'ملاحظات حول سلوك الطالب أثناء التقييم...' : 'Observations about student behavior during assessment...'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="environmental_considerations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الاعتبارات البيئية' : 'Environmental Considerations'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'عوامل بيئية مؤثرة على التقييم...' : 'Environmental factors affecting the assessment...'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validity_concerns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'مخاوف الصحة' : 'Validity Concerns'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'أي مخاوف حول صحة نتائج التقييم...' : 'Any concerns about the validity of assessment results...'}
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
                : (language === 'ar' ? 'حفظ تقييم VB-MAPP' : 'Save VB-MAPP Assessment')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default VBMAPPAssessmentForm