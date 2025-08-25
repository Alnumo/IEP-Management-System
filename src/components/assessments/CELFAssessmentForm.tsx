// CELF-5 Speech Language Assessment Form Component
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
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState, useMemo } from 'react'
import { BarChart3, Brain, MessageCircle, Volume2, BookOpen, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'

// CELF-5 Assessment Schema
const celfSubtestSchema = z.object({
  subtest_name: z.string().min(1, 'Subtest name is required'),
  domain: z.enum(['receptive', 'expressive', 'language_content', 'language_structure', 'language_memory']),
  raw_score: z.number().min(0).max(100),
  scaled_score: z.number().min(1).max(19),
  percentile: z.number().min(0).max(100),
  age_equivalent: z.string().min(1, 'Age equivalent is required'),
  interpretation: z.string().min(1, 'Interpretation is required'),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  error_patterns: z.array(z.object({
    error_type: z.string(),
    frequency: z.number(),
    examples: z.array(z.string()),
    clinical_significance: z.boolean(),
    intervention_targets: z.array(z.string())
  })).optional()
})

const celfIndexScoreSchema = z.object({
  index_name: z.enum(['core_language', 'receptive_language', 'expressive_language', 'language_content', 'language_structure', 'working_memory']),
  standard_score: z.number().min(40).max(160),
  percentile: z.number().min(0).max(100),
  confidence_interval: z.string().min(1, 'Confidence interval is required'),
  classification: z.enum(['very_superior', 'superior', 'high_average', 'average', 'low_average', 'below_average', 'well_below_average']),
  interpretation: z.string().min(1, 'Interpretation is required')
})

const celfObservationalRatingSchema = z.object({
  behavior_category: z.string().min(1, 'Behavior category is required'),
  rating_scale: z.enum(['1', '2', '3', '4', '5']),
  description: z.string().min(1, 'Description is required'),
  clinical_significance: z.boolean().default(false),
  recommendations: z.array(z.string()).optional()
})

const celfPragmaticProfileSchema = z.object({
  total_score: z.number().min(0).max(100),
  percentile: z.number().min(0).max(100),
  interpretation: z.string().min(1, 'Interpretation is required'),
  problem_areas: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  intervention_priorities: z.array(z.string()).optional()
})

const celfAssessmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  assessment_location: z.string().min(1, 'Assessment location is required'),
  chronological_age_months: z.number().min(60).max(252), // 5-21 years
  
  // Core and Supplementary Subtests
  core_subtests: z.array(celfSubtestSchema).min(1, 'At least one core subtest is required'),
  supplementary_subtests: z.array(celfSubtestSchema).optional(),
  
  // Index Scores
  index_scores: z.array(celfIndexScoreSchema).min(1, 'At least one index score is required'),
  
  // Observational and Pragmatic Components
  observational_ratings: z.array(celfObservationalRatingSchema).optional(),
  pragmatic_profile: celfPragmaticProfileSchema.optional(),
  
  // Assessment Conditions
  test_conditions: z.enum(['optimal', 'good', 'fair', 'poor']),
  reliability_factors: z.array(z.string()).optional(),
  validity_concerns: z.array(z.string()).optional(),
  
  // Clinical Summary
  overall_language_level: z.enum(['very_superior', 'superior', 'high_average', 'average', 'low_average', 'below_average', 'well_below_average']),
  primary_deficit_areas: z.array(z.string()).min(1, 'At least one deficit area must be identified'),
  relative_strengths: z.array(z.string()).optional(),
  
  // Recommendations
  intervention_recommendations: z.array(z.string()).min(1, 'At least one recommendation is required'),
  educational_accommodations: z.array(z.string()).optional(),
  follow_up_timeline: z.string().min(1, 'Follow-up timeline is required'),
  
  // Clinical Notes
  behavioral_observations: z.string().optional(),
  test_session_notes: z.string().optional(),
  additional_comments: z.string().optional()
})

export type CELFAssessmentFormData = z.infer<typeof celfAssessmentSchema>

// CELF-5 Subtest Definitions
const CELF5_CORE_SUBTESTS = [
  {
    name: 'Sentence Comprehension',
    domain: 'receptive',
    description: 'Understanding spoken sentences of increasing length and complexity',
    age_range: '5-21',
    max_raw_score: 32
  },
  {
    name: 'Linguistic Concepts',
    domain: 'receptive', 
    description: 'Understanding spatial, temporal, and quantity concepts',
    age_range: '5-8',
    max_raw_score: 22
  },
  {
    name: 'Word Structure',
    domain: 'expressive',
    description: 'Using morphological rules to complete sentences',
    age_range: '5-21',
    max_raw_score: 32
  },
  {
    name: 'Word Classes 2-Expressive',
    domain: 'expressive',
    description: 'Understanding and expressing relationships between related words',
    age_range: '5-21',
    max_raw_score: 40
  },
  {
    name: 'Following Directions',
    domain: 'receptive',
    description: 'Interpreting, remembering, and executing oral commands',
    age_range: '5-21',
    max_raw_score: 28
  },
  {
    name: 'Formulated Sentences',
    domain: 'expressive',
    description: 'Creating grammatically correct sentences using target words',
    age_range: '5-21',
    max_raw_score: 44
  },
  {
    name: 'Recalling Sentences',
    domain: 'language_memory',
    description: 'Repeating sentences of increasing length and complexity',
    age_range: '5-21',
    max_raw_score: 32
  }
]

// const CELF5_SUPPLEMENTARY_SUBTESTS = [
//   {
//     name: 'Word Classes 2-Receptive',
//     domain: 'receptive',
//     description: 'Understanding relationships between related words',
//     age_range: '5-21',
//     max_raw_score: 40
//   },
//   {
//     name: 'Word Classes 2-Total',
//     domain: 'language_content',
//     description: 'Combined receptive and expressive word relationship tasks',
//     age_range: '5-21',
//     max_raw_score: 80
//   },
//   {
//     name: 'Word Definitions',
//     domain: 'expressive',
//     description: 'Defining words with increasing precision and detail',
//     age_range: '9-21',
//     max_raw_score: 25
//   },
//   {
//     name: 'Sentence Assembly',
//     domain: 'expressive',
//     description: 'Formulating grammatically correct sentences from word parts',
//     age_range: '5-15',
//     max_raw_score: 22
//   },
//   {
//     name: 'Semantic Relationships',
//     domain: 'receptive',
//     description: 'Understanding comparative relationships between concepts',
//     age_range: '9-21',
//     max_raw_score: 18
//   }
// ]

const PERFORMANCE_CLASSIFICATIONS = [
  { value: 'very_superior', ar: 'متفوق جداً', en: 'Very Superior', range: '130+', percentile: '98+' },
  { value: 'superior', ar: 'متفوق', en: 'Superior', range: '120-129', percentile: '91-97' },
  { value: 'high_average', ar: 'أعلى من المتوسط', en: 'High Average', range: '110-119', percentile: '75-90' },
  { value: 'average', ar: 'متوسط', en: 'Average', range: '90-109', percentile: '25-74' },
  { value: 'low_average', ar: 'أقل من المتوسط', en: 'Low Average', range: '80-89', percentile: '9-24' },
  { value: 'below_average', ar: 'تحت المتوسط', en: 'Below Average', range: '70-79', percentile: '2-8' },
  { value: 'well_below_average', ar: 'أقل بكثير من المتوسط', en: 'Well Below Average', range: '69 or below', percentile: '1 or below' }
]

const INDEX_SCORE_TYPES = [
  { value: 'core_language', ar: 'اللغة الأساسية', en: 'Core Language' },
  { value: 'receptive_language', ar: 'اللغة الاستقبالية', en: 'Receptive Language' },
  { value: 'expressive_language', ar: 'اللغة التعبيرية', en: 'Expressive Language' },
  { value: 'language_content', ar: 'محتوى اللغة', en: 'Language Content' },
  { value: 'language_structure', ar: 'بنية اللغة', en: 'Language Structure' },
  { value: 'working_memory', ar: 'الذاكرة العاملة', en: 'Working Memory' }
]

const TEST_CONDITIONS = [
  { value: 'optimal', ar: 'مثالية', en: 'Optimal' },
  { value: 'good', ar: 'جيدة', en: 'Good' },
  { value: 'fair', ar: 'مقبولة', en: 'Fair' },
  { value: 'poor', ar: 'ضعيفة', en: 'Poor' }
]

interface CELFAssessmentFormProps {
  initialData?: Partial<CELFAssessmentFormData>
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  assessors?: Array<{ id: string; name_ar: string; name_en?: string }>
  onSubmit: (data: CELFAssessmentFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string
  submitLabel?: React.ReactNode
}

export const CELFAssessmentForm = ({
  initialData,
  students = [],
  // assessors = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel
}: CELFAssessmentFormProps) => {
  const { language, isRTL } = useLanguage()
  const [selectedSubtest, setSelectedSubtest] = useState<string>('Sentence Comprehension')

  const form = useForm<CELFAssessmentFormData>({
    resolver: zodResolver(celfAssessmentSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      assessor_id: initialData?.assessor_id || '',
      assessment_date: initialData?.assessment_date || new Date().toISOString().split('T')[0],
      assessment_location: initialData?.assessment_location || '',
      chronological_age_months: initialData?.chronological_age_months || 60,
      core_subtests: initialData?.core_subtests || [],
      supplementary_subtests: initialData?.supplementary_subtests || [],
      index_scores: initialData?.index_scores || [],
      observational_ratings: initialData?.observational_ratings || [],
      pragmatic_profile: initialData?.pragmatic_profile,
      test_conditions: initialData?.test_conditions || 'optimal',
      reliability_factors: initialData?.reliability_factors || [],
      validity_concerns: initialData?.validity_concerns || [],
      overall_language_level: initialData?.overall_language_level || 'average',
      primary_deficit_areas: initialData?.primary_deficit_areas || [],
      relative_strengths: initialData?.relative_strengths || [],
      intervention_recommendations: initialData?.intervention_recommendations || [],
      educational_accommodations: initialData?.educational_accommodations || [],
      follow_up_timeline: initialData?.follow_up_timeline || '',
      behavioral_observations: initialData?.behavioral_observations || '',
      test_session_notes: initialData?.test_session_notes || '',
      additional_comments: initialData?.additional_comments || ''
    }
  })

  const { append: appendCoreSubtest } = useFieldArray({
    control: form.control,
    name: 'core_subtests'
  })


  const coreSubtests = form.watch('core_subtests')
  const indexScores = form.watch('index_scores')

  // Calculate assessment completeness and performance summary
  const assessmentStats = useMemo(() => {
    const completedSubtests = coreSubtests.filter(s => s.raw_score > 0).length
    const totalSubtests = coreSubtests.length
    const completionPercentage = totalSubtests > 0 ? (completedSubtests / totalSubtests) * 100 : 0
    
    const coreLanguageScore = indexScores.find(s => s.index_name === 'core_language')
    const receptiveScore = indexScores.find(s => s.index_name === 'receptive_language')
    const expressiveScore = indexScores.find(s => s.index_name === 'expressive_language')

    return {
      completedSubtests,
      totalSubtests,
      completionPercentage,
      coreLanguageScore: coreLanguageScore?.standard_score,
      receptiveScore: receptiveScore?.standard_score,
      expressiveScore: expressiveScore?.standard_score,
      averageScore: indexScores.length > 0 ? Math.round(indexScores.reduce((sum, score) => sum + score.standard_score, 0) / indexScores.length) : 0
    }
  }, [coreSubtests, indexScores])

  const handleFormSubmit = async (data: CELFAssessmentFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('❌ CELF-5 assessment submission error:', error)
    }
  }

  const getPerformanceIcon = (classification: string) => {
    switch (classification) {
      case 'very_superior':
      case 'superior':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'high_average':
      case 'average':
        return <BarChart3 className="h-4 w-4 text-blue-600" />
      case 'low_average':
      case 'below_average':
        return <TrendingDown className="h-4 w-4 text-yellow-600" />
      case 'well_below_average':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getScoreClassification = (score: number) => {
    if (score >= 130) return 'very_superior'
    if (score >= 120) return 'superior'
    if (score >= 110) return 'high_average'
    if (score >= 90) return 'average'
    if (score >= 80) return 'low_average'
    if (score >= 70) return 'below_average'
    return 'well_below_average'
  }

  // const calculatePercentile = (standardScore: number) => {
  //   // Simplified percentile calculation for demonstration
  //   const z = (standardScore - 100) / 15
  //   // Math.erf is not available in standard JavaScript, would need external library
  //   return Math.round(50 + 50 * z) // Simplified approximation
  // }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Assessment Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {language === 'ar' ? 'تقييم CELF-5' : 'CELF-5 Assessment'}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'اكتمال التقييم' : 'Assessment Progress'}
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(assessmentStats.completionPercentage)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'متوسط النتائج' : 'Average Score'}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {assessmentStats.averageScore || '--'}
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
                          min="60"
                          max="252"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="test_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'ظروف الاختبار' : 'Test Conditions'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEST_CONDITIONS.map((condition) => (
                            <SelectItem key={condition.value} value={condition.value}>
                              {language === 'ar' ? condition.ar : condition.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'اللغة الأساسية' : 'Core Language'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {assessmentStats.coreLanguageScore || '--'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Volume2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'الاستقبالية' : 'Receptive'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {assessmentStats.receptiveScore || '--'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'التعبيرية' : 'Expressive'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {assessmentStats.expressiveScore || '--'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'المكتملة' : 'Completed'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {assessmentStats.completedSubtests}/{assessmentStats.totalSubtests}
                  </div>
                </div>
              </div>

              <Progress value={assessmentStats.completionPercentage} className="w-full" />
            </CardContent>
          </Card>

          {/* Assessment Content */}
          <Tabs defaultValue="subtests" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="subtests">
                {language === 'ar' ? 'الاختبارات الفرعية' : 'Subtests'}
              </TabsTrigger>
              <TabsTrigger value="scores">
                {language === 'ar' ? 'النتائج المركبة' : 'Index Scores'}
              </TabsTrigger>
              <TabsTrigger value="analysis">
                {language === 'ar' ? 'التحليل' : 'Analysis'}
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                {language === 'ar' ? 'التوصيات' : 'Recommendations'}
              </TabsTrigger>
            </TabsList>

            {/* Subtests Tab */}
            <TabsContent value="subtests">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {language === 'ar' ? 'الاختبارات الفرعية الأساسية' : 'Core Subtests'}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendCoreSubtest({
                        subtest_name: '',
                        domain: 'receptive',
                        raw_score: 0,
                        scaled_score: 10,
                        percentile: 50,
                        age_equivalent: '',
                        interpretation: '',
                        strengths: [],
                        weaknesses: [],
                        error_patterns: []
                      })}
                    >
                      {language === 'ar' ? 'إضافة اختبار فرعي' : 'Add Subtest'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'اختر وأدخل نتائج الاختبارات الفرعية الأساسية لـ CELF-5. كل اختبار له نتيجة خام ونتيجة مدرجة.'
                      : 'Select and enter results for CELF-5 core subtests. Each subtest has a raw score and scaled score.'
                    }
                  </p>

                  {/* Subtest Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CELF5_CORE_SUBTESTS.map((subtest) => (
                      <Card key={subtest.name} className={`cursor-pointer border-2 ${selectedSubtest === subtest.name ? 'border-primary' : 'border-border'}`} onClick={() => setSelectedSubtest(subtest.name)}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            {subtest.domain === 'receptive' ? <Volume2 className="h-4 w-4 mt-1 text-green-600" /> : <MessageCircle className="h-4 w-4 mt-1 text-blue-600" />}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{subtest.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{subtest.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {subtest.age_range}
                                </Badge>
                                <Badge variant={subtest.domain === 'receptive' ? 'default' : 'secondary'} className="text-xs">
                                  {subtest.domain === 'receptive' ? (language === 'ar' ? 'استقبالي' : 'Receptive') : (language === 'ar' ? 'تعبيري' : 'Expressive')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Selected Subtest Scoring */}
                  {selectedSubtest && (
                    <Card className="border-l-4 border-l-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {language === 'ar' ? 'تسجيل النتائج - ' : 'Score Entry - '}{selectedSubtest}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium">
                              {language === 'ar' ? 'النتيجة الخام' : 'Raw Score'}
                            </label>
                            <Input type="number" min="0" max="50" className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              {language === 'ar' ? 'النتيجة المدرجة' : 'Scaled Score'}
                            </label>
                            <Input type="number" min="1" max="19" className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              {language === 'ar' ? 'المئوية' : 'Percentile'}
                            </label>
                            <Input type="number" min="0" max="100" className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              {language === 'ar' ? 'المعادل العمري' : 'Age Equivalent'}
                            </label>
                            <Input placeholder="6;3" className="mt-1" />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="text-sm font-medium">
                            {language === 'ar' ? 'ملاحظات الأداء' : 'Performance Notes'}
                          </label>
                          <Textarea 
                            placeholder={language === 'ar' ? 'ملاحظات حول أداء الطالب في هذا الاختبار...' : 'Notes about student performance on this subtest...'}
                            className="mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Index Scores Tab */}
            <TabsContent value="scores">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {language === 'ar' ? 'النتائج المركبة' : 'Composite Index Scores'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {INDEX_SCORE_TYPES.map((indexType) => {
                    const score = indexScores.find(s => s.index_name === indexType.value)
                    const classification = score ? getScoreClassification(score.standard_score) : 'average'
                    const performanceData = PERFORMANCE_CLASSIFICATIONS.find(p => p.value === classification)
                    
                    return (
                      <Card key={indexType.value} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getPerformanceIcon(classification)}
                                <h4 className="font-medium">
                                  {language === 'ar' ? indexType.ar : indexType.en}
                                </h4>
                                {performanceData && (
                                  <Badge variant={classification.includes('superior') || classification.includes('high') ? 'default' : classification.includes('below') ? 'destructive' : 'secondary'}>
                                    {language === 'ar' ? performanceData.ar : performanceData.en}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    {language === 'ar' ? 'النتيجة المعيارية' : 'Standard Score'}
                                  </div>
                                  <div className="text-2xl font-bold">
                                    {score?.standard_score || '--'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    {language === 'ar' ? 'المئوية' : 'Percentile'}
                                  </div>
                                  <div className="text-2xl font-bold">
                                    {score?.percentile || '--'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    {language === 'ar' ? 'فترة الثقة' : 'Confidence Interval'}
                                  </div>
                                  <div className="text-sm font-medium">
                                    {score?.confidence_interval || '--'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'التحليل السريري' : 'Clinical Analysis'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="overall_language_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المستوى اللغوي العام' : 'Overall Language Level'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERFORMANCE_CLASSIFICATIONS.map((classification) => (
                              <SelectItem key={classification.value} value={classification.value}>
                                {language === 'ar' ? classification.ar : classification.en} ({classification.range})
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
                    name="test_session_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'ملاحظات جلسة الاختبار' : 'Test Session Notes'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'ملاحظات عامة حول جلسة الاختبار...' : 'General notes about the testing session...'}
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

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'التوصيات والمتابعة' : 'Recommendations & Follow-up'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="follow_up_timeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'جدولة المتابعة' : 'Follow-up Timeline'}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={language === 'ar' ? 'مثل: 6 أشهر، سنوياً' : 'e.g., 6 months, annually'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additional_comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'تعليقات إضافية' : 'Additional Comments'}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? 'أي تعليقات أو ملاحظات إضافية...' : 'Any additional comments or observations...'}
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
                : (language === 'ar' ? 'حفظ تقييم CELF-5' : 'Save CELF-5 Assessment')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CELFAssessmentForm