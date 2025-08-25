import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Calendar, Clock, BookOpen, Target, Package, Clipboard, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from '@/hooks/useSessions'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: session, isLoading, error } = useSession(id!)

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات الجلسة' 
          : 'Error loading session data'
      )
      navigate('/sessions')
    }
  }, [error, language, navigate])

  const getStatusBadge = (status: string) => {
    const variants = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', labelAr: 'مجدولة', labelEn: 'Scheduled' },
      'completed': { color: 'bg-green-100 text-green-800', labelAr: 'مكتملة', labelEn: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', labelAr: 'ملغاة', labelEn: 'Cancelled' },
      'rescheduled': { color: 'bg-orange-100 text-orange-800', labelAr: 'معاد جدولتها', labelEn: 'Rescheduled' }
    }
    
    const variant = variants[status as keyof typeof variants] || variants.scheduled
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours > 0) {
      return language === 'ar' 
        ? `${hours} ساعة ${remainingMinutes > 0 ? `و ${remainingMinutes} دقيقة` : ''}`
        : `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`
    }
    
    return language === 'ar' ? `${minutes} دقيقة` : `${minutes} minutes`
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

  if (!session) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'الجلسة غير موجودة' : 'Session not found'}
          </p>
          <Button onClick={() => navigate('/sessions')} className="mt-4">
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
            onClick={() => navigate('/sessions')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? `الجلسة رقم ${session.session_number}` : `Session #${session.session_number}`}
              </h1>
              {getStatusBadge(session.status)}
            </div>
            <p className="text-muted-foreground">
              {session.course && (
                <>
                  {language === 'ar' ? session.course.name_ar : (session.course.name_en || session.course.name_ar)}
                  {session.course.course_code && (
                    <span className="ml-2 text-xs">({session.course.course_code})</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate(`/sessions/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Calendar className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الجلسة' : 'Session Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ الجلسة' : 'Session Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {new Date(session.session_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'وقت الجلسة' : 'Session Time'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{session.session_time}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المدة' : 'Duration'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {formatDuration(session.duration_minutes)}
                    </span>
                  </div>
                </div>
              </div>

              {(session.topic_ar || session.topic_en) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'موضوع الجلسة' : 'Session Topic'}
                  </label>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {language === 'ar' ? session.topic_ar : (session.topic_en || session.topic_ar)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          {session.objectives && session.objectives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Target className="w-5 h-5" />
                  {language === 'ar' ? 'أهداف التعلم' : 'Learning Objectives'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Materials Needed */}
          {session.materials_needed && session.materials_needed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Package className="w-5 h-5" />
                  {language === 'ar' ? 'المواد المطلوبة' : 'Materials Needed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.materials_needed.map((material, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      <span className="text-sm">{material}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Homework Assignment */}
          {session.homework_assigned && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Clipboard className="w-5 h-5" />
                  {language === 'ar' ? 'الواجب المنزلي' : 'Homework Assignment'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{session.homework_assigned}</p>
              </CardContent>
            </Card>
          )}

          {/* Completion Notes */}
          {session.completion_notes && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Clipboard className="w-5 h-5" />
                  {language === 'ar' ? 'ملاحظات الإكمال' : 'Completion Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{session.completion_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Information */}
          {session.course && (
            <Card>
              <CardHeader>
                <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'معلومات الدورة' : 'Course Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {language === 'ar' ? session.course.name_ar : (session.course.name_en || session.course.name_ar)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.course.course_code}
                    </p>
                    {session.course.therapist_name && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'المعالج: ' : 'Therapist: '}
                        {session.course.therapist_name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Status */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'حالة الجلسة' : 'Session Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                {getStatusBadge(session.status)}
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'}
                </p>
                <p className="text-xs">
                  {new Date(session.updated_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US'
                  )}
                </p>
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
                onClick={() => navigate(`/sessions/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل الجلسة' : 'Edit Session'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/sessions/calendar')}
              >
                <Calendar className="w-4 h-4" />
                {language === 'ar' ? 'التقويم' : 'View Calendar'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/courses/${session.course_id}`)}
                disabled={!session.course_id}
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