import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CalendarIcon, TrendingUpIcon, DollarSignIcon, CreditCardIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  monthlyRecurring: number;
  pendingPayments: number;
  overdueBills: number;
  averageSessionCost: number;
  reimbursementRate: number;
}

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  sessionType: string;
  insuranceProvider?: string;
  reimbursementAmount?: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  sessionsCount: number;
}

interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface FinancialAnalyticsProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({
  dateRange
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last6months');
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      
      // Mock financial metrics
      setMetrics({
        totalRevenue: 45000,
        totalExpenses: 28000,
        netIncome: 17000,
        monthlyRecurring: 12000,
        pendingPayments: 3200,
        overdueBills: 850,
        averageSessionCost: 120,
        reimbursementRate: 0.75
      });

      // Mock revenue data
      setRevenueData([
        { month: 'Jan', revenue: 8500, expenses: 5200, netIncome: 3300, sessionsCount: 68 },
        { month: 'Feb', revenue: 7800, expenses: 4800, netIncome: 3000, sessionsCount: 65 },
        { month: 'Mar', revenue: 9200, expenses: 5500, netIncome: 3700, sessionsCount: 76 },
        { month: 'Apr', revenue: 8900, expenses: 5100, netIncome: 3800, sessionsCount: 74 },
        { month: 'May', revenue: 9800, expenses: 5800, netIncome: 4000, sessionsCount: 82 },
        { month: 'Jun', revenue: 10700, expenses: 6500, netIncome: 4200, sessionsCount: 89 }
      ]);

      // Mock payment records
      setPaymentRecords([
        {
          id: '1',
          studentId: 'STU001',
          studentName: 'أحمد محمد',
          amount: 480,
          status: 'paid',
          dueDate: '2024-08-15',
          paidDate: '2024-08-14',
          sessionType: 'Speech Therapy',
          insuranceProvider: 'Health Insurance Co.',
          reimbursementAmount: 360
        },
        {
          id: '2',
          studentId: 'STU002', 
          studentName: 'فاطمة علي',
          amount: 600,
          status: 'pending',
          dueDate: '2024-08-25',
          sessionType: 'Behavioral Therapy'
        },
        {
          id: '3',
          studentId: 'STU003',
          studentName: 'محمد أحمد',
          amount: 320,
          status: 'overdue',
          dueDate: '2024-08-10',
          sessionType: 'Occupational Therapy',
          insuranceProvider: 'Medical Insurance Ltd.',
          reimbursementAmount: 240
        }
      ]);

      // Mock expense breakdown
      setExpenseBreakdown([
        { category: 'Staff Salaries', amount: 18000, percentage: 64, color: '#8884d8' },
        { category: 'Equipment & Supplies', amount: 4500, percentage: 16, color: '#82ca9d' },
        { category: 'Facility Rent', amount: 3200, percentage: 11, color: '#ffc658' },
        { category: 'Insurance', amount: 1500, percentage: 5, color: '#ff7c7c' },
        { category: 'Other', amount: 800, percentage: 3, color: '#8dd1e1' }
      ]);

      setLoading(false);
    };

    fetchFinancialData();
  }, [selectedPeriod, dateRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending': return <CreditCardIcon className="h-4 w-4" />;
      case 'overdue': return <AlertTriangleIcon className="h-4 w-4" />;
      default: return <CreditCardIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSignIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Total Revenue')}</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Net Income')}</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(metrics?.netIncome || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCardIcon className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Pending Payments')}</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(metrics?.pendingPayments || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Overdue Bills')}</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(metrics?.overdueBills || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Revenue & Expenses Trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8"
                name={t('Revenue')}
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stackId="2" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                name={t('Expenses')}
              />
              <Line 
                type="monotone" 
                dataKey="netIncome" 
                stroke="#ff7c7c"
                name={t('Net Income')}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      {/* Payment Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">{t('Paid This Month')}</p>
              <p className="text-2xl font-bold text-green-600">
                {paymentRecords.filter(p => p.status === 'paid').length}
              </p>
              <p className="text-sm text-green-600">
                {formatCurrency(paymentRecords.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">{t('Pending Payments')}</p>
              <p className="text-2xl font-bold text-yellow-600">
                {paymentRecords.filter(p => p.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-600">
                {formatCurrency(paymentRecords.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">{t('Overdue Payments')}</p>
              <p className="text-2xl font-bold text-red-600">
                {paymentRecords.filter(p => p.status === 'overdue').length}
              </p>
              <p className="text-sm text-red-600">
                {formatCurrency(paymentRecords.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Payment Records')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Student')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Due Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Session Type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Insurance')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentRecords.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.studentName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.studentId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.reimbursementAmount && (
                        <div className="text-xs text-green-600">
                          {t('Reimbursement')}: {formatCurrency(payment.reimbursementAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`inline-flex items-center space-x-1 ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span>{t(payment.status)}</span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.dueDate).toLocaleDateString(i18n.language)}
                      {payment.paidDate && (
                        <div className="text-xs text-green-600">
                          {t('Paid')}: {new Date(payment.paidDate).toLocaleDateString(i18n.language)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.sessionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.insuranceProvider || t('N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-6">
      {/* Expense Overview */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('Expense Breakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percentage}) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Monthly Expense Trend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="expenses" fill="#82ca9d" name={t('Expenses')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Expense Categories')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseBreakdown.map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: expense.color }}
                  />
                  <div>
                    <p className="font-medium">{expense.category}</p>
                    <p className="text-sm text-gray-600">{expense.percentage}% of total expenses</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  <p className="text-sm text-gray-600">{t('Monthly')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Financial Reports')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <DollarSignIcon className="h-6 w-6" />
              <span>{t('Revenue Report')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <TrendingUpIcon className="h-6 w-6" />
              <span>{t('Expense Report')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <CreditCardIcon className="h-6 w-6" />
              <span>{t('Payment Summary')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <CalendarIcon className="h-6 w-6" />
              <span>{t('Monthly Statement')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Financial KPIs')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{t('Average Session Cost')}</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics?.averageSessionCost || 0)}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{t('Monthly Recurring')}</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics?.monthlyRecurring || 0)}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{t('Reimbursement Rate')}</p>
              <p className="text-2xl font-bold">{Math.round((metrics?.reimbursementRate || 0) * 100)}%</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{t('Profit Margin')}</p>
              <p className="text-2xl font-bold">
                {metrics ? Math.round((metrics.netIncome / metrics.totalRevenue) * 100) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading financial data...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Financial Analytics')}</h2>
          <p className="text-gray-600">{t('Track revenue, expenses, and payment analytics')}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30days">{t('Last 30 Days')}</SelectItem>
              <SelectItem value="last3months">{t('Last 3 Months')}</SelectItem>
              <SelectItem value="last6months">{t('Last 6 Months')}</SelectItem>
              <SelectItem value="lastyear">{t('Last Year')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {t('Export Report')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="payments">{t('Payments')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('Expenses')}</TabsTrigger>
          <TabsTrigger value="reports">{t('Reports')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="payments">{renderPaymentsTab()}</TabsContent>
        <TabsContent value="expenses">{renderExpensesTab()}</TabsContent>
        <TabsContent value="reports">{renderReportsTab()}</TabsContent>
      </Tabs>
    </div>
  );
};