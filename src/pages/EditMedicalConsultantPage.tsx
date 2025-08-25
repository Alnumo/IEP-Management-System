import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MedicalConsultantForm } from '@/components/forms/MedicalConsultantForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMedicalConsultant, useUpdateMedicalConsultant } from '@/hooks/useMedical'

export const EditMedicalConsultantPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()

  const { data: consultant, isLoading: isLoadingConsultant, error: consultantError } = useMedicalConsultant(id!)
  const updateMedicalConsultant = useUpdateMedicalConsultant()

  const handleSubmit = async (data: any) => {
    if (!id) return
    
    try {
      await updateMedicalConsultant.mutateAsync({ id, data })
      console.log('✅ Medical consultant updated successfully')
      navigate('/medical-consultants')
    } catch (error) {
      console.error('❌ Failed to update medical consultant:', error)
    }
  }

  if (isLoadingConsultant) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل بيانات الاستشاري...' : 'Loading consultant data...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (consultantError || !consultant) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل بيانات الاستشاري الطبي' : 'Error loading medical consultant data'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/medical-consultants')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل الاستشاري الطبي' : 'Edit Medical Consultant'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تعديل بيانات الاستشاري الطبي' : 'Edit medical consultant information'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            {language === 'ar' ? 'تعديل معلومات الاستشاري الطبي' : 'Edit Medical Consultant Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalConsultantForm
            initialData={consultant}
            onSubmit={handleSubmit}
            isLoading={updateMedicalConsultant.isPending}
            error={updateMedicalConsultant.error?.message}
            submitLabel={
              updateMedicalConsultant.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'ar' ? 'جاري التحديث...' : 'Updating...'}
                </div>
              ) : (
                language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default EditMedicalConsultantPage