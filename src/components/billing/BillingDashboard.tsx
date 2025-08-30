import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  DollarSignIcon, TrendingUpIcon, AlertTriangleIcon, CheckCircleIcon,
  CreditCardIcon, FileTextIcon, CalendarIcon, DownloadIcon, PlusIcon,
  SearchIcon, FilterIcon, MoreVerticalIcon, EyeIcon, EditIcon,
  SendIcon, PrinterIcon, RefreshCwIcon
} from 'lucide-react';
import { Invoice, Payment, billingService } from '../../services/billing-service';
import { invoiceGenerator, InvoiceGenerationOptions } from '../../services/invoice-generator';

interface BillingMetrics {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  pendingAmount: number;
  averageInvoiceValue: number;
  paymentCollectionRate: number;
  monthlyRecurring: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  payments: number;
  invoices: number;
}

export const BillingDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last6months');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Data states
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Load data
  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      setMetrics({
        totalRevenue: 125000,
        totalInvoices: 156,
        paidInvoices: 124,
        overdueInvoices: 18,
        pendingAmount: 32500,
        averageInvoiceValue: 800,
        paymentCollectionRate: 85,
        monthlyRecurring: 15000
      });

      setRevenueData([
        { month: 'Jan', revenue: 18500, payments: 16200, invoices: 22 },
        { month: 'Feb', revenue: 19800, payments: 18900, invoices: 25 },
        { month: 'Mar', revenue: 22100, payments: 20800, invoices: 28 },
        { month: 'Apr', revenue: 21300, payments: 21800, invoices: 26 },
        { month: 'May', revenue: 23800, payments: 22500, invoices: 30 },
        { month: 'Jun', revenue: 25200, payments: 24100, invoices: 32 }
      ]);

      // Mock invoices
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-00156',
          studentId: 'stu1',
          parentId: 'par1',
          issueDate: '2024-08-20T00:00:00Z',
          dueDate: '2024-09-20T00:00:00Z',
          status: 'sent',
          currency: 'SAR',
          subtotal: 1000,
          discountAmount: 0,
          taxAmount: 150,
          totalAmount: 1150,
          paidAmount: 0,
          balanceAmount: 1150,
          paymentTerms: 30,
          insuranceProvider: 'Bupa Arabia',
          insuranceCoverage: 75,
          insuranceAmount: 862.5,
          patientResponsibility: 287.5,
          items: [],
          createdBy: 'admin',
          createdAt: '2024-08-20T00:00:00Z',
          updatedAt: '2024-08-20T00:00:00Z'
        }
      ];

      setInvoices(mockInvoices);

    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (invoice: Invoice, format: 'pdf' | 'html' | 'excel', language: 'ar' | 'en') => {
    try {
      // Mock student and parent data
      const studentInfo = { name: 'Ahmed Mohammed', nameAr: 'أحمد محمد' };
      const parentInfo = { name: 'Mohammed Ahmed', nameAr: 'محمد أحمد', email: 'parent@example.com', phone: '+966501234567' };

      const options: InvoiceGenerationOptions = {
        format,
        language,
        includePaymentInstructions: true
      };

      const result = await invoiceGenerator.generateInvoice(invoice, studentInfo, parentInfo, options);
      
      if (result.success) {
        console.log(`Invoice generated successfully: ${result.fileName}`);
      } else {
        console.error('Invoice generation failed:', result.error);
      }
    } catch (error) {
      console.error('Invoice generation error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-4 w-4" />;
      case 'sent': return <CreditCardIcon className="h-4 w-4" />;
      case 'overdue': return <AlertTriangleIcon className="h-4 w-4" />;
      default: return <FileTextIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <FileTextIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Total Invoices')}</p>
                <p className="text-xl font-bold text-blue-600">
                  {metrics?.totalInvoices || 0}
                </p>
                <p className="text-xs text-green-600">
                  {metrics?.paidInvoices || 0} {t('paid')}
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
                <p className="text-sm text-gray-600">{t('Overdue Invoices')}</p>
                <p className="text-xl font-bold text-red-600">
                  {metrics?.overdueInvoices || 0}
                </p>
                <p className="text-xs text-red-600">
                  {formatCurrency(metrics?.pendingAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Collection Rate')}</p>
                <p className="text-xl font-bold text-purple-600">
                  {metrics?.paymentCollectionRate || 0}%
                </p>
                <p className="text-xs text-gray-600">
                  {formatCurrency(metrics?.averageInvoiceValue || 0)} {t('avg')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Revenue & Payments Trend')}</CardTitle>
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
                dataKey="payments" 
                stackId="1" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                name={t('Payments')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button className="h-20 flex flex-col items-center space-y-2">
          <PlusIcon className="h-6 w-6" />
          <span>{t('New Invoice')}</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
          <SendIcon className="h-6 w-6" />
          <span>{t('Send Reminders')}</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
          <DownloadIcon className="h-6 w-6" />
          <span>{t('Export Data')}</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
          <FileTextIcon className="h-6 w-6" />
          <span>{t('Generate Report')}</span>
        </Button>
      </div>
    </div>
  );

  const renderInvoicesTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('Search invoices...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Invoices')}</SelectItem>
                <SelectItem value="draft">{t('Draft')}</SelectItem>
                <SelectItem value="sent">{t('Sent')}</SelectItem>
                <SelectItem value="paid">{t('Paid')}</SelectItem>
                <SelectItem value="overdue">{t('Overdue')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <FilterIcon className="h-4 w-4 mr-2" />
              {t('More Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('Invoices')}</CardTitle>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('New Invoice')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('No invoices found')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Invoice')}
                    </th>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(invoice.issueDate).toLocaleDateString(i18n.language)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Student Name</div>
                        <div className="text-sm text-gray-500">Parent Name</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('Balance')}: {formatCurrency(invoice.balanceAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`inline-flex items-center space-x-1 ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span>{t(invoice.status)}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString(i18n.language)}
                        {invoice.status === 'overdue' && (
                          <div className="text-xs text-red-600">
                            {Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} {t('days overdue')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <DownloadIcon className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t('Generate Invoice')}</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  onClick={() => handleGenerateInvoice(invoice, 'pdf', 'en')}
                                  variant="outline"
                                >
                                  PDF (English)
                                </Button>
                                <Button
                                  onClick={() => handleGenerateInvoice(invoice, 'pdf', 'ar')}
                                  variant="outline"
                                >
                                  PDF (العربية)
                                </Button>
                                <Button
                                  onClick={() => handleGenerateInvoice(invoice, 'html', 'en')}
                                  variant="outline"
                                >
                                  HTML (English)
                                </Button>
                                <Button
                                  onClick={() => handleGenerateInvoice(invoice, 'excel', 'en')}
                                  variant="outline"
                                >
                                  Excel
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Payments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            {t('Payment tracking functionality will be implemented here')}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <FileTextIcon className="h-6 w-6" />
              <span>{t('Aging Report')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <TrendingUpIcon className="h-6 w-6" />
              <span>{t('Revenue Report')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <CalendarIcon className="h-6 w-6" />
              <span>{t('Monthly Statement')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <CreditCardIcon className="h-6 w-6" />
              <span>{t('Payment Summary')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <AlertTriangleIcon className="h-6 w-6" />
              <span>{t('Overdue Report')}</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <DownloadIcon className="h-6 w-6" />
              <span>{t('Tax Report')}</span>
            </Button>
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
          <p className="mt-4 text-gray-600">{t('Loading billing data...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Billing & Invoicing')}</h2>
          <p className="text-gray-600">{t('Manage invoices, payments, and financial reporting')}</p>
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
          
          <Button variant="outline" onClick={loadBillingData}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('Invoices')}</TabsTrigger>
          <TabsTrigger value="payments">{t('Payments')}</TabsTrigger>
          <TabsTrigger value="reports">{t('Reports')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="invoices">{renderInvoicesTab()}</TabsContent>
        <TabsContent value="payments">{renderPaymentsTab()}</TabsContent>
        <TabsContent value="reports">{renderReportsTab()}</TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {t('Invoice Details')} - {selectedInvoice.invoiceNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{t('Total Amount')}</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedInvoice.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('Balance Due')}</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(selectedInvoice.balanceAmount)}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => handleGenerateInvoice(selectedInvoice, 'pdf', 'en')}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  {t('Download PDF')}
                </Button>
                <Button variant="outline">
                  <SendIcon className="h-4 w-4 mr-2" />
                  {t('Send Email')}
                </Button>
                <Button variant="outline">
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  {t('Print')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};