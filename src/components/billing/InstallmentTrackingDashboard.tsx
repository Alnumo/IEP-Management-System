// Installment Tracking Dashboard - Story 2.3 Task 4
// Dashboard for tracking and managing installment payment plans

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Search,
  Filter,
  Download,
  Bell,
  Users,
  BarChart3,
  PieChart,
  Eye,
  Edit,
  Trash2,
  Send
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { InstallmentPlan, InstallmentPayment, Student } from '../../types/financial-management';
import { InstallmentPaymentAutomation } from '../../services/installment-payment-automation';

interface InstallmentTrackingDashboardProps {
  installmentPlans: InstallmentPlan[];
  students: Student[];
  onViewPlan: (plan: InstallmentPlan) => void;
  onEditPlan: (plan: InstallmentPlan) => void;
  onDeletePlan: (planId: string) => Promise<void>;
  onRecordPayment: (payment: Omit<InstallmentPayment, 'id' | 'created_at'>) => Promise<void>;
  onSendReminder: (planId: string, installmentNumber: number) => Promise<void>;
  onGenerateReport: (filters: any) => Promise<void>;
}

interface DashboardStats {
  totalActivePlans: number;
  totalOutstandingAmount: number;
  overduePayments: number;
  upcomingPayments: number;
  collectedThisMonth: number;
  averagePaymentDelay: number;
  completionRate: number;
  defaultRate: number;
}

interface PaymentReminderData {
  planId: string;
  installmentNumber: number;
  studentName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export const InstallmentTrackingDashboard: React.FC<InstallmentTrackingDashboardProps> = ({
  installmentPlans,
  students,
  onViewPlan,
  onEditPlan,
  onDeletePlan,
  onRecordPayment,
  onSendReminder,
  onGenerateReport
}) => {
  const { language, isRTL } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [overdueFilter, setOverdueFilter] = useState<string>('all');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalActivePlans: 0,
    totalOutstandingAmount: 0,
    overduePayments: 0,
    upcomingPayments: 0,
    collectedThisMonth: 0,
    averagePaymentDelay: 0,
    completionRate: 0,
    defaultRate: 0
  });
  const [overdueReminders, setOverdueReminders] = useState<PaymentReminderData[]>([]);
  const [automationService] = useState(() => InstallmentPaymentAutomation.getInstance());
  const [automationStats, setAutomationStats] = useState({
    totalAutomatedPlans: 0,
    remindersSentToday: 0,
    successfulCollections: 0,
    failedCollections: 0
  });

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'لوحة تتبع خطط الأقساط',
      description: 'إدارة ومتابعة جميع خطط الدفع بالأقساط',
      overview: 'نظرة عامة',
      activePlans: 'خطط الدفع النشطة',
      payments: 'المدفوعات',
      reminders: 'التذكيرات',
      reports: 'التقارير',
      totalActivePlans: 'إجمالي الخطط النشطة',
      outstandingAmount: 'المبلغ المستحق',
      overduePayments: 'المدفوعات المتأخرة',
      upcomingPayments: 'المدفوعات القادمة',
      collectedThisMonth: 'المحصول هذا الشهر',
      averageDelay: 'متوسط التأخير',
      completionRate: 'معدل الإنجاز',
      defaultRate: 'معدل التخلف',
      searchPlans: 'البحث في الخطط...',
      filterByStatus: 'تصفية حسب الحالة',
      filterByOverdue: 'تصفية حسب التأخير',
      allStatuses: 'جميع الحالات',
      allOverdue: 'جميع الحالات',
      active: 'نشط',
      completed: 'مكتمل',
      suspended: 'معلق',
      cancelled: 'ملغى',
      onlyOverdue: 'المتأخرة فقط',
      notOverdue: 'غير المتأخرة',
      studentName: 'اسم الطالب',
      totalAmount: 'المبلغ الإجمالي',
      paidAmount: 'المبلغ المدفوع',
      remainingAmount: 'المبلغ المتبقي',
      nextPayment: 'الدفعة التالية',
      status: 'الحالة',
      actions: 'الإجراءات',
      viewDetails: 'عرض التفاصيل',
      editPlan: 'تعديل الخطة',
      deletePlan: 'حذف الخطة',
      recordPayment: 'تسجيل دفعة',
      sendReminder: 'إرسال تذكير',
      noPlans: 'لا توجد خطط دفع',
      noPlansDesc: 'لم يتم إنشاء أي خطط دفع بعد',
      overdueReminders: 'تذكيرات المدفوعات المتأخرة',
      daysOverdue: 'أيام التأخير',
      remindersSent: 'تم إرسال التذكيرات',
      generateReport: 'إنشاء تقرير',
      exportData: 'تصدير البيانات',
      paymentHistory: 'تاريخ المدفوعات',
      installmentDetails: 'تفاصيل الأقساط',
      planSummary: 'ملخص الخطة',
      paymentSchedule: 'جدولة المدفوعات',
      installmentNo: 'رقم القسط',
      dueDate: 'تاريخ الاستحقاق',
      amount: 'المبلغ',
      paidDate: 'تاريخ الدفع',
      paymentStatus: 'حالة الدفع',
      pending: 'معلق',
      paid: 'مدفوع',
      overdue: 'متأخر',
      partial: 'جزئي',
      days: 'يوم',
      sar: 'ريال',
      automation: 'الأتمتة',
      automatedPlans: 'الخطط المؤتمتة',
      remindersSentToday: 'التذكيرات المرسلة اليوم',
      successfulCollections: 'التحصيلات الناجحة',
      failedCollections: 'التحصيلات الفاشلة',
      pauseAutomation: 'إيقاف الأتمتة',
      resumeAutomation: 'استئناف الأتمتة',
      bulkReminders: 'إرسال تذكيرات جماعية',
      automationStatus: 'حالة الأتمتة'
    },
    en: {
      title: 'Installment Plans Tracking Dashboard',
      description: 'Manage and monitor all installment payment plans',
      overview: 'Overview',
      activePlans: 'Active Plans',
      payments: 'Payments',
      reminders: 'Reminders',
      reports: 'Reports',
      totalActivePlans: 'Total Active Plans',
      outstandingAmount: 'Outstanding Amount',
      overduePayments: 'Overdue Payments',
      upcomingPayments: 'Upcoming Payments',
      collectedThisMonth: 'Collected This Month',
      averageDelay: 'Average Delay',
      completionRate: 'Completion Rate',
      defaultRate: 'Default Rate',
      searchPlans: 'Search plans...',
      filterByStatus: 'Filter by Status',
      filterByOverdue: 'Filter by Overdue',
      allStatuses: 'All Statuses',
      allOverdue: 'All',
      active: 'Active',
      completed: 'Completed',
      suspended: 'Suspended',
      cancelled: 'Cancelled',
      onlyOverdue: 'Overdue Only',
      notOverdue: 'Not Overdue',
      studentName: 'Student Name',
      totalAmount: 'Total Amount',
      paidAmount: 'Paid Amount',
      remainingAmount: 'Remaining Amount',
      nextPayment: 'Next Payment',
      status: 'Status',
      actions: 'Actions',
      viewDetails: 'View Details',
      editPlan: 'Edit Plan',
      deletePlan: 'Delete Plan',
      recordPayment: 'Record Payment',
      sendReminder: 'Send Reminder',
      noPlans: 'No Payment Plans',
      noPlansDesc: 'No installment plans have been created yet',
      overdueReminders: 'Overdue Payment Reminders',
      daysOverdue: 'Days Overdue',
      remindersSent: 'Reminders Sent',
      generateReport: 'Generate Report',
      exportData: 'Export Data',
      paymentHistory: 'Payment History',
      installmentDetails: 'Installment Details',
      planSummary: 'Plan Summary',
      paymentSchedule: 'Payment Schedule',
      installmentNo: 'Installment #',
      dueDate: 'Due Date',
      amount: 'Amount',
      paidDate: 'Paid Date',
      paymentStatus: 'Payment Status',
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
      partial: 'Partial',
      days: 'days',
      sar: 'SAR',
      automation: 'Automation',
      automatedPlans: 'Automated Plans',
      remindersSentToday: 'Reminders Sent Today',
      successfulCollections: 'Successful Collections',
      failedCollections: 'Failed Collections',
      pauseAutomation: 'Pause Automation',
      resumeAutomation: 'Resume Automation',
      bulkReminders: 'Send Bulk Reminders',
      automationStatus: 'Automation Status'
    }
  };

  const currentLabels = labels[language];

  // Calculate dashboard statistics
  useEffect(() => {
    calculateDashboardStats();
    generateOverdueReminders();
    loadAutomationStats();
  }, [installmentPlans]);

  const loadAutomationStats = async () => {
    try {
      const stats = await automationService.getAutomationStatistics();
      setAutomationStats(stats);
    } catch (error) {
      console.error('Error loading automation statistics:', error);
    }
  };

  const calculateDashboardStats = () => {
    const activePlans = installmentPlans.filter(plan => plan.status === 'active');
    const totalActivePlans = activePlans.length;
    
    let totalOutstanding = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let collectedThisMonth = 0;
    let totalDelayDays = 0;
    let completedPlans = 0;
    let defaultedPlans = 0;

    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    installmentPlans.forEach(plan => {
      // Calculate outstanding amount
      const paidAmount = plan.installment_schedule
        ?.filter(inst => inst.status === 'paid')
        .reduce((sum, inst) => sum + inst.amount, 0) || 0;
      const remaining = plan.total_amount - paidAmount;
      
      if (plan.status === 'active') {
        totalOutstanding += remaining;
      }

      // Count overdue and upcoming payments
      plan.installment_schedule?.forEach(installment => {
        const dueDate = new Date(installment.due_date);
        
        if (installment.status === 'pending' && isBefore(dueDate, today)) {
          overdueCount++;
        }
        
        if (installment.status === 'pending' && 
            isAfter(dueDate, today) && 
            isBefore(dueDate, thirtyDaysFromNow)) {
          upcomingCount++;
        }

        // Calculate collected this month
        if (installment.status === 'paid' && installment.paid_date) {
          const paidDate = new Date(installment.paid_date);
          if (paidDate >= startOfMonth) {
            collectedThisMonth += installment.amount;
          }
        }
      });

      // Calculate completion and default rates
      if (plan.status === 'completed') completedPlans++;
      if (plan.status === 'defaulted') defaultedPlans++;
    });

    const stats: DashboardStats = {
      totalActivePlans,
      totalOutstandingAmount: totalOutstanding,
      overduePayments: overdueCount,
      upcomingPayments: upcomingCount,
      collectedThisMonth,
      averagePaymentDelay: totalDelayDays / Math.max(overdueCount, 1),
      completionRate: (completedPlans / Math.max(installmentPlans.length, 1)) * 100,
      defaultRate: (defaultedPlans / Math.max(installmentPlans.length, 1)) * 100
    };

    setDashboardStats(stats);
  };

  const generateOverdueReminders = () => {
    const reminders: PaymentReminderData[] = [];
    const today = new Date();

    installmentPlans.forEach(plan => {
      const student = students.find(s => s.id === plan.student_id);
      if (!student) return;

      plan.installment_schedule?.forEach(installment => {
        if (installment.status === 'pending' && 
            isBefore(new Date(installment.due_date), today)) {
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(installment.due_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          reminders.push({
            planId: plan.id!,
            installmentNumber: installment.installment_number,
            studentName: language === 'ar' ? student.name_ar : student.name_en,
            amount: installment.amount,
            dueDate: installment.due_date,
            daysOverdue
          });
        }
      });
    });

    // Sort by days overdue (descending)
    reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
    setOverdueReminders(reminders);
  };

  const getFilteredPlans = () => {
    return installmentPlans.filter(plan => {
      const student = students.find(s => s.id === plan.student_id);
      const studentName = student 
        ? (language === 'ar' ? student.name_ar : student.name_en).toLowerCase()
        : '';

      // Text search
      const matchesSearch = searchTerm === '' || 
        studentName.includes(searchTerm.toLowerCase()) ||
        plan.id?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;

      // Overdue filter
      const hasOverduePayments = plan.installment_schedule?.some(inst => 
        inst.status === 'pending' && 
        isBefore(new Date(inst.due_date), new Date())
      );

      const matchesOverdue = overdueFilter === 'all' || 
        (overdueFilter === 'onlyOverdue' && hasOverduePayments) ||
        (overdueFilter === 'notOverdue' && !hasOverduePayments);

      return matchesSearch && matchesStatus && matchesOverdue;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: currentLabels.active },
      completed: { variant: 'secondary' as const, label: currentLabels.completed },
      suspended: { variant: 'outline' as const, label: currentLabels.suspended },
      cancelled: { variant: 'destructive' as const, label: currentLabels.cancelled }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, label: currentLabels.pending, icon: Clock },
      paid: { variant: 'default' as const, label: currentLabels.paid, icon: CheckCircle },
      overdue: { variant: 'destructive' as const, label: currentLabels.overdue, icon: AlertTriangle },
      partial: { variant: 'secondary' as const, label: currentLabels.partial, icon: DollarSign }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const currencySymbol = language === 'ar' ? currentLabels.sar : currentLabels.sar;
  const filteredPlans = getFilteredPlans();

  return (
    <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          {currentLabels.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {currentLabels.description}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{currentLabels.overview}</TabsTrigger>
          <TabsTrigger value="plans">{currentLabels.activePlans}</TabsTrigger>
          <TabsTrigger value="payments">{currentLabels.payments}</TabsTrigger>
          <TabsTrigger value="reminders">{currentLabels.reminders}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {currentLabels.totalActivePlans}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalActivePlans}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {currentLabels.outstandingAmount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencySymbol} {dashboardStats.totalOutstandingAmount.toFixed(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {currentLabels.overduePayments}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardStats.overduePayments}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  {currentLabels.upcomingPayments}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats.upcomingPayments}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLabels.collectedThisMonth}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {currencySymbol} {dashboardStats.collectedThisMonth.toFixed(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLabels.averageDelay}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardStats.averagePaymentDelay.toFixed(1)} {currentLabels.days}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLabels.completionRate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardStats.completionRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLabels.defaultRate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardStats.defaultRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automation Statistics */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {currentLabels.automation}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentLabels.automatedPlans}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{automationStats.totalAutomatedPlans}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentLabels.remindersSentToday}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{automationStats.remindersSentToday}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentLabels.successfulCollections}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{automationStats.successfulCollections}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentLabels.failedCollections}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{automationStats.failedCollections}</div>
                </CardContent>
              </Card>
            </div>

            {/* Automation Controls */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => automationService.pauseAutomation()}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                {currentLabels.pauseAutomation}
              </Button>
              <Button
                onClick={() => automationService.processOverduePayments()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {currentLabels.bulkReminders}
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onGenerateReport({})} className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {currentLabels.generateReport}
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {currentLabels.exportData}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 rtl:left-auto rtl:right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={currentLabels.searchPlans}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 rtl:pl-3 rtl:pr-8"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLabels.filterByStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLabels.allStatuses}</SelectItem>
                    <SelectItem value="active">{currentLabels.active}</SelectItem>
                    <SelectItem value="completed">{currentLabels.completed}</SelectItem>
                    <SelectItem value="suspended">{currentLabels.suspended}</SelectItem>
                    <SelectItem value="cancelled">{currentLabels.cancelled}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLabels.filterByOverdue} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLabels.allOverdue}</SelectItem>
                    <SelectItem value="onlyOverdue">{currentLabels.onlyOverdue}</SelectItem>
                    <SelectItem value="notOverdue">{currentLabels.notOverdue}</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plans Table */}
          <Card>
            <CardContent className="p-0">
              {filteredPlans.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{currentLabels.noPlans}</h3>
                  <p className="text-muted-foreground">{currentLabels.noPlansDesc}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.studentName}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.totalAmount}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.paidAmount}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.remainingAmount}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.nextPayment}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.status}
                        </th>
                        <th className={`p-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.map((plan) => {
                        const student = students.find(s => s.id === plan.student_id);
                        const studentName = student 
                          ? (language === 'ar' ? student.name_ar : student.name_en)
                          : 'Unknown';

                        const paidAmount = plan.installment_schedule
                          ?.filter(inst => inst.status === 'paid')
                          .reduce((sum, inst) => sum + inst.amount, 0) || 0;

                        const remainingAmount = plan.total_amount - paidAmount;

                        const nextPayment = plan.installment_schedule
                          ?.find(inst => inst.status === 'pending');

                        return (
                          <tr key={plan.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="font-medium">{studentName}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {plan.id?.slice(0, 8)}...
                              </div>
                            </td>
                            <td className="p-3 font-medium">
                              {currencySymbol} {plan.total_amount.toFixed(2)}
                            </td>
                            <td className="p-3 text-green-600 font-medium">
                              {currencySymbol} {paidAmount.toFixed(2)}
                            </td>
                            <td className="p-3 font-medium">
                              {currencySymbol} {remainingAmount.toFixed(2)}
                            </td>
                            <td className="p-3">
                              {nextPayment ? (
                                <div>
                                  <div className="font-medium">
                                    {currencySymbol} {nextPayment.amount.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(nextPayment.due_date), 'dd/MM/yyyy', {
                                      locale: language === 'ar' ? ar : enUS
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {getStatusBadge(plan.status)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewPlan(plan)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditPlan(plan)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeletePlan(plan.id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentLabels.paymentHistory}</CardTitle>
              <CardDescription>Recent payment activities and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Payment history will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {currentLabels.overdueReminders}
              </CardTitle>
              <CardDescription>
                Manage payment reminders for overdue installments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueReminders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">No Overdue Payments</p>
                  <p className="text-muted-foreground">All payments are up to date!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueReminders.map((reminder, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{reminder.studentName}</div>
                        <div className="text-sm text-muted-foreground">
                          Installment #{reminder.installmentNumber} • 
                          {currencySymbol} {reminder.amount.toFixed(2)} • 
                          Due: {format(new Date(reminder.dueDate), 'dd/MM/yyyy')}
                        </div>
                        <Badge variant="destructive" className="mt-2">
                          {reminder.daysOverdue} {currentLabels.days} {currentLabels.overdue.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendReminder(reminder.planId, reminder.installmentNumber)}
                          className="flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" />
                          {currentLabels.sendReminder}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallmentTrackingDashboard;