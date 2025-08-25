import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, User, Calendar, Target, Activity, AlertTriangle, Clock, CheckCircle, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { useClinicalDocument } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'

export const ClinicalDocumentationDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()

  const { data: documentation, isLoading, error } = useClinicalDocument(id!)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'outline'
      case 'pending_review': return 'secondary'
      case 'reviewed': return 'default'
      case 'approved': return 'default'
      case 'finalized': return 'default'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-4 w-4" />
      case 'pending_review': return <Clock className="h-4 w-4" />
      case 'reviewed': return <FileText className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'finalized': return <Shield className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      pending_review: { ar: 'في انتظار المراجعة', en: 'Pending Review' },
      reviewed: { ar: 'تم المراجعة', en: 'Reviewed' },
      approved: { ar: 'معتمد', en: 'Approved' },
      finalized: { ar: 'نهائي', en: 'Finalized' }
    }
    return language === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status
  }

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'destructive'
      case 'urgent': return 'destructive'
      case 'scheduled': return 'default'
      case 'routine': return 'secondary'
      default: return 'secondary'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      routine: { ar: 'روتيني', en: 'Routine' },
      urgent: { ar: 'عاجل', en: 'Urgent' },
      immediate: { ar: 'فوري', en: 'Immediate' },
      scheduled: { ar: 'مجدول', en: 'Scheduled' }
    }
    return language === 'ar' ? labels[urgency]?.ar || urgency : labels[urgency]?.en || urgency
  }

  const getDocumentationTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      soap_note: { ar: 'ملاحظة SOAP', en: 'SOAP Note' },
      progress_note: { ar: 'ملاحظة تقدم', en: 'Progress Note' },
      assessment_note: { ar: 'ملاحظة تقييم', en: 'Assessment Note' },
      consultation_note: { ar: 'ملاحظة استشارة', en: 'Consultation Note' },
      incident_report: { ar: 'تقرير حادث', en: 'Incident Report' },
      medical_review: { ar: 'مراجعة طبية', en: 'Medical Review' },
      discharge_summary: { ar: 'ملخص خروج', en: 'Discharge Summary' }
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
              {language === 'ar' ? 'جاري تحميل التوثيق...' : 'Loading documentation...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !documentation) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل التوثيق الإكلينيكي' : 'Error loading clinical documentation'}
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
            onClick={() => navigate('/clinical-documentation')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
                {getDocumentationTypeLabel(documentation.documentation_type)}
              </h1>
              <Badge variant={getStatusBadgeVariant(documentation.status)} className="flex items-center gap-1">
                {getStatusIcon(documentation.status)}
                {getStatusLabel(documentation.status)}
              </Badge>
              <Badge variant={getUrgencyBadgeVariant(documentation.urgency_level)}>
                {getUrgencyLabel(documentation.urgency_level)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تفاصيل التوثيق الإكلينيكي' : 'Clinical Documentation Details'}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/clinical-documentation/edit/${documentation.id}`)} className="gap-2">
          <Edit className="h-4 w-4" />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      {/* Session Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'ar' ? 'معلومات الجلسة' : 'Session Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'تاريخ الجلسة' : 'Session Date'}
              </p>
              <p className="font-medium">{formatDate(documentation.session_date)}</p>
            </div>
            {documentation.session_duration_minutes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'مدة الجلسة' : 'Duration'}
                </p>
                <p className="font-medium">{documentation.session_duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}</p>
              </div>
            )}
            {documentation.goal_achievement_percentage && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'تحقيق الأهداف' : 'Goal Achievement'}
                </p>
                <p className="font-medium text-green-600">{documentation.goal_achievement_percentage}%</p>
              </div>
            )}
            {documentation.session_effectiveness_rating && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'فعالية الجلسة' : 'Session Effectiveness'}
                </p>
                <p className="font-medium text-blue-600">{documentation.session_effectiveness_rating}/10</p>
              </div>
            )}
          </div>
          
          {documentation.requires_medical_review && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  {language === 'ar' ? 'يحتاج لمراجعة طبية' : 'Requires Medical Review'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOAP Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {language === 'ar' ? 'توثيق SOAP' : 'SOAP Documentation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subjective" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="subjective">
                {language === 'ar' ? 'ذاتي (S)' : 'Subjective (S)'}
              </TabsTrigger>
              <TabsTrigger value="objective">
                {language === 'ar' ? 'موضوعي (O)' : 'Objective (O)'}
              </TabsTrigger>
              <TabsTrigger value="assessment">
                {language === 'ar' ? 'تقييم (A)' : 'Assessment (A)'}
              </TabsTrigger>
              <TabsTrigger value="plan">
                {language === 'ar' ? 'خطة (P)' : 'Plan (P)'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subjective" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentation.subjective_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'التقرير الذاتي (عربي)' : 'Subjective Report (Arabic)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.subjective_ar}</p>
                    </div>
                  </div>
                )}
                {documentation.subjective_en && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'التقرير الذاتي (إنجليزي)' : 'Subjective Report (English)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.subjective_en}</p>
                    </div>
                  </div>
                )}
                {documentation.parent_report_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'تقرير الوالدين' : 'Parent Report'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.parent_report_ar}</p>
                    </div>
                  </div>
                )}
                {documentation.patient_mood_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'مزاج المريض' : 'Patient Mood'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{documentation.patient_mood_ar}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="objective" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentation.objective_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'الملاحظات الموضوعية (عربي)' : 'Objective Observations (Arabic)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.objective_ar}</p>
                    </div>
                  </div>
                )}
                {documentation.objective_en && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'الملاحظات الموضوعية (إنجليزي)' : 'Objective Observations (English)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.objective_en}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {documentation.observed_behaviors && documentation.observed_behaviors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === 'ar' ? 'السلوكيات المرصودة' : 'Observed Behaviors'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {documentation.observed_behaviors.map((behavior, index) => (
                      <Badge key={index} variant="outline">
                        {behavior}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === 'ar' ? 'التقييم (عربي)' : 'Assessment (Arabic)'}
                  </p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{documentation.assessment_ar}</p>
                  </div>
                </div>
                {documentation.assessment_en && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'التقييم (إنجليزي)' : 'Assessment (English)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.assessment_en}</p>
                    </div>
                  </div>
                )}
                {documentation.progress_toward_goals_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'التقدم نحو الأهداف' : 'Progress Toward Goals'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.progress_toward_goals_ar}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {documentation.concerns_identified && documentation.concerns_identified.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === 'ar' ? 'المخاوف المحددة' : 'Concerns Identified'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {documentation.concerns_identified.map((concern, index) => (
                      <Badge key={index} variant="outline" className="text-orange-600 border-orange-600">
                        ⚠ {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === 'ar' ? 'الخطة (عربي)' : 'Plan (Arabic)'}
                  </p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{documentation.plan_ar}</p>
                  </div>
                </div>
                {documentation.plan_en && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'الخطة (إنجليزي)' : 'Plan (English)'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.plan_en}</p>
                    </div>
                  </div>
                )}
                {documentation.next_session_focus_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'تركيز الجلسة القادمة' : 'Next Session Focus'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.next_session_focus_ar}</p>
                    </div>
                  </div>
                )}
                {documentation.home_program_ar && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'البرنامج المنزلي' : 'Home Program'}
                    </p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{documentation.home_program_ar}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {documentation.recommendations && documentation.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                  </p>
                  <div className="space-y-2">
                    {documentation.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Interventions and Progress */}
      {documentation.interventions_used && documentation.interventions_used.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {language === 'ar' ? 'التدخلات والتقدم' : 'Interventions & Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'التدخلات المستخدمة' : 'Interventions Used'}
              </p>
              <div className="flex flex-wrap gap-2">
                {documentation.interventions_used.map((intervention, index) => (
                  <Badge key={index} variant="secondary">
                    {intervention}
                  </Badge>
                ))}
              </div>
            </div>
            
            {documentation.modifications_made_ar && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'ar' ? 'التعديلات المطبقة' : 'Modifications Made'}
                </p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{documentation.modifications_made_ar}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Information */}
      {documentation.follow_up_needed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'معلومات المتابعة' : 'Follow-up Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentation.follow_up_timeframe && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'إطار زمني للمتابعة' : 'Follow-up Timeframe'}
                  </p>
                  <p className="font-medium">{documentation.follow_up_timeframe}</p>
                </div>
              )}
              {documentation.follow_up_type && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'نوع المتابعة' : 'Follow-up Type'}
                  </p>
                  <p className="font-medium">{documentation.follow_up_type}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ClinicalDocumentationDetailsPage