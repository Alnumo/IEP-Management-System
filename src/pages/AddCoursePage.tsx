import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateCourse } from '@/hooks/useCourses'
import CourseForm from '@/components/forms/CourseForm'
import { CreateCourseData } from '@/types/course'
import { toast } from 'sonner'

export const AddCoursePage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const createCourseMutation = useCreateCourse()

  const handleSubmit = async (data: CreateCourseData) => {
    try {
      await createCourseMutation.mutateAsync(data)
      
      toast.success(
        language === 'ar' 
          ? 'تم إنشاء الدورة بنجاح' 
          : 'Course created successfully'
      )
      
      navigate('/courses')
    } catch (error: any) {
      console.error('Error creating course:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في إنشاء الدورة'
          : `Error creating course: ${error.message}`
      )
    }
  }

  const handleCancel = () => {
    navigate('/courses')
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/courses')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة دورة جديدة' : 'Add New Course'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إنشاء دورة تدريبية جديدة' : 'Create a new training course'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'معلومات الدورة' : 'Course Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createCourseMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}