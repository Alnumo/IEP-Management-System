// Financial Management Types for Story 2.3
// Comprehensive type definitions for payment processing, billing, and financial analytics

import { ServiceType } from '../services/billing-service'

// ==============================================
// PAYMENT GATEWAY TYPES
// ==============================================

export interface PaymentGatewayConfig {
  gatewayId: string
  name: string
  nameAr: string
  isActive: boolean
  supportedCurrencies: Currency[]
  supportedPaymentMethods: PaymentMethod[]
  
  // API Configuration
  apiUrl: string
  merchantId?: string
  apiKey?: string // Encrypted
  secretKey?: string // Encrypted
  
  // Features
  supportsRecurring: boolean
  supportsRefunds: boolean
  supportsPartialRefunds: boolean
  supportsTokenization: boolean
  
  // Limits
  minAmount?: number
  maxAmount?: number
  dailyLimit?: number
  
  // Processing
  averageProcessingTime: number // seconds
  feeStructure: PaymentFee[]
  
  // Compliance
  pciCompliant: boolean
  supports3DSecure: boolean
}

export interface PaymentFee {
  feeType: 'fixed' | 'percentage' | 'tiered'
  amount: number // For fixed fees or percentage (0.025 for 2.5%)
  currency?: Currency
  minFee?: number
  maxFee?: number
  
  // Tiered structure
  tiers?: Array<{
    minAmount: number
    maxAmount?: number
    fee: number
  }>
}

export interface PaymentGatewayCredentials {
  gatewayId: string
  environment: 'sandbox' | 'production'
  credentials: Record<string, string>
  encryptedAt: string
  lastValidated: string
}

// MADA (Saudi domestic card system)
export interface MadaPaymentRequest {
  amount: number
  currency: Currency
  description: string
  customerInfo: CustomerInfo
  
  // MADA specific
  cardNumber?: string
  expiryMonth?: string
  expiryYear?: string
  cvv?: string
  
  // 3D Secure
  returnUrl: string
  callbackUrl: string
  
  // Metadata
  metadata?: Record<string, any>
}

export interface MadaPaymentResponse {
  transactionId: string
  status: PaymentStatus
  amount: number
  currency: Currency
  
  // MADA response
  authCode?: string
  referenceNumber?: string
  cardMask?: string
  cardType?: string
  
  // 3D Secure
  redirectUrl?: string
  secureRequired?: boolean
  
  // Response details
  responseCode: string
  responseMessage: string
  responseMessageAr: string
  
  timestamp: string
}

// STC Pay (Saudi mobile wallet)
export interface StcPayPaymentRequest {
  amount: number
  currency: Currency
  description: string
  descriptionAr: string
  
  // STC Pay specific
  mobileNumber: string
  otp?: string
  
  // URLs
  returnUrl: string
  callbackUrl: string
  
  // Metadata
  metadata?: Record<string, any>
}

export interface StcPayPaymentResponse {
  transactionId: string
  payUrl?: string // For redirect-based payments
  status: PaymentStatus
  amount: number
  currency: Currency
  
  // STC Pay response
  stcReferenceId?: string
  mobileNumber: string
  
  responseCode: string
  responseMessage: string
  responseMessageAr: string
  
  timestamp: string
}

// Bank Transfer
export interface BankTransferRequest {
  amount: number
  currency: Currency
  description: string
  descriptionAr: string
  
  // Bank details
  bankCode: string
  accountNumber: string
  iban?: string
  beneficiaryName: string
  
  // Transfer details
  transferType: 'instant' | 'same_day' | 'next_day'
  purposeCode?: string
  
  metadata?: Record<string, any>
}

export interface BankTransferResponse {
  transactionId: string
  status: PaymentStatus
  amount: number
  currency: Currency
  
  // Bank response
  bankReferenceId?: string
  transferDate?: string
  expectedSettlement?: string
  
  responseCode: string
  responseMessage: string
  
  timestamp: string
}

// ==============================================
// UNIFIED PAYMENT PROCESSING TYPES
// ==============================================

export type PaymentMethod = 
  | 'cash'
  | 'mada'
  | 'visa'
  | 'mastercard'
  | 'stc_pay'
  | 'bank_transfer'
  | 'apple_pay'
  | 'google_pay'
  | 'insurance'
  | 'check'

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export type Currency = 'SAR' | 'USD' | 'EUR'

export interface PaymentRequest {
  invoiceId: string
  amount: number
  currency: Currency
  paymentMethod: PaymentMethod
  
  // Customer information
  customer: CustomerInfo
  
  // Payment specific data
  paymentData: MadaPaymentRequest | StcPayPaymentRequest | BankTransferRequest | Record<string, any>
  
  // Metadata
  description?: string
  descriptionAr?: string
  metadata?: Record<string, any>
  
  // URLs for redirects
  returnUrl?: string
  callbackUrl?: string
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  paymentId?: string
  status: PaymentStatus
  
  // Response data
  gatewayResponse?: MadaPaymentResponse | StcPayPaymentResponse | BankTransferResponse | Record<string, any>
  
  // Error information
  error?: {
    code: string
    message: string
    messageAr?: string
    details?: Record<string, any>
  }
  
  // Action required (for 3D Secure, OTP, etc.)
  actionRequired?: {
    type: '3d_secure' | 'otp' | 'redirect'
    url?: string
    parameters?: Record<string, any>
  }
  
  timestamp: string
}

export interface CustomerInfo {
  id?: string
  name: string
  nameAr?: string
  email?: string
  phone?: string
  
  // Billing address
  address?: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
}

// ==============================================
// AUTOMATED INVOICE GENERATION TYPES
// ==============================================

export interface InvoiceGenerationRule {
  id: string
  name: string
  nameAr: string
  isActive: boolean
  
  // Trigger conditions
  triggerType: 'session_completion' | 'service_delivery' | 'goal_achievement' | 'time_based' | 'manual'
  triggerConditions: {
    serviceTypes?: ServiceType[]
    studentIds?: string[]
    therapistIds?: string[]
    programIds?: string[]
    goalIds?: string[]
    
    // Time-based triggers
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    dayOfWeek?: number // 0-6, Sunday = 0
    dayOfMonth?: number // 1-31
    
    // Conditions
    minSessionCount?: number
    minAmount?: number
    requiresApproval?: boolean
  }
  
  // Invoice configuration
  invoiceConfig: {
    templateId?: string
    paymentTerms: number // days
    currency: Currency
    
    // Pricing
    useCustomRates?: boolean
    customRates?: Record<ServiceType, number>
    discountRules?: DiscountRule[]
    
    // Insurance
    defaultInsuranceProvider?: string
    insuranceCoverage?: number
    
    // Automation
    autoSend?: boolean
    sendToParent?: boolean
    sendToAdmin?: boolean
    createPaymentPlan?: boolean
    
    // Notifications
    notifyTherapist?: boolean
    notifyBilling?: boolean
  }
  
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DiscountRule {
  id: string
  name: string
  nameAr: string
  discountType: 'percentage' | 'fixed' | 'bulk'
  discountValue: number
  
  // Conditions
  conditions: {
    minSessions?: number
    minAmount?: number
    serviceTypes?: ServiceType[]
    studentCategories?: string[]
    dateRange?: {
      start: string
      end: string
    }
  }
  
  // Limits
  maxDiscount?: number
  maxUsage?: number
  perCustomer?: boolean
  
  isActive: boolean
}

export interface ServiceDeliveryRecord {
  id: string
  sessionId: string
  studentId: string
  therapistId: string
  serviceType: ServiceType
  
  // Service details
  startTime: string
  endTime: string
  duration: number // minutes
  actualDuration?: number // if different from planned
  
  // Delivery status
  status: 'completed' | 'partial' | 'cancelled' | 'no_show'
  completionPercentage: number
  
  // Goals addressed
  goalsAddressed: Array<{
    goalId: string
    timeSpent: number // minutes
    progress: number // percentage
  }>
  
  // Billing information
  billableUnits: number
  unitRate: number
  totalAmount: number
  
  // Documentation
  notes?: string
  attachments?: string[]
  
  // Approval
  approvedBy?: string
  approvedAt?: string
  
  createdAt: string
  updatedAt: string
}

export interface AutomatedInvoiceGeneration {
  id: string
  ruleId: string
  
  // Trigger details
  triggerType: string
  triggerData: Record<string, any>
  triggeredAt: string
  
  // Generated invoice
  invoiceId?: string
  invoiceStatus: 'pending' | 'generated' | 'failed'
  
  // Service records included
  serviceRecords: ServiceDeliveryRecord[]
  
  // Generation details
  totalAmount: number
  itemCount: number
  
  // Processing
  processedAt?: string
  errorMessage?: string
  
  // Approval workflow
  requiresApproval: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  
  createdAt: string
}

// ==============================================
// FINANCIAL ANALYTICS TYPES
// ==============================================

export interface FinancialKPI {
  metric: string
  value: number
  currency?: Currency
  change?: number // percentage change from previous period
  changeType?: 'increase' | 'decrease' | 'neutral'
  trend?: number[] // historical values
  target?: number
  period: string
  lastUpdated: string
}

export interface RevenueAnalytics {
  // Revenue metrics
  totalRevenue: FinancialKPI
  recurringRevenue: FinancialKPI
  oneTimeRevenue: FinancialKPI
  
  // Revenue by category
  revenueByService: Array<{
    serviceType: ServiceType
    revenue: number
    sessionCount: number
    averageRate: number
    growth: number
  }>
  
  revenueByTherapist: Array<{
    therapistId: string
    therapistName: string
    revenue: number
    sessionCount: number
    utilizationRate: number
  }>
  
  revenueByProgram: Array<{
    programId: string
    programName: string
    revenue: number
    studentCount: number
    averageRevenuePerStudent: number
  }>
  
  // Time-based analysis
  monthlyRevenue: Array<{
    month: string
    revenue: number
    growth: number
    forecast?: number
  }>
  
  dailyRevenue: Array<{
    date: string
    revenue: number
    sessionCount: number
  }>
  
  // Forecasting
  revenueForecast: Array<{
    period: string
    forecastRevenue: number
    confidence: number
    factors: string[]
  }>
}

export interface PaymentAnalytics {
  // Collection metrics
  collectionRate: FinancialKPI
  averagePaymentTime: FinancialKPI
  overdueAmount: FinancialKPI
  
  // Payment method analysis
  paymentMethodBreakdown: Array<{
    method: PaymentMethod
    amount: number
    transactionCount: number
    averageAmount: number
    successRate: number
    averageProcessingTime: number
    fees: number
  }>
  
  // Outstanding analysis
  outstandingBalance: FinancialKPI
  agingAnalysis: Array<{
    category: '0-30' | '31-60' | '61-90' | '90+'
    amount: number
    invoiceCount: number
    percentage: number
  }>
  
  // Payment trends
  paymentTrends: Array<{
    period: string
    totalPayments: number
    onTimePayments: number
    latePayments: number
    averagePaymentDelay: number
  }>
}

export interface FinancialForecasting {
  // Revenue forecasting
  revenueProjection: Array<{
    period: string
    projectedRevenue: number
    confidenceInterval: {
      low: number
      high: number
    }
    factors: Array<{
      factor: string
      impact: number
      confidence: number
    }>
  }>
  
  // Cash flow forecasting
  cashFlowProjection: Array<{
    period: string
    inflow: number
    outflow: number
    netCashFlow: number
    cumulativeCashFlow: number
  }>
  
  // Scenario analysis
  scenarios: Array<{
    name: string
    nameAr: string
    assumptions: Record<string, any>
    projectedImpact: {
      revenue: number
      profit: number
      cashFlow: number
    }
  }>
}

// ==============================================
// FINANCIAL WORKFLOW AUTOMATION TYPES
// ==============================================

export interface BillingCycle {
  id: string
  name: string
  nameAr: string
  
  // Cycle configuration
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  startDate: string
  nextRunDate: string
  
  // Generation rules
  includeServices: ServiceType[]
  includePrograms?: string[]
  includeStudents?: string[]
  
  // Timing
  generationDay?: number // day of week (0-6) or day of month (1-31)
  cutoffDays: number // days before cycle end to include services
  
  // Invoice settings
  paymentTerms: number
  autoSend: boolean
  requireApproval: boolean
  
  // Notifications
  notificationSettings: {
    notifyBilling: boolean
    notifyTherapists: boolean
    notifyParents: boolean
    reminderSchedule: number[] // days before due date
  }
  
  // Status
  isActive: boolean
  lastRun?: string
  lastRunStatus?: 'success' | 'failed' | 'partial'
  
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PaymentReconciliation {
  id: string
  reconciliationDate: string
  
  // Bank/gateway data
  gatewayId: string
  settlementId?: string
  settlementAmount: number
  
  // Matching
  matchedPayments: Array<{
    paymentId: string
    gatewayTransactionId: string
    amount: number
    status: 'matched' | 'amount_mismatch' | 'duplicate'
  }>
  
  unmatchedTransactions: Array<{
    gatewayTransactionId: string
    amount: number
    date: string
    reason: 'no_payment_record' | 'amount_mismatch' | 'timing_difference'
  }>
  
  // Reconciliation summary
  totalMatched: number
  totalUnmatched: number
  reconciliationStatus: 'complete' | 'partial' | 'failed'
  
  // Resolution
  resolvedBy?: string
  resolvedAt?: string
  notes?: string
  
  createdAt: string
}

export interface FinancialNotification {
  id: string
  type: 'payment_received' | 'invoice_overdue' | 'payment_failed' | 'reconciliation_required' | 'goal_achieved'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Recipients
  recipients: Array<{
    userId: string
    role: string
    contactMethod: 'email' | 'sms' | 'whatsapp' | 'in_app'
  }>
  
  // Content
  title: string
  titleAr: string
  message: string
  messageAr: string
  
  // Related data
  relatedInvoiceId?: string
  relatedPaymentId?: string
  relatedStudentId?: string
  
  // Delivery
  scheduledFor?: string
  sentAt?: string
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed'
  
  // Tracking
  openedAt?: string
  actionTaken?: string
  
  createdAt: string
  expiresAt?: string
}

// ==============================================
// COMPLIANCE AND REPORTING TYPES
// ==============================================

export interface VatCompliance {
  vatRegistrationNumber: string
  vatRate: number
  
  // VAT reporting
  vatReturns: Array<{
    periodStart: string
    periodEnd: string
    totalSales: number
    vatCollected: number
    vatPaid: number
    netVat: number
    filingDate: string
    status: 'draft' | 'filed' | 'paid'
  }>
  
  // Compliance checks
  lastComplianceCheck: string
  complianceStatus: 'compliant' | 'issues_found' | 'review_required'
  issues?: Array<{
    description: string
    descriptionAr: string
    severity: 'low' | 'medium' | 'high'
    resolution?: string
  }>
}

export interface FinancialAuditTrail {
  id: string
  entityType: 'invoice' | 'payment' | 'refund' | 'adjustment'
  entityId: string
  
  // Action details
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'cancel'
  performedBy: string
  performedAt: string
  
  // Changes
  previousValues?: Record<string, any>
  newValues?: Record<string, any>
  
  // Context
  reason?: string
  ipAddress?: string
  userAgent?: string
  
  // Compliance
  retentionPeriod: number // days
  isArchived: boolean
}

// ==============================================
// INSTALLMENT PAYMENT PLAN TYPES
// ==============================================

export interface PaymentPlan {
  id: string
  invoiceId: string
  studentId: string
  
  // Plan details
  totalAmount: number
  numberOfInstallments: number
  installmentAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  
  // Status
  status: 'active' | 'completed' | 'cancelled' | 'defaulted'
  
  // Terms and conditions
  termsAccepted: boolean
  termsAcceptedDate?: string
  lateFeesEnabled: boolean
  lateFeeAmount?: number
  gracePeroidDays: number
  
  // Reminders and notifications
  reminderSettings: {
    daysBeforeDue: number[]
    daysAfterDue: number[]
    methods: ('email' | 'sms' | 'whatsapp' | 'in_app')[]
  }
  
  // Modification history
  modificationHistory?: PaymentPlanModification[]
  
  createdAt: string
  updatedAt: string
}

export interface PaymentPlanModification {
  id: string
  modifiedBy: string
  modificationDate: string
  modificationType: 'amount_change' | 'schedule_change' | 'terms_change' | 'cancellation'
  originalValue: any
  newValue: any
  reason: string
  reasonAr: string
}

export interface PaymentInstallment {
  id: string
  paymentPlanId: string
  
  // Installment details
  installmentNumber: number
  amount: number
  dueDate: string
  paidDate?: string
  paidAmount?: number
  
  // Status
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  
  // Payment details
  paymentMethod?: PaymentMethod
  transactionId?: string
  receiptNumber?: string
  
  // Late fees
  lateFeeApplied?: boolean
  lateFeeAmount?: number
  
  // Reminders sent
  remindersSent: Array<{
    sentDate: string
    method: 'email' | 'sms' | 'whatsapp' | 'in_app'
    status: 'sent' | 'delivered' | 'failed'
  }>
  
  notes?: string
  createdAt: string
}

export interface PaymentPlanTemplate {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  
  // Template configuration
  defaultInstallments: number
  defaultFrequency: 'weekly' | 'biweekly' | 'monthly'
  minimumAmount: number
  maximumAmount?: number
  
  // Terms
  gracePeroidDays: number
  lateFeesEnabled: boolean
  lateFeeType: 'fixed' | 'percentage'
  lateFeeAmount: number
  
  // Eligibility criteria
  eligibilityCriteria: {
    minimumCreditScore?: number
    requiresParentConsent: boolean
    maximumOutstandingBalance?: number
    excludedServiceTypes?: ServiceType[]
  }
  
  // Reminder schedule
  reminderSchedule: {
    daysBeforeDue: number[]
    daysAfterDue: number[]
    escalationDays: number[]
  }
  
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PaymentPlanCreationRequest {
  invoiceId: string
  templateId?: string
  
  // Plan configuration
  numberOfInstallments: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  firstPaymentAmount?: number // If different from calculated amount
  
  // Customer preferences
  preferredPaymentMethod?: PaymentMethod
  autoPayEnabled?: boolean
  
  // Terms acceptance
  termsAccepted: boolean
  ipAddress: string
  userAgent: string
  
  // Customization
  customInstallmentAmounts?: Array<{
    installmentNumber: number
    amount: number
    dueDate: string
  }>
  
  notes?: string
}

export interface PaymentPlanAnalytics {
  // Plan performance metrics
  activePlans: number
  completedPlans: number
  defaultedPlans: number
  totalPlannedAmount: number
  totalCollectedAmount: number
  
  // Success rates
  completionRate: number
  onTimePaymentRate: number
  averageCompletionTime: number // days
  
  // Financial metrics
  averagePlanAmount: number
  averageInstallmentAmount: number
  mostPopularFrequency: 'weekly' | 'biweekly' | 'monthly'
  
  // Collection metrics
  overdueAmount: number
  overdueCount: number
  collectionEfficiency: number
  
  // Trends
  monthlyTrends: Array<{
    month: string
    plansCreated: number
    plansCompleted: number
    amountCollected: number
    defaultRate: number
  }>
  
  // Risk analysis
  riskFactors: Array<{
    factor: string
    impact: 'high' | 'medium' | 'low'
    affectedPlans: number
  }>
}

export interface AutomatedPaymentProcessing {
  id: string
  paymentPlanId: string
  installmentId: string
  
  // Automation details
  scheduledDate: string
  processedDate?: string
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
  
  // Payment processing
  paymentMethod: PaymentMethod
  amount: number
  
  // Results
  transactionId?: string
  gatewayResponse?: Record<string, any>
  
  // Retry logic
  retryCount: number
  maxRetries: number
  nextRetryDate?: string
  
  // Error handling
  errorCode?: string
  errorMessage?: string
  
  createdAt: string
  processedAt?: string
}

// ==============================================
// EXPORT ALL TYPES
// ==============================================

export interface Invoice {
  id: string
  invoiceNumber: string
  studentId: string
  parentId?: string
  issueDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  currency: Currency
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentTerms: number
  paymentMethod?: string
  insuranceProvider?: string
  insuranceCoverage: number
  insuranceAmount: number
  patientResponsibility: number
  notes?: string
  internalNotes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  studentId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  currency: Currency
  transactionId?: string
  receiptNumber: string
  referenceNumber?: string
  gatewayProvider?: string
  gatewayResponse?: Record<string, any>
  status: PaymentStatus
  isInsurancePayment: boolean
  insuranceProvider?: string
  claimNumber?: string
  notes?: string
  createdBy: string
  createdAt: string
}

export interface ComprehensiveFinancialData {
  // Core entities
  invoices: Invoice[]
  payments: Payment[]
  paymentPlans: PaymentPlan[]
  paymentInstallments: PaymentInstallment[]
  
  // Analytics
  revenueAnalytics: RevenueAnalytics
  paymentAnalytics: PaymentAnalytics
  paymentPlanAnalytics: PaymentPlanAnalytics
  forecasting: FinancialForecasting
  
  // Configuration
  gateways: PaymentGatewayConfig[]
  automationRules: InvoiceGenerationRule[]
  billingCycles: BillingCycle[]
  paymentPlanTemplates: PaymentPlanTemplate[]
  
  // Compliance
  vatCompliance: VatCompliance
  auditTrail: FinancialAuditTrail[]
}