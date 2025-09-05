// Financial Dashboard Page - Story 2.3 Task 6
// Main financial management interface integrating all billing components

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  DollarSign,
  CreditCard,
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  Plus,
  Settings,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Bell
} from 'lucide-react';

// Import billing components
import { FinancialAnalyticsDashboard } from '../components/billing/FinancialAnalyticsDashboard';
import { InstallmentTrackingDashboard } from '../components/billing/InstallmentTrackingDashboard';
import { InvoiceCustomizationInterface } from '../components/billing/InvoiceCustomizationInterface';
import { InstallmentPlanCreation } from '../components/billing/InstallmentPlanCreation';
import { PaymentForm } from '../components/billing/PaymentForm';

import { Invoice, InstallmentPlan, Student, TherapyProgram } from '../types/financial-management';

interface FinancialDashboardPageProps {
  className?: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalOutstanding: number;
  activeInstallmentPlans: number;
  overduePayments: number;
  monthlyGrowth: number;
  collectionRate: number;
}

interface QuickAction {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
}

export const FinancialDashboardPage: React.FC<FinancialDashboardPageProps> = ({ className }) => {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInstallmentPlan, setSelectedInstallmentPlan] = useState<InstallmentPlan | null>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateInstallmentPlan, setShowCreateInstallmentPlan] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showInvoiceCustomization, setShowInvoiceCustomization] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'لوحة الإدارة المالية',
      description: 'إدارة شاملة للفواتير والمدفوعات وخطط الأقساط',
      overview: 'نظرة عامة',
      invoices: 'الفواتير',
      installments: 'خطط الأقساط',
      analytics: 'التحليلات',
      payments: 'المدفوعات',
      settings: 'الإعدادات',
      quickActions: 'إجراءات سريعة',
      recentActivity: 'النشاط الأخير',
      keyMetrics: 'المؤشرات الرئيسية',
      totalRevenue: 'إجمالي الإيرادات',
      outstandingAmount: 'المبلغ المستحق',
      activeInstallmentPlans: 'خطط الأقساط النشطة',
      overduePayments: 'المدفوعات المتأخرة',
      monthlyGrowth: 'النمو الشهري',
      collectionRate: 'معدل التحصيل',
      createInvoice: 'إنشاء فاتورة جديدة',
      createInvoiceDesc: 'إنشاء فاتورة جديدة للطالب',
      createInstallmentPlan: 'إنشاء خطة أقساط',
      createInstallmentPlanDesc: 'إعداد خطة دفع بالأقساط',
      recordPayment: 'تسجيل دفعة',
      recordPaymentDesc: 'تسجيل دفعة مالية جديدة',
      customizeInvoices: 'تخصيص الفواتير',
      customizeInvoicesDesc: 'تخصيص تصميم الفواتير',
      generateReports: 'إنشاء التقارير',
      generateReportsDesc: 'إنشاء التقارير المالية',
      exportData: 'تصدير البيانات',
      exportDataDesc: 'تصدير البيانات المالية',
      refreshData: 'تحديث البيانات',
      refreshDataDesc: 'تحديث جميع البيانات المالية',
      manageBilling: 'إدارة الفواتير',
      manageBillingDesc: 'إدارة إعدادات الفواتير',
      noData: 'لا توجد بيانات',
      noDataDesc: 'لا توجد بيانات متاحة حالياً',
      loading: 'جاري التحميل...',
      error: 'خطأ في تحميل البيانات',
      sar: 'ريال',
      close: 'إغلاق',
      save: 'حفظ',
      cancel: 'إلغاء',
      success: 'تم بنجاح',
      failed: 'فشل العملية'
    },
    en: {
      title: 'Financial Management Dashboard',
      description: 'Comprehensive management of invoices, payments, and installment plans',
      overview: 'Overview',
      invoices: 'Invoices',
      installments: 'Installment Plans',
      analytics: 'Analytics',
      payments: 'Payments',
      settings: 'Settings',
      quickActions: 'Quick Actions',
      recentActivity: 'Recent Activity',
      keyMetrics: 'Key Metrics',
      totalRevenue: 'Total Revenue',
      outstandingAmount: 'Outstanding Amount',
      activeInstallmentPlans: 'Active Installment Plans',
      overduePayments: 'Overdue Payments',
      monthlyGrowth: 'Monthly Growth',
      collectionRate: 'Collection Rate',
      createInvoice: 'Create New Invoice',
      createInvoiceDesc: 'Create a new invoice for a student',
      createInstallmentPlan: 'Create Installment Plan',
      createInstallmentPlanDesc: 'Set up a new installment payment plan',
      recordPayment: 'Record Payment',
      recordPaymentDesc: 'Record a new payment transaction',
      customizeInvoices: 'Customize Invoices',
      customizeInvoicesDesc: 'Customize invoice templates and design',
      generateReports: 'Generate Reports',
      generateReportsDesc: 'Create financial reports and analytics',
      exportData: 'Export Data',
      exportDataDesc: 'Export financial data for analysis',
      refreshData: 'Refresh Data',
      refreshDataDesc: 'Refresh all financial data',
      manageBilling: 'Manage Billing',
      manageBillingDesc: 'Manage billing settings and configuration',
      noData: 'No Data Available',
      noDataDesc: 'No data is currently available',
      loading: 'Loading...',
      error: 'Error loading data',
      sar: 'SAR',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      success: 'Success',
      failed: 'Operation Failed'
    }
  };

  const currentLabels = labels[language];

  // Fetch financial data
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          student:students(*),
          invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    }
  });

  const { data: installmentPlans = [], isLoading: installmentPlansLoading } = useQuery({
    queryKey: ['installment_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installment_plans')
        .select(`
          *,
          student:students(*),
          invoice:invoices(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InstallmentPlan[];
    }
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name_ar', { ascending: true });

      if (error) throw error;
      return data as Student[];
    }
  });

  const { data: therapyPrograms = [], isLoading: therapyProgramsLoading } = useQuery({
    queryKey: ['therapy_programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapy_programs')
        .select('*')
        .order('name_ar', { ascending: true });

      if (error) throw error;
      return data as TherapyProgram[];
    }
  });

  // Calculate dashboard statistics
  const dashboardStats: DashboardStats = React.useMemo(() => {
    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const totalOutstanding = totalRevenue - totalPaid;
    const activeInstallmentPlans = installmentPlans.filter(plan => plan.status === 'active').length;
    
    // Count overdue payments
    const today = new Date();
    const overduePayments = invoices.filter(inv => 
      inv.payment_status === 'pending' && new Date(inv.due_date) < today
    ).length;

    // Calculate monthly growth (simplified)
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.invoice_date);
      return invoiceDate.getMonth() === thisMonth && invoiceDate.getFullYear() === thisYear;
    });
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const lastMonthInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.invoice_date);
      return invoiceDate.getMonth() === lastMonth && invoiceDate.getFullYear() === lastMonthYear;
    });
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    
    const monthlyGrowth = lastMonthRevenue > 0 ? 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOutstanding,
      activeInstallmentPlans,
      overduePayments,
      monthlyGrowth,
      collectionRate
    };
  }, [invoices, installmentPlans]);

  // Define quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'create_invoice',
      title_ar: 'إنشاء فاتورة جديدة',
      title_en: 'Create New Invoice',
      description_ar: 'إنشاء فاتورة جديدة للطالب',
      description_en: 'Create a new invoice for a student',
      icon: FileText,
      color: 'bg-blue-500',
      action: () => setShowCreateInvoice(true)
    },
    {
      id: 'create_installment_plan',
      title_ar: 'إنشاء خطة أقساط',
      title_en: 'Create Installment Plan',
      description_ar: 'إعداد خطة دفع بالأقساط',
      description_en: 'Set up a new installment payment plan',
      icon: CreditCard,
      color: 'bg-green-500',
      action: () => setShowCreateInstallmentPlan(true)
    },
    {
      id: 'record_payment',
      title_ar: 'تسجيل دفعة',
      title_en: 'Record Payment',
      description_ar: 'تسجيل دفعة مالية جديدة',
      description_en: 'Record a new payment transaction',
      icon: DollarSign,
      color: 'bg-emerald-500',
      action: () => setShowPaymentForm(true)
    },
    {
      id: 'customize_invoices',
      title_ar: 'تخصيص الفواتير',
      title_en: 'Customize Invoices',
      description_ar: 'تخصيص تصميم الفواتير',
      description_en: 'Customize invoice templates and design',
      icon: Settings,
      color: 'bg-purple-500',
      action: () => setShowInvoiceCustomization(true)
    },
    {
      id: 'generate_reports',
      title_ar: 'إنشاء التقارير',
      title_en: 'Generate Reports',
      description_ar: 'إنشاء التقارير المالية',
      description_en: 'Create financial reports and analytics',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => setActiveTab('analytics')
    },
    {
      id: 'refresh_data',
      title_ar: 'تحديث البيانات',
      title_en: 'Refresh Data',
      description_ar: 'تحديث جميع البيانات المالية',
      description_en: 'Refresh all financial data',
      icon: RefreshCw,
      color: 'bg-gray-500',
      action: async () => {
        setIsLoading(true);
        // Trigger data refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
      }
    }
  ];

  const formatCurrency = (amount: number) => {
    return `${currentLabels.sar} ${amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const getMetricColor = (value: number, type: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    if (type === 'positive') return value > 0 ? 'text-green-600' : 'text-red-600';
    if (type === 'negative') return value > 0 ? 'text-red-600' : 'text-green-600';
    return 'text-primary';
  };

  const isLoadingData = invoicesLoading || installmentPlansLoading || studentsLoading || therapyProgramsLoading;

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">{currentLabels.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-6 ${isRTL ? 'rtl' : 'ltr'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            {currentLabels.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentLabels.description}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {currentLabels.exportData}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {currentLabels.settings}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{currentLabels.overview}</TabsTrigger>
          <TabsTrigger value="invoices">{currentLabels.invoices}</TabsTrigger>
          <TabsTrigger value="installments">{currentLabels.installments}</TabsTrigger>
          <TabsTrigger value="analytics">{currentLabels.analytics}</TabsTrigger>
          <TabsTrigger value="payments">{currentLabels.payments}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  {currentLabels.totalRevenue}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardStats.totalRevenue)}
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`h-3 w-3 mr-1 ${getMetricColor(dashboardStats.monthlyGrowth, 'positive')}`} />
                  <span className={`text-xs ${getMetricColor(dashboardStats.monthlyGrowth, 'positive')}`}>
                    {dashboardStats.monthlyGrowth.toFixed(1)}% {currentLabels.monthlyGrowth}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  {currentLabels.outstandingAmount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboardStats.totalOutstanding)}
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {currentLabels.collectionRate}: {dashboardStats.collectionRate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  {currentLabels.activeInstallmentPlans}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats.activeInstallmentPlans}
                </div>
                {dashboardStats.overduePayments > 0 && (
                  <div className="flex items-center mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
                    <span className="text-xs text-red-600">
                      {dashboardStats.overduePayments} {currentLabels.overduePayments}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {currentLabels.quickActions}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const title = language === 'ar' ? action.title_ar : action.title_en;
                  const description = language === 'ar' ? action.description_ar : action.description_en;

                  return (
                    <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={action.action}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${action.color}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {currentLabels.recentActivity}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            Invoice #{invoice.invoice_number}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(invoice.created_at).toLocaleDateString(
                              language === 'ar' ? 'ar-SA' : 'en-US'
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        <Badge 
                          variant={invoice.payment_status === 'paid' ? 'default' : 
                                  invoice.payment_status === 'overdue' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {invoice.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{currentLabels.noData}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>{currentLabels.invoices}</CardTitle>
              <CardDescription>Manage all invoices and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Invoice management interface will be integrated here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments">
          <InstallmentTrackingDashboard
            installmentPlans={installmentPlans}
            students={students}
            onViewPlan={(plan) => setSelectedInstallmentPlan(plan)}
            onEditPlan={(plan) => setSelectedInstallmentPlan(plan)}
            onDeletePlan={async (planId) => {
              // Implement delete functionality
              console.log('Delete plan:', planId);
            }}
            onRecordPayment={async (payment) => {
              // Implement payment recording
              console.log('Record payment:', payment);
            }}
            onSendReminder={async (planId, installmentNumber) => {
              // Implement reminder sending
              console.log('Send reminder:', planId, installmentNumber);
            }}
            onGenerateReport={async (filters) => {
              // Implement report generation
              console.log('Generate report:', filters);
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <FinancialAnalyticsDashboard
            invoices={invoices}
            installmentPlans={installmentPlans}
            students={students}
            therapyPrograms={therapyPrograms}
            onExportReport={async (reportType, filters) => {
              // Implement export functionality
              console.log('Export report:', reportType, filters);
            }}
            onDrillDown={(metric, filters) => {
              // Implement drill-down functionality
              console.log('Drill down:', metric, filters);
            }}
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>{currentLabels.payments}</CardTitle>
              <CardDescription>Payment processing and management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Payment management interface will be integrated here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showInvoiceCustomization} onOpenChange={setShowInvoiceCustomization}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{currentLabels.customizeInvoices}</DialogTitle>
            <DialogDescription>
              {currentLabels.customizeInvoicesDesc}
            </DialogDescription>
          </DialogHeader>
          <InvoiceCustomizationInterface
            onSave={async (template) => {
              // Implement template save
              console.log('Save template:', template);
              setShowInvoiceCustomization(false);
            }}
            onPreview={async (template) => {
              // Implement template preview
              console.log('Preview template:', template);
            }}
            templates={[]} // Load actual templates
            selectedTemplateId=""
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialDashboardPage;