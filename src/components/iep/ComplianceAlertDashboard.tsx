/**
 * Compliance Alert Dashboard Component
 * مكون لوحة تحكم تنبيهات الامتثال
 * 
 * @description Comprehensive dashboard for managing compliance alerts with automated notifications
 * لوحة تحكم شاملة لإدارة تنبيهات الامتثال مع الإشعارات التلقائية
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  CheckCheck,
  AlertOctagon,
  Calendar,
  Target,
  Activity,
  Settings,
  Play,
  Pause
} from 'lucide-react'

import {
  useComplianceAlerts,
  useComplianceAlertStats,
  useHighPriorityAlerts,
  useUserActiveAlerts,
  useOverdueAlerts,
  useUrgentAlerts,
  useCreateComplianceAlert,
  useUpdateComplianceAlert,
  useResolveComplianceAlert,
  useAcknowledgeComplianceAlert,
  useEscalateComplianceAlert,
  useRunComplianceMonitoring
} from '@/hooks/useComplianceAlerts'

import {
  ServiceComplianceAlert,
  ComplianceAlertFilters,
  AlertType,
  AlertPriority,
  AlertStatus,
  CreateComplianceAlertData
} from '@/types/service-tracking'

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

interface ComplianceAlertDashboardProps {
  userId?: string
  serviceId?: string
  studentId?: string
  language: 'ar' | 'en'
  className?: string
}

interface AlertFiltersState {
  search: string
  alertType: AlertType | 'all'
  priority: AlertPriority | 'all'
  status: AlertStatus | 'all'
  assignedTo: string | 'all'
  dateRange: 'today' | 'week' | 'month' | 'all'
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getAlertPriorityColor = (priority: AlertPriority): string => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getAlertStatusColor = (status: AlertStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'acknowledged':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'dismissed':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'escalated':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getAlertTypeIcon = (type: AlertType) => {
  switch (type) {
    case 'service_hours_below_threshold':
      return <Clock className="h-4 w-4" />
    case 'excessive_cancellations':
      return <XCircle className="h-4 w-4" />
    case 'missed_sessions_requiring_makeup':
      return <Calendar className="h-4 w-4" />
    case 'provider_unavailable':
      return <User className="h-4 w-4" />
    case 'documentation_overdue':
      return <FileText className="h-4 w-4" />
    case 'compliance_review_required':
      return <Target className="h-4 w-4" />
    case 'service_modification_needed':
      return <Settings className="h-4 w-4" />
    default:
      return <AlertTriangle className="h-4 w-4" />
  }
}

const formatDate = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getAlertTypeLabel = (type: AlertType, language: 'ar' | 'en'): string => {
  const labels: Record<AlertType, { ar: string; en: string }> = {
    service_hours_below_threshold: {
      ar: 'ساعات الخدمة أقل من المطلوب',
      en: 'Service Hours Below Threshold'
    },
    excessive_cancellations: {
      ar: 'إلغاءات مفرطة',
      en: 'Excessive Cancellations'
    },
    missed_sessions_requiring_makeup: {
      ar: 'جلسات تحتاج تعويض',
      en: 'Sessions Requiring Makeup'
    },
    provider_unavailable: {
      ar: 'مقدم الخدمة غير متاح',
      en: 'Provider Unavailable'
    },
    documentation_overdue: {
      ar: 'توثيق متأخر',
      en: 'Documentation Overdue'
    },
    compliance_review_required: {
      ar: 'مراجعة امتثال مطلوبة',
      en: 'Compliance Review Required'
    },
    service_modification_needed: {
      ar: 'تعديل الخدمة مطلوب',
      en: 'Service Modification Needed'
    }
  }
  return labels[type][language]
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface AlertsOverviewProps {
  stats: any
  language: 'ar' | 'en'
}

const AlertsOverview: React.FC<AlertsOverviewProps> = ({ stats, language }) => {
  const isRTL = language === 'ar'

  if (!stats) return null

  const overallHealthScore = stats.total_alerts > 0
    ? Math.round(((stats.resolved_alerts + stats.dismissed_alerts) / stats.total_alerts) * 100)
    : 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isRTL ? 'إجمالي التنبيهات' : 'Total Alerts'}
          </CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_alerts}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>{stats.active_alerts} {isRTL ? 'نشط' : 'active'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className={stats.critical_alerts > 0 ? "border-red-200 bg-red-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isRTL ? 'تنبيهات حرجة' : 'Critical Alerts'}
          </CardTitle>
          <AlertOctagon className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.critical_alerts}</div>
          <div className="text-xs text-muted-foreground">
            + {stats.high_priority_alerts} {isRTL ? 'عالية الأولوية' : 'high priority'}
          </div>
        </CardContent>
      </Card>

      <Card className={stats.overdue_alerts > 0 ? "border-orange-200 bg-orange-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isRTL ? 'تنبيهات متأخرة' : 'Overdue Alerts'}
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.overdue_alerts}</div>
          <div className="text-xs text-muted-foreground">
            {isRTL ? 'تحتاج اهتماماً فورياً' : 'Need immediate attention'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isRTL ? 'درجة الصحة العامة' : 'Overall Health Score'}
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallHealthScore}%</div>
          <Progress value={overallHealthScore} className="mt-2 h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {stats.resolved_alerts} {isRTL ? 'محلول' : 'resolved'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface AlertsTableProps {
  alerts: ServiceComplianceAlert[]
  language: 'ar' | 'en'
  onAlertAction: (alert: ServiceComplianceAlert, action: string) => void
}

const AlertsTable: React.FC<AlertsTableProps> = ({ alerts, language, onAlertAction }) => {
  const isRTL = language === 'ar'

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isRTL ? 'لا توجد تنبيهات' : 'No alerts found'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'النوع' : 'Type'}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'العنوان' : 'Title'}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'الأولوية' : 'Priority'}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'الحالة' : 'Status'}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'التاريخ' : 'Date'}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? 'الإجراءات' : 'Actions'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAlertTypeIcon(alert.alert_type)}
                    <span className="text-sm">
                      {getAlertTypeLabel(alert.alert_type, language)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="font-medium">
                      {language === 'ar' ? alert.alert_title_ar : alert.alert_title_en}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {language === 'ar' ? alert.alert_message_ar : alert.alert_message_en}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getAlertPriorityColor(alert.priority_level)}>
                    {isRTL 
                      ? alert.priority_level === 'critical' ? 'حرج'
                        : alert.priority_level === 'high' ? 'عالي'
                        : alert.priority_level === 'medium' ? 'متوسط'
                        : 'منخفض'
                      : alert.priority_level
                    }
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getAlertStatusColor(alert.alert_status)}>
                    {isRTL 
                      ? alert.alert_status === 'active' ? 'نشط'
                        : alert.alert_status === 'acknowledged' ? 'مُقر به'
                        : alert.alert_status === 'resolved' ? 'محلول'
                        : alert.alert_status === 'escalated' ? 'مُصعد'
                        : 'مُلغى'
                      : alert.alert_status
                    }
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(alert.alert_triggered_date, language)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        {isRTL ? 'الإجراءات' : 'Actions'}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onAlertAction(alert, 'view')}>
                        <Eye className="h-4 w-4 mr-2" />
                        {isRTL ? 'عرض' : 'View'}
                      </DropdownMenuItem>
                      {alert.alert_status === 'active' && (
                        <>
                          <DropdownMenuItem onClick={() => onAlertAction(alert, 'acknowledge')}>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            {isRTL ? 'إقرار' : 'Acknowledge'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAlertAction(alert, 'escalate')}>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {isRTL ? 'تصعيد' : 'Escalate'}
                          </DropdownMenuItem>
                        </>
                      )}
                      {['active', 'acknowledged', 'escalated'].includes(alert.alert_status) && (
                        <DropdownMenuItem onClick={() => onAlertAction(alert, 'resolve')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isRTL ? 'حل' : 'Resolve'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ComplianceAlertDashboard: React.FC<ComplianceAlertDashboardProps> = ({
  userId,
  serviceId,
  studentId,
  language = 'ar',
  className
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [filters, setFilters] = useState<AlertFiltersState>({
    search: '',
    alertType: 'all',
    priority: 'all',
    status: 'all',
    assignedTo: 'all',
    dateRange: 'all'
  })
  const [selectedAlert, setSelectedAlert] = useState<ServiceComplianceAlert | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: string
    alert: ServiceComplianceAlert | null
  }>({ open: false, action: '', alert: null })

  // Build filters for API calls
  const apiFilters = useMemo((): ComplianceAlertFilters => {
    const result: ComplianceAlertFilters = {}
    
    if (serviceId) result.service_id = serviceId
    if (studentId) result.student_id = studentId
    if (filters.alertType !== 'all') result.alert_type = [filters.alertType as AlertType]
    if (filters.priority !== 'all') result.priority_level = [filters.priority as AlertPriority]
    if (filters.status !== 'all') result.alert_status = [filters.status as AlertStatus]
    if (filters.assignedTo !== 'all') result.assigned_to = filters.assignedTo
    if (filters.requires_action) result.requires_action = true

    // Date range filtering
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
          break
        case 'month':
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
          break
        default:
          startDate = new Date(0)
      }
      
      result.date_range = { start: startDate, end: now }
    }

    return result
  }, [serviceId, studentId, filters])

  // Data fetching hooks
  const { 
    data: alerts = [], 
    isLoading: alertsLoading,
    refetch: refetchAlerts
  } = useComplianceAlerts(apiFilters)
  
  const { 
    data: stats,
    isLoading: statsLoading
  } = useComplianceAlertStats()

  const { data: highPriorityAlerts = [] } = useHighPriorityAlerts()
  const { data: overdueAlerts = [] } = useOverdueAlerts()
  const { data: urgentAlerts = [] } = useUrgentAlerts()

  // Mutations
  const acknowledgeAlertMutation = useAcknowledgeComplianceAlert()
  const resolveAlertMutation = useResolveComplianceAlert()
  const escalateAlertMutation = useEscalateComplianceAlert()
  const runMonitoringMutation = useRunComplianceMonitoring()

  // Filter alerts by search query
  const filteredAlerts = useMemo(() => {
    if (!filters.search) return alerts
    
    const query = filters.search.toLowerCase()
    return alerts.filter(alert => 
      alert.alert_title_ar.toLowerCase().includes(query) ||
      alert.alert_title_en.toLowerCase().includes(query) ||
      alert.alert_message_ar.toLowerCase().includes(query) ||
      alert.alert_message_en.toLowerCase().includes(query)
    )
  }, [alerts, filters.search])

  // Event handlers
  const handleAlertAction = (alert: ServiceComplianceAlert, action: string) => {
    setActionDialog({ open: true, action, alert })
  }

  const executeAction = async () => {
    if (!actionDialog.alert || !userId) return

    const alert = actionDialog.alert
    const action = actionDialog.action

    try {
      switch (action) {
        case 'acknowledge':
          await acknowledgeAlertMutation.mutateAsync({
            alertId: alert.id,
            acknowledgedBy: userId
          })
          break
        case 'resolve':
          await resolveAlertMutation.mutateAsync({
            alertId: alert.id,
            resolutionData: {
              resolved_by_user_id: userId,
              resolution_notes_ar: 'تم الحل من لوحة التحكم',
              resolution_notes_en: 'Resolved from dashboard'
            }
          })
          break
        case 'escalate':
          await escalateAlertMutation.mutateAsync({
            alertId: alert.id,
            escalationData: {
              new_priority: alert.priority_level === 'medium' ? 'high' : 'critical',
              escalation_reason_ar: 'تم التصعيد من لوحة التحكم',
              escalation_reason_en: 'Escalated from dashboard'
            }
          })
          break
      }
      setActionDialog({ open: false, action: '', alert: null })
    } catch (error) {
      console.error('Error executing action:', error)
    }
  }

  const handleRunMonitoring = async () => {
    try {
      await runMonitoringMutation.mutateAsync()
      await refetchAlerts()
    } catch (error) {
      console.error('Error running compliance monitoring:', error)
    }
  }

  // Loading state
  if (alertsLoading && statsLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? 'جاري تحميل التنبيهات...' : 'Loading alerts...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? 'لوحة تحكم تنبيهات الامتثال' : 'Compliance Alert Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'مراقبة وإدارة تنبيهات الامتثال والإشعارات التلقائية'
              : 'Monitor and manage compliance alerts with automated notifications'
            }
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAlerts()}
            disabled={alertsLoading}
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              alertsLoading && "animate-spin",
              isRTL ? "ml-2" : "mr-2"
            )} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
          <Button
            size="sm"
            onClick={handleRunMonitoring}
            disabled={runMonitoringMutation.isPending}
          >
            <Play className={cn(
              "h-4 w-4",
              runMonitoringMutation.isPending && "animate-pulse",
              isRTL ? "ml-2" : "mr-2"
            )} />
            {isRTL ? 'تشغيل المراقبة' : 'Run Monitoring'}
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && <AlertsOverview stats={stats} language={language} />}

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle className="text-red-800">
            {isRTL ? 'تنبيهات عاجلة تتطلب اهتماماً فورياً' : 'Urgent Alerts Requiring Immediate Attention'}
          </AlertTitle>
          <AlertDescription className="text-red-700">
            {isRTL 
              ? `لديك ${urgentAlerts.length} تنبيه عاجل يحتاج إلى اهتمام فوري`
              : `You have ${urgentAlerts.length} urgent alert${urgentAlerts.length > 1 ? 's' : ''} requiring immediate attention`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {isRTL ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="active">
            {isRTL ? 'التنبيهات النشطة' : 'Active Alerts'}
            {stats && stats.active_alerts > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {stats.active_alerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            {isRTL ? 'المحلولة' : 'Resolved'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {isRTL ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* High Priority Alerts */}
          {highPriorityAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  {isRTL ? 'تنبيهات عالية الأولوية' : 'High Priority Alerts'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highPriorityAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getAlertTypeIcon(alert.alert_type)}
                        <div>
                          <p className="font-medium">
                            {language === 'ar' ? alert.alert_title_ar : alert.alert_title_en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(alert.alert_triggered_date, language)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getAlertPriorityColor(alert.priority_level)}>
                          {alert.priority_level}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAlertAction(alert, 'view')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'النشاط الحديث' : 'Recent Activity'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 text-sm">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      alert.alert_status === 'active' ? "bg-red-500" :
                      alert.alert_status === 'resolved' ? "bg-green-500" :
                      "bg-yellow-500"
                    )} />
                    <span className="text-muted-foreground">
                      {formatDate(alert.alert_triggered_date, language)}
                    </span>
                    <span>
                      {language === 'ar' ? alert.alert_title_ar : alert.alert_title_en}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Filter className="h-5 w-5" />
                {isRTL ? 'تصفية التنبيهات' : 'Filter Alerts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">{isRTL ? 'البحث' : 'Search'}</Label>
                  <div className="relative">
                    <Search className={cn(
                      "absolute top-3 h-4 w-4 text-muted-foreground",
                      isRTL ? "right-3" : "left-3"
                    )} />
                    <Input
                      id="search"
                      placeholder={isRTL ? 'ابحث في التنبيهات...' : 'Search alerts...'}
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className={cn(isRTL ? "pr-9" : "pl-9")}
                    />
                  </div>
                </div>

                <div>
                  <Label>{isRTL ? 'نوع التنبيه' : 'Alert Type'}</Label>
                  <Select 
                    value={filters.alertType} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, alertType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                      <SelectItem value="service_hours_below_threshold">
                        {isRTL ? 'ساعات أقل من المطلوب' : 'Hours Below Threshold'}
                      </SelectItem>
                      <SelectItem value="excessive_cancellations">
                        {isRTL ? 'إلغاءات مفرطة' : 'Excessive Cancellations'}
                      </SelectItem>
                      <SelectItem value="documentation_overdue">
                        {isRTL ? 'توثيق متأخر' : 'Documentation Overdue'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'الأولوية' : 'Priority'}</Label>
                  <Select 
                    value={filters.priority} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الأولويات' : 'All Priorities'}</SelectItem>
                      <SelectItem value="critical">{isRTL ? 'حرج' : 'Critical'}</SelectItem>
                      <SelectItem value="high">{isRTL ? 'عالي' : 'High'}</SelectItem>
                      <SelectItem value="medium">{isRTL ? 'متوسط' : 'Medium'}</SelectItem>
                      <SelectItem value="low">{isRTL ? 'منخفض' : 'Low'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                      <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="acknowledged">{isRTL ? 'مُقر به' : 'Acknowledged'}</SelectItem>
                      <SelectItem value="escalated">{isRTL ? 'مُصعد' : 'Escalated'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts Table */}
          <div className="space-y-4">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <h3 className="text-lg font-semibold">
                {isRTL ? 'التنبيهات النشطة' : 'Active Alerts'}
                <span className="text-muted-foreground ml-2">
                  ({filteredAlerts.length})
                </span>
              </h3>
            </div>
            
            <AlertsTable
              alerts={filteredAlerts.filter(a => a.alert_status === 'active')}
              language={language}
              onAlertAction={handleAlertAction}
            />
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-6">
          <AlertsTable
            alerts={filteredAlerts.filter(a => a.alert_status === 'resolved')}
            language={language}
            onAlertAction={handleAlertAction}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isRTL ? 'تحليلات التنبيهات قيد التطوير' : 'Alert analytics coming soon'}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog({ open, action: '', alert: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRTL 
                ? actionDialog.action === 'acknowledge' ? 'الإقرار بالتنبيه'
                  : actionDialog.action === 'resolve' ? 'حل التنبيه'
                  : actionDialog.action === 'escalate' ? 'تصعيد التنبيه'
                  : 'عرض التنبيه'
                : actionDialog.action === 'acknowledge' ? 'Acknowledge Alert'
                  : actionDialog.action === 'resolve' ? 'Resolve Alert'
                  : actionDialog.action === 'escalate' ? 'Escalate Alert'
                  : 'View Alert'
              }
            </DialogTitle>
            <DialogDescription>
              {actionDialog.alert && (
                language === 'ar' ? actionDialog.alert.alert_message_ar : actionDialog.alert.alert_message_en
              )}
            </DialogDescription>
          </DialogHeader>
          
          {actionDialog.action !== 'view' && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, action: '', alert: null })}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={executeAction}
                disabled={acknowledgeAlertMutation.isPending || 
                         resolveAlertMutation.isPending || 
                         escalateAlertMutation.isPending}
              >
                {isRTL ? 'تأكيد' : 'Confirm'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ComplianceAlertDashboard