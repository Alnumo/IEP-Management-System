import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, User, Phone, Mail, Calendar, Award, Badge as BadgeIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMedicalConsultant } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'

export const MedicalConsultantDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()

  const { data: consultant, isLoading, error } = useMedicalConsultant(id!)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'suspended': return 'destructive'
      case 'on_leave': return 'outline'
      case 'terminated': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      active: { ar: 'نشط', en: 'Active' },
      inactive: { ar: 'غير نشط', en: 'Inactive' },
      suspended: { ar: 'موقوف', en: 'Suspended' },
      on_leave: { ar: 'في إجازة', en: 'On Leave' },
      terminated: { ar: 'منتهي', en: 'Terminated' }
    }
    return language === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status
  }

  const getSupervisionLevelLabel = (level: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      attending_physician: { ar: 'طبيب حاضر', en: 'Attending Physician' },
      consulting_physician: { ar: 'طبيب استشاري', en: 'Consulting Physician' },
      supervising_specialist: { ar: 'أخصائي مشرف', en: 'Supervising Specialist' },
      medical_director: { ar: 'مدير طبي', en: 'Medical Director' },
      clinical_consultant: { ar: 'استشاري إكلينيكي', en: 'Clinical Consultant' },
      external_consultant: { ar: 'استشاري خارجي', en: 'External Consultant' }
    }
    return language === 'ar' ? labels[level]?.ar || level : labels[level]?.en || level
  }

  const getLicenseTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      medical_practice: { ar: 'ممارسة طبية', en: 'Medical Practice' },
      specialist: { ar: 'تخصصي', en: 'Specialist' },
      consultant: { ar: 'استشاري', en: 'Consultant' },
      fellowship: { ar: 'زمالة', en: 'Fellowship' },
      board_certified: { ar: 'معتمد من المجلس', en: 'Board Certified' }
    }
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      full_time: { ar: 'دوام كامل', en: 'Full Time' },
      part_time: { ar: 'دوام جزئي', en: 'Part Time' },
      consultant: { ar: 'استشاري', en: 'Consultant' },
      on_call: { ar: 'عند الطلب', en: 'On Call' },
      contract: { ar: 'تعاقد', en: 'Contract' }
    }
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل بيانات الاستشاري...' : 'Loading consultant data...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !consultant) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل بيانات الاستشاري الطبي' : 'Error loading medical consultant data'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/medical-consultants')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
                {consultant.title_ar && `${consultant.title_ar} `}
                {language === 'ar' 
                  ? `${consultant.first_name_ar} ${consultant.last_name_ar}`
                  : consultant.first_name_en && consultant.last_name_en 
                    ? `${consultant.first_name_en} ${consultant.last_name_en}`
                    : `${consultant.first_name_ar} ${consultant.last_name_ar}`
                }
              </h1>
              <Badge variant={getStatusBadgeVariant(consultant.status)}>
                {getStatusLabel(consultant.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تفاصيل الاستشاري الطبي' : 'Medical Consultant Details'}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/medical-consultants/edit/${consultant.id}`)} className="gap-2">
          <Edit className="h-4 w-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                </p>
                <p className="font-medium">
                  {consultant.title_ar && `${consultant.title_ar} `}
                  {consultant.first_name_ar} {consultant.last_name_ar}
                </p>
              </div>
              {consultant.first_name_en && consultant.last_name_en && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
                  </p>
                  <p className="font-medium">
                    {consultant.title_en && `${consultant.title_en} `}
                    {consultant.first_name_en} {consultant.last_name_en}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'التخصص الأساسي' : 'Primary Specialization'}
                </p>
                <p className="font-medium">
                  {language === 'ar' 
                    ? consultant.primary_specialization_ar
                    : consultant.primary_specialization_en || consultant.primary_specialization_ar
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'مستوى الإشراف' : 'Supervision Level'}
                </p>
                <p className="font-medium">
                  {getSupervisionLevelLabel(consultant.supervision_level)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'نوع التعاقد' : 'Contract Type'}
                </p>
                <p className="font-medium">
                  {getContractTypeLabel(consultant.contract_type)}
                </p>
              </div>
              {consultant.years_of_experience && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
                  </p>
                  <p className="font-medium">
                    {consultant.years_of_experience} {language === 'ar' ? 'سنة' : 'years'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* License Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeIcon className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الترخيص' : 'License Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'رقم الترخيص' : 'License Number'}
                </p>
                <p className="font-medium">{consultant.license_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'نوع الترخيص' : 'License Type'}
                </p>
                <p className="font-medium">
                  {getLicenseTypeLabel(consultant.license_type)}
                </p>
              </div>
              {consultant.license_expiry_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ انتهاء الترخيص' : 'License Expiry Date'}
                  </p>
                  <p className="font-medium">{formatDate(consultant.license_expiry_date)}</p>
                </div>
              )}
              {consultant.license_issuing_authority_ar && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الجهة المصدرة' : 'Issuing Authority'}
                  </p>
                  <p className="font-medium">
                    {language === 'ar' ? consultant.license_issuing_authority_ar : consultant.license_issuing_authority_en || consultant.license_issuing_authority_ar}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {consultant.primary_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الهاتف الأساسي' : 'Primary Phone'}
                    </p>
                    <p className="font-medium">{consultant.primary_phone}</p>
                  </div>
                </div>
              )}
              {consultant.secondary_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الهاتف الثانوي' : 'Secondary Phone'}
                    </p>
                    <p className="font-medium">{consultant.secondary_phone}</p>
                  </div>
                </div>
              )}
              {consultant.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </p>
                    <p className="font-medium">{consultant.email}</p>
                  </div>
                </div>
              )}
              {consultant.whatsapp_number && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'واتساب' : 'WhatsApp'}
                    </p>
                    <p className="font-medium">{consultant.whatsapp_number}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'تفاصيل التوظيف' : 'Employment Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                </p>
                <p className="font-medium">{formatDate(consultant.start_date)}</p>
              </div>
              {consultant.end_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                  </p>
                  <p className="font-medium">{formatDate(consultant.end_date)}</p>
                </div>
              )}
              {consultant.hourly_rate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'السعر بالساعة' : 'Hourly Rate'}
                  </p>
                  <p className="font-medium">{consultant.hourly_rate} {language === 'ar' ? 'ريال' : 'SAR'}</p>
                </div>
              )}
              {consultant.consultation_fee && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'رسوم الاستشارة' : 'Consultation Fee'}
                  </p>
                  <p className="font-medium">{consultant.consultation_fee} {language === 'ar' ? 'ريال' : 'SAR'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specializations */}
      {consultant.secondary_specializations && consultant.secondary_specializations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {language === 'ar' ? 'التخصصات الثانوية' : 'Secondary Specializations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {consultant.secondary_specializations.map((spec: string, index: number) => (
                <Badge key={index} variant="outline">
                  {spec}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Performance Notes */}
      {consultant.clinical_performance_notes && Object.keys(consultant.clinical_performance_notes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'ملاحظات الأداء الإكلينيكي' : 'Clinical Performance Notes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(consultant.clinical_performance_notes).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium">{key}:</p>
                  <p className="text-sm text-muted-foreground">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MedicalConsultantDetailsPage