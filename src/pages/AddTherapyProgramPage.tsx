import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateTherapyProgram } from '@/hooks/useTherapyPrograms'
import { CreateTherapyProgramData } from '@/types/therapy-programs'
import TherapyProgramForm from '@/components/forms/TherapyProgramForm'
import { toast } from 'sonner'

export default function AddTherapyProgramPage() {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createProgramMutation = useCreateTherapyProgram()

  const handleSubmit = async (data: CreateTherapyProgramData) => {
    try {
      await createProgramMutation.mutateAsync(data)
      
      toast.success(
        language === 'ar' 
          ? 'تم إنشاء البرنامج العلاجي بنجاح' 
          : 'Therapy program created successfully'
      )
      
      navigate('/therapy-programs')
    } catch (error) {
      console.error('Error creating therapy program:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في إنشاء البرنامج العلاجي'
          : 'Error creating therapy program'
      )
    }
  }

  const handleCancel = () => {
    navigate('/therapy-programs')
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
            {language === 'ar' ? 'إضافة برنامج علاجي جديد' : 'Add New Therapy Program'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'إنشاء برنامج علاجي جديد بالتفاصيل والمعايير المطلوبة' 
              : 'Create a new therapy program with detailed specifications and requirements'
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Plus className="w-5 h-5" />
            {language === 'ar' ? 'بيانات البرنامج العلاجي' : 'Therapy Program Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TherapyProgramForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createProgramMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}