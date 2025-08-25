import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Calendar, Users, MapPin, DollarSign, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCourse } from '@/hooks/useCourses'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function CourseDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: course, isLoading, error } = useCourse(id!)

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات الدورة' 
          : 'Error loading course data'
      )
      navigate('/courses')
    }
  }, [error, language, navigate])

  const getStatusBadge = (status: string) => {
    const variants = {
      'planned': { color: 'bg-blue-100 text-blue-800', labelAr: 'مخطط', labelEn: 'Planned' },
      'active': { color: 'bg-green-100 text-green-800', labelAr: 'نشط', labelEn: 'Active' },
      'completed': { color: 'bg-gray-100 text-gray-800', labelAr: 'مكتمل', labelEn: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', labelAr: 'ملغى', labelEn: 'Cancelled' }
    }
    
    const variant = variants[status as keyof typeof variants] || variants.planned
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const getDayLabel = (day: string) => {
    const days = {
      'sunday': { ar: 'الأحد', en: 'Sunday' },
      'monday': { ar: 'الاثنين', en: 'Monday' },
      'tuesday': { ar: 'الثلاثاء', en: 'Tuesday' },
      'wednesday': { ar: 'الأربعاء', en: 'Wednesday' },
      'thursday': { ar: 'الخميس', en: 'Thursday' },
      'friday': { ar: 'الجمعة', en: 'Friday' },
      'saturday': { ar: 'السبت', en: 'Saturday' }
    }
    return language === 'ar' ? days[day as keyof typeof days]?.ar : days[day as keyof typeof days]?.en
  }

  const formatScheduleDays = (days: string[]) => {
    return days.map(day => getDayLabel(day)).join(', ')
  }

  const calculateProgress = () => {
    if (!course || course.max_students === 0) return 0
    return Math.round((course.enrolled_students / course.max_students) * 100)
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

  if (!course) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'الدورة غير موجودة' : 'Course not found'}
          </p>
          <Button onClick={() => navigate('/courses')} className="mt-4">
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
            onClick={() => navigate('/courses')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? course.name_ar : (course.name_en || course.name_ar)}
              </h1>
              {getStatusBadge(course.status)}
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? `رمز الدورة: ${course.course_code}` : `Course Code: ${course.course_code}`}
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate(`/courses/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Calendar className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الدورة' : 'Course Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.description_ar && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <p className="text-sm leading-relaxed">
                    {language === 'ar' ? course.description_ar : (course.description_en || course.description_ar)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(course.start_date).toLocaleDateString(
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
                      {new Date(course.end_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'وقت الدرس' : 'Class Time'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{course.schedule_time}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'أيام الأسبوع' : 'Schedule Days'}
                  </label>
                  <p className="text-sm">
                    {formatScheduleDays(course.schedule_days)}
                  </p>
                </div>

                {course.location && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'الموقع' : 'Location'}
                    </label>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{course.location}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'السعر' : 'Price'}
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {course.price.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                    </span>
                  </div>
                </div>
              </div>

              {course.requirements && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المتطلبات' : 'Requirements'}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {course.requirements}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrollment Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Users className="w-5 h-5" />
                {language === 'ar' ? 'إحصائيات التسجيل' : 'Enrollment Statistics'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{language === 'ar' ? 'المسجلون حالياً' : 'Enrolled Students'}</span>
                  <span className="font-semibold">
                    {course.enrolled_students} / {course.max_students}
                  </span>
                </div>
                <Progress value={calculateProgress()} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {calculateProgress()}% {language === 'ar' ? 'من السعة الكاملة' : 'of capacity filled'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {course.enrolled_students}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المسجلون' : 'Enrolled'}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {course.max_students - course.enrolled_students}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الأماكن المتاحة' : 'Available Spots'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Therapist Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <User className="w-5 h-5" />
                {language === 'ar' ? 'المعالج المسؤول' : 'Assigned Therapist'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.therapist_name ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{course.therapist_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'معالج مسؤول' : 'Lead Therapist'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {language === 'ar' ? 'لم يحدد معالج بعد' : 'No therapist assigned yet'}
                  </p>
                </div>
              )}
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
                onClick={() => navigate(`/courses/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل الدورة' : 'Edit Course'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/enrollments?course=' + id)}
              >
                <Users className="w-4 h-4" />
                {language === 'ar' ? 'إدارة التسجيلات' : 'Manage Enrollments'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/sessions?course=' + id)}
              >
                <Calendar className="w-4 h-4" />
                {language === 'ar' ? 'جلسات الدورة' : 'Course Sessions'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}