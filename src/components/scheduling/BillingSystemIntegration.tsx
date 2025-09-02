import React, { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  CreditCard, DollarSign, Receipt, AlertCircle, 
  CheckCircle, Clock, TrendingUp, TrendingDown,
  Calculator, FileText, Download, Eye, Edit2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBillingIntegration } from '@/hooks/useSchedulingIntegration'
import { cn } from '@/lib/utils'
import type { 
  ScheduledSession, 
  BillingRecord, 
  PaymentPlan, 
  Invoice,
  Student 
} from '@/types/scheduling'

/**
 * Billing System Integration Component
 * 
 * Manages session billing, payment tracking, financial analytics,
 * and automated invoice generation with real-time payment validation.
 */

interface BillingSystemIntegrationProps {
  sessions: ScheduledSession[]
  billingRecords: BillingRecord[]
  paymentPlans: PaymentPlan[]
  invoices: Invoice[]
  students: Student[]
  dateRange: { start: Date; end: Date }
  onBillingUpdate?: (record: BillingRecord) => void
  onPaymentCreate?: (payment: any) => void
  onInvoiceGenerate?: (invoice: Invoice) => void
  readOnly?: boolean
}

interface BillingAnalytics {
  totalRevenue: number
  pendingPayments: number
  overdueAmount: number
  collectionRate: number
  averageSessionValue: number
  monthlyRecurring: number
  paymentTrends: { month: string; revenue: number; sessions: number }[]
}

interface PaymentStatus {
  student_id: string
  total_due: number
  paid_amount: number
  pending_amount: number
  overdue_amount: number
  payment_status: 'current' | 'overdue' | 'delinquent'
  last_payment_date: string
  next_payment_due: string
  credit_balance: number
}

export function BillingSystemIntegration({
  sessions,
  billingRecords,
  paymentPlans,
  invoices,
  students,
  dateRange,
  onBillingUpdate,
  onPaymentCreate,
  onInvoiceGenerate,
  readOnly = false
}: BillingSystemIntegrationProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS
  const { mutate: updateBillingSystem, isPending } = useBillingIntegration()

  const [selectedTab, setSelectedTab] = useState<'overview' | 'sessions' | 'payments' | 'analytics'>('overview')
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all')
  const [showBillingDialog, setShowBillingDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null)

  // Calculate billing analytics
  const billingAnalytics = useMemo((): BillingAnalytics => {
    const totalRevenue = billingRecords
      .filter(record => record.payment_status === 'paid')
      .reduce((sum, record) => sum + record.amount, 0)

    const pendingPayments = billingRecords
      .filter(record => record.payment_status === 'pending')
      .reduce((sum, record) => sum + record.amount, 0)

    const overdueAmount = billingRecords
      .filter(record => record.payment_status === 'overdue')
      .reduce((sum, record) => sum + record.amount, 0)

    const paidRecords = billingRecords.filter(r => r.payment_status === 'paid').length
    const totalRecords = billingRecords.length
    const collectionRate = totalRecords > 0 ? (paidRecords / totalRecords) * 100 : 0

    const averageSessionValue = totalRecords > 0 ? totalRevenue / paidRecords : 0

    const monthlyRecurring = paymentPlans
      .filter(plan => plan.payment_frequency === 'monthly')
      .reduce((sum, plan) => sum + plan.amount, 0)

    // Calculate monthly trends
    const monthlyData = new Map<string, { revenue: number; sessions: number }>()
    billingRecords.forEach(record => {
      if (record.payment_status === 'paid') {
        const month = format(new Date(record.billing_date), 'yyyy-MM')
        const existing = monthlyData.get(month) || { revenue: 0, sessions: 0 }
        monthlyData.set(month, {
          revenue: existing.revenue + record.amount,
          sessions: existing.sessions + 1
        })
      }
    })

    const paymentTrends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return {
      totalRevenue,
      pendingPayments,
      overdueAmount,
      collectionRate,
      averageSessionValue,
      monthlyRecurring,
      paymentTrends
    }
  }, [billingRecords, paymentPlans])

  // Calculate payment status for each student
  const paymentStatuses = useMemo((): Map<string, PaymentStatus> => {
    const statusMap = new Map<string, PaymentStatus>()

    students.forEach(student => {
      const studentRecords = billingRecords.filter(r => r.student_id === student.id)
      const studentPlans = paymentPlans.filter(p => p.student_id === student.id)

      const totalDue = studentRecords.reduce((sum, record) => sum + record.amount, 0)
      const paidAmount = studentRecords
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, record) => sum + record.amount, 0)
      const pendingAmount = studentRecords
        .filter(r => r.payment_status === 'pending')
        .reduce((sum, record) => sum + record.amount, 0)
      const overdueAmount = studentRecords
        .filter(r => r.payment_status === 'overdue')
        .reduce((sum, record) => sum + record.amount, 0)

      const lastPaymentRecord = studentRecords
        .filter(r => r.payment_status === 'paid')
        .sort((a, b) => new Date(b.payment_date || b.billing_date).getTime() - new Date(a.payment_date || a.billing_date).getTime())[0]

      const activePlan = studentPlans.find(p => p.status === 'active')
      const nextPaymentDue = activePlan?.next_payment_date || ''

      let paymentStatus: 'current' | 'overdue' | 'delinquent' = 'current'
      if (overdueAmount > 0) {
        paymentStatus = overdueAmount > totalDue * 0.5 ? 'delinquent' : 'overdue'
      }

      statusMap.set(student.id, {
        student_id: student.id,
        total_due: totalDue,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        overdue_amount: overdueAmount,
        payment_status: paymentStatus,
        last_payment_date: lastPaymentRecord?.payment_date || lastPaymentRecord?.billing_date || '',
        next_payment_due: nextPaymentDue,
        credit_balance: activePlan?.credit_balance || 0
      })
    })

    return statusMap
  }, [students, billingRecords, paymentPlans])

  // Filter sessions based on billing criteria
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (selectedStudent !== 'all' && session.student_id !== selectedStudent) {
        return false
      }

      const sessionBilling = billingRecords.find(r => r.session_id === session.id)
      if (paymentFilter !== 'all') {
        if (!sessionBilling) return paymentFilter === 'pending'
        return sessionBilling.payment_status === paymentFilter
      }

      return true
    })
  }, [sessions, selectedStudent, paymentFilter, billingRecords])

  // Handle billing record updates
  const handleBillingUpdate = useCallback(async (sessionId: string, billingData: Partial<BillingRecord>) => {
    try {
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return

      const billingRecord: BillingRecord = {
        id: `billing-${Date.now()}`,
        session_id: sessionId,
        student_id: session.student_id,
        therapist_id: session.therapist_id,
        billing_date: format(new Date(), 'yyyy-MM-dd'),
        amount: billingData.amount || 0,
        currency: 'SAR',
        payment_status: billingData.payment_status || 'pending',
        payment_method: billingData.payment_method || 'cash',
        payment_date: billingData.payment_date,
        invoice_number: billingData.invoice_number,
        notes: billingData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await updateBillingSystem(billingRecord)
      onBillingUpdate?.(billingRecord)

    } catch (error) {
      console.error('Failed to update billing record:', error)
    }
  }, [sessions, updateBillingSystem, onBillingUpdate])

  // Generate invoice for session
  const handleInvoiceGeneration = useCallback(async (sessionIds: string[]) => {
    try {
      const invoice: Invoice = {
        id: `invoice-${Date.now()}`,
        invoice_number: `INV-${Date.now()}`,
        student_id: sessions.find(s => sessionIds.includes(s.id))?.student_id || '',
        session_ids: sessionIds,
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        currency: 'SAR',
        payment_status: 'pending',
        payment_terms: 'Net 30',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Calculate amounts from sessions
      const sessionAmounts = sessionIds.map(sessionId => {
        const billingRecord = billingRecords.find(r => r.session_id === sessionId)
        return billingRecord?.amount || 0
      })

      invoice.subtotal = sessionAmounts.reduce((sum, amount) => sum + amount, 0)
      invoice.tax_amount = invoice.subtotal * 0.15 // 15% VAT
      invoice.total_amount = invoice.subtotal + invoice.tax_amount - invoice.discount_amount

      await updateBillingSystem(invoice)
      onInvoiceGenerate?.(invoice)

    } catch (error) {
      console.error('Failed to generate invoice:', error)
    }
  }, [sessions, billingRecords, updateBillingSystem, onInvoiceGenerate])

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getStudentPaymentStatusColor = (status: 'current' | 'overdue' | 'delinquent') => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-yellow-100 text-yellow-800'
      case 'delinquent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {language === 'ar' ? 'تكامل نظام الفوترة' : 'Billing System Integration'}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBillingDialog(true)}
                disabled={readOnly}
              >
                <Calculator className="w-4 h-4 mr-1" />
                {language === 'ar' ? 'حساب الفاتورة' : 'Calculate Billing'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sessionIds = filteredSessions
                    .filter(s => !billingRecords.find(r => r.session_id === s.id))
                    .map(s => s.id)
                  handleInvoiceGeneration(sessionIds)
                }}
                disabled={readOnly}
              >
                <FileText className="w-4 h-4 mr-1" />
                {language === 'ar' ? 'إنشاء فاتورة' : 'Generate Invoice'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                    </p>
                    <p className="text-2xl font-bold">
                      {billingAnalytics.totalRevenue.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'مدفوعات معلقة' : 'Pending Payments'}
                    </p>
                    <p className="text-2xl font-bold">
                      {billingAnalytics.pendingPayments.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'متأخرات' : 'Overdue Amount'}
                    </p>
                    <p className="text-2xl font-bold">
                      {billingAnalytics.overdueAmount.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'معدل التحصيل' : 'Collection Rate'}
                    </p>
                    <p className="text-2xl font-bold">
                      {billingAnalytics.collectionRate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>{language === 'ar' ? 'الطالب:' : 'Student:'}</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الطلاب' : 'All Students'}
                  </SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name_ar || student.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>{language === 'ar' ? 'حالة الدفع:' : 'Payment Status:'}</Label>
              <Select value={paymentFilter} onValueChange={(value: any) => setPaymentFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                  <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                  <SelectItem value="overdue">{language === 'ar' ? 'متأخر' : 'Overdue'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {language === 'ar' ? 'الجلسات' : 'Sessions'}
          </TabsTrigger>
          <TabsTrigger value="payments">
            {language === 'ar' ? 'المدفوعات' : 'Payments'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Student Payment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {language === 'ar' ? 'حالة مدفوعات الطلاب' : 'Student Payment Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(paymentStatuses.entries()).map(([studentId, status]) => {
                  const student = students.find(s => s.id === studentId)
                  if (!student) return null

                  return (
                    <div key={studentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {student.name_ar || student.name_en}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'آخر دفعة:' : 'Last payment:'} {
                              status.last_payment_date 
                                ? format(new Date(status.last_payment_date), 'MMM dd, yyyy', { locale })
                                : (language === 'ar' ? 'لا يوجد' : 'None')
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {status.total_due.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'مدفوع:' : 'Paid:'} {status.paid_amount.toLocaleString()}
                          </div>
                        </div>

                        <Badge className={cn('text-xs', getStudentPaymentStatusColor(status.payment_status))}>
                          {status.payment_status === 'current' && (language === 'ar' ? 'حديث' : 'Current')}
                          {status.payment_status === 'overdue' && (language === 'ar' ? 'متأخر' : 'Overdue')}
                          {status.payment_status === 'delinquent' && (language === 'ar' ? 'مُتعثر' : 'Delinquent')}
                        </Badge>

                        {status.overdue_amount > 0 && (
                          <Alert className="p-2 border-red-200">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription className="text-xs">
                              {language === 'ar' ? 'متأخرات:' : 'Overdue:'} {status.overdue_amount} {language === 'ar' ? 'ريال' : 'SAR'}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {/* Session Billing List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {language === 'ar' ? 'فوترة الجلسات' : 'Session Billing'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSessions.map(session => {
                  const billingRecord = billingRecords.find(r => r.session_id === session.id)
                  const student = students.find(s => s.id === session.student_id)

                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {student?.name_ar || student?.name_en}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(session.session_date), 'MMM dd, yyyy', { locale })} • {
                              session.start_time
                            } - {session.end_time}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {billingRecord?.amount?.toLocaleString() || '0'} {language === 'ar' ? 'ريال' : 'SAR'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.session_type}
                          </div>
                        </div>

                        <Badge className={cn(
                          'text-xs',
                          billingRecord 
                            ? getPaymentStatusColor(billingRecord.payment_status)
                            : 'bg-gray-100 text-gray-800'
                        )}>
                          {billingRecord?.payment_status || 'unbilled'}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRecord(billingRecord || {
                                session_id: session.id,
                                student_id: session.student_id,
                                amount: 0,
                                payment_status: 'pending'
                              } as BillingRecord)
                              setShowBillingDialog(true)
                            }}
                            disabled={readOnly}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => console.log('View details:', session.id)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          {/* Payment Plans and Records */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'خطط الدفع النشطة' : 'Active Payment Plans'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentPlans.map(plan => {
                    const student = students.find(s => s.id === plan.student_id)
                    return (
                      <div key={plan.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {student?.name_ar || student?.name_en}
                          </div>
                          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                            {plan.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {language === 'ar' ? 'المبلغ:' : 'Amount:'}
                            </span> {plan.amount} {language === 'ar' ? 'ريال' : 'SAR'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {language === 'ar' ? 'التكرار:' : 'Frequency:'}
                            </span> {plan.payment_frequency}
                          </div>
                        </div>

                        {plan.next_payment_date && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {language === 'ar' ? 'الدفعة التالية:' : 'Next payment:'} {
                              format(new Date(plan.next_payment_date), 'MMM dd, yyyy', { locale })
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'المعاملات الحديثة' : 'Recent Transactions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {billingRecords
                    .filter(record => record.payment_date)
                    .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())
                    .slice(0, 10)
                    .map(record => {
                      const student = students.find(s => s.id === record.student_id)
                      return (
                        <div key={record.id} className="flex items-center justify-between p-2 border-b">
                          <div>
                            <div className="text-sm font-medium">
                              {student?.name_ar || student?.name_en}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(record.payment_date!), 'MMM dd, yyyy', { locale })}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {record.amount} {language === 'ar' ? 'ريال' : 'SAR'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.payment_method}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          {/* Financial Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'الاتجاهات الشهرية' : 'Monthly Trends'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingAnalytics.paymentTrends.map((trend, index) => (
                    <div key={trend.month} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {format(new Date(trend.month + '-01'), 'MMM yyyy', { locale })}
                        </span>
                        <span className="font-medium">
                          {trend.revenue.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                      <Progress 
                        value={(trend.revenue / Math.max(...billingAnalytics.paymentTrends.map(t => t.revenue))) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        {trend.sessions} {language === 'ar' ? 'جلسة' : 'sessions'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'المقاييس الرئيسية' : 'Key Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'متوسط قيمة الجلسة' : 'Average Session Value'}
                    </span>
                    <span className="font-medium">
                      {billingAnalytics.averageSessionValue.toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الإيرادات الشهرية المتكررة' : 'Monthly Recurring Revenue'}
                    </span>
                    <span className="font-medium">
                      {billingAnalytics.monthlyRecurring.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}
                    </span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {language === 'ar' ? 'توزيع الدفعات' : 'Payment Distribution'}
                    </div>
                    
                    <div className="space-y-1">
                      {[
                        { status: 'paid', color: 'bg-green-500' },
                        { status: 'pending', color: 'bg-yellow-500' },
                        { status: 'overdue', color: 'bg-red-500' }
                      ].map(item => {
                        const count = billingRecords.filter(r => r.payment_status === item.status).length
                        const percentage = (count / billingRecords.length) * 100 || 0
                        
                        return (
                          <div key={item.status} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-xs flex-1">
                              {item.status === 'paid' && (language === 'ar' ? 'مدفوع' : 'Paid')}
                              {item.status === 'pending' && (language === 'ar' ? 'معلق' : 'Pending')}
                              {item.status === 'overdue' && (language === 'ar' ? 'متأخر' : 'Overdue')}
                            </span>
                            <span className="text-xs font-medium">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord?.id 
                ? (language === 'ar' ? 'تعديل سجل الفوترة' : 'Edit Billing Record')
                : (language === 'ar' ? 'إضافة سجل فوترة' : 'Add Billing Record')
              }
            </DialogTitle>
          </DialogHeader>
          
          {editingRecord && (
            <BillingRecordForm
              record={editingRecord}
              onSave={(data) => {
                handleBillingUpdate(editingRecord.session_id, data)
                setShowBillingDialog(false)
                setEditingRecord(null)
              }}
              onCancel={() => {
                setShowBillingDialog(false)
                setEditingRecord(null)
              }}
              isLoading={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Billing Record Form Component
interface BillingRecordFormProps {
  record: Partial<BillingRecord>
  onSave: (data: Partial<BillingRecord>) => void
  onCancel: () => void
  isLoading?: boolean
}

function BillingRecordForm({ 
  record, 
  onSave, 
  onCancel, 
  isLoading = false 
}: BillingRecordFormProps) {
  const { language } = useLanguage()
  const [formData, setFormData] = useState<Partial<BillingRecord>>(record)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.amount || 0}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label>{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</Label>
          <Select
            value={formData.payment_status || 'pending'}
            onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
              <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
              <SelectItem value="overdue">{language === 'ar' ? 'متأخر' : 'Overdue'}</SelectItem>
              <SelectItem value="refunded">{language === 'ar' ? 'مُسترد' : 'Refunded'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
        <Select
          value={formData.payment_method || 'cash'}
          onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">{language === 'ar' ? 'نقد' : 'Cash'}</SelectItem>
            <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
            <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
            <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isLoading}>
          {isLoading && <Clock className="w-4 h-4 mr-2 animate-spin" />}
          {language === 'ar' ? 'حفظ' : 'Save'}
        </Button>
      </div>
    </div>
  )
}