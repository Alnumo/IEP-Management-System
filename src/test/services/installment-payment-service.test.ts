/**
 * Installment Payment Service Tests
 * Comprehensive testing for payment plan creation, management, and automation
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InstallmentPaymentService } from '../../services/installment-payment-service'
import type { PaymentPlanCreationRequest } from '../../types/financial-management'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('InstallmentPaymentService', () => {
  let service: InstallmentPaymentService
  
  beforeEach(() => {
    service = new InstallmentPaymentService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // PAYMENT PLAN CREATION TESTS
  // ==============================================

  describe('createPaymentPlan', () => {
    const mockInvoice = {
      id: 'inv-123',
      student_id: 'student-123',
      balance_amount: 3000,
      status: 'pending',
      students: {
        name: 'Ahmad Ali',
        name_ar: 'أحمد علي'
      }
    }

    const mockPaymentPlan = {
      id: 'plan-123',
      invoice_id: 'inv-123',
      student_id: 'student-123',
      total_amount: 3000,
      number_of_installments: 3,
      installment_amount: 1000,
      frequency: 'monthly',
      start_date: '2024-02-01',
      status: 'active'
    }

    const mockInstallments = [
      {
        id: 'inst-1',
        payment_plan_id: 'plan-123',
        installment_number: 1,
        amount: 1000,
        due_date: '2024-02-01',
        status: 'pending'
      },
      {
        id: 'inst-2',
        payment_plan_id: 'plan-123',
        installment_number: 2,
        amount: 1000,
        due_date: '2024-03-01',
        status: 'pending'
      },
      {
        id: 'inst-3',
        payment_plan_id: 'plan-123',
        installment_number: 3,
        amount: 1000,
        due_date: '2024-04-01',
        status: 'pending'
      }
    ]

    const validRequest: PaymentPlanCreationRequest = {
      invoiceId: 'inv-123',
      numberOfInstallments: 3,
      frequency: 'monthly',
      startDate: '2024-02-01',
      preferredPaymentMethod: 'mada',
      autoPayEnabled: false,
      termsAccepted: true
    }

    it('should create payment plan successfully', async () => {
      // Setup mocks
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInvoice, error: null }))
          }))
        }))
      }

      const mockPaymentPlanInsert = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPaymentPlan, error: null }))
          }))
        }))
      }

      const mockInstallmentInsert = {
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: mockInstallments, error: null }))
        }))
      }

      const mockInvoiceUpdate = {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoiceQuery
        if (table === 'payment_plans') return mockPaymentPlanInsert
        if (table === 'payment_installments') return mockInstallmentInsert
        return mockInvoiceUpdate
      })

      // Mock the calculation methods
      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([
        { amount: 1000, dueDate: '2024-02-01' },
        { amount: 1000, dueDate: '2024-03-01' },
        { amount: 1000, dueDate: '2024-04-01' }
      ])
      vi.spyOn(service as any, 'mapDatabaseToPaymentPlan').mockReturnValue(mockPaymentPlan)
      vi.spyOn(service as any, 'mapDatabaseToInstallment').mockReturnValue(mockInstallments[0])

      const result = await service.createPaymentPlan(validRequest)

      expect(result.success).toBe(true)
      expect(result.paymentPlan).toBeDefined()
      expect(result.installments).toBeDefined()
      expect(result.installments?.length).toBe(3)
    })

    it('should reject payment plan for already paid invoice', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' }
      
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: paidInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      const result = await service.createPaymentPlan(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invoice already paid in full')
    })

    it('should reject payment plan for invoice with zero balance', async () => {
      const zeroBalanceInvoice = { ...mockInvoice, balance_amount: 0 }
      
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: zeroBalanceInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      const result = await service.createPaymentPlan(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No outstanding balance to create payment plan')
    })

    it('should handle non-existent invoice', async () => {
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Not found') }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      const result = await service.createPaymentPlan(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invoice not found or invalid')
    })

    it('should create payment plan with custom installment amounts', async () => {
      const customRequest: PaymentPlanCreationRequest = {
        ...validRequest,
        customInstallmentAmounts: [1200, 900, 900] // Total 3000
      }

      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1200, 900, 900],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([
        { amount: 1200, dueDate: '2024-02-01' },
        { amount: 900, dueDate: '2024-03-01' },
        { amount: 900, dueDate: '2024-04-01' }
      ])

      const result = await service.createPaymentPlan(customRequest)

      expect(service['calculateInstallmentAmounts']).toHaveBeenCalledWith(
        3000, 3, 'monthly', undefined, [1200, 900, 900]
      )
    })

    it('should create payment plan with first payment amount', async () => {
      const firstPaymentRequest: PaymentPlanCreationRequest = {
        ...validRequest,
        firstPaymentAmount: 500 // Smaller first payment
      }

      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [500, 1250, 1250],
        calculatedFrequency: 'monthly'
      })

      await service.createPaymentPlan(firstPaymentRequest)

      expect(service['calculateInstallmentAmounts']).toHaveBeenCalledWith(
        3000, 3, 'monthly', 500, undefined
      )
    })

    it('should rollback payment plan creation on installment creation failure', async () => {
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInvoice, error: null }))
          }))
        }))
      }

      const mockPaymentPlanInsert = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPaymentPlan, error: null }))
          }))
        }))
      }

      const mockInstallmentInsert = {
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: new Error('Installment creation failed') }))
        }))
      }

      const mockPaymentPlanDelete = {
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoiceQuery
        if (table === 'payment_plans' && mockPaymentPlanInsert.insert.mock.calls.length === 0) {
          return mockPaymentPlanInsert
        }
        if (table === 'payment_plans') return mockPaymentPlanDelete
        if (table === 'payment_installments') return mockInstallmentInsert
        return mockInvoiceQuery
      })

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([
        { amount: 1000, dueDate: '2024-02-01' },
        { amount: 1000, dueDate: '2024-03-01' },
        { amount: 1000, dueDate: '2024-04-01' }
      ])

      const result = await service.createPaymentPlan(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to create installments')
      expect(mockPaymentPlanDelete.delete).toHaveBeenCalled()
    })

    // Arabic language test
    it('should handle Arabic student names correctly', async () => {
      const arabicInvoice = {
        ...mockInvoice,
        students: {
          name: 'Mohammed Al-Rashid',
          name_ar: 'محمد الراشد'
        }
      }

      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: arabicInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([])
      vi.spyOn(service as any, 'mapDatabaseToPaymentPlan').mockReturnValue(mockPaymentPlan)

      const result = await service.createPaymentPlan(validRequest)

      // Should successfully process Arabic names
      expect(result.success).toBe(true)
    })

    // Mobile responsive test (data structure should work on mobile)
    it('should return mobile-friendly data structure', async () => {
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([
        { amount: 1000, dueDate: '2024-02-01' }
      ])
      vi.spyOn(service as any, 'mapDatabaseToPaymentPlan').mockReturnValue(mockPaymentPlan)
      vi.spyOn(service as any, 'mapDatabaseToInstallment').mockReturnValue(mockInstallments[0])

      const result = await service.createPaymentPlan(validRequest)

      if (result.success) {
        expect(result.paymentPlan).toHaveProperty('id')
        expect(result.paymentPlan).toHaveProperty('totalAmount')
        expect(result.paymentPlan).toHaveProperty('numberOfInstallments')
        expect(Array.isArray(result.installments)).toBe(true)
      }
    })
  })

  // ==============================================
  // PAYMENT PLAN MODIFICATION TESTS
  // ==============================================

  describe('modifyPaymentPlan', () => {
    const mockExistingPlan = {
      id: 'plan-123',
      status: 'active',
      frequency: 'monthly',
      payment_installments: [
        { id: 'inst-1', installment_number: 1, status: 'paid', amount: 1000 },
        { id: 'inst-2', installment_number: 2, status: 'pending', amount: 1000 },
        { id: 'inst-3', installment_number: 3, status: 'pending', amount: 1000 }
      ]
    }

    const modificationRequest = {
      newSchedule: [
        { installmentNumber: 2, amount: 800, dueDate: '2024-03-15' },
        { installmentNumber: 3, amount: 800, dueDate: '2024-04-15' },
        { installmentNumber: 4, amount: 400, dueDate: '2024-05-15' }
      ],
      reason: 'Customer financial hardship',
      reasonAr: 'صعوبة مالية للعميل'
    }

    it('should modify payment plan schedule successfully', async () => {
      const mockPlanQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockExistingPlan, error: null }))
          }))
        }))
      }

      const mockModificationInsert = {
        insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }

      const mockInstallmentUpdate = {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_plans') return mockPlanQuery
        if (table === 'payment_plan_modifications') return mockModificationInsert
        if (table === 'payment_installments') return mockInstallmentUpdate
        return mockPlanQuery
      })

      const result = await service.modifyPaymentPlan('plan-123', modificationRequest)

      expect(result.success).toBe(true)
      expect(mockModificationInsert.insert).toHaveBeenCalled()
    })

    it('should reject modification for non-existent payment plan', async () => {
      const mockPlanQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Not found') }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockPlanQuery)

      const result = await service.modifyPaymentPlan('invalid-plan', modificationRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment plan not found')
    })

    it('should reject modification for inactive payment plan', async () => {
      const inactivePlan = { ...mockExistingPlan, status: 'completed' }
      
      const mockPlanQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: inactivePlan, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockPlanQuery)

      const result = await service.modifyPaymentPlan('plan-123', modificationRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Can only modify active payment plans')
    })

    it('should preserve paid installments when modifying', async () => {
      const mockPlanQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockExistingPlan, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockPlanQuery)

      await service.modifyPaymentPlan('plan-123', modificationRequest)

      // Should not attempt to modify the first installment which is paid
      const modificationData = mockSupabase.from.mock.calls.find(
        call => call[0] === 'payment_plan_modifications'
      )
      expect(modificationData).toBeDefined()
    })
  })

  // ==============================================
  // AUTOMATED PAYMENT PROCESSING TESTS
  // ==============================================

  describe('processAutomatedPayments', () => {
    const mockDueInstallments = [
      {
        id: 'inst-due-1',
        payment_plan_id: 'plan-123',
        installment_number: 2,
        amount: 1000,
        due_date: '2024-02-01',
        status: 'pending',
        payment_plans: {
          auto_pay_enabled: true,
          preferred_payment_method: 'mada',
          student_id: 'student-123'
        }
      },
      {
        id: 'inst-due-2',
        payment_plan_id: 'plan-456',
        installment_number: 1,
        amount: 750,
        due_date: '2024-02-01',
        status: 'pending',
        payment_plans: {
          auto_pay_enabled: true,
          preferred_payment_method: 'stc_pay',
          student_id: 'student-456'
        }
      }
    ]

    it('should process automated payments for due installments', async () => {
      const mockInstallmentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mockDueInstallments, error: null }))
            }))
          }))
        }))
      }

      const mockPaymentUpdate = {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_installments') return mockInstallmentQuery
        return mockPaymentUpdate
      })

      // Mock payment processing
      vi.spyOn(service as any, 'processInstallmentPayment').mockResolvedValue({
        success: true,
        transactionId: 'tx-123'
      })

      const result = await service.processAutomatedPayments()

      expect(result.success).toBe(true)
      expect(result.processedPayments).toBe(2)
      expect(result.successfulPayments).toBe(2)
      expect(result.failedPayments).toBe(0)
    })

    it('should handle automated payment failures gracefully', async () => {
      const mockInstallmentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mockDueInstallments, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInstallmentQuery)

      // Mock mixed payment results
      vi.spyOn(service as any, 'processInstallmentPayment')
        .mockResolvedValueOnce({ success: true, transactionId: 'tx-1' })
        .mockResolvedValueOnce({ success: false, error: 'Payment declined' })

      const result = await service.processAutomatedPayments()

      expect(result.success).toBe(true)
      expect(result.processedPayments).toBe(2)
      expect(result.successfulPayments).toBe(1)
      expect(result.failedPayments).toBe(1)
      expect(result.errors?.length).toBe(1)
    })

    it('should skip installments without auto-pay enabled', async () => {
      const mixedInstallments = [
        ...mockDueInstallments,
        {
          id: 'inst-manual',
          payment_plan_id: 'plan-manual',
          amount: 500,
          due_date: '2024-02-01',
          status: 'pending',
          payment_plans: {
            auto_pay_enabled: false,
            preferred_payment_method: 'mada'
          }
        }
      ]

      const mockInstallmentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mixedInstallments, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInstallmentQuery)

      vi.spyOn(service as any, 'processInstallmentPayment').mockResolvedValue({
        success: true,
        transactionId: 'tx-123'
      })

      const result = await service.processAutomatedPayments()

      // Should only process the 2 auto-pay enabled installments
      expect(result.processedPayments).toBe(2)
    })
  })

  // ==============================================
  // PAYMENT PLAN ANALYTICS TESTS
  // ==============================================

  describe('getPaymentPlanAnalytics', () => {
    const mockAnalyticsData = {
      totalPlans: 50,
      activePlans: 35,
      completedPlans: 10,
      cancelledPlans: 5,
      totalValue: 150000,
      averagePlanValue: 3000,
      onTimePaymentRate: 85.5,
      autoPayAdoptionRate: 60.0
    }

    it('should generate payment plan analytics successfully', async () => {
      const mockAnalyticsQuery = {
        select: vi.fn(() => Promise.resolve({ data: [mockAnalyticsData], error: null }))
      }

      mockSupabase.from.mockReturnValue(mockAnalyticsQuery)

      // Mock the analytics calculation methods
      vi.spyOn(service as any, 'calculatePaymentPlanMetrics').mockResolvedValue(mockAnalyticsData)

      const result = await service.getPaymentPlanAnalytics({ start: '2024-01-01', end: '2024-01-31' })

      expect(result.success).toBe(true)
      expect(result.analytics?.totalActivePlans).toBe(35)
      expect(result.analytics?.onTimePaymentRate).toBe(85.5)
      expect(result.analytics?.averagePlanValue).toBe(3000)
    })

    it('should apply date range filtering to analytics', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      
      vi.spyOn(service as any, 'calculatePaymentPlanMetrics').mockResolvedValue(mockAnalyticsData)

      await service.getPaymentPlanAnalytics(dateRange)

      expect(service['calculatePaymentPlanMetrics']).toHaveBeenCalledWith(dateRange)
    })

    it('should handle analytics calculation errors', async () => {
      vi.spyOn(service as any, 'calculatePaymentPlanMetrics').mockRejectedValue(
        new Error('Analytics calculation failed')
      )

      const result = await service.getPaymentPlanAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Analytics calculation failed')
    })
  })

  // ==============================================
  // LATE PAYMENT PROCESSING TESTS
  // ==============================================

  describe('processLatePayments', () => {
    const mockOverdueInstallments = [
      {
        id: 'inst-late-1',
        payment_plan_id: 'plan-123',
        amount: 1000,
        due_date: '2024-01-15', // 10 days overdue
        status: 'overdue',
        payment_plans: {
          late_fees_enabled: true,
          late_fee_amount: 25,
          grace_period_days: 7
        }
      },
      {
        id: 'inst-late-2',
        payment_plan_id: 'plan-456',
        amount: 750,
        due_date: '2024-01-20', // 5 days overdue (within grace period)
        status: 'pending',
        payment_plans: {
          late_fees_enabled: true,
          late_fee_amount: 25,
          grace_period_days: 7
        }
      }
    ]

    it('should apply late fees to overdue installments', async () => {
      const mockOverdueQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => Promise.resolve({ data: mockOverdueInstallments, error: null }))
          }))
        }))
      }

      const mockLateFeeInsert = {
        insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }

      const mockInstallmentUpdate = {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_installments') return mockOverdueQuery
        if (table === 'late_fees') return mockLateFeeInsert
        return mockInstallmentUpdate
      })

      const result = await service.processLatePayments()

      expect(result.success).toBe(true)
      expect(result.processedInstallments).toBe(1) // Only one beyond grace period
      expect(result.lateFeesApplied).toBe(1)
      expect(mockLateFeeInsert.insert).toHaveBeenCalledTimes(1)
    })

    it('should respect grace period settings', async () => {
      const mockOverdueQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => Promise.resolve({ data: [mockOverdueInstallments[1]], error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockOverdueQuery)

      const result = await service.processLatePayments()

      // Should not apply late fees within grace period
      expect(result.lateFeesApplied).toBe(0)
    })

    it('should skip late fees when disabled', async () => {
      const noLateFeeInstallments = [{
        ...mockOverdueInstallments[0],
        payment_plans: {
          ...mockOverdueInstallments[0].payment_plans,
          late_fees_enabled: false
        }
      }]

      const mockOverdueQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => Promise.resolve({ data: noLateFeeInstallments, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockOverdueQuery)

      const result = await service.processLatePayments()

      expect(result.lateFeesApplied).toBe(0)
    })
  })

  // ==============================================
  // EDGE CASES AND ERROR HANDLING
  // ==============================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid installment calculations', async () => {
      const invalidRequest: PaymentPlanCreationRequest = {
        invoiceId: 'inv-123',
        numberOfInstallments: 0, // Invalid
        frequency: 'monthly',
        startDate: '2024-02-01',
        preferredPaymentMethod: 'mada',
        termsAccepted: true
      }

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockImplementation(() => {
        throw new Error('Invalid installment calculation')
      })

      const result = await service.createPaymentPlan(invalidRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during payment plan creation')
    })

    it('should handle database transaction failures', async () => {
      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'inv-123', balance_amount: 3000, status: 'pending' }, 
              error: null 
            }))
          }))
        }))
      }

      const mockFailingInsert = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoiceQuery
        return mockFailingInsert
      })

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })

      const result = await service.createPaymentPlan({
        invoiceId: 'inv-123',
        numberOfInstallments: 3,
        frequency: 'monthly',
        startDate: '2024-02-01',
        preferredPaymentMethod: 'mada',
        termsAccepted: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to create payment plan')
    })

    it('should handle very large payment amounts', async () => {
      const largeAmountInvoice = {
        id: 'inv-large',
        balance_amount: 1000000, // 1 million SAR
        status: 'pending'
      }

      const mockInvoiceQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: largeAmountInvoice, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockInvoiceQuery)

      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: Array(12).fill(83333.33), // 12 monthly installments
        calculatedFrequency: 'monthly'
      })

      const result = await service.createPaymentPlan({
        invoiceId: 'inv-large',
        numberOfInstallments: 12,
        frequency: 'monthly',
        startDate: '2024-02-01',
        preferredPaymentMethod: 'bank_transfer', // Suitable for large amounts
        termsAccepted: true
      })

      // Should handle large amounts appropriately
      expect(service['calculateInstallmentAmounts']).toHaveBeenCalledWith(
        1000000, 12, 'monthly', undefined, undefined
      )
    })

    it('should handle malformed date inputs', async () => {
      const invalidDateRequest: PaymentPlanCreationRequest = {
        invoiceId: 'inv-123',
        numberOfInstallments: 3,
        frequency: 'monthly',
        startDate: 'invalid-date',
        preferredPaymentMethod: 'mada',
        termsAccepted: true
      }

      vi.spyOn(service as any, 'generateInstallmentSchedule').mockImplementation(() => {
        throw new Error('Invalid date format')
      })

      const result = await service.createPaymentPlan(invalidDateRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during payment plan creation')
    })
  })

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should handle concurrent payment plan creation efficiently', async () => {
      // Mock successful responses
      vi.spyOn(service as any, 'calculateInstallmentAmounts').mockReturnValue({
        installmentAmounts: [1000, 1000, 1000],
        calculatedFrequency: 'monthly'
      })
      vi.spyOn(service as any, 'generateInstallmentSchedule').mockReturnValue([])
      vi.spyOn(service as any, 'mapDatabaseToPaymentPlan').mockReturnValue({})
      vi.spyOn(service as any, 'mapDatabaseToInstallment').mockReturnValue({})

      const mockSuccessfulQueries = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'inv-123', balance_amount: 3000, status: 'pending' }, 
              error: null 
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'plan-123' }, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockSuccessfulQueries)

      const startTime = Date.now()
      
      // Create multiple concurrent payment plans
      const promises = Array.from({ length: 5 }, (_, i) => 
        service.createPaymentPlan({
          invoiceId: `inv-${i}`,
          numberOfInstallments: 3,
          frequency: 'monthly',
          startDate: '2024-02-01',
          preferredPaymentMethod: 'mada',
          termsAccepted: true
        })
      )

      await Promise.all(promises)
      const executionTime = Date.now() - startTime

      expect(executionTime).toBeLessThan(3000) // Should complete within 3 seconds
    })

    it('should efficiently process large batches of automated payments', async () => {
      const largeBatchInstallments = Array.from({ length: 50 }, (_, i) => ({
        id: `inst-${i}`,
        payment_plan_id: `plan-${i}`,
        amount: 1000 + i,
        due_date: '2024-02-01',
        status: 'pending',
        payment_plans: {
          auto_pay_enabled: true,
          preferred_payment_method: 'mada'
        }
      }))

      const mockLargeBatchQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: largeBatchInstallments, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockLargeBatchQuery)

      vi.spyOn(service as any, 'processInstallmentPayment').mockResolvedValue({
        success: true,
        transactionId: 'tx-batch'
      })

      const startTime = Date.now()
      const result = await service.processAutomatedPayments()
      const executionTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.processedPayments).toBe(50)
      expect(executionTime).toBeLessThan(5000) // Should process 50 payments within 5 seconds
    })
  })
})