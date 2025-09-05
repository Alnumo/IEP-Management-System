import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Settings, 
  Eye,
  AlertCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { CapacityManagementService } from '@/services/therapist/capacity-management-service'
import type { 
  CapacityMonitoringAlert, 
  CapacityConstraints,
  CapacityValidationResult,
  AssignmentRequest 
} from '@/services/therapist/capacity-management-service'

// Types
interface TherapistCapacitySummary {
  therapist_id: string
  therapist_name_ar: string
  therapist_name_en: string
  current_utilization: number
  capacity_remaining: number
  active_students: number
  weekly_hours: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  alerts_count: number
  constraints: CapacityConstraints
}

interface CapacityManagementDashboardProps {
  selectedTherapistId?: string
  showOnlyAlerts?: boolean
  autoRefresh?: boolean
  refreshIntervalSeconds?: number
  onTherapistSelect?: (therapistId: string) => void
  onAlertAction?: (alertId: string, action: string) => void
}

const CapacityManagementDashboard: React.FC<CapacityManagementDashboardProps> = ({
  selectedTherapistId,
  showOnlyAlerts = false,
  autoRefresh = true,
  refreshIntervalSeconds = 300, // 5 minutes
  onTherapistSelect,
  onAlertAction
}) => {
  const { language, isRTL } = useLanguage()
  const queryClient = useQueryClient()
  const capacityService = new CapacityManagementService()

  // Local state
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTherapist, setSelectedTherapist] = useState<string>(selectedTherapistId || '')
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week')

  // Translations
  const t = {
    title: {
      ar: 'لوحة إدارة الطاقة الاستيعابية',
      en: 'Capacity Management Dashboard'
    },
    tabs: {
      overview: { ar: 'نظرة عامة', en: 'Overview' },
      alerts: { ar: 'التنبيهات', en: 'Alerts' },
      therapists: { ar: 'المعالجين', en: 'Therapists' },
      analytics: { ar: 'التحليلات', en: 'Analytics' }
    },
    filters: {
      therapist: { ar: 'اختر المعالج', en: 'Select Therapist' },
      alertLevel: { ar: 'مستوى التنبيه', en: 'Alert Level' },
      timeRange: { ar: 'النطاق الزمني', en: 'Time Range' },
      all: { ar: 'الكل', en: 'All' },
      today: { ar: 'اليوم', en: 'Today' },
      week: { ar: 'هذا الأسبوع', en: 'This Week' },
      month: { ar: 'هذا الشهر', en: 'This Month' }
    },
    metrics: {
      totalTherapists: { ar: 'إجمالي المعالجين', en: 'Total Therapists' },
      atCapacity: { ar: 'في الحد الأقصى', en: 'At Capacity' },
      activeAlerts: { ar: 'التنبيهات النشطة', en: 'Active Alerts' },
      averageUtilization: { ar: 'متوسط الاستخدام', en: 'Average Utilization' },
      utilization: { ar: 'معدل الاستخدام', en: 'Utilization' },
      capacity: { ar: 'الطاقة المتبقية', en: 'Remaining Capacity' },
      students: { ar: 'الطلاب النشطين', en: 'Active Students' },
      weeklyHours: { ar: 'الساعات الأسبوعية', en: 'Weekly Hours' }
    },
    riskLevels: {
      low: { ar: 'منخفض', en: 'Low' },
      medium: { ar: 'متوسط', en: 'Medium' },
      high: { ar: 'عالي', en: 'High' },
      critical: { ar: 'حرج', en: 'Critical' }
    },
    alertTypes: {
      over_assignment: { ar: 'تجاوز التعيين', en: 'Over Assignment' },
      capacity_warning: { ar: 'تحذير الطاقة', en: 'Capacity Warning' },
      constraint_violation: { ar: 'انتهاك القيود', en: 'Constraint Violation' },
      schedule_conflict: { ar: 'تضارب الجدولة', en: 'Schedule Conflict' }
    },
    actions: {
      refresh: { ar: 'تحديث', en: 'Refresh' },
      export: { ar: 'تصدير', en: 'Export' },
      resolve: { ar: 'حل', en: 'Resolve' },
      acknowledge: { ar: 'إقرار', en: 'Acknowledge' },
      dismiss: { ar: 'تجاهل', en: 'Dismiss' },
      viewDetails: { ar: 'عرض التفاصيل', en: 'View Details' },
      adjustCapacity: { ar: 'تعديل الطاقة', en: 'Adjust Capacity' }
    },
    messages: {
      noAlerts: { ar: 'لا توجد تنبيهات حالياً', en: 'No alerts currently' },
      noTherapists: { ar: 'لا يوجد معالجين', en: 'No therapists found' },
      loadingError: { ar: 'خطأ في التحميل', en: 'Loading error' },
      refreshSuccess: { ar: 'تم التحديث بنجاح', en: 'Refreshed successfully' },
      exportSuccess: { ar: 'تم التصدير بنجاح', en: 'Exported successfully' }
    }
  }

  // Fetch capacity monitoring alerts
  const { 
    data: alertsData, 
    isLoading: alertsLoading, 
    error: alertsError,
    refetch: refetchAlerts 
  } = useQuery({
    queryKey: ['capacity-alerts', alertFilter, selectedTherapist],
    queryFn: async () => {
      const result = await capacityService.monitorCapacityAlerts()
      if (!result.success) {
        throw new Error(result.message)
      }
      
      let alerts = result.alerts || []
      
      // Apply filters
      if (alertFilter !== 'all') {
        alerts = alerts.filter(alert => alert.severity === alertFilter)
      }
      
      if (selectedTherapist) {
        alerts = alerts.filter(alert => alert.therapist_id === selectedTherapist)
      }
      
      return alerts
    },
    staleTime: autoRefresh ? refreshIntervalSeconds * 1000 : 5 * 60 * 1000,
    refetchInterval: autoRefresh ? refreshIntervalSeconds * 1000 : false
  })

  // Fetch therapist capacity summaries
  const { 
    data: therapistSummaries, 
    isLoading: summariesLoading,
    error: summariesError,
    refetch: refetchSummaries 
  } = useQuery({
    queryKey: ['therapist-capacity-summaries', timeRange],
    queryFn: async (): Promise<TherapistCapacitySummary[]> => {
      // This would be implemented with actual data fetching
      // For now, return mock data
      return [
        {
          therapist_id: 'therapist-1',
          therapist_name_ar: 'د. أحمد محمد',
          therapist_name_en: 'Dr. Ahmed Mohammed',
          current_utilization: 85,
          capacity_remaining: 6,
          active_students: 20,
          weekly_hours: 34,
          risk_level: 'high',
          alerts_count: 2,
          constraints: {
            max_daily_hours: 8,
            max_weekly_hours: 40,
            max_monthly_hours: 160,
            max_concurrent_students: 25,
            max_sessions_per_day: 8,
            required_break_minutes: 15,
            max_consecutive_hours: 4,
            specialty_requirements: ['speech_therapy'],
            availability_windows: []
          }
        }
      ]
    },
    staleTime: 5 * 60 * 1000
  })

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, action }: { alertId: string; action: string }) => {
      // Implementation would call actual API to resolve alert
      return { success: true }
    },
    onSuccess: () => {
      toast.success(t.messages.refreshSuccess[language])
      refetchAlerts()
      queryClient.invalidateQueries({ queryKey: ['capacity-alerts'] })
    },
    onError: () => {
      toast.error(t.messages.loadingError[language])
    }
  })

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async (format: 'pdf' | 'excel') => {
      // Implementation would generate and download report
      return { success: true, url: 'mock-export-url' }
    },
    onSuccess: () => {
      toast.success(t.messages.exportSuccess[language])
    }
  })

  // Handle alert action
  const handleAlertAction = useCallback((alertId: string, action: string) => {
    resolveAlertMutation.mutate({ alertId, action })
    onAlertAction?.(alertId, action)
  }, [resolveAlertMutation, onAlertAction])

  // Handle therapist selection
  const handleTherapistSelect = useCallback((therapistId: string) => {
    setSelectedTherapist(therapistId)
    onTherapistSelect?.(therapistId)
  }, [onTherapistSelect])

  // Manual refresh
  const handleRefresh = useCallback(() => {
    refetchAlerts()
    refetchSummaries()
    toast.success(t.messages.refreshSuccess[language])
  }, [refetchAlerts, refetchSummaries, language])

  // Export data
  const handleExport = useCallback((format: 'pdf' | 'excel') => {
    exportDataMutation.mutate(format)
  }, [exportDataMutation])

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertCircle className="h-4 w-4" />
      case 'low': return <Clock className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Calculate overview metrics
  const overviewMetrics = {
    totalTherapists: therapistSummaries?.length || 0,
    atCapacity: therapistSummaries?.filter(t => t.current_utilization >= 95).length || 0,
    activeAlerts: alertsData?.length || 0,
    averageUtilization: therapistSummaries?.reduce((sum, t) => sum + t.current_utilization, 0) / (therapistSummaries?.length || 1) || 0
  }

  if (showOnlyAlerts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t.tabs.alerts[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsList 
            alerts={alertsData || []}
            loading={alertsLoading}
            onAction={handleAlertAction}
            language={language}
            translations={t}
            getSeverityColor={getSeverityColor}
            getSeverityIcon={getSeverityIcon}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.title[language]}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'مراقبة وإدارة الطاقة الاستيعابية للمعالجين'
              : 'Monitor and manage therapist capacity and workload'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={alertsLoading || summariesLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.actions.refresh[language]}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('pdf')}
            disabled={exportDataMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {t.actions.export[language]}
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t.metrics.totalTherapists[language]}
                </p>
                <p className="text-2xl font-semibold">
                  {overviewMetrics.totalTherapists}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t.metrics.atCapacity[language]}
                </p>
                <p className="text-2xl font-semibold text-orange-600">
                  {overviewMetrics.atCapacity}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t.metrics.activeAlerts[language]}
                </p>
                <p className="text-2xl font-semibold text-red-600">
                  {overviewMetrics.activeAlerts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t.metrics.averageUtilization[language]}
                </p>
                <p className="text-2xl font-semibold text-blue-600">
                  {Math.round(overviewMetrics.averageUtilization)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {language === 'ar' ? 'الفلاتر:' : 'Filters:'}
          </span>
        </div>
        
        <Select value={selectedTherapist} onValueChange={handleTherapistSelect}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t.filters.therapist[language]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {t.filters.all[language]}
            </SelectItem>
            {therapistSummaries?.map(therapist => (
              <SelectItem key={therapist.therapist_id} value={therapist.therapist_id}>
                {language === 'ar' ? therapist.therapist_name_ar : therapist.therapist_name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={alertFilter} onValueChange={(value: any) => setAlertFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.filters.alertLevel[language]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filters.all[language]}</SelectItem>
            <SelectItem value="critical">{t.riskLevels.critical[language]}</SelectItem>
            <SelectItem value="high">{t.riskLevels.high[language]}</SelectItem>
            <SelectItem value="medium">{t.riskLevels.medium[language]}</SelectItem>
            <SelectItem value="low">{t.riskLevels.low[language]}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.filters.timeRange[language]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t.filters.today[language]}</SelectItem>
            <SelectItem value="week">{t.filters.week[language]}</SelectItem>
            <SelectItem value="month">{t.filters.month[language]}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t.tabs.overview[language]}</TabsTrigger>
          <TabsTrigger value="alerts">{t.tabs.alerts[language]}</TabsTrigger>
          <TabsTrigger value="therapists">{t.tabs.therapists[language]}</TabsTrigger>
          <TabsTrigger value="analytics">{t.tabs.analytics[language]}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Alerts Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t.tabs.alerts[language]}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'التنبيهات النشطة التي تتطلب اهتماماً'
                    : 'Active alerts requiring attention'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertsList 
                  alerts={(alertsData || []).slice(0, 5)} // Show top 5 alerts
                  loading={alertsLoading}
                  onAction={handleAlertAction}
                  language={language}
                  translations={t}
                  getSeverityColor={getSeverityColor}
                  getSeverityIcon={getSeverityIcon}
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Top Capacity Concerns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {language === 'ar' ? 'مخاوف الطاقة الرئيسية' : 'Top Capacity Concerns'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'المعالجين الأكثر حاجة لانتباه'
                    : 'Therapists requiring most attention'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TherapistSummaryList 
                  therapists={(therapistSummaries || []).slice(0, 5)}
                  loading={summariesLoading}
                  onSelect={handleTherapistSelect}
                  language={language}
                  translations={t}
                  getRiskLevelColor={getRiskLevelColor}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>{t.tabs.alerts[language]}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'جميع التنبيهات النشطة لإدارة الطاقة الاستيعابية'
                  : 'All active capacity management alerts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertsList 
                alerts={alertsData || []}
                loading={alertsLoading}
                onAction={handleAlertAction}
                language={language}
                translations={t}
                getSeverityColor={getSeverityColor}
                getSeverityIcon={getSeverityIcon}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="therapists">
          <Card>
            <CardHeader>
              <CardTitle>{t.tabs.therapists[language]}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'ملخص شامل للطاقة الاستيعابية للمعالجين'
                  : 'Comprehensive therapist capacity overview'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TherapistSummaryList 
                therapists={therapistSummaries || []}
                loading={summariesLoading}
                onSelect={handleTherapistSelect}
                language={language}
                translations={t}
                getRiskLevelColor={getRiskLevelColor}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t.tabs.analytics[language]}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'تحليلات وإحصائيات الطاقة الاستيعابية'
                  : 'Capacity analytics and insights'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' 
                  ? 'تحليلات الطاقة قيد التطوير'
                  : 'Capacity analytics coming soon'
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-components
const AlertsList: React.FC<{
  alerts: CapacityMonitoringAlert[]
  loading: boolean
  onAction: (alertId: string, action: string) => void
  language: 'ar' | 'en'
  translations: any
  getSeverityColor: (severity: string) => string
  getSeverityIcon: (severity: string) => React.ReactNode
  compact?: boolean
}> = ({ alerts, loading, onAction, language, translations: t, getSeverityColor, getSeverityIcon, compact = false }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
        {t.messages.noAlerts[language]}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Alert key={alert.alert_id} className="relative">
          <div className="flex items-start gap-3">
            <Badge variant={getSeverityColor(alert.severity)} className="flex items-center gap-1">
              {getSeverityIcon(alert.severity)}
              {t.riskLevels[alert.severity]?.[language] || alert.severity}
            </Badge>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {language === 'ar' ? alert.message_ar : alert.message_en}
                </p>
                <Badge variant="outline" className="text-xs">
                  {t.alertTypes[alert.alert_type]?.[language] || alert.alert_type}
                </Badge>
              </div>
              
              {!compact && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.triggered_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                  
                  {alert.requires_immediate_action && (
                    <Badge variant="destructive" className="text-xs">
                      {language === 'ar' ? 'يتطلب إجراء فوري' : 'Immediate Action Required'}
                    </Badge>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onAction(alert.alert_id, 'acknowledge')}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onAction(alert.alert_id, 'resolve')}
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  )
}

const TherapistSummaryList: React.FC<{
  therapists: TherapistCapacitySummary[]
  loading: boolean
  onSelect: (therapistId: string) => void
  language: 'ar' | 'en'
  translations: any
  getRiskLevelColor: (level: string) => string
  compact?: boolean
}> = ({ therapists, loading, onSelect, language, translations: t, getRiskLevelColor, compact = false }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (therapists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2" />
        {t.messages.noTherapists[language]}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {therapists.map((therapist) => (
        <Card 
          key={therapist.therapist_id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(therapist.therapist_id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">
                  {language === 'ar' ? therapist.therapist_name_ar : therapist.therapist_name_en}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {therapist.active_students} {t.metrics.students[language]} • {therapist.weekly_hours}h {language === 'ar' ? 'أسبوعياً' : 'weekly'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {therapist.alerts_count > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {therapist.alerts_count}
                  </Badge>
                )}
                <Badge className={`text-xs ${getRiskLevelColor(therapist.risk_level)}`}>
                  {t.riskLevels[therapist.risk_level][language]}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t.metrics.utilization[language]}</span>
                <span className="font-medium">{Math.round(therapist.current_utilization)}%</span>
              </div>
              <Progress 
                value={therapist.current_utilization} 
                className="h-2"
              />
              
              {!compact && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.metrics.capacity[language]}: </span>
                    <span className="font-medium">{therapist.capacity_remaining}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.metrics.students[language]}: </span>
                    <span className="font-medium">{therapist.active_students}/{therapist.constraints.max_concurrent_students}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { CapacityManagementDashboard }
export type { CapacityManagementDashboardProps, TherapistCapacitySummary }