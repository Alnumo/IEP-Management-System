import React, { useState, useMemo } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
  Search,
  RefreshCw,
  Bell,
  AlertCircle,
  Activity,
  Target,
  BookOpen,
  Settings
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { useIEPs } from '@/hooks/useIEPs'
import { useIEPCompliance } from '@/hooks/useIEPCompliance'
import { useIEPExport } from '@/utils/pdf-export'
import { toast } from 'sonner'

interface DashboardFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  customStartDate?: string
  customEndDate?: string
  studentId?: string
  complianceStatus?: 'all' | 'compliant' | 'non_compliant' | 'at_risk'
  progressStatus?: 'all' | 'on_track' | 'behind' | 'ahead'
}

interface MetricCard {
  title: string
  titleAr: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'stable'
  status?: 'good' | 'warning' | 'danger'
  icon: React.ElementType
  description?: string
}

const METRIC_COLORS = {
  primary: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280'
}

// Chart color palette for future use
// const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export const IEPDashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'month',
    complianceStatus: 'all',
    progressStatus: 'all'
  })
  const [isArabic, setIsArabic] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Data hooks
  const { data: ieps, refetch: refetchIEPs } = useIEPs()
  const { 
    complianceMetrics, 
    complianceDeadlines, 
    notifications,
    dismissNotification,
    refetchAlerts 
  } = useIEPCompliance()
  // Export functionality available via useIEPExport hook

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date()
    switch (filters.dateRange) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'quarter':
        return { start: startOfMonth(subDays(now, 90)), end: now }
      case 'year':
        return { start: startOfMonth(subDays(now, 365)), end: now }
      case 'custom':
        return {
          start: filters.customStartDate ? new Date(filters.customStartDate) : startOfMonth(now),
          end: filters.customEndDate ? new Date(filters.customEndDate) : now
        }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate])

  // Filter and process IEP data
  const filteredIEPs = useMemo(() => {
    if (!ieps) return []

    return ieps.filter(iep => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const studentName = `${iep.student?.first_name} ${iep.student?.last_name}`.toLowerCase()
        const studentId = iep.student?.student_id?.toLowerCase() || ''
        
        if (!studentName.includes(searchLower) && !studentId.includes(searchLower)) {
          return false
        }
      }

      // Student filter
      if (filters.studentId && iep.student_id !== filters.studentId) {
        return false
      }

      // Date range filter
      const iepDate = new Date(iep.created_at || iep.start_date)
      if (iepDate < dateRange.start || iepDate > dateRange.end) {
        return false
      }

      return true
    })
  }, [ieps, searchTerm, filters.studentId, dateRange])

  // Calculate dashboard metrics
  const metrics = useMemo((): MetricCard[] => {
    const totalIEPs = filteredIEPs.length
    const activeIEPs = filteredIEPs.filter(iep => iep.status === 'active').length
    const draftIEPs = filteredIEPs.filter(iep => iep.status === 'draft').length
    
    // Compliance metrics
    const complianceRate = complianceMetrics?.compliance_rate || 0
    const overdueReviews = complianceMetrics?.overdue_reviews || 0
    const upcomingDeadlines = complianceMetrics?.upcoming_deadlines || 0
    const criticalAlerts = complianceMetrics?.critical_alerts || 0

    // Trend calculation function for future use
    // const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    //   if (current > previous) return 'up'
    //   if (current < previous) return 'down'
    //   return 'stable'
    // }

    return [
      {
        title: 'Total IEPs',
        titleAr: 'إجمالي البرامج التعليمية',
        value: totalIEPs,
        change: 5.2,
        trend: 'up',
        status: 'good',
        icon: FileText,
        description: `${activeIEPs} active, ${draftIEPs} draft`
      },
      {
        title: 'Compliance Rate',
        titleAr: 'معدل الامتثال',
        value: `${complianceRate}%`,
        change: complianceMetrics?.trend_direction === 'improving' ? 3.1 : 
                complianceMetrics?.trend_direction === 'declining' ? -2.3 : 0,
        trend: complianceMetrics?.trend_direction === 'improving' ? 'up' : 
               complianceMetrics?.trend_direction === 'declining' ? 'down' : 'stable',
        status: complianceRate >= 90 ? 'good' : complianceRate >= 75 ? 'warning' : 'danger',
        icon: CheckCircle,
        description: `${complianceMetrics?.compliant_ieps || 0} compliant IEPs`
      },
      {
        title: 'Overdue Reviews',
        titleAr: 'المراجعات المتأخرة',
        value: overdueReviews,
        change: -1.8,
        trend: 'down',
        status: overdueReviews === 0 ? 'good' : overdueReviews <= 3 ? 'warning' : 'danger',
        icon: AlertTriangle,
        description: 'Require immediate attention'
      },
      {
        title: 'Upcoming Deadlines',
        titleAr: 'المواعيد النهائية القادمة',
        value: upcomingDeadlines,
        trend: 'stable',
        status: upcomingDeadlines <= 5 ? 'good' : upcomingDeadlines <= 10 ? 'warning' : 'danger',
        icon: Clock,
        description: 'Next 30 days'
      },
      {
        title: 'Critical Alerts',
        titleAr: 'التنبيهات الحرجة',
        value: criticalAlerts,
        change: criticalAlerts > 0 ? 15.2 : 0,
        trend: criticalAlerts > 0 ? 'up' : 'stable',
        status: criticalAlerts === 0 ? 'good' : 'danger',
        icon: AlertCircle,
        description: 'Require immediate action'
      },
      {
        title: 'Active Students',
        titleAr: 'الطلاب النشطون',
        value: activeIEPs,
        change: 2.4,
        trend: 'up',
        status: 'good',
        icon: Users,
        description: 'With active IEPs'
      }
    ]
  }, [filteredIEPs, complianceMetrics])

  // Progress data for charts
  const progressChartData = useMemo(() => {
    // Mock progress data - in real implementation, this would come from progress tracking
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      return {
        date: format(date, 'MM/dd'),
        progress: Math.floor(Math.random() * 20) + 70,
        compliance: Math.floor(Math.random() * 15) + 80,
        goals: Math.floor(Math.random() * 10) + 85
      }
    }).reverse()

    return last30Days
  }, [])

  // Goal status distribution
  const goalStatusData = useMemo(() => {
    // Mock goal status data
    return [
      { name: 'Mastered', nameAr: 'مُتقن', value: 35, color: METRIC_COLORS.success },
      { name: 'Progressing', nameAr: 'يتقدم', value: 45, color: METRIC_COLORS.primary },
      { name: 'Introduced', nameAr: 'تم التعريف', value: 15, color: METRIC_COLORS.warning },
      { name: 'Not Started', nameAr: 'لم يبدأ', value: 5, color: METRIC_COLORS.gray }
    ]
  }, [])

  // Compliance deadline distribution
  const deadlineData = useMemo(() => {
    if (!complianceDeadlines) return []

    const deadlineTypes = complianceDeadlines.reduce((acc, deadline) => {
      const type = deadline.deadline_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(deadlineTypes).map(([type, count]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      overdue: complianceDeadlines.filter(d => d.deadline_type === type && d.status === 'overdue').length
    }))
  }, [complianceDeadlines])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchIEPs(),
        refetchAlerts()
      ])
      toast.success('Dashboard refreshed successfully')
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExportDashboard = async () => {
    try {
      // Mock export - in real implementation, generate comprehensive dashboard report
      toast.info('Dashboard export feature coming soon')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export dashboard')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'danger': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isArabic ? 'لوحة تحكم البرامج التعليمية الفردية' : 'IEP Management Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isArabic ? 
                'نظرة شاملة على البرامج والامتثال والتقدم' : 
                'Comprehensive overview of programs, compliance, and progress'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArabic(!isArabic)}
            >
              {isArabic ? 'EN' : 'عر'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDashboard}
            >
              <Download className="w-4 h-4 mr-2" />
              {isArabic ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {isArabic ? 'الفلاتر والبحث' : 'Filters & Search'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={isArabic ? 'البحث عن طالب...' : 'Search students...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.dateRange} onValueChange={(value: any) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? 'نطاق التاريخ' : 'Date Range'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{isArabic ? 'هذا الأسبوع' : 'This Week'}</SelectItem>
                  <SelectItem value="month">{isArabic ? 'هذا الشهر' : 'This Month'}</SelectItem>
                  <SelectItem value="quarter">{isArabic ? 'هذا الربع' : 'This Quarter'}</SelectItem>
                  <SelectItem value="year">{isArabic ? 'هذا العام' : 'This Year'}</SelectItem>
                  <SelectItem value="custom">{isArabic ? 'مخصص' : 'Custom'}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.complianceStatus} onValueChange={(value: any) => setFilters(prev => ({ ...prev, complianceStatus: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? 'حالة الامتثال' : 'Compliance Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="compliant">{isArabic ? 'متوافق' : 'Compliant'}</SelectItem>
                  <SelectItem value="non_compliant">{isArabic ? 'غير متوافق' : 'Non-Compliant'}</SelectItem>
                  <SelectItem value="at_risk">{isArabic ? 'في خطر' : 'At Risk'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.progressStatus} onValueChange={(value: any) => setFilters(prev => ({ ...prev, progressStatus: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? 'حالة التقدم' : 'Progress Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="on_track">{isArabic ? 'على المسار الصحيح' : 'On Track'}</SelectItem>
                  <SelectItem value="behind">{isArabic ? 'متأخر' : 'Behind'}</SelectItem>
                  <SelectItem value="ahead">{isArabic ? 'متقدم' : 'Ahead'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        {notifications && notifications.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Bell className="w-5 h-5" />
                {isArabic ? 'التنبيهات والإشعارات' : 'Alerts & Notifications'}
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between p-3 rounded-lg border ${
                      notification.severity === 'critical' ? 'border-red-200 bg-red-50' :
                      notification.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle 
                        className={`w-5 h-5 mt-0.5 ${
                          notification.severity === 'critical' ? 'text-red-600' :
                          notification.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} 
                      />
                      <div>
                        <p className="font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        {notification.actions_required && notification.actions_required.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">
                              {isArabic ? 'الإجراءات المطلوبة:' : 'Actions Required:'}
                            </p>
                            <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                              {notification.actions_required.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        metric.status === 'good' ? 'bg-green-100' :
                        metric.status === 'warning' ? 'bg-yellow-100' :
                        metric.status === 'danger' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${getStatusColor(metric.status || 'good')}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {isArabic ? metric.titleAr : metric.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      </div>
                    </div>
                    {metric.change !== undefined && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(metric.trend || 'stable')}
                        <span className={`text-sm font-medium ${
                          metric.trend === 'up' ? 'text-green-600' :
                          metric.trend === 'down' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {Math.abs(metric.change)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {metric.description && (
                    <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts and Analytics */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="progress">{isArabic ? 'التقدم' : 'Progress'}</TabsTrigger>
            <TabsTrigger value="compliance">{isArabic ? 'الامتثال' : 'Compliance'}</TabsTrigger>
            <TabsTrigger value="goals">{isArabic ? 'الأهداف' : 'Goals'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    {isArabic ? 'اتجاه التقدم العام' : 'Overall Progress Trend'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={progressChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="progress" stroke={METRIC_COLORS.primary} fill={METRIC_COLORS.primary} fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {isArabic ? 'توزيع حالة الأهداف' : 'Goal Status Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={goalStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {goalStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {isArabic ? 'التقدم والامتثال بمرور الوقت' : 'Progress & Compliance Over Time'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={progressChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="progress" stroke={METRIC_COLORS.primary} name={isArabic ? 'التقدم' : 'Progress'} />
                    <Line type="monotone" dataKey="compliance" stroke={METRIC_COLORS.success} name={isArabic ? 'الامتثال' : 'Compliance'} />
                    <Line type="monotone" dataKey="goals" stroke={METRIC_COLORS.warning} name={isArabic ? 'الأهداف' : 'Goals'} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {isArabic ? 'المواعيد النهائية حسب النوع' : 'Deadlines by Type'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deadlineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={METRIC_COLORS.primary} name={isArabic ? 'المجموع' : 'Total'} />
                      <Bar dataKey="overdue" fill={METRIC_COLORS.danger} name={isArabic ? 'متأخر' : 'Overdue'} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {isArabic ? 'معدل الامتثال الشهري' : 'Monthly Compliance Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {isArabic ? 'الامتثال الحالي' : 'Current Compliance'}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {complianceMetrics?.compliance_rate || 0}%
                      </span>
                    </div>
                    <Progress value={complianceMetrics?.compliance_rate || 0} className="h-3" />
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">
                          {isArabic ? 'متوافق' : 'Compliant'}
                        </p>
                        <p className="text-xl font-bold text-green-700">
                          {complianceMetrics?.compliant_ieps || 0}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">
                          {isArabic ? 'متأخر' : 'Overdue'}
                        </p>
                        <p className="text-xl font-bold text-red-700">
                          {complianceMetrics?.overdue_reviews || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    {isArabic ? 'إنجاز الأهداف' : 'Goal Achievement'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={goalStatusData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey={isArabic ? 'nameAr' : 'name'} type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill={METRIC_COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {isArabic ? 'إحصائيات الأهداف' : 'Goal Statistics'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {goalStatusData.map((status, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="font-medium">
                            {isArabic ? status.nameAr : status.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{status.value}%</span>
                          <Progress value={status.value} className="w-20 h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default IEPDashboard