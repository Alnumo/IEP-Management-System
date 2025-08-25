// Add Medical Record Page
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { MedicalRecordForm, MedicalRecordFormData } from '@/components/forms/MedicalRecordForm'
import { useCreateMedicalRecord } from '@/hooks/useMedical'
import { useStudents } from '@/hooks/useStudents'

export const AddMedicalRecordPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  // Hooks
  const createMedicalRecord = useCreateMedicalRecord()
  const { data: students = [], isLoading: studentsLoading } = useStudents()

  const handleSubmit = async (data: MedicalRecordFormData) => {
    try {
      console.log('📋 Creating medical record:', data)
      
      // Generate medical record number if not provided
      const medicalRecordNumber = data.medical_record_number || 
        `MR${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      
      const recordData = {
        ...data,
        medical_record_number: medicalRecordNumber,
        is_encrypted: true,
        data_classification: data.data_classification || 'internal'
      }

      const result = await createMedicalRecord.mutateAsync(recordData)
      console.log('✅ Medical record created successfully:', result)
      navigate('/medical-records')
    } catch (error) {
      console.error('❌ Failed to create medical record:', error)
    }
  }

  const handleCancel = () => {
    navigate('/medical-records')
  }

  // Transform students data for the form
  const studentsForForm = students.map(student => ({
    id: student.id,
    name_ar: `${student.first_name_ar} ${student.last_name_ar}`,
    name_en: student.first_name_en && student.last_name_en ? `${student.first_name_en} ${student.last_name_en}` : undefined
  }))

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/medical-records')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة سجل طبي جديد' : 'Add New Medical Record'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'إنشاء سجل طبي جديد للطالب مع جميع المعلومات الطبية المطلوبة'
              : 'Create a new medical record for a student with all required medical information'
            }
          </p>
        </div>
      </div>

      {/* Loading State */}
      {studentsLoading ? (
        <div className="text-center py-8">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'جاري تحميل بيانات الطلاب...' : 'Loading students data...'}
          </p>
        </div>
      ) : (
        /* Medical Record Form */
        <MedicalRecordForm
          students={studentsForForm}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMedicalRecord.isPending}
        />
      )}
    </div>
  )
}

export default AddMedicalRecordPage