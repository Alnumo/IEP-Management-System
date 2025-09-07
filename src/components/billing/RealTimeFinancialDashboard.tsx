// Real-Time Financial Dashboard Component
// Comprehensive financial reporting with live updates
// Story 1.5 - Task 4: Financial Reporting Engine

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useLanguage } from '../../contexts/LanguageContext';
import { realTimeFinancialAnalytics } from '../../services/real-time-financial-analytics';
import { financialReportingService } from '../../services/financial-reporting-service';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Shield,
  TrendingUpDown,
  Banknote
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface DashboardData {
  snapshot: {
    timestamp: string;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashFlow: number;
    accountsReceivable: number;
    accountsPayable: number;
  };
  revenueMetrics: Array<{
    period: string;
    revenue: number;
    growth: number;
    projectedRevenue: number;
    variance: number;
  }>;
  serviceRevenue: Array<{
    serviceType: string;
    revenue: number;
    sessionCount: number;
    averageRate: number;
    utilizationRate: number;
  }>;
  paymentAnalytics: {
    totalCollected: number;
    pendingPayments: number;
    overduePayments: number;
    averageCollectionTime: number;
    paymentMethodBreakdown: Record<string, number>;
  };
  insuranceAnalytics: {
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    pendingClaims: number;
    totalClaimValue: number;
    approvalRate: number;
    averageProcessingTime: number;
  };
  trends: {
    dailyRevenue: Array<{ date: string; amount: number }>;
    weeklyGrowth: number;
    monthlyGrowth: number;
    yearlyGrowth: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

const RealTimeFinancialDashboard: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  const translations = {
    ar: {
      title: 'لوحة المعلومات المالية الفورية',
      subtitle: 'مراقبة الأداء المالي في الوقت الفعلي',
      overview: 'نظرة عامة',
      revenue: 'الإيرادات',
      payments: 'المدفوعات',
      insurance: 'التأمين',
      analytics: 'التحليلات',
      totalRevenue: 'إجمالي الإيرادات',
      netIncome: 'صافي الدخل',
      cashFlow: 'التدفق النقدي',
      accountsReceivable: 'الذمم المدينة',
      growth: 'النمو',
      today: 'اليوم',
      thisWeek: 'هذا الأسبوع',
      thisMonth: 'هذا الشهر',
      thisQuarter: 'هذا الربع',
      thisYear: 'هذه السنة',
      collected: 'تم التحصيل',
      pending: 'معلق',
      overdue: 'متأخر',
      claims: 'المطالبات',
      approved: 'موافق عليها',
      rejected: 'مرفوضة',
      approvalRate: 'معدل الموافقة',
      exportReport: 'تصدير التقرير',
      autoRefresh: 'تحديث تلقائي',
      lastUpdated: 'آخر تحديث',
      alerts: 'التنبيهات',
      noData: 'لا توجد بيانات متاحة',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      retry: 'إعادة المحاولة',
      serviceRevenue: 'إيرادات الخدمات',
      utilizationRate: 'معدل الاستخدام',
      averageRate: 'متوسط السعر',
      sessions: 'جلسات',
      paymentMethods: 'طرق الدفع',
      cash: 'نقد',
      card: 'بطاقة',
      bankTransfer: 'تحويل بنكي',
      insurance: 'تأمين',
      stcPay: 'STC Pay',
      mada: 'مدى',
      processingTime: 'وقت المعالجة',
      days: 'أيام',
      sar: 'ريال'
    },
    en: {
      title: 'Real-Time Financial Dashboard',
      subtitle: 'Monitor financial performance in real-time',
      overview: 'Overview',
      revenue: 'Revenue',
      payments: 'Payments',
      insurance: 'Insurance',
      analytics: 'Analytics',
      totalRevenue: 'Total Revenue',
      netIncome: 'Net Income',
      cashFlow: 'Cash Flow',
      accountsReceivable: 'Accounts Receivable',
      growth: 'Growth',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisQuarter: 'This Quarter',
      thisYear: 'This Year',
      collected: 'Collected',
      pending: 'Pending',
      overdue: 'Overdue',
      claims: 'Claims',
      approved: 'Approved',
      rejected: 'Rejected',
      approvalRate: 'Approval Rate',
      exportReport: 'Export Report',
      autoRefresh: 'Auto Refresh',
      lastUpdated: 'Last Updated',
      alerts: 'Alerts',
      noData: 'No data available',
      loading: 'Loading...',
      error: 'An error occurred',
      retry: 'Retry',
      serviceRevenue: 'Service Revenue',
      utilizationRate: 'Utilization Rate',
      averageRate: 'Average Rate',
      sessions: 'Sessions',
      paymentMethods: 'Payment Methods',
      cash: 'Cash',
      card: 'Card',
      bankTransfer: 'Bank Transfer',
      insurance: 'Insurance',
      stcPay: 'STC Pay',
      mada: 'MADA',
      processingTime: 'Processing Time',
      days: 'days',
      sar: 'SAR'
    }
  };

  const t = translations[language];

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await realTimeFinancialAnalytics.getRealTimeDashboard();
      setDashboardData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time updates
  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time updates
    const unsubscribe = realTimeFinancialAnalytics.subscribeToUpdates(() => {
      if (autoRefresh) {
        fetchDashboardData();
      }
    });

    // Set up auto-refresh interval
    const interval = autoRefresh ? setInterval(fetchDashboardData, 60000) : null; // Refresh every minute

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchDashboardData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Export report
  const handleExportReport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const blob = await realTimeFinancialAnalytics.exportFinancialData(
        format,
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      );
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting report:', err);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t.error}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
          {t.retry}
        </Button>
      </Alert>
    );
  }

  if (!dashboardData) {
    return <div>{t.noData}</div>;
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t.lastUpdated}: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          </div>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span className="ml-2">{t.autoRefresh}</span>
          </Button>
          
          <Button onClick={() => fetchDashboardData()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button onClick={() => handleExportReport('pdf')} size="sm">
            <Download className="h-4 w-4" />
            <span className="ml-2">{t.exportReport}</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {dashboardData.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboardData.alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              {alert.type === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : alert.type === 'warning' ? (
                <Clock className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalRevenue}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.snapshot.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {dashboardData.trends.monthlyGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={dashboardData.trends.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatPercentage(dashboardData.trends.monthlyGrowth)}
              </span>
              <span className="ml-1">{t.growth}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.netIncome}</CardTitle>
            <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.snapshot.netIncome)}</div>
            <Progress 
              value={(dashboardData.snapshot.netIncome / dashboardData.snapshot.totalRevenue) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.cashFlow}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.snapshot.cashFlow)}</div>
            <div className="text-xs text-muted-foreground">
              {t.accountsReceivable}: {formatCurrency(dashboardData.snapshot.accountsReceivable)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.approvalRate}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.insuranceAnalytics.approvalRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {dashboardData.insuranceAnalytics.approvedClaims}/{dashboardData.insuranceAnalytics.totalClaims} {t.claims}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="revenue">{t.revenue}</TabsTrigger>
          <TabsTrigger value="payments">{t.payments}</TabsTrigger>
          <TabsTrigger value="insurance">{t.insurance}</TabsTrigger>
          <TabsTrigger value="analytics">{t.analytics}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          {/* Revenue by Period */}
          <Card>
            <CardHeader>
              <CardTitle>{t.revenue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.revenueMetrics.map((metric) => (
                  <div key={metric.period} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-24 font-medium">{metric.period}</div>
                      <div className="text-2xl font-bold">{formatCurrency(metric.revenue)}</div>
                      <Badge variant={metric.growth >= 0 ? "default" : "destructive"}>
                        {formatPercentage(metric.growth)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Projected: {formatCurrency(metric.projectedRevenue)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Service Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>{t.serviceRevenue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.serviceRevenue.map((service) => (
                  <div key={service.serviceType} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{service.serviceType}</span>
                      <span className="text-lg font-bold">{formatCurrency(service.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{service.sessionCount} {t.sessions}</span>
                      <span>{t.averageRate}: {formatCurrency(service.averageRate)}</span>
                      <span>{t.utilizationRate}: {service.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={service.utilizationRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.collected}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.paymentAnalytics.totalCollected)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.pending}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(dashboardData.paymentAnalytics.pendingPayments)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.overdue}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboardData.paymentAnalytics.overduePayments)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>{t.paymentMethods}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(dashboardData.paymentAnalytics.paymentMethodBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{method}</span>
                    </div>
                    <span className="font-bold">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.claims}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.insuranceAnalytics.totalClaims}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.approved}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.insuranceAnalytics.approvedClaims}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.rejected}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.insuranceAnalytics.rejectedClaims}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.pending}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {dashboardData.insuranceAnalytics.pendingClaims}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Total Claim Value</span>
                <span className="font-bold">{formatCurrency(dashboardData.insuranceAnalytics.totalClaimValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.approvalRate}</span>
                <span className="font-bold">{dashboardData.insuranceAnalytics.approvalRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>{t.processingTime}</span>
                <span className="font-bold">{dashboardData.insuranceAnalytics.averageProcessingTime} {t.days}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <LineChart className="h-16 w-16" />
                <span className="ml-4">Chart visualization would be rendered here</span>
              </div>
              {/* In production, integrate with a charting library like Recharts */}
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weekly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dashboardData.trends.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.trends.weeklyGrowth)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dashboardData.trends.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.trends.monthlyGrowth)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Yearly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dashboardData.trends.yearlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.trends.yearlyGrowth)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeFinancialDashboard;