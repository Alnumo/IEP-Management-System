import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Mail, Phone, Calendar, Award, Building2, Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTherapist } from '@/hooks/useTherapists'
import { AssignmentWorkflowWidget } from '@/components/communication/AssignmentWorkflowWidget'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function TherapistDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: therapist, isLoading, error } = useTherapist(id!)

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات المعالج' 
          : 'Error loading therapist data'
      )
      navigate('/therapists')
    }
  }, [error, language, navigate])

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        {language === 'ar' ? 'نشط' : 'Active'}
      </Badge>
    ) : (
      <Badge variant="secondary">
        {language === 'ar' ? 'غير نشط' : 'Inactive'}
      </Badge>
    )
  }

  const getEmploymentTypeBadge = (type: string) => {
    const variants = {
      'full_time': { color: 'bg-blue-100 text-blue-800', labelAr: 'دوام كامل', labelEn: 'Full Time' },
      'part_time': { color: 'bg-orange-100 text-orange-800', labelAr: 'دوام جزئي', labelEn: 'Part Time' },
      'contract': { color: 'bg-purple-100 text-purple-800', labelAr: 'متعاقد', labelEn: 'Contract' },
      'consultant': { color: 'bg-teal-100 text-teal-800', labelAr: 'استشاري', labelEn: 'Consultant' }
    }

    const variant = variants[type as keyof typeof variants] || variants.full_time
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
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

  if (!therapist) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'المعالج غير موجود' : 'Therapist not found'}
          </p>
          <Button onClick={() => navigate('/therapists')} className="mt-4">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/therapists')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? `${therapist.first_name_ar} ${therapist.last_name_ar}` 
                : `${therapist.first_name_en || therapist.first_name_ar} ${therapist.last_name_en || therapist.last_name_ar}`}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تفاصيل المعالج' : 'Therapist Details'}
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate(`/therapists/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Award className="w-5 h-5" />
                {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
                  </label>
                  <p className="text-lg font-semibold">
                    {`${therapist.first_name_ar} ${therapist.last_name_ar}` || '-'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
                  </label>
                  <p className="text-lg font-semibold">
                    {therapist.first_name_en && therapist.last_name_en 
                      ? `${therapist.first_name_en} ${therapist.last_name_en}` 
                      : '-'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'التخصص' : 'Specialization'}
                  </label>
                  <Badge variant="outline" className="text-sm">
                    {language === 'ar' 
                      ? (therapist.specialization_ar || therapist.specialization_en || '-')
                      : (therapist.specialization_en || therapist.specialization_ar || '-')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المؤهل' : 'Qualification'}
                  </label>
                  <p className="text-sm">
                    {therapist.qualifications?.length > 0 
                      ? therapist.qualifications.join(', ')
                      : '-'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{therapist.experience_years || 0} {language === 'ar' ? 'سنة' : 'years'}</span>
                  </div>
                </div>

                {/* License number field - Add to Therapist type if needed
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'رقم الترخيص' : 'License Number'}
                  </label>
                  <p className="text-sm font-mono">
                    {therapist.license_number || '-'}
                  </p>
                </div>
                */}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Building2 className="w-5 h-5" />
                {language === 'ar' ? 'المعلومات المهنية' : 'Professional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department field - Add to Therapist type if needed
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'القسم' : 'Department'}
                  </label>
                  <Badge variant="outline">
                    {therapist.department || '-'}
                  </Badge>
                </div>
                */}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'نوع التوظيف' : 'Employment Type'}
                  </label>
                  {getEmploymentTypeBadge(therapist.employment_type || 'full_time')}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </label>
                  {getStatusBadge(therapist.status === 'active')}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ الانضمام' : 'Join Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {therapist.created_at 
                        ? new Date(therapist.created_at).toLocaleDateString(
                            language === 'ar' ? 'ar-SA' : 'en-US'
                          )
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Workflow Management */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Calendar className="w-5 h-5" />
                {language === 'ar' ? 'إدارة التكليفات والجدولة' : 'Assignment & Scheduling Management'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentWorkflowWidget 
                therapistId={id!} 
                language={language as 'ar' | 'en'} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Phone className="w-5 h-5" />
                {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </p>
                    <p className="text-sm font-medium">
                      {therapist.email || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </p>
                    <p className="text-sm font-medium" dir="ltr">
                      {therapist.phone || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/therapists/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل البيانات' : 'Edit Information'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/sessions?therapist=' + id)}
              >
                <Calendar className="w-4 h-4" />
                {language === 'ar' ? 'عرض الجلسات' : 'View Sessions'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/students?therapist=' + id)}
              >
                <Award className="w-4 h-4" />
                {language === 'ar' ? 'عرض الطلاب' : 'View Students'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  // TODO: Navigate to therapist messaging interface
                  console.log('Opening therapist messaging for:', id)
                }}
              >
                <MessageCircle className="w-4 h-4" />
                {language === 'ar' ? 'الرسائل والتواصل' : 'Messages & Communication'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}