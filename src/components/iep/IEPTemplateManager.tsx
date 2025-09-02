/**
 * IEP Template Manager Component
 * Create, manage, and use IEP templates for faster creation
 * IDEA 2024 Compliant - Bilingual Support
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Copy, 
  FileTemplate, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Clock, 
  User,
  BookOpen,
  Target,
  Settings,
  Download,
  Upload,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateIEP, useIEP } from '@/hooks/useIEPs'
import { supabase } from '@/lib/supabase'
import type { CreateIEPData, IEP, GoalDomain, ServiceCategory } from '@/types/iep'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// =============================================================================
// INTERFACES & SCHEMAS
// =============================================================================

interface IEPTemplate {
  id: string
  name_ar: string
  name_en: string
  description_ar?: string
  description_en?: string
  category: 'general' | 'autism' | 'intellectual_disability' | 'multiple_disabilities' | 'specific_learning_disability'
  template_data: Partial<CreateIEPData>
  goal_templates: IEPGoalTemplate[]
  service_templates: IEPServiceTemplate[]
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
  is_public: boolean
  use_count: number
  is_favorite: boolean
}

interface IEPGoalTemplate {
  domain: GoalDomain
  baseline_performance_ar: string
  baseline_performance_en?: string
  goal_statement_ar: string
  goal_statement_en?: string
  measurement_method: string
  evaluation_frequency: string
  mastery_criteria_ar: string
  mastery_criteria_en?: string
}

interface IEPServiceTemplate {
  service_name_ar: string
  service_name_en?: string
  service_category: ServiceCategory
  frequency_per_week: number
  session_duration_minutes: number
  service_location: string
}

const templateSchema = z.object({
  name_ar: z.string().min(3, 'Template name in Arabic is required'),
  name_en: z.string().optional(),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  category: z.enum(['general', 'autism', 'intellectual_disability', 'multiple_disabilities', 'specific_learning_disability']),
  is_public: z.boolean().default(false)
})

type TemplateFormData = z.infer<typeof templateSchema>

interface IEPTemplateManagerProps {
  onTemplateSelect?: (template: IEPTemplate) => void
  onDuplicateIEP?: (iep: IEP) => void
  showDuplication?: boolean
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IEPTemplateManager({ 
  onTemplateSelect, 
  onDuplicateIEP,
  showDuplication = true 
}: IEPTemplateManagerProps) {
  const { language, isRTL } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<IEPTemplate | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [selectedIEP, setSelectedIEP] = useState<string>('')

  const createIEPMutation = useCreateIEP()

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['iep-templates', selectedCategory],
    queryFn: async (): Promise<IEPTemplate[]> => {
      let query = supabase
        .from('iep_templates')
        .select(`
          *,
          profiles!created_by(full_name)
        `)
        .order('created_at', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error

      return data?.map(template => ({
        ...template,
        created_by_name: template.profiles?.full_name || 'Unknown User',
        template_data: JSON.parse(template.template_data || '{}'),
        goal_templates: JSON.parse(template.goal_templates || '[]'),
        service_templates: JSON.parse(template.service_templates || '[]')
      })) || []
    }
  })

  // Create template form
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      category: 'general',
      is_public: false
    }
  })

  // Category options
  const categoryOptions = [
    { value: 'all', label_ar: 'جميع الفئات', label_en: 'All Categories' },
    { value: 'general', label_ar: 'عام', label_en: 'General' },
    { value: 'autism', label_ar: 'اضطراب طيف التوحد', label_en: 'Autism Spectrum Disorder' },
    { value: 'intellectual_disability', label_ar: 'الإعاقة الذهنية', label_en: 'Intellectual Disability' },
    { value: 'multiple_disabilities', label_ar: 'الإعاقات المتعددة', label_en: 'Multiple Disabilities' },
    { value: 'specific_learning_disability', label_ar: 'صعوبات التعلم المحددة', label_en: 'Specific Learning Disability' }
  ]

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData & { template_data: any, goal_templates: any[], service_templates: any[] }) => {
      const { data: result, error } = await supabase
        .from('iep_templates')
        .insert({
          name_ar: data.name_ar,
          name_en: data.name_en,
          description_ar: data.description_ar,
          description_en: data.description_en,
          category: data.category,
          template_data: JSON.stringify(data.template_data),
          goal_templates: JSON.stringify(data.goal_templates),
          service_templates: JSON.stringify(data.service_templates),
          is_public: data.is_public
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iep-templates'] })
      setCreateDialogOpen(false)
      form.reset()
      toast({
        title: language === 'ar' ? 'تم الإنشاء بنجاح' : 'Template Created',
        description: language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully',
      })
    }
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('iep_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iep-templates'] })
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Template Deleted',
        description: language === 'ar' ? 'تم حذف القالب بنجاح' : 'Template deleted successfully',
      })
    }
  })

  // Use template
  const useTemplate = (template: IEPTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template)
    }
  }

  // Create IEP from template
  const createFromTemplate = async (template: IEPTemplate) => {
    try {
      const iepData: CreateIEPData = {
        ...template.template_data,
        academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        effective_date: new Date().toISOString().split('T')[0],
        annual_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      } as CreateIEPData

      await createIEPMutation.mutateAsync(iepData)
      
      // Update use count
      await supabase
        .from('iep_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', template.id)

      toast({
        title: language === 'ar' ? 'تم الإنشاء' : 'IEP Created',
        description: language === 'ar' ? 'تم إنشاء البرنامج التعليمي الفردي من القالب' : 'IEP created from template',
      })
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إنشاء البرنامج التعليمي الفردي' : 'Failed to create IEP',
        variant: 'destructive'
      })
    }
  }

  // Toggle favorite
  const toggleFavorite = async (templateId: string, isFavorite: boolean) => {
    const { error } = await supabase
      .from('user_template_favorites')
      .upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        template_id: templateId,
        is_favorite: !isFavorite
      })

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['iep-templates'] })
    }
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileTemplate className="w-6 h-6" />
          <h2 className={cn("text-2xl font-bold", isRTL ? "font-arabic" : "")}>
            {language === 'ar' ? 'قوالب البرامج التعليمية الفردية' : 'IEP Templates'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {showDuplication && (
            <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" />
                  {language === 'ar' ? 'نسخ من موجود' : 'Duplicate Existing'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className={isRTL ? "font-arabic" : ""}>
                    {language === 'ar' ? 'نسخ برنامج تعليمي فردي' : 'Duplicate IEP'}
                  </DialogTitle>
                  <DialogDescription>
                    {language === 'ar' 
                      ? 'اختر برنامج تعليمي فردي لإنشاء نسخة منه'
                      : 'Select an existing IEP to create a copy'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedIEP} onValueChange={setSelectedIEP}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر البرنامج التعليمي الفردي' : 'Select IEP'} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* This would be populated with existing IEPs */}
                    </SelectContent>
                  </Select>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button onClick={() => {/* Handle duplication */}} disabled={!selectedIEP}>
                      {language === 'ar' ? 'إنشاء نسخة' : 'Create Copy'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'قالب جديد' : 'New Template'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className={isRTL ? "font-arabic" : ""}>
                  {language === 'ar' ? 'إنشاء قالب جديد' : 'Create New Template'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' 
                    ? 'أنشئ قالب جديد لتسريع إنشاء البرامج التعليمية الفردية'
                    : 'Create a new template to speed up IEP creation'
                  }
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form 
                  onSubmit={form.handleSubmit((data) => {
                    createTemplateMutation.mutate({
                      ...data,
                      template_data: {},
                      goal_templates: [],
                      service_templates: []
                    })
                  })}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'اسم القالب (عربي) *' : 'Template Name (Arabic) *'}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'أدخل اسم القالب' : 'Enter template name'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'اسم القالب (إنجليزي)' : 'Template Name (English)'}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={language === 'ar' ? 'أدخل اسم القالب بالإنجليزية' : 'Enter template name in English'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الفئة' : 'Category'}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.slice(1).map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {language === 'ar' ? option.label_ar : option.label_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="description_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_public"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-1"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {language === 'ar' ? 'قالب عام (متاح للجميع)' : 'Public Template (Available to all users)'}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending
                        ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                        : (language === 'ar' ? 'إنشاء القالب' : 'Create Template')
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Label>{language === 'ar' ? 'تصفية حسب الفئة:' : 'Filter by category:'}</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {language === 'ar' ? option.label_ar : option.label_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : templates && templates.length > 0 ? (
          templates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className={cn("text-lg", isRTL ? "font-arabic" : "")}>
                      {language === 'ar' ? template.name_ar : template.name_en || template.name_ar}
                    </CardTitle>
                    <Badge variant="outline">
                      {language === 'ar' 
                        ? categoryOptions.find(c => c.value === template.category)?.label_ar
                        : categoryOptions.find(c => c.value === template.category)?.label_en
                      }
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(template.id, template.is_favorite)}
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      template.is_favorite ? "fill-yellow-400 text-yellow-400" : ""
                    )} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {template.description_ar && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'ar' ? template.description_ar : template.description_en || template.description_ar}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {template.created_by_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(template.created_at), 'MMM d, yyyy', {
                        locale: language === 'ar' ? ar : undefined
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Target className="w-3 h-3" />
                      {language === 'ar' ? `${template.use_count} استخدام` : `${template.use_count} uses`}
                    </Badge>
                    {template.is_public && (
                      <Badge variant="outline">
                        {language === 'ar' ? 'عام' : 'Public'}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        {language === 'ar' ? 'عرض' : 'View'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-3 h-3 mr-1" />
                        {language === 'ar' ? 'تحرير' : 'Edit'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => useTemplate(template)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {language === 'ar' ? 'استخدام' : 'Use'}
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => createFromTemplate(template)}
                        disabled={createIEPMutation.isPending}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {language === 'ar' ? 'إنشاء' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileTemplate className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className={cn("text-lg font-semibold mb-2", isRTL ? "font-arabic" : "")}>
              {language === 'ar' ? 'لا توجد قوالب' : 'No Templates Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'أنشئ قالب جديد لتسريع إنشاء البرامج التعليمية الفردية'
                : 'Create a new template to speed up IEP creation'
              }
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إنشاء قالب جديد' : 'Create New Template'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}