import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Calculator } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { planSchema, PlanFormData } from '@/lib/validations'
import { TherapyPlan } from '@/types/plans'
import { useCategories } from '@/hooks/useCategories'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'

interface PlanFormProps {
  initialData?: Partial<TherapyPlan>
  onSubmit: (data: PlanFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// Session type options
const sessionTypeOptions = [
  { value: 'speech_language', label_ar: 'اللغة والتخاطب', label_en: 'Speech & Language' },
  { value: 'occupational', label_ar: 'العلاج الوظيفي', label_en: 'Occupational Therapy' },
  { value: 'psychological', label_ar: 'العلاج النفسي والسلوكي', label_en: 'Psychological & Behavioral' },
  { value: 'educational', label_ar: 'التعليمي', label_en: 'Educational' }
]

export type SessionType = {
  type: 'speech_language' | 'occupational' | 'psychological' | 'educational'
  duration_minutes: number
  sessions_per_week: number
  duration_weeks: number
}

export const PlanForm = ({ initialData, onSubmit, onCancel, isLoading }: PlanFormProps) => {
  const { data: categories = [] } = useCategories()
  const { language, isRTL } = useLanguage()
  
  const [materials, setMaterials] = useState<string[]>(initialData?.materials_needed || [])
  const [objectives, setObjectives] = useState<string[]>(initialData?.learning_objectives || [])
  const [newMaterial, setNewMaterial] = useState('')
  const [newObjective, setNewObjective] = useState('')
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([
    {
      type: 'speech_language',
      duration_minutes: 45,
      sessions_per_week: 2,
      duration_weeks: 8
    }
  ])

  // Calculate totals for display - defined early to avoid hoisting issues
  const getTotalSessions = () => {
    return sessionTypes.reduce((total, type) => {
      return total + (type.sessions_per_week * type.duration_weeks)
    }, 0)
  }

  const getTotalSessionsPerWeek = () => {
    return sessionTypes.reduce((total, type) => {
      return total + type.sessions_per_week
    }, 0)
  }

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name_ar: initialData?.name_ar || '',
      name_en: initialData?.name_en || '',
      description_ar: initialData?.description_ar || '',
      description_en: initialData?.description_en || '',
      category_id: initialData?.category_id || '',
      session_types: sessionTypes,
      program_price: 0,
      price_includes_followup: false,
      duration_weeks: initialData?.duration_weeks || 8,
      sessions_per_week: initialData?.sessions_per_week || 2,
      price_per_session: initialData?.price_per_session || 0,
      discount_percentage: initialData?.discount_percentage || 0,
      target_age_min: initialData?.target_age_min || undefined,
      target_age_max: initialData?.target_age_max || undefined,
      max_students_per_session: initialData?.max_students_per_session || 1,
      prerequisites: initialData?.prerequisites || '',
      is_featured: initialData?.is_featured || false,
      materials_needed: materials,
      learning_objectives: objectives,
    },
  })

  // Watch form values for calculations
  const watchedValues = form.watch(['price_per_session', 'discount_percentage', 'program_price'])
  const [pricePerSession, discountPercentage, programPrice] = watchedValues

  // Calculate totals using session types data
  const totalSessions = getTotalSessions() // Use session types total
  const totalSessionsPerWeek = getTotalSessionsPerWeek() // Use session types total
  const totalPrice = programPrice || (totalSessions * pricePerSession) // Use program price first, fallback to calculated
  const discountAmount = (totalPrice * discountPercentage) / 100
  const finalPrice = totalPrice - discountAmount

  const addMaterial = () => {
    if (newMaterial.trim()) {
      const updatedMaterials = [...materials, newMaterial.trim()]
      setMaterials(updatedMaterials)
      form.setValue('materials_needed', updatedMaterials)
      setNewMaterial('')
    }
  }

  const removeMaterial = (index: number) => {
    const updatedMaterials = materials.filter((_, i) => i !== index)
    setMaterials(updatedMaterials)
    form.setValue('materials_needed', updatedMaterials)
  }

  const addObjective = () => {
    if (newObjective.trim()) {
      const updatedObjectives = [...objectives, newObjective.trim()]
      setObjectives(updatedObjectives)
      form.setValue('learning_objectives', updatedObjectives)
      setNewObjective('')
    }
  }

  const removeObjective = (index: number) => {
    const updatedObjectives = objectives.filter((_, i) => i !== index)
    setObjectives(updatedObjectives)
    form.setValue('learning_objectives', updatedObjectives)
  }

  // Session type management functions
  const addSessionType = () => {
    const newSessionType: SessionType = {
      type: 'speech_language',
      duration_minutes: 45,
      sessions_per_week: 1,
      duration_weeks: 8
    }
    const updatedTypes = [...sessionTypes, newSessionType]
    setSessionTypes(updatedTypes)
    form.setValue('session_types', updatedTypes)
  }

  const removeSessionType = (index: number) => {
    const updatedTypes = sessionTypes.filter((_, i) => i !== index)
    setSessionTypes(updatedTypes)
    form.setValue('session_types', updatedTypes)
  }

  const updateSessionType = (index: number, field: keyof SessionType, value: string | number) => {
    const updatedTypes = sessionTypes.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value }
      }
      return item
    })
    setSessionTypes(updatedTypes)
    form.setValue('session_types', updatedTypes)
    
    // Update legacy fields for calculations
    calculateTotals(updatedTypes)
  }

  // Calculate totals from session types
  const calculateTotals = (types: SessionType[]) => {
    const totalWeeksPerSession = types.reduce((sum, type) => sum + type.duration_weeks, 0)
    const totalSessionsPerWeek = types.reduce((sum, type) => sum + type.sessions_per_week, 0)
    const avgWeeks = types.length > 0 ? Math.round(totalWeeksPerSession / types.length) : 8
    
    form.setValue('duration_weeks', avgWeeks)
    form.setValue('sessions_per_week', totalSessionsPerWeek)
  }


  const handleSubmit = async (data: PlanFormData) => {
    try {
      await onSubmit({
        ...data,
        materials_needed: materials,
        learning_objectives: objectives,
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className={`text-xl sm:text-2xl ${language === 'ar' ? 'font-arabic' : ''}`}>
            {initialData 
              ? (language === 'ar' ? 'تعديل البرنامج العلاجي' : 'Edit Therapy Plan')
              : (language === 'ar' ? 'إضافة برنامج علاجي جديد' : 'Add New Therapy Plan')
            }
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className={`grid w-full grid-cols-4 ${language === 'ar' ? 'font-arabic' : ''} text-xs sm:text-sm`}>
                  <TabsTrigger value="basic" className="px-1 sm:px-3">
                    <span className="hidden sm:inline">{language === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}</span>
                    <span className="sm:hidden">{language === 'ar' ? 'أساسي' : 'Basic'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="content" className="px-1 sm:px-3">
                    <span className="hidden sm:inline">{language === 'ar' ? 'المحتوى' : 'Content'}</span>
                    <span className="sm:hidden">{language === 'ar' ? 'محتوى' : 'Content'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="px-1 sm:px-3">
                    <span className="hidden sm:inline">{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                    <span className="sm:hidden">{language === 'ar' ? 'تفاصيل' : 'Details'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="px-1 sm:px-3">
                    <span className="hidden sm:inline">{language === 'ar' ? 'التسعير' : 'Pricing'}</span>
                    <span className="sm:hidden">{language === 'ar' ? 'سعر' : 'Price'}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم البرنامج (عربي) *' : 'Plan Name (Arabic) *'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={language === 'ar' ? "مثال: برنامج علاج النطق المتقدم" : "e.g., Advanced Speech Therapy Program"}
                              {...field}
                              className={`${isRTL ? 'text-right' : 'text-left'}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
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
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'اسم البرنامج (إنجليزي)' : 'Plan Name (English)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Advanced Speech Therapy Program"
                              {...field}
                              className="text-left"
                              dir="ltr"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'التصنيف *' : 'Category *'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? "اختر التصنيف" : "Select category"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color_code }}
                                  />
                                  <span className={language === 'ar' ? 'font-arabic' : ''}>
                                    {language === 'ar' ? category.name_ar : (category.name_en || category.name_ar)}
                                  </span>
                                </div>
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
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={language === 'ar' ? "وصف مفصل للبرنامج العلاجي..." : "Detailed description of the therapy program..."}
                              className={`resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                              rows={4}
                              {...field}
                            />
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
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of the therapy program..."
                              className="text-left resize-none"
                              dir="ltr"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Content Tab - Session Types */}
                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'أنواع الجلسات' : 'Session Types'}
                      </h3>
                      <Button type="button" onClick={addSessionType} variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                        {language === 'ar' ? 'إضافة نوع جلسة' : 'Add Session Type'}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {sessionTypes.map((sessionType, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                                {language === 'ar' ? `جلسة ${index + 1}` : `Session ${index + 1}`}
                              </h4>
                              {sessionTypes.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeSessionType(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Session Type Dropdown */}
                              <div>
                                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'نوع الجلسة *' : 'Session Type *'}
                                </Label>
                                <Select
                                  value={sessionType.type}
                                  onValueChange={(value) => updateSessionType(index, 'type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sessionTypeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <span className={language === 'ar' ? 'font-arabic' : ''}>
                                          {language === 'ar' ? option.label_ar : option.label_en}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Duration in Minutes */}
                              <div>
                                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'مدة الجلسة (دقيقة) *' : 'Duration (minutes) *'}
                                </Label>
                                <Input
                                  type="number"
                                  min="15"
                                  max="180"
                                  value={sessionType.duration_minutes}
                                  onChange={(e) => updateSessionType(index, 'duration_minutes', Number(e.target.value))}
                                />
                              </div>

                              {/* Sessions per Week */}
                              <div>
                                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'الجلسات/الأسبوع *' : 'Sessions/Week *'}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="7"
                                  value={sessionType.sessions_per_week}
                                  onChange={(e) => updateSessionType(index, 'sessions_per_week', Number(e.target.value))}
                                />
                              </div>

                              {/* Duration in Weeks */}
                              <div>
                                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? 'المدة (أسابيع) *' : 'Duration (weeks) *'}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="52"
                                  value={sessionType.duration_weeks}
                                  onChange={(e) => updateSessionType(index, 'duration_weeks', Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {/* Session Type Summary */}
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                                    {language === 'ar' ? 'العدد الإجمالي للجلسات:' : 'Total sessions:'}
                                  </span>
                                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium`}>
                                    {sessionType.sessions_per_week * sessionType.duration_weeks}
                                  </span>
                                </div>
                                <div>
                                  <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                                    {language === 'ar' ? 'نوع الجلسة:' : 'Session type:'}
                                  </span>
                                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                                    {sessionTypeOptions.find(opt => opt.value === sessionType.type)?.[language === 'ar' ? 'label_ar' : 'label_en']}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Overall Summary */}
                    <Card className="p-4 bg-primary/5">
                      <h4 className={`font-semibold mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'ملخص البرنامج' : 'Program Summary'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'العدد الإجمالي للجلسات:' : 'Total sessions:'}
                          </span>
                          <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-bold text-primary`}>
                            {getTotalSessions()}
                          </span>
                        </div>
                        <div>
                          <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'عدد الجلسات في الأسبوع:' : 'Sessions per week:'}
                          </span>
                          <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-bold text-primary`}>
                            {getTotalSessionsPerWeek()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="duration_weeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'مدة البرنامج (أسابيع) *' : 'Duration (weeks) *'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="52"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sessions_per_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الجلسات الأسبوعية *' : 'Sessions per week *'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="7"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} p-3 bg-muted rounded-lg`}>
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <div>
                          <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'إجمالي الجلسات:' : 'Total sessions:'}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {totalSessions}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'جلسات/أسبوع:' : 'Sessions/week:'} <span className="font-medium text-primary">{totalSessionsPerWeek}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="target_age_min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'العمر الأدنى (سنوات)' : 'Min age (years)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="18"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="target_age_max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'العمر الأعلى (سنوات)' : 'Max age (years)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="18"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_students_per_session"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'عدد الطلاب/الجلسة' : 'Students per session'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowed_freeze_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'أيام تجميد الاشتراك المسموح' : 'Allowed freeze days'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="365"
                              placeholder={language === 'ar' ? 'عدد الأيام' : 'Number of days'}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="prerequisites"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'المتطلبات المسبقة' : 'Prerequisites'}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === 'ar' ? "أي متطلبات أو شروط مسبقة للانضمام للبرنامج..." : "Any requirements or conditions for joining the program..."}
                            className={`resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Materials Needed */}
                  <div className="space-y-2">
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}
                    </FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder={language === 'ar' ? "إضافة مادة مطلوبة..." : "Add required material..."}
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                        className={`${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Button type="button" onClick={addMaterial} variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {materials.map((material, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {material}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeMaterial(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'أهداف التعلم' : 'Learning Objectives'}
                    </FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder={language === 'ar' ? "إضافة هدف تعليمي..." : "Add learning objective..."}
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                        className={`${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Button type="button" onClick={addObjective} variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {objectives.map((objective, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {objective}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeObjective(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-4">
                  <div className="space-y-6">
                    {/* Program Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="program_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'سعر البرنامج الكامل (ر.س) *' : 'Total Program Price (SAR) *'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                placeholder={language === 'ar' ? 'أدخل سعر البرنامج الكامل' : 'Enter total program price'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Legacy price per session for compatibility */}
                      <FormField
                        control={form.control}
                        name="price_per_session"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' ? 'سعر الجلسة الواحدة (ر.س)' : 'Price per session (SAR)'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                placeholder={language === 'ar' ? 'اختياري - للحسابات' : 'Optional - for calculations'}
                              />
                            </FormControl>
                            <FormDescription>
                              {language === 'ar' ? 'يُحسب تلقائياً من سعر البرنامج' : 'Calculated automatically from program price'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="discount_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'نسبة الخصم (%)' : 'Discount percentage (%)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Follow-up Checkbox */}
                    <FormField
                      control={form.control}
                      name="price_includes_followup"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'الأسعار تشمل الاشتراك مواعيد المتابعة الطبية الدورية' : 'Price includes medical follow-up subscription'}
                            </FormLabel>
                            <FormDescription className={language === 'ar' ? 'font-arabic' : ''}>
                              {language === 'ar' 
                                ? 'فعّل هذا الخيار إذا كان سعر البرنامج يشمل مواعيد المتابعة الطبية'
                                : 'Enable this if the program price includes medical follow-up appointments'
                              }
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Pricing Summary */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'ملخص التسعير' : 'Pricing Summary'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'إجمالي الجلسات:' : 'Total sessions:'}
                        </span>
                        <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium`}>
                          {totalSessions} {language === 'ar' ? 'جلسة' : 'sessions'}
                        </span>
                      </div>
                      <div>
                        <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'جلسات/أسبوع:' : 'Sessions/week:'}
                        </span>
                        <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium`}>
                          {totalSessionsPerWeek} {language === 'ar' ? 'جلسة' : 'sessions'}
                        </span>
                      </div>
                      <div>
                        <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'سعر البرنامج:' : 'Program price:'}
                        </span>
                        <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium`}>
                          {formatCurrency(programPrice || 0)}
                        </span>
                      </div>
                      <div>
                        <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الخصم:' : 'Discount:'}
                        </span>
                        <span className={`${isRTL ? 'mr-2' : 'ml-2'} font-medium`}>
                          {discountPercentage}% ({formatCurrency(discountAmount)})
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t">
                        <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'السعر النهائي:' : 'Final price:'}
                        </span>
                        <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-lg font-bold text-primary`}>
                          {formatCurrency(finalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'برنامج مميز' : 'Featured program'}
                          </FormLabel>
                          <FormDescription className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' 
                              ? 'عرض هذا البرنامج كبرنامج مميز في الصفحة الرئيسية'
                              : 'Display this program as featured on the main page'
                            }
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} gap-4 pt-6 border-t`}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : initialData 
                      ? (language === 'ar' ? 'تحديث البرنامج' : 'Update Plan')
                      : (language === 'ar' ? 'إنشاء البرنامج' : 'Create Plan')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}