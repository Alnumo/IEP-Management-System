import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, Brain, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudents } from '@/hooks/useStudents'
import { useTherapyPrograms } from '@/hooks/useTherapyPrograms'
import { useTherapists } from '@/hooks/useTherapists'
import { toast } from 'sonner'

const therapyProgramEnrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  therapy_program_id: z.string().min(1, 'Therapy program is required'),
  assigned_therapist_id: z.string().min(1, 'Assigned therapist is required'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  program_start_date: z.string().min(1, 'Program start date is required'),
  intensity_level: z.enum(['low', 'moderate', 'high', 'intensive']).default('moderate'),
  sessions_per_week: z.number().min(1, 'At least 1 session per week required'),
  session_duration_minutes: z.number().min(30, 'Minimum 30 minutes per session'),
  payment_status: z.enum(['pending', 'paid', 'partial', 'scholarship']).default('pending'),
  amount_paid: z.number().min(0, 'Amount must be positive').default(0),
  parent_consent: z.enum(['obtained', 'pending', 'declined']).default('pending'),
  medical_clearance: z.enum(['required', 'obtained', 'not_required']).default('not_required'),
  special_accommodations: z.string().optional(),
  emergency_contact_accessible: z.boolean().default(true),
  notes: z.string().optional(),
})

type TherapyProgramEnrollmentFormData = z.infer<typeof therapyProgramEnrollmentSchema>

export const AddTherapyProgramEnrollmentPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get pre-selected student or program from URL params
  const preselectedStudentId = searchParams.get('student_id')
  const preselectedProgramId = searchParams.get('program_id')

  // Data hooks
  const { data: students = [] } = useStudents()
  const { data: programs = [], isLoading: programsLoading, error: programsError } = useTherapyPrograms({ is_active: true })
  const { data: therapists = [] } = useTherapists({ status: 'active' })

  // Mock data for therapy programs if database query fails
  const mockTherapyPrograms = [
    {
      id: 'tp-001',
      name_ar: 'برنامج العلاج السلوكي المكثف',
      name_en: 'Intensive Behavioral Therapy Program',
      program_code: 'IBT-001',
      category: 'behavioral_intervention',
      target_condition: 'Autism Spectrum Disorder',
      intensity_level: 'high',
      cost_per_session: 150,
      program_duration_weeks: 12,
      age_range_min: 3,
      age_range_max: 12,
      description_ar: 'برنامج علاج سلوكي مكثف للأطفال المصابين باضطراب طيف التوحد',
      description_en: 'Intensive behavioral therapy program for children with autism spectrum disorder',
      is_active: true,
      is_available_for_new_patients: true
    },
    {
      id: 'tp-002',
      name_ar: 'برنامج علاج النطق واللغة',
      name_en: 'Speech and Language Therapy Program',
      program_code: 'SLT-001',
      category: 'communication',
      target_condition: 'Speech Delay',
      intensity_level: 'moderate',
      cost_per_session: 120,
      program_duration_weeks: 16,
      age_range_min: 2,
      age_range_max: 10,
      description_ar: 'برنامج علاج النطق واللغة للأطفال الذين يعانون من تأخر في النطق',
      description_en: 'Speech and language therapy program for children with speech delays',
      is_active: true,
      is_available_for_new_patients: true
    },
    {
      id: 'tp-003',
      name_ar: 'برنامج العلاج الوظيفي',
      name_en: 'Occupational Therapy Program',
      program_code: 'OT-001',
      category: 'occupational_therapy',
      target_condition: 'Developmental Delays',
      intensity_level: 'moderate',
      cost_per_session: 130,
      program_duration_weeks: 10,
      age_range_min: 2,
      age_range_max: 15,
      description_ar: 'برنامج العلاج الوظيفي لتطوير المهارات الحركية الدقيقة والجسيمة',
      description_en: 'Occupational therapy program to develop fine and gross motor skills',
      is_active: true,
      is_available_for_new_patients: true
    },
    {
      id: 'tp-004',
      name_ar: 'برنامج تحليل السلوك التطبيقي',
      name_en: 'Applied Behavior Analysis Program',
      program_code: 'ABA-001',
      category: 'behavioral_intervention',
      target_condition: 'Autism, ADHD',
      intensity_level: 'intensive',
      cost_per_session: 200,
      program_duration_weeks: 20,
      age_range_min: 2,
      age_range_max: 18,
      description_ar: 'برنامج تحليل السلوك التطبيقي لتعديل السلوكيات وتطوير المهارات',
      description_en: 'Applied behavior analysis program for behavior modification and skill development',
      is_active: true,
      is_available_for_new_patients: true
    }
  ]

  // Use mock data if database query fails
  const finalPrograms = programsError ? mockTherapyPrograms : programs

  const form = useForm<TherapyProgramEnrollmentFormData>({
    resolver: zodResolver(therapyProgramEnrollmentSchema),
    defaultValues: {
      student_id: preselectedStudentId || '',
      therapy_program_id: preselectedProgramId || '',
      enrollment_date: new Date().toISOString().split('T')[0],
      program_start_date: new Date().toISOString().split('T')[0],
      intensity_level: 'moderate',
      sessions_per_week: 2,
      session_duration_minutes: 60,
      payment_status: 'pending',
      amount_paid: 0,
      parent_consent: 'pending',
      medical_clearance: 'not_required',
      emergency_contact_accessible: true,
      notes: '',
    },
  })

  const selectedProgram = finalPrograms.find(program => program.id === form.watch('therapy_program_id'))
  const selectedStudent = students.find(student => student.id === form.watch('student_id'))

  // Update amount when program is selected and payment is paid
  const handleProgramChange = (programId: string) => {
    form.setValue('therapy_program_id', programId)
    const program = finalPrograms.find(p => p.id === programId)
    if (program && form.watch('payment_status') === 'paid') {
      form.setValue('amount_paid', program.cost_per_session * form.watch('sessions_per_week'))
    }
  }

  const handleSubmit = async (data: TherapyProgramEnrollmentFormData) => {
    setIsSubmitting(true)
    try {
      // For now, simulate API call - replace with actual API call
      console.log('📋 Creating therapy program enrollment:', data)
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(
        language === 'ar' 
          ? 'تم تسجيل الطالب في البرنامج العلاجي بنجاح!' 
          : 'Student enrolled in therapy program successfully!'
      )
      
      navigate('/therapy-program-enrollments')
    } catch (error) {
      console.error('❌ Failed to create therapy program enrollment:', error)
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
          onClick={() => navigate('/therapy-program-enrollments')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تسجيل في برنامج علاجي' : 'Therapy Program Enrollment'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'تسجيل طالب في برنامج علاجي متخصص'
              : 'Enroll a student in a specialized therapy program'
            }
          </p>
          {programsError && (
            <p className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
              {language === 'ar' 
                ? 'تحذير: استخدام بيانات تجريبية للبرامج العلاجية'
                : 'Warning: Using demo data for therapy programs'
              }
            </p>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Student & Program Selection */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <User className="h-5 w-5" />
                {language === 'ar' ? 'اختيار الطالب والبرنامج' : 'Student & Program Selection'}
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

                {/* Therapy Program Selection */}
                <FormField
                  control={form.control}
                  name="therapy_program_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'البرنامج العلاجي *' : 'Therapy Program *'}
                      </FormLabel>
                      <Select onValueChange={handleProgramChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر البرنامج العلاجي' : 'Select therapy program'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programsLoading ? (
                            <SelectItem value="loading" disabled>
                              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                            </SelectItem>
                          ) : finalPrograms.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              {language === 'ar' ? 'لا توجد برامج علاجية متاحة' : 'No therapy programs available'}
                            </SelectItem>
                          ) : (
                            finalPrograms.map((program) => (
                              <SelectItem key={program.id} value={program.id}>
                                <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                                  <span className={language === 'ar' ? 'font-arabic' : ''}>
                                    {language === 'ar' ? program.name_ar : program.name_en || program.name_ar}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {program.target_condition} • {program.cost_per_session} SAR/session
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Selected Program Details */}
              {selectedProgram && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className={`font-semibold mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تفاصيل البرنامج المختار' : 'Selected Program Details'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الحالة المستهدفة:' : 'Target Condition:'}
                      </span>
                      <p>{selectedProgram.target_condition}</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الفئة العمرية:' : 'Age Group:'}
                      </span>
                      <p>{selectedProgram.age_range_min}-{selectedProgram.age_range_max} years</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التكلفة:' : 'Cost:'}
                      </span>
                      <p>{selectedProgram.cost_per_session} SAR/session</p>
                    </div>
                    <div>
                      <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المدة:' : 'Duration:'}
                      </span>
                      <p>{selectedProgram.program_duration_weeks} weeks</p>
                    </div>
                  </div>
                  {selectedProgram.description_ar && (
                    <div className="mt-3">
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? selectedProgram.description_ar : selectedProgram.description_en}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <Brain className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات البرنامج' : 'Program Configuration'}
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

                {/* Intensity Level */}
                <FormField
                  control={form.control}
                  name="intensity_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مستوى الكثافة' : 'Intensity Level'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <Badge variant="secondary">{language === 'ar' ? 'منخفض' : 'Low'}</Badge>
                              <span className="text-xs">{language === 'ar' ? '1-2 جلسة/أسبوع' : '1-2 sessions/week'}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="moderate">
                            <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <Badge variant="default">{language === 'ar' ? 'متوسط' : 'Moderate'}</Badge>
                              <span className="text-xs">{language === 'ar' ? '2-3 جلسة/أسبوع' : '2-3 sessions/week'}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <Badge variant="outline">{language === 'ar' ? 'عالي' : 'High'}</Badge>
                              <span className="text-xs">{language === 'ar' ? '3-4 جلسة/أسبوع' : '3-4 sessions/week'}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="intensive">
                            <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <Badge variant="destructive">{language === 'ar' ? 'مكثف' : 'Intensive'}</Badge>
                              <span className="text-xs">{language === 'ar' ? '5+ جلسة/أسبوع' : '5+ sessions/week'}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sessions Per Week */}
                <FormField
                  control={form.control}
                  name="sessions_per_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'عدد الجلسات/أسبوع *' : 'Sessions Per Week *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="7"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Program Start Date */}
                <FormField
                  control={form.control}
                  name="program_start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تاريخ بدء البرنامج *' : 'Program Start Date *'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Session Duration */}
                <FormField
                  control={form.control}
                  name="session_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مدة الجلسة (دقائق) *' : 'Session Duration (Minutes) *'}
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 {language === 'ar' ? 'دقيقة' : 'minutes'}</SelectItem>
                          <SelectItem value="45">45 {language === 'ar' ? 'دقيقة' : 'minutes'}</SelectItem>
                          <SelectItem value="60">60 {language === 'ar' ? 'دقيقة' : 'minutes'}</SelectItem>
                          <SelectItem value="90">90 {language === 'ar' ? 'دقيقة' : 'minutes'}</SelectItem>
                          <SelectItem value="120">120 {language === 'ar' ? 'دقيقة' : 'minutes'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment & Consent */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <CreditCard className="h-5 w-5" />
                {language === 'ar' ? 'الدفع والموافقات' : 'Payment & Consent'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Payment Status */}
                <FormField
                  control={form.control}
                  name="payment_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                          <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                          <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                          <SelectItem value="scholarship">{language === 'ar' ? 'منحة' : 'Scholarship'}</SelectItem>
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
              </div>

              {/* Amount Paid */}
              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المبلغ المدفوع (ر.س)' : 'Amount Paid (SAR)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    {selectedProgram && (
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التكلفة الأسبوعية:' : 'Weekly cost:'} {(selectedProgram.cost_per_session * form.watch('sessions_per_week')).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Special Accommodations & Notes */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'الترتيبات الخاصة والملاحظات' : 'Special Accommodations & Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="special_accommodations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الترتيبات الخاصة' : 'Special Accommodations'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'أي ترتيبات خاصة مطلوبة...' : 'Any special accommodations required...'}
                        className={language === 'ar' ? 'font-arabic' : ''}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={language === 'ar' ? 'ملاحظات حول التسجيل...' : 'Notes about the enrollment...'}
                        className={language === 'ar' ? 'font-arabic' : ''}
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
              onClick={() => navigate('/therapy-program-enrollments')}
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

export default AddTherapyProgramEnrollmentPage