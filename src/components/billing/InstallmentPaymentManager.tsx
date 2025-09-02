/**
 * InstallmentPaymentManager Component
 * Comprehensive payment plan management interface
 * Part of Story 2.3: Financial Management Module - Task 3
 */

import React, { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  usePaymentPlans,
  usePaymentPlanAnalytics,
  useCreatePaymentPlan,
  useModifyPaymentPlan,
  useProcessInstallmentPayment,
  usePaymentPlanPreview,
  useValidatePaymentPlanEligibility
} from '../../hooks/useInstallmentPayments'
import type { PaymentPlan, PaymentInstallment, PaymentMethod } from '../../types/financial-management'

// UI Components (using shadcn/ui pattern)
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

// Icons
import { 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Edit, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  FileText,
  Filter
} from 'lucide-react'

// ==============================================
// VALIDATION SCHEMAS
// ==============================================

const paymentPlanSchema = z.object({
  invoiceId: z.string().min(1, 'فاتورة مطلوبة / Invoice required'),
  numberOfInstallments: z.number().min(2, 'حد أدنى قسطين / Minimum 2 installments').max(24, 'حد أقصى 24 قسط / Maximum 24 installments'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  startDate: z.string().min(1, 'تاريخ البداية مطلوب / Start date required'),
  firstPaymentAmount: z.number().optional(),
  preferredPaymentMethod: z.enum(['cash', 'mada', 'stc_pay', 'bank_transfer']).optional(),
  autoPayEnabled: z.boolean().default(false),
  termsAccepted: z.boolean().refine(val => val === true, 'يجب قبول الشروط والأحكام / Must accept terms and conditions'),
  notes: z.string().optional()
})

const installmentPaymentSchema = z.object({
  amount: z.number().min(0.01, 'مبلغ صحيح مطلوب / Valid amount required'),
  paymentMethod: z.enum(['cash', 'mada', 'visa', 'mastercard', 'stc_pay', 'bank_transfer']),
  transactionId: z.string().optional(),
  receiptNumber: z.string().min(1, 'رقم الإيصال مطلوب / Receipt number required'),
  notes: z.string().optional()
})

type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>
type InstallmentPaymentFormData = z.infer<typeof installmentPaymentSchema>

// ==============================================
// MAIN COMPONENT
// ==============================================

interface InstallmentPaymentManagerProps {
  /** Language preference */
  language?: 'ar' | 'en'
  /** Optional invoice ID for creating payment plan */
  preSelectedInvoiceId?: string
  /** Component layout mode */
  mode?: 'dashboard' | 'standalone'
}

export const InstallmentPaymentManager: React.FC<InstallmentPaymentManagerProps> = ({
  language = 'en',
  preSelectedInvoiceId,
  mode = 'dashboard'
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'analytics' | 'create'>('overview')
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<PaymentInstallment | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'active' | 'completed' | 'cancelled' | 'defaulted',
    dateRange: { start: '', end: '' }
  })

  // Queries
  const { data: paymentPlans, isLoading: plansLoading } = usePaymentPlans(
    filters.status === 'all' ? {} : { status: filters.status }
  )
  const { data: analytics, isLoading: analyticsLoading } = usePaymentPlanAnalytics()
  
  // Mutations
  const createPaymentPlan = useCreatePaymentPlan()
  const modifyPaymentPlan = useModifyPaymentPlan()
  const processPayment = useProcessInstallmentPayment()
  const getPreview = usePaymentPlanPreview()
  const validateEligibility = useValidatePaymentPlanEligibility()

  // Forms
  const createForm = useForm<PaymentPlanFormData>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      invoiceId: preSelectedInvoiceId || '',
      numberOfInstallments: 6,
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      autoPayEnabled: false,
      termsAccepted: false
    }
  })

  const paymentForm = useForm<InstallmentPaymentFormData>({
    resolver: zodResolver(installmentPaymentSchema),
    defaultValues: {
      paymentMethod: 'cash'
    }
  })

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleCreatePaymentPlan = async (data: PaymentPlanFormData) => {
    try {
      const result = await createPaymentPlan.mutateAsync({
        ...data,
        ipAddress: '127.0.0.1', // Would get real IP
        userAgent: navigator.userAgent
      })

      if (result.success) {
        setShowCreateDialog(false)
        createForm.reset()
        // Switch to plans tab to see the new plan
        setActiveTab('plans')
      }
    } catch (error) {
      console.error('Error creating payment plan:', error)
    }
  }

  const handleProcessPayment = async (data: InstallmentPaymentFormData) => {
    if (!selectedInstallment) return

    try {
      await processPayment.mutateAsync({
        installmentId: selectedInstallment.id,
        paymentData: data
      })

      setShowPaymentDialog(false)
      paymentForm.reset()
      setSelectedInstallment(null)
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  const handlePreviewPlan = async () => {
    const formData = createForm.getValues()
    if (formData.invoiceId && formData.numberOfInstallments > 0) {
      // Would get invoice total amount
      const mockTotalAmount = 1200
      
      try {
        const preview = await getPreview.mutateAsync({
          totalAmount: mockTotalAmount,
          numberOfInstallments: formData.numberOfInstallments,
          frequency: formData.frequency,
          startDate: formData.startDate,
          firstPaymentAmount: formData.firstPaymentAmount
        })
        
        console.log('Payment plan preview:', preview)
      } catch (error) {
        console.error('Error generating preview:', error)
      }
    }
  }

  // ==============================================
  // UI HELPERS
  // ==============================================

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800', 
        label: language === 'ar' ? 'نشط' : 'Active',
        icon: CheckCircle 
      },
      completed: { 
        color: 'bg-blue-100 text-blue-800', 
        label: language === 'ar' ? 'مكتمل' : 'Completed',
        icon: CheckCircle 
      },
      cancelled: { 
        color: 'bg-gray-100 text-gray-800', 
        label: language === 'ar' ? 'ملغى' : 'Cancelled',
        icon: XCircle 
      },
      defaulted: { 
        color: 'bg-red-100 text-red-800', 
        label: language === 'ar' ? 'متعثر' : 'Defaulted',
        icon: AlertTriangle 
      }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    const IconComponent = config.icon

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number, currency = 'SAR') => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const methodLabels = {
      cash: language === 'ar' ? 'نقدي' : 'Cash',
      mada: language === 'ar' ? 'مدى' : 'MADA',
      visa: 'Visa',
      mastercard: 'Mastercard',
      stc_pay: language === 'ar' ? 'STC باي' : 'STC Pay',
      bank_transfer: language === 'ar' ? 'حوالة بنكية' : 'Bank Transfer',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
      insurance: language === 'ar' ? 'تأمين' : 'Insurance',
      check: language === 'ar' ? 'شيك' : 'Check'
    }
    return methodLabels[method] || method
  }

  // ==============================================
  // RENDER METHODS
  // ==============================================

  const renderOverviewTab = () => {
    if (analyticsLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'الخطط النشطة' : 'Active Plans'}
                </p>
                <p className="text-2xl font-bold">{analytics?.activePlans || 0}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'معدل الإنجاز' : 'Completion Rate'}
                </p>
                <p className="text-2xl font-bold">{analytics?.completionRate.toFixed(1) || 0}%</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'المبلغ المجمع' : 'Total Collected'}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics?.totalCollectedAmount || 0)}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'المتأخرات' : 'Overdue Amount'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(analytics?.overdueAmount || 0)}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPlansTab = () => {
    if (plansLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <Label>{language === 'ar' ? 'تصفية' : 'Filter'}</Label>
              </div>
              
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                  <SelectItem value="cancelled">{language === 'ar' ? 'ملغى' : 'Cancelled'}</SelectItem>
                  <SelectItem value="defaulted">{language === 'ar' ? 'متعثر' : 'Defaulted'}</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="ml-auto"
              >
                {language === 'ar' ? 'خطة جديدة' : 'New Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'خطط الدفع' : 'Payment Plans'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الطالب' : 'Student'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المبلغ الكلي' : 'Total Amount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الأقساط' : 'Installments'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التكرار' : 'Frequency'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!paymentPlans || paymentPlans.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {language === 'ar' ? 'لا توجد خطط دفع' : 'No payment plans found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-mono">{plan.invoiceId.slice(0, 8)}...</TableCell>
                      <TableCell>{plan.studentId.slice(0, 8)}...</TableCell>
                      <TableCell>{formatCurrency(plan.totalAmount)}</TableCell>
                      <TableCell>{plan.numberOfInstallments}</TableCell>
                      <TableCell>{plan.frequency}</TableCell>
                      <TableCell>{getStatusBadge(plan.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إنشاء خطة دفع جديدة' : 'Create New Payment Plan'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={createForm.handleSubmit(handleCreatePaymentPlan)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceId">
                {language === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}
              </Label>
              <Input
                id="invoiceId"
                {...createForm.register('invoiceId')}
                placeholder={language === 'ar' ? 'اختر الفاتورة' : 'Select invoice'}
              />
              {createForm.formState.errors.invoiceId && (
                <p className="text-sm text-red-600 mt-1">
                  {createForm.formState.errors.invoiceId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="numberOfInstallments">
                {language === 'ar' ? 'عدد الأقساط' : 'Number of Installments'}
              </Label>
              <Input
                id="numberOfInstallments"
                type="number"
                min={2}
                max={24}
                {...createForm.register('numberOfInstallments', { valueAsNumber: true })}
              />
              {createForm.formState.errors.numberOfInstallments && (
                <p className="text-sm text-red-600 mt-1">
                  {createForm.formState.errors.numberOfInstallments.message}
                </p>
              )}
            </div>

            <div>
              <Label>{language === 'ar' ? 'التكرار' : 'Frequency'}</Label>
              <Select
                value={createForm.watch('frequency')}
                onValueChange={(value) => createForm.setValue('frequency', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                  <SelectItem value="biweekly">{language === 'ar' ? 'نصف شهري' : 'Biweekly'}</SelectItem>
                  <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">
                {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
              </Label>
              <Input
                id="startDate"
                type="date"
                {...createForm.register('startDate')}
              />
              {createForm.formState.errors.startDate && (
                <p className="text-sm text-red-600 mt-1">
                  {createForm.formState.errors.startDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="termsAccepted"
              {...createForm.register('termsAccepted')}
            />
            <Label htmlFor="termsAccepted" className="text-sm">
              {language === 'ar' 
                ? 'أوافق على الشروط والأحكام' 
                : 'I accept the terms and conditions'}
            </Label>
          </div>
          {createForm.formState.errors.termsAccepted && (
            <p className="text-sm text-red-600">
              {createForm.formState.errors.termsAccepted.message}
            </p>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handlePreviewPlan}
              disabled={getPreview.isPending}
            >
              {language === 'ar' ? 'معاينة' : 'Preview'}
            </Button>
            <Button 
              type="submit" 
              disabled={createPaymentPlan.isPending}
              className="flex-1"
            >
              {createPaymentPlan.isPending 
                ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                : (language === 'ar' ? 'إنشاء خطة الدفع' : 'Create Payment Plan')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  // ==============================================
  // MAIN RENDER
  // ==============================================

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'إدارة خطط الدفع المقسط' : 'Installment Payment Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' 
              ? 'إدارة خطط الدفع المقسط والأقساط المجدولة' 
              : 'Manage payment plans and scheduled installments'}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <CreditCard className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'خطة جديدة' : 'New Plan'}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="plans">
            {language === 'ar' ? 'خطط الدفع' : 'Payment Plans'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
          <TabsTrigger value="create">
            {language === 'ar' ? 'إنشاء خطة' : 'Create Plan'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="plans">
          {renderPlansTab()}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12 text-gray-500">
            {language === 'ar' ? 'التحليلات قيد التطوير' : 'Analytics coming soon'}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'إنشاء خطة دفع جديدة' : 'Create New Payment Plan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Would implement inline form here */}
              <p className="text-gray-500">
                {language === 'ar' ? 'استخدم زر "خطة جديدة" أعلاه' : 'Use "New Plan" button above'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {renderCreateDialog()}
    </div>
  )
}

export default InstallmentPaymentManager