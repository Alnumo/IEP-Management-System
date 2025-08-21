import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calendar, Clock, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/contexts/LanguageContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCourse } from '@/hooks/useCourses'
import type { CreateCourseData } from '@/types/course'

// Form validation schema
const createCourseSchema = z.object({
  name_ar: z.string().min(2, 'اسم الدورة مطلوب'),
  name_en: z.string().optional(),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  instructor_name: z.string().optional(),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  schedule_days: z.array(z.string()).min(1, 'يجب اختيار يوم واحد على الأقل'),
  schedule_time: z.string().min(1, 'وقت الدورة مطلوب'),
  max_students: z.number().min(1, 'عدد الطلاب يجب أن يكون أكبر من صفر'),
  price: z.number().min(0, 'السعر يجب أن يكون صفر أو أكبر'),
  location: z.string().optional(),
  requirements: z.string().optional(),
})

type CreateCourseFormData = z.infer<typeof createCourseSchema>

const WEEKDAYS = [
  { value: 'sunday', label_ar: 'الأحد', label_en: 'Sunday' },
  { value: 'monday', label_ar: 'الاثنين', label_en: 'Monday' },
  { value: 'tuesday', label_ar: 'الثلاثاء', label_en: 'Tuesday' },
  { value: 'wednesday', label_ar: 'الأربعاء', label_en: 'Wednesday' },
  { value: 'thursday', label_ar: 'الخميس', label_en: 'Thursday' },
  { value: 'friday', label_ar: 'الجمعة', label_en: 'Friday' },
  { value: 'saturday', label_ar: 'السبت', label_en: 'Saturday' },
]

export const AddCoursePage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createCourse = useCreateCourse()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      instructor_name: '',
      start_date: '',
      end_date: '',
      schedule_days: [],
      schedule_time: '',
      max_students: 20,
      price: 0,
      location: '',
      requirements: '',
    },
  })

  const handleSubmit = async (data: CreateCourseFormData) => {
    setIsSubmitting(true)
    try {
      console.log('🔍 AddCoursePage: Creating course with data:', data)
      
      const courseData: CreateCourseData = {
        ...data,
        max_students: Number(data.max_students),
        price: Number(data.price),
      }

      const newCourse = await createCourse.mutateAsync(courseData)
      console.log('✅ AddCoursePage: Course created successfully:', newCourse)
      
      // Navigate back to courses page
      navigate('/courses')
    } catch (error) {
      console.error('❌ AddCoursePage: Error creating course:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDayToggle = (day: string, checked: boolean) => {
    const currentDays = form.getValues('schedule_days')
    if (checked) {
      form.setValue('schedule_days', [...currentDays, day])
    } else {
      form.setValue('schedule_days', currentDays.filter(d => d !== day))
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/courses')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة دورة جديدة' : 'Add New Course'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إنشاء دورة تدريبية جديدة' : 'Create a new training course'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BookOpen className="h-5 w-5" />
                {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
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
                          {...field} 
                          placeholder={language === 'ar' ? 'اسم الدورة باللغة العربية' : 'Course name in Arabic'}
                          dir="rtl"
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
                          {...field} 
                          placeholder={language === 'ar' ? 'اسم الدورة باللغة الإنجليزية' : 'Course name in English'}
                          dir="ltr"
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
                        {language === 'ar' ? 'وصف الدورة (عربي)' : 'Course Description (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={language === 'ar' ? 'وصف مفصل للدورة' : 'Detailed course description'}
                          rows={3}
                          dir="rtl"
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
                        {language === 'ar' ? 'وصف الدورة (إنجليزي)' : 'Course Description (English)'}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={language === 'ar' ? 'وصف الدورة باللغة الإنجليزية' : 'Course description in English'}
                          rows={3}
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
                name="instructor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'اسم المدرب' : 'Instructor Name'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'اسم المدرب المسؤول عن الدورة' : 'Name of course instructor'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'معلومات الجدولة' : 'Schedule Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ البداية *' : 'Start Date *'}
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

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ النهاية *' : 'End Date *'}
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

              <FormField
                control={form.control}
                name="schedule_days"
                render={() => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'أيام الأسبوع *' : 'Schedule Days *'}
                    </FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {WEEKDAYS.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={day.value}
                            onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                          />
                          <label 
                            htmlFor={day.value}
                            className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}
                          >
                            {language === 'ar' ? day.label_ar : day.label_en}
                          </label>
                        </div>
                      ))}
                    </div>
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
                      {language === 'ar' ? 'وقت الدورة *' : 'Schedule Time *'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="10:00-12:00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Capacity and Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Users className="h-5 w-5" />
                {language === 'ar' ? 'السعة والتسعير' : 'Capacity & Pricing'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {...field} 
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        {language === 'ar' ? 'سعر الدورة (ريال) *' : 'Course Price (SAR) *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مكان الدورة' : 'Course Location'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'قاعة التدريب الأولى' : 'Training Room 1'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'متطلبات الدورة' : 'Course Requirements'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={language === 'ar' ? 'متطلبات الالتحاق بالدورة' : 'Prerequisites for enrollment'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/courses')}
              disabled={isSubmitting}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'
              ) : (
                language === 'ar' ? 'إنشاء الدورة' : 'Create Course'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}