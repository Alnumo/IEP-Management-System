import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEnrollment, useUpdateEnrollment, UpdateEnrollmentData } from '@/hooks/useEnrollments'
import EnrollmentForm from '@/components/forms/EnrollmentForm'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditEnrollmentPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: enrollment, isLoading, error } = useEnrollment(id!)
  const updateEnrollmentMutation = useUpdateEnrollment()

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات التسجيل' 
          : 'Error loading enrollment data'
      )
      navigate('/enrollments')
    }
  }, [error, language, navigate])

  const handleSubmit = async (data: UpdateEnrollmentData) => {
    try {
      await updateEnrollmentMutation.mutateAsync({
        id: id!,
        ...data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات التسجيل بنجاح' 
          : 'Enrollment updated successfully'
      )
      
      navigate('/enrollments')
    } catch (error) {
      console.error('Error updating enrollment:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات التسجيل'
          : 'Error updating enrollment'
      )
    }
  }

  const handleCancel = () => {
    navigate('/enrollments')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!enrollment) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'التسجيل غير موجود' : 'Enrollment not found'}
          </p>
          <Button onClick={() => navigate('/enrollments')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/enrollments')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل بيانات التسجيل' : 'Edit Enrollment'}
          </h1>
          <p className="text-muted-foreground">
            {enrollment.student && (
              <>
                {language === 'ar' 
                  ? `${enrollment.student.first_name_ar} ${enrollment.student.last_name_ar}`
                  : `${enrollment.student.first_name_en || enrollment.student.first_name_ar} ${enrollment.student.last_name_en || enrollment.student.last_name_ar}`
                }
                {enrollment.course && (
                  <span className="ml-2">
                    - {language === 'ar' ? enrollment.course.name_ar : (enrollment.course.name_en || enrollment.course.name_ar)}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات التسجيل' : 'Enrollment Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              enrollment_date: enrollment.enrollment_date,
              payment_status: enrollment.payment_status,
              amount_paid: enrollment.amount_paid,
              notes: enrollment.notes
            }}
            isLoading={updateEnrollmentMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}