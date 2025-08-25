import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, User, GraduationCap, CreditCard, Calendar, FileText, MapPin, Clock, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEnrollment } from '@/hooks/useEnrollments'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EnrollmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: enrollment, isLoading, error } = useEnrollment(id!)

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

  const getStatusBadge = (status: string) => {
    const variants = {
      'enrolled': { color: 'bg-green-100 text-green-800', labelAr: 'مسجل', labelEn: 'Enrolled' },
      'completed': { color: 'bg-blue-100 text-blue-800', labelAr: 'مكتمل', labelEn: 'Completed' },
      'dropped': { color: 'bg-red-100 text-red-800', labelAr: 'منسحب', labelEn: 'Dropped' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', labelAr: 'معلق', labelEn: 'Pending' }
    }
    
    const variant = variants[status as keyof typeof variants] || variants.pending
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      'paid': { color: 'bg-green-100 text-green-800', labelAr: 'مدفوع', labelEn: 'Paid' },
      'partial': { color: 'bg-yellow-100 text-yellow-800', labelAr: 'دفع جزئي', labelEn: 'Partial' },
      'pending': { color: 'bg-orange-100 text-orange-800', labelAr: 'معلق', labelEn: 'Pending' },
      'refunded': { color: 'bg-gray-100 text-gray-800', labelAr: 'مسترد', labelEn: 'Refunded' }
    }
    
    const variant = variants[status as keyof typeof variants] || variants.pending
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
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
      <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تفاصيل التسجيل' : 'Enrollment Details'}
              </h1>
              {getStatusBadge(enrollment.status)}
            </div>
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
        
        <Button
          onClick={() => navigate(`/enrollments/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <User className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الطالب' : 'Student Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {enrollment.student && (
                        language === 'ar' 
                          ? `${enrollment.student.first_name_ar} ${enrollment.student.last_name_ar}`
                          : `${enrollment.student.first_name_en || enrollment.student.first_name_ar} ${enrollment.student.last_name_en || enrollment.student.last_name_ar}`
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'رقم الطالب' : 'Registration Number'}
                  </label>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{enrollment.student?.registration_number}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ التسجيل' : 'Enrollment Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {new Date(enrollment.enrollment_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <GraduationCap className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الدورة' : 'Course Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'اسم الدورة' : 'Course Name'}
                  </label>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {enrollment.course && (
                        language === 'ar' ? enrollment.course.name_ar : (enrollment.course.name_en || enrollment.course.name_ar)
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'كود الدورة' : 'Course Code'}
                  </label>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{enrollment.course?.course_code}</span>
                  </div>
                </div>
              </div>

              {enrollment.course?.description_ar || enrollment.course?.description_en ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'وصف الدورة' : 'Course Description'}
                  </label>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? enrollment.course.description_ar : (enrollment.course.description_en || enrollment.course.description_ar)}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {enrollment.course?.start_date && new Date(enrollment.course.start_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {enrollment.course?.end_date && new Date(enrollment.course.end_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'مواعيد الجلسات' : 'Schedule Time'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{enrollment.course?.schedule_time}</span>
                  </div>
                </div>
              </div>

              {enrollment.course?.location && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الموقع' : 'Location'}
                  </label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{enrollment.course.location}</span>
                  </div>
                </div>
              )}

              {enrollment.course?.therapist_name && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المعالج' : 'Therapist'}
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{enrollment.course.therapist_name}</span>
                  </div>
                </div>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                  </label>
                  <div>
                    {getPaymentStatusBadge(enrollment.payment_status)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
                  </label>
                  <div className="text-lg font-bold text-green-600">
                    {enrollment.amount_paid.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'سعر الدورة' : 'Course Price'}
                  </label>
                  <div className="text-lg font-semibold">
                    {enrollment.course?.price ? `${enrollment.course.price.toLocaleString()} ${language === 'ar' ? 'ر.س' : 'SAR'}` : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {enrollment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <FileText className="w-5 h-5" />
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{enrollment.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Status */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                {getStatusBadge(enrollment.status)}
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'}
                </p>
                <p className="text-xs">
                  {new Date(enrollment.updated_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ملخص الدفع' : 'Payment Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                {getPaymentStatusBadge(enrollment.payment_status)}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المدفوع:' : 'Paid:'}
                  </span>
                  <span className="font-semibold text-green-600">
                    {enrollment.amount_paid.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </span>
                </div>
                {enrollment.course?.price && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'المتبقي:' : 'Remaining:'}
                    </span>
                    <span className="font-semibold text-orange-600">
                      {(enrollment.course.price - enrollment.amount_paid).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/enrollments/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل التسجيل' : 'Edit Enrollment'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/students/${enrollment.student_id}`)}
                disabled={!enrollment.student_id}
              >
                <User className="w-4 h-4" />
                {language === 'ar' ? 'تفاصيل الطالب' : 'Student Details'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                disabled={!enrollment.course_id}
              >
                <BookOpen className="w-4 h-4" />
                {language === 'ar' ? 'تفاصيل الدورة' : 'Course Details'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}