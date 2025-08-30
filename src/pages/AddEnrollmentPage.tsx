import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, CreditCard, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateEnrollment } from '@/hooks/useEnrollments'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'

const enrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  course_id: z.string().min(1, 'Course is required'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  payment_status: z.enum(['pending', 'paid', 'partial', 'refunded']).default('pending'),
  amount_paid: z.number().min(0, 'Amount must be positive').default(0),
  notes: z.string().optional(),
})

type EnrollmentFormData = z.infer<typeof enrollmentSchema>

export const AddEnrollmentPage = () => {
  const { language, isRTL } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: students = [] } = useStudents()
  const { data: allCourses = [] } = useCourses() // Get all courses
  const courses = allCourses.filter(course => 
    course.status === 'planned' || course.status === 'active'
  ) // Show only courses available for enrollment
  
  // Debug logging
  console.log('🔍 AddEnrollmentPage: All courses:', allCourses.length)
  console.log('🔍 AddEnrollmentPage: Filtered courses:', courses.length)
  console.log('🔍 AddEnrollmentPage: Courses:', courses)
  const createEnrollment = useCreateEnrollment()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      enrollment_date: new Date().toISOString().split('T')[0],
      payment_status: 'pending',
      amount_paid: 0,
    }
  })

  const selectedCourseId = watch('course_id')
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  // Update amount_paid when course is selected and payment status is 'paid'
  const handleCourseChange = (courseId: string) => {
    setValue('course_id', courseId)
    const course = courses.find(c => c.id === courseId)
    if (course && watch('payment_status') === 'paid') {
      setValue('amount_paid', course.price)
    }
  }

  const handlePaymentStatusChange = (status: string) => {
    setValue('payment_status', status as any)
    if (status === 'paid' && selectedCourse) {
      setValue('amount_paid', selectedCourse.price)
    } else if (status === 'pending') {
      setValue('amount_paid', 0)
    }
  }

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsSubmitting(true)
    try {
      await createEnrollment.mutateAsync(data)
      
      // Show success message
      alert(language === 'ar' ? 'تم إنشاء التسجيل بنجاح!' : 'Enrollment created successfully!')
      
      // Reset form
      reset()
      
      // Redirect to enrollments list
      window.location.href = '/enrollments'
    } catch (error) {
      console.error('Error creating enrollment:', error)
      alert(
        language === 'ar' 
          ? `خطأ في إنشاء التسجيل: ${error instanceof Error ? error.message : 'خطأ غير محدد'}`
          : `Error creating enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.history.back()}
          className={isRTL ? 'rotate-180' : ''}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تسجيل طالب جديد' : 'New Student Enrollment'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة تسجيل جديد لطالب في دورة' : 'Add a new student enrollment in a course'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Student and Course Selection */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
              <User className="h-5 w-5" />
              {language === 'ar' ? 'معلومات التسجيل' : 'Enrollment Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Selection */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'الطالب *' : 'Student *'}
                </Label>
                <Controller
                  name="student_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                              <span className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' 
                                  ? `${student.first_name_ar} ${student.last_name_ar}`
                                  : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
                                }
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {student.registration_number}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.student_id && (
                  <p className="text-sm text-red-600">{errors.student_id.message}</p>
                )}
              </div>

              {/* Course Selection */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'الدورة *' : 'Course *'}
                </Label>
                <Controller
                  name="course_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={handleCourseChange} value={field.value}>
                      <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الدورة' : 'Select Course'} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                              <span className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? course.name_ar : (course.name_en || course.name_ar)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {course.course_code} - {course.price.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.course_id && (
                  <p className="text-sm text-red-600">{errors.course_id.message}</p>
                )}
              </div>
            </div>

            {/* Enrollment Date */}
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تاريخ التسجيل *' : 'Enrollment Date *'}
              </Label>
              <Controller
                name="enrollment_date"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    {...field}
                    className={language === 'ar' ? 'font-arabic' : ''}
                  />
                )}
              />
              {errors.enrollment_date && (
                <p className="text-sm text-red-600">{errors.enrollment_date.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
              <CreditCard className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Status */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'حالة الدفع *' : 'Payment Status *'}
                </Label>
                <Controller
                  name="payment_status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={handlePaymentStatusChange} value={field.value}>
                      <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                        <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                        <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                        <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                        <SelectItem value="refunded">{language === 'ar' ? 'مسترد' : 'Refunded'}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Amount Paid */}
              <div className="space-y-2">
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'المبلغ المدفوع (ر.س)' : 'Amount Paid (SAR)'}
                </Label>
                <Controller
                  name="amount_paid"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className={language === 'ar' ? 'font-arabic' : ''}
                    />
                  )}
                />
                {errors.amount_paid && (
                  <p className="text-sm text-red-600">{errors.amount_paid.message}</p>
                )}
                {selectedCourse && (
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'سعر الدورة:' : 'Course price:'} {selectedCourse.price.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
              <CalendarDays className="h-5 w-5" />
              {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder={language === 'ar' ? 'ملاحظات حول التسجيل...' : 'Notes about the enrollment...'}
                    className={language === 'ar' ? 'font-arabic' : ''}
                    rows={3}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              language === 'ar' ? 'حفظ التسجيل' : 'Save Enrollment'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            className="flex-1"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </form>
    </div>
  )
}