import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession, useUpdateSession } from '@/hooks/useSessions'
import SessionForm from '@/components/forms/SessionForm'
import { UpdateSessionData } from '@/types/session'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditSessionPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: session, isLoading, error } = useSession(id!)
  const updateSessionMutation = useUpdateSession()

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

  const handleSubmit = async (data: UpdateSessionData) => {
    try {
      await updateSessionMutation.mutateAsync({
        id: id!,
        ...data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات الجلسة بنجاح' 
          : 'Session updated successfully'
      )
      
      navigate('/sessions')
    } catch (error) {
      console.error('Error updating session:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات الجلسة'
          : 'Error updating session'
      )
    }
  }

  const handleCancel = () => {
    navigate('/sessions')
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
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل بيانات الجلسة' : 'Edit Session'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل الجلسة رقم ${session.session_number}` 
              : `Edit Session #${session.session_number}`
            }
            {session.course && (
              <span className="ml-2">
                - {language === 'ar' ? session.course.name_ar : (session.course.name_en || session.course.name_ar)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات الجلسة' : 'Session Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              course_id: session.course_id,
              session_number: session.session_number,
              session_date: session.session_date,
              session_time: session.session_time,
              duration_minutes: session.duration_minutes,
              topic_ar: session.topic_ar,
              topic_en: session.topic_en,
              objectives: session.objectives || [],
              materials_needed: session.materials_needed || [],
              homework_assigned: session.homework_assigned
            }}
            isLoading={updateSessionMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}