import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Brain, 
  AlertTriangle, 
  Target, 
  BarChart3, 
  Award,
  Activity,
  Lightbulb,
  Settings,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { aiAnalyticsService } from '@/services/ai-analytics'
import type { 
  IntelligentAlert, 
  DashboardInsight,
  TherapyEffectivenessMetrics
} from '@/types/ai-analytics'

export default function AIAnalyticsPage() {
  const { language, isRTL } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([])
  const [insights, setInsights] = useState<DashboardInsight[]>([])
  const [effectiveness, setEffectiveness] = useState<TherapyEffectivenessMetrics | null>(null)
  const [systemHealth, setSystemHealth] = useState<any>(null)

  useEffect(() => {
    loadAIAnalytics()
  }, [])

  const loadAIAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // Load AI analytics data
      const [alertsData, insightsData, healthData, effectivenessData] = await Promise.all([
        aiAnalyticsService.generateIntelligentAlerts(),
        aiAnalyticsService.generateDashboardInsights(),
        aiAnalyticsService.systemHealthCheck(),
        aiAnalyticsService.calculateTherapyEffectiveness('aba_program', '2024-01-01', '2024-12-31')
      ])

      setAlerts(alertsData)
      setInsights(insightsData)
      setSystemHealth(healthData)
      setEffectiveness(effectivenessData)

    } catch (error) {
      console.error('Error loading AI analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'urgent': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'critical': return 'bg-red-200 text-red-900'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل التحليلات الذكية...' : 'Loading AI Analytics...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'التحليلات الذكية' : 'AI Analytics'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'نظام التحليل الذكي للعلاج بتقنية الذكاء الاصطناعي' 
              : 'AI-powered therapy management analytics system'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAIAnalytics}>
            <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          <Button variant="outline">
            <Settings className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'حالة النظام' : 'System Status'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={getHealthStatusColor(systemHealth.status)}>
                      {language === 'ar' 
                        ? (systemHealth.status === 'healthy' ? 'سليم' : systemHealth.status === 'degraded' ? 'متدهور' : 'حرج')
                        : systemHealth.status}
                    </Badge>
                  </div>
                </div>
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'النماذج النشطة' : 'Active Models'}
                  </p>
                  <p className="text-2xl font-bold">{systemHealth.activeModels}</p>
                </div>
                <Brain className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التنبيهات النشطة' : 'Active Alerts'}
                  </p>
                  <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'active').length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'معدل الدقة' : 'Accuracy Rate'}
                  </p>
                  <p className="text-2xl font-bold">{(systemHealth.performance?.accuracyScore * 100).toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="alerts" className={language === 'ar' ? 'font-arabic' : ''}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'التنبيهات' : 'Alerts'}
          </TabsTrigger>
          <TabsTrigger value="insights" className={language === 'ar' ? 'font-arabic' : ''}>
            <Lightbulb className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'الرؤى' : 'Insights'}
          </TabsTrigger>
          <TabsTrigger value="effectiveness" className={language === 'ar' ? 'font-arabic' : ''}>
            <Award className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'الفعالية' : 'Effectiveness'}
          </TabsTrigger>
          <TabsTrigger value="models" className={language === 'ar' ? 'font-arabic' : ''}>
            <Brain className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'النماذج' : 'Models'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Insights */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <TrendingUp className="w-5 h-5" />
                  {language === 'ar' ? 'أحدث الرؤى' : 'Latest Insights'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? insight.titleAr : insight.titleEn}
                      </h4>
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? insight.descriptionAr : insight.descriptionEn}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'مستوى الثقة:' : 'Confidence:'} {(insight.relevanceScore * 100).toFixed(0)}%
                      </span>
                      <Progress value={insight.relevanceScore * 100} className="w-20" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <AlertTriangle className="w-5 h-5" />
                  {language === 'ar' ? 'التنبيهات الهامة' : 'Critical Alerts'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'urgent').slice(0, 3).map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? alert.titleAr : alert.titleEn}
                      </h4>
                      <Badge className={getAlertSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? alert.descriptionAr : alert.descriptionEn}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </Button>
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'إجراء' : 'Take Action'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'التنبيهات الذكية' : 'Intelligent Alerts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' ? alert.titleAr : alert.titleEn}
                          </h4>
                          <Badge className={getAlertSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className={`text-sm text-muted-foreground mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? alert.descriptionAr : alert.descriptionEn}
                        </p>
                        {alert.recommendedActions.length > 0 && (
                          <div>
                            <p className={`text-sm font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {language === 'ar' ? 'الإجراءات المقترحة:' : 'Recommended Actions:'}
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {alert.recommendedActions.map((action, index) => (
                                <li key={index} className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'الثقة:' : 'Confidence:'} {(alert.confidenceScore * 100).toFixed(0)}%
                        </span>
                        <Button size="sm" variant="outline">
                          {language === 'ar' ? 'إقرار' : 'Acknowledge'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? insight.titleAr : insight.titleEn}
                    </CardTitle>
                    <Badge className={getPriorityColor(insight.priority)}>
                      {insight.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? insight.descriptionAr : insight.descriptionEn}
                  </p>
                  
                  {/* Mock Chart Visualization */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center h-32">
                      <BarChart3 className="w-12 h-12 text-gray-400" />
                      <span className="ml-2 text-gray-500">
                        {language === 'ar' ? 'رسم بياني تفاعلي' : 'Interactive Chart'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'مستوى الصلة:' : 'Relevance:'} {(insight.relevanceScore * 100).toFixed(0)}%
                    </span>
                    <Progress value={insight.relevanceScore * 100} className="w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Effectiveness Tab */}
        <TabsContent value="effectiveness" className="space-y-6">
          {effectiveness && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الفعالية الإجمالية' : 'Overall Effectiveness'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {(effectiveness.overallEffectivenessScore * 100).toFixed(1)}%
                    </div>
                    <Progress value={effectiveness.overallEffectivenessScore * 100} className="mb-4" />
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'نتائج ممتازة' : 'Excellent Results'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'معدل تحقيق الأهداف' : 'Goal Achievement Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {(effectiveness.goalAchievementRate * 100).toFixed(1)}%
                    </div>
                    <Progress value={effectiveness.goalAchievementRate * 100} className="mb-4" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{language === 'ar' ? 'الأهداف المحققة' : 'Goals Achieved'}</span>
                      <span>{Math.round(effectiveness.goalAchievementRate * effectiveness.studentsAnalyzed)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'معدل إكمال الجلسات' : 'Session Completion Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {(effectiveness.sessionCompletionRate * 100).toFixed(1)}%
                    </div>
                    <Progress value={effectiveness.sessionCompletionRate * 100} className="mb-4" />
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معدل حضور ممتاز' : 'Excellent Attendance'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تفصيل الأداء حسب المهارات' : 'Performance Breakdown by Skills'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(effectiveness.metricsBreakdown).map(([skill, score]) => (
                      <div key={skill} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {language === 'ar' 
                              ? (skill === 'communicationSkills' ? 'مهارات التواصل' : 
                                 skill === 'socialSkills' ? 'المهارات الاجتماعية' :
                                 skill === 'behavioralGoals' ? 'الأهداف السلوكية' :
                                 skill === 'motorSkills' ? 'المهارات الحركية' :
                                 skill === 'academicSkills' ? 'المهارات الأكاديمية' : skill)
                              : skill.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <span className="font-bold">{(Number(score) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(score) * 100} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'نماذج الذكاء الاصطناعي' : 'AI Models'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {aiAnalyticsService.getActiveModels().map((model) => (
                  <div key={model.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{model.modelName}</h4>
                      <Badge className={model.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {model.isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'الإصدار:' : 'Version:'}
                        </span>
                        <span className="ml-1 font-medium">{model.modelVersion}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'النوع:' : 'Type:'}
                        </span>
                        <span className="ml-1 font-medium">{model.modelType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'الدقة:' : 'Accuracy:'}
                        </span>
                        <span className="ml-1 font-medium">{(model.accuracyScore * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <Progress value={model.accuracyScore * 100} className="w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}