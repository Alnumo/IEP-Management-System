// Story 6.1: Student program customizer for individual modifications

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Plus, Minus, Edit, Save, X, AlertTriangle } from 'lucide-react'
import type { ProgramTemplate, ProgramGoal, TemplateCustomization } from '@/types/program-templates'

const customizationSchema = z.object({
  duration_weeks: z.number().min(1).max(104),
  sessions_per_week: z.number().min(1).max(7),
  selected_goals: z.array(z.object({
    goal_ar: z.string(),
    goal_en: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    category: z.string().optional()
  })),
  additional_goals: z.array(z.object({
    goal_ar: z.string().min(1),
    goal_en: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high']),
    category: z.string().optional()
  })),
  intensity_level: z.enum(['low', 'medium', 'high']),
  assessment_frequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'quarterly']),
  special_requirements: z.array(z.string()).optional(),
  notes: z.string().optional()
})

interface StudentProgramCustomizerProps {
  template: ProgramTemplate
  initialCustomization?: TemplateCustomization
  onCustomizationChange: (customization: TemplateCustomization) => void
  onSave: (customization: TemplateCustomization) => void
  onCancel: () => void
  readOnly?: boolean
  showComparison?: boolean
}

export function StudentProgramCustomizer({
  template,
  initialCustomization,
  onCustomizationChange,
  onSave,
  onCancel,
  readOnly = false,
  showComparison = true
}: StudentProgramCustomizerProps) {
  const { language, isRTL } = useLanguage()
  const [activeTab, setActiveTab] = useState('goals')
  const [editingGoal, setEditingGoal] = useState<number | null>(null)
  const [newGoal, setNewGoal] = useState({ goal_ar: '', goal_en: '', priority: 'medium' as const, category: '' })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset
  } = useForm<TemplateCustomization>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      template_id: template.id,
      duration_weeks: template.base_duration_weeks,
      sessions_per_week: template.base_sessions_per_week,
      selected_goals: template.default_goals,
      additional_goals: [],
      intensity_level: template.customization_options.intensity_levels[0] || 'medium',
      assessment_frequency: template.customization_options.assessment_frequency,
      special_requirements: [],
      notes: '',
      ...initialCustomization
    }
  })

  const watchedValues = watch()

  useEffect(() => {
    if (isDirty) {
      onCustomizationChange(watchedValues)
    }
  }, [watchedValues, isDirty, onCustomizationChange])

  const texts = {
    title: {
      ar: 'تخصيص البرنامج',
      en: 'Program Customization'
    },
    originalProgram: {
      ar: 'البرنامج الأصلي',
      en: 'Original Program'
    },
    customizedProgram: {
      ar: 'البرنامج المخصص',
      en: 'Customized Program'
    },
    duration: {
      ar: 'المدة (أسابيع)',
      en: 'Duration (weeks)'
    },
    sessionsPerWeek: {
      ar: 'الجلسات في الأسبوع',
      en: 'Sessions per week'
    },
    goals: {
      ar: 'الأهداف',
      en: 'Goals'
    },
    settings: {
      ar: 'الإعدادات',
      en: 'Settings'
    },
    requirements: {
      ar: 'المتطلبات الخاصة',
      en: 'Special Requirements'
    },
    defaultGoals: {
      ar: 'الأهداف الافتراضية',
      en: 'Default Goals'
    },
    additionalGoals: {
      ar: 'أهداف إضافية',
      en: 'Additional Goals'
    },
    intensityLevel: {
      ar: 'مستوى الكثافة',
      en: 'Intensity Level'
    },
    assessmentFrequency: {
      ar: 'تكرار التقييم',
      en: 'Assessment Frequency'
    },
    addGoal: {
      ar: 'إضافة هدف',
      en: 'Add Goal'
    },
    editGoal: {
      ar: 'تعديل الهدف',
      en: 'Edit Goal'
    },
    deleteGoal: {
      ar: 'حذف الهدف',
      en: 'Delete Goal'
    },
    goalArabic: {
      ar: 'الهدف بالعربية',
      en: 'Goal in Arabic'
    },
    goalEnglish: {
      ar: 'الهدف بالإنجليزية',
      en: 'Goal in English'
    },
    priority: {
      ar: 'الأولوية',
      en: 'Priority'
    },
    category: {
      ar: 'الفئة',
      en: 'Category'
    },
    low: {
      ar: 'منخفض',
      en: 'Low'
    },
    medium: {
      ar: 'متوسط',
      en: 'Medium'
    },
    high: {
      ar: 'عالي',
      en: 'High'
    },
    weekly: {
      ar: 'أسبوعي',
      en: 'Weekly'
    },
    biWeekly: {
      ar: 'كل أسبوعين',
      en: 'Bi-weekly'
    },
    monthly: {
      ar: 'شهري',
      en: 'Monthly'
    },
    quarterly: {
      ar: 'ربع سنوي',
      en: 'Quarterly'
    },
    save: {
      ar: 'حفظ التخصيص',
      en: 'Save Customization'
    },
    cancel: {
      ar: 'إلغاء',
      en: 'Cancel'
    },
    notes: {
      ar: 'ملاحظات',
      en: 'Notes'
    },
    changes: {
      ar: 'التغييرات',
      en: 'Changes'
    },
    weeks: {
      ar: 'أسبوع',
      en: 'weeks'
    },
    sessions: {
      ar: 'جلسة',
      en: 'sessions'
    }
  }

  const handleGoalToggle = (goal: ProgramGoal, checked: boolean) => {
    const currentGoals = watchedValues.selected_goals || []
    if (checked) {
      setValue('selected_goals', [...currentGoals, goal])
    } else {
      setValue('selected_goals', currentGoals.filter(g => g.goal_en !== goal.goal_en))
    }
  }

  const handleAddGoal = () => {
    if (newGoal.goal_ar && newGoal.goal_en) {
      const currentAdditional = watchedValues.additional_goals || []
      setValue('additional_goals', [...currentAdditional, { ...newGoal, category: newGoal.category || 'custom' }])
      setNewGoal({ goal_ar: '', goal_en: '', priority: 'medium', category: '' })
    }
  }

  const handleRemoveAdditionalGoal = (index: number) => {
    const currentAdditional = watchedValues.additional_goals || []
    setValue('additional_goals', currentAdditional.filter((_, i) => i !== index))
  }

  const calculateChanges = () => {
    const changes = []
    
    if (watchedValues.duration_weeks !== template.base_duration_weeks) {
      changes.push({
        field: 'duration',
        original: template.base_duration_weeks,
        modified: watchedValues.duration_weeks,
        type: 'numeric'
      })
    }
    
    if (watchedValues.sessions_per_week !== template.base_sessions_per_week) {
      changes.push({
        field: 'sessions',
        original: template.base_sessions_per_week,
        modified: watchedValues.sessions_per_week,
        type: 'numeric'
      })
    }
    
    if (watchedValues.selected_goals?.length !== template.default_goals.length) {
      changes.push({
        field: 'goals',
        original: template.default_goals.length,
        modified: (watchedValues.selected_goals?.length || 0) + (watchedValues.additional_goals?.length || 0),
        type: 'goals'
      })
    }
    
    return changes
  }

  const renderComparison = () => {
    if (!showComparison) return null
    
    const changes = calculateChanges()
    
    return (
      <Card className="mb-4 border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {texts.changes[language]} ({changes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">{texts.originalProgram[language]}</h4>
              <div className="space-y-1">
                <div>{template.base_duration_weeks} {texts.weeks[language]}</div>
                <div>{template.base_sessions_per_week} {texts.sessions[language]}/{texts.weekly[language]}</div>
                <div>{template.default_goals.length} {texts.goals[language]}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">{texts.customizedProgram[language]}</h4>
              <div className="space-y-1">
                <div className={watchedValues.duration_weeks !== template.base_duration_weeks ? 'text-amber-700 font-medium' : ''}>
                  {watchedValues.duration_weeks} {texts.weeks[language]}
                </div>
                <div className={watchedValues.sessions_per_week !== template.base_sessions_per_week ? 'text-amber-700 font-medium' : ''}>
                  {watchedValues.sessions_per_week} {texts.sessions[language]}/{texts.weekly[language]}
                </div>
                <div className={(watchedValues.selected_goals?.length || 0) + (watchedValues.additional_goals?.length || 0) !== template.default_goals.length ? 'text-amber-700 font-medium' : ''}>
                  {(watchedValues.selected_goals?.length || 0) + (watchedValues.additional_goals?.length || 0)} {texts.goals[language]}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{texts.title[language]}</h2>
        <div className="text-sm text-muted-foreground">
          {language === 'ar' ? template.program_name_ar : template.program_name_en}
        </div>
      </div>

      {renderComparison()}

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goals">{texts.goals[language]}</TabsTrigger>
            <TabsTrigger value="settings">{texts.settings[language]}</TabsTrigger>
            <TabsTrigger value="requirements">{texts.requirements[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-4">
            {/* Default Goals Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{texts.defaultGoals[language]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.default_goals.map((goal, index) => {
                  const isSelected = watchedValues.selected_goals?.some(g => g.goal_en === goal.goal_en) ?? true
                  return (
                    <div key={index} className="flex items-start space-x-3 space-x-reverse p-3 border rounded-lg">
                      <Switch
                        checked={isSelected}
                        onCheckedChange={(checked) => handleGoalToggle(goal, checked)}
                        disabled={readOnly}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {language === 'ar' ? goal.goal_ar : goal.goal_en}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                            {texts[goal.priority][language]}
                          </Badge>
                          {goal.category && (
                            <Badge variant="outline">{goal.category}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Additional Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{texts.additionalGoals[language]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {watchedValues.additional_goals?.map((goal, index) => (
                  <div key={index} className="flex items-start space-x-3 space-x-reverse p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {language === 'ar' ? goal.goal_ar : goal.goal_en}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                          {texts[goal.priority][language]}
                        </Badge>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdditionalGoal(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">{texts.goalArabic[language]}</Label>
                        <Input
                          value={newGoal.goal_ar}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, goal_ar: e.target.value }))}
                          placeholder={`${texts.goalArabic[language]}...`}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{texts.goalEnglish[language]}</Label>
                        <Input
                          value={newGoal.goal_en}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, goal_en: e.target.value }))}
                          placeholder={`${texts.goalEnglish[language]}...`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">{texts.priority[language]}</Label>
                        <Select value={newGoal.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewGoal(prev => ({ ...prev, priority: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{texts.low[language]}</SelectItem>
                            <SelectItem value="medium">{texts.medium[language]}</SelectItem>
                            <SelectItem value="high">{texts.high[language]}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">{texts.category[language]}</Label>
                        <Input
                          value={newGoal.category}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                          placeholder={`${texts.category[language]}...`}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddGoal}
                      disabled={!newGoal.goal_ar || !newGoal.goal_en}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {texts.addGoal[language]}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Duration */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">{texts.duration[language]}</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[watchedValues.duration_weeks]}
                      onValueChange={([value]) => setValue('duration_weeks', value)}
                      min={1}
                      max={104}
                      step={1}
                      disabled={readOnly}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1 {texts.weeks[language]}</span>
                      <span className="font-medium">{watchedValues.duration_weeks} {texts.weeks[language]}</span>
                      <span>104 {texts.weeks[language]}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sessions per week */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">{texts.sessionsPerWeek[language]}</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[watchedValues.sessions_per_week]}
                      onValueChange={([value]) => setValue('sessions_per_week', value)}
                      min={1}
                      max={7}
                      step={1}
                      disabled={readOnly}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1 {texts.sessions[language]}</span>
                      <span className="font-medium">{watchedValues.sessions_per_week} {texts.sessions[language]}</span>
                      <span>7 {texts.sessions[language]}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Intensity Level */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">{texts.intensityLevel[language]}</Label>
                  <Select value={watchedValues.intensity_level} onValueChange={(value) => setValue('intensity_level', value as any)} disabled={readOnly}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {template.customization_options.intensity_levels.map(level => (
                        <SelectItem key={level} value={level}>
                          {texts[level][language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assessment Frequency */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">{texts.assessmentFrequency[language]}</Label>
                  <Select value={watchedValues.assessment_frequency} onValueChange={(value) => setValue('assessment_frequency', value as any)} disabled={readOnly}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">{texts.weekly[language]}</SelectItem>
                      <SelectItem value="bi-weekly">{texts.biWeekly[language]}</SelectItem>
                      <SelectItem value="monthly">{texts.monthly[language]}</SelectItem>
                      <SelectItem value="quarterly">{texts.quarterly[language]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">{texts.notes[language]}</Label>
                  <Textarea
                    {...register('notes')}
                    placeholder={`${texts.notes[language]}...`}
                    rows={4}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        {!readOnly && (
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end pt-4`}>
            <Button type="button" variant="outline" onClick={onCancel}>
              {texts.cancel[language]}
            </Button>
            <Button type="submit" disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              {texts.save[language]}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}