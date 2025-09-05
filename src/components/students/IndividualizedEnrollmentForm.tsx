// Story 6.1: Individualized enrollment form component with bilingual support

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import type { EnrollmentFormData, CustomSchedule } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

const customScheduleSchema = z.object({
  sessions_per_week: z.number().min(1).max(7),
  preferred_days: z.array(z.string()).min(1),
  preferred_times: z.array(z.string()).min(1),
  session_duration_minutes: z.number().min(15).max(180),
  break_preferences: z.object({
    between_sessions: z.number().optional(),
    seasonal_breaks: z.array(z.object({
      start_date: z.string(),
      end_date: z.string(),
      reason: z.string()
    })).optional()
  }).optional()
})

const enrollmentFormSchema = z.object({
  student_id: z.string().min(1),
  program_template_id: z.string().min(1),
  individual_start_date: z.string().min(1),
  individual_end_date: z.string().min(1),
  assigned_therapist_id: z.string().min(1),
  custom_schedule: customScheduleSchema,
  notes: z.string().optional()
}).refine(data => new Date(data.individual_end_date) > new Date(data.individual_start_date), {
  message: 'End date must be after start date',
  path: ['individual_end_date']
})

interface IndividualizedEnrollmentFormProps {
  students: Array<{ id: string; name_ar: string; name_en: string }>
  therapists: Array<{ id: string; name_ar: string; name_en: string }>
  programTemplates: ProgramTemplate[]
  selectedTemplate?: ProgramTemplate
  initialData?: Partial<EnrollmentFormData>
  onSubmit: (data: EnrollmentFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

const DAYS_OF_WEEK = [
  { key: 'sunday', ar: 'الأحد', en: 'Sunday' },
  { key: 'monday', ar: 'الإثنين', en: 'Monday' },
  { key: 'tuesday', ar: 'الثلاثاء', en: 'Tuesday' },
  { key: 'wednesday', ar: 'الأربعاء', en: 'Wednesday' },
  { key: 'thursday', ar: 'الخميس', en: 'Thursday' },
  { key: 'friday', ar: 'الجمعة', en: 'Friday' },
  { key: 'saturday', ar: 'السبت', en: 'Saturday' }
]

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
]

export function IndividualizedEnrollmentForm({
  students,
  therapists,
  programTemplates,
  selectedTemplate,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: IndividualizedEnrollmentFormProps) {
  const { language, isRTL } = useLanguage()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [selectedProgramTemplate, setSelectedProgramTemplate] = useState<ProgramTemplate | null>(
    selectedTemplate || null
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: initialData
  })

  const watchedTemplate = watch('program_template_id')

  useEffect(() => {
    if (watchedTemplate && !selectedProgramTemplate) {
      const template = programTemplates.find(t => t.id === watchedTemplate)
      setSelectedProgramTemplate(template || null)
    }
  }, [watchedTemplate, programTemplates, selectedProgramTemplate])

  useEffect(() => {
    if (selectedProgramTemplate) {
      // Set default values based on template
      setValue('custom_schedule.sessions_per_week', selectedProgramTemplate.base_sessions_per_week)
      setValue('custom_schedule.session_duration_minutes', 60) // Default 1 hour
      
      // Calculate default end date based on template duration
      if (startDate) {
        const defaultEndDate = new Date(startDate)
        defaultEndDate.setDate(defaultEndDate.getDate() + (selectedProgramTemplate.base_duration_weeks * 7))
        setEndDate(defaultEndDate)
        setValue('individual_end_date', format(defaultEndDate, 'yyyy-MM-dd'))
      }
    }
  }, [selectedProgramTemplate, startDate, setValue])

  const handleDayToggle = (dayKey: string) => {
    const newSelectedDays = selectedDays.includes(dayKey)
      ? selectedDays.filter(d => d !== dayKey)
      : [...selectedDays, dayKey]
    
    setSelectedDays(newSelectedDays)
    setValue('custom_schedule.preferred_days', newSelectedDays)
  }

  const handleTimeToggle = (time: string) => {
    const newSelectedTimes = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time]
    
    setSelectedTimes(newSelectedTimes)
    setValue('custom_schedule.preferred_times', newSelectedTimes)
  }

  const handleFormSubmit = (data: EnrollmentFormData) => {
    // Ensure custom schedule is properly formatted
    const customSchedule: CustomSchedule = {
      sessions_per_week: data.custom_schedule.sessions_per_week,
      preferred_days: selectedDays,
      preferred_times: selectedTimes,
      session_duration_minutes: data.custom_schedule.session_duration_minutes,
      break_preferences: data.custom_schedule.break_preferences
    }

    onSubmit({
      ...data,
      custom_schedule: customSchedule
    })
  }

  const texts = {
    title: {
      ar: 'نموذج التسجيل الفردي',
      en: 'Individualized Enrollment Form'
    },
    studentSelection: {
      ar: 'اختيار الطالب',
      en: 'Student Selection'
    },
    programTemplate: {
      ar: 'قالب البرنامج',
      en: 'Program Template'
    },
    therapistAssignment: {
      ar: 'تعيين المعالج',
      en: 'Therapist Assignment'
    },
    schedule: {
      ar: 'الجدول الزمني',
      en: 'Schedule'
    },
    startDate: {
      ar: 'تاريخ البداية',
      en: 'Start Date'
    },
    endDate: {
      ar: 'تاريخ النهاية',
      en: 'End Date'
    },
    sessionsPerWeek: {
      ar: 'عدد الجلسات في الأسبوع',
      en: 'Sessions Per Week'
    },
    sessionDuration: {
      ar: 'مدة الجلسة (دقيقة)',
      en: 'Session Duration (minutes)'
    },
    preferredDays: {
      ar: 'الأيام المفضلة',
      en: 'Preferred Days'
    },
    preferredTimes: {
      ar: 'الأوقات المفضلة',
      en: 'Preferred Times'
    },
    notes: {
      ar: 'ملاحظات',
      en: 'Notes'
    },
    submit: {
      ar: 'حفظ التسجيل',
      en: 'Save Enrollment'
    },
    cancel: {
      ar: 'إلغاء',
      en: 'Cancel'
    },
    selectStudent: {
      ar: 'اختر طالب',
      en: 'Select Student'
    },
    selectProgram: {
      ar: 'اختر برنامج',
      en: 'Select Program'
    },
    selectTherapist: {
      ar: 'اختر معالج',
      en: 'Select Therapist'
    }
  }

  return (
    <Card className={`w-full max-w-4xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {texts.title[language]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student_id" className="text-base font-semibold">
              {texts.studentSelection[language]}
            </Label>
            <Select onValueChange={(value) => setValue('student_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder={texts.selectStudent[language]} />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {language === 'ar' ? student.name_ar : student.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.student_id && (
              <p className="text-sm text-red-500">{errors.student_id.message}</p>
            )}
          </div>

          {/* Program Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="program_template_id" className="text-base font-semibold">
              {texts.programTemplate[language]}
            </Label>
            <Select onValueChange={(value) => setValue('program_template_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder={texts.selectProgram[language]} />
              </SelectTrigger>
              <SelectContent>
                {programTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span>{language === 'ar' ? template.program_name_ar : template.program_name_en}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.base_duration_weeks} {language === 'ar' ? 'أسبوع' : 'weeks'} • {template.base_sessions_per_week} {language === 'ar' ? 'جلسات/أسبوع' : 'sessions/week'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.program_template_id && (
              <p className="text-sm text-red-500">{errors.program_template_id.message}</p>
            )}
            {selectedProgramTemplate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? selectedProgramTemplate.description_ar : selectedProgramTemplate.description_en}
                </p>
                <div className="flex gap-2 mt-2">
                  {selectedProgramTemplate.default_goals.map((goal, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {language === 'ar' ? goal.goal_ar : goal.goal_en}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Therapist Assignment */}
          <div className="space-y-2">
            <Label htmlFor="assigned_therapist_id" className="text-base font-semibold">
              {texts.therapistAssignment[language]}
            </Label>
            <Select onValueChange={(value) => setValue('assigned_therapist_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder={texts.selectTherapist[language]} />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {language === 'ar' ? therapist.name_ar : therapist.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigned_therapist_id && (
              <p className="text-sm text-red-500">{errors.assigned_therapist_id.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {texts.startDate[language]}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {startDate ? (
                      format(startDate, 'PPP', { locale: language === 'ar' ? ar : undefined })
                    ) : (
                      <span>{texts.startDate[language]}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date)
                      if (date) {
                        setValue('individual_start_date', format(date, 'yyyy-MM-dd'))
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {texts.endDate[language]}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {endDate ? (
                      format(endDate, 'PPP', { locale: language === 'ar' ? ar : undefined })
                    ) : (
                      <span>{texts.endDate[language]}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date)
                      if (date) {
                        setValue('individual_end_date', format(date, 'yyyy-MM-dd'))
                      }
                    }}
                    disabled={(date) => !startDate || date <= startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Custom Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{texts.schedule[language]}</h3>
            
            {/* Sessions per week and duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {texts.sessionsPerWeek[language]}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  {...register('custom_schedule.sessions_per_week', { valueAsNumber: true })}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {texts.sessionDuration[language]}
                </Label>
                <Input
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  {...register('custom_schedule.session_duration_minutes', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Preferred Days */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {texts.preferredDays[language]}
              </Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.key}
                    type="button"
                    variant={selectedDays.includes(day.key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.key)}
                  >
                    {day[language]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preferred Times */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {texts.preferredTimes[language]}
              </Label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                {TIME_SLOTS.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTimes.includes(time) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeToggle(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              {texts.notes[language]}
            </Label>
            <Textarea
              {...register('notes')}
              placeholder={`${texts.notes[language]}...`}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end pt-4`}>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {texts.cancel[language]}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '...' : texts.submit[language]}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}