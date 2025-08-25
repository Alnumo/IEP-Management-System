import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAssessmentResult, useUpdateAssessmentResult } from '@/hooks/useAssessments'
import AssessmentForm from '@/components/forms/AssessmentForm'
import { UpdateAssessmentResultData } from '@/types/assessment'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditAssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: assessment, isLoading, error } = useAssessmentResult(id!)
  const updateAssessmentMutation = useUpdateAssessmentResult()

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات التقييم' 
          : 'Error loading assessment data'
      )
      navigate('/assessments')
    }
  }, [error, language, navigate])

  const handleSubmit = async (data: UpdateAssessmentResultData) => {
    try {
      await updateAssessmentMutation.mutateAsync({
        id: id!,
        ...data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات التقييم بنجاح' 
          : 'Assessment updated successfully'
      )
      
      navigate('/assessments')
    } catch (error) {
      console.error('Error updating assessment:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات التقييم'
          : 'Error updating assessment'
      )
    }
  }

  const handleCancel = () => {
    navigate('/assessments')
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

  if (!assessment) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'التقييم غير موجود' : 'Assessment not found'}
          </p>
          <Button onClick={() => navigate('/assessments')} className="mt-4">
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
          onClick={() => navigate('/assessments')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل التقييم' : 'Edit Assessment'}
          </h1>
          <p className="text-muted-foreground">
            {assessment.students && (
              <>
                {language === 'ar' 
                  ? `${assessment.students.first_name_ar} ${assessment.students.last_name_ar}`
                  : `${assessment.students.first_name_en || assessment.students.first_name_ar} ${assessment.students.last_name_en || assessment.students.last_name_ar}`
                }
                {assessment.assessment_tools && (
                  <span className="ml-2">
                    - {language === 'ar' ? assessment.assessment_tools.name_ar : (assessment.assessment_tools.name_en || assessment.assessment_tools.name_ar)}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات التقييم' : 'Assessment Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              student_id: assessment.student_id,
              assessment_tool_id: assessment.assessment_tool_id,
              assessment_date: assessment.assessment_date,
              assessor_id: assessment.assessor_id,
              assessment_purpose: assessment.assessment_purpose,
              overall_score: assessment.overall_score,
              interpretation_summary_ar: assessment.interpretation_summary_ar,
              interpretation_summary_en: assessment.interpretation_summary_en,
              raw_scores: assessment.raw_scores,
              standard_scores: assessment.standard_scores
            }}
            isLoading={updateAssessmentMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}