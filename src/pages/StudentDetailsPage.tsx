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
  FileText,
  Brain,
  Target,
  TrendingUp,
  Heart,
  Users,
  BookOpen,
  Plus,
  Eye,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudent, useDeleteStudent } from '@/hooks/useStudents'
import { useMedicalRecords } from '@/hooks/useMedical'
import { useProgramEnrollments } from '@/hooks/useTherapyPrograms'
import { useAssessmentResults, useTherapeuticGoals, useProgressTracking } from '@/hooks/useAssessments'

export const StudentDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Main student data
  const { data: student, isLoading, error } = useStudent(id!)
  const deleteStudent = useDeleteStudent()
  
  // Additional data for enhanced profile
  const { data: medicalRecords = [] } = useMedicalRecords({ student_id: id })
  const { data: programEnrollments = [] } = useProgramEnrollments({ student_id: id })
  const { data: assessmentResults = [] } = useAssessmentResults({ student_id: id })
  const { data: therapeuticGoals = [] } = useTherapeuticGoals({ student_id: id })
  const { data: progressTracking = [] } = useProgressTracking({ student_id: id })

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
      await deleteStudent.mutateAsync(id!)
      toast.success(
        language === 'ar' ? 'تم حذف الطالب بنجاح' : 'Student deleted successfully'
      )
      navigate('/students')
    } catch (error: any) {
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

  const activeEnrollments = programEnrollments.filter(e => e.enrollment_status === 'active')
  const activeGoals = therapeuticGoals.filter(g => g.status === 'active')
  const recentAssessments = assessmentResults.slice(0, 3)

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
            {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
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

      {/* Status Badge and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Badge variant={getStatusBadgeVariant(student.status)} className="text-sm w-fit">
          {getStatusLabel(student.status)}
        </Badge>
        
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{activeEnrollments.length} {language === 'ar' ? 'برامج نشطة' : 'Active Programs'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span>{activeGoals.length} {language === 'ar' ? 'أهداف نشطة' : 'Active Goals'}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{recentAssessments.length} {language === 'ar' ? 'تقييمات' : 'Assessments'}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            <User className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="medical" className={language === 'ar' ? 'font-arabic' : ''}>
            <Heart className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'طبي' : 'Medical'}
          </TabsTrigger>
          <TabsTrigger value="programs" className={language === 'ar' ? 'font-arabic' : ''}>
            <Brain className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'البرامج' : 'Programs'}
          </TabsTrigger>
          <TabsTrigger value="goals" className={language === 'ar' ? 'font-arabic' : ''}>
            <Target className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الأهداف' : 'Goals'}
          </TabsTrigger>
          <TabsTrigger value="assessments" className={language === 'ar' ? 'font-arabic' : ''}>
            <FileText className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'التقييمات' : 'Assessments'}
          </TabsTrigger>
          <TabsTrigger value="progress" className={language === 'ar' ? 'font-arabic' : ''}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Plus className="h-5 w-5" />
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/medical-records/add?student_id=${id}`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Heart className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'سجل طبي' : 'Medical Record'}
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/enrollments/add?student_id=${id}`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تسجيل دورة' : 'Enroll Course'}
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/therapy-plan-enrollments/add?student_id=${id}`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Target className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تسجيل خطة' : 'Enroll Plan'}
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/therapy-program-enrollments/add?student_id=${id}`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Brain className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تسجيل برنامج' : 'Enroll Program'}
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/assessments/add?student_id=${id}`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <FileText className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تقييم' : 'Assessment'}
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/therapeutic-goals?student_id=${id}&action=add`)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Target className="h-4 w-4" />
                  <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'هدف علاجي' : 'Goal'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

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
                
                {student.child_id && (
                  <div>
                    <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'رقم الطفل' : 'Child ID'}
                    </h4>
                    <p className="text-sm font-mono">{student.child_id}</p>
                  </div>
                )}
                
                {student.nationality_ar && (
                  <div>
                    <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الجنسية' : 'Nationality'}
                    </h4>
                    <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? student.nationality_ar : student.nationality_en || student.nationality_ar}
                    </p>
                  </div>
                )}
                
                {(student.height || student.weight) && (
                  <div>
                    <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'القياسات الجسمية' : 'Physical Measurements'}
                    </h4>
                    <div className="flex gap-4 text-sm">
                      {student.height && (
                        <span>{language === 'ar' ? 'الطول:' : 'Height:'} {student.height} cm</span>
                      )}
                      {student.weight && (
                        <span>{language === 'ar' ? 'الوزن:' : 'Weight:'} {student.weight} kg</span>
                      )}
                    </div>
                  </div>
                )}
                
                {student.blood_type && (
                  <div>
                    <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'فصيلة الدم' : 'Blood Type'}
                    </h4>
                    <Badge variant="outline">{student.blood_type}</Badge>
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
          </div>

          {/* Family Information */}
          {(student.father_full_name || student.mother_full_name || student.guardian_full_name) && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Users className="h-5 w-5" />
                  {language === 'ar' ? 'معلومات الأسرة' : 'Family Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Father Information */}
                {student.father_full_name && (
                  <div>
                    <h4 className={`font-semibold text-sm mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات الأب' : 'Father Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                        </p>
                        <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {student.father_full_name}
                        </p>
                      </div>
                      {student.father_mobile && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'رقم الجوال' : 'Mobile'}
                          </p>
                          <p className="text-sm">{student.father_mobile}</p>
                        </div>
                      )}
                      {student.father_job && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'المهنة' : 'Job'}
                          </p>
                          <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {student.father_job}
                          </p>
                        </div>
                      )}
                      {student.father_education && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'المستوى التعليمي' : 'Education'}
                          </p>
                          <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {student.father_education}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Information */}
                {student.mother_full_name && (
                  <div>
                    <Separator />
                    <h4 className={`font-semibold text-sm mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات الأم' : 'Mother Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                        </p>
                        <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {student.mother_full_name}
                        </p>
                      </div>
                      {student.mother_mobile && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'رقم الجوال' : 'Mobile'}
                          </p>
                          <p className="text-sm">{student.mother_mobile}</p>
                        </div>
                      )}
                      {student.mother_job && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'المهنة' : 'Job'}
                          </p>
                          <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {student.mother_job}
                          </p>
                        </div>
                      )}
                      {student.mother_education && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'المستوى التعليمي' : 'Education'}
                          </p>
                          <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {student.mother_education}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Guardian Information */}
                {student.guardian_full_name && (
                  <div>
                    <Separator />
                    <h4 className={`font-semibold text-sm mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معلومات ولي الأمر' : 'Guardian Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                        </p>
                        <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {student.guardian_full_name}
                        </p>
                      </div>
                      {student.guardian_mobile && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'رقم الجوال' : 'Mobile'}
                          </p>
                          <p className="text-sm">{student.guardian_mobile}</p>
                        </div>
                      )}
                      {student.guardian_relation && (
                        <div>
                          <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'صلة القرابة' : 'Relationship'}
                          </p>
                          <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {student.guardian_relation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}
            </h3>
            <Button size="sm" onClick={() => navigate(`/medical-records/add?student_id=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة سجل طبي' : 'Add Medical Record'}
            </Button>
          </div>

          {medicalRecords.length > 0 ? (
            <div className="grid gap-4">
              {medicalRecords.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'سجل طبي' : 'Medical Record'} - {record.medical_record_number}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/medical-records/${record.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/medical-records/edit/${record.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {record.primary_diagnosis_code && record.primary_diagnosis_code.length > 0 && (
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'التشخيص الأساسي' : 'Primary Diagnosis'}
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {record.primary_diagnosis_code.map((code, index) => (
                            <Badge key={index} variant="outline">{code}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {record.allergies && record.allergies.length > 0 && (
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الحساسيات' : 'Allergies'}
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {record.allergies.map((allergy, index) => (
                            <Badge key={index} variant="destructive">{allergy}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {record.weight_kg && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'الوزن' : 'Weight'}
                          </h4>
                          <p className="text-sm">{record.weight_kg} kg</p>
                        </div>
                        {record.height_cm && (
                          <div>
                            <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'الطول' : 'Height'}
                            </h4>
                            <p className="text-sm">{record.height_cm} cm</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Heart className="h-8 w-8 text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لا توجد سجلات طبية' : 'No medical records found'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'البرامج العلاجية' : 'Therapy Programs'}
            </h3>
            <Button size="sm" onClick={() => navigate(`/enrollments/add?student_id=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تسجيل في برنامج' : 'Enroll in Program'}
            </Button>
          </div>

          {programEnrollments.length > 0 ? (
            <div className="grid gap-4">
              {programEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'برنامج علاجي' : 'Therapy Program'}
                        </CardTitle>
                        <Badge variant={enrollment.enrollment_status === 'active' ? 'default' : 'secondary'} className="w-fit">
                          {enrollment.enrollment_status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/enrollments/${enrollment.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/enrollments/edit/${enrollment.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تاريخ التسجيل' : 'Enrollment Date'}
                        </h4>
                        <p className="text-sm">
                          {new Date(enrollment.enrollment_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الجلسات المكتملة' : 'Sessions Completed'}
                        </h4>
                        <p className="text-sm">{enrollment.sessions_completed || 0}</p>
                      </div>
                    </div>
                    
                    {enrollment.current_mastery_level && (
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'مستوى الإتقان' : 'Mastery Level'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2" 
                              style={{ width: `${enrollment.current_mastery_level}%` }}
                            />
                          </div>
                          <span className="text-sm">{enrollment.current_mastery_level}%</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Brain className="h-8 w-8 text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لم يتم التسجيل في أي برامج' : 'No program enrollments found'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الأهداف العلاجية' : 'Therapeutic Goals'}
            </h3>
            <Button size="sm" onClick={() => navigate(`/therapeutic-goals?student_id=${id}&action=add`)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
            </Button>
          </div>

          {therapeuticGoals.length > 0 ? (
            <div className="grid gap-4">
              {therapeuticGoals.map((goal) => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'هدف' : 'Goal'} #{goal.goal_number}
                        </CardTitle>
                        <Badge variant={goal.status === 'active' ? 'default' : goal.status === 'achieved' ? 'outline' : 'secondary'} className="w-fit">
                          {goal.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/therapeutic-goals?student_id=${id}&goal_id=${goal.id}&action=view`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/therapeutic-goals?student_id=${id}&goal_id=${goal.id}&action=edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'بيان الهدف' : 'Goal Statement'}
                      </h4>
                      <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {goal.goal_statement_ar}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الفئة' : 'Category'}
                        </h4>
                        <p className="text-sm">{goal.goal_category}</p>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'التقدم' : 'Progress'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2" 
                              style={{ width: `${goal.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm">{goal.progress_percentage}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لا توجد أهداف محددة' : 'No therapeutic goals found'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'التقييمات' : 'Assessments'}
            </h3>
            <Button size="sm" onClick={() => navigate(`/assessments/add?student_id=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة تقييم' : 'Add Assessment'}
            </Button>
          </div>

          {assessmentResults.length > 0 ? (
            <div className="grid gap-4">
              {assessmentResults.map((assessment) => (
                <Card key={assessment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تقييم' : 'Assessment'}
                        </CardTitle>
                        <Badge variant="outline" className="w-fit">
                          {assessment.assessment_purpose}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/assessments/${assessment.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/assessments/edit/${assessment.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تاريخ التقييم' : 'Assessment Date'}
                        </h4>
                        <p className="text-sm">
                          {new Date(assessment.assessment_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      {assessment.overall_score && (
                        <div>
                          <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}
                          </h4>
                          <p className="text-sm">{assessment.overall_score}</p>
                        </div>
                      )}
                    </div>
                    
                    {assessment.interpretation_summary_ar && (
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'ملخص التفسير' : 'Interpretation Summary'}
                        </h4>
                        <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? assessment.interpretation_summary_ar : assessment.interpretation_summary_en}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لا توجد تقييمات' : 'No assessments found'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تتبع التقدم' : 'Progress Tracking'}
            </h3>
            <Button size="sm" onClick={() => navigate(`/progress-tracking?student_id=${id}&action=add`)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة تقرير تقدم' : 'Add Progress Report'}
            </Button>
          </div>

          {progressTracking.length > 0 ? (
            <div className="grid gap-4">
              {progressTracking.map((progress) => (
                <Card key={progress.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تقرير التقدم' : 'Progress Report'}
                        </CardTitle>
                        <Badge variant={progress.trend_direction === 'improving' ? 'default' : progress.trend_direction === 'declining' ? 'destructive' : 'secondary'} className="w-fit">
                          {progress.trend_direction}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/progress-tracking?student_id=${id}&progress_id=${progress.id}&action=view`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/progress-tracking?student_id=${id}&progress_id=${progress.id}&action=edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'فترة التتبع' : 'Tracking Period'}
                        </h4>
                        <p className="text-sm">
                          {new Date(progress.tracking_period_start).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')} - {new Date(progress.tracking_period_end).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      {progress.goal_achievement_percentage && (
                        <div>
                          <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'نسبة تحقيق الأهداف' : 'Goal Achievement'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary rounded-full h-2" 
                                style={{ width: `${progress.goal_achievement_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{progress.goal_achievement_percentage}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {progress.progress_summary_ar && (
                      <div>
                        <h4 className={`font-semibold text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'ملخص التقدم' : 'Progress Summary'}
                        </h4>
                        <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? progress.progress_summary_ar : progress.progress_summary_en}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لا توجد تقارير تقدم' : 'No progress reports found'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}