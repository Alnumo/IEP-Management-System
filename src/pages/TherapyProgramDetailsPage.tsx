import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Brain, Target, Clock, Users, AlertTriangle, BookOpen, Calendar, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTherapyProgram } from '@/hooks/useTherapyPrograms'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function TherapyProgramDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: therapyProgram, isLoading, error } = useTherapyProgram(id!)

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات البرنامج العلاجي' 
          : 'Error loading therapy program data'
      )
      navigate('/therapy-programs')
    }
  }, [error, language, navigate])

  const getCategoryBadge = (category: string) => {
    const variants = {
      'intensive': { color: 'bg-red-100 text-red-800', labelAr: 'مكثف', labelEn: 'Intensive' },
      'therapeutic': { color: 'bg-blue-100 text-blue-800', labelAr: 'علاجي', labelEn: 'Therapeutic' },
      'educational': { color: 'bg-green-100 text-green-800', labelAr: 'تعليمي', labelEn: 'Educational' },
      'behavioral': { color: 'bg-purple-100 text-purple-800', labelAr: 'سلوكي', labelEn: 'Behavioral' },
      'developmental': { color: 'bg-indigo-100 text-indigo-800', labelAr: 'تنموي', labelEn: 'Developmental' },
      'sensory': { color: 'bg-pink-100 text-pink-800', labelAr: 'حسي', labelEn: 'Sensory' },
      'communication': { color: 'bg-cyan-100 text-cyan-800', labelAr: 'تواصلي', labelEn: 'Communication' },
      'motor': { color: 'bg-orange-100 text-orange-800', labelAr: 'حركي', labelEn: 'Motor' }
    }
    
    const variant = variants[category as keyof typeof variants] || variants.therapeutic
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const getIntensityBadge = (intensity: string) => {
    const variants = {
      'low': { color: 'bg-green-100 text-green-800', labelAr: 'منخفض', labelEn: 'Low' },
      'moderate': { color: 'bg-yellow-100 text-yellow-800', labelAr: 'متوسط', labelEn: 'Moderate' },
      'high': { color: 'bg-orange-100 text-orange-800', labelAr: 'عالي', labelEn: 'High' },
      'intensive': { color: 'bg-red-100 text-red-800', labelAr: 'مكثف', labelEn: 'Intensive' }
    }
    
    const variant = variants[intensity as keyof typeof variants] || variants.moderate
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const formatAgeRange = (minMonths: number, maxMonths: number) => {
    const minYears = Math.floor(minMonths / 12)
    const minRemainingMonths = minMonths % 12
    const maxYears = Math.floor(maxMonths / 12)
    const maxRemainingMonths = maxMonths % 12
    
    const formatAge = (years: number, months: number) => {
      if (years === 0) {
        return language === 'ar' ? `${months} شهر` : `${months}m`
      }
      if (months === 0) {
        return language === 'ar' ? `${years} سنة` : `${years}y`
      }
      return language === 'ar' ? `${years} سنة ${months} شهر` : `${years}y ${months}m`
    }
    
    return `${formatAge(minYears, minRemainingMonths)} - ${formatAge(maxYears, maxRemainingMonths)}`
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

  if (!therapyProgram) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'البرنامج العلاجي غير موجود' : 'Therapy program not found'}
          </p>
          <Button onClick={() => navigate('/therapy-programs')} className="mt-4">
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
            onClick={() => navigate('/therapy-programs')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? therapyProgram.name_ar : (therapyProgram.name_en || therapyProgram.name_ar)}
              </h1>
              {getCategoryBadge(therapyProgram.category)}
              {getIntensityBadge(therapyProgram.intensity_level)}
            </div>
            <p className="text-muted-foreground">
              {therapyProgram.program_code}
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate(`/therapy-programs/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Description */}
          {(therapyProgram.description_ar || therapyProgram.description_en) && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <BookOpen className="w-5 h-5" />
                  {language === 'ar' ? 'وصف البرنامج' : 'Program Description'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {language === 'ar' ? therapyProgram.description_ar : (therapyProgram.description_en || therapyProgram.description_ar)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Program Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'إعدادات البرنامج' : 'Program Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الجلسات الأسبوعية' : 'Sessions per Week'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {therapyProgram.default_sessions_per_week} {language === 'ar' ? 'جلسة' : 'sessions'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'مدة الجلسة' : 'Session Duration'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {therapyProgram.default_session_duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الفئة العمرية' : 'Age Range'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {formatAgeRange(therapyProgram.minimum_age_months, therapyProgram.maximum_age_months)}
                    </span>
                  </div>
                </div>
              </div>

              {therapyProgram.requires_medical_clearance && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {language === 'ar' ? 'يتطلب تصريح طبي' : 'Requires Medical Clearance'}
                    </span>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    {language === 'ar' 
                      ? 'يجب الحصول على تصريح طبي قبل بدء البرنامج'
                      : 'Medical clearance must be obtained before starting this program'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Objectives */}
          {(therapyProgram.objectives_ar && therapyProgram.objectives_ar.length > 0) || 
           (therapyProgram.objectives_en && therapyProgram.objectives_en.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Target className="w-5 h-5" />
                  {language === 'ar' ? 'أهداف البرنامج' : 'Program Objectives'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(language === 'ar' ? therapyProgram.objectives_ar : therapyProgram.objectives_en)?.map((objective, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Target Conditions */}
          {therapyProgram.target_conditions && therapyProgram.target_conditions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Users className="w-5 h-5" />
                  {language === 'ar' ? 'الحالات المستهدفة' : 'Target Conditions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {therapyProgram.target_conditions.map((condition, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Program Status */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'حالة البرنامج' : 'Program Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Badge variant={therapyProgram.is_active ? "default" : "secondary"} className="mb-2">
                  {therapyProgram.is_active 
                    ? (language === 'ar' ? 'نشط' : 'Active')
                    : (language === 'ar' ? 'غير نشط' : 'Inactive')
                  }
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'متاح للمرضى الجدد:' : 'Available for new patients:'}
                </p>
                <p className="text-xs font-medium">
                  {therapyProgram.is_available_for_new_patients 
                    ? (language === 'ar' ? 'نعم' : 'Yes')
                    : (language === 'ar' ? 'لا' : 'No')
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Program Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'مواصفات البرنامج' : 'Program Specifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الفئة:' : 'Category:'}
                  </span>
                  {getCategoryBadge(therapyProgram.category)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الكثافة:' : 'Intensity:'}
                  </span>
                  {getIntensityBadge(therapyProgram.intensity_level)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الحد الأقصى للانتظار:' : 'Waitlist Limit:'}
                  </span>
                  <span className="text-sm font-medium">
                    {therapyProgram.waitlist_limit || 0} {language === 'ar' ? 'مريض' : 'patients'}
                  </span>
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
                onClick={() => navigate(`/therapy-programs/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل البرنامج' : 'Edit Program'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/therapy-programs')}
              >
                <Eye className="w-4 h-4" />
                {language === 'ar' ? 'جميع البرامج' : 'All Programs'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/program-enrollments', { state: { therapy_program_id: id } })}
              >
                <Users className="w-4 h-4" />
                {language === 'ar' ? 'المسجلين في البرنامج' : 'Program Enrollments'}
              </Button>
            </CardContent>
          </Card>

          {/* Program Info */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created on:'}
                </p>
                <p className="text-xs">
                  {new Date(therapyProgram.created_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US'
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'}
                </p>
                <p className="text-xs">
                  {new Date(therapyProgram.updated_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}