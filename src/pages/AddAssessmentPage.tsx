import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateAssessmentResult } from '@/hooks/useAssessments'
import { CreateAssessmentResultData } from '@/types/assessment'
import AssessmentForm from '@/components/forms/AssessmentForm'
import { toast } from 'sonner'

export default function AddAssessmentPage() {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createAssessmentMutation = useCreateAssessmentResult()

  const handleSubmit = async (data: CreateAssessmentResultData) => {
    try {
      await createAssessmentMutation.mutateAsync(data)
      
      toast.success(
        language === 'ar' 
          ? 'تم إنشاء التقييم بنجاح' 
          : 'Assessment created successfully'
      )
      
      navigate('/assessments')
    } catch (error) {
      console.error('Error creating assessment:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في إنشاء التقييم'
          : 'Error creating assessment'
      )
    }
  }

  const handleCancel = () => {
    navigate('/assessments')
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
            {language === 'ar' ? 'إضافة تقييم جديد' : 'Add New Assessment'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'إنشاء تقييم جديد للطالب مع النتائج والتفسيرات' 
              : 'Create a new student assessment with results and interpretations'
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Plus className="w-5 h-5" />
            {language === 'ar' ? 'بيانات التقييم' : 'Assessment Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createAssessmentMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}