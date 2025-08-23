import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCourses } from '@/hooks/useCourses'
import { useCreateSession } from '@/hooks/useSessions'
import type { CreateSessionData } from '@/types/session'

// Validation schema
const sessionSchema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  session_number: z.number().min(1, 'Session number must be at least 1'),
  session_date: z.string().min(1, 'Session date is required'),
  session_time: z.string().min(1, 'Session time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours'),
  topic_ar: z.string().optional(),
  topic_en: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  materials_needed: z.array(z.string()).optional(),
  homework_assigned: z.string().optional(),
})

export const AddSessionPage = () => {
  const { language, isRTL } = useLanguage()
  const [objectiveInput, setObjectiveInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')
  
  // Fetch available courses
  const { data: courses = [], isLoading: coursesLoading } = useCourses()
  const createSessionMutation = useCreateSession()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    control
  } = useForm<CreateSessionData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      duration_minutes: 60,
      objectives: [],
      materials_needed: []
    }
  })

  // Get date from URL params if coming from calendar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dateParam = urlParams.get('date')
    if (dateParam) {
      setValue('session_date', dateParam)
    }
  }, [setValue])

  const watchedObjectives = watch('objectives') || []
  const watchedMaterials = watch('materials_needed') || []

  const addObjective = () => {
    if (objectiveInput.trim()) {
      const newObjectives = [...watchedObjectives, objectiveInput.trim()]
      setValue('objectives', newObjectives)
      setObjectiveInput('')
    }
  }

  const removeObjective = (index: number) => {
    const newObjectives = watchedObjectives.filter((_, i) => i !== index)
    setValue('objectives', newObjectives)
  }

  const addMaterial = () => {
    if (materialInput.trim()) {
      const newMaterials = [...watchedMaterials, materialInput.trim()]
      setValue('materials_needed', newMaterials)
      setMaterialInput('')
    }
  }

  const removeMaterial = (index: number) => {
    const newMaterials = watchedMaterials.filter((_, i) => i !== index)
    setValue('materials_needed', newMaterials)
  }

  const onSubmit = async (data: CreateSessionData) => {
    console.log('🚀 FORM SUBMITTED!')
    console.log('📋 Form data received:', data)
    
    // Simple validation
    if (!data.course_id) {
      alert('Please select a course')
      return
    }
    
    if (!data.session_number) {
      alert('Please enter session number')
      return
    }
    
    if (!data.session_date) {
      alert('Please select session date')
      return
    }
    
    if (!data.session_time) {
      alert('Please select session time')
      return
    }
    
    try {
      console.log('📡 Calling API to create session...')
      const result = await createSessionMutation.mutateAsync(data)
      console.log('✅ Session created:', result)
      
      alert('Session created successfully!')
      window.location.href = '/sessions'
    } catch (error) {
      console.error('❌ API Error:', error)
      alert('Failed to create session. Check console for details.')
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const endHour = minute === 30 ? hour + 1 : hour
        const endMinute = minute === 30 ? 0 : 30
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        slots.push(`${startTime}-${endTime}`)
      }
    }
    return slots
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
          {language === 'ar' ? 'رجوع' : 'Back'}
        </Button>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة جلسة جديدة' : 'Add New Session'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'قم بإنشاء جلسة تدريبية جديدة' : 'Create a new training session'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'الدورة' : 'Course'} *
                </Label>
                <Controller
                  name="course_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الدورة' : 'Select course'} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                        {coursesLoading ? (
                          <SelectItem value="loading" disabled>
                            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                          </SelectItem>
                        ) : courses.length === 0 ? (
                          <SelectItem value="no-courses" disabled>
                            {language === 'ar' ? 'لا توجد دورات متاحة' : 'No courses available'}
                          </SelectItem>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.course_code} - {language === 'ar' ? course.name_ar : (course.name_en || course.name_ar)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.course_id && (
                  <p className="text-sm text-destructive">{errors.course_id.message}</p>
                )}
              </div>

              {/* Session Number */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'رقم الجلسة' : 'Session Number'} *
                </Label>
                <Input
                  type="number"
                  min="1"
                  {...register('session_number', { valueAsNumber: true })}
                  className={language === 'ar' ? 'font-arabic' : ''}
                  placeholder={language === 'ar' ? 'أدخل رقم الجلسة' : 'Enter session number'}
                />
                {errors.session_number && (
                  <p className="text-sm text-destructive">{errors.session_number.message}</p>
                )}
              </div>

              {/* Session Date */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'تاريخ الجلسة' : 'Session Date'} *
                </Label>
                <Input
                  type="date"
                  {...register('session_date')}
                  className={language === 'ar' ? 'font-arabic' : ''}
                />
                {errors.session_date && (
                  <p className="text-sm text-destructive">{errors.session_date.message}</p>
                )}
              </div>

              {/* Session Time */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'وقت الجلسة' : 'Session Time'} *
                </Label>
                <Controller
                  name="session_time"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الوقت' : 'Select time'} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                        {generateTimeSlots().map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.session_time && (
                  <p className="text-sm text-destructive">{errors.session_time.message}</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'مدة الجلسة (بالدقائق)' : 'Duration (minutes)'} *
                </Label>
                <Input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  {...register('duration_minutes', { valueAsNumber: true })}
                  className={language === 'ar' ? 'font-arabic' : ''}
                  placeholder="60"
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Content */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'محتوى الجلسة' : 'Session Content'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Topic in Arabic */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'موضوع الجلسة (عربي)' : 'Session Topic (Arabic)'}
                </Label>
                <Input
                  {...register('topic_ar')}
                  className={language === 'ar' ? 'font-arabic' : ''}
                  placeholder={language === 'ar' ? 'أدخل موضوع الجلسة' : 'Enter session topic in Arabic'}
                />
              </div>

              {/* Topic in English */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'موضوع الجلسة (إنجليزي)' : 'Session Topic (English)'}
                </Label>
                <Input
                  {...register('topic_en')}
                  placeholder="Enter session topic in English"
                />
              </div>
            </div>

            {/* Session Objectives */}
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'أهداف الجلسة' : 'Session Objectives'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={objectiveInput}
                  onChange={(e) => setObjectiveInput(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل هدف جديد' : 'Enter new objective'}
                  className={`flex-1 ${language === 'ar' ? 'font-arabic' : ''}`}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                />
                <Button type="button" onClick={addObjective} disabled={!objectiveInput.trim()}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </div>
              {watchedObjectives.length > 0 && (
                <div className="space-y-2">
                  {watchedObjectives.map((objective, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>{objective}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeObjective(index)}>
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Materials Needed */}
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المواد المطلوبة' : 'Materials Needed'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل مادة جديدة' : 'Enter new material'}
                  className={`flex-1 ${language === 'ar' ? 'font-arabic' : ''}`}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                />
                <Button type="button" onClick={addMaterial} disabled={!materialInput.trim()}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </div>
              {watchedMaterials.length > 0 && (
                <div className="space-y-2">
                  {watchedMaterials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className={language === 'ar' ? 'font-arabic' : ''}>{material}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeMaterial(index)}>
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Homework Assignment */}
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الواجب المنزلي' : 'Homework Assignment'}
              </Label>
              <Textarea
                {...register('homework_assigned')}
                className={language === 'ar' ? 'font-arabic' : ''}
                placeholder={language === 'ar' ? 'أدخل تفاصيل الواجب المنزلي' : 'Enter homework assignment details'}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || createSessionMutation.isPending}
          >
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isSubmitting || createSessionMutation.isPending 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ الجلسة' : 'Save Session')
            }
          </Button>
        </div>
      </form>
    </div>
  )
}