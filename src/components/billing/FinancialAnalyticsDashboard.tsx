// Financial Analytics Dashboard - Story 2.3 Task 5
// Comprehensive financial reporting and analytics interface

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { useLanguage } from '../../contexts/LanguageContext';
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
  Target,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Invoice, InstallmentPlan, Student, TherapyProgram } from '../../types/financial-management';

interface FinancialAnalyticsDashboardProps {
  invoices: Invoice[];
  installmentPlans: InstallmentPlan[];
  students: Student[];
  therapyPrograms: TherapyProgram[];
  onExportReport: (reportType: string, filters: any) => Promise<void>;
  onDrillDown: (metric: string, filters: any) => void;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalOutstanding: number;
  averageInvoiceValue: number;
  collectionRate: number;
  revenueGrowth: number;
  paymentDelinquencyRate: number;
  averagePaymentTime: number;
  customerLifetimeValue: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  // Installment Payment Metrics - Story 4.2
  activeInstallmentPlans: number;
  totalInstallmentValue: number;
  installmentCollectionRate: number;
  overdueInstallments: number;
  partialPayments: number;
  averageInstallmentAmount: number;
}

interface RevenueBreakdown {
  therapyProgram: string;
  revenue: number;
  percentage: number;
  invoiceCount: number;
  averageValue: number;
}

interface PaymentTrend {
  date: string;
  revenue: number;
  payments: number;
  outstanding: number;
  period: string;
}

interface CustomerSegment {
  segment: string;
  customerCount: number;
  revenue: number;
  averageValue: number;
  color: string;
}

// Story 4.2: Installment Payment Analytics Interfaces
interface InstallmentPlanAnalytics {
  planId: string;
  studentName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  paidInstallments: number;
  overdueInstallments: number;
  nextDueDate: string | null;
  completionRate: number;
  status: 'active' | 'completed' | 'defaulted';
}

interface InstallmentTrendData {
  date: string;
  newPlans: number;
  completedPlans: number;
  totalValue: number;
  collectionRate: number;
}

export const FinancialAnalyticsDashboard: React.FC<FinancialAnalyticsDashboardProps> = ({
  invoices,
  installmentPlans,
  students,
  therapyPrograms,
  onExportReport,
  onDrillDown
}) => {
  const { language, isRTL } = useLanguage();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'لوحة التحليلات المالية',
      description: 'تحليل شامل للأداء المالي والإيرادات',
      overview: 'نظرة عامة',
      revenue: 'الإيرادات',
      payments: 'المدفوعات',
      customers: 'العملاء',
      trends: 'الاتجاهات',
      reports: 'التقارير',
      totalRevenue: 'إجمالي الإيرادات',
      outstandingAmount: 'المبلغ المستحق',
      averageInvoiceValue: 'متوسط قيمة الفاتورة',
      collectionRate: 'معدل التحصيل',
      revenueGrowth: 'نمو الإيرادات',
      paymentDelinquencyRate: 'معدل التأخير في الدفع',
      averagePaymentTime: 'متوسط وقت الدفع',
      customerLifetimeValue: 'القيمة الدائمة للعميل',
      monthlyRecurringRevenue: 'الإيرادات الشهرية المتكررة',
      churnRate: 'معدل فقدان العملاء',
      revenueByProgram: 'الإيرادات حسب البرنامج',
      // Installment Payment Metrics - Story 4.2
      activeInstallmentPlans: 'خطط الأقساط النشطة',
      totalInstallmentValue: 'إجمالي قيمة الأقساط',
      installmentCollectionRate: 'معدل تحصيل الأقساط',
      overdueInstallments: 'الأقساط المتأخرة',
      partialPayments: 'المدفوعات الجزئية',
      averageInstallmentAmount: 'متوسط قيمة القسط',
      installmentAnalytics: 'تحليلات الأقساط',
      installmentTrends: 'اتجاهات الأقساط',
      completionRate: 'معدل الإكمال',
      installmentStatus: 'حالة القسط',
      paymentTrends: 'اتجاهات المدفوعات',
      customerSegmentation: 'تقسيم العملاء',
      topPerformers: 'أفضل البرامج أداءً',
      recentTransactions: 'المعاملات الأخيرة',
      kpiSummary: 'ملخص المؤشرات الرئيسية',
      periodSelection: 'اختيار الفترة',
      programFilter: 'تصفية البرنامج',
      dateRangeFilter: 'تصفية النطاق الزمني',
      exportReport: 'تصدير التقرير',
      refreshData: 'تحديث البيانات',
      applyFilters: 'تطبيق المرشحات',
      clearFilters: 'مسح المرشحات',
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      allPrograms: 'جميع البرامج',
      amount: 'المبلغ',
      count: 'العدد',
      percentage: 'النسبة المئوية',
      date: 'التاريخ',
      program: 'البرنامج',
      student: 'الطالب',
      invoice: 'الفاتورة',
      payment: 'الدفع',
      status: 'الحالة',
      paid: 'مدفوع',
      pending: 'معلق',
      overdue: 'متأخر',
      partial: 'جزئي',
      cancelled: 'ملغي',
      days: 'يوم',
      sar: 'ريال',
      noData: 'لا توجد بيانات',
      noDataDesc: 'لا توجد بيانات للفترة المحددة',
      loading: 'جارِ التحميل...',
      error: 'خطأ في تحميل البيانات'
    },
    en: {
      title: 'Financial Analytics Dashboard',
      description: 'Comprehensive analysis of financial performance and revenue',
      overview: 'Overview',
      revenue: 'Revenue',
      payments: 'Payments',
      customers: 'Customers',
      trends: 'Trends',
      reports: 'Reports',
      totalRevenue: 'Total Revenue',
      outstandingAmount: 'Outstanding Amount',
      averageInvoiceValue: 'Average Invoice Value',
      collectionRate: 'Collection Rate',
      revenueGrowth: 'Revenue Growth',
      paymentDelinquencyRate: 'Payment Delinquency Rate',
      averagePaymentTime: 'Average Payment Time',
      customerLifetimeValue: 'Customer Lifetime Value',
      monthlyRecurringRevenue: 'Monthly Recurring Revenue',
      churnRate: 'Churn Rate',
      // Installment Payment Metrics - Story 4.2
      activeInstallmentPlans: 'Active Installment Plans',
      totalInstallmentValue: 'Total Installment Value',
      installmentCollectionRate: 'Installment Collection Rate',
      overdueInstallments: 'Overdue Installments',
      partialPayments: 'Partial Payments',
      averageInstallmentAmount: 'Average Installment Amount',
      installmentAnalytics: 'Installment Analytics',
      installmentTrends: 'Installment Trends',
      completionRate: 'Completion Rate',
      installmentStatus: 'Installment Status',
      revenueByProgram: 'Revenue by Program',
      paymentTrends: 'Payment Trends',
      customerSegmentation: 'Customer Segmentation',
      topPerformers: 'Top Performing Programs',
      recentTransactions: 'Recent Transactions',
      kpiSummary: 'KPI Summary',
      periodSelection: 'Period Selection',
      programFilter: 'Program Filter',
      dateRangeFilter: 'Date Range Filter',
      exportReport: 'Export Report',
      refreshData: 'Refresh Data',
      applyFilters: 'Apply Filters',
      clearFilters: 'Clear Filters',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      allPrograms: 'All Programs',
      amount: 'Amount',
      count: 'Count',
      percentage: 'Percentage',
      date: 'Date',
      program: 'Program',
      student: 'Student',
      invoice: 'Invoice',
      payment: 'Payment',
      status: 'Status',
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      partial: 'Partial',
      cancelled: 'Cancelled',
      days: 'days',
      sar: 'SAR',
      noData: 'No Data',
      noDataDesc: 'No data available for the selected period',
      loading: 'Loading...',
      error: 'Error loading data'
    }
  };

  const currentLabels = labels[language];

  // Filter data based on date range and program selection
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      const withinDateRange = isWithinInterval(invoiceDate, { start: dateRange.from!, end: dateRange.to! });
      const matchesProgram = selectedProgram === 'all' || 
        invoice.invoice_items?.some(item => item.therapy_program_id === selectedProgram);
      
      return withinDateRange && matchesProgram;
    });
  }, [invoices, dateRange, selectedProgram]);

  const filteredInstallmentPlans = useMemo(() => {
    return installmentPlans.filter(plan => {
      const planDate = new Date(plan.created_at);
      return isWithinInterval(planDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [installmentPlans, dateRange]);

  // Calculate financial metrics
  const financialMetrics = useMemo((): FinancialMetrics => {
    const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const paidInvoices = filteredInvoices.filter(inv => inv.payment_status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const totalOutstanding = totalRevenue - totalPaid;
    const averageInvoiceValue = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
    
    // Calculate revenue growth (comparing to previous period)
    const previousPeriodStart = new Date(dateRange.from!);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 6);
    const previousPeriodEnd = new Date(dateRange.from!);
    
    const previousInvoices = invoices.filter(inv => 
      isWithinInterval(new Date(inv.invoice_date), { start: previousPeriodStart, end: previousPeriodEnd })
    );
    const previousRevenue = previousInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Calculate payment delinquency rate
    const overdueInvoices = filteredInvoices.filter(inv => 
      inv.payment_status === 'overdue' || 
      (inv.payment_status === 'pending' && new Date(inv.due_date) < new Date())
    );
    const paymentDelinquencyRate = filteredInvoices.length > 0 ? 
      (overdueInvoices.length / filteredInvoices.length) * 100 : 0;

    // Calculate average payment time
    const paidInvoicesWithTimes = paidInvoices.filter(inv => inv.paid_date);
    const totalPaymentDays = paidInvoicesWithTimes.reduce((sum, inv) => {
      const invoiceDate = new Date(inv.invoice_date);
      const paidDate = new Date(inv.paid_date!);
      return sum + Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    const averagePaymentTime = paidInvoicesWithTimes.length > 0 ? 
      totalPaymentDays / paidInvoicesWithTimes.length : 0;

    // Calculate customer lifetime value (simplified)
    const uniqueStudents = new Set(filteredInvoices.map(inv => inv.student_id));
    const customerLifetimeValue = uniqueStudents.size > 0 ? totalRevenue / uniqueStudents.size : 0;

    // Calculate monthly recurring revenue from installment plans
    const monthlyRecurringRevenue = filteredInstallmentPlans.reduce((sum, plan) => {
      return sum + (plan.regular_payment_amount || 0);
    }, 0);

    // Calculate churn rate (simplified - customers who haven't made payments in 3 months)
    const threeMonthsAgo = subMonths(new Date(), 3);
    const recentCustomers = new Set(
      invoices.filter(inv => new Date(inv.invoice_date) >= threeMonthsAgo)
        .map(inv => inv.student_id)
    );
    const totalCustomers = new Set(invoices.map(inv => inv.student_id));
    const churnRate = totalCustomers.size > 0 ? 
      ((totalCustomers.size - recentCustomers.size) / totalCustomers.size) * 100 : 0;

    return {
      totalRevenue,
      totalOutstanding,
      averageInvoiceValue,
      collectionRate,
      revenueGrowth,
      paymentDelinquencyRate,
      averagePaymentTime,
      customerLifetimeValue,
      monthlyRecurringRevenue,
      churnRate
    };
  }, [filteredInvoices, filteredInstallmentPlans, invoices, dateRange]);

  // Calculate revenue breakdown by therapy program
  const revenueBreakdown = useMemo((): RevenueBreakdown[] => {
    const programRevenue = new Map<string, { revenue: number; count: number }>();

    filteredInvoices.forEach(invoice => {
      invoice.invoice_items?.forEach(item => {
        if (item.therapy_program_id) {
          const current = programRevenue.get(item.therapy_program_id) || { revenue: 0, count: 0 };
          current.revenue += item.total_price;
          current.count += 1;
          programRevenue.set(item.therapy_program_id, current);
        }
      });
    });

    const totalRevenue = financialMetrics.totalRevenue;
    
    return Array.from(programRevenue.entries())
      .map(([programId, data]) => {
        const program = therapyPrograms.find(p => p.id === programId);
        return {
          therapyProgram: program ? (language === 'ar' ? program.name_ar : program.name_en) : 'Unknown',
          revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          invoiceCount: data.count,
          averageValue: data.count > 0 ? data.revenue / data.count : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices, therapyPrograms, financialMetrics.totalRevenue, language]);

  const currencySymbol = currentLabels.sar;

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const getMetricIcon = (metric: string) => {
    const icons = {
      totalRevenue: DollarSign,
      totalOutstanding: AlertTriangle,
      averageInvoiceValue: FileText,
      collectionRate: Target,
      revenueGrowth: TrendingUp,
      paymentDelinquencyRate: Clock,
      averagePaymentTime: Calendar,
      customerLifetimeValue: Users,
      monthlyRecurringRevenue: CreditCard,
      churnRate: TrendingDown
    };
    return icons[metric as keyof typeof icons] || BarChart3;
  };

  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'revenueGrowth':
        return value >= 0 ? 'text-green-600' : 'text-red-600';
      case 'collectionRate':
        return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
      case 'paymentDelinquencyRate':
      case 'churnRate':
        return value <= 5 ? 'text-green-600' : value <= 15 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-primary';
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    // In a real app, this would trigger a data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className={`w-full space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {currentLabels.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentLabels.description}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {currentLabels.refreshData}
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {currentLabels.exportReport}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(financialMetrics).map(([key, value]) => {
          const Icon = getMetricIcon(key);
          const colorClass = getMetricColor(key, value);
          const isPercentage = ['collectionRate', 'revenueGrowth', 'paymentDelinquencyRate', 'churnRate'].includes(key);
          const isDays = ['averagePaymentTime'].includes(key);
          
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onDrillDown(key, { dateRange, selectedProgram })}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {currentLabels[key as keyof typeof currentLabels]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${colorClass}`}>
                  {isPercentage 
                    ? `${value.toFixed(1)}%` 
                    : isDays 
                    ? `${value.toFixed(0)} ${currentLabels.days}`
                    : formatCurrency(value)}
                </div>
                {key === 'revenueGrowth' && (
                  <div className="flex items-center mt-1">
                    {value >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      vs previous period
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {currentLabels.topPerformers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLabels.program}
                    </th>
                    <th className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLabels.revenue}
                    </th>
                    <th className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLabels.percentage}
                    </th>
                    <th className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLabels.count}
                    </th>
                    <th className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      Avg. Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBreakdown.slice(0, 10).map((program, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{program.therapyProgram}</td>
                      <td className="p-3">{formatCurrency(program.revenue)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress value={program.percentage} className="w-16" />
                          <span>{program.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3">{program.invoiceCount}</td>
                      <td className="p-3">{formatCurrency(program.averageValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{currentLabels.noData}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialAnalyticsDashboard;