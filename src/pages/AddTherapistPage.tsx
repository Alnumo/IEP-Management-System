import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, User, Phone, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTherapist } from '@/hooks/useTherapists'
import { THERAPY_SPECIALIZATIONS } from '@/types/therapist'
import type { CreateTherapistData } from '@/types/therapist'

// Form validation schema
const createTherapistSchema = z.object({
  first_name_ar: z.string().min(2, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(2, 'اسم العائلة مطلوب'),
  first_name_en: z.string().optional(),
  last_name_en: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialization_ar: z.string().optional(),
  specialization_en: z.string().optional(),
  qualifications: z.array(z.string()).default([]),
  experience_years: z.number().min(0, 'سنوات الخبرة يجب أن تكون صفر أو أكثر').default(0),
  hourly_rate: z.number().min(0, 'الراتب يجب أن يكون صفر أو أكثر').optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'volunteer']).default('full_time'),
  hire_date: z.string().min(1, 'تاريخ التوظيف مطلوب'),
})

type CreateTherapistFormData = z.infer<typeof createTherapistSchema>

export const AddTherapistPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createTherapist = useCreateTherapist()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qualificationInput, setQualificationInput] = useState('')

  const form = useForm<CreateTherapistFormData>({
    resolver: zodResolver(createTherapistSchema),
    defaultValues: {
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      email: '',
      phone: '',
      address: '',
      specialization_ar: '',
      specialization_en: '',
      qualifications: [],
      experience_years: 0,
      hourly_rate: 0,
      employment_type: 'full_time',
      hire_date: new Date().toISOString().split('T')[0],
    },
  })

  const watchedQualifications = form.watch('qualifications') || []

  const addQualification = () => {
    if (qualificationInput.trim()) {
      const newQualifications = [...watchedQualifications, qualificationInput.trim()]
      form.setValue('qualifications', newQualifications)
      setQualificationInput('')
    }
  }

  const removeQualification = (index: number) => {
    const newQualifications = watchedQualifications.filter((_, i) => i !== index)
    form.setValue('qualifications', newQualifications)
  }

  const handleSubmit = async (data: CreateTherapistFormData) => {
    setIsSubmitting(true)
    try {
      console.log('🔍 AddTherapistPage: Creating therapist with data:', data)
      
      const therapistData: CreateTherapistData = {
        ...data,
        experience_years: Number(data.experience_years),
        hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : undefined,
        email: data.email || undefined,
      }

      const newTherapist = await createTherapist.mutateAsync(therapistData)
      console.log('✅ AddTherapistPage: Therapist created successfully:', newTherapist)
      
      // Navigate back to therapists page
      navigate('/therapists')
    } catch (error) {
      console.error('❌ AddTherapistPage: Error creating therapist:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSpecializationSelect = (value: string) => {
    const selectedSpec = THERAPY_SPECIALIZATIONS.find(s => s.value === value)
    if (selectedSpec) {
      form.setValue('specialization_ar', selectedSpec.label_ar)
      form.setValue('specialization_en', selectedSpec.label_en)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/therapists')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة أخصائية جديدة' : 'Add New Therapist'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إنشاء ملف أخصائية علاجية جديدة' : 'Create a new therapy specialist profile'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <User className="h-5 w-5" />
                {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الاسم الأول (عربي) *' : 'First Name (Arabic) *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'الاسم الأول باللغة العربية' : 'First name in Arabic'}
                          dir="rtl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم العائلة (عربي) *' : 'Last Name (Arabic) *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'اسم العائلة باللغة العربية' : 'Last name in Arabic'}
                          dir="rtl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="first_name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'الاسم الأول باللغة الإنجليزية' : 'First name in English'}
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم العائلة (إنجليزي)' : 'Last Name (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'اسم العائلة باللغة الإنجليزية' : 'Last name in English'}
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Phone className="h-5 w-5" />
                {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder={language === 'ar' ? 'example@email.com' : 'example@email.com'}
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? '+966 50 123 4567' : '+966 50 123 4567'}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'العنوان' : 'Address'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={language === 'ar' ? 'العنوان الكامل' : 'Full address'}
                        rows={2}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <GraduationCap className="h-5 w-5" />
                {language === 'ar' ? 'المعلومات المهنية' : 'Professional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialization_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'التخصص' : 'Specialization'}
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={handleSpecializationSelect}>
                          <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                            <SelectValue placeholder={language === 'ar' ? 'اختر التخصص' : 'Select specialization'} />
                          </SelectTrigger>
                          <SelectContent>
                            {THERAPY_SPECIALIZATIONS.map((spec) => (
                              <SelectItem key={spec.value} value={spec.value}>
                                {language === 'ar' ? spec.label_ar : spec.label_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'المحدد:' : 'Selected:'} {field.value}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع العمل' : 'Employment Type'}
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                            <SelectValue placeholder={language === 'ar' ? 'اختر نوع العمل' : 'Select employment type'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">{language === 'ar' ? 'دوام كامل' : 'Full Time'}</SelectItem>
                            <SelectItem value="part_time">{language === 'ar' ? 'دوام جزئي' : 'Part Time'}</SelectItem>
                            <SelectItem value="contract">{language === 'ar' ? 'تعاقد' : 'Contract'}</SelectItem>
                            <SelectItem value="volunteer">{language === 'ar' ? 'تطوع' : 'Volunteer'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الراتب بالساعة (ريال)' : 'Hourly Rate (SAR)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ التوظيف *' : 'Hire Date *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Qualifications */}
              <div className="space-y-2">
                <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'المؤهلات' : 'Qualifications'}
                </FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={qualificationInput}
                    onChange={(e) => setQualificationInput(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل مؤهل جديد' : 'Enter new qualification'}
                    className={`flex-1 ${language === 'ar' ? 'font-arabic' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
                  />
                  <Button type="button" onClick={addQualification} disabled={!qualificationInput.trim()}>
                    {language === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>
                {watchedQualifications.length > 0 && (
                  <div className="space-y-2">
                    {watchedQualifications.map((qualification, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className={language === 'ar' ? 'font-arabic' : ''}>{qualification}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQualification(index)}>
                          {language === 'ar' ? 'حذف' : 'Remove'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/therapists')}
              disabled={isSubmitting}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <UserPlus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isSubmitting ? (
                language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'
              ) : (
                language === 'ar' ? 'إنشاء الأخصائية' : 'Create Therapist'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}