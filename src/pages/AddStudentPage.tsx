import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComprehensiveStudentForm } from '@/components/forms/ComprehensiveStudentForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateStudent } from '@/hooks/useStudents'
import type { CreateStudentData } from '@/types/student'

export const AddStudentPage = () => {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const createStudent = useCreateStudent()

  const handleSubmit = async (data: CreateStudentData) => {
    try {
      console.log('🔍 AddStudentPage: Creating student with data:', data)
      await createStudent.mutateAsync(data)
      
      toast.success(
        language === 'ar' ? 'تم إضافة الطالب بنجاح' : 'Student added successfully'
      )
      
      navigate('/students')
    } catch (error: any) {
      console.error('❌ AddStudentPage: Error creating student:', error)
      toast.error(
        language === 'ar' ? 'خطأ في إضافة الطالب' : 'Error adding student',
        {
          description: error.message || 'Unknown error occurred'
        }
      )
    }
  }

  const handleCancel = () => {
    navigate('/students')
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/students')}
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
            {language === 'ar' ? 'إضافة طالب جديد' : 'Add New Student'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدخال بيانات طالب جديد في النظام' : 'Enter new student information into the system'}
          </p>
        </div>
      </div>

      {/* Comprehensive Student Form */}
      <ComprehensiveStudentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createStudent.isPending}
      />
    </div>
  )
}