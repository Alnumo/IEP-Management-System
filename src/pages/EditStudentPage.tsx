import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComprehensiveStudentForm } from '@/components/forms/ComprehensiveStudentForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudent, useUpdateStudent } from '@/hooks/useStudents'
import type { CreateStudentData, UpdateStudentData } from '@/types/student'

export const EditStudentPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  
  const { data: student, isLoading: isLoadingStudent, error } = useStudent(id!)
  const updateStudent = useUpdateStudent()

  const handleSubmit = async (data: CreateStudentData) => {
    try {
      console.log('🔍 EditStudentPage: Updating student with data:', data)
      const updateData: UpdateStudentData = {
        id: id!,
        ...data
      }
      await updateStudent.mutateAsync({ id: id!, data: updateData })
      
      toast.success(
        language === 'ar' ? 'تم تحديث بيانات الطالب بنجاح' : 'Student updated successfully'
      )
      
      navigate(`/students/${id}`)
    } catch (error: any) {
      console.error('❌ EditStudentPage: Error updating student:', error)
      toast.error(
        language === 'ar' ? 'خطأ في تحديث بيانات الطالب' : 'Error updating student',
        {
          description: error.message || 'Unknown error occurred'
        }
      )
    }
  }

  const handleCancel = () => {
    navigate(`/students/${id}`)
  }

  if (isLoadingStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل بيانات الطالب...' : 'Loading student data...'}
          </p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            {language === 'ar' ? 'خطأ في تحميل بيانات الطالب' : 'Error loading student data'}
          </p>
          <Button onClick={() => navigate('/students')}>
            {language === 'ar' ? 'العودة للطلاب' : 'Back to Students'}
          </Button>
        </div>
      </div>
    )
  }

  const getDisplayName = (student: any) => {
    return language === 'ar' 
      ? `${student.first_name_ar} ${student.last_name_ar}`
      : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(`/students/${id}`)}
          className="flex items-center gap-2"
        >
          {isRTL ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل بيانات الطالب' : 'Edit Student'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {getDisplayName(student)} • {student.registration_number}
          </p>
        </div>
      </div>

      {/* Comprehensive Student Form */}
      <ComprehensiveStudentForm
        initialData={student}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateStudent.isPending}
      />
    </div>
  )
}