import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClinicalDocumentationForm } from '@/components/forms/ClinicalDocumentationForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useClinicalDocument, useUpdateClinicalDocumentation } from '@/hooks/useMedical'
import { useStudents } from '@/hooks/useStudents'

export const EditClinicalDocumentationPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()

  const { data: documentation, isLoading: isLoadingDoc, error: docError } = useClinicalDocument(id!)
  const updateClinicalDocumentation = useUpdateClinicalDocumentation()
  const { data: students = [] } = useStudents()

  const handleSubmit = async (data: any) => {
    if (!id) return
    
    try {
      // Transform form data for API
      const documentationData = {
        ...data,
        // Ensure arrays are properly formatted
        observed_behaviors: data.observed_behaviors || [],
        concerns_identified: data.concerns_identified || [],
        risk_factors: data.risk_factors || [],
        recommendations: data.recommendations || [],
        referrals_needed: data.referrals_needed || [],
        interventions_used: data.interventions_used || [],
        materials_utilized: data.materials_utilized || [],
        side_effects_observed: data.side_effects_observed || [],
        contraindications_noted: data.contraindications_noted || [],
        attendees: data.attendees || [],
      }

      await updateClinicalDocumentation.mutateAsync({ id, data: documentationData })
      console.log('✅ Clinical documentation updated successfully')
      navigate('/clinical-documentation')
    } catch (error) {
      console.error('❌ Failed to update clinical documentation:', error)
    }
  }

  if (isLoadingDoc) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل التوثيق...' : 'Loading documentation...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (docError || !documentation) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل التوثيق الإكلينيكي' : 'Error loading clinical documentation'}
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
          onClick={() => navigate('/clinical-documentation')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل التوثيق الإكلينيكي' : 'Edit Clinical Documentation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تعديل بيانات التوثيق الإكلينيكي' : 'Edit clinical documentation details'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            {language === 'ar' ? 'تعديل التوثيق الإكلينيكي' : 'Edit Clinical Documentation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicalDocumentationForm
            initialData={documentation}
            students={students}
            onSubmit={handleSubmit}
            isLoading={updateClinicalDocumentation.isPending}
            error={updateClinicalDocumentation.error?.message}
            submitLabel={
              updateClinicalDocumentation.isPending ? (
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

export default EditClinicalDocumentationPage