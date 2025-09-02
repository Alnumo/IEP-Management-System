/**
 * Service Hour Tracking Component
 * مكون تتبع ساعات الخدمة
 * 
 * @description Comprehensive service hour tracking dashboard with validation and compliance monitoring
 * لوحة تحكم شاملة لتتبع ساعات الخدمة مع التحقق ومراقبة الامتثال
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  User,
  MapPin,
  FileText,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Bell,
  Search,
  BarChart3,
  Activity
} from 'lucide-react'

import {
  useServiceSessions,
  useServiceTrackingStats,
  useServiceCompliance,
  useUpdateServiceHourSummary,
  useActiveServiceAlerts,
  useOverdueDocumentation,
  useSessionsRequiringMakeup
} from '@/hooks/useServiceHourTracking'
import {
  ServiceDeliverySession,
  ServiceSessionFilters,
  ComplianceStatus,
  SessionStatus,
  ServiceLocation,
  ServiceTrackingStats,
  AlertPriority
} from '@/types/service-tracking'

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

interface ServiceHourTrackingProps {
  serviceId?: string
  studentId?: string
  language: 'ar' | 'en'
  className?: string
}

interface SessionFiltersState {
  dateRange: { start: Date | undefined; end: Date | undefined }
  status: SessionStatus[]
  location: ServiceLocation[]
  providerId?: string
  searchQuery: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getComplianceStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'compliant':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'at_risk':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'non_compliant':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'needs_review':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getSessionStatusColor = (status: SessionStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'no_show':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'makeup_needed':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  className?: string
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  className
}) => (
  <Card className={cn("p-4", className)}>
    <CardContent className="p-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
              <span className={cn(
                trend > 0 && "text-green-600",
                trend < 0 && "text-red-600",
                trend === 0 && "text-muted-foreground"
              )}>
                {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
)

interface ComplianceOverviewProps {
  stats: ServiceTrackingStats
  language: 'ar' | 'en'
}

const ComplianceOverview: React.FC<ComplianceOverviewProps> = ({ stats, language }) => {
  const isRTL = language === 'ar'
  
  const complianceRate = stats.total_services > 0 
    ? Math.round((stats.compliant_services / stats.total_services) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={isRTL ? "إجمالي الخدمات" : "Total Services"}
          value={stats.total_services}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatsCard
          title={isRTL ? "خدمات نشطة" : "Active Services"}
          value={stats.active_services}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatsCard
          title={isRTL ? "تنبيهات نشطة" : "Active Alerts"}
          value={stats.active_alerts}
          icon={<Bell className="h-5 w-5" />}
          className={stats.active_alerts > 0 ? "border-orange-200 bg-orange-50" : ""}
        />
        <StatsCard
          title={isRTL ? "جلسات متأخرة" : "Overdue Sessions"}
          value={stats.overdue_sessions}
          icon={<Clock className="h-5 w-5" />}
          className={stats.overdue_sessions > 0 ? "border-red-200 bg-red-50" : ""}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <BarChart3 className="h-5 w-5" />
            {isRTL ? "نظرة عامة على الامتثال" : "Compliance Overview"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "معدل الامتثال الإجمالي" : "Overall Compliance Rate"}
                </span>
                <span className="font-semibold">{complianceRate}%</span>
              </div>
              <Progress value={complianceRate} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.compliant_services}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? "متوافقة" : "Compliant"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.at_risk_services}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? "معرضة للخطر" : "At Risk"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.non_compliant_services}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? "غير متوافقة" : "Non-Compliant"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface SessionsTableProps {
  sessions: ServiceDeliverySession[]
  language: 'ar' | 'en'
  onSessionClick?: (session: ServiceDeliverySession) => void
}

const SessionsTable: React.FC<SessionsTableProps> = ({ 
  sessions, 
  language, 
  onSessionClick 
}) => {
  const isRTL = language === 'ar'

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isRTL ? "لا توجد جلسات متاحة" : "No sessions available"}</p>
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
                {isRTL ? "التاريخ" : "Date"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "الوقت" : "Time"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "المدة" : "Duration"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "مقدم الخدمة" : "Provider"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "الموقع" : "Location"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "الحالة" : "Status"}
              </TableHead>
              <TableHead className={isRTL ? "text-right" : ""}>
                {isRTL ? "التوثيق" : "Documentation"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow
                key={session.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSessionClick?.(session)}
              >
                <TableCell className="font-medium">
                  {formatDate(session.session_date, language)}
                </TableCell>
                <TableCell>{session.session_time}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>
                      {isRTL ? "مخطط:" : "Planned:"} {formatDuration(session.planned_duration_minutes)}
                    </div>
                    {session.actual_duration_minutes && (
                      <div className="text-sm text-muted-foreground">
                        {isRTL ? "فعلي:" : "Actual:"} {formatDuration(session.actual_duration_minutes)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {session.provider_name || isRTL ? "غير محدد" : "Not specified"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {session.actual_location ? (
                      session.actual_location.replace(/_/g, ' ')
                    ) : (
                      isRTL ? "غير محدد" : "Not specified"
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getSessionStatusColor(session.session_status)}
                  >
                    {isRTL 
                      ? session.session_status === 'completed' ? 'مكتملة'
                        : session.session_status === 'scheduled' ? 'مجدولة'
                        : session.session_status === 'cancelled' ? 'ملغاة'
                        : session.session_status === 'no_show' ? 'لم يحضر'
                        : session.session_status === 'partial' ? 'جزئية'
                        : 'تحتاج تعويض'
                      : session.session_status.replace(/_/g, ' ')
                    }
                  </Badge>
                </TableCell>
                <TableCell>
                  {session.documentation_complete ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
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

export const ServiceHourTracking: React.FC<ServiceHourTrackingProps> = ({
  serviceId,
  studentId,
  language = 'ar',
  className
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [filters, setFilters] = useState<SessionFiltersState>({
    dateRange: { start: undefined, end: undefined },
    status: [],
    location: [],
    providerId: undefined,
    searchQuery: ''
  })
  const [selectedSession, setSelectedSession] = useState<ServiceDeliverySession | null>(null)

  // Build filters for API calls
  const sessionFilters = useMemo((): ServiceSessionFilters => {
    const apiFilters: ServiceSessionFilters = {}
    
    if (serviceId) apiFilters.service_id = serviceId
    if (studentId) apiFilters.student_id = studentId
    if (filters.status.length > 0) apiFilters.session_status = filters.status
    if (filters.location.length > 0) apiFilters.location = filters.location
    if (filters.providerId) apiFilters.provider_id = filters.providerId
    if (filters.dateRange.start && filters.dateRange.end) {
      apiFilters.date_range = {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      }
    }

    return apiFilters
  }, [serviceId, studentId, filters])

  // Data fetching hooks
  const { 
    data: sessions = [], 
    isLoading: sessionsLoading,
    refetch: refetchSessions
  } = useServiceSessions(sessionFilters)
  
  const { 
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useServiceTrackingStats()

  const { 
    data: overdueDocumentation = [],
    isLoading: overdueLoading
  } = useOverdueDocumentation()

  const { 
    data: makeupSessions = [],
    isLoading: makeupLoading
  } = useSessionsRequiringMakeup()

  // Mutations
  const updateSummaryMutation = useUpdateServiceHourSummary()

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!filters.searchQuery) return sessions
    
    const query = filters.searchQuery.toLowerCase()
    return sessions.filter(session => 
      session.provider_name?.toLowerCase().includes(query) ||
      session.services_delivered_ar?.toLowerCase().includes(query) ||
      session.services_delivered_en?.toLowerCase().includes(query) ||
      session.progress_notes_ar?.toLowerCase().includes(query) ||
      session.progress_notes_en?.toLowerCase().includes(query)
    )
  }, [sessions, filters.searchQuery])

  // Event handlers
  const handleRefreshData = async () => {
    await Promise.all([
      refetchSessions(),
      refetchStats()
    ])
  }

  const handleUpdateSummary = async () => {
    if (!serviceId || !studentId) return
    
    try {
      await updateSummaryMutation.mutateAsync({
        serviceId,
        studentId,
        periodType: 'weekly'
      })
    } catch (error) {
      console.error('Failed to update summary:', error)
    }
  }

  const handleSessionClick = (session: ServiceDeliverySession) => {
    setSelectedSession(session)
    // Could open a modal or navigate to session details
  }

  // Loading state
  if (statsLoading && sessionsLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? "جاري تحميل بيانات الخدمة..." : "Loading service data..."}
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
            {isRTL ? "تتبع ساعات الخدمة" : "Service Hour Tracking"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? "مراقبة وتتبع ساعات تقديم الخدمات العلاجية"
              : "Monitor and track therapy service delivery hours"
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
            onClick={handleRefreshData}
            disabled={sessionsLoading || statsLoading}
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              (sessionsLoading || statsLoading) && "animate-spin",
              isRTL ? "ml-2" : "mr-2"
            )} />
            {isRTL ? "تحديث" : "Refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateSummary}
            disabled={updateSummaryMutation.isPending || !serviceId || !studentId}
          >
            <BarChart3 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? "إعادة حساب" : "Recalculate"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {isRTL ? "نظرة عامة" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {isRTL ? "الجلسات" : "Sessions"}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            {isRTL ? "الامتثال" : "Compliance"}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {isRTL ? "التقارير" : "Reports"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && <ComplianceOverview stats={stats} language={language} />}
          
          {/* Quick Alerts */}
          {(overdueDocumentation.length > 0 || makeupSessions.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {isRTL ? "تنبيهات سريعة" : "Quick Alerts"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overdueDocumentation.length > 0 && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {isRTL ? "توثيق متأخر" : "Overdue Documentation"}
                    </AlertTitle>
                    <AlertDescription>
                      {isRTL 
                        ? `${overdueDocumentation.length} جلسة تحتاج إلى توثيق`
                        : `${overdueDocumentation.length} sessions need documentation`
                      }
                    </AlertDescription>
                  </Alert>
                )}
                
                {makeupSessions.length > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>
                      {isRTL ? "جلسات تعويضية مطلوبة" : "Makeup Sessions Required"}
                    </AlertTitle>
                    <AlertDescription>
                      {isRTL 
                        ? `${makeupSessions.length} جلسة تحتاج إلى تعويض`
                        : `${makeupSessions.length} sessions need makeup`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Filter className="h-5 w-5" />
                {isRTL ? "تصفية الجلسات" : "Filter Sessions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">
                    {isRTL ? "البحث" : "Search"}
                  </Label>
                  <div className="relative">
                    <Search className={cn(
                      "absolute top-3 h-4 w-4 text-muted-foreground",
                      isRTL ? "right-3" : "left-3"
                    )} />
                    <Input
                      id="search"
                      placeholder={isRTL ? "ابحث في الجلسات..." : "Search sessions..."}
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className={cn(isRTL ? "pr-9" : "pl-9")}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>{isRTL ? "حالة الجلسة" : "Session Status"}</Label>
                  <Select onValueChange={(value) => {
                    const status = value as SessionStatus
                    setFilters(prev => ({
                      ...prev,
                      status: prev.status.includes(status) 
                        ? prev.status.filter(s => s !== status)
                        : [...prev.status, status]
                    }))
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الحالة" : "Select Status"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">
                        {isRTL ? "مكتملة" : "Completed"}
                      </SelectItem>
                      <SelectItem value="scheduled">
                        {isRTL ? "مجدولة" : "Scheduled"}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {isRTL ? "ملغاة" : "Cancelled"}
                      </SelectItem>
                      <SelectItem value="no_show">
                        {isRTL ? "لم يحضر" : "No Show"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? "تاريخ البداية" : "Start Date"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange.start && "text-muted-foreground",
                          isRTL && "text-right"
                        )}
                      >
                        <CalendarIcon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {filters.dateRange.start ? (
                          formatDate(filters.dateRange.start.toISOString(), language)
                        ) : (
                          <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.start}
                        onSelect={(date) => setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: date }
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>{isRTL ? "تاريخ النهاية" : "End Date"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange.end && "text-muted-foreground",
                          isRTL && "text-right"
                        )}
                      >
                        <CalendarIcon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {filters.dateRange.end ? (
                          formatDate(filters.dateRange.end.toISOString(), language)
                        ) : (
                          <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.end}
                        onSelect={(date) => setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: date }
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Table */}
          <div className="space-y-4">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <h3 className="text-lg font-semibold">
                {isRTL ? "جلسات الخدمة" : "Service Sessions"}
                <span className="text-muted-foreground ml-2">
                  ({filteredSessions.length})
                </span>
              </h3>
              <Button size="sm">
                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? "جلسة جديدة" : "New Session"}
              </Button>
            </div>
            
            <SessionsTable
              sessions={filteredSessions}
              language={language}
              onSessionClick={handleSessionClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isRTL ? "تفاصيل الامتثال قيد التطوير" : "Compliance details coming soon"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="text-center py-8">
            <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isRTL ? "التقارير قيد التطوير" : "Reports coming soon"}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ServiceHourTracking