// Enterprise Automation Dashboard - Phase 7 Implementation
// Comprehensive automation management and monitoring

import { useState } from 'react'
import { 
  Cog, 
  Activity, 
  BarChart3, 
  Zap, 
  Settings, 
  Play,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  useAutomationDashboard, 
  useAutomationWorkflows,
  useExecuteWorkflow,
  useSystemHealth 
} from '@/hooks/useEnterpriseAutomation'

export default function EnterpriseAutomationPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const { data: dashboardData, isLoading: dashboardLoading } = useAutomationDashboard()
  const { data: workflows = [], isLoading: workflowsLoading } = useAutomationWorkflows()
  const { data: systemHealth } = useSystemHealth()
  const executeWorkflow = useExecuteWorkflow()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'failed': case 'error': return 'bg-red-100 text-red-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleExecuteWorkflow = (workflowId: string) => {
    executeWorkflow.mutate({
      workflowId,
      triggerData: { source: 'manual_execution', timestamp: new Date().toISOString() },
      triggeredBy: 'current_user'
    })
  }

  if (dashboardLoading || workflowsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">
              {language === 'ar' ? 'جاري تحميل لوحة الأتمتة...' : 'Loading Automation Dashboard...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cog className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'أتمتة العمليات المؤسسية' : 'Enterprise Automation'}
              </h1>
              <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة ومراقبة العمليات الآلية' : 'Manage and monitor automated processes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {systemHealth?.overall || 'Healthy'}
            </Badge>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'العمليات النشطة' : 'Active Workflows'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.analytics?.totalWorkflowsActive || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'التوفير الشهري' : 'Monthly Savings'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {language === 'ar' ? 'ر.س' : 'SAR'} {dashboardData?.analytics?.costSavingsThisMonth?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'معدل النجاح' : 'Success Rate'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {((1 - (dashboardData?.analytics?.errorRatePercentage || 0) / 100) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'متوسط وقت الإنجاز' : 'Avg Completion'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.analytics?.averageCompletionTime || 0}h
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="workflows" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'العمليات' : 'Workflows'}
          </TabsTrigger>
          <TabsTrigger value="monitoring" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المراقبة' : 'Monitoring'}
          </TabsTrigger>
          <TabsTrigger value="settings" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BarChart3 className="w-5 h-5" />
                {language === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'كفاءة الأتمتة' : 'Automation Efficiency'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {((dashboardData?.analytics?.automationEfficiencyScore || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(dashboardData?.analytics?.automationEfficiencyScore || 0) * 100} 
                    className="h-2" 
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'رضا المستخدمين' : 'User Satisfaction'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {dashboardData?.analytics?.userSatisfactionScore || 0}/5.0
                    </span>
                  </div>
                  <Progress 
                    value={((dashboardData?.analytics?.userSatisfactionScore || 0) / 5) * 100} 
                    className="h-2" 
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'مستوى التطابق' : 'Compliance Level'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {((dashboardData?.analytics?.complianceScore || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(dashboardData?.analytics?.complianceScore || 0) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Workflows */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Zap className="w-5 h-5" />
                {language === 'ar' ? 'العمليات الأفضل أداءً' : 'Top Performing Workflows'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.analytics?.topPerformingWorkflows?.map((workflow) => (
                  <div key={workflow.workflowId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {workflow.workflowName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {language === 'ar' ? 'تم التنفيذ' : 'Executed'} {workflow.executionCount} {language === 'ar' ? 'مرة' : 'times'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {workflow.successRate * 100}% {language === 'ar' ? 'نجاح' : 'success'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {workflow.averageCompletionTime}h {language === 'ar' ? 'متوسط' : 'avg'}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Cog className="w-5 h-5" />
                {language === 'ar' ? 'العمليات الآلية المتاحة' : 'Available Workflows'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Cog className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {workflow.workflowName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {language === 'ar' ? workflow.descriptionAr : workflow.descriptionEn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(workflow.automationLevel)}>
                          {workflow.automationLevel}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleExecuteWorkflow(workflow.id)}
                          disabled={executeWorkflow.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'تشغيل' : 'Execute'}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">
                          {language === 'ar' ? 'النوع:' : 'Type:'}
                        </span>
                        <span className="ml-2 font-medium">{workflow.workflowType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          {language === 'ar' ? 'الأولوية:' : 'Priority:'}
                        </span>
                        <span className="ml-2 font-medium">{workflow.priorityLevel}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          {language === 'ar' ? 'الوقت المتوقع:' : 'Est. Time:'}
                        </span>
                        <span className="ml-2 font-medium">{workflow.estimatedCompletionHours}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Activity className="w-5 h-5" />
                {language === 'ar' ? 'مراقبة النظام في الوقت الفعلي' : 'Real-time System Monitoring'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'حالة المكونات' : 'Component Status'}
                  </h4>
                  {systemHealth?.components && Object.entries(systemHealth.components).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="text-sm">{component.replace('_', ' ')}</span>
                      <Badge className={getStatusColor((status as any).status)}>
                        {(status as any).status}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'مقاييس الأداء' : 'Performance Metrics'}
                  </h4>
                  {systemHealth?.performance && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {language === 'ar' ? 'وقت الاستجابة:' : 'Response Time:'}
                        </span>
                        <span className="text-sm font-medium">
                          {systemHealth.performance.averageResponseTime}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {language === 'ar' ? 'معدل الخطأ:' : 'Error Rate:'}
                        </span>
                        <span className="text-sm font-medium">
                          {systemHealth.performance.errorRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {language === 'ar' ? 'الإنتاجية:' : 'Throughput:'}
                        </span>
                        <span className="text-sm font-medium">
                          {systemHealth.performance.throughput}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Settings className="w-5 h-5" />
                {language === 'ar' ? 'إعدادات الأتمتة' : 'Automation Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className={`font-medium mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'ar' ? 'تفعيل التنفيذ التلقائي' : 'Enable Auto-execution'}
                      </span>
                      <Button variant="outline" size="sm">
                        {language === 'ar' ? 'تكوين' : 'Configure'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'ar' ? 'إشعارات الأخطاء' : 'Error Notifications'}
                      </span>
                      <Button variant="outline" size="sm">
                        {language === 'ar' ? 'تكوين' : 'Configure'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className={`font-medium mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'حدود الأمان' : 'Safety Limits'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'ar' ? 'الحد الأقصى للعمليات المتزامنة' : 'Max Concurrent Workflows'}
                      </span>
                      <span className="text-sm font-medium">10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'ar' ? 'مهلة انتهاء العملية' : 'Workflow Timeout'}
                      </span>
                      <span className="text-sm font-medium">30 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}