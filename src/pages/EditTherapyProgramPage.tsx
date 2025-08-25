import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTherapyProgram, useUpdateTherapyProgram } from '@/hooks/useTherapyPrograms'
import TherapyProgramForm from '@/components/forms/TherapyProgramForm'
import { UpdateTherapyProgramData } from '@/types/therapy-programs'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditTherapyProgramPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: therapyProgram, isLoading, error } = useTherapyProgram(id!)
  const updateTherapyProgramMutation = useUpdateTherapyProgram()

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات البرنامج العلاجي' 
          : 'Error loading therapy program data'
      )
      navigate('/therapy-programs')
    }
  }, [error, language, navigate])

  const handleSubmit = async (data: UpdateTherapyProgramData) => {
    try {
      await updateTherapyProgramMutation.mutateAsync({
        id: id!,
        data: data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات البرنامج العلاجي بنجاح' 
          : 'Therapy program updated successfully'
      )
      
      navigate('/therapy-programs')
    } catch (error) {
      console.error('Error updating therapy program:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات البرنامج العلاجي'
          : 'Error updating therapy program'
      )
    }
  }

  const handleCancel = () => {
    navigate('/therapy-programs')
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

  if (!therapyProgram) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'البرنامج العلاجي غير موجود' : 'Therapy program not found'}
          </p>
          <Button onClick={() => navigate('/therapy-programs')} className="mt-4">
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
          onClick={() => navigate('/therapy-programs')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل البرنامج العلاجي' : 'Edit Therapy Program'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل ${therapyProgram.name_ar} (${therapyProgram.program_code})`
              : `Edit ${therapyProgram.name_en || therapyProgram.name_ar} (${therapyProgram.program_code})`
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات البرنامج العلاجي' : 'Therapy Program Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TherapyProgramForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              program_code: therapyProgram.program_code,
              name_ar: therapyProgram.name_ar,
              name_en: therapyProgram.name_en,
              category: therapyProgram.category,
              intensity_level: therapyProgram.intensity_level,
              default_sessions_per_week: therapyProgram.default_sessions_per_week,
              default_session_duration_minutes: therapyProgram.default_session_duration_minutes,
              minimum_age_months: therapyProgram.minimum_age_months,
              maximum_age_months: therapyProgram.maximum_age_months,
              description_ar: therapyProgram.description_ar,
              description_en: therapyProgram.description_en,
              objectives_ar: therapyProgram.objectives_ar,
              objectives_en: therapyProgram.objectives_en,
              target_conditions: therapyProgram.target_conditions,
              requires_medical_clearance: therapyProgram.requires_medical_clearance
            }}
            isLoading={updateTherapyProgramMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}