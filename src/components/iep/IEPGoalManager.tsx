/**
 * IEP Goal Management Component
 * Dynamic goal creation with progress tracking visualization
 * IDEA 2024 Compliant - SMART Goals Implementation
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  Target, 
  Calendar, 
  BarChart3,
  CheckCircle,
  Circle,
  AlertCircle,
  Pause,
  Play,
  Edit,
  Save,
  X
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEPGoals, useCreateIEPGoal, useUpdateIEPGoalProgress } from '@/hooks/useIEPs'
import type { 
  IEPGoal, 
  CreateIEPGoalData, 
  GoalDomain, 
  MeasurementMethod, 
  EvaluationFrequency,
  ProgressStatus,
  GoalStatus,
  IEPProgressData
} from '@/types/iep'
import { cn } from '@/lib/utils'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const goalObjectiveSchema = z.object({
  objective_statement_ar: z.string().min(10, 'بيان الهدف يجب أن يكون 10 أحرف على الأقل'),
  objective_statement_en: z.string().optional().or(z.literal('')),
  mastery_criteria: z.string().min(3, 'معايير الإتقان مطلوبة'),
  target_date: z.string().min(1, 'التاريخ المستهدف مطلوب'),
  is_mastered: z.boolean().default(false)
})

const goalFormSchema = z.object({
  domain: z.enum([
    'academic_reading', 'academic_writing', 'academic_math', 'academic_science',
    'communication_expressive', 'communication_receptive', 'communication_social',
    'behavioral_social', 'behavioral_attention', 'behavioral_self_regulation',
    'functional_daily_living', 'functional_mobility', 'functional_self_care',
    'motor_fine', 'motor_gross', 'vocational', 'transition'
  ] as const),
  goal_statement_ar: z.string().min(20, 'بيان الهدف يجب أن يكون 20 حرف على الأقل'),
  goal_statement_en: z.string().optional().or(z.literal('')),
  baseline_performance_ar: z.string().min(10, 'وصف الأداء الأساسي مطلوب'),
  baseline_performance_en: z.string().optional().or(z.literal('')),
  measurement_method: z.enum([
    'frequency', 'percentage', 'duration', 'trials', 'observation', 
    'checklist', 'rating_scale', 'portfolio', 'other'
  ] as const),
  measurement_criteria: z.string().min(5, 'معايير القياس مطلوبة'),
  evaluation_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly'] as const),
  evaluation_method_ar: z.string().min(5, 'طريقة التقييم مطلوبة'),
  evaluation_method_en: z.string().optional().or(z.literal('')),
  mastery_criteria_ar: z.string().min(10, 'معايير الإتقان يجب أن تكون 10 أحرف على الأقل'),
  mastery_criteria_en: z.string().optional().or(z.literal('')),
  target_completion_date: z.string().min(1, 'تاريخ الإنجاز المستهدف مطلوب'),
  responsible_provider: z.string().optional().or(z.literal('')),
  service_location: z.string().optional().or(z.literal('')),
  objectives: z.array(goalObjectiveSchema).min(1, 'يجب وجود هدف فرعي واحد على الأقل')
}).refine((data) => {
  // SMART Goal Validation: Target date must be in the future and within reasonable timeframe
  const targetDate = new Date(data.target_completion_date)
  const now = new Date()
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  
  return targetDate > now && targetDate <= oneYearFromNow
}, {
  message: 'تاريخ الإنجاز يجب أن يكون في المستقبل وخلال سنة واحدة',
  path: ['target_completion_date']
})

type GoalFormData = z.infer<typeof goalFormSchema>

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface IEPGoalManagerProps {
  iepId: string
  mode?: 'view' | 'edit'
  onGoalUpdate?: (goals: IEPGoal[]) => void
}

interface GoalProgressProps {
  goal: IEPGoal
  showDetails?: boolean
}

// =============================================================================
// PROGRESS VISUALIZATION COMPONENT
// =============================================================================

const GoalProgressVisualizer = ({ goal, showDetails = false }: GoalProgressProps) => {
  const { language } = useLanguage()
  
  const getStatusColor = (status: ProgressStatus) => {
    switch (status) {
      case 'mastered': return 'text-green-600'
      case 'progressing': return 'text-blue-600'
      case 'introduced': return 'text-yellow-600'
      case 'not_started': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }
  
  const getStatusIcon = (status: ProgressStatus) => {
    switch (status) {
      case 'mastered': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'progressing': return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'introduced': return <Play className="w-4 h-4 text-yellow-600" />
      case 'not_started': return <Circle className="w-4 h-4 text-gray-400" />
      default: return <Circle className="w-4 h-4 text-gray-400" />
    }
  }
  
  const getStatusLabel = (status: ProgressStatus) => {
    switch (status) {
      case 'mastered': return language === 'ar' ? 'مكتسب' : 'Mastered'
      case 'progressing': return language === 'ar' ? 'في تقدم' : 'Progressing'
      case 'introduced': return language === 'ar' ? 'تم التعريف' : 'Introduced'
      case 'not_started': return language === 'ar' ? 'لم يبدأ' : 'Not Started'
      default: return language === 'ar' ? 'غير محدد' : 'Unknown'
    }
  }
  
  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(goal.progress_status)}
            <span className={`text-sm font-medium ${getStatusColor(goal.progress_status)}`}>
              {getStatusLabel(goal.progress_status)}
            </span>
          </div>
          <span className="text-sm font-semibold">
            {goal.current_progress_percentage}%
          </span>
        </div>
        <Progress 
          value={goal.current_progress_percentage} 
          className="h-2"
        />
      </div>
      
      {/* Detailed Progress Information */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'آخر تحديث:' : 'Last Updated:'}
            </span>
            <div className="text-gray-600">
              {goal.last_progress_update 
                ? new Date(goal.last_progress_update).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                : (language === 'ar' ? 'لا يوجد' : 'None')
              }
            </div>
          </div>
          <div>
            <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تاريخ الهدف:' : 'Target Date:'}
            </span>
            <div className="text-gray-600">
              {new Date(goal.target_completion_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </div>
          </div>
        </div>
      )}
      
      {/* Progress Trend */}
      {goal.progress_data && goal.progress_data.length > 1 && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'اتجاه التقدم:' : 'Progress Trend:'}
            </span>
            {/* Simple trend calculation */}
            {(() => {
              const recent = goal.progress_data?.slice(-2) || []
              if (recent.length === 2) {
                const trend = recent[1].percentage_achieved - recent[0].percentage_achieved
                return (
                  <Badge variant={trend > 0 ? 'default' : trend < 0 ? 'destructive' : 'secondary'}>
                    {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} 
                    {Math.abs(trend)}%
                  </Badge>
                )
              }
              return null
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPGoalManager = ({ iepId, mode = 'edit', onGoalUpdate }: IEPGoalManagerProps) => {
  const { language, isRTL } = useLanguage()
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'analytics'>('list')
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  
  // Data hooks
  const { data: goals = [], isLoading, refetch } = useIEPGoals(iepId)
  const createGoalMutation = useCreateIEPGoal()
  const updateProgressMutation = useUpdateIEPGoalProgress()
  
  // Form setup
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      domain: 'academic_reading',
      goal_statement_ar: '',
      goal_statement_en: '',
      baseline_performance_ar: '',
      baseline_performance_en: '',
      measurement_method: 'percentage',
      measurement_criteria: '',
      evaluation_frequency: 'weekly',
      evaluation_method_ar: '',
      evaluation_method_en: '',
      mastery_criteria_ar: '',
      mastery_criteria_en: '',
      target_completion_date: '',
      responsible_provider: '',
      service_location: '',
      objectives: [
        {
          objective_statement_ar: '',
          objective_statement_en: '',
          mastery_criteria: '',
          target_date: '',
          is_mastered: false
        }
      ]
    }
  })
  
  // Objectives array management
  const { fields: objectiveFields, append: appendObjective, remove: removeObjective } = useFieldArray({
    control: form.control,
    name: 'objectives'
  })
  
  // Effect to notify parent of goal updates
  useEffect(() => {
    if (onGoalUpdate && goals) {
      onGoalUpdate(goals)
    }
  }, [goals, onGoalUpdate])
  
  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  const handleCreateGoal = async (data: GoalFormData) => {
    try {
      const goalData: CreateIEPGoalData = {
        iep_id: iepId,
        domain: data.domain,
        goal_statement_ar: data.goal_statement_ar,
        goal_statement_en: data.goal_statement_en,
        baseline_performance_ar: data.baseline_performance_ar,
        baseline_performance_en: data.baseline_performance_en,
        measurement_method: data.measurement_method,
        measurement_criteria: data.measurement_criteria,
        evaluation_frequency: data.evaluation_frequency,
        evaluation_method_ar: data.evaluation_method_ar,
        evaluation_method_en: data.evaluation_method_en,
        mastery_criteria_ar: data.mastery_criteria_ar,
        mastery_criteria_en: data.mastery_criteria_en,
        target_completion_date: data.target_completion_date,
        responsible_provider: data.responsible_provider,
        service_location: data.service_location,
        goal_number: goals.length + 1,
        goal_order: goals.length + 1
      }
      
      await createGoalMutation.mutateAsync(goalData)
      form.reset()
      setActiveTab('list')
      await refetch()
      
      console.log('✅ IEPGoalManager: Goal created successfully')
    } catch (error) {
      console.error('❌ IEPGoalManager: Failed to create goal:', error)
    }
  }
  
  const handleBulkStatusUpdate = async (status: GoalStatus) => {
    try {
      for (const goalId of selectedGoals) {
        // This would require implementing a bulk update in the service layer
        console.log(`Updating goal ${goalId} to status ${status}`)
      }
      setSelectedGoals([])
    } catch (error) {
      console.error('❌ IEPGoalManager: Failed to update goal statuses:', error)
    }
  }
  
  const getDomainLabel = (domain: GoalDomain) => {
    const domainLabels = {
      academic_reading: language === 'ar' ? 'أكاديمي - القراءة' : 'Academic - Reading',
      academic_writing: language === 'ar' ? 'أكاديمي - الكتابة' : 'Academic - Writing', 
      academic_math: language === 'ar' ? 'أكاديمي - الرياضيات' : 'Academic - Math',
      academic_science: language === 'ar' ? 'أكاديمي - العلوم' : 'Academic - Science',
      communication_expressive: language === 'ar' ? 'التواصل - التعبيري' : 'Communication - Expressive',
      communication_receptive: language === 'ar' ? 'التواصل - الاستقبالي' : 'Communication - Receptive',
      communication_social: language === 'ar' ? 'التواصل - الاجتماعي' : 'Communication - Social',
      behavioral_social: language === 'ar' ? 'السلوكي - الاجتماعي' : 'Behavioral - Social',
      behavioral_attention: language === 'ar' ? 'السلوكي - الانتباه' : 'Behavioral - Attention',
      behavioral_self_regulation: language === 'ar' ? 'السلوكي - التنظيم الذاتي' : 'Behavioral - Self Regulation',
      functional_daily_living: language === 'ar' ? 'وظيفي - المعيشة اليومية' : 'Functional - Daily Living',
      functional_mobility: language === 'ar' ? 'وظيفي - الحركة' : 'Functional - Mobility',
      functional_self_care: language === 'ar' ? 'وظيفي - العناية الذاتية' : 'Functional - Self Care',
      motor_fine: language === 'ar' ? 'حركي - دقيق' : 'Motor - Fine',
      motor_gross: language === 'ar' ? 'حركي - كبير' : 'Motor - Gross',
      vocational: language === 'ar' ? 'مهني' : 'Vocational',
      transition: language === 'ar' ? 'انتقالي' : 'Transition'
    }
    return domainLabels[domain]
  }
  
  // =============================================================================
  // STATISTICS CALCULATIONS
  // =============================================================================
  
  const goalStats = {
    total: goals.length,
    mastered: goals.filter(g => g.progress_status === 'mastered').length,
    progressing: goals.filter(g => g.progress_status === 'progressing').length,
    introduced: goals.filter(g => g.progress_status === 'introduced').length,
    not_started: goals.filter(g => g.progress_status === 'not_started').length,
    averageProgress: goals.length > 0 
      ? Math.round(goals.reduce((sum, goal) => sum + goal.current_progress_percentage, 0) / goals.length)
      : 0
  }
  
  // =============================================================================
  // LOADING STATE
  // =============================================================================
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className={`text-center ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'جاري تحميل الأهداف...' : 'Loading goals...'}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Target className="w-5 h-5" />
            {language === 'ar' ? 'إدارة الأهداف السنوية' : 'Annual Goals Management'}
          </CardTitle>
          
          {/* Goal Statistics */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="gap-1">
              <span>{language === 'ar' ? 'المجموع:' : 'Total:'}</span>
              <span className="font-bold">{goalStats.total}</span>
            </Badge>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>{goalStats.mastered} {language === 'ar' ? 'مكتسب' : 'Mastered'}</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{goalStats.progressing} {language === 'ar' ? 'في تقدم' : 'Progressing'}</span>
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span>{language === 'ar' ? 'متوسط التقدم:' : 'Avg Progress:'}</span>
              <span className="font-bold">{goalStats.averageProgress}%</span>
            </Badge>
          </div>
        </CardHeader>
      </Card>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full">
        <TabsList className={`grid w-full grid-cols-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
          <TabsTrigger value="list">
            {language === 'ar' ? 'قائمة الأهداف' : 'Goals List'}
          </TabsTrigger>
          <TabsTrigger value="add" disabled={mode === 'view'}>
            {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
        </TabsList>
        
        {/* Goals List Tab */}
        <TabsContent value="list" className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className={`text-center text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>{language === 'ar' ? 'لا توجد أهداف سنوية' : 'No annual goals yet'}</p>
                  {mode === 'edit' && (
                    <Button
                      onClick={() => setActiveTab('add')}
                      className="mt-4"
                      size="sm"
                    >
                      {language === 'ar' ? 'إضافة هدف جديد' : 'Add First Goal'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, index) => (
                <Card key={goal.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            {language === 'ar' ? 'الهدف' : 'Goal'} {index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getDomainLabel(goal.domain)}
                          </Badge>
                        </div>
                        <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                          {goal.goal_statement_ar}
                        </CardTitle>
                      </div>
                      {mode === 'edit' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGoal(editingGoal === goal.id ? null : goal.id)}
                          >
                            {editingGoal === goal.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GoalProgressVisualizer goal={goal} showDetails={true} />
                    
                    {/* Goal Details */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'طريقة القياس:' : 'Measurement:'}
                          </span>
                          <div className="text-gray-600 capitalize">
                            {goal.measurement_method.replace('_', ' ')}
                          </div>
                        </div>
                        <div>
                          <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'تكرار التقييم:' : 'Evaluation:'}
                          </span>
                          <div className="text-gray-600 capitalize">
                            {goal.evaluation_frequency}
                          </div>
                        </div>
                      </div>
                      
                      {/* Baseline Performance */}
                      <div>
                        <span className={`font-medium block ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الأداء الأساسي:' : 'Baseline Performance:'}
                        </span>
                        <div className={`text-gray-600 text-sm mt-1 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                          {goal.baseline_performance_ar}
                        </div>
                      </div>
                      
                      {/* Mastery Criteria */}
                      <div>
                        <span className={`font-medium block ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'معايير الإتقان:' : 'Mastery Criteria:'}
                        </span>
                        <div className={`text-gray-600 text-sm mt-1 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                          {goal.mastery_criteria_ar}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Add Goal Tab */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'إنشاء هدف سنوي جديد' : 'Create New Annual Goal'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateGoal)} className="space-y-6">
                  
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مجال الهدف *' : 'Goal Domain *'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                              <SelectItem value="behavioral_social">
                                {language === 'ar' ? 'السلوكي - الاجتماعي' : 'Behavioral - Social'}
                              </SelectItem>
                              <SelectItem value="functional_daily_living">
                                {language === 'ar' ? 'وظيفي - المعيشة اليومية' : 'Functional - Daily Living'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="target_completion_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تاريخ الإنجاز المستهدف *' : 'Target Completion Date *'}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Goal Statement */}
                  <FormField
                    control={form.control}
                    name="goal_statement_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'بيان الهدف (عربي) *' : 'Goal Statement (Arabic) *'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={language === 'ar' ? 'اكتب هدفاً قابلاً للقياس وواضحاً ومحدد زمنياً...' : 'Write a measurable, clear, and time-bound goal...'}
                            className={`min-h-20 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Baseline Performance */}
                  <FormField
                    control={form.control}
                    name="baseline_performance_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'الأداء الأساسي (عربي) *' : 'Baseline Performance (Arabic) *'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={language === 'ar' ? 'اكتب وصف الأداء الحالي للطالب...' : 'Describe the student\'s current performance...'}
                            className={`min-h-16 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Measurement Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="measurement_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'طريقة القياس *' : 'Measurement Method *'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">{language === 'ar' ? 'نسبة مئوية' : 'Percentage'}</SelectItem>
                              <SelectItem value="frequency">{language === 'ar' ? 'التكرار' : 'Frequency'}</SelectItem>
                              <SelectItem value="duration">{language === 'ar' ? 'المدة' : 'Duration'}</SelectItem>
                              <SelectItem value="trials">{language === 'ar' ? 'المحاولات' : 'Trials'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="measurement_criteria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'معايير القياس *' : 'Measurement Criteria *'}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? '80% دقة' : '80% accuracy'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="evaluation_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'تكرار التقييم *' : 'Evaluation Frequency *'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                              <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                              <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                              <SelectItem value="quarterly">{language === 'ar' ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Evaluation and Mastery */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="evaluation_method_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'طريقة التقييم (عربي) *' : 'Evaluation Method (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder={language === 'ar' ? 'ملاحظة مباشرة وتسجيل البيانات' : 'Direct observation and data recording'}
                              className={language === 'ar' ? 'font-arabic text-right' : ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mastery_criteria_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'معايير الإتقان (عربي) *' : 'Mastery Criteria (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder={language === 'ar' ? 'اكتب معايير إتقان الهدف بوضوح...' : 'Write clear criteria for goal mastery...'}
                              className={`min-h-16 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Objectives Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الأهداف الفرعية' : 'Objectives'}
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendObjective({
                          objective_statement_ar: '',
                          objective_statement_en: '',
                          mastery_criteria: '',
                          target_date: '',
                          is_mastered: false
                        })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                    
                    {objectiveFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'الهدف الفرعي' : 'Objective'} {index + 1}
                          </h4>
                          {objectiveFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeObjective(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`objectives.${index}.objective_statement_ar`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'بيان الهدف الفرعي *' : 'Objective Statement *'}
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field}
                                    className={`min-h-16 ${language === 'ar' ? 'font-arabic text-right' : ''}`}
                                    placeholder={language === 'ar' ? 'اكتب الهدف الفرعي...' : 'Write the objective...'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`objectives.${index}.mastery_criteria`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'معايير الإتقان *' : 'Mastery Criteria *'}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`objectives.${index}.target_date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'التاريخ المستهدف *' : 'Target Date *'}
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Form Actions */}
                  <div className={`flex gap-4 pt-6 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset()
                        setActiveTab('list')
                      }}
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createGoalMutation.isPending}
                      className="gap-2"
                    >
                      {createGoalMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {language === 'ar' ? 'حفظ الهدف' : 'Save Goal'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Overall Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'نظرة عامة على التقدم' : 'Progress Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {goalStats.averageProgress}%
                    </div>
                    <div className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'متوسط التقدم الإجمالي' : 'Overall Average Progress'}
                    </div>
                  </div>
                  <Progress value={goalStats.averageProgress} className="h-3" />
                </div>
              </CardContent>
            </Card>
            
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'توزيع حالات الأهداف' : 'Goal Status Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'مكتسب' : 'Mastered'}
                      </span>
                    </div>
                    <span className="font-bold">{goalStats.mastered}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'في تقدم' : 'Progressing'}
                      </span>
                    </div>
                    <span className="font-bold">{goalStats.progressing}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-yellow-600" />
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'تم التعريف' : 'Introduced'}
                      </span>
                    </div>
                    <span className="font-bold">{goalStats.introduced}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'لم يبدأ' : 'Not Started'}
                      </span>
                    </div>
                    <span className="font-bold">{goalStats.not_started}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
          </div>
          
          {/* Goals by Domain */}
          <Card>
            <CardHeader>
              <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الأهداف حسب المجال' : 'Goals by Domain'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  goals.reduce((acc, goal) => {
                    const domain = goal.domain
                    if (!acc[domain]) acc[domain] = { count: 0, totalProgress: 0 }
                    acc[domain].count++
                    acc[domain].totalProgress += goal.current_progress_percentage
                    return acc
                  }, {} as Record<string, { count: number; totalProgress: number }>)
                ).map(([domain, stats]) => (
                  <div key={domain} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>
                        {getDomainLabel(domain as GoalDomain)}
                      </span>
                      <span>{stats.count} {language === 'ar' ? 'أهداف' : 'goals'}</span>
                    </div>
                    <Progress 
                      value={Math.round(stats.totalProgress / stats.count)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
        </TabsContent>
      </Tabs>
      
    </div>
  )
}