import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, FileText, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudents } from '@/hooks/useStudents'
import { usePlans } from '@/hooks/usePlans'
import { useTherapists } from '@/hooks/useTherapists'
import { toast } from 'sonner'

const therapyPlanEnrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  therapy_plan_id: z.string().min(1, 'Therapy plan is required'),
  assigned_therapist_id: z.string().min(1, 'Assigned therapist is required'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  target_start_date: z.string().min(1, 'Target start date is required'),
  expected_duration_months: z.number().min(1, 'Duration must be at least 1 month'),
  priority_level: z.enum(['high', 'medium', 'low']).default('medium'),
  therapy_goals: z.array(z.string()).optional(),
  parent_consent: z.enum(['obtained', 'pending', 'declined']).default('pending'),
  medical_clearance: z.enum(['required', 'obtained', 'not_required']).default('not_required'),
  notes: z.string().optional(),
})

type TherapyPlanEnrollmentFormData = z.infer<typeof therapyPlanEnrollmentSchema>

export const AddTherapyPlanEnrollmentPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get pre-selected student or plan from URL params
  const preselectedStudentId = searchParams.get('student_id')
  const preselectedPlanId = searchParams.get('plan_id')

  // Data hooks
  const { data: students = [] } = useStudents()
  const { data: plans = [] } = usePlans({ is_active: true })
  const { data: therapists = [] } = useTherapists({ status: 'active' })

  const form = useForm<TherapyPlanEnrollmentFormData>({
    resolver: zodResolver(therapyPlanEnrollmentSchema),
    defaultValues: {
      student_id: preselectedStudentId || '',
      therapy_plan_id: preselectedPlanId || '',
      enrollment_date: new Date().toISOString().split('T')[0],
      target_start_date: new Date().toISOString().split('T')[0],
      expected_duration_months: 6,
      priority_level: 'medium',
      parent_consent: 'pending',
      medical_clearance: 'not_required',
      therapy_goals: [],
      notes: '',
    },
  })

  const selectedPlan = plans.find(plan => plan.id === form.watch('therapy_plan_id'))
  const selectedStudent = students.find(student => student.id === form.watch('student_id'))

  const handleSubmit = async (data: TherapyPlanEnrollmentFormData) => {
    setIsSubmitting(true)
    try {
      // For now, simulate API call - replace with actual API call
      console.log('📋 Creating therapy plan enrollment:', data)
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(
        language === 'ar' 
          ? 'تم تسجيل الطالب في الخطة العلاجية بنجاح!' 
          : 'Student enrolled in therapy plan successfully!'
      )
      
      navigate('/therapy-plan-enrollments')
    } catch (error) {
      console.error('❌ Failed to create therapy plan enrollment:', error)
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في التسجيل'
          : 'Error creating enrollment'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/therapy-plan-enrollments')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تسجيل في خطة علاجية' : 'Therapy Plan Enrollment'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'تسجيل طالب في خطة علاجية مخصصة'
              : 'Enroll a student in a personalized therapy plan'
            }
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Student & Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <User className="h-5 w-5" />
                {language === 'ar' ? 'اختيار الطالب والخطة' : 'Student & Plan Selection'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Student Selection */}
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الطالب *' : 'Student *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select student'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                                  {student.child_id || student.registration_number}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Therapy Plan Selection */}
                <FormField
                  control={form.control}
                  name="therapy_plan_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الخطة العلاجية *' : 'Therapy Plan *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الخطة العلاجية' : 'Select therapy plan'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                                <span className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' ? plan.name_ar : plan.name_en || plan.name_ar}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {plan.duration_weeks} weeks • {plan.session_frequency}/week
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Selected Plan Details */}
              {selectedPlan && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className={`font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تفاصيل الخطة المختارة' : 'Selected Plan Details'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المدة:' : 'Duration:'}
                      </span>
                      <p>{selectedPlan.duration_weeks} {language === 'ar' ? 'أسبوع' : 'weeks'}</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التكرار:' : 'Frequency:'}
                      </span>
                      <p>{selectedPlan.session_frequency} {language === 'ar' ? 'مرة/أسبوع' : '/week'}</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المستوى:' : 'Level:'}
                      </span>
                      <p>{selectedPlan.difficulty_level}</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الفئة:' : 'Category:'}
                      </span>
                      <p>{selectedPlan.plan_category?.name_ar}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrollment Details */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'تفاصيل التسجيل' : 'Enrollment Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Assigned Therapist */}
                <FormField
                  control={form.control}
                  name="assigned_therapist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المعالج المسؤول *' : 'Assigned Therapist *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select therapist'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                                <span className={language === 'ar' ? 'font-arabic' : ''}>
                                  {language === 'ar' 
                                    ? `${therapist.first_name_ar} ${therapist.last_name_ar}`
                                    : `${therapist.first_name_en || therapist.first_name_ar} ${therapist.last_name_en || therapist.last_name_ar}`
                                  }
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {therapist.specialization_ar || therapist.specialization_en}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Enrollment Date */}
                <FormField
                  control={form.control}
                  name="enrollment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ التسجيل *' : 'Enrollment Date *'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target Start Date */}
                <FormField
                  control={form.control}
                  name="target_start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ البدء المتوقع *' : 'Target Start Date *'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Expected Duration */}
                <FormField
                  control={form.control}
                  name="expected_duration_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المدة المتوقعة (شهور) *' : 'Expected Duration (Months) *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="24"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Level */}
                <FormField
                  control={form.control}
                  name="priority_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الأولوية' : 'Priority Level'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                          <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                          <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Parent Consent */}
                <FormField
                  control={form.control}
                  name="parent_consent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'موافقة ولي الأمر' : 'Parent Consent'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="obtained">{language === 'ar' ? 'تم الحصول عليها' : 'Obtained'}</SelectItem>
                          <SelectItem value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                          <SelectItem value="declined">{language === 'ar' ? 'مرفوضة' : 'Declined'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Medical Clearance */}
              <FormField
                control={form.control}
                name="medical_clearance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'التصريح الطبي' : 'Medical Clearance'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="required">{language === 'ar' ? 'مطلوب' : 'Required'}</SelectItem>
                        <SelectItem value="obtained">{language === 'ar' ? 'تم الحصول عليه' : 'Obtained'}</SelectItem>
                        <SelectItem value="not_required">{language === 'ar' ? 'غير مطلوب' : 'Not Required'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملاحظات' : 'Notes'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'ملاحظات حول التسجيل...' : 'Notes about the enrollment...'}
                        className={language === 'ar' ? 'font-arabic' : ''}
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
                language === 'ar' ? 'تأكيد التسجيل' : 'Confirm Enrollment'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/therapy-plan-enrollments')}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default AddTherapyPlanEnrollmentPage