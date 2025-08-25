// Edit Medical Record Page
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { MedicalRecordForm, MedicalRecordFormData } from '@/components/forms/MedicalRecordForm'
import { useMedicalRecord, useUpdateMedicalRecord } from '@/hooks/useMedical'
import { useStudents } from '@/hooks/useStudents'

export const EditMedicalRecordPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  // Hooks
  const { data: medicalRecord, isLoading: recordLoading, error: recordError } = useMedicalRecord(id!)
  const updateMedicalRecord = useUpdateMedicalRecord()
  const { data: students = [], isLoading: studentsLoading } = useStudents()

  const handleSubmit = async (data: MedicalRecordFormData) => {
    if (!id) return

    try {
      console.log('📋 Updating medical record:', { id, data })
      
      const updateData = { ...data, id }
      const result = await updateMedicalRecord.mutateAsync({ id, data: updateData })
      console.log('✅ Medical record updated successfully:', result)
      navigate('/medical-records')
    } catch (error) {
      console.error('❌ Failed to update medical record:', error)
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

  // Loading state
  if (recordLoading || studentsLoading) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'جاري تحميل السجل الطبي...' : 'Loading medical record...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (recordError || !medicalRecord) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/medical-records')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل السجل الطبي' : 'Edit Medical Record'}
          </h1>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? 'لم يتم العثور على السجل الطبي أو حدث خطأ في التحميل'
                  : 'Medical record not found or failed to load'
                }
              </p>
            </div>
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
          variant="outline"
          size="icon"
          onClick={() => navigate('/medical-records')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تعديل السجل الطبي' : 'Edit Medical Record'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل السجل الطبي رقم: ${medicalRecord.medical_record_number}`
              : `Edit medical record #${medicalRecord.medical_record_number}`
            }
          </p>
        </div>
      </div>

      {/* Medical Record Form */}
      <MedicalRecordForm
        initialData={medicalRecord}
        students={studentsForForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMedicalRecord.isPending}
      />
    </div>
  )
}

export default EditMedicalRecordPage