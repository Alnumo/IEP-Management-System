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
import { CalendarIcon, Save, ArrowLeft, User, CreditCard, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreateEnrollmentData } from '@/hooks/useEnrollments'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'

const enrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  course_id: z.string().min(1, 'Course is required'),
  enrollment_date: z.date(),
  payment_status: z.enum(['pending', 'paid', 'partial', 'refunded']),
  amount_paid: z.number().min(0, 'Amount paid must be positive'),
  notes: z.string().optional(),
})

type EnrollmentFormData = z.infer<typeof enrollmentSchema>

interface EnrollmentFormProps {
  onSubmit: (data: CreateEnrollmentData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateEnrollmentData>
}

export default function EnrollmentForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: EnrollmentFormProps) {
  const { language } = useLanguage()
  const { data: students } = useStudents()
  const { data: courses } = useCourses()

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student_id: initialData?.student_id || '',
      course_id: initialData?.course_id || '',
      enrollment_date: initialData?.enrollment_date ? new Date(initialData.enrollment_date) : new Date(),
      payment_status: (initialData?.payment_status as 'pending' | 'paid' | 'partial' | 'refunded') || 'pending',
      amount_paid: initialData?.amount_paid || 0,
      notes: initialData?.notes || '',
    }
  })

  const handleSubmit = (data: EnrollmentFormData) => {
    const formData: CreateEnrollmentData = {
      ...data,
      enrollment_date: data.enrollment_date.toISOString().split('T')[0],
    }
    onSubmit(formData)
  }

  const activeStudents = students?.filter(student => student.status === 'active')
  const activeCourses = courses?.filter(course => course.status === 'active' || course.status === 'planned')

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <User className="w-5 h-5" />
                {language === 'ar' ? 'معلومات التسجيل' : 'Enrollment Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الطالب *' : 'Student *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeStudents?.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {language === 'ar' 
                                ? `${student.first_name_ar} ${student.last_name_ar} (${student.registration_number})`
                                : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar} (${student.registration_number})`
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
              </div>

              <FormField
                control={form.control}
                name="enrollment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'تاريخ التسجيل *' : 'Enrollment Date *'}
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
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <CreditCard className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'حالة الدفع *' : 'Payment Status *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر حالة الدفع' : 'Select Payment Status'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">
                            {language === 'ar' ? 'معلق' : 'Pending'}
                          </SelectItem>
                          <SelectItem value="paid">
                            {language === 'ar' ? 'مدفوع' : 'Paid'}
                          </SelectItem>
                          <SelectItem value="partial">
                            {language === 'ar' ? 'دفع جزئي' : 'Partial'}
                          </SelectItem>
                          <SelectItem value="refunded">
                            {language === 'ar' ? 'مسترد' : 'Refunded'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount_paid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'المبلغ المدفوع (ريال) *' : 'Amount Paid (SAR) *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={language === 'ar' ? 'مثال: 1500.00' : 'e.g., 1500.00'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BookOpen className="w-5 h-5" />
                {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
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
                        placeholder={language === 'ar' ? 'ملاحظات حول التسجيل (اختياري)' : 'Notes about the enrollment (optional)'}
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
                : (language === 'ar' ? 'حفظ التسجيل' : 'Save Enrollment')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}