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