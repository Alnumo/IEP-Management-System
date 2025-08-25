// Clinical Documentation Workflow Dashboard
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Plus,
  Filter,
  ArrowUpRight,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { useClinicalDocumentation } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'

export const ClinicalWorkflowDashboard = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  // Fetch documentation data
  const { data: documentation = [], isLoading } = useClinicalDocumentation()

  // Calculate workflow metrics
  const workflowMetrics = {
    total: documentation.length,
    pending: documentation.filter(d => d.status === 'pending_review').length,
    urgent: documentation.filter(d => d.urgency_level === 'urgent' || d.urgency_level === 'immediate').length,
    overdue: documentation.filter(d => {
      const daysSinceCreated = Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return d.status === 'draft' && daysSinceCreated > 3
    }).length,
    avgCompletionTime: 2.5, // This would be calculated from actual data
    reviewCompliance: Math.round((documentation.filter(d => d.status !== 'draft').length / Math.max(documentation.length, 1)) * 100)
  }

  // Get documents by status for workflow stages
  const workflowStages = [
    {
      id: 'draft',
      name: language === 'ar' ? 'مسودات' : 'Drafts',
      count: documentation.filter(d => d.status === 'draft').length,
      color: 'bg-gray-100 text-gray-800',
      icon: FileText,
      description: language === 'ar' ? 'وثائق قيد الإنشاء' : 'Documents in progress'
    },
    {
      id: 'pending_review',
      name: language === 'ar' ? 'في انتظار المراجعة' : 'Pending Review',
      count: documentation.filter(d => d.status === 'pending_review').length,
      color: 'bg-orange-100 text-orange-800',
      icon: Clock,
      description: language === 'ar' ? 'تحتاج مراجعة' : 'Awaiting review'
    },
    {
      id: 'reviewed',
      name: language === 'ar' ? 'تم المراجعة' : 'Reviewed',
      count: documentation.filter(d => d.status === 'reviewed').length,
      color: 'bg-blue-100 text-blue-800',
      icon: Eye,
      description: language === 'ar' ? 'تم مراجعتها' : 'Reviewed documents'
    },
    {
      id: 'approved',
      name: language === 'ar' ? 'معتمدة' : 'Approved',
      count: documentation.filter(d => d.status === 'approved').length,
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      description: language === 'ar' ? 'معتمدة للاستخدام' : 'Approved for use'
    }
  ]

  // Recent activity
  const recentActivity = documentation
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  // Urgent documents requiring attention
  const urgentDocuments = documentation.filter(d => 
    d.urgency_level === 'urgent' || 
    d.urgency_level === 'immediate' ||
    (d.status === 'pending_review' && 
     Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)) > 2)
  )

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

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة تحكم سير العمل الإكلينيكي' : 'Clinical Workflow Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'مراقبة وإدارة سير عمل التوثيق الإكلينيكي' : 'Monitor and manage clinical documentation workflows'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            {language === 'ar' ? 'تصفية' : 'Filter'}
          </Button>
          <Button onClick={() => navigate('/clinical-documentation/add')} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'جديد' : 'New'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الوثائق' : 'Total Documents'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowMetrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'وثيقة إكلينيكية' : 'clinical documents'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'في انتظار المراجعة' : 'Pending Review'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{workflowMetrics.pending}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'تحتاج مراجعة' : 'need review'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'عاجل' : 'Urgent'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{workflowMetrics.urgent}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'تحتاج انتباه فوري' : 'need immediate attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معدل الامتثال' : 'Review Compliance'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workflowMetrics.reviewCompliance}%</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'نسبة المراجعة' : 'review completion rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workflow Stages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {language === 'ar' ? 'مراحل سير العمل' : 'Workflow Stages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {workflowStages.map((stage) => {
                  const Icon = stage.icon
                  return (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/clinical-documentation?status=${stage.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${stage.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{stage.count}</span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Attention Required */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {language === 'ar' ? 'يحتاج انتباه عاجل' : 'Urgent Attention'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            ) : urgentDocuments.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد وثائق عاجلة' : 'No urgent documents'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clinical-documentation/${doc.id}`)}
                  >
                    <div className="flex-shrink-0">
                      {doc.urgency_level === 'immediate' ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getDocumentationTypeLabel(doc.documentation_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(doc.session_date)}
                      </p>
                      <Badge variant={getStatusBadgeVariant(doc.status)} className="mt-1">
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {urgentDocuments.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/clinical-documentation?filter=urgent')}
                  >
                    {language === 'ar' ? `عرض ${urgentDocuments.length - 5} المزيد` : `View ${urgentDocuments.length - 5} more`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Analytics Tabs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد أنشطة حديثة' : 'No recent activity'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clinical-documentation/${doc.id}`)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getDocumentationTypeLabel(doc.documentation_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'تم التحديث' : 'Updated'} {formatDate(doc.updated_at)}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'ar' ? 'تحليلات سير العمل' : 'Workflow Analytics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="completion" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completion">
                  {language === 'ar' ? 'الإنجاز' : 'Completion'}
                </TabsTrigger>
                <TabsTrigger value="types">
                  {language === 'ar' ? 'الأنواع' : 'Types'}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="completion" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'ar' ? 'وثائق مكتملة' : 'Completed Documents'}</span>
                      <span>{workflowMetrics.reviewCompliance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${workflowMetrics.reviewCompliance}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'ar' ? 'متوسط وقت الإنجاز' : 'Average Completion Time'}</span>
                      <span>{workflowMetrics.avgCompletionTime} {language === 'ar' ? 'أيام' : 'days'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="types" className="space-y-4">
                <div className="space-y-2">
                  {['soap_note', 'progress_note', 'assessment_note'].map((type) => {
                    const count = documentation.filter(d => d.documentation_type === type).length
                    const percentage = Math.round((count / Math.max(documentation.length, 1)) * 100)
                    
                    return (
                      <div key={type} className="flex justify-between items-center text-sm">
                        <span>{getDocumentationTypeLabel(type)}</span>
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-right">{count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => navigate('/clinical-documentation/add')}
            >
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة SOAP جديد' : 'New SOAP Note'}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => navigate('/clinical-documentation?status=pending_review')}
            >
              <Eye className="h-4 w-4" />
              {language === 'ar' ? 'مراجعة المعلقة' : 'Review Pending'}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => navigate('/clinical-documentation?filter=urgent')}
            >
              <AlertTriangle className="h-4 w-4" />
              {language === 'ar' ? 'عرض العاجل' : 'View Urgent'}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => navigate('/clinical-documentation')}
            >
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'جميع الوثائق' : 'All Documents'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClinicalWorkflowDashboard