/**
 * Financial Analytics Dashboard Component
 * Comprehensive financial analytics and business intelligence dashboard
 * Part of Story 2.3: Financial Management Module - Task 4
 */

import React, { useState, useMemo } from 'react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import {
  useFinancialDashboard,
  useRevenueAnalytics,
  usePaymentAnalytics,
  useFinancialForecasting,
  usePeriodComparison,
  useQuickRangeAnalytics,
  useExportAnalytics
} from '../../hooks/useFinancialAnalytics'
import type { FinancialKPI } from '../../types/financial-management'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { DateRangePicker } from '../ui/date-range-picker'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription } from '../ui/alert'

// Chart Components
import {
  AreaChart,
  Area,
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
  ResponsiveContainer,
  RechartsWrapper
} from 'recharts'

// Icons
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'

// ==============================================
// TYPES AND INTERFACES
// ==============================================

interface DateRange {
  start: string
  end: string
}

type QuickRangeType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

interface FinancialAnalyticsDashboardProps {
  /** Language preference */
  language?: 'ar' | 'en'
  /** Default date range */
  defaultDateRange?: DateRange
  /** Dashboard layout mode */
  layout?: 'grid' | 'list'
  /** Real-time updates enabled */
  liveUpdates?: boolean
  /** Refresh interval in milliseconds */
  refreshInterval?: number
}

// ==============================================
// MAIN COMPONENT
// ==============================================

export const FinancialAnalyticsDashboard: React.FC<FinancialAnalyticsDashboardProps> = ({
  language = 'en',
  defaultDateRange,
  layout = 'grid',
  liveUpdates = false,
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'payments' | 'forecasting'>('overview')
  const [dateRange, setDateRange] = useState<DateRange>(
    defaultDateRange || {
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    }
  )
  const [quickRange, setQuickRange] = useState<QuickRangeType>('month')
  const [selectedKPI, setSelectedKPI] = useState<string>('')

  // Queries
  const { data: dashboardData, isLoading, error, refetch } = useFinancialDashboard(dateRange)
  const { data: revenueData, isLoading: revenueLoading } = useRevenueAnalytics(dateRange)
  const { data: paymentData, isLoading: paymentLoading } = usePaymentAnalytics(dateRange)
  const { data: forecastingData, isLoading: forecastingLoading } = useFinancialForecasting(6, 'both')
  
  // Period comparison
  const periodComparison = usePeriodComparison(dateRange, 'previous_period')
  
  // Quick range analytics
  const quickRangeData = useQuickRangeAnalytics()
  
  // Export functionality
  const exportAnalytics = useExportAnalytics()

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleQuickRangeChange = (range: QuickRangeType) => {
    setQuickRange(range)
    const today = new Date()
    
    let newRange: DateRange
    switch (range) {
      case 'today':
        newRange = {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        }
        break
      case 'week':
        newRange = {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        }
        break
      case 'month':
        newRange = {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        }
        break
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
        newRange = {
          start: format(quarterStart, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        }
        break
      case 'year':
        newRange = {
          start: format(startOfYear(today), 'yyyy-MM-dd'),
          end: format(endOfYear(today), 'yyyy-MM-dd')
        }
        break
      default:
        return // Don't change for custom range
    }
    
    setDateRange(newRange)
  }

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      const result = await exportAnalytics.mutateAsync({
        dateRange,
        format,
        includeForecasting: true
      })

      // Create and trigger download
      const blob = new Blob([result.data], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // ==============================================
  // UI HELPERS
  // ==============================================

  const formatCurrency = (amount: number, currency = 'SAR') => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value / 100)
  }

  const getChangeIcon = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getChangeColor = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // ==============================================
  // RENDER HELPERS
  // ==============================================

  const renderKPICard = (kpi: FinancialKPI, icon: React.ReactNode) => (
    <Card key={kpi.metric} className="cursor-pointer transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm font-medium text-gray-600">
                {language === 'ar' ? kpi.metric : kpi.metric}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {kpi.currency ? formatCurrency(kpi.value, kpi.currency) : kpi.value.toLocaleString()}
              </p>
              {kpi.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(kpi.changeType)}`}>
                  {getChangeIcon(kpi.changeType)}
                  <span>{Math.abs(kpi.change)}%</span>
                  <span className="text-gray-500">vs {language === 'ar' ? 'الفترة السابقة' : 'previous period'}</span>
                </div>
              )}
            </div>
          </div>
          {kpi.trend && (
            <div className="w-16 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.trend.map((value, index) => ({ value, index }))}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={kpi.changeType === 'increase' ? '#22c55e' : kpi.changeType === 'decrease' ? '#ef4444' : '#6b7280'} 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderOverviewTab = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {language === 'ar' 
              ? 'فشل في تحميل البيانات المالية. يرجى المحاولة مرة أخرى.'
              : 'Failed to load financial data. Please try again.'}
          </AlertDescription>
        </Alert>
      )
    }

    const kpis = dashboardData?.kpis || []
    const revenue = dashboardData?.revenue
    const payments = dashboardData?.payments

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.slice(0, 4).map((kpi, index) => {
            const icons = [
              <DollarSign className="w-5 h-5 text-blue-600" />,
              <TrendingUp className="w-5 h-5 text-green-600" />,
              <CreditCard className="w-5 h-5 text-purple-600" />,
              <Users className="w-5 h-5 text-orange-600" />
            ]
            return renderKPICard(kpi, icons[index])
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {language === 'ar' ? 'اتجاه الإيرادات' : 'Revenue Trend'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue?.monthlyRevenue || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'الإيرادات' : 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                {language === 'ar' ? 'توزيع طرق الدفع' : 'Payment Methods'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payments?.paymentMethodBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }: any) => `${method} (${percentage?.toFixed(1) || 0}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {payments?.paymentMethodBreakdown?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'المبلغ' : 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional KPIs */}
        {kpis.length > 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.slice(4).map((kpi, index) => {
              const additionalIcons = [
                <Target className="w-5 h-5 text-indigo-600" />,
                <Clock className="w-5 h-5 text-pink-600" />,
                <CheckCircle className="w-5 h-5 text-teal-600" />
              ]
              return renderKPICard(kpi, additionalIcons[index % additionalIcons.length])
            })}
          </div>
        )}
      </div>
    )
  }

  const renderRevenueTab = () => {
    if (revenueLoading) {
      return <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    }

    return (
      <div className="space-y-6">
        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(revenueData?.totalRevenue.value || 0)}
              </div>
              <div className={`flex items-center gap-1 text-sm mt-2 ${getChangeColor(revenueData?.totalRevenue.changeType)}`}>
                {getChangeIcon(revenueData?.totalRevenue.changeType)}
                <span>{Math.abs(revenueData?.totalRevenue.change || 0)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'الإيرادات المتكررة' : 'Recurring Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(revenueData?.recurringRevenue.value || 0)}
              </div>
              <div className={`flex items-center gap-1 text-sm mt-2 ${getChangeColor(revenueData?.recurringRevenue.changeType)}`}>
                {getChangeIcon(revenueData?.recurringRevenue.changeType)}
                <span>{Math.abs(revenueData?.recurringRevenue.change || 0)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'الإيرادات لمرة واحدة' : 'One-time Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(revenueData?.oneTimeRevenue.value || 0)}
              </div>
              <div className={`flex items-center gap-1 text-sm mt-2 ${getChangeColor(revenueData?.oneTimeRevenue.changeType)}`}>
                {getChangeIcon(revenueData?.oneTimeRevenue.changeType)}
                <span>{Math.abs(revenueData?.oneTimeRevenue.change || 0)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Service Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'الإيرادات حسب الخدمة' : 'Revenue by Service Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData?.revenueByService || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="serviceType" angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'الإيرادات' : 'Revenue']} />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'الإيرادات اليومية' : 'Daily Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData?.dailyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'الإيرادات' : 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPaymentsTab = () => {
    if (paymentLoading) {
      return <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    }

    return (
      <div className="space-y-6">
        {/* Payment KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(paymentData?.collectionRate.value || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ar' ? 'معدل التحصيل' : 'Collection Rate'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(paymentData?.averagePaymentTime.value || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ar' ? 'متوسط وقت الدفع (أيام)' : 'Avg Payment Time (days)'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(paymentData?.overdueAmount.value || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ar' ? 'المبلغ المتأخر' : 'Overdue Amount'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(paymentData?.outstandingBalance.value || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'ar' ? 'الرصيد المستحق' : 'Outstanding Balance'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aging Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'تحليل أعمار المستحقات' : 'Aging Analysis'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentData?.agingAnalysis?.map((aging) => (
                <div key={aging.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium min-w-[60px]">{aging.category}</span>
                    <Progress value={aging.percentage} className="flex-1 max-w-[200px]" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(aging.amount)}</div>
                    <div className="text-xs text-gray-500">{aging.invoiceCount} invoices</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Trends */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'اتجاهات الدفع' : 'Payment Trends'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paymentData?.paymentTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="onTimePayments" stroke="#10b981" name={language === 'ar' ? 'دفعات في الوقت المحدد' : 'On-time Payments'} />
                  <Line type="monotone" dataKey="latePayments" stroke="#ef4444" name={language === 'ar' ? 'دفعات متأخرة' : 'Late Payments'} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderForecastingTab = () => {
    if (forecastingLoading) {
      return <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    }

    return (
      <div className="space-y-6">
        {/* Revenue Forecast Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'توقعات الإيرادات' : 'Revenue Forecast'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastingData?.revenueProjection || []}>
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'الإيرادات المتوقعة' : 'Projected Revenue']} />
                  <Area type="monotone" dataKey="projectedRevenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorForecast)" />
                  <Area type="monotone" dataKey="confidenceInterval.low" stroke="#94a3b8" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="confidenceInterval.high" stroke="#94a3b8" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'توقعات التدفق النقدي' : 'Cash Flow Forecast'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastingData?.cashFlowProjection || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                  <Bar dataKey="inflow" fill="#10b981" name={language === 'ar' ? 'التدفق الداخل' : 'Inflow'} />
                  <Bar dataKey="outflow" fill="#ef4444" name={language === 'ar' ? 'التدفق الخارج' : 'Outflow'} />
                  <Bar dataKey="netCashFlow" fill="#6366f1" name={language === 'ar' ? 'صافي التدفق' : 'Net Cash Flow'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forecastingData?.scenarios?.map((scenario) => (
            <Card key={scenario.name}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'ar' ? scenario.nameAr : scenario.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'الإيرادات المتوقعة' : 'Projected Revenue'}
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(scenario.projectedImpact.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'الربح المتوقع' : 'Projected Profit'}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(scenario.projectedImpact.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 'التدفق النقدي' : 'Cash Flow'}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(scenario.projectedImpact.cashFlow)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ==============================================
  // MAIN RENDER
  // ==============================================

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'لوحة التحليلات المالية' : 'Financial Analytics Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' 
              ? 'رؤى مالية شاملة وتحليل الأعمال'
              : 'Comprehensive financial insights and business intelligence'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Range Selector */}
          <Select value={quickRange} onValueChange={handleQuickRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{language === 'ar' ? 'اليوم' : 'Today'}</SelectItem>
              <SelectItem value="week">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</SelectItem>
              <SelectItem value="month">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</SelectItem>
              <SelectItem value="quarter">{language === 'ar' ? 'هذا الربع' : 'This Quarter'}</SelectItem>
              <SelectItem value="year">{language === 'ar' ? 'هذا العام' : 'This Year'}</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Export Button */}
          <Select onValueChange={(value) => handleExport(value as any)}>
            <SelectTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="revenue">
            {language === 'ar' ? 'الإيرادات' : 'Revenue'}
          </TabsTrigger>
          <TabsTrigger value="payments">
            {language === 'ar' ? 'المدفوعات' : 'Payments'}
          </TabsTrigger>
          <TabsTrigger value="forecasting">
            {language === 'ar' ? 'التوقعات' : 'Forecasting'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          {renderRevenueTab()}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          {renderPaymentsTab()}
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          {renderForecastingTab()}
        </TabsContent>
      </Tabs>

      {/* Last Updated Footer */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        {language === 'ar' 
          ? `آخر تحديث: ${dashboardData?.lastUpdated ? format(new Date(dashboardData.lastUpdated), 'PPpp') : 'غير محدد'}`
          : `Last updated: ${dashboardData?.lastUpdated ? format(new Date(dashboardData.lastUpdated), 'PPpp') : 'Unknown'}`}
      </div>
    </div>
  )
}

export default FinancialAnalyticsDashboard