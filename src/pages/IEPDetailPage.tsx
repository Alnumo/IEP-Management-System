import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit2,
  FileText,
  Printer,
  Share2,
  AlertTriangle,
  Users,
  Target,
  Activity,
  BookOpen,
  Shield,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEP } from '@/hooks/useIEPs'
import type { IEP, IEPGoal } from '@/types/iep'

export const IEPDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<string[]>(['present-levels'])

  // Fetch IEP data
  const { data: iep, isLoading, error } = useIEP(id!)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !iep) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {language === 'ar' ? 'خطأ في تحميل الخطة التعليمية' : 'Error loading IEP'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Status helpers
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary', label_ar: 'مسودة', label_en: 'Draft', color: 'bg-gray-500' },
      active: { variant: 'default', label_ar: 'نشطة', label_en: 'Active', color: 'bg-green-500' },
      review: { variant: 'outline', label_ar: 'مراجعة', label_en: 'Review', color: 'bg-yellow-500' },
      expired: { variant: 'destructive', label_ar: 'منتهية', label_en: 'Expired', color: 'bg-red-500' },
      archived: { variant: 'secondary', label_ar: 'مؤرشفة', label_en: 'Archived', color: 'bg-gray-400' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Badge variant={config?.variant as any}>
        {language === 'ar' ? config?.label_ar : config?.label_en}
      </Badge>
    )
  }

  const getComplianceStatus = () => {
    if (!iep.compliance_check_passed) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? `تم العثور على ${iep.compliance_issues?.length || 0} مشاكل امتثال`
              : `${iep.compliance_issues?.length || 0} compliance issues found`
            }
          </AlertDescription>
        </Alert>
      )
    }
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-5 h-5" />
        <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'متوافق مع المعايير' : 'Compliant with standards'}
        </span>
      </div>
    )
  }

  const calculateGoalProgress = (goals: IEPGoal[] = []) => {
    if (goals.length === 0) return 0
    const totalProgress = goals.reduce((sum, goal) => sum + (goal.current_progress_percentage || 0), 0)
    return Math.round(totalProgress / goals.length)
  }

  const getDeadlineStatus = (reviewDate: string) => {
    const today = new Date()
    const deadline = new Date(reviewDate)
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), color: 'text-red-600' }
    } else if (diffDays <= 30) {
      return { status: 'due-soon', days: diffDays, color: 'text-yellow-600' }
    }
    return { status: 'future', days: diffDays, color: 'text-gray-600' }
  }

  const deadlineInfo = getDeadlineStatus(iep.annual_review_date)
  const goalProgress = calculateGoalProgress(iep.goals)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/ieps')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar'
                ? `خطة ${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`
                : `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar} IEP`
              }
            </h1>
            <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? `${iep.iep_type} • السنة الأكاديمية ${iep.academic_year}`
                : `${iep.iep_type} • Academic Year ${iep.academic_year}`
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'مشاركة' : 'Share'}
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
          <Button onClick={() => navigate(`/ieps/${id}/edit`)}>
            <Edit2 className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الحالة' : 'Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(iep.status)}
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تقدم الأهداف' : 'Goals Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Progress value={goalProgress} className="h-2" />
              </div>
              <span className="text-sm font-medium">{goalProgress}%</span>
            </div>
            <p className={`text-xs text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? `${iep.goals?.length || 0} أهداف`
                : `${iep.goals?.length || 0} goals`
              }
            </p>
          </CardContent>
        </Card>

        {/* Next Review */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'المراجعة القادمة' : 'Next Review'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {new Date(iep.annual_review_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
            <p className={`text-xs ${deadlineInfo.color} ${language === 'ar' ? 'font-arabic' : ''}`}>
              {deadlineInfo.status === 'overdue' 
                ? (language === 'ar' ? `متأخر ${deadlineInfo.days} يوم` : `${deadlineInfo.days} days overdue`)
                : deadlineInfo.status === 'due-soon'
                ? (language === 'ar' ? `${deadlineInfo.days} يوم متبقي` : `${deadlineInfo.days} days left`)
                : (language === 'ar' ? `${deadlineInfo.days} يوم متبقي` : `${deadlineInfo.days} days left`)
              }
            </p>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الامتثال' : 'Compliance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {iep.compliance_check_passed ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{language === 'ar' ? 'متوافق' : 'Compliant'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{language === 'ar' ? 'مشاكل' : 'Issues'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alert */}
      {!iep.compliance_check_passed && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' 
                  ? 'هذه الخطة التعليمية تحتاج إلى معالجة مشاكل الامتثال'
                  : 'This IEP has compliance issues that need attention'
                }
              </span>
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="goals" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الأهداف' : 'Goals'}
          </TabsTrigger>
          <TabsTrigger value="services" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الخدمات' : 'Services'}
          </TabsTrigger>
          <TabsTrigger value="team" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الفريق' : 'Team'}
          </TabsTrigger>
          <TabsTrigger value="meetings" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الاجتماعات' : 'Meetings'}
          </TabsTrigger>
          <TabsTrigger value="documents" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المستندات' : 'Documents'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Student Information */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <Users className="h-5 w-5" />
                    {language === 'ar' ? 'معلومات الطالب' : 'Student Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'رقم التسجيل:' : 'Registration Number:'}
                      </label>
                      <p className="text-sm">{iep.student?.registration_number}</p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'تاريخ الميلاد:' : 'Date of Birth:'}
                      </label>
                      <p className="text-sm">
                        {iep.student?.date_of_birth 
                          ? new Date(iep.student.date_of_birth).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التشخيص:' : 'Diagnosis:'}
                      </label>
                      <p className="text-sm">
                        {language === 'ar' ? iep.student?.diagnosis_ar : iep.student?.diagnosis_en || iep.student?.diagnosis_ar || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'نوع الخطة:' : 'IEP Type:'}
                      </label>
                      <p className="text-sm">{iep.iep_type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Present Levels of Performance */}
              <Collapsible
                open={expandedSections.includes('present-levels')}
                onOpenChange={() => toggleSection('present-levels')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className={`flex items-center justify-between ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          {language === 'ar' ? 'الوضع الحالي للأداء' : 'Present Levels of Performance'}
                        </div>
                        {expandedSections.includes('present-levels') ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div>
                          <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'الأداء الأكاديمي:' : 'Academic Performance:'}
                          </h4>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className={`text-sm whitespace-pre-wrap ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                              {language === 'ar' ? iep.present_levels_academic_ar : iep.present_levels_academic_en || iep.present_levels_academic_ar}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'الأداء الوظيفي:' : 'Functional Performance:'}
                          </h4>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className={`text-sm whitespace-pre-wrap ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                              {language === 'ar' ? iep.present_levels_functional_ar : iep.present_levels_functional_en || iep.present_levels_functional_ar}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Least Restrictive Environment */}
              <Collapsible
                open={expandedSections.includes('lre')}
                onOpenChange={() => toggleSection('lre')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className={`flex items-center justify-between ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          {language === 'ar' ? 'البيئة الأقل تقييداً' : 'Least Restrictive Environment'}
                        </div>
                        {expandedSections.includes('lre') ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div>
                          <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'نسبة الدمج:' : 'Mainstreaming Percentage:'}
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={iep.mainstreaming_percentage} className="flex-1 h-2" />
                            <span className="text-sm font-medium">{iep.mainstreaming_percentage}%</span>
                          </div>
                        </div>
                        <div>
                          <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? 'المبرر:' : 'Justification:'}
                          </h4>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className={`text-sm whitespace-pre-wrap ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                              {language === 'ar' ? iep.lre_justification_ar : iep.lre_justification_en || iep.lre_justification_ar}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'جدولة اجتماع' : 'Schedule Meeting'}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Target className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'إنشاء تقرير' : 'Generate Report'}
                  </Button>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'أعضاء الفريق' : 'Team Members'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {iep.team_members && iep.team_members.length > 0 ? (
                    <div className="space-y-3">
                      {iep.team_members.slice(0, 4).map((member, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user?.name || 'Team Member'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(iep.team_members?.length || 0) > 4 && (
                        <Button variant="ghost" size="sm" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'عرض الجميع' : 'View All'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'لا يوجد أعضاء فريق محددين' : 'No team members assigned'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm">
                          {language === 'ar' ? 'تم تحديث الخطة' : 'IEP updated'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(iep.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm">
                          {language === 'ar' ? 'تم إنشاء الخطة' : 'IEP created'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(iep.effective_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الأهداف السنوية' : 'Annual Goals'}
            </h2>
            <Button>
              <Target className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
            </Button>
          </div>

          {iep.goals && iep.goals.length > 0 ? (
            <div className="grid gap-4">
              {iep.goals.map((goal, index) => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? `الهدف ${index + 1}` : `Goal ${index + 1}`}
                      </CardTitle>
                      <Badge variant={goal.goal_status === 'active' ? 'default' : 'secondary'}>
                        {goal.goal_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'بيان الهدف:' : 'Goal Statement:'}
                      </h4>
                      <p className={`text-sm ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                        {language === 'ar' ? goal.goal_statement_ar : goal.goal_statement_en || goal.goal_statement_ar}
                      </p>
                    </div>
                    <div>
                      <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'معايير الإتقان:' : 'Mastery Criteria:'}
                      </h4>
                      <p className={`text-sm ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                        {language === 'ar' ? goal.mastery_criteria_ar : goal.mastery_criteria_en || goal.mastery_criteria_ar}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التقدم الحالي:' : 'Current Progress:'}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={goal.current_progress_percentage || 0} className="flex-1 h-3" />
                        <span className="text-sm font-medium">{goal.current_progress_percentage || 0}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المجال:' : 'Domain:'} {goal.domain}
                      </span>
                      <Button variant="outline" size="sm">
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد أهداف' : 'No Goals Yet'}
              </h3>
              <p className={`text-gray-600 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ابدأ بإضافة الأهداف السنوية لهذه الخطة' : 'Start by adding annual goals for this IEP'}
              </p>
              <Button>
                <Target className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <h2 className={`text-xl font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الخدمات المقدمة' : 'Services Provided'}
          </h2>
          
          <div className="grid gap-6">
            {/* Special Education Services */}
            <Card>
              <CardHeader>
                <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'خدمات التربية الخاصة' : 'Special Education Services'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {iep.special_education_services && iep.special_education_services.length > 0 ? (
                  <div className="space-y-2">
                    {iep.special_education_services.map((service, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm">{service}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'لا توجد خدمات محددة' : 'No services specified'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Related Services */}
            <Card>
              <CardHeader>
                <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الخدمات المرتبطة' : 'Related Services'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {iep.related_services && iep.related_services.length > 0 ? (
                  <div className="space-y-2">
                    {iep.related_services.map((service, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm">{service}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'لا توجد خدمات مرتبطة' : 'No related services'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'فريق الخطة التعليمية' : 'IEP Team'}
            </h2>
            <Button>
              <Users className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إضافة عضو' : 'Add Member'}
            </Button>
          </div>

          {iep.team_members && iep.team_members.length > 0 ? (
            <div className="grid gap-4">
              {iep.team_members.map((member, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{member.user?.name || 'Team Member'}</h3>
                      <p className="text-sm text-gray-600">{member.role}</p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا يوجد أعضاء فريق' : 'No Team Members'}
              </h3>
              <p className={`text-gray-600 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ابدأ بإضافة أعضاء فريق الخطة التعليمية' : 'Start by adding IEP team members'}
              </p>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إضافة عضو' : 'Add Member'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'اجتماعات الخطة' : 'IEP Meetings'}
            </h2>
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'جدولة اجتماع' : 'Schedule Meeting'}
            </Button>
          </div>

          {iep.meetings && iep.meetings.length > 0 ? (
            <div className="grid gap-4">
              {iep.meetings.map((meeting, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {meeting.meeting_type}
                      </CardTitle>
                      <Badge variant={meeting.status === 'completed' ? 'default' : 'outline'}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {new Date(meeting.meeting_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{meeting.start_time}</span>
                      </div>
                    </div>
                    {meeting.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">{meeting.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد اجتماعات' : 'No Meetings Scheduled'}
              </h3>
              <p className={`text-gray-600 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ابدأ بجدولة اجتماعات الخطة التعليمية' : 'Start by scheduling IEP meetings'}
              </p>
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'جدولة اجتماع' : 'Schedule Meeting'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'مستندات الخطة' : 'IEP Documents'}
            </h2>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'رفع مستند' : 'Upload Document'}
            </Button>
          </div>

          {iep.attachments && iep.attachments.length > 0 ? (
            <div className="grid gap-4">
              {iep.attachments.map((attachment, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{attachment.filename}</h3>
                      <p className="text-sm text-gray-600">{attachment.file_type} • {attachment.file_size}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تحميل' : 'Download'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد مستندات' : 'No Documents'}
              </h3>
              <p className={`text-gray-600 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ابدأ برفع المستندات المتعلقة بالخطة' : 'Start by uploading IEP-related documents'}
              </p>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'رفع مستند' : 'Upload Document'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}