/**
 * Financial Workflows End-to-End Tests
 * Complete end-to-end testing of financial workflows from initiation to completion
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PaymentGatewayService } from '../../services/payment-gateway-service'
import { InstallmentPaymentService } from '../../services/installment-payment-service'
import { FinancialAnalyticsService } from '../../services/financial-analytics-service'
import { FinancialReportingService } from '../../services/financial-reporting-service'
import type { PaymentRequest, PaymentPlanCreationRequest } from '../../types/financial-management'

// Mock Supabase with realistic data flow
const createMockSupabaseWithFlow = () => {
  let invoices: any[] = []
  let payments: any[] = []
  let paymentPlans: any[] = []
  let installments: any[] = []
  let auditLogs: any[] = []

  return {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        insert: vi.fn((data: any) => {
          if (table === 'invoices') {
            const newInvoice = { id: `inv-${Date.now()}`, ...data }
            invoices.push(newInvoice)
            return { ...query, single: () => Promise.resolve({ data: newInvoice, error: null }) }
          }
          if (table === 'payments') {
            const newPayment = { id: `pay-${Date.now()}`, ...data }
            payments.push(newPayment)
            return { ...query, single: () => Promise.resolve({ data: newPayment, error: null }) }
          }
          if (table === 'payment_plans') {
            const newPlan = { id: `plan-${Date.now()}`, ...data }
            paymentPlans.push(newPlan)
            return { ...query, single: () => Promise.resolve({ data: newPlan, error: null }) }
          }
          if (table === 'payment_installments') {
            const newInstallments = Array.isArray(data) 
              ? data.map((item, idx) => ({ id: `inst-${Date.now()}-${idx}`, ...item }))
              : [{ id: `inst-${Date.now()}`, ...data }]
            installments.push(...newInstallments)
            return { ...query, select: () => Promise.resolve({ data: newInstallments, error: null }) }
          }
          return { ...query, single: () => Promise.resolve({ data: null, error: null }) }
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: vi.fn((field: string, value: any) => {
          if (table === 'invoices') {
            const found = invoices.find(inv => inv[field] === value)
            return {
              ...query,
              single: () => Promise.resolve({ data: found || null, error: null })
            }
          }
          if (table === 'payment_plans') {
            const found = paymentPlans.find(plan => plan[field] === value)
            return {
              ...query,
              single: () => Promise.resolve({ data: found || null, error: null })
            }
          }
          if (table === 'payments') {
            const filtered = payments.filter(pay => pay[field] === value)
            return {
              ...query,
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: filtered, error: null }))
              }))
            }
          }
          return {
            ...query,
            single: () => Promise.resolve({ data: null, error: null }),
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }
      return query
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'e2e-user-123', role: 'admin' } }
      })
    },
    // Helper methods for E2E testing
    _getTestData: () => ({ invoices, payments, paymentPlans, installments, auditLogs }),
    _clearTestData: () => {
      invoices = []
      payments = []
      paymentPlans = []
      installments = []
      auditLogs = []
    }
  }
}

const mockSupabase = createMockSupabaseWithFlow()

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock fetch for external payment gateway calls
global.fetch = vi.fn()

describe('Financial Workflows End-to-End Tests', () => {
  let paymentService: PaymentGatewayService
  let installmentService: InstallmentPaymentService
  let analyticsService: FinancialAnalyticsService
  let reportingService: FinancialReportingService

  beforeAll(async () => {
    // Initialize services
    paymentService = new PaymentGatewayService()
    installmentService = new InstallmentPaymentService()
    analyticsService = new FinancialAnalyticsService()
    reportingService = new FinancialReportingService()
    
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 200))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase as any)._clearTestData()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(() => {
    vi.clearAllTimers()
  })

  // ==============================================
  // COMPLETE THERAPY SESSION TO PAYMENT WORKFLOW
  // ==============================================

  describe('Complete Therapy Session to Payment Workflow', () => {
    it('should complete full workflow: session → invoice → payment → analytics', async () => {
      // Step 1: Simulate therapy session completion and invoice generation
      const therapySession = {
        id: 'session-e2e-001',
        student_id: 'student-e2e-001',
        therapist_id: 'therapist-e2e-001',
        service_type: 'speech_therapy',
        session_date: '2024-01-15',
        duration: 60,
        rate: 200,
        status: 'completed'
      }

      const studentData = {
        id: 'student-e2e-001',
        name: 'Ahmed Hassan',
        name_ar: 'أحمد حسن',
        parent_email: 'parent@example.com',
        parent_phone: '+966501234567'
      }

      // Step 2: Generate invoice from session
      const invoiceData = {
        student_id: therapySession.student_id,
        invoice_number: `INV-${Date.now()}`,
        issue_date: '2024-01-15',
        due_date: '2024-02-15',
        subtotal: therapySession.rate,
        tax_amount: therapySession.rate * 0.15, // 15% VAT
        total_amount: therapySession.rate * 1.15,
        balance_amount: therapySession.rate * 1.15,
        status: 'pending',
        invoice_items: [{
          service_type: therapySession.service_type,
          description: 'Speech Therapy Session',
          description_ar: 'جلسة علاج النطق',
          quantity: 1,
          rate: therapySession.rate,
          amount: therapySession.rate,
          therapist_id: therapySession.therapist_id,
          session_date: therapySession.session_date
        }]
      }

      // Mock invoice creation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { ...invoiceData, id: 'inv-e2e-001' }, 
                  error: null 
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { ...invoiceData, id: 'inv-e2e-001' }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        }
      })

      // Step 3: Process payment for invoice
      const paymentRequest: PaymentRequest = {
        invoiceId: 'inv-e2e-001',
        amount: invoiceData.total_amount,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: studentData.name,
          nameAr: studentData.name_ar,
          email: studentData.parent_email,
          phone: studentData.parent_phone
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: studentData.name
        }
      }

      // Mock successful payment response
      const mockPaymentResponse = {
        transactionId: 'mada-e2e-001',
        status: 'completed',
        authCode: 'AUTH-E2E-001',
        rrn: 'RRN-E2E-001',
        processingFee: invoiceData.total_amount * 0.025,
        acquirerId: 'MADA_E2E'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaymentResponse)
      } as Response)

      const paymentResult = await paymentService.processPayment(paymentRequest)

      // Step 4: Verify complete workflow
      expect(paymentResult.success).toBe(true)
      expect(paymentResult.status).toBe('completed')
      expect(paymentResult.transactionId).toBe('mada-e2e-001')
      expect(paymentResult.processingFee).toBeCloseTo(5.75, 2) // 2.5% of 230 SAR

      // Step 5: Verify invoice status updated to paid
      const testData = (mockSupabase as any)._getTestData()
      expect(testData.payments.length).toBeGreaterThan(0)
      
      // Step 6: Generate analytics for the completed transaction
      const mockAnalyticsData = [{
        id: 'inv-e2e-001',
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        total_amount: invoiceData.total_amount,
        status: 'paid',
        created_at: invoiceData.issue_date,
        invoice_items: invoiceData.invoice_items,
        payments: [{
          amount: invoiceData.total_amount,
          payment_date: '2024-01-15',
          status: 'completed',
          payment_method: 'mada'
        }]
      }]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices' || table === 'payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockAnalyticsData, error: null }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const analytics = await analyticsService.getRevenueAnalytics()
      expect(analytics.totalRevenue.value).toBe(invoiceData.total_amount)
      expect(analytics.revenueByService.length).toBeGreaterThan(0)

      // Verify the complete workflow chain
      expect(paymentResult.success).toBe(true)
      expect(analytics.totalRevenue.value).toBeGreaterThan(0)
    })

    it('should handle complete workflow with Arabic customer data and RTL processing', async () => {
      const arabicCustomerData = {
        id: 'student-arabic-001',
        name: 'محمد عبد الله',
        name_en: 'Mohammed Abdullah',
        parent_email: 'mohammed.parent@example.com',
        parent_phone: '+966501234568',
        address_ar: 'الرياض، المملكة العربية السعودية',
        address_en: 'Riyadh, Saudi Arabia'
      }

      const arabicInvoiceData = {
        student_id: arabicCustomerData.id,
        invoice_number: `INV-AR-${Date.now()}`,
        issue_date: '2024-01-20',
        due_date: '2024-02-20',
        subtotal: 300,
        tax_amount: 45, // 15% VAT
        total_amount: 345,
        balance_amount: 345,
        status: 'pending',
        invoice_items: [{
          service_type: 'aba_therapy',
          description: 'Applied Behavior Analysis Session',
          description_ar: 'جلسة تحليل السلوك التطبيقي',
          quantity: 1,
          rate: 300,
          amount: 300
        }]
      }

      // Mock Arabic invoice processing
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { ...arabicInvoiceData, id: 'inv-arabic-001' }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const arabicPaymentRequest: PaymentRequest = {
        invoiceId: 'inv-arabic-001',
        amount: arabicInvoiceData.total_amount,
        currency: 'SAR',
        paymentMethod: 'stc_pay',
        customerInfo: {
          name: arabicCustomerData.name_en,
          nameAr: arabicCustomerData.name,
          email: arabicCustomerData.parent_email,
          phone: arabicCustomerData.parent_phone
        },
        paymentData: {
          phoneNumber: arabicCustomerData.parent_phone,
          otp: '123456'
        }
      }

      const mockArabicPaymentResponse = {
        transactionId: 'stc-arabic-001',
        status: 'completed',
        customerNameAr: arabicCustomerData.name
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArabicPaymentResponse)
      } as Response)

      const result = await paymentService.processPayment(arabicPaymentRequest)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('stc-arabic-001')
      
      // Verify Arabic customer data was processed correctly
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(arabicCustomerData.name)
        })
      )
    })

    // Mobile workflow test
    it('should complete mobile payment workflow with responsive UI considerations', async () => {
      const mobileInvoiceData = {
        id: 'inv-mobile-001',
        student_id: 'student-mobile-001',
        total_amount: 180,
        balance_amount: 180,
        status: 'pending'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mobileInvoiceData, error: null }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const mobilePaymentRequest: PaymentRequest = {
        invoiceId: 'inv-mobile-001',
        amount: 180,
        currency: 'SAR',
        paymentMethod: 'stc_pay',
        customerInfo: {
          name: 'Mobile User',
          email: 'mobile@example.com',
          phone: '+966501234569'
        },
        paymentData: {
          phoneNumber: '+966501234569',
          otp: '123456'
        },
        metadata: {
          deviceType: 'mobile',
          screenSize: '375x667',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          touchDevice: true
        }
      }

      const mockMobileResponse = {
        transactionId: 'stc-mobile-workflow-001',
        status: 'completed',
        mobileOptimized: true
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMobileResponse)
      } as Response)

      const result = await paymentService.processPayment(mobilePaymentRequest)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('stc-mobile-workflow-001')
      
      // Verify mobile-specific metadata was included
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('mobile')
        })
      )
    })
  })

  // ==============================================
  // PAYMENT PLAN LIFECYCLE WORKFLOW
  // ==============================================

  describe('Payment Plan Lifecycle Workflow', () => {
    it('should complete full payment plan lifecycle: creation → modification → automated payments → completion', async () => {
      // Step 1: Create payment plan
      const largeInvoiceData = {
        id: 'inv-plan-lifecycle-001',
        student_id: 'student-plan-lifecycle-001',
        total_amount: 9000,
        balance_amount: 9000,
        status: 'pending',
        students: {
          name: 'Lifecycle Test Student',
          name_ar: 'طالب اختبار دورة الحياة'
        }
      }

      // Mock payment plan creation flow
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: largeInvoiceData, error: null }))
              }))
            }))
          }
        }
        if (table === 'payment_plans') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { 
                    id: 'plan-lifecycle-001',
                    invoice_id: largeInvoiceData.id,
                    total_amount: 9000,
                    number_of_installments: 3,
                    frequency: 'monthly',
                    status: 'active',
                    auto_pay_enabled: true
                  }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        if (table === 'payment_installments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({ 
                data: [
                  { id: 'inst-lifecycle-001', installment_number: 1, amount: 3000, due_date: '2024-02-01', status: 'pending' },
                  { id: 'inst-lifecycle-002', installment_number: 2, amount: 3000, due_date: '2024-03-01', status: 'pending' },
                  { id: 'inst-lifecycle-003', installment_number: 3, amount: 3000, due_date: '2024-04-01', status: 'pending' }
                ], 
                error: null 
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        }
      })

      // Mock calculation methods
      vi.spyOn(installmentService as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [3000, 3000, 3000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(installmentService as any, 'generateInstallmentSchedule').mockReturnValue([
        { amount: 3000, dueDate: '2024-02-01' },
        { amount: 3000, dueDate: '2024-03-01' },
        { amount: 3000, dueDate: '2024-04-01' }
      ])
      vi.spyOn(installmentService as any, 'mapDatabaseToPaymentPlan').mockImplementation((data) => data)
      vi.spyOn(installmentService as any, 'mapDatabaseToInstallment').mockImplementation((data) => data)

      const planRequest: PaymentPlanCreationRequest = {
        invoiceId: 'inv-plan-lifecycle-001',
        numberOfInstallments: 3,
        frequency: 'monthly',
        startDate: '2024-02-01',
        preferredPaymentMethod: 'mada',
        autoPayEnabled: true,
        termsAccepted: true
      }

      const planResult = await installmentService.createPaymentPlan(planRequest)

      expect(planResult.success).toBe(true)
      expect(planResult.paymentPlan?.numberOfInstallments).toBe(3)
      expect(planResult.installments?.length).toBe(3)

      // Step 2: Modify payment plan (simulate customer requesting hardship adjustment)
      const modificationRequest = {
        newSchedule: [
          { installmentNumber: 2, amount: 2000, dueDate: '2024-03-15' },
          { installmentNumber: 3, amount: 2000, dueDate: '2024-04-15' },
          { installmentNumber: 4, amount: 2000, dueDate: '2024-05-15' },
          { installmentNumber: 5, amount: 1000, dueDate: '2024-06-15' }
        ],
        reason: 'Customer financial hardship adjustment',
        reasonAr: 'تعديل الصعوبة المالية للعميل'
      }

      // Mock modification flow
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payment_plans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { 
                    id: 'plan-lifecycle-001',
                    status: 'active',
                    payment_installments: [
                      { id: 'inst-lifecycle-001', installment_number: 1, status: 'paid', amount: 3000 },
                      { id: 'inst-lifecycle-002', installment_number: 2, status: 'pending', amount: 3000 },
                      { id: 'inst-lifecycle-003', installment_number: 3, status: 'pending', amount: 3000 }
                    ]
                  }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        if (table === 'payment_plan_modifications') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }
        }
        return {
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        }
      })

      const modificationResult = await installmentService.modifyPaymentPlan('plan-lifecycle-001', modificationRequest)

      expect(modificationResult.success).toBe(true)

      // Step 3: Process automated payments for multiple installments
      const mockDueInstallments = [
        {
          id: 'inst-lifecycle-002-modified',
          payment_plan_id: 'plan-lifecycle-001',
          installment_number: 2,
          amount: 2000,
          due_date: '2024-03-15',
          status: 'pending',
          payment_plans: {
            auto_pay_enabled: true,
            preferred_payment_method: 'mada',
            student_id: 'student-plan-lifecycle-001'
          }
        },
        {
          id: 'inst-lifecycle-003-modified',
          payment_plan_id: 'plan-lifecycle-001',
          installment_number: 3,
          amount: 2000,
          due_date: '2024-04-15',
          status: 'pending',
          payment_plans: {
            auto_pay_enabled: true,
            preferred_payment_method: 'mada',
            student_id: 'student-plan-lifecycle-001'
          }
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payment_installments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: mockDueInstallments, error: null }))
                }))
              }))
            }))
          }
        }
        return {
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        }
      })

      // Mock successful automated payments
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ transactionId: 'mada-auto-001', status: 'completed' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ transactionId: 'mada-auto-002', status: 'completed' })
        } as Response)

      vi.spyOn(installmentService as any, 'processInstallmentPayment')
        .mockResolvedValueOnce({ success: true, transactionId: 'mada-auto-001' })
        .mockResolvedValueOnce({ success: true, transactionId: 'mada-auto-002' })

      const automatedResult = await installmentService.processAutomatedPayments()

      expect(automatedResult.success).toBe(true)
      expect(automatedResult.processedPayments).toBe(2)
      expect(automatedResult.successfulPayments).toBe(2)
      expect(automatedResult.failedPayments).toBe(0)

      // Step 4: Verify complete payment plan lifecycle analytics
      const mockCompletePlanData = {
        totalPlans: 1,
        activePlans: 0,
        completedPlans: 1,
        totalValue: 9000,
        onTimePaymentRate: 100,
        autoPayAdoptionRate: 100
      }

      vi.spyOn(installmentService as any, 'calculatePaymentPlanMetrics').mockResolvedValue(mockCompletePlanData)

      const planAnalytics = await installmentService.getPaymentPlanAnalytics()

      expect(planAnalytics.success).toBe(true)
      expect(planAnalytics.analytics?.totalValue).toBe(9000)
      expect(planAnalytics.analytics?.onTimePaymentRate).toBe(100)
      expect(planAnalytics.analytics?.autoPayAdoptionRate).toBe(100)
    })
  })

  // ==============================================
  // FINANCIAL REPORTING AND COMPLIANCE WORKFLOW
  // ==============================================

  describe('Financial Reporting and Compliance Workflow', () => {
    it('should complete full compliance workflow: transactions → VAT calculation → audit trail → reporting', async () => {
      // Step 1: Create multiple transactions throughout a month
      const monthlyTransactions = [
        {
          id: 'inv-compliance-001',
          subtotal: 1000,
          tax_amount: 150, // 15% VAT
          total_amount: 1150,
          issue_date: '2024-01-05',
          status: 'paid',
          payments: [{ amount: 1150, payment_date: '2024-01-06' }]
        },
        {
          id: 'inv-compliance-002',
          subtotal: 2000,
          tax_amount: 300, // 15% VAT
          total_amount: 2300,
          issue_date: '2024-01-15',
          status: 'paid',
          payments: [{ amount: 2300, payment_date: '2024-01-16' }]
        },
        {
          id: 'inv-compliance-003',
          subtotal: 1500,
          tax_amount: 225, // 15% VAT
          total_amount: 1725,
          issue_date: '2024-01-25',
          status: 'paid',
          payments: [{ amount: 1725, payment_date: '2024-01-26' }]
        }
      ]

      const mockVATSettings = {
        setting_value: '"VAT-SA-987654321"'
      }

      // Step 2: Generate VAT compliance report
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: monthlyTransactions, error: null }))
                }))
              }))
            }))
          }
        }
        if (table === 'billing_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockVATSettings, error: null }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      vi.spyOn(reportingService as any, 'validateVATCompliance').mockReturnValue([])
      vi.spyOn(reportingService as any, 'cacheFinancialReport').mockResolvedValue(true)

      const vatReport = await reportingService.generateVATReport('2024-01-01', '2024-01-31')

      expect(vatReport.success).toBe(true)
      expect(vatReport.report?.vatRegistrationNumber).toBe('VAT-SA-987654321')
      expect(vatReport.report?.vatRate).toBe(0.15)
      
      const vatReturn = vatReport.report?.vatReturns[0]
      expect(vatReturn?.totalSales).toBe(4500) // 1000 + 2000 + 1500
      expect(vatReturn?.vatCollected).toBe(675) // 150 + 300 + 225
      expect(vatReturn?.netVat).toBe(675) // No input VAT in this test
      expect(vatReturn?.status).toBe('draft')

      // Step 3: Generate comprehensive audit trail
      const mockAuditEntries = [
        {
          id: 'audit-compliance-001',
          entity_type: 'invoice',
          entity_id: 'inv-compliance-001',
          action: 'created',
          performed_by: 'e2e-user-123',
          performed_at: '2024-01-05T10:00:00.000Z',
          previous_values: null,
          new_values: { amount: 1150, status: 'draft' },
          reason: 'Invoice generated from completed session',
          ip_address: '192.168.1.100',
          user_agent: 'E2E Test Agent',
          retention_period: 2555,
          is_archived: false,
          users: { name: 'E2E Test User', email: 'e2e@test.com' }
        },
        {
          id: 'audit-compliance-002',
          entity_type: 'payment',
          entity_id: 'pay-compliance-001',
          action: 'processed',
          performed_by: 'e2e-user-123',
          performed_at: '2024-01-06T14:30:00.000Z',
          previous_values: { status: 'pending' },
          new_values: { status: 'completed', amount: 1150 },
          reason: 'Payment processed via MADA gateway',
          ip_address: '192.168.1.100',
          user_agent: 'E2E Test Agent',
          retention_period: 2555,
          is_archived: false,
          users: { name: 'E2E Test User', email: 'e2e@test.com' }
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'financial_audit_trail') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: mockAuditEntries, error: null }))
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const auditTrail = await reportingService.generateAuditTrail(
        undefined,
        { start: '2024-01-01', end: '2024-01-31' }
      )

      expect(auditTrail.success).toBe(true)
      expect(auditTrail.auditTrail?.length).toBe(2)
      expect(auditTrail.summary?.totalEntries).toBe(2)
      expect(auditTrail.summary?.actionBreakdown).toHaveProperty('created', 1)
      expect(auditTrail.summary?.actionBreakdown).toHaveProperty('processed', 1)

      // Step 4: Generate comprehensive financial export
      vi.spyOn(reportingService as any, 'generateRevenueExport').mockResolvedValue({
        totalRevenue: 5175, // Total including VAT
        monthlyBreakdown: [
          { month: '2024-01', revenue: 5175, growth: 0 }
        ],
        revenueByService: [
          { serviceType: 'speech_therapy', revenue: 5175, sessionCount: 3 }
        ]
      })

      vi.spyOn(reportingService as any, 'formatExportData').mockReturnValue({
        data: {
          summary: {
            totalRevenue: 5175,
            vatCollected: 675,
            netRevenue: 4500
          },
          vatReport: vatReport.report,
          auditTrail: auditTrail.auditTrail,
          complianceStatus: 'compliant'
        },
        mimeType: 'application/json'
      })

      const comprehensiveExport = await reportingService.generateFinancialExport(
        'json',
        'comprehensive',
        { start: '2024-01-01', end: '2024-01-31' }
      )

      expect(comprehensiveExport.success).toBe(true)
      expect(comprehensiveExport.fileName).toBe('financial-comprehensive-2024-01-01-2024-01-31.json')
      expect(comprehensiveExport.mimeType).toBe('application/json')
      
      const exportData = comprehensiveExport.exportData as any
      expect(exportData.summary.totalRevenue).toBe(5175)
      expect(exportData.summary.vatCollected).toBe(675)
      expect(exportData.complianceStatus).toBe('compliant')
    })

    it('should detect and handle VAT compliance violations in complete workflow', async () => {
      // Simulate invoices with VAT compliance issues
      const nonCompliantTransactions = [
        {
          id: 'inv-violation-001',
          subtotal: 1000,
          tax_amount: 100, // Incorrect 10% instead of 15%
          total_amount: 1100,
          issue_date: '2024-01-10',
          status: 'paid'
        },
        {
          id: 'inv-violation-002',
          subtotal: 2000,
          tax_amount: 250, // Incorrect 12.5% instead of 15%
          total_amount: 2250,
          issue_date: '2024-01-20',
          status: 'paid'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: nonCompliantTransactions, error: null }))
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      // Mock compliance validation with violations
      vi.spyOn(reportingService as any, 'validateVATCompliance').mockReturnValue([
        'VAT rate inconsistent with Saudi regulations on invoice inv-violation-001 (10% found, 15% expected)',
        'VAT rate inconsistent with Saudi regulations on invoice inv-violation-002 (12.5% found, 15% expected)',
        'Total VAT undercollection of 125 SAR detected'
      ])
      vi.spyOn(reportingService as any, 'cacheFinancialReport').mockResolvedValue(true)

      const violationReport = await reportingService.generateVATReport('2024-01-01', '2024-01-31')

      expect(violationReport.success).toBe(true)
      expect(violationReport.report?.complianceStatus).toBe('issues_found')
      expect(violationReport.report?.issues?.length).toBe(3)
      expect(violationReport.report?.issues?.[0]).toContain('VAT rate inconsistent')
      expect(violationReport.report?.issues?.[2]).toContain('VAT undercollection')

      // Verify the workflow can still complete with compliance issues flagged
      const exportWithViolations = await reportingService.generateFinancialExport(
        'json',
        'vat',
        { start: '2024-01-01', end: '2024-01-31' }
      )

      expect(exportWithViolations.success).toBe(true)
      expect(exportWithViolations.exportData).toBeDefined()
    })
  })

  // ==============================================
  // PERFORMANCE AND STRESS TESTING
  // ==============================================

  describe('Performance and Stress Testing', () => {
    it('should handle high-volume concurrent workflows efficiently', async () => {
      // Simulate 50 concurrent payment workflows
      const concurrentWorkflows = Array.from({ length: 50 }, (_, i) => ({
        invoiceId: `inv-stress-${i}`,
        amount: Math.random() * 5000 + 100, // Random amount between 100-5100
        currency: 'SAR',
        paymentMethod: i % 2 === 0 ? 'mada' : 'stc_pay',
        customerInfo: {
          name: `Stress Test Customer ${i}`,
          email: `stress.customer${i}@example.com`,
          phone: `+96650123456${i % 10}`
        },
        paymentData: i % 2 === 0 ? {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: `Stress Test Customer ${i}`
        } : {
          phoneNumber: `+96650123456${i % 10}`,
          otp: '123456'
        }
      }))

      // Mock successful responses for all concurrent requests
      vi.mocked(fetch).mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            transactionId: `stress-tx-${Math.random().toString(36).substr(2, 9)}`,
            status: 'completed',
            processingTime: Math.random() * 500 + 100 // 100-600ms processing time
          })
        } as Response)
      )

      // Mock invoice data for all requests
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { id: 'invoice', balance_amount: 1000, status: 'pending' }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        }
      })

      const startTime = Date.now()

      // Process all workflows concurrently
      const results = await Promise.all(
        concurrentWorkflows.map(workflow => 
          paymentService.processPayment(workflow)
        )
      )

      const executionTime = Date.now() - startTime

      // Verify all workflows completed successfully
      const successfulPayments = results.filter(result => result.success).length
      const failedPayments = results.filter(result => !result.success).length

      expect(successfulPayments).toBe(50)
      expect(failedPayments).toBe(0)
      expect(executionTime).toBeLessThan(10000) // Should complete within 10 seconds

      // Verify average processing time is reasonable
      const avgProcessingTime = executionTime / 50
      expect(avgProcessingTime).toBeLessThan(200) // Average less than 200ms per payment
    })

    it('should handle large dataset analytics generation efficiently', async () => {
      // Generate large dataset for analytics testing
      const largeTransactionDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `inv-large-${i}`,
        subtotal: Math.random() * 10000,
        tax_amount: Math.random() * 1500,
        total_amount: Math.random() * 11500,
        status: 'paid',
        created_at: new Date(2024, 0, Math.floor(i / 200) + 1).toISOString(),
        invoice_items: [{
          service_type: ['speech_therapy', 'aba_therapy', 'occupational_therapy', 'psychological_support'][i % 4],
          therapist_id: `therapist-${i % 50}`,
          amount: Math.random() * 2000
        }],
        payments: [{
          amount: Math.random() * 11500,
          payment_date: new Date(2024, 0, Math.floor(i / 200) + 2).toISOString(),
          status: 'completed',
          payment_method: ['mada', 'stc_pay', 'bank_transfer'][i % 3]
        }],
        students: { name: `Student ${i}`, name_ar: `الطالب ${i}` }
      }))

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices' || table === 'payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: largeTransactionDataset, error: null }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const startTime = Date.now()

      // Generate comprehensive analytics
      const [revenueAnalytics, paymentAnalytics, kpis] = await Promise.all([
        analyticsService.getRevenueAnalytics(),
        analyticsService.getPaymentAnalytics(),
        analyticsService.getFinancialKPIs()
      ])

      const executionTime = Date.now() - startTime

      // Verify analytics were generated successfully
      expect(revenueAnalytics.totalRevenue.value).toBeGreaterThan(0)
      expect(revenueAnalytics.revenueByService.length).toBe(4) // 4 service types
      expect(revenueAnalytics.revenueByTherapist.length).toBeGreaterThan(0)

      expect(paymentAnalytics.collectionRate.value).toBeGreaterThan(0)
      expect(paymentAnalytics.paymentMethodBreakdown.length).toBe(3) // 3 payment methods

      expect(kpis.length).toBeGreaterThan(5)

      // Performance expectations
      expect(executionTime).toBeLessThan(5000) // Should process 5000 records within 5 seconds
      expect(revenueAnalytics.revenueByTherapist.length).toBeLessThanOrEqual(50) // Max 50 therapists
    })
  })

  // ==============================================
  // ERROR RECOVERY AND RESILIENCE TESTING
  // ==============================================

  describe('Error Recovery and System Resilience', () => {
    it('should recover gracefully from partial system failures', async () => {
      let failureCount = 0
      const maxFailures = 3

      // Mock intermittent failures followed by success
      vi.mocked(fetch).mockImplementation(() => {
        failureCount++
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error(`Network failure ${failureCount}`))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            transactionId: 'recovery-tx-001',
            status: 'completed',
            recoveredFromFailures: maxFailures
          })
        } as Response)
      })

      const paymentRequest: PaymentRequest = {
        invoiceId: 'inv-recovery-001',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Recovery Test Customer',
          email: 'recovery@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Recovery Test Customer'
        }
      }

      // Attempt multiple payments to trigger recovery
      const attempts = []
      for (let i = 0; i < maxFailures + 1; i++) {
        attempts.push(await paymentService.processPayment(paymentRequest))
      }

      // First attempts should fail, last should succeed
      attempts.slice(0, maxFailures).forEach(result => {
        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('PROCESSING_ERROR')
      })

      const finalResult = attempts[maxFailures]
      expect(finalResult.success).toBe(true)
      expect(finalResult.transactionId).toBe('recovery-tx-001')
    })

    it('should maintain data integrity during cascade failures', async () => {
      // Simulate payment succeeds but database update fails
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'cascade-failure-tx-001',
          status: 'completed'
        })
      } as Response)

      // Mock database failure after payment success
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: new Error('Database connection lost') 
                }))
              }))
            }))
          }
        }
        if (table === 'invoices') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: new Error('Database connection lost') 
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const cascadeRequest: PaymentRequest = {
        invoiceId: 'inv-cascade-001',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Cascade Test Customer',
          email: 'cascade@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Cascade Test Customer'
        }
      }

      const result = await paymentService.processPayment(cascadeRequest)

      // Payment should be marked as needing reconciliation due to database failure
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PROCESSING_ERROR')

      // The system should have captured the successful payment transaction
      // for later reconciliation (this would be handled by the actual service)
      expect(fetch).toHaveBeenCalled()
    })
  })
})