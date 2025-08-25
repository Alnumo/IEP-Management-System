import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCourse, useUpdateCourse } from '@/hooks/useCourses'
import CourseForm from '@/components/forms/CourseForm'
import { UpdateCourseData } from '@/types/course'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: course, isLoading, error } = useCourse(id!)
  const updateCourseMutation = useUpdateCourse()

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات الدورة' 
          : 'Error loading course data'
      )
      navigate('/courses')
    }
  }, [error, language, navigate])

  const handleSubmit = async (data: UpdateCourseData) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: id!,
        ...data
      })
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات الدورة بنجاح' 
          : 'Course updated successfully'
      )
      
      navigate('/courses')
    } catch (error) {
      console.error('Error updating course:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات الدورة'
          : 'Error updating course'
      )
    }
  }

  const handleCancel = () => {
    navigate('/courses')
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

  if (!course) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'الدورة غير موجودة' : 'Course not found'}
          </p>
          <Button onClick={() => navigate('/courses')} className="mt-4">
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
          onClick={() => navigate('/courses')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Course'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل بيانات الدورة: ${course.name_ar}` 
              : `Edit course: ${course.name_en || course.name_ar}`
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات الدورة' : 'Course Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              name_ar: course.name_ar,
              name_en: course.name_en,
              description_ar: course.description_ar,
              description_en: course.description_en,
              therapist_id: course.therapist_id,
              start_date: course.start_date,
              end_date: course.end_date,
              schedule_days: course.schedule_days,
              schedule_time: course.schedule_time,
              max_students: course.max_students,
              price: course.price,
              location: course.location,
              requirements: course.requirements
            }}
            isLoading={updateCourseMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}