import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, ClipboardList, User, FileText, Calendar, Target, TrendingUp, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAssessmentResult } from '@/hooks/useAssessments'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function AssessmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const { data: assessment, isLoading, error } = useAssessmentResult(id!)

  useEffect(() => {
    if (error) {
      toast.error(
        language === 'ar' 
          ? 'خطأ في تحميل بيانات التقييم' 
          : 'Error loading assessment data'
      )
      navigate('/assessments')
    }
  }, [error, language, navigate])

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': { color: 'bg-gray-100 text-gray-800', labelAr: 'مسودة', labelEn: 'Draft' },
      'pending_review': { color: 'bg-yellow-100 text-yellow-800', labelAr: 'في المراجعة', labelEn: 'Pending Review' },
      'reviewed': { color: 'bg-blue-100 text-blue-800', labelAr: 'تم المراجعة', labelEn: 'Reviewed' },
      'approved': { color: 'bg-green-100 text-green-800', labelAr: 'معتمد', labelEn: 'Approved' },
      'finalized': { color: 'bg-green-100 text-green-800', labelAr: 'مكتمل', labelEn: 'Finalized' }
    }
    
    const variant = variants[status as keyof typeof variants] || variants.draft
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const getPurposeBadge = (purpose: string) => {
    const variants = {
      'baseline': { color: 'bg-blue-100 text-blue-800', labelAr: 'تقييم أولي', labelEn: 'Baseline' },
      'progress_monitoring': { color: 'bg-green-100 text-green-800', labelAr: 'متابعة التقدم', labelEn: 'Progress Monitoring' },
      'annual_review': { color: 'bg-purple-100 text-purple-800', labelAr: 'مراجعة سنوية', labelEn: 'Annual Review' },
      'discharge': { color: 'bg-orange-100 text-orange-800', labelAr: 'تقييم الخروج', labelEn: 'Discharge' },
      'diagnostic': { color: 'bg-red-100 text-red-800', labelAr: 'تشخيصي', labelEn: 'Diagnostic' },
      'program_planning': { color: 'bg-indigo-100 text-indigo-800', labelAr: 'تخطيط البرنامج', labelEn: 'Program Planning' },
      'research': { color: 'bg-pink-100 text-pink-800', labelAr: 'بحثي', labelEn: 'Research' }
    }
    
    const variant = variants[purpose as keyof typeof variants] || variants.baseline
    
    return (
      <Badge variant="secondary" className={variant.color}>
        {language === 'ar' ? variant.labelAr : variant.labelEn}
      </Badge>
    )
  }

  const getValidityBadge = (validity: string) => {
    const variants = {
      'valid': { color: 'bg-green-100 text-green-800', labelAr: 'صحيح', labelEn: 'Valid' },
      'questionable': { color: 'bg-yellow-100 text-yellow-800', labelAr: 'مشكوك فيه', labelEn: 'Questionable' },
      'invalid': { color: 'bg-red-100 text-red-800', labelAr: 'غير صحيح', labelEn: 'Invalid' }
    }
    
    const variant = variants[validity as keyof typeof variants] || variants.valid
    
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

  if (!assessment) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'التقييم غير موجود' : 'Assessment not found'}
          </p>
          <Button onClick={() => navigate('/assessments')} className="mt-4">
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
            onClick={() => navigate('/assessments')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تفاصيل التقييم' : 'Assessment Details'}
              </h1>
              {getStatusBadge(assessment.status)}
              {getPurposeBadge(assessment.assessment_purpose)}
            </div>
            <p className="text-muted-foreground">
              {assessment.students && (
                <>
                  {language === 'ar' 
                    ? `${assessment.students.first_name_ar} ${assessment.students.last_name_ar}`
                    : `${assessment.students.first_name_en || assessment.students.first_name_ar} ${assessment.students.last_name_en || assessment.students.last_name_ar}`
                  }
                  {assessment.assessment_tools && (
                    <span className="ml-2">
                      - {language === 'ar' ? assessment.assessment_tools.name_ar : (assessment.assessment_tools.name_en || assessment.assessment_tools.name_ar)}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate(`/assessments/edit/${id}`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <ClipboardList className="w-5 h-5" />
                {language === 'ar' ? 'معلومات التقييم' : 'Assessment Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'تاريخ التقييم' : 'Assessment Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {new Date(assessment.assessment_date).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'المدة' : 'Duration'}
                  </label>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {assessment.session_duration_minutes ? `${assessment.session_duration_minutes} ${language === 'ar' ? 'دقيقة' : 'minutes'}` : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'الموقع' : 'Location'}
                  </label>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {assessment.assessment_location || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {assessment.assessment_conditions && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'ظروف التقييم' : 'Assessment Conditions'}
                  </label>
                  <div className="text-sm text-muted-foreground">
                    {assessment.assessment_conditions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <TrendingUp className="w-5 h-5" />
                {language === 'ar' ? 'نتائج التقييم' : 'Assessment Results'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment.overall_score && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {assessment.overall_score}
                    </div>
                    <div className="text-sm text-blue-600">
                      {language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'صحة التقييم' : 'Test Validity'}
                  </label>
                  <div>
                    {getValidityBadge(assessment.test_validity)}
                  </div>
                </div>

                {assessment.cooperation_level && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'مستوى التعاون' : 'Cooperation Level'}
                    </label>
                    <div className="text-sm font-semibold">
                      {assessment.cooperation_level}/5
                    </div>
                  </div>
                )}

                {assessment.effort_level && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'مستوى الجهد' : 'Effort Level'}
                    </label>
                    <div className="text-sm font-semibold">
                      {assessment.effort_level}/5
                    </div>
                  </div>
                )}
              </div>

              {assessment.validity_concerns && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'مخاوف حول الصحة' : 'Validity Concerns'}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    {assessment.validity_concerns}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interpretation Summary */}
          {(assessment.interpretation_summary_ar || assessment.interpretation_summary_en) && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <FileText className="w-5 h-5" />
                  {language === 'ar' ? 'ملخص التفسير' : 'Interpretation Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {language === 'ar' ? assessment.interpretation_summary_ar : (assessment.interpretation_summary_en || assessment.interpretation_summary_ar)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Strengths and Areas of Concern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            {assessment.strengths_identified && assessment.strengths_identified.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    {language === 'ar' ? 'نقاط القوة' : 'Strengths Identified'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {assessment.strengths_identified.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Areas of Concern */}
            {assessment.areas_of_concern && assessment.areas_of_concern.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    {language === 'ar' ? 'مجالات القلق' : 'Areas of Concern'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {assessment.areas_of_concern.map((concern, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{concern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recommendations */}
          {(assessment.immediate_recommendations && assessment.immediate_recommendations.length > 0) || 
           (assessment.long_term_recommendations && assessment.long_term_recommendations.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <Target className="w-5 h-5" />
                  {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.immediate_recommendations && assessment.immediate_recommendations.length > 0 && (
                  <div>
                    <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'توصيات فورية' : 'Immediate Recommendations'}
                    </h4>
                    <ul className="space-y-2">
                      {assessment.immediate_recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {assessment.long_term_recommendations && assessment.long_term_recommendations.length > 0 && (
                  <div>
                    <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'توصيات طويلة المدى' : 'Long-term Recommendations'}
                    </h4>
                    <ul className="space-y-2">
                      {assessment.long_term_recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assessment Status */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'حالة التقييم' : 'Assessment Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                {getStatusBadge(assessment.status)}
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'}
                </p>
                <p className="text-xs">
                  {new Date(assessment.updated_at).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Tool */}
          {assessment.assessment_tools && (
            <Card>
              <CardHeader>
                <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'أداة التقييم' : 'Assessment Tool'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {language === 'ar' ? assessment.assessment_tools.name_ar : (assessment.assessment_tools.name_en || assessment.assessment_tools.name_ar)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assessment.assessment_tools.tool_code}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Status */}
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'حالة التقرير' : 'Report Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تم إنشاء التقرير:' : 'Report Generated:'}
                  </span>
                  <Badge variant={assessment.report_generated ? "default" : "secondary"}>
                    {assessment.report_generated 
                      ? (language === 'ar' ? 'نعم' : 'Yes')
                      : (language === 'ar' ? 'لا' : 'No')
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تم مشاركته مع الوالدين:' : 'Shared with Parents:'}
                  </span>
                  <Badge variant={assessment.report_shared_with_parents ? "default" : "secondary"}>
                    {assessment.report_shared_with_parents 
                      ? (language === 'ar' ? 'نعم' : 'Yes')
                      : (language === 'ar' ? 'لا' : 'No')
                    }
                  </Badge>
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
                onClick={() => navigate(`/assessments/edit/${id}`)}
              >
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل التقييم' : 'Edit Assessment'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/students/${assessment.student_id}`)}
                disabled={!assessment.student_id}
              >
                <User className="w-4 h-4" />
                {language === 'ar' ? 'تفاصيل الطالب' : 'Student Details'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/assessments')}
              >
                <BookOpen className="w-4 h-4" />
                {language === 'ar' ? 'جميع التقييمات' : 'All Assessments'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}