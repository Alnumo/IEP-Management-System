// Billing and Financial Management Types - Story 2.3
// Integration with existing financial-management.ts

export * from './financial-management'

// Additional types for UI components and hooks
export interface BillingDashboardData {
  totalRevenue: number
  totalOutstanding: number
  overdueAmount: number
  paidThisMonth: number
  revenueGrowth: number
  collectionRate: number
  
  // Quick stats
  invoicesThisMonth: number
  paymentsThisMonth: number
  activePaymentPlans: number
  overdueInvoices: number
  
  // Charts data
  monthlyRevenue: Array<{
    month: string
    revenue: number
    payments: number
  }>
  
  paymentMethodDistribution: Array<{
    method: string
    amount: number
    count: number
  }>
}

export interface InvoiceFormData {
  studentId: string
  serviceItems: Array<{
    serviceType: string
    quantity: number
    unitPrice: number
    description: string
    sessionId?: string
  }>
  dueDate: string
  paymentTerms: number
  discountAmount?: number
  notes?: string
  insuranceProvider?: string
  insuranceCoverage?: number
}

export interface PaymentFormData {
  invoiceId: string
  amount: number
  paymentMethod: string
  paymentDate: string
  referenceNumber?: string
  notes?: string
}

export interface InstallmentPlanFormData {
  invoiceId: string
  numberOfInstallments: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  firstPaymentAmount?: number
  termsAccepted: boolean
}

export interface FinancialReportFilters {
  dateRange: {
    start: string
    end: string
  }
  studentIds?: string[]
  therapistIds?: string[]
  serviceTypes?: string[]
  paymentMethods?: string[]
  paymentStatus?: string[]
  invoiceStatus?: string[]
}

// Enhanced installment payment types for Story 4.2
export interface InstallmentPlan {
  id: string
  subscriptionId: string
  invoiceId: string
  studentId: string
  totalAmount: number
  numberOfInstallments: number
  installmentAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  status: 'active' | 'completed' | 'cancelled' | 'defaulted'
  termsAccepted: boolean
  termsAcceptedDate?: string
  lateFeesEnabled: boolean
  lateFeeAmount?: number
  gracePeriodDays: number
  reminderSettings: {
    daysBefore: number[]
    daysAfter: number[]
    methods: ('email' | 'sms' | 'whatsapp' | 'in_app')[]
  }
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface InstallmentPayment {
  id: string
  installmentPlanId: string
  installmentNumber: number
  amount: number
  dueDate: string
  paidDate?: string
  paidAmount?: number
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  paymentMethod?: string
  transactionId?: string
  receiptNumber?: string
  lateFeeApplied?: boolean
  lateFeeAmount?: number
  remindersSent: Array<{
    sentDate: string
    method: 'email' | 'sms' | 'whatsapp' | 'in_app'
    status: 'sent' | 'delivered' | 'failed'
  }>
  notes?: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface InstallmentDashboardData {
  id: string
  studentId: string
  studentNameAr: string
  studentNameEn: string
  totalAmount: number
  numberOfInstallments: number
  installmentAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  planStatus: 'active' | 'completed' | 'cancelled' | 'defaulted'
  totalInstallments: number
  paidInstallments: number
  pendingInstallments: number
  overdueInstallments: number
  partialInstallments: number
  totalPaid: number
  remainingBalance: number
  nextDueDate?: string
  nextDueAmount?: number
  createdAt: string
  updatedAt: string
}

export interface OverdueInstallment {
  id: string
  installmentPlanId: string
  studentId: string
  studentNameAr: string
  studentNameEn: string
  installmentNumber: number
  amount: number
  dueDate: string
  paidAmount?: number
  daysOverdue: number
  lateFeeApplied: boolean
  lateFeeAmount: number
  remindersSent: Array<{
    sentDate: string
    method: string
    status: string
  }>
  gracePeriodDays: number
  lateFeesEnabled: boolean
}

export interface PaymentRecordingData {
  installmentPaymentId: string
  amount: number
  paymentMethod: string
  paymentDate: string
  transactionId?: string
  receiptNumber?: string
  notes?: string
}