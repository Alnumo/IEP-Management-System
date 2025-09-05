import React, { useState, useCallback, useMemo } from 'react'
import { Plus, Edit, Trash2, Copy, Save, X, Calendar, Clock, Settings, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import type {
  ScheduleTemplate,
  TemplateType,
  SchedulePattern,
  TimeSlot,
  SchedulePatternConfig,
  BilingualText
} from '@/types/scheduling'

/**
 * Schedule Template Manager Component
 * Story 3.1: Automated Scheduling Engine - Template Management
 * 
 * Comprehensive template management interface for creating, editing, and managing
 * schedule templates with Arabic RTL/English LTR support and drag-and-drop functionality.
 */

interface ScheduleTemplateManagerProps {
  selectedTemplateId?: string
  onTemplateSelect?: (template: ScheduleTemplate) => void
  onTemplateChange?: (templates: ScheduleTemplate[]) => void
  readOnly?: boolean
  compactView?: boolean
}

export function ScheduleTemplateManager({
  selectedTemplateId,
  onTemplateSelect,
  onTemplateChange,
  readOnly = false,
  compactView = false
}: ScheduleTemplateManagerProps) {
  const { language, isRTL } = useLanguage()
  const queryClient = useQueryClient()

  // State management
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)
  const [activeTab, setActiveTab] = useState('list')

  // Form state for template creation/editing
  const [templateForm, setTemplateForm] = useState<Partial<ScheduleTemplate>>({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    template_type: TemplateType.PROGRAM_BASED,
    is_active: true,
    session_duration: 60,
    sessions_per_week: 2,
    preferred_times: [],
    scheduling_pattern: SchedulePattern.WEEKLY,
    pattern_config: {
      preferred_days: [1, 3], // Monday, Wednesday
      avoid_days: [5, 6], // Friday, Saturday
      preferred_time_blocks: [],
      allow_weekend: false,
      allow_evening: false,
      max_sessions_per_day: 3
    },
    required_equipment: [],
    allow_back_to_back: false,
    max_gap_between_sessions: 120
  })

  // Fetch schedule templates
  const {
    data: templates = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['schedule-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ScheduleTemplate[]
    },
    staleTime: 5 * 60 * 1000
  })

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<ScheduleTemplate>) => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data as ScheduleTemplate
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully'
      )
      setShowCreateDialog(false)
      resetForm()
      onTemplateChange?.([...templates, newTemplate])
    },
    onError: (error) => {
      console.error('Template creation failed:', error)
      toast.error(
        language === 'ar' ? 'فشل في إنشاء القالب' : 'Failed to create template'
      )
    }
  })

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScheduleTemplate> }) => {
      const { data, error } = await supabase
        .from('schedule_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as ScheduleTemplate
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم تحديث القالب بنجاح' : 'Template updated successfully'
      )
      setShowEditDialog(false)
      setSelectedTemplate(null)
      resetForm()
      
      const updatedTemplates = templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      )
      onTemplateChange?.(updatedTemplates)
    },
    onError: (error) => {
      console.error('Template update failed:', error)
      toast.error(
        language === 'ar' ? 'فشل في تحديث القالب' : 'Failed to update template'
      )
    }
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('schedule_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      toast.success(
        language === 'ar' ? 'تم حذف القالب بنجاح' : 'Template deleted successfully'
      )
      setShowDeleteDialog(false)
      setSelectedTemplate(null)
      
      const updatedTemplates = templates.filter(t => t.id !== selectedTemplate?.id)
      onTemplateChange?.(updatedTemplates)
    },
    onError: (error) => {
      console.error('Template deletion failed:', error)
      toast.error(
        language === 'ar' ? 'فشل في حذف القالب' : 'Failed to delete template'
      )
    }
  })

  // Event handlers
  const handleCreateTemplate = useCallback(() => {
    resetForm()
    setShowCreateDialog(true)
  }, [])

  const handleEditTemplate = useCallback((template: ScheduleTemplate) => {
    setSelectedTemplate(template)
    setTemplateForm(template)
    setShowEditDialog(true)
  }, [])

  const handleDeleteTemplate = useCallback((template: ScheduleTemplate) => {
    setSelectedTemplate(template)
    setShowDeleteDialog(true)
  }, [])

  const handleDuplicateTemplate = useCallback((template: ScheduleTemplate) => {
    const duplicatedTemplate = {
      ...template,
      name: template.name + ' (Copy)',
      name_ar: template.name_ar + ' (نسخة)',
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    }
    setTemplateForm(duplicatedTemplate)
    setShowCreateDialog(true)
  }, [])

  const handleSaveTemplate = useCallback(() => {
    if (!templateForm.name || !templateForm.name_ar) {
      toast.error(
        language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields'
      )
      return
    }

    if (showEditDialog && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, updates: templateForm })
    } else {
      createTemplateMutation.mutate(templateForm)
    }
  }, [templateForm, showEditDialog, selectedTemplate, createTemplateMutation, updateTemplateMutation, language])

  const handleDeleteConfirm = useCallback(() => {
    if (selectedTemplate) {
      deleteTemplateMutation.mutate(selectedTemplate.id)
    }
  }, [selectedTemplate, deleteTemplateMutation])

  const resetForm = useCallback(() => {
    setTemplateForm({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      template_type: TemplateType.PROGRAM_BASED,
      is_active: true,
      session_duration: 60,
      sessions_per_week: 2,
      preferred_times: [],
      scheduling_pattern: SchedulePattern.WEEKLY,
      pattern_config: {
        preferred_days: [1, 3],
        avoid_days: [5, 6],
        preferred_time_blocks: [],
        allow_weekend: false,
        allow_evening: false,
        max_sessions_per_day: 3
      },
      required_equipment: [],
      allow_back_to_back: false,
      max_gap_between_sessions: 120
    })
  }, [])

  // Computed values
  const activeTemplates = useMemo(() => 
    templates.filter(template => template.is_active),
    [templates]
  )

  const templateTypeLabels = {
    [TemplateType.PROGRAM_BASED]: language === 'ar' ? 'قائم على البرنامج' : 'Program Based',
    [TemplateType.CUSTOM]: language === 'ar' ? 'مخصص' : 'Custom',
    [TemplateType.RECURRING]: language === 'ar' ? 'متكرر' : 'Recurring'
  }

  const schedulePatternLabels = {
    [SchedulePattern.DAILY]: language === 'ar' ? 'يومي' : 'Daily',
    [SchedulePattern.WEEKLY]: language === 'ar' ? 'أسبوعي' : 'Weekly',
    [SchedulePattern.BIWEEKLY]: language === 'ar' ? 'كل أسبوعين' : 'Bi-weekly',
    [SchedulePattern.MONTHLY]: language === 'ar' ? 'شهري' : 'Monthly'
  }

  const dayLabels = [
    language === 'ar' ? 'الأحد' : 'Sunday',
    language === 'ar' ? 'الإثنين' : 'Monday',
    language === 'ar' ? 'الثلاثاء' : 'Tuesday',
    language === 'ar' ? 'الأربعاء' : 'Wednesday',
    language === 'ar' ? 'الخميس' : 'Thursday',
    language === 'ar' ? 'الجمعة' : 'Friday',
    language === 'ar' ? 'السبت' : 'Saturday'
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل القوالب...' : 'Loading templates...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">
              {language === 'ar' ? 'خطأ في تحميل القوالب' : 'Error loading templates'}
            </p>
            <Button onClick={() => refetch()}>
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {language === 'ar' ? 'إدارة قوالب الجدولة' : 'Schedule Template Manager'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'إنشاء وإدارة قوالب الجدولة لتحسين عملية إنشاء الجداول'
              : 'Create and manage schedule templates for optimized schedule generation'
            }
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'قالب جديد' : 'New Template'}
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">
            {language === 'ar' ? 'قائمة القوالب' : 'Template List'}
          </TabsTrigger>
          <TabsTrigger value="active">
            {language === 'ar' ? 'القوالب النشطة' : 'Active Templates'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
        </TabsList>

        {/* Template List */}
        <TabsContent value="list" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد قوالب' : 'No Templates Found'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {language === 'ar' 
                    ? 'لم يتم إنشاء أي قوالب جدولة بعد. ابدأ بإنشاء قالبك الأول.'
                    : 'No schedule templates have been created yet. Start by creating your first template.'
                  }
                </p>
                {!readOnly && (
                  <Button onClick={handleCreateTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إنشاء قالب' : 'Create Template'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onTemplateSelect?.(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {language === 'ar' ? template.name_ar : template.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === 'ar' ? template.description_ar : template.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={template.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Template Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            {language === 'ar' ? 'النوع:' : 'Type:'}
                          </span>
                          <p>{templateTypeLabels[template.template_type]}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            {language === 'ar' ? 'النمط:' : 'Pattern:'}
                          </span>
                          <p>{schedulePatternLabels[template.scheduling_pattern]}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            {language === 'ar' ? 'المدة:' : 'Duration:'}
                          </span>
                          <p>{template.session_duration} {language === 'ar' ? 'دقيقة' : 'min'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            {language === 'ar' ? 'جلسات/أسبوع:' : 'Sessions/Week:'}
                          </span>
                          <p>{template.sessions_per_week}</p>
                        </div>
                      </div>

                      {/* Preferred Times */}
                      {template.preferred_times.length > 0 && (
                        <div>
                          <span className="font-medium text-muted-foreground text-sm">
                            {language === 'ar' ? 'الأوقات المفضلة:' : 'Preferred Times:'}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.preferred_times.slice(0, 3).map((time, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {time.start_time} - {time.end_time}
                              </Badge>
                            ))}
                            {template.preferred_times.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.preferred_times.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Action Buttons */}
                      {!readOnly && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTemplate(template)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDuplicateTemplate(template)
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTemplate(template)
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'تم التحديث:' : 'Updated:'} {' '}
                            {new Date(template.updated_at).toLocaleDateString(
                              language === 'ar' ? 'ar-SA' : 'en-US'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Templates */}
        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTemplates.map((template) => (
              <Card key={template.id} className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {language === 'ar' ? template.name_ar : template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? template.description_ar : template.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {template.session_duration} {language === 'ar' ? 'دقيقة' : 'min'}
                      </span>
                      <span>
                        <Users className="h-4 w-4 inline mr-1" />
                        {template.sessions_per_week} {language === 'ar' ? 'جلسة/أسبوع' : 'sessions/week'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'إحصائيات القوالب' : 'Template Analytics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{templates.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي القوالب' : 'Total Templates'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{activeTemplates.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'القوالب النشطة' : 'Active Templates'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round((activeTemplates.length / Math.max(templates.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'معدل الاستخدام' : 'Usage Rate'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setShowEditDialog(false)
          resetForm()
        }
      }}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <DialogHeader>
            <DialogTitle>
              {showEditDialog
                ? (language === 'ar' ? 'تحرير القالب' : 'Edit Template')
                : (language === 'ar' ? 'إنشاء قالب جديد' : 'Create New Template')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'قم بتكوين إعدادات القالب لإنشاء جداول محسّنة'
                : 'Configure template settings for optimized schedule generation'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  {language === 'ar' ? 'اسم القالب (English)' : 'Template Name (English)'} *
                </Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={language === 'ar' ? 'أدخل اسم القالب' : 'Enter template name'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-name-ar">
                  {language === 'ar' ? 'اسم القالب (العربية)' : 'Template Name (Arabic)'} *
                </Label>
                <Input
                  id="template-name-ar"
                  value={templateForm.name_ar}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name_ar: e.target.value }))}
                  placeholder={language === 'ar' ? 'أدخل اسم القالب بالعربية' : 'Enter Arabic template name'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-description">
                  {language === 'ar' ? 'الوصف (English)' : 'Description (English)'}
                </Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={language === 'ar' ? 'أدخل وصف القالب' : 'Enter template description'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description-ar">
                  {language === 'ar' ? 'الوصف (العربية)' : 'Description (Arabic)'}
                </Label>
                <Textarea
                  id="template-description-ar"
                  value={templateForm.description_ar}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description_ar: e.target.value }))}
                  placeholder={language === 'ar' ? 'أدخل وصف القالب بالعربية' : 'Enter Arabic description'}
                />
              </div>
            </div>

            {/* Template Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-type">
                  {language === 'ar' ? 'نوع القالب' : 'Template Type'}
                </Label>
                <Select
                  value={templateForm.template_type}
                  onValueChange={(value: TemplateType) => 
                    setTemplateForm(prev => ({ ...prev, template_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TemplateType).map(type => (
                      <SelectItem key={type} value={type}>
                        {templateTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduling-pattern">
                  {language === 'ar' ? 'نمط الجدولة' : 'Scheduling Pattern'}
                </Label>
                <Select
                  value={templateForm.scheduling_pattern}
                  onValueChange={(value: SchedulePattern) => 
                    setTemplateForm(prev => ({ ...prev, scheduling_pattern: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر النمط' : 'Select pattern'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SchedulePattern).map(pattern => (
                      <SelectItem key={pattern} value={pattern}>
                        {schedulePatternLabels[pattern]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="template-active"
                  checked={templateForm.is_active}
                  onCheckedChange={(checked) => 
                    setTemplateForm(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="template-active">
                  {language === 'ar' ? 'قالب نشط' : 'Active Template'}
                </Label>
              </div>
            </div>

            {/* Session Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-duration">
                  {language === 'ar' ? 'مدة الجلسة (بالدقائق)' : 'Session Duration (minutes)'}
                </Label>
                <Input
                  id="session-duration"
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={templateForm.session_duration}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    session_duration: parseInt(e.target.value) || 60 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessions-per-week">
                  {language === 'ar' ? 'عدد الجلسات في الأسبوع' : 'Sessions per Week'}
                </Label>
                <Input
                  id="sessions-per-week"
                  type="number"
                  min="1"
                  max="7"
                  value={templateForm.sessions_per_week}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    sessions_per_week: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">
                {language === 'ar' ? 'إعدادات متقدمة' : 'Advanced Settings'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow-back-to-back"
                    checked={templateForm.allow_back_to_back}
                    onCheckedChange={(checked) => 
                      setTemplateForm(prev => ({ ...prev, allow_back_to_back: checked }))
                    }
                  />
                  <Label htmlFor="allow-back-to-back">
                    {language === 'ar' ? 'السماح بالجلسات المتتالية' : 'Allow Back-to-Back Sessions'}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-gap">
                    {language === 'ar' ? 'أقصى فجوة بين الجلسات (دقيقة)' : 'Max Gap Between Sessions (minutes)'}
                  </Label>
                  <Input
                    id="max-gap"
                    type="number"
                    min="0"
                    max="480"
                    step="15"
                    value={templateForm.max_gap_between_sessions}
                    onChange={(e) => setTemplateForm(prev => ({ 
                      ...prev, 
                      max_gap_between_sessions: parseInt(e.target.value) || 120 
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                resetForm()
              }}
            >
              <X className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createTemplateMutation.isPending || updateTemplateMutation.isPending
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف القالب "${selectedTemplate?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete the template "${selectedTemplate?.name}"? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending
                ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                : (language === 'ar' ? 'حذف' : 'Delete')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}