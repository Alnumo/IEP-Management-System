import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, CalendarIcon, Download, Filter, RefreshCw, Share, TrendingUp, TrendingDown, Target, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { analyticsService } from '@/services/analytics-service'
import type { AnalyticsDashboard, DashboardWidget, StudentProgressSummary } from '@/types/progress-analytics'

interface ComprehensiveDashboardProps {
  userType: 'admin' | 'therapist' | 'parent'
  userId: string
  className?: string
}

interface AnalyticsFilter {
  dateRange: {
    start: string
    end: string
  }
  students?: string[]
  therapyPrograms?: string[]
  therapists?: string[]
  metrics?: string[]
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#00ff00', '#0000ff']

export const ComprehensiveDashboard: React.FC<ComprehensiveDashboardProps> = ({
  userType,
  userId,
  className = ''
}) => {
  const { language, isRTL } = useLanguage()

  // State management
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null)
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [selectedView, setSelectedView] = useState<'overview' | 'students' | 'programs' | 'financial' | 'reports'>('overview')
  const [filters, setFilters] = useState<AnalyticsFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Analytics data state
  const [overviewMetrics, setOverviewMetrics] = useState<any>(null)
  const [studentProgressData, setStudentProgressData] = useState<StudentProgressSummary[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [alertsData, setAlertsData] = useState<any[]>([])
  const [financialData, setFinancialData] = useState<any>(null)

  useEffect(() => {
    loadDashboard()
  }, [userType])

  useEffect(() => {
    if (dashboard) {
      loadAnalyticsData()
    }
  }, [dashboard, filters])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      
      // Get or create default dashboard for user type
      const dashboards = await analyticsService.getDashboardsByUserType(userType)
      
      let currentDashboard = dashboards.find(d => d.name.includes('Default')) || dashboards[0]
      
      if (!currentDashboard) {
        // Create default dashboard
        const dashboardId = await analyticsService.createDashboard(createDefaultDashboard(userType))
        currentDashboard = await analyticsService.getDashboard(dashboardId)
      }
      
      setDashboard(currentDashboard!)
      setWidgets(currentDashboard!.widgets || [])
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true)

      // Load overview metrics
      const metrics = await loadOverviewMetrics()
      setOverviewMetrics(metrics)

      // Load student progress data
      if (selectedView === 'students') {
        const progressData = await loadStudentProgressData()
        setStudentProgressData(progressData)
      }

      // Load trend data
      const trends = await loadTrendData()
      setTrendData(trends)

      // Load alerts
      const alerts = await loadAlertsData()
      setAlertsData(alerts)

      // Load financial data
      if (selectedView === 'financial' && userType === 'admin') {
        const financial = await loadFinancialData()
        setFinancialData(financial)
      }

    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const loadOverviewMetrics = async () => {
    // Mock data - replace with actual API calls
    return {
      totalStudents: 156,
      activePrograms: 12,
      monthlyGrowth: 8.5,
      attendanceRate: 92.3,
      completionRate: 87.6,
      satisfactionScore: 4.7,
      trendsUp: 3,
      trendsDown: 1
    }
  }

  const loadStudentProgressData = async (): Promise<StudentProgressSummary[]> => {
    // Mock data - replace with actual API calls
    return []
  }

  const loadTrendData = async () => {
    // Mock trend data
    return [
      { month: 'Jan', students: 140, sessions: 1200, completion: 85 },
      { month: 'Feb', students: 148, sessions: 1350, completion: 88 },
      { month: 'Mar', students: 156, sessions: 1420, completion: 92 },
      { month: 'Apr', students: 162, sessions: 1480, completion: 89 },
      { month: 'May', students: 168, sessions: 1550, completion: 94 },
      { month: 'Jun', students: 174, sessions: 1620, completion: 91 }
    ]
  }

  const loadAlertsData = async () => {
    // Mock alerts data
    return [
      {
        id: '1',
        type: 'attendance',
        severity: 'high',
        title: language === 'ar' ? 'انخفاض في الحضور' : 'Attendance Drop',
        description: language === 'ar' ? 'انخفض معدل حضور الطالب أحمد بنسبة 20% هذا الأسبوع' : 'Ahmed\'s attendance dropped by 20% this week',
        student: 'Ahmed Mohammed',
        date: '2024-01-15'
      },
      {
        id: '2',
        type: 'progress',
        severity: 'medium',
        title: language === 'ar' ? 'تأخير في تحقيق الهدف' : 'Goal Achievement Delay',
        description: language === 'ar' ? 'الهدف المحدد للطالب سارة قد يتأخر بأسبوعين' : 'Sara\'s target goal may be delayed by 2 weeks',
        student: 'Sara Ali',
        date: '2024-01-14'
      },
      {
        id: '3',
        type: 'success',
        severity: 'low',
        title: language === 'ar' ? 'إنجاز متميز' : 'Outstanding Achievement',
        description: language === 'ar' ? 'حقق الطالب محمد تقدماً ملحوظاً في مهارات التواصل' : 'Mohammed achieved remarkable progress in communication skills',
        student: 'Mohammed Hassan',
        date: '2024-01-13'
      }
    ]
  }

  const loadFinancialData = async () => {
    // Mock financial data
    return {
      totalRevenue: 125000,
      monthlyGrowth: 12.5,
      outstandingPayments: 8500,
      collectionRate: 94.2,
      programRevenue: [
        { program: 'ABA Therapy', revenue: 65000, sessions: 520 },
        { program: 'Speech Therapy', revenue: 35000, sessions: 280 },
        { program: 'Occupational Therapy', revenue: 25000, sessions: 200 }
      ]
    }
  }

  const handleRefresh = () => {
    loadAnalyticsData()
  }

  const handleExport = () => {
    // Export functionality
    console.log('Exporting dashboard data...')
  }

  const handleFilterChange = (newFilters: Partial<AnalyticsFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const createDefaultDashboard = (userType: string): Omit<AnalyticsDashboard, 'id' | 'created_at' | 'updated_at'> => {
    return {
      name: `Default ${userType} Dashboard`,
      description: `Default analytics dashboard for ${userType} users`,
      user_type: userType as any,
      layout: 'grid',
      widgets: createDefaultWidgets(userType),
      filters: [],
      refresh_settings: {
        auto_refresh: true,
        refresh_interval_minutes: 15,
        last_refresh: new Date().toISOString()
      },
      sharing_permissions: []
    }
  }

  const createDefaultWidgets = (userType: string): DashboardWidget[] => {
    const commonWidgets = [
      {
        id: 'overview-metrics',
        title: language === 'ar' ? 'المقاييس العامة' : 'Overview Metrics',
        widget_type: 'metric' as const,
        position: { x: 0, y: 0, row: 1, column: 1 },
        size: { width: 12, height: 4 },
        data_config: {
          data_source: 'overview_metrics',
          metrics: ['total_students', 'active_programs', 'attendance_rate'],
          filters: [],
          aggregation: 'latest' as const
        },
        styling: {}
      }
    ]

    return commonWidgets
  }

  const renderMetricCard = (title: string, value: string | number, trend?: number, icon?: React.ReactNode) => (
    <Card className="bg-white dark:bg-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : trend < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewMetrics && (
          <>
            {renderMetricCard(
              language === 'ar' ? 'إجمالي الطلاب' : 'Total Students',
              overviewMetrics.totalStudents,
              overviewMetrics.monthlyGrowth,
              <Users className="w-6 h-6" />
            )}
            {renderMetricCard(
              language === 'ar' ? 'البرامج النشطة' : 'Active Programs',
              overviewMetrics.activePrograms,
              undefined,
              <Target className="w-6 h-6" />
            )}
            {renderMetricCard(
              language === 'ar' ? 'معدل الحضور' : 'Attendance Rate',
              `${overviewMetrics.attendanceRate}%`,
              2.3,
              <Clock className="w-6 h-6" />
            )}
            {renderMetricCard(
              language === 'ar' ? 'معدل الإنجاز' : 'Completion Rate',
              `${overviewMetrics.completionRate}%`,
              5.1,
              <CheckCircle className="w-6 h-6" />
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'اتجاهات التقدم' : 'Progress Trends'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'التقدم الشهري للطلاب والجلسات' : 'Monthly student and session progress'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name={language === 'ar' ? 'الطلاب' : 'Students'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completion" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name={language === 'ar' ? 'الإنجاز %' : 'Completion %'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'حجم الجلسات' : 'Session Volume'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'إجمالي الجلسات الشهرية' : 'Total monthly sessions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="sessions" 
                    fill="#8884d8"
                    name={language === 'ar' ? 'الجلسات' : 'Sessions'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
            <AlertTriangle className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'التنبيهات والإشعارات' : 'Alerts & Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertsData.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <Badge 
                      variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'}
                      className="mr-2"
                    >
                      {alert.severity}
                    </Badge>
                    <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {alert.title}
                    </h4>
                  </div>
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {alert.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.student} • {alert.date}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  {language === 'ar' ? 'عرض' : 'View'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStudentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'تقدم الطلاب' : 'Student Progress'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'متابعة مفصلة لتقدم كل طالب' : 'Detailed tracking of each student\'s progress'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-center py-8 text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'سيتم إضافة بيانات تقدم الطلاب هنا' : 'Student progress data will be displayed here'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderProgramsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'فعالية البرامج' : 'Program Effectiveness'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'تحليل أداء البرامج العلاجية المختلفة' : 'Analysis of different therapy program performance'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-center py-8 text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'سيتم إضافة تحليل البرامج هنا' : 'Program analysis will be displayed here'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderFinancialTab = () => (
    <div className="space-y-6">
      {financialData && (
        <>
          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderMetricCard(
              language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
              `$${financialData.totalRevenue.toLocaleString()}`,
              financialData.monthlyGrowth
            )}
            {renderMetricCard(
              language === 'ar' ? 'معدل التحصيل' : 'Collection Rate',
              `${financialData.collectionRate}%`,
              2.1
            )}
            {renderMetricCard(
              language === 'ar' ? 'المدفوعات المعلقة' : 'Outstanding Payments',
              `$${financialData.outstandingPayments.toLocaleString()}`,
              -5.3
            )}
            {renderMetricCard(
              language === 'ar' ? 'النمو الشهري' : 'Monthly Growth',
              `${financialData.monthlyGrowth}%`,
              undefined
            )}
          </div>

          {/* Program Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'إيرادات البرامج' : 'Program Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.programRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="program" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  const renderReportsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'إنشاء وإدارة التقارير' : 'Generate and manage reports'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex flex-col items-center justify-center">
                <Download className="w-6 h-6 mb-2" />
                {language === 'ar' ? 'تقرير شهري' : 'Monthly Report'}
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Download className="w-6 h-6 mb-2" />
                {language === 'ar' ? 'تقرير ربع سنوي' : 'Quarterly Report'}
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Download className="w-6 h-6 mb-2" />
                {language === 'ar' ? 'تقرير مخصص' : 'Custom Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 dark:text-white ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة التحليلات الشاملة' : 'Comprehensive Analytics Dashboard'}
          </h1>
          <p className={`text-gray-600 dark:text-gray-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تحليل شامل للبيانات والتقدم' : 'Comprehensive data analysis and progress tracking'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center"
          >
            <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Share className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'مشاركة' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الفترة الزمنية:' : 'Date Range:'}
              </span>
              <Select value="last_30_days">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">
                    {language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}
                  </SelectItem>
                  <SelectItem value="last_30_days">
                    {language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
                  </SelectItem>
                  <SelectItem value="last_90_days">
                    {language === 'ar' ? 'آخر 90 يوم' : 'Last 90 days'}
                  </SelectItem>
                  <SelectItem value="custom">
                    {language === 'ar' ? 'مخصص' : 'Custom'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm" className="flex items-center">
              <Filter className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'مرشحات إضافية' : 'More Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="students" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الطلاب' : 'Students'}
          </TabsTrigger>
          <TabsTrigger value="programs" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'البرامج' : 'Programs'}
          </TabsTrigger>
          {userType === 'admin' && (
            <TabsTrigger value="financial" className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'المالية' : 'Financial'}
            </TabsTrigger>
          )}
          <TabsTrigger value="reports" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          {renderStudentsTab()}
        </TabsContent>

        <TabsContent value="programs" className="space-y-6">
          {renderProgramsTab()}
        </TabsContent>

        {userType === 'admin' && (
          <TabsContent value="financial" className="space-y-6">
            {renderFinancialTab()}
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-6">
          {renderReportsTab()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ComprehensiveDashboard