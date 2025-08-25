import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MedicalConsultantForm } from '@/components/forms/MedicalConsultantForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateMedicalConsultant } from '@/hooks/useMedical'
import type { CreateMedicalConsultantData } from '@/types/medical'

export const AddMedicalConsultantPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createMedicalConsultant = useCreateMedicalConsultant()

  const handleSubmit = async (data: CreateMedicalConsultantData) => {
    try {
      await createMedicalConsultant.mutateAsync(data)
      console.log('✅ Medical consultant created successfully')
      navigate('/medical-consultants')
    } catch (error) {
      console.error('❌ Failed to create medical consultant:', error)
    }
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
            {language === 'ar' ? 'إضافة استشاري طبي جديد' : 'Add New Medical Consultant'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إضافة استشاري طبي جديد إلى النظام' : 'Add a new medical consultant to the system'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {language === 'ar' ? 'معلومات الاستشاري الطبي' : 'Medical Consultant Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalConsultantForm
            onSubmit={handleSubmit}
            isLoading={createMedicalConsultant.isPending}
            error={createMedicalConsultant.error?.message}
            submitLabel={
              createMedicalConsultant.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'ar' ? 'جاري الإضافة...' : 'Adding...'}
                </div>
              ) : (
                language === 'ar' ? 'إضافة الاستشاري' : 'Add Consultant'
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AddMedicalConsultantPage