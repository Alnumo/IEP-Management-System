import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import {
  CalendarIcon, CreditCardIcon, AlertTriangleIcon, CheckCircleIcon,
  PlusIcon, EditIcon, EyeIcon, RefreshCwIcon, SendIcon,
  DollarSignIcon, ClockIcon, TrendingUpIcon
} from 'lucide-react';
import { PaymentPlan, PaymentInstallment, billingService } from '../../services/billing-service';

interface PaymentPlanSummary {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  defaultedPlans: number;
  totalAmount: number;
  collectedAmount: number;
  overdueInstallments: number;
}

interface CreatePaymentPlanForm {
  invoiceId: string;
  studentId: string;
  totalAmount: number;
  numberOfInstallments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  downPayment: number;
}

export const PaymentPlanManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [summary, setSummary] = useState<PaymentPlanSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePaymentPlanForm>({
    invoiceId: '',
    studentId: '',
    totalAmount: 0,
    numberOfInstallments: 3,
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    downPayment: 0
  });

  useEffect(() => {
    loadPaymentPlans();
  }, []);

  const loadPaymentPlans = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockPlans: PaymentPlan[] = [
        {
          id: 'plan_1',
          invoiceId: 'inv_1',
          studentId: 'stu_1',
          totalAmount: 3000,
          numberOfInstallments: 3,
          installmentAmount: 1000,
          frequency: 'monthly',
          startDate: '2024-09-01',
          status: 'active',
          installments: [
            {
              id: 'inst_1',
              paymentPlanId: 'plan_1',
              installmentNumber: 1,
              amount: 1000,
              dueDate: '2024-09-01',
              paidDate: '2024-08-31',
              paidAmount: 1000,
              status: 'paid',
              paymentMethod: 'bank_transfer',
              receiptNumber: 'REC-2024-00101'
            },
            {
              id: 'inst_2',
              paymentPlanId: 'plan_1',
              installmentNumber: 2,
              amount: 1000,
              dueDate: '2024-10-01',
              status: 'pending'
            },
            {
              id: 'inst_3',
              paymentPlanId: 'plan_1',
              installmentNumber: 3,
              amount: 1000,
              dueDate: '2024-11-01',
              status: 'pending'
            }
          ],
          createdAt: '2024-08-15T00:00:00Z',
          updatedAt: '2024-08-31T00:00:00Z'
        },
        {
          id: 'plan_2',
          invoiceId: 'inv_2',
          studentId: 'stu_2',
          totalAmount: 2400,
          numberOfInstallments: 4,
          installmentAmount: 600,
          frequency: 'biweekly',
          startDate: '2024-08-01',
          status: 'defaulted',
          installments: [
            {
              id: 'inst_4',
              paymentPlanId: 'plan_2',
              installmentNumber: 1,
              amount: 600,
              dueDate: '2024-08-01',
              paidDate: '2024-08-01',
              paidAmount: 600,
              status: 'paid',
              paymentMethod: 'cash'
            },
            {
              id: 'inst_5',
              paymentPlanId: 'plan_2',
              installmentNumber: 2,
              amount: 600,
              dueDate: '2024-08-15',
              status: 'overdue'
            },
            {
              id: 'inst_6',
              paymentPlanId: 'plan_2',
              installmentNumber: 3,
              amount: 600,
              dueDate: '2024-09-01',
              status: 'pending'
            },
            {
              id: 'inst_7',
              paymentPlanId: 'plan_2',
              installmentNumber: 4,
              amount: 600,
              dueDate: '2024-09-15',
              status: 'pending'
            }
          ],
          createdAt: '2024-07-20T00:00:00Z',
          updatedAt: '2024-08-20T00:00:00Z'
        }
      ];

      setPaymentPlans(mockPlans);

      // Calculate summary
      const totalPlans = mockPlans.length;
      const activePlans = mockPlans.filter(p => p.status === 'active').length;
      const completedPlans = mockPlans.filter(p => p.status === 'completed').length;
      const defaultedPlans = mockPlans.filter(p => p.status === 'defaulted').length;
      
      const totalAmount = mockPlans.reduce((sum, p) => sum + p.totalAmount, 0);
      const collectedAmount = mockPlans.reduce((sum, p) => 
        sum + p.installments.reduce((instSum, inst) => 
          instSum + (inst.paidAmount || 0), 0), 0);

      const overdueInstallments = mockPlans.reduce((count, p) => 
        count + p.installments.filter(inst => inst.status === 'overdue').length, 0);

      setSummary({
        totalPlans,
        activePlans,
        completedPlans,
        defaultedPlans,
        totalAmount,
        collectedAmount,
        overdueInstallments
      });

    } catch (error) {
      console.error('Failed to load payment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentPlan = async () => {
    try {
      const result = await billingService.createPaymentPlan(
        createForm.invoiceId,
        createForm.studentId,
        createForm.totalAmount - createForm.downPayment,
        createForm.numberOfInstallments,
        createForm.frequency,
        createForm.startDate
      );

      if (result) {
        await loadPaymentPlans();
        setShowCreateDialog(false);
        setCreateForm({
          invoiceId: '',
          studentId: '',
          totalAmount: 0,
          numberOfInstallments: 3,
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          downPayment: 0
        });
      }
    } catch (error) {
      console.error('Failed to create payment plan:', error);
    }
  };

  const calculatePlanProgress = (plan: PaymentPlan): number => {
    const paidAmount = plan.installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    return (paidAmount / plan.totalAmount) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'defaulted': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInstallmentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'overdue': return <AlertTriangleIcon className="h-4 w-4" />;
      default: return <CreditCardIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCardIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Active Plans')}</p>
                <p className="text-xl font-bold text-blue-600">
                  {summary?.activePlans || 0}
                </p>
                <p className="text-xs text-gray-600">
                  {t('of')} {summary?.totalPlans || 0} {t('total')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSignIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Total Amount')}</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summary?.totalAmount || 0)}
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
                <p className="text-sm text-gray-600">{t('Collected')}</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(summary?.collectedAmount || 0)}
                </p>
                <p className="text-xs text-green-600">
                  {summary?.totalAmount ? Math.round((summary.collectedAmount / summary.totalAmount) * 100) : 0}%
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
                <p className="text-sm text-gray-600">{t('Overdue')}</p>
                <p className="text-xl font-bold text-red-600">
                  {summary?.overdueInstallments || 0}
                </p>
                <p className="text-xs text-gray-600">
                  {summary?.defaultedPlans || 0} {t('defaulted')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payment Plans */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('Recent Payment Plans')}</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('New Payment Plan')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentPlans.slice(0, 5).map(plan => (
              <div key={plan.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">Plan {plan.id.slice(-4)}</h4>
                    <p className="text-sm text-gray-600">
                      {plan.numberOfInstallments} {t('installments')} • {t(plan.frequency)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(plan.status)}>
                    {t(plan.status)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('Progress')}</span>
                    <span>{formatCurrency(plan.installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0))} / {formatCurrency(plan.totalAmount)}</span>
                  </div>
                  <Progress value={calculatePlanProgress(plan)} className="h-2" />
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-600">
                    {t('Next payment')}: {new Date(
                      plan.installments.find(inst => inst.status === 'pending')?.dueDate || plan.startDate
                    ).toLocaleDateString(i18n.language)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {t('View')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPlansTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('Payment Plans')}</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('New Payment Plan')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Plan')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Student')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Progress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Next Payment')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentPlans.map((plan) => {
                  const nextInstallment = plan.installments.find(inst => inst.status === 'pending' || inst.status === 'overdue');
                  const progress = calculatePlanProgress(plan);
                  
                  return (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Plan {plan.id.slice(-4)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plan.numberOfInstallments} {t('installments')} • {t(plan.frequency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Student Name</div>
                        <div className="text-sm text-gray-500">ID: {plan.studentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(plan.totalAmount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(plan.installmentAmount)} {t('per installment')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{Math.round(progress)}%</span>
                            <span>{plan.installments.filter(i => i.status === 'paid').length}/{plan.numberOfInstallments}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(plan.status)}>
                          {t(plan.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {nextInstallment ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {formatCurrency(nextInstallment.amount)}
                            </div>
                            <div className={`text-xs ${nextInstallment.status === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                              {new Date(nextInstallment.dueDate).toLocaleDateString(i18n.language)}
                              {nextInstallment.status === 'overdue' && ` (${t('overdue')})`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-green-600">{t('Completed')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          {nextInstallment && (
                            <Button variant="ghost" size="sm">
                              <SendIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInstallmentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('All Installments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Plan')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Installment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Due Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Payment Details')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentPlans.flatMap(plan => 
                  plan.installments.map(installment => (
                    <tr key={installment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Plan {plan.id.slice(-4)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t(plan.frequency)} • {plan.numberOfInstallments} {t('installments')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{installment.installmentNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(installment.amount)}
                        </div>
                        {installment.paidAmount && installment.paidAmount !== installment.amount && (
                          <div className="text-sm text-green-600">
                            {t('Paid')}: {formatCurrency(installment.paidAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(installment.dueDate).toLocaleDateString(i18n.language)}
                        </div>
                        {installment.status === 'overdue' && (
                          <div className="text-sm text-red-600">
                            {Math.ceil((Date.now() - new Date(installment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} {t('days overdue')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`inline-flex items-center space-x-1 ${getInstallmentStatusColor(installment.status)}`}>
                          {getStatusIcon(installment.status)}
                          <span>{t(installment.status)}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {installment.paidDate ? (
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {new Date(installment.paidDate).toLocaleDateString(i18n.language)}
                            </div>
                            <div className="text-gray-500">
                              {installment.paymentMethod && t(installment.paymentMethod)}
                            </div>
                            {installment.receiptNumber && (
                              <div className="text-xs text-gray-500">
                                {installment.receiptNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{t('Not paid')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          {installment.status === 'pending' || installment.status === 'overdue' ? (
                            <Button variant="outline" size="sm">
                              <CreditCardIcon className="h-4 w-4 mr-1" />
                              {t('Record Payment')}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
          <p className="mt-4 text-gray-600">{t('Loading payment plans...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Payment Plan Management')}</h2>
          <p className="text-gray-600">{t('Manage installment payment plans and track collections')}</p>
        </div>
        
        <Button variant="outline" onClick={loadPaymentPlans}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('Payment Plans')}</TabsTrigger>
          <TabsTrigger value="installments">{t('Installments')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="plans">{renderPlansTab()}</TabsContent>
        <TabsContent value="installments">{renderInstallmentsTab()}</TabsContent>
      </Tabs>

      {/* Create Payment Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Create Payment Plan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalAmount">{t('Total Amount')}</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={createForm.totalAmount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="downPayment">{t('Down Payment')}</Label>
                <Input
                  id="downPayment"
                  type="number"
                  value={createForm.downPayment}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, downPayment: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numberOfInstallments">{t('Number of Installments')}</Label>
                <Select
                  value={createForm.numberOfInstallments.toString()}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, numberOfInstallments: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 {t('installments')}</SelectItem>
                    <SelectItem value="3">3 {t('installments')}</SelectItem>
                    <SelectItem value="4">4 {t('installments')}</SelectItem>
                    <SelectItem value="6">6 {t('installments')}</SelectItem>
                    <SelectItem value="12">12 {t('installments')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="frequency">{t('Frequency')}</Label>
                <Select
                  value={createForm.frequency}
                  onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                    <SelectItem value="biweekly">{t('Bi-weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="startDate">{t('Start Date')}</Label>
              <Input
                id="startDate"
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            {/* Payment Plan Preview */}
            {createForm.totalAmount > 0 && createForm.numberOfInstallments > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('Payment Plan Preview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('Total Amount')}:</span>
                      <span className="font-semibold">{formatCurrency(createForm.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Down Payment')}:</span>
                      <span className="font-semibold">{formatCurrency(createForm.downPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Amount to Finance')}:</span>
                      <span className="font-semibold">{formatCurrency(createForm.totalAmount - createForm.downPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Installment Amount')}:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency((createForm.totalAmount - createForm.downPayment) / createForm.numberOfInstallments)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t('Cancel')}
              </Button>
              <Button onClick={handleCreatePaymentPlan}>
                {t('Create Payment Plan')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Plan Detail Dialog */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {t('Payment Plan Details')} - Plan {selectedPlan.id.slice(-4)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{t('Total Amount')}</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedPlan.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('Progress')}</p>
                  <p className="text-xl font-bold text-green-600">{Math.round(calculatePlanProgress(selectedPlan))}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('Status')}</p>
                  <Badge className={getStatusColor(selectedPlan.status)}>
                    {t(selectedPlan.status)}
                  </Badge>
                </div>
              </div>

              {/* Installments List */}
              <div>
                <h4 className="font-medium mb-3">{t('Installment Schedule')}</h4>
                <div className="space-y-3">
                  {selectedPlan.installments.map(installment => (
                    <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="font-medium">#{installment.installmentNumber}</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatCurrency(installment.amount)}</div>
                          <div className="text-sm text-gray-600">
                            {t('Due')}: {new Date(installment.dueDate).toLocaleDateString(i18n.language)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getInstallmentStatusColor(installment.status)}>
                          {t(installment.status)}
                        </Badge>
                        {installment.status === 'paid' && installment.receiptNumber && (
                          <span className="text-sm text-gray-600">
                            {installment.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};