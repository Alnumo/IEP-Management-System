import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTherapist, useUpdateTherapist } from '@/hooks/useTherapists'
import TherapistForm from '@/components/forms/TherapistForm'
import { UpdateTherapistData } from '@/types/therapist'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditTherapistPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: therapist, isLoading, error } = useTherapist(id!)
  const updateTherapistMutation = useUpdateTherapist()

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات المعالج' 
          : 'Error loading therapist data'
      )
      navigate('/therapists')
    }
  }, [error, language, navigate])

  const handleSubmit = async (data: UpdateTherapistData) => {
    try {
      await updateTherapistMutation.mutateAsync({
        id: id!,
        ...data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات المعالج بنجاح' 
          : 'Therapist updated successfully'
      )
      
      navigate('/therapists')
    } catch (error) {
      console.error('Error updating therapist:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات المعالج'
          : 'Error updating therapist'
      )
    }
  }

  const handleCancel = () => {
    navigate('/therapists')
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

  if (!therapist) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'المعالج غير موجود' : 'Therapist not found'}
          </p>
          <Button onClick={() => navigate('/therapists')} className="mt-4">
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
          onClick={() => navigate('/therapists')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل بيانات المعالج' : 'Edit Therapist'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل بيانات المعالج: ${therapist.name_ar || therapist.name_en}` 
              : `Edit therapist: ${therapist.name_en || therapist.name_ar}`
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات المعالج' : 'Therapist Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TherapistForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              first_name_ar: therapist.first_name_ar,
              last_name_ar: therapist.last_name_ar,
              first_name_en: therapist.first_name_en,
              last_name_en: therapist.last_name_en,
              email: therapist.email,
              phone: therapist.phone,
              address: therapist.address,
              specialization_ar: therapist.specialization_ar,
              specialization_en: therapist.specialization_en,
              qualifications: therapist.qualifications || [],
              experience_years: therapist.experience_years,
              hourly_rate: therapist.hourly_rate,
              employment_type: therapist.employment_type,
              hire_date: therapist.hire_date
            }}
            isLoading={updateTherapistMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}