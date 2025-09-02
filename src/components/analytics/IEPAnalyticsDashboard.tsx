/**
 * Comprehensive IEP Analytics Dashboard
 * Displays analytics for Individual Education Programs with bilingual support
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/contexts/LanguageContext'
import { analyticsService } from '@/services/analytics-service'
import { GoalProgressChart } from './GoalProgressChart'
import { AttendanceChart } from './AttendanceChart'
import { BehavioralTrendsChart } from './BehavioralTrendsChart'
import { ComplianceMetrics } from './ComplianceMetrics'
import { PredictiveInsights } from './PredictiveInsights'
import { ExportOptions } from './ExportOptions'
import type {
  IEPAnalytics,
  DashboardKPI,
  TrendAnalytics,
  ComplianceAnalytics,
  PerformanceAnalytics
} from '@/types/analytics'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Award,
  FileText,
  Download,
  Refresh,
  Filter,
  Eye
} from 'lucide-react'

interface IEPAnalyticsDashboardProps {
  studentId?: string
  programId?: string
  dateRange?: {
    start: string
    end: string
  }
  viewMode?: 'overview' | 'detailed' | 'comparative'
}

export const IEPAnalyticsDashboard: React.FC<IEPAnalyticsDashboardProps> = ({
  studentId,
  programId,
  dateRange = {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },
  viewMode = 'overview'
}) => {
  const { language, isRTL } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedFilters, setSelectedFilters] = useState({
    therapyType: 'all',
    goalCategory: 'all',
    timeframe: '3months'
  })
  const [activeTab, setActiveTab] = useState('overview')

  // Main analytics data query
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['iep-analytics', studentId, programId, dateRange, selectedFilters],
    queryFn: async () => {
      if (studentId) {
        return await analyticsService.getStudentProgressSummary(
          studentId,
          dateRange.start,
          dateRange.end
        )
      } else {
        // Get program or system-wide analytics
        return await analyticsService.getIEPAnalytics(
          programId ? { programIds: [programId] } : {},
          dateRange.start,
          dateRange.end
        )
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!studentId || !!programId
  })

  // KPI metrics query
  const { data: kpiMetrics } = useQuery({
    queryKey: ['dashboard-kpis', studentId, programId, dateRange],
    queryFn: async () => {
      return await analyticsService.getDashboardKPIs({
        studentId,
        programId,
        dateRange
      })
    },
    staleTime: 10 * 60 * 1000
  })

  // Trend analytics query
  const { data: trendData } = useQuery({
    queryKey: ['trend-analytics', studentId, programId, selectedFilters.timeframe],
    queryFn: async () => {
      return await analyticsService.getTrendAnalytics({
        studentId,
        programId,
        timeframe: selectedFilters.timeframe,
        metrics: ['progress', 'attendance', 'behavioral', 'skill_acquisition']
      })
    },
    staleTime: 15 * 60 * 1000
  })

  // Compliance analytics query
  const { data: complianceData } = useQuery({
    queryKey: ['compliance-analytics', studentId, programId, dateRange],
    queryFn: async () => {
      return await analyticsService.getComplianceAnalytics({
        studentId,
        programId,
        dateRange,
        includeAuditTrail: true
      })
    },
    staleTime: 30 * 60 * 1000
  })

  const handleFilterChange = (filterType: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const refreshData = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['iep-analytics', 'dashboard-kpis', 'trend-analytics', 'compliance-analytics'] 
    })
    refetch()
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={isRTL ? 'rtl' : 'ltr'} dir={isRTL ? 'rtl' : 'ltr'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' 
            ? 'حدث خطأ في تحميل بيانات التحليلات. يرجى المحاولة مرة أخرى.'
            : 'Error loading analytics data. Please try again.'
          }
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'ar' ? 'لوحة تحليلات البرامج التعليمية الفردية' : 'IEP Analytics Dashboard'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {language === 'ar' 
              ? `تحليل شامل لفترة من ${dateRange.start} إلى ${dateRange.end}`
              : `Comprehensive analysis for period from ${dateRange.start} to ${dateRange.end}`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportOptions 
            data={analytics}
            filename={`iep-analytics-${Date.now()}`}
            formats={['pdf', 'excel', 'csv']}
          />
          <Button variant="outline" size="sm" onClick={refreshData}>
            <Refresh className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === 'ar' ? 'فلاتر:' : 'Filters:'}
          </span>
        </div>
        
        <Select
          value={selectedFilters.therapyType}
          onValueChange={(value) => handleFilterChange('therapyType', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === 'ar' ? 'جميع العلاجات' : 'All Therapies'}
            </SelectItem>
            <SelectItem value="aba">ABA</SelectItem>
            <SelectItem value="speech">
              {language === 'ar' ? 'النطق واللغة' : 'Speech Therapy'}
            </SelectItem>
            <SelectItem value="occupational">
              {language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy'}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedFilters.timeframe}
          onValueChange={(value) => handleFilterChange('timeframe', value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">
              {language === 'ar' ? 'شهر' : '1 Month'}
            </SelectItem>
            <SelectItem value="3months">
              {language === 'ar' ? '3 أشهر' : '3 Months'}
            </SelectItem>
            <SelectItem value="6months">
              {language === 'ar' ? '6 أشهر' : '6 Months'}
            </SelectItem>
            <SelectItem value="1year">
              {language === 'ar' ? 'سنة' : '1 Year'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {kpiMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiMetrics.map((kpi: DashboardKPI) => (
            <Card key={kpi.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? kpi.title_ar : kpi.title_en}
                </CardTitle>
                <div className={`text-${kpi.color}-600 dark:text-${kpi.color}-400`}>
                  {kpi.icon && <div className="h-4 w-4" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpi.format === 'percentage' ? `${kpi.value}%` : 
                   kpi.format === 'currency' ? `${kpi.value} ر.س` :
                   kpi.value.toLocaleString()}
                </div>
                {kpi.change_percentage !== undefined && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <TrendingUp className={`h-3 w-3 mr-1 ${
                      kpi.trend_direction === 'up' ? 'text-green-600' : 
                      kpi.trend_direction === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`} />
                    <span className={
                      kpi.trend_direction === 'up' ? 'text-green-600' : 
                      kpi.trend_direction === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }>
                      {kpi.change_percentage > 0 ? '+' : ''}{kpi.change_percentage}%
                    </span>
                    <span className="ml-1">
                      {language === 'ar' ? 'من الفترة السابقة' : 'from previous period'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="progress">
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            {language === 'ar' ? 'الامتثال' : 'Compliance'}
          </TabsTrigger>
          <TabsTrigger value="predictions">
            {language === 'ar' ? 'التوقعات' : 'Predictions'}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goal Progress Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  {language === 'ar' ? 'ملخص تقدم الأهداف' : 'Goal Progress Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.goal_metrics && (
                  <GoalProgressChart
                    data={analytics.goal_metrics}
                    language={language}
                  />
                )}
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {language === 'ar' ? 'نظرة عامة على الحضور' : 'Attendance Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.session_attendance && (
                  <AttendanceChart
                    data={analytics.session_attendance}
                    language={language}
                  />
                )}
              </CardContent>
            </Card>

            {/* Behavioral Trends */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  {language === 'ar' ? 'اتجاهات السلوك' : 'Behavioral Trends'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.behavioral_trends && (
                  <BehavioralTrendsChart
                    data={analytics.behavioral_trends}
                    language={language}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Detailed Goal Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'تحليل الأهداف التفصيلي' : 'Detailed Goal Analysis'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'تحليل مفصل لتقدم كل هدف مع التوقعات'
                    : 'Detailed analysis of each goal progress with predictions'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.goal_metrics?.map((goal, index) => (
                  <div key={goal.goal_id} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{goal.goal_name}</h4>
                      <Badge variant={
                        goal.progress_percentage >= 80 ? 'success' :
                        goal.progress_percentage >= 60 ? 'warning' :
                        'destructive'
                      }>
                        {goal.progress_percentage}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress_percentage} className="mb-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {language === 'ar' ? 'الخط الأساسي:' : 'Baseline:'} {goal.baseline_value}
                      </span>
                      <span>
                        {language === 'ar' ? 'الحالي:' : 'Current:'} {goal.current_value}
                      </span>
                      <span>
                        {language === 'ar' ? 'الهدف:' : 'Target:'} {goal.target_value}
                      </span>
                    </div>
                    {goal.projected_completion_date && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {language === 'ar' ? 'التاريخ المتوقع للإنجاز:' : 'Projected completion:'} {goal.projected_completion_date}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skill Acquisition Trends */}
            {trendData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'اتجاهات اكتساب المهارات' : 'Skill Acquisition Trends'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData.skill_acquisition || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="skill_count"
                          stroke="#8884d8"
                          strokeWidth={2}
                          name={language === 'ar' ? 'عدد المهارات المكتسبة' : 'Skills Acquired'}
                        />
                        <Line
                          type="monotone"
                          dataKey="mastery_rate"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          name={language === 'ar' ? 'معدل الإتقان' : 'Mastery Rate'}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {complianceData && (
            <ComplianceMetrics
              data={complianceData}
              language={language}
            />
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <PredictiveInsights
            studentId={studentId}
            analytics={analytics}
            language={language}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {language === 'ar' ? 'تقارير شاملة' : 'Comprehensive Reports'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'إنشاء وتخصيص التقارير التحليلية'
                  : 'Generate and customize analytical reports'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Award className="h-6 w-6 mb-2" />
                    <span className="text-sm">
                      {language === 'ar' ? 'تقرير التقدم الأسبوعي' : 'Weekly Progress Report'}
                    </span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm">
                      {language === 'ar' ? 'تقرير الفريق الشهري' : 'Monthly Team Report'}
                    </span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <CheckCircle className="h-6 w-6 mb-2" />
                    <span className="text-sm">
                      {language === 'ar' ? 'تقرير الامتثال ربع السنوي' : 'Quarterly Compliance Report'}
                    </span>
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">
                    {language === 'ar' ? 'تقارير مخصصة' : 'Custom Reports'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'ar' 
                      ? 'إنشاء تقارير مخصصة بناءً على معايير محددة'
                      : 'Create custom reports based on specific criteria'
                    }
                  </p>
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إنشاء تقرير مخصص' : 'Create Custom Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IEPAnalyticsDashboard