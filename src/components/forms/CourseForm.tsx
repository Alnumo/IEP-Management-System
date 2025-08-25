import { useForm } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, Save, ArrowLeft, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateCourseData } from '@/types/course'
import { useTherapists } from '@/hooks/useTherapists'

const courseSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().optional(),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  therapist_id: z.string().optional(),
  start_date: z.date(),
  end_date: z.date(),
  schedule_days: z.array(z.string()).min(1, 'At least one day must be selected'),
  schedule_time: z.string().min(1, 'Schedule time is required'),
  max_students: z.number().min(1, 'Maximum students must be at least 1'),
  price: z.number().min(0, 'Price must be positive'),
  location: z.string().optional(),
  requirements: z.string().optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"],
})

type CourseFormData = z.infer<typeof courseSchema>

interface CourseFormProps {
  onSubmit: (data: CreateCourseData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateCourseData>
}

const DAYS_OF_WEEK = [
  { value: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
  { value: 'monday', labelAr: 'الاثنين', labelEn: 'Monday' },
  { value: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
  { value: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
  { value: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' },
  { value: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
  { value: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' },
] as const

export default function CourseForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: CourseFormProps) {
  const { language } = useLanguage()
  const { data: therapists } = useTherapists()

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name_ar: initialData?.name_ar || '',
      name_en: initialData?.name_en || '',
      description_ar: initialData?.description_ar || '',
      description_en: initialData?.description_en || '',
      therapist_id: initialData?.therapist_id || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : new Date(),
      schedule_days: initialData?.schedule_days || [],
      schedule_time: initialData?.schedule_time || '',
      max_students: initialData?.max_students || 10,
      price: initialData?.price || 0,
      location: initialData?.location || '',
      requirements: initialData?.requirements || '',
    }
  })

  const handleSubmit = (data: CourseFormData) => {
    const selectedTherapist = therapists?.find(t => t.id === data.therapist_id)
    
    const formData: CreateCourseData = {
      ...data,
      start_date: data.start_date.toISOString().split('T')[0],
      end_date: data.end_date.toISOString().split('T')[0],
      therapist_name: selectedTherapist ? 
        `${selectedTherapist.first_name_ar} ${selectedTherapist.last_name_ar}` : undefined
    }
    onSubmit(formData)
  }

  const getDayLabel = (day: typeof DAYS_OF_WEEK[number]) => {
    return language === 'ar' ? day.labelAr : day.labelEn
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
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'اسم الدورة (عربي) *' : 'Course Name (Arabic) *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم الدورة بالعربية' : 'Enter course name in Arabic'}
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
                        {language === 'ar' ? 'اسم الدورة (إنجليزي)' : 'Course Name (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل اسم الدورة بالإنجليزية' : 'Enter course name in English'}
                          {...field}
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
                  name="description_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={language === 'ar' ? 'وصف الدورة بالعربية' : 'Course description in Arabic'}
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
                          placeholder={language === 'ar' ? 'وصف الدورة بالإنجليزية' : 'Course description in English'}
                          rows={4}
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

          {/* Instructor & Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'المعالج والجدولة' : 'Therapist & Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <FormField
                control={form.control}
                name="therapist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المعالج المسؤول' : 'Assigned Therapist'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select Therapist'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">
                          {language === 'ar' ? 'لم يحدد بعد' : 'To be assigned'}
                        </SelectItem>
                        {therapists?.map((therapist) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            {language === 'ar' 
                              ? `${therapist.first_name_ar} ${therapist.last_name_ar}`
                              : `${therapist.first_name_en || therapist.first_name_ar} ${therapist.last_name_en || therapist.last_name_ar}`
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ البداية *' : 'Start Date *'}
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ النهاية *' : 'End Date *'}
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
                            disabled={(date) => date < form.getValues('start_date')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schedule_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'وقت الدرس *' : 'Class Time *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? '10:00-12:00' : '10:00-12:00'}
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
                name="schedule_days"
                render={() => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'أيام الأسبوع *' : 'Days of Week *'}
                    </FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <FormField
                          key={day.value}
                          control={form.control}
                          name="schedule_days"
                          render={({ field }) => (
                            <FormItem
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, day.value])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== day.value
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {getDayLabel(day)}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Capacity & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Users className="w-5 h-5" />
                {language === 'ar' ? 'السعة والتسعير' : 'Capacity & Pricing'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الحد الأقصى للطلاب *' : 'Maximum Students *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          placeholder={language === 'ar' ? 'مثال: 10' : 'e.g., 10'}
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'السعر (ريال) *' : 'Price (SAR) *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={language === 'ar' ? 'مثال: 500' : 'e.g., 500'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الموقع' : 'Location'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'مثال: قاعة A-101' : 'e.g., Room A-101'}
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
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المتطلبات والشروط' : 'Requirements & Prerequisites'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'أي متطلبات أو شروط للالتحاق بالدورة' : 'Any requirements or prerequisites for the course'}
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
                : (language === 'ar' ? 'حفظ الدورة' : 'Save Course')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}