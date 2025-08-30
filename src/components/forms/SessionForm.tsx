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
import { CalendarIcon, Save, ArrowLeft, Plus, X, Clock, BookOpen, Target } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateSessionData } from '@/types/session'
import { useCourses } from '@/hooks/useCourses'

const sessionSchema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  session_number: z.number().min(1, 'Session number must be at least 1'),
  session_date: z.date(),
  session_time: z.string().min(1, 'Session time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  topic_ar: z.string().optional(),
  topic_en: z.string().optional(),
  objectives: z.array(z.string()).min(1, 'At least one objective is required'),
  materials_needed: z.array(z.string()).optional().default([]),
  homework_assigned: z.string().optional(),
})

type SessionFormData = z.infer<typeof sessionSchema>

interface SessionFormProps {
  onSubmit: (data: CreateSessionData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateSessionData>
}

export default function SessionForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: SessionFormProps) {
  const { language } = useLanguage()
  const { data: courses } = useCourses()

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      course_id: initialData?.course_id || '',
      session_number: initialData?.session_number || 1,
      session_date: initialData?.session_date ? new Date(initialData.session_date) : new Date(),
      session_time: initialData?.session_time || '',
      duration_minutes: initialData?.duration_minutes || 60,
      topic_ar: initialData?.topic_ar || '',
      topic_en: initialData?.topic_en || '',
      objectives: initialData?.objectives || [''],
      materials_needed: initialData?.materials_needed || [''],
      homework_assigned: initialData?.homework_assigned || '',
    }
  })

  const { fields: objectiveFields, append: appendObjective, remove: removeObjective } = useFieldArray({
    control: form.control,
    name: 'objectives'
  }) as any

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: 'materials_needed'
  }) as any

  const handleSubmit = (data: SessionFormData) => {
    const formData: CreateSessionData = {
      ...data,
      session_date: data.session_date.toISOString().split('T')[0],
      objectives: data.objectives.filter(obj => obj.trim() !== ''),
      materials_needed: data.materials_needed?.filter(mat => mat.trim() !== ''),
    }
    onSubmit(formData)
  }

  const activeCourses = courses?.filter(course => course.status === 'active' || course.status === 'planned')

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الجلسة' : 'Session Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="course_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الدورة *' : 'Course *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الدورة' : 'Select Course'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeCourses?.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {language === 'ar' 
                                ? `${course.name_ar} (${course.course_code})`
                                : `${course.name_en || course.name_ar} (${course.course_code})`
                              }
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
                  name="session_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'رقم الجلسة *' : 'Session Number *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder={language === 'ar' ? 'مثال: 1' : 'e.g., 1'}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="session_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ الجلسة *' : 'Session Date *'}
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
                  name="session_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'وقت الجلسة *' : 'Session Time *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? '10:00-11:00' : '10:00-11:00'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المدة (دقيقة) *' : 'Duration (Minutes) *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="15"
                          max="480"
                          placeholder={language === 'ar' ? 'مثال: 60' : 'e.g., 60'}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Session Content */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BookOpen className="w-5 h-5" />
                {language === 'ar' ? 'محتوى الجلسة' : 'Session Content'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="topic_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'موضوع الجلسة (عربي)' : 'Session Topic (Arabic)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'موضوع الجلسة بالعربية' : 'Session topic in Arabic'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="topic_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'موضوع الجلسة (إنجليزي)' : 'Session Topic (English)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'موضوع الجلسة بالإنجليزية' : 'Session topic in English'}
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
                name="homework_assigned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الواجب المنزلي' : 'Homework Assignment'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'وصف الواجب المنزلي المطلوب' : 'Description of homework assignment'}
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

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Target className="w-5 h-5" />
                {language === 'ar' ? 'أهداف التعلم' : 'Learning Objectives'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {objectiveFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`objectives.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && (
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'الهدف التعليمي' : 'Learning Objective'}
                          </FormLabel>
                        )}
                        <FormControl>
                          <Input
                            placeholder={language === 'ar' ? 'مثال: تطوير مهارات التواصل اللفظي' : 'e.g., Develop verbal communication skills'}
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
                    onClick={() => removeObjective(index)}
                    disabled={objectiveFields.length === 1}
                    className="mb-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendObjective('')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة هدف آخر' : 'Add Another Objective'}
              </Button>

            </CardContent>
          </Card>

          {/* Materials Needed */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المواد المطلوبة' : 'Materials Needed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {materialFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`materials_needed.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && (
                          <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                            {language === 'ar' ? 'المادة المطلوبة' : 'Required Material'}
                          </FormLabel>
                        )}
                        <FormControl>
                          <Input
                            placeholder={language === 'ar' ? 'مثال: بطاقات تعليمية' : 'e.g., Flashcards'}
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
                    onClick={() => removeMaterial(index)}
                    disabled={materialFields.length === 1}
                    className="mb-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendMaterial('')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة مادة أخرى' : 'Add Another Material'}
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
                : (language === 'ar' ? 'حفظ الجلسة' : 'Save Session')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}