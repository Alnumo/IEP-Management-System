import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, ArrowLeft, Plus, X, FileText, Settings, Target, DollarSign } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateTherapyProgramData } from '@/types/therapy-programs'

// Session type schema for program content
const sessionTypeSchema = z.object({
  id: z.string().optional(),
  session_type: z.string().min(1, 'Session type is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes').max(180, 'Duration cannot exceed 3 hours'),
  sessions_per_week: z.number().min(1, 'At least 1 session per week required').max(7, 'Cannot exceed 7 sessions per week'),
  duration_weeks: z.number().min(1, 'Duration must be at least 1 week').max(52, 'Duration cannot exceed 52 weeks'),
})

const therapyProgramSchema = z.object({
  // Basic Information
  program_code: z.string().min(2, 'Program code must be at least 2 characters'),
  name_ar: z.string().min(2, 'Arabic name is required'),
  name_en: z.string().min(2, 'English name is required'),
  category: z.enum(['aba', 'speech', 'occupational', 'physical', 'behavioral', 'developmental', 'sensory', 'communication', 'motor', 'intensive']),
  
  // Program Content - Session Types
  session_types: z.array(sessionTypeSchema).min(1, 'At least one session type is required'),
  
  // Program Configuration
  duration_weeks: z.number().min(1, 'Duration must be at least 1 week').max(52, 'Duration cannot exceed 52 weeks'),
  sessions_per_week: z.number().min(1, 'At least 1 session per week').max(7, 'Cannot exceed 7 sessions per week'),
  allowed_freeze_days: z.number().min(0, 'Freeze days cannot be negative').max(365, 'Freeze days cannot exceed 365 days').default(0),
  
  // Description
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  
  // Objectives and Target Conditions
  objectives_ar: z.array(z.string()).optional(),
  objectives_en: z.array(z.string()).optional(),
  target_conditions: z.array(z.string()).optional(),
  
  // Pricing
  total_program_price: z.number().min(0, 'Price cannot be negative'),
  discount_percentage: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').default(0),
  includes_medical_followup: z.boolean().default(false),
  
  // Additional fields
  intensity_level: z.enum(['low', 'moderate', 'high', 'intensive']).default('moderate'),
  minimum_age_months: z.number().min(0).max(300).default(24),
  maximum_age_months: z.number().min(0).max(300).default(144),
  requires_medical_clearance: z.boolean().default(false),
}).refine(data => data.maximum_age_months > data.minimum_age_months, {
  message: "Maximum age must be greater than minimum age",
  path: ["maximum_age_months"]
})

type TherapyProgramFormData = z.infer<typeof therapyProgramSchema>

interface TherapyProgramFormProps {
  onSubmit: (data: CreateTherapyProgramData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateTherapyProgramData>
}

export default function TherapyProgramForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: TherapyProgramFormProps) {
  const { language, isRTL } = useLanguage()
  const [objectivesAr, setObjectivesAr] = useState<string>('')
  const [objectivesEn, setObjectivesEn] = useState<string>('')
  const [targetConditions, setTargetConditions] = useState<string>('')
  const [sessionTypes, setSessionTypes] = useState<Array<z.infer<typeof sessionTypeSchema>>>([
    {
      id: '1',
      session_type: '',
      duration_minutes: 60,
      sessions_per_week: 2,
      duration_weeks: 12,
    }
  ])
  const [currentTab, setCurrentTab] = useState<'basic' | 'content' | 'config' | 'description' | 'objectives' | 'pricing'>('basic')

  const form = useForm<TherapyProgramFormData>({
    resolver: zodResolver(therapyProgramSchema),
    defaultValues: {
      program_code: initialData?.program_code || '',
      name_ar: initialData?.name_ar || '',
      name_en: initialData?.name_en || '',
      category: initialData?.category || 'aba',
      session_types: sessionTypes,
      duration_weeks: 12,
      sessions_per_week: 3,
      allowed_freeze_days: 0,
      description_ar: initialData?.description_ar || '',
      description_en: initialData?.description_en || '',
      objectives_ar: initialData?.objectives_ar || [],
      objectives_en: initialData?.objectives_en || [],
      target_conditions: initialData?.target_conditions || [],
      total_program_price: 0,
      discount_percentage: 0,
      includes_medical_followup: false,
      intensity_level: initialData?.intensity_level || 'moderate',
      minimum_age_months: initialData?.minimum_age_months || 24,
      maximum_age_months: initialData?.maximum_age_months || 144,
      requires_medical_clearance: initialData?.requires_medical_clearance || false,
    }
  })

  const addSessionType = () => {
    const newSessionType = {
      id: Date.now().toString(),
      session_type: '',
      duration_minutes: 60,
      sessions_per_week: 2,
      duration_weeks: 12,
    }
    setSessionTypes([...sessionTypes, newSessionType])
    form.setValue('session_types', [...sessionTypes, newSessionType])
  }

  const removeSessionType = (id: string) => {
    if (sessionTypes.length > 1) {
      const updatedTypes = sessionTypes.filter(type => type.id !== id)
      setSessionTypes(updatedTypes)
      form.setValue('session_types', updatedTypes)
    }
  }

  const updateSessionType = (id: string, field: string, value: any) => {
    const updatedTypes = sessionTypes.map(type => 
      type.id === id ? { ...type, [field]: value } : type
    )
    setSessionTypes(updatedTypes)
    form.setValue('session_types', updatedTypes)
  }

  const calculateTotalSessions = () => {
    return sessionTypes.reduce((total, type) => 
      total + (type.sessions_per_week * type.duration_weeks), 0
    )
  }

  const calculateWeeklySessions = () => {
    return sessionTypes.reduce((total, type) => total + type.sessions_per_week, 0)
  }

  const calculatePricePerSession = () => {
    const totalSessions = calculateTotalSessions()
    const totalPrice = form.watch('total_program_price') || 0
    return totalSessions > 0 ? totalPrice / totalSessions : 0
  }

  const calculateFinalPrice = () => {
    const totalPrice = form.watch('total_program_price') || 0
    const discount = form.watch('discount_percentage') || 0
    const discountAmount = (totalPrice * discount) / 100
    return totalPrice - discountAmount
  }

  const handleSubmit = (data: TherapyProgramFormData) => {
    const formData: CreateTherapyProgramData = {
      ...data,
      session_types: sessionTypes,
      objectives_ar: objectivesAr ? objectivesAr.split('\n').filter(obj => obj.trim()) : [],
      objectives_en: objectivesEn ? objectivesEn.split('\n').filter(obj => obj.trim()) : [],
      target_conditions: targetConditions ? targetConditions.split(',').map(c => c.trim()).filter(c => c) : [],
    }
    onSubmit(formData)
  }

  const getCategoryText = (category: string) => {
    const categoryMap = {
      'aba': language === 'ar' ? 'تحليل السلوك التطبيقي' : 'ABA',
      'speech': language === 'ar' ? 'علاج النطق واللغة' : 'Speech & Language',
      'occupational': language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy',
      'physical': language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy',
      'behavioral': language === 'ar' ? 'سلوكي' : 'Behavioral',
      'developmental': language === 'ar' ? 'تطويري' : 'Developmental',
      'sensory': language === 'ar' ? 'حسي' : 'Sensory',
      'communication': language === 'ar' ? 'تواصل' : 'Communication',
      'motor': language === 'ar' ? 'حركي' : 'Motor',
      'intensive': language === 'ar' ? 'مكثف' : 'Intensive'
    }
    return categoryMap[category as keyof typeof categoryMap] || category
  }

  const getSessionTypeOptions = () => [
    { value: 'Speech & Language', label: language === 'ar' ? 'علاج النطق واللغة' : 'Speech & Language' },
    { value: 'Occupational Therapy', label: language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy' },
    { value: 'Physical Therapy', label: language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy' },
    { value: 'ABA Therapy', label: language === 'ar' ? 'تحليل السلوك التطبيقي' : 'ABA Therapy' },
    { value: 'Behavioral Therapy', label: language === 'ar' ? 'العلاج السلوكي' : 'Behavioral Therapy' },
    { value: 'Sensory Integration', label: language === 'ar' ? 'التكامل الحسي' : 'Sensory Integration' },
    { value: 'Social Skills', label: language === 'ar' ? 'المهارات الاجتماعية' : 'Social Skills' },
    { value: 'Academic Support', label: language === 'ar' ? 'الدعم الأكاديمي' : 'Academic Support' },
  ]

  const tabs = [
    { id: 'basic', label: language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information', icon: FileText },
    { id: 'content', label: language === 'ar' ? 'محتوى البرنامج' : 'Program Content', icon: Target },
    { id: 'config', label: language === 'ar' ? 'إعدادات البرنامج' : 'Program Configuration', icon: Settings },
    { id: 'description', label: language === 'ar' ? 'وصف البرنامج' : 'Program Description', icon: FileText },
    { id: 'objectives', label: language === 'ar' ? 'الأهداف والحالات المستهدفة' : 'Objectives & Target Conditions', icon: Target },
    { id: 'pricing', label: language === 'ar' ? 'التسعير' : 'Pricing', icon: DollarSign },
  ]


  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`
                  ${currentTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Information Tab */}
          {currentTab === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <FileText className="h-5 w-5" />
                  {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <FormField
                  control={form.control}
                  name="program_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رمز البرنامج *' : 'Program Code *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={language === 'ar' ? 'مثال: ABA-01' : 'e.g., ABA-01'} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'اسم البرنامج (عربي) *' : 'Program Name (Arabic) *'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={language === 'ar' ? 'ادخل اسم البرنامج بالعربية' : 'Enter Arabic name'}
                            {...field} 
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
                          {language === 'ar' ? 'اسم البرنامج (إنجليزي)' : 'Program Name (English)'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={language === 'ar' ? 'ادخل اسم البرنامج بالإنجليزية' : 'Enter English name'}
                            {...field} 
                          />
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
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'فئة البرنامج' : 'Program Category'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aba">{getCategoryText('aba')}</SelectItem>
                          <SelectItem value="speech">{getCategoryText('speech')}</SelectItem>
                          <SelectItem value="occupational">{getCategoryText('occupational')}</SelectItem>
                          <SelectItem value="physical">{getCategoryText('physical')}</SelectItem>
                          <SelectItem value="behavioral">{getCategoryText('behavioral')}</SelectItem>
                          <SelectItem value="developmental">{getCategoryText('developmental')}</SelectItem>
                          <SelectItem value="sensory">{getCategoryText('sensory')}</SelectItem>
                          <SelectItem value="communication">{getCategoryText('communication')}</SelectItem>
                          <SelectItem value="motor">{getCategoryText('motor')}</SelectItem>
                          <SelectItem value="intensive">{getCategoryText('intensive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>
          )}

          {/* Program Content Tab */}
          {currentTab === 'content' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Target className="h-5 w-5" />
                  {language === 'ar' ? 'محتوى البرنامج' : 'Program Content'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'أنواع الجلسات' : 'Session Types'}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSessionType}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {language === 'ar' ? 'إضافة نوع جلسة' : 'Add Session Type'}
                    </Button>
                  </div>

                  {sessionTypes.map((sessionType, index) => (
                    <Card key={sessionType.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <CardTitle className="text-base">
                            {language === 'ar' ? `جلسة ${index + 1}` : `Session ${index + 1}`}
                          </CardTitle>
                          {sessionTypes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSessionType(sessionType.id!)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'نوع الجلسة *' : 'Session Type *'}
                            </label>
                            <Select 
                              value={sessionType.session_type} 
                              onValueChange={(value) => updateSessionType(sessionType.id!, 'session_type', value)}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder={language === 'ar' ? 'اختر نوع الجلسة' : 'Select session type'} />
                              </SelectTrigger>
                              <SelectContent>
                                {getSessionTypeOptions().map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'المدة (دقائق) *' : 'Duration (minutes) *'}
                            </label>
                            <Input
                              type="number"
                              min="15"
                              max="180"
                              step="15"
                              value={sessionType.duration_minutes}
                              onChange={(e) => updateSessionType(sessionType.id!, 'duration_minutes', Number(e.target.value))}
                              className="mt-2"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'الجلسات/الأسبوع *' : 'Sessions/Week *'}
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="7"
                              value={sessionType.sessions_per_week}
                              onChange={(e) => updateSessionType(sessionType.id!, 'sessions_per_week', Number(e.target.value))}
                              className="mt-2"
                            />
                          </div>
                          
                          <div>
                            <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'المدة (أسابيع) *' : 'Duration (weeks) *'}
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="52"
                              value={sessionType.duration_weeks}
                              onChange={(e) => updateSessionType(sessionType.id!, 'duration_weeks', Number(e.target.value))}
                              className="mt-2"
                            />
                          </div>
                        </div>

                        {/* Session Summary */}
                        <div className="bg-muted p-3 rounded">
                          <div className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            <span className="font-medium">
                              {language === 'ar' ? 'إجمالي الجلسات: ' : 'Total sessions: '}
                            </span>
                            {sessionType.sessions_per_week * sessionType.duration_weeks}
                            <br />
                            <span className="font-medium">
                              {language === 'ar' ? 'نوع الجلسة: ' : 'Session type: '}
                            </span>
                            {sessionType.session_type || (language === 'ar' ? 'لم يتم الاختيار' : 'Not selected')}
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  ))}

                  {/* Program Summary */}
                  <Card className="bg-primary/5">
                    <CardHeader>
                      <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'ملخص البرنامج' : 'Program Summary'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <div>
                          <span className="font-medium">
                            {language === 'ar' ? 'إجمالي الجلسات: ' : 'Total sessions: '}
                          </span>
                          <Badge variant="secondary">{calculateTotalSessions()}</Badge>
                        </div>
                        <div>
                          <span className="font-medium">
                            {language === 'ar' ? 'الجلسات في الأسبوع: ' : 'Sessions per week: '}
                          </span>
                          <Badge variant="secondary">{calculateWeeklySessions()}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>

              </CardContent>
            </Card>
          )}

          {/* Program Configuration Tab */}
          {currentTab === 'config' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Settings className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات البرنامج' : 'Program Configuration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="duration_weeks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'المدة (أسابيع) *' : 'Duration (weeks) *'}
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
                          {language === 'ar' ? 'الجلسات في الأسبوع *' : 'Sessions per week *'}
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

                  <FormField
                    control={form.control}
                    name="allowed_freeze_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'أيام التجميد المسموحة' : 'Allowed freeze days'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0" 
                            max="365"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </CardContent>
            </Card>
          )}

          {/* Program Description Tab */}
          {currentTab === 'description' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <FileText className="h-5 w-5" />
                  {language === 'ar' ? 'وصف البرنامج' : 'Program Description'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
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
                          placeholder={language === 'ar' ? 'اكتب وصف البرنامج باللغة العربية' : 'Write program description in Arabic'}
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
                          placeholder={language === 'ar' ? 'اكتب وصف البرنامج باللغة الإنجليزية' : 'Write program description in English'}
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>
          )}

          {/* Objectives and Target Conditions Tab */}
          {currentTab === 'objectives' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Target className="h-5 w-5" />
                  {language === 'ar' ? 'الأهداف والحالات المستهدفة' : 'Objectives and Target Conditions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الأهداف (عربي) - سطر منفصل لكل هدف' : 'Objectives (Arabic) - One per line'}
                  </label>
                  <Textarea
                    placeholder={language === 'ar' ? 'اكتب كل هدف في سطر منفصل' : 'Write each objective on a separate line'}
                    value={objectivesAr}
                    onChange={(e) => setObjectivesAr(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الأهداف (إنجليزي) - سطر منفصل لكل هدف' : 'Objectives (English) - One per line'}
                  </label>
                  <Textarea
                    placeholder={language === 'ar' ? 'اكتب كل هدف في سطر منفصل' : 'Write each objective on a separate line'}
                    value={objectivesEn}
                    onChange={(e) => setObjectivesEn(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الحالات المستهدفة (مفصولة بفاصلة)' : 'Target Conditions (comma-separated)'}
                  </label>
                  <Textarea
                    placeholder={language === 'ar' ? 'مثال: التوحد، تأخر النمو، اضطرابات النطق' : 'e.g., Autism, Developmental Delay, Speech Disorders'}
                    value={targetConditions}
                    onChange={(e) => setTargetConditions(e.target.value)}
                    rows={2}
                  />
                </div>

              </CardContent>
            </Card>
          )}

          {/* Pricing Tab */}
          {currentTab === 'pricing' && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <DollarSign className="h-5 w-5" />
                  {language === 'ar' ? 'التسعير' : 'Pricing'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_program_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                          {language === 'ar' ? 'إجمالي سعر البرنامج (ريال سعودي) *' : 'Total Program Price (SAR) *'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0" 
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'سعر الجلسة الواحدة (ريال سعودي)' : 'Price per session (SAR)'}
                    </label>
                    <div className="mt-2 p-3 bg-muted rounded border">
                      <span className="text-lg font-semibold">
                        {calculatePricePerSession().toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'محسوب تلقائياً من سعر البرنامج' : 'Calculated automatically from program price'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="includes_medical_followup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'السعر يشمل اشتراك المتابعة الطبية' : 'Price includes medical follow-up subscription'}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' 
                              ? 'فعل هذا إذا كان سعر البرنامج يشمل مواعيد المتابعة الطبية' 
                              : 'Enable this if the program price includes medical follow-up appointments'
                            }
                          </p>
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
                <Card className="bg-primary/5">
                  <CardHeader>
                    <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'ملخص التسعير' : 'Pricing Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'إجمالي الجلسات: ' : 'Total sessions: '}
                        </span>
                        <span className="font-semibold">
                          {calculateTotalSessions()} {language === 'ar' ? 'جلسة' : 'sessions'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'الجلسات/الأسبوع: ' : 'Sessions/week: '}
                        </span>
                        <span className="font-semibold">
                          {calculateWeeklySessions()} {language === 'ar' ? 'جلسات' : 'sessions'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'سعر البرنامج: ' : 'Program price: '}
                        </span>
                        <span className="font-semibold">
                          {(form.watch('total_program_price') || 0).toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'الخصم: ' : 'Discount: '}
                        </span>
                        <span className="font-semibold">
                          {form.watch('discount_percentage') || 0}% ({((form.watch('total_program_price') || 0) * (form.watch('discount_percentage') || 0) / 100).toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'})
                        </span>
                      </div>
                      <div className="md:col-span-2 pt-2 border-t">
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'السعر النهائي: ' : 'Final price: '}
                        </span>
                        <span className="font-bold text-lg text-primary">
                          {calculateFinalPrice().toFixed(2)} {language === 'ar' ? 'ر.س' : 'SAR'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (language === 'ar' ? 'حفظ البرنامج' : 'Save Program')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}