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
import { Save, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateTherapyProgramData } from '@/types/therapy-programs'

const therapyProgramSchema = z.object({
  program_code: z.string().min(2, 'Program code must be at least 2 characters'),
  name_ar: z.string().min(2, 'Arabic name is required'),
  name_en: z.string().min(2, 'English name is required'),
  category: z.enum(['intensive', 'therapeutic', 'educational', 'behavioral', 'developmental', 'sensory', 'communication', 'motor']),
  intensity_level: z.enum(['low', 'moderate', 'high', 'intensive']),
  default_sessions_per_week: z.number().min(1).max(7),
  default_session_duration_minutes: z.number().min(15).max(180),
  minimum_age_months: z.number().min(0).max(300),
  maximum_age_months: z.number().min(0).max(300),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  objectives_ar: z.array(z.string()).optional(),
  objectives_en: z.array(z.string()).optional(),
  target_conditions: z.array(z.string()).optional(),
  requires_medical_clearance: z.boolean().optional(),
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
  const { language } = useLanguage()
  const [objectivesAr, setObjectivesAr] = useState<string>('')
  const [objectivesEn, setObjectivesEn] = useState<string>('')
  const [targetConditions, setTargetConditions] = useState<string>('')

  const form = useForm<TherapyProgramFormData>({
    resolver: zodResolver(therapyProgramSchema),
    defaultValues: {
      program_code: initialData?.program_code || '',
      name_ar: initialData?.name_ar || '',
      name_en: initialData?.name_en || '',
      category: initialData?.category || 'therapeutic',
      intensity_level: initialData?.intensity_level || 'moderate',
      default_sessions_per_week: initialData?.default_sessions_per_week || 2,
      default_session_duration_minutes: initialData?.default_session_duration_minutes || 60,
      minimum_age_months: initialData?.minimum_age_months || 24,
      maximum_age_months: initialData?.maximum_age_months || 144,
      description_ar: initialData?.description_ar || '',
      description_en: initialData?.description_en || '',
      objectives_ar: initialData?.objectives_ar || [],
      objectives_en: initialData?.objectives_en || [],
      target_conditions: initialData?.target_conditions || [],
      requires_medical_clearance: initialData?.requires_medical_clearance || false,
    }
  })

  const handleSubmit = (data: TherapyProgramFormData) => {
    const formData: CreateTherapyProgramData = {
      ...data,
      objectives_ar: objectivesAr ? objectivesAr.split('\n').filter(obj => obj.trim()) : [],
      objectives_en: objectivesEn ? objectivesEn.split('\n').filter(obj => obj.trim()) : [],
      target_conditions: targetConditions ? targetConditions.split(',').map(c => c.trim()).filter(c => c) : [],
    }
    onSubmit(formData)
  }

  const getCategoryText = (category: string) => {
    const categoryMap = {
      'intensive': language === 'ar' ? 'مكثف' : 'Intensive',
      'therapeutic': language === 'ar' ? 'علاجي' : 'Therapeutic', 
      'educational': language === 'ar' ? 'تعليمي' : 'Educational',
      'behavioral': language === 'ar' ? 'سلوكي' : 'Behavioral',
      'developmental': language === 'ar' ? 'تطويري' : 'Developmental',
      'sensory': language === 'ar' ? 'حسي' : 'Sensory',
      'communication': language === 'ar' ? 'تواصل' : 'Communication',
      'motor': language === 'ar' ? 'حركي' : 'Motor'
    }
    return categoryMap[category as keyof typeof categoryMap] || category
  }

  const getIntensityText = (intensity: string) => {
    const intensityMap = {
      'low': language === 'ar' ? 'منخفض' : 'Low',
      'moderate': language === 'ar' ? 'متوسط' : 'Moderate',
      'high': language === 'ar' ? 'عالي' : 'High',
      'intensive': language === 'ar' ? 'مكثف' : 'Intensive'
    }
    return intensityMap[intensity as keyof typeof intensityMap] || intensity
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="program_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رمز البرنامج' : 'Program Code'}
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
                          <SelectItem value="intensive">{getCategoryText('intensive')}</SelectItem>
                          <SelectItem value="therapeutic">{getCategoryText('therapeutic')}</SelectItem>
                          <SelectItem value="educational">{getCategoryText('educational')}</SelectItem>
                          <SelectItem value="behavioral">{getCategoryText('behavioral')}</SelectItem>
                          <SelectItem value="developmental">{getCategoryText('developmental')}</SelectItem>
                          <SelectItem value="sensory">{getCategoryText('sensory')}</SelectItem>
                          <SelectItem value="communication">{getCategoryText('communication')}</SelectItem>
                          <SelectItem value="motor">{getCategoryText('motor')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم البرنامج (عربي)' : 'Program Name (Arabic)'}
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

            </CardContent>
          </Card>

          {/* Program Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'إعدادات البرنامج' : 'Program Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="intensity_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الكثافة' : 'Intensity Level'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">{getIntensityText('low')}</SelectItem>
                          <SelectItem value="moderate">{getIntensityText('moderate')}</SelectItem>
                          <SelectItem value="high">{getIntensityText('high')}</SelectItem>
                          <SelectItem value="intensive">{getIntensityText('intensive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requires_medical_clearance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'يتطلب تصريح طبي' : 'Requires Medical Clearance'}
                        </FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="default_sessions_per_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الجلسات الأسبوعية الافتراضية' : 'Default Sessions per Week'}
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
                  name="default_session_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مدة الجلسة (دقائق)' : 'Session Duration (minutes)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="15" 
                          max="180"
                          step="15"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minimum_age_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'العمر الأدنى (شهور)' : 'Minimum Age (months)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0" 
                          max="300"
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
                  name="maximum_age_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'العمر الأقصى (شهور)' : 'Maximum Age (months)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0" 
                          max="300"
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

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
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

          {/* Objectives and Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
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

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
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