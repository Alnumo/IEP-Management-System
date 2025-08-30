import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Save, ArrowLeft, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateTherapistData, THERAPY_SPECIALIZATIONS } from '@/types/therapist'

const therapistSchema = z.object({
  first_name_ar: z.string().min(1, 'Arabic first name is required'),
  last_name_ar: z.string().min(1, 'Arabic last name is required'),
  first_name_en: z.string().optional(),
  last_name_en: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialization_ar: z.string().optional(),
  specialization_en: z.string().optional(),
  qualifications: z.array(z.string()).default([]).refine(arr => arr.length > 0, 'At least one qualification is required'),
  experience_years: z.number().min(0).max(50),
  hourly_rate: z.number().min(0).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'volunteer']),
  hire_date: z.date(),
})

type TherapistFormData = z.infer<typeof therapistSchema>

interface TherapistFormProps {
  onSubmit: (data: CreateTherapistData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateTherapistData>
}

export default function TherapistForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: TherapistFormProps) {
  const { language } = useLanguage()

  const form = useForm<TherapistFormData>({
    resolver: zodResolver(therapistSchema),
    defaultValues: {
      first_name_ar: initialData?.first_name_ar || '',
      last_name_ar: initialData?.last_name_ar || '',
      first_name_en: initialData?.first_name_en || '',
      last_name_en: initialData?.last_name_en || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      specialization_ar: initialData?.specialization_ar || '',
      specialization_en: initialData?.specialization_en || '',
      qualifications: initialData?.qualifications || [''],
      experience_years: initialData?.experience_years || 0,
      hourly_rate: initialData?.hourly_rate || undefined,
      employment_type: initialData?.employment_type || 'full_time',
      hire_date: initialData?.hire_date ? new Date(initialData.hire_date) : new Date(),
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'qualifications'
  }) as any

  const handleSubmit = (data: TherapistFormData) => {
    const formData: CreateTherapistData = {
      ...data,
      hire_date: data.hire_date.toISOString().split('T')[0],
      qualifications: data.qualifications.filter(q => q.trim() !== '')
    }
    onSubmit(formData)
  }

  const getEmploymentTypeLabel = (type: string) => {
    const types = {
      'full_time': { ar: 'دوام كامل', en: 'Full Time' },
      'part_time': { ar: 'دوام جزئي', en: 'Part Time' },
      'contract': { ar: 'متعاقد', en: 'Contract' },
      'volunteer': { ar: 'متطوع', en: 'Volunteer' }
    }
    return language === 'ar' ? types[type as keyof typeof types]?.ar : types[type as keyof typeof types]?.en
  }

  const getSpecializationLabel = (specialization: any) => {
    return language === 'ar' ? specialization.label_ar : specialization.label_en
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
                  name="first_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الاسم الأول (عربي) *' : 'First Name (Arabic) *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل الاسم الأول بالعربية' : 'Enter first name in Arabic'}
                          {...field}
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
                          placeholder={language === 'ar' ? 'أدخل اسم العائلة بالعربية' : 'Enter last name in Arabic'}
                          {...field}
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
                          placeholder={language === 'ar' ? 'أدخل الاسم الأول بالإنجليزية' : 'Enter first name in English'}
                          {...field}
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
                          placeholder={language === 'ar' ? 'أدخل اسم العائلة بالإنجليزية' : 'Enter last name in English'}
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
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
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={language === 'ar' ? 'example@email.com' : 'example@email.com'}
                          {...field}
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
                          type="tel"
                          placeholder={language === 'ar' ? '+966xxxxxxxxx' : '+966xxxxxxxxx'}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'العنوان' : 'Address'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'أدخل العنوان الكامل' : 'Enter full address'}
                        rows={3}
                        {...field}
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
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
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
                      <Select onValueChange={(value) => {
                        const specialization = THERAPY_SPECIALIZATIONS.find(s => s.value === value)
                        field.onChange(specialization?.label_ar || value)
                        form.setValue('specialization_en', specialization?.label_en || '')
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر التخصص' : 'Select Specialization'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {THERAPY_SPECIALIZATIONS.map((spec) => (
                            <SelectItem key={spec.value} value={spec.value}>
                              {getSpecializationLabel(spec)}
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
                  name="experience_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          placeholder={language === 'ar' ? 'عدد سنوات الخبرة' : 'Number of years'}
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
                  name="employment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نوع التوظيف' : 'Employment Type'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">{getEmploymentTypeLabel('full_time')}</SelectItem>
                          <SelectItem value="part_time">{getEmploymentTypeLabel('part_time')}</SelectItem>
                          <SelectItem value="contract">{getEmploymentTypeLabel('contract')}</SelectItem>
                          <SelectItem value="volunteer">{getEmploymentTypeLabel('volunteer')}</SelectItem>
                        </SelectContent>
                      </Select>
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
                        {language === 'ar' ? 'الأجر بالساعة (ريال)' : 'Hourly Rate (SAR)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={language === 'ar' ? 'الأجر بالساعة' : 'Hourly rate'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                        {language === 'ar' ? 'تاريخ التوظيف' : 'Hire Date'}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المؤهلات والشهادات' : 'Qualifications & Certifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`qualifications.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && (
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'المؤهل أو الشهادة' : 'Qualification or Certificate'}
                          </FormLabel>
                        )}
                        <FormControl>
                          <Input
                            placeholder={language === 'ar' ? 'مثال: بكالوريوس العلاج الطبيعي' : 'e.g., Bachelor of Physical Therapy'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="mb-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append('')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة مؤهل آخر' : 'Add Another Qualification'}
              </Button>

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
                : (language === 'ar' ? 'حفظ المعالج' : 'Save Therapist')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}