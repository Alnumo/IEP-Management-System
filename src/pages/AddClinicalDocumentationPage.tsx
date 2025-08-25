import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClinicalDocumentationForm } from '@/components/forms/ClinicalDocumentationForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateClinicalDocumentation } from '@/hooks/useMedical'
import { useStudents } from '@/hooks/useStudents'
import type { ClinicalDocumentationFormData } from '@/components/forms/ClinicalDocumentationForm'

export const AddClinicalDocumentationPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createClinicalDocumentation = useCreateClinicalDocumentation()
  const { data: students = [] } = useStudents()

  const handleSubmit = async (data: ClinicalDocumentationFormData) => {
    try {
      // Transform form data for API
      const documentationData = {
        ...data,
        // Convert arrays to proper format
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
        
        // Set default values for complex fields
        soap_notes: {},
        vital_signs: {},
        behavioral_data: {},
        frequency_data: {},
        duration_data: {},
        intensity_scores: {},
        progress_metrics: {},
        therapist_signature: {},
        medical_consultant_signature: {},
        parent_acknowledgment: {},
        approval_workflow: {},
        
        // Set boolean defaults
        is_encrypted: true,
        requires_medical_review: data.requires_medical_review || false,
        follow_up_needed: data.follow_up_needed || false,
        
        // Set timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await createClinicalDocumentation.mutateAsync(documentationData)
      console.log('✅ Clinical documentation created successfully')
      navigate('/clinical-documentation')
    } catch (error) {
      console.error('❌ Failed to create clinical documentation:', error)
    }
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
            {language === 'ar' ? 'إضافة توثيق إكلينيكي جديد' : 'Add New Clinical Documentation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إنشاء توثيق إكلينيكي جديد للجلسة' : 'Create new clinical documentation for session'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'نموذج التوثيق الإكلينيكي' : 'Clinical Documentation Form'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicalDocumentationForm
            students={students}
            onSubmit={handleSubmit}
            isLoading={createClinicalDocumentation.isPending}
            error={createClinicalDocumentation.error?.message}
            submitLabel={
              createClinicalDocumentation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </div>
              ) : (
                language === 'ar' ? 'حفظ التوثيق' : 'Save Documentation'
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AddClinicalDocumentationPage