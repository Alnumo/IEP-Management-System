// Medical Record Details Page
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, AlertCircle, FileText, User, Stethoscope, Shield, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMedicalRecord } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'

export const MedicalRecordDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  // Hooks
  const { data: medicalRecord, isLoading, error } = useMedicalRecord(id!)

  const getClassificationBadgeVariant = (classification: string) => {
    switch (classification) {
      case 'public': return 'default'
      case 'internal': return 'secondary' 
      case 'confidential': return 'outline'
      case 'restricted': return 'destructive'
      default: return 'outline'
    }
  }

  // Loading state
  if (isLoading) {
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
  if (error || !medicalRecord) {
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
            {language === 'ar' ? 'تفاصيل السجل الطبي' : 'Medical Record Details'}
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
      <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تفاصيل السجل الطبي' : 'Medical Record Details'}
              </h1>
              <Badge variant={getClassificationBadgeVariant(medicalRecord.data_classification)}>
                {language === 'ar' 
                  ? (medicalRecord.data_classification === 'public' ? 'عام' : 
                     medicalRecord.data_classification === 'internal' ? 'داخلي' : 
                     medicalRecord.data_classification === 'confidential' ? 'سري' : 'محظور')
                  : medicalRecord.data_classification
                }
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? `رقم السجل: ${medicalRecord.medical_record_number}`
                : `Record #${medicalRecord.medical_record_number}`
              }
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/medical-records/edit/${medicalRecord.id}`)}>
          <Edit className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <User className="h-5 w-5" />
            {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'رقم السجل الطبي' : 'Medical Record Number'}
              </p>
              <p className="text-sm">{medicalRecord.medical_record_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'فصيلة الدم' : 'Blood Type'}
              </p>
              <p className="text-sm">{medicalRecord.blood_type || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الوزن' : 'Weight'}
              </p>
              <p className="text-sm">{medicalRecord.weight_kg ? `${medicalRecord.weight_kg} كجم` : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الطول' : 'Height'}
              </p>
              <p className="text-sm">{medicalRecord.height_cm ? `${medicalRecord.height_cm} سم` : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'مؤشر كتلة الجسم' : 'BMI'}
              </p>
              <p className="text-sm">
                {medicalRecord.weight_kg && medicalRecord.height_cm 
                  ? (medicalRecord.weight_kg / Math.pow(medicalRecord.height_cm / 100, 2)).toFixed(1)
                  : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'تصنيف البيانات' : 'Data Classification'}
              </p>
              <Badge variant={getClassificationBadgeVariant(medicalRecord.data_classification)}>
                {language === 'ar' 
                  ? (medicalRecord.data_classification === 'public' ? 'عام' : 
                     medicalRecord.data_classification === 'internal' ? 'داخلي' : 
                     medicalRecord.data_classification === 'confidential' ? 'سري' : 'محظور')
                  : medicalRecord.data_classification
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Stethoscope className="h-5 w-5" />
            {language === 'ar' ? 'المعلومات الطبية' : 'Medical Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Diagnosis Codes */}
          {medicalRecord.primary_diagnosis_code && medicalRecord.primary_diagnosis_code.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'أكواد التشخيص الأساسية' : 'Primary Diagnosis Codes'}
              </p>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.primary_diagnosis_code.map((code, index) => (
                  <Badge key={index} variant="outline">{code}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Diagnosis Codes */}
          {medicalRecord.secondary_diagnosis_codes && medicalRecord.secondary_diagnosis_codes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'أكواد التشخيص الثانوية' : 'Secondary Diagnosis Codes'}
              </p>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.secondary_diagnosis_codes.map((code, index) => (
                  <Badge key={index} variant="secondary">{code}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Allergies */}
          {medicalRecord.allergies && medicalRecord.allergies.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'الحساسيات' : 'Allergies'}
              </p>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive">{allergy}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Medication Allergies */}
          {medicalRecord.medication_allergies && medicalRecord.medication_allergies.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'حساسية الأدوية' : 'Medication Allergies'}
              </p>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.medication_allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive">{allergy}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Environmental Allergies */}
          {medicalRecord.environmental_allergies && medicalRecord.environmental_allergies.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'الحساسيات البيئية' : 'Environmental Allergies'}
              </p>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.environmental_allergies.map((allergy, index) => (
                  <Badge key={index} variant="outline">{allergy}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Protocol */}
          {medicalRecord.emergency_protocol && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'بروتوكول الطوارئ' : 'Emergency Protocol'}
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{medicalRecord.emergency_protocol}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Physician Information */}
      {(medicalRecord.primary_physician_ar || medicalRecord.primary_physician_en) && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <User className="h-5 w-5" />
              {language === 'ar' ? 'الطبيب المعالج' : 'Primary Physician'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'اسم الطبيب' : 'Physician Name'}
                </p>
                <p className="text-sm">
                  {language === 'ar' 
                    ? medicalRecord.primary_physician_ar
                    : medicalRecord.primary_physician_en || medicalRecord.primary_physician_ar
                  }
                </p>
              </div>
              {medicalRecord.primary_physician_phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الهاتف' : 'Phone'}
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {medicalRecord.primary_physician_phone}
                  </p>
                </div>
              )}
              {medicalRecord.hospital_clinic_ar && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المستشفى/العيادة' : 'Hospital/Clinic'}
                  </p>
                  <p className="text-sm">
                    {language === 'ar' 
                      ? medicalRecord.hospital_clinic_ar
                      : medicalRecord.hospital_clinic_en || medicalRecord.hospital_clinic_ar
                    }
                  </p>
                </div>
              )}
              {medicalRecord.primary_physician_email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </p>
                  <p className="text-sm">{medicalRecord.primary_physician_email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Information */}
      {(medicalRecord.insurance_provider_ar || medicalRecord.insurance_provider_en) && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Shield className="h-5 w-5" />
              {language === 'ar' ? 'معلومات التأمين' : 'Insurance Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'مزود التأمين' : 'Insurance Provider'}
                </p>
                <p className="text-sm">
                  {language === 'ar' 
                    ? medicalRecord.insurance_provider_ar
                    : medicalRecord.insurance_provider_en || medicalRecord.insurance_provider_ar
                  }
                </p>
              </div>
              {medicalRecord.policy_number && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'رقم البوليصة' : 'Policy Number'}
                  </p>
                  <p className="text-sm">{medicalRecord.policy_number}</p>
                </div>
              )}
              {medicalRecord.insurance_expiry_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ انتهاء التأمين' : 'Insurance Expiry Date'}
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(medicalRecord.insurance_expiry_date)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restrictions and Accommodations */}
      {(medicalRecord.activity_restrictions_ar || medicalRecord.dietary_restrictions_ar || 
        medicalRecord.contraindications_ar || medicalRecord.special_accommodations_ar) && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <AlertCircle className="h-5 w-5" />
              {language === 'ar' ? 'القيود والتسهيلات' : 'Restrictions and Accommodations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicalRecord.activity_restrictions_ar && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'ar' ? 'قيود النشاط' : 'Activity Restrictions'}
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {language === 'ar' 
                      ? medicalRecord.activity_restrictions_ar
                      : medicalRecord.activity_restrictions_en || medicalRecord.activity_restrictions_ar
                    }
                  </p>
                </div>
              </div>
            )}

            {medicalRecord.dietary_restrictions_ar && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'ar' ? 'القيود الغذائية' : 'Dietary Restrictions'}
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    {language === 'ar' 
                      ? medicalRecord.dietary_restrictions_ar
                      : medicalRecord.dietary_restrictions_en || medicalRecord.dietary_restrictions_ar
                    }
                  </p>
                </div>
              </div>
            )}

            {medicalRecord.contraindications_ar && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'ar' ? 'موانع الاستعمال' : 'Contraindications'}
                </p>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    {language === 'ar' 
                      ? medicalRecord.contraindications_ar
                      : medicalRecord.contraindications_en || medicalRecord.contraindications_ar
                    }
                  </p>
                </div>
              </div>
            )}

            {medicalRecord.special_accommodations_ar && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'ar' ? 'التسهيلات الخاصة' : 'Special Accommodations'}
                </p>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {language === 'ar' 
                      ? medicalRecord.special_accommodations_ar
                      : medicalRecord.special_accommodations_en || medicalRecord.special_accommodations_ar
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'معلومات النظام' : 'System Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">
                {language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}
              </p>
              <p>{formatDate(medicalRecord.created_at)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">
                {language === 'ar' ? 'آخر تحديث' : 'Last Updated'}
              </p>
              <p>{formatDate(medicalRecord.updated_at)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">
                {language === 'ar' ? 'حالة التشفير' : 'Encryption Status'}
              </p>
              <Badge variant={medicalRecord.is_encrypted ? 'default' : 'destructive'}>
                {medicalRecord.is_encrypted 
                  ? (language === 'ar' ? 'مشفر' : 'Encrypted')
                  : (language === 'ar' ? 'غير مشفر' : 'Not Encrypted')
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MedicalRecordDetailsPage