import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  ArrowRight, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap,
  Stethoscope,
  Calendar,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudent, useDeleteStudent } from '@/hooks/useStudents'

export const StudentDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const { data: student, isLoading, error } = useStudent(id!)
  const deleteStudent = useDeleteStudent()

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'graduated': return 'outline'
      case 'suspended': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
      graduated: language === 'ar' ? 'متخرج' : 'Graduated',
      suspended: language === 'ar' ? 'موقوف' : 'Suspended'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getSeverityLabel = (severity: string) => {
    const severityLabels = {
      mild: language === 'ar' ? 'خفيفة' : 'Mild',
      moderate: language === 'ar' ? 'متوسطة' : 'Moderate',
      severe: language === 'ar' ? 'شديدة' : 'Severe'
    }
    return severityLabels[severity as keyof typeof severityLabels] || severity
  }

  const getDisplayName = (student: any) => {
    return language === 'ar' 
      ? `${student.first_name_ar} ${student.last_name_ar}`
      : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
  }

  const handleEdit = () => {
    navigate(`/students/edit/${id}`)
  }

  const handleDelete = async () => {
    try {
      console.log('🔍 StudentDetailsPage: Deleting student:', id)
      await deleteStudent.mutateAsync(id!)
      
      toast.success(
        language === 'ar' ? 'تم حذف الطالب بنجاح' : 'Student deleted successfully'
      )
      
      navigate('/students')
    } catch (error: any) {
      console.error('❌ StudentDetailsPage: Error deleting student:', error)
      toast.error(
        language === 'ar' ? 'خطأ في حذف الطالب' : 'Error deleting student',
        {
          description: error.message || 'Unknown error occurred'
        }
      )
    }
    setShowDeleteDialog(false)
  }

  if (isLoading) {
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

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              {getDisplayName(student)}
            </h1>
            <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {student.registration_number} • {language === 'ar' ? 'العمر:' : 'Age:'} {calculateAge(student.date_of_birth)} {language === 'ar' ? 'سنة' : 'years'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </AlertDialogTitle>
                <AlertDialogDescription className={language === 'ar' ? 'font-arabic text-right' : ''}>
                  {language === 'ar' 
                    ? 'هل أنت متأكد من حذف هذا الطالب؟ هذا الإجراء لا يمكن التراجع عنه.'
                    : 'Are you sure you want to delete this student? This action cannot be undone.'
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                <AlertDialogCancel className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${language === 'ar' ? 'font-arabic' : ''}`}
                  disabled={deleteStudent.isPending}
                >
                  {deleteStudent.isPending 
                    ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                    : (language === 'ar' ? 'حذف' : 'Delete')
                  }
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={getStatusBadgeVariant(student.status)} className="text-sm">
          {getStatusLabel(student.status)}
        </Badge>
      </div>

      {/* Student Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <User className="h-5 w-5" />
              {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </h4>
              <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? `${student.first_name_ar} ${student.last_name_ar}`
                  : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
                }
              </p>
              {((language === 'ar' && student.first_name_en) || (language === 'en' && student.first_name_ar)) && (
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? `${student.first_name_en} ${student.last_name_en}`
                    : `${student.first_name_ar} ${student.last_name_ar}`
                  }
                </p>
              )}
            </div>
            
            <Separator />
            
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
              </h4>
              <p className="text-sm">
                {new Date(student.date_of_birth).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
            
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الجنس' : 'Gender'}
              </h4>
              <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {student.gender === 'male' ? (language === 'ar' ? 'ذكر' : 'Male') : (language === 'ar' ? 'أنثى' : 'Female')}
              </p>
            </div>
            
            {student.national_id && (
              <div>
                <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'رقم الهوية/الإقامة' : 'National ID/Iqama'}
                </h4>
                <p className="text-sm">{student.national_id}</p>
              </div>
            )}
            
            {student.nationality_ar && (
              <div>
                <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الجنسية' : 'Nationality'}
                </h4>
                <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? student.nationality_ar : student.nationality_en}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Phone className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </h4>
                  <p className="text-sm">{student.phone}</p>
                </div>
              </div>
            )}
            
            {student.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </h4>
                  <p className="text-sm">{student.email}</p>
                </div>
              </div>
            )}
            
            {student.address_ar && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'العنوان' : 'Address'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.address_ar : student.address_en}
                  </p>
                  {student.city_ar && (
                    <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? student.city_ar : student.city_en}
                      {student.postal_code && `, ${student.postal_code}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medical Information */}
        {(student.diagnosis_ar || student.allergies_ar || student.medications_ar) && (
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Stethoscope className="h-5 w-5" />
                {language === 'ar' ? 'المعلومات الطبية' : 'Medical Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.diagnosis_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التشخيص' : 'Diagnosis'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.diagnosis_ar : student.diagnosis_en}
                  </p>
                  {student.severity_level && (
                    <Badge variant="outline" className="mt-1">
                      {getSeverityLabel(student.severity_level)}
                    </Badge>
                  )}
                </div>
              )}
              
              {student.allergies_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الحساسيات' : 'Allergies'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.allergies_ar : student.allergies_en}
                  </p>
                </div>
              )}
              
              {student.medications_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الأدوية' : 'Medications'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.medications_ar : student.medications_en}
                  </p>
                </div>
              )}
              
              {student.special_needs_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الاحتياجات الخاصة' : 'Special Needs'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.special_needs_ar : student.special_needs_en}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Educational Information */}
        {(student.school_name_ar || student.educational_support_ar) && (
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <GraduationCap className="h-5 w-5" />
                {language === 'ar' ? 'المعلومات التعليمية' : 'Educational Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.school_name_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'اسم المدرسة' : 'School Name'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.school_name_ar : student.school_name_en}
                  </p>
                </div>
              )}
              
              {student.grade_level && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الصف الدراسي' : 'Grade Level'}
                  </h4>
                  <p className="text-sm">{student.grade_level}</p>
                </div>
              )}
              
              {student.educational_support_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الدعم التعليمي' : 'Educational Support'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.educational_support_ar : student.educational_support_en}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Therapy Information */}
        {(student.referral_source_ar || student.therapy_goals_ar) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'معلومات العلاج' : 'Therapy Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.referral_source_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'مصدر الإحالة' : 'Referral Source'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.referral_source_ar : student.referral_source_en}
                  </p>
                </div>
              )}
              
              {student.therapy_goals_ar && (
                <div>
                  <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'أهداف العلاج' : 'Therapy Goals'}
                  </h4>
                  <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? student.therapy_goals_ar : student.therapy_goals_en}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'معلومات النظام' : 'System Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تاريخ التسجيل' : 'Enrollment Date'}
              </h4>
              <p className="text-sm">
                {new Date(student.enrollment_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
            
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}
              </h4>
              <p className="text-sm">
                {new Date(student.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
            
            <div>
              <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'آخر تحديث' : 'Last Updated'}
              </h4>
              <p className="text-sm">
                {new Date(student.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}