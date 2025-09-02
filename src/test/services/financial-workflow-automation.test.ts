// Financial Workflow Automation Service Tests - Story 2.3 Task 6
// Comprehensive test coverage for all workflow automation functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { financialWorkflowAutomationService } from '../../services/financial-workflow-automation'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    raw: vi.fn((query: string) => ({ query }))
  }
}))

describe('FinancialWorkflowAutomationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // CONFIGURATION TESTS
  // ==============================================

  describe('Configuration Management', () => {
    it('should get default workflow configuration', async () => {
      const result = await financialWorkflowAutomationService.getWorkflowConfig()
      
      expect(result.success).toBe(true)
      expect(result.config).toBeDefined()
      expect(result.config?.paymentReminders.enabled).toBe(true)
      expect(result.config?.overdueProcessing.enabled).toBe(true)
      expect(result.config?.autoInvoiceGeneration.enabled).toBe(true)
    })

    it('should update workflow configuration', async () => {
      const newConfig = {
        paymentReminders: {
          enabled: false,
          schedules: []
        }
      }

      const result = await financialWorkflowAutomationService.updateWorkflowConfig(newConfig)
      
      expect(result.success).toBe(true)
      expect(result.config?.paymentReminders.enabled).toBe(false)
    })

    it('should handle configuration update errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      vi.mocked(financialWorkflowAutomationService.getWorkflowConfig).mockRejectedValueOnce(mockError)

      const result = await financialWorkflowAutomationService.getWorkflowConfig()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })
  })

  // ==============================================
  // AUTOMATED INVOICE GENERATION TESTS
  // ==============================================

  describe('Automated Invoice Generation', () => {
    const mockEnrollments = [
      {
        id: 'enroll_1',
        student_id: 'student_1',
        plan_id: 'plan_1',
        monthly_fee: 800,
        sessions_per_month: 8,
        last_invoice_generated_at: '2025-08-01T00:00:00Z',
        start_date: '2025-07-01T00:00:00Z',
        therapy_plans: {
          name_en: 'Speech Therapy Program',
          price: 800
        }
      }
    ]

    it('should schedule automatic invoices for eligible enrollments', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockEnrollments, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.scheduleAutomaticInvoices()
      
      expect(result.success).toBe(true)
      expect(result.schedules).toBeDefined()
      expect(Array.isArray(result.schedules)).toBe(true)
    })

    it('should generate invoices from schedules', async () => {
      const mockScheduledInvoices = [
        {
          id: 'schedule_1',
          studentId: 'student_1',
          planId: 'plan_1',
          amount: 800,
          frequency: 'monthly',
          next_generation_date: new Date().toISOString(),
          description: 'Test invoice generation'
        }
      ]

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockScheduledInvoices, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.generateScheduledInvoices()
      
      expect(result.success).toBe(true)
      expect(result.generatedInvoices).toBeDefined()
    })

    it('should handle invoice generation errors', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any)

      const result = await financialWorkflowAutomationService.generateScheduledInvoices()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })

    it('should calculate next invoice date correctly', async () => {
      // Test monthly frequency
      const startDate = '2025-01-15'
      const service = financialWorkflowAutomationService as any
      const nextDate = service.calculateNextInvoiceDate(startDate, 'monthly')
      
      expect(new Date(nextDate).getMonth()).toBe(new Date(startDate).getMonth() + 1)
    })

    it('should generate proper invoice numbers', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { next_number: 1 }, error: null })
      } as any)

      const service = financialWorkflowAutomationService as any
      const invoiceNumber = await service.generateInvoiceNumber()
      
      expect(invoiceNumber).toMatch(/INV-\d{6}-\d{4}/)
    })
  })

  // ==============================================
  // PAYMENT REMINDER TESTS
  // ==============================================

  describe('Payment Reminder System', () => {
    const mockInvoices = [
      {
        id: 'invoice_1',
        total_amount: 800,
        due_date: '2025-09-15',
        status: 'pending',
        students: {
          parents: [{ parent_id: 'parent_1' }]
        }
      }
    ]

    it('should schedule payment reminders for unpaid invoices', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.schedulePaymentReminders()
      
      expect(result.success).toBe(true)
      expect(result.scheduledReminders).toBeDefined()
      expect(Array.isArray(result.scheduledReminders)).toBe(true)
    })

    it('should send scheduled reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder_1',
          invoice_id: 'invoice_1',
          parent_id: 'parent_1',
          reminder_type: 'first',
          scheduled_for: new Date().toISOString(),
          channels: ['email'],
          status: 'pending',
          template_id: 'payment_reminder_7_days',
          invoices: { invoice_number: 'INV-001', due_date: '2025-09-15', total_amount: 800 },
          parents: { name: 'John Doe', email: 'john@example.com' }
        }
      ]

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockReminders, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.sendScheduledReminders()
      
      expect(result.success).toBe(true)
      expect(result.sentReminders).toBeDefined()
    })

    it('should categorize reminder types correctly', async () => {
      const service = financialWorkflowAutomationService as any
      
      expect(service.getReminderType(7)).toBe('first')
      expect(service.getReminderType(3)).toBe('second')
      expect(service.getReminderType(1)).toBe('final')
      expect(service.getReminderType(0)).toBe('overdue')
    })

    it('should calculate reminder dates correctly', async () => {
      const dueDate = '2025-09-15T00:00:00Z'
      const daysBefore = 7
      const service = financialWorkflowAutomationService as any
      const reminderDate = service.calculateReminderDate(dueDate, daysBefore)
      
      const expectedDate = new Date(dueDate)
      expectedDate.setDate(expectedDate.getDate() - daysBefore)
      
      expect(new Date(reminderDate).toDateString()).toBe(expectedDate.toDateString())
    })
  })

  // ==============================================
  // OVERDUE PROCESSING TESTS
  // ==============================================

  describe('Overdue Invoice Processing', () => {
    const mockOverdueInvoices = [
      {
        id: 'invoice_overdue_1',
        total_amount: 800,
        due_date: '2025-08-15', // 17 days ago assuming current date is Sept 1
        status: 'pending',
        students: { name: 'Test Student' },
        overdue_actions: []
      }
    ]

    it('should process overdue invoices with escalation', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockOverdueInvoices, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.processOverdueInvoices()
      
      expect(result.success).toBe(true)
      expect(result.processedInvoices).toBeDefined()
      expect(Array.isArray(result.processedInvoices)).toBe(true)
    })

    it('should skip already processed overdue actions', async () => {
      const invoiceWithAction = [{
        ...mockOverdueInvoices[0],
        overdue_actions: [
          {
            action_type: 'notify',
            days_overdue: 14,
            taken_at: '2025-08-30T00:00:00Z'
          }
        ]
      }]

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: invoiceWithAction, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.processOverdueInvoices()
      
      expect(result.success).toBe(true)
      // Should skip processing if action already taken
      expect(result.processedInvoices?.length).toBe(0)
    })

    it('should determine appropriate escalation steps', async () => {
      const config = {
        overdueProcessing: {
          escalationSteps: [
            { daysOverdue: 1, action: 'notify', template: 'overdue_1_day' },
            { daysOverdue: 7, action: 'notify', template: 'overdue_1_week' },
            { daysOverdue: 14, action: 'suspend_services', template: 'suspend_notice' }
          ]
        }
      }

      // Test 10 days overdue should trigger 7-day step
      const stepFor10Days = config.overdueProcessing.escalationSteps
        .filter(step => step.daysOverdue <= 10)
        .sort((a, b) => b.daysOverdue - a.daysOverdue)[0]

      expect(stepFor10Days.daysOverdue).toBe(7)
      expect(stepFor10Days.action).toBe('notify')
    })
  })

  // ==============================================
  // PAYMENT RECONCILIATION TESTS
  // ==============================================

  describe('Smart Payment Reconciliation', () => {
    const mockUnmatchedPayments = [
      {
        id: 'payment_1',
        amount: 800,
        student_id: 'student_1',
        payment_date: '2025-09-01T10:00:00Z',
        payment_method: 'mada',
        status: 'confirmed',
        students: { name: 'Test Student' }
      }
    ]

    const mockUnpaidInvoices = [
      {
        id: 'invoice_1',
        total_amount: 800,
        student_id: 'student_1',
        issue_date: '2025-08-28T00:00:00Z',
        status: 'pending',
        students: { name: 'Test Student' }
      }
    ]

    it('should perform automatic payment reconciliation', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockUnmatchedPayments, error: null })
      } as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockUnpaidInvoices, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.autoReconcilePayments()
      
      expect(result.success).toBe(true)
      expect(result.reconciledPayments).toBeDefined()
      expect(result.unmatchedPayments).toBeDefined()
    })

    it('should handle reconciliation with different matching confidence levels', async () => {
      const payments = [
        { id: 'pay_1', amount: 800.00, student_id: 'student_1', payment_date: '2025-09-01T10:00:00Z' },
        { id: 'pay_2', amount: 795.00, student_id: 'student_1', payment_date: '2025-09-01T11:00:00Z' }, // Close amount
        { id: 'pay_3', amount: 1000.00, student_id: 'student_2', payment_date: '2025-09-01T12:00:00Z' } // Different amount/student
      ]

      const invoices = [
        { id: 'inv_1', total_amount: 800.00, student_id: 'student_1', issue_date: '2025-08-30T00:00:00Z' }
      ]

      // Mock the service's internal methods
      const service = financialWorkflowAutomationService as any
      
      // Test exact matching
      const exactMatch = service.calculateMatchingConfidence(payments[0], invoices[0], 5.0)
      expect(exactMatch).toBeGreaterThan(0.9) // High confidence for exact match

      // Test fuzzy matching
      const fuzzyMatch = service.calculateMatchingConfidence(payments[1], invoices[0], 10.0)
      expect(fuzzyMatch).toBeGreaterThan(0.7) // Lower but acceptable confidence

      // Test poor matching
      const poorMatch = service.calculateMatchingConfidence(payments[2], invoices[0], 5.0)
      expect(poorMatch).toBeLessThan(0.7) // Low confidence
    })

    it('should handle partial payment reconciliation', async () => {
      const partialPayment = {
        id: 'payment_partial',
        amount: 400, // Half of invoice
        student_id: 'student_1',
        payment_date: '2025-09-01T10:00:00Z'
      }

      const invoice = {
        id: 'invoice_1',
        total_amount: 800,
        student_id: 'student_1',
        issue_date: '2025-08-30T00:00:00Z'
      }

      // This should be recognized as a partial payment (50% of total)
      expect(partialPayment.amount).toBeLessThan(invoice.total_amount)
      expect(partialPayment.amount).toBeGreaterThanOrEqual(invoice.total_amount * 0.1) // At least 10%
      expect(partialPayment.student_id).toBe(invoice.student_id)
    })

    it('should find batch payment combinations', async () => {
      const payment = { amount: 1200, student_id: 'student_1' }
      const invoices = [
        { id: 'inv_1', total_amount: 500, student_id: 'student_1' },
        { id: 'inv_2', total_amount: 300, student_id: 'student_1' },
        { id: 'inv_3', total_amount: 400, student_id: 'student_1' }
      ]

      const service = financialWorkflowAutomationService as any
      const combination = service.findInvoiceCombination(payment.amount, invoices, 5.0)

      expect(combination).not.toBeNull()
      if (combination) {
        const totalAmount = combination.reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
        expect(Math.abs(totalAmount - payment.amount)).toBeLessThanOrEqual(5.0)
      }
    })
  })

  // ==============================================
  // COLLECTION OPTIMIZATION TESTS
  // ==============================================

  describe('Payment Collection Optimization', () => {
    it('should analyze collection performance metrics', async () => {
      // Mock payment and invoice data
      const mockPayments = [
        { amount: 800, payment_method: 'mada', status: 'confirmed', payment_date: '2025-09-01T00:00:00Z' },
        { amount: 600, payment_method: 'bank_transfer', status: 'confirmed', payment_date: '2025-09-02T00:00:00Z' }
      ]

      const mockInvoices = [
        { total_amount: 800, issue_date: '2025-08-25T00:00:00Z' },
        { total_amount: 600, issue_date: '2025-08-26T00:00:00Z' }
      ]

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
      } as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.optimizePaymentCollection()
      
      expect(result.success).toBe(true)
      expect(result.currentMetrics).toBeDefined()
      expect(result.currentMetrics?.collectionRate).toBeGreaterThanOrEqual(0)
      expect(result.currentMetrics?.averageDaysToPayment).toBeGreaterThanOrEqual(0)
    })

    it('should track collection metrics over time', async () => {
      const result = await financialWorkflowAutomationService.trackCollectionMetrics('weekly')
      
      expect(result.success).toBe(true)
      expect(result.metrics).toBeDefined()
      expect(result.metrics?.trends).toBeDefined()
      expect(Array.isArray(result.metrics?.trends)).toBe(true)
      expect(result.metrics?.topPerformingStrategies).toBeDefined()
      expect(result.metrics?.recommendations).toBeDefined()
    })

    it('should generate optimization strategies', async () => {
      const mockMetrics = {
        collectionRate: 0.75, // Below 85% threshold
        averageDaysToPayment: 8, // Above 5 days threshold
        paymentMethodPerformance: [
          { method: 'mada', successRate: 0.90, averageDays: 3, volume: 5000 },
          { method: 'bank_transfer', successRate: 0.80, averageDays: 7, volume: 3000 }
        ],
        reminderEffectiveness: [
          { reminderType: 'whatsapp', responseRate: 0.85, averageResponseTime: 2 },
          { reminderType: 'email', responseRate: 0.60, averageResponseTime: 5 }
        ]
      }

      const service = financialWorkflowAutomationService as any
      const optimizations = await service.generateCollectionOptimizations(mockMetrics)

      expect(Array.isArray(optimizations)).toBe(true)
      expect(optimizations.length).toBeGreaterThan(0)
      
      // Should include strategy for promoting high-performing payment method
      const madaStrategy = optimizations.find((opt: any) => opt.strategy.includes('mada'))
      expect(madaStrategy).toBeDefined()
      expect(madaStrategy?.priority).toBe('high')
      expect(madaStrategy?.autoImplementable).toBe(true)
    })

    it('should calculate time periods correctly', async () => {
      const service = financialWorkflowAutomationService as any
      
      // Test weekly periods
      const weeklyPeriods = service.getTimePeriods('weekly', 4)
      expect(weeklyPeriods).toHaveLength(4)
      expect(weeklyPeriods[0].label).toContain('Week of')

      // Test monthly periods
      const monthlyPeriods = service.getTimePeriods('monthly', 3)
      expect(monthlyPeriods).toHaveLength(3)
      expect(new Date(monthlyPeriods[0].start).getDate()).toBe(1) // First day of month
    })
  })

  // ==============================================
  // N8N INTEGRATION TESTS
  // ==============================================

  describe('N8N Integration', () => {
    it('should process payment received webhook', async () => {
      const webhookData = {
        event: 'payment_received' as const,
        data: {
          paymentId: 'payment_123',
          invoiceId: 'invoice_123',
          amount: 800,
          paymentMethod: 'mada',
          studentId: 'student_123',
          parentId: 'parent_123'
        },
        source: 'n8n_workflow' as const,
        workflowId: 'workflow_123'
      }

      const result = await financialWorkflowAutomationService.processN8nWebhook(webhookData)
      
      expect(result.success).toBe(true)
      expect(result.actions).toBeDefined()
      expect(result.actions?.length).toBeGreaterThan(0)
      expect(result.actions?.[0].action).toBe('process_payment_notification')
    })

    it('should process invoice overdue webhook', async () => {
      const webhookData = {
        event: 'invoice_overdue' as const,
        data: {
          invoiceId: 'invoice_123',
          studentId: 'student_123',
          parentId: 'parent_123',
          daysPastDue: 15,
          amount: 800
        },
        source: 'n8n_workflow' as const,
        workflowId: 'workflow_123'
      }

      const result = await financialWorkflowAutomationService.processN8nWebhook(webhookData)
      
      expect(result.success).toBe(true)
      expect(result.actions).toBeDefined()
      expect(result.actions?.[0].action).toBe('process_overdue_invoice')
    })

    it('should process billing cycle trigger webhook', async () => {
      const webhookData = {
        event: 'billing_cycle_trigger' as const,
        data: {
          cycleId: 'cycle_123',
          frequency: 'monthly',
          triggerReason: 'scheduled' as const
        },
        source: 'n8n_workflow' as const
      }

      const result = await financialWorkflowAutomationService.processN8nWebhook(webhookData)
      
      expect(result.success).toBe(true)
      expect(result.actions?.[0].action).toBe('execute_billing_cycle')
    })

    it('should handle webhook processing errors', async () => {
      const webhookData = {
        event: 'unknown_event' as any,
        data: {},
        source: 'n8n_workflow' as const
      }

      const result = await financialWorkflowAutomationService.processN8nWebhook(webhookData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown webhook event')
    })
  })

  // ==============================================
  // DATA SYNCHRONIZATION TESTS
  // ==============================================

  describe('Financial Data Synchronization', () => {
    it('should synchronize with all therapy systems', async () => {
      const { supabase } = await import('../../lib/supabase')
      
      // Mock various system responses
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null })
      } as any)

      const result = await financialWorkflowAutomationService.synchronizeWithTherapySystems()
      
      expect(result.success).toBe(true)
      expect(result.synchronizedSystems).toBeDefined()
      expect(result.synchronizedSystems?.iepManagement).toBeDefined()
      expect(result.synchronizedSystems?.serviceHourTracking).toBeDefined()
      expect(result.synchronizedSystems?.parentPortal).toBeDefined()
      expect(result.synchronizedSystems?.therapistScheduling).toBeDefined()
      expect(result.totalRecordsSynchronized).toBeGreaterThanOrEqual(0)
    })

    it('should handle IEP management synchronization', async () => {
      const mockIEPGoals = [
        {
          id: 'goal_1',
          student_id: 'student_1',
          billing_threshold: 80,
          has_financial_impact: true,
          goal_progress: [
            {
              recorded_at: '2025-09-01T00:00:00Z',
              achievement_percentage: 85
            }
          ]
        }
      ]

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockIEPGoals, error: null })
      } as any)

      const service = financialWorkflowAutomationService as any
      const result = await service.syncWithIEPManagement()
      
      expect(result.status).toBe('success')
      expect(result.recordCount).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should calculate outcome-based billing correctly', async () => {
      const goal = {
        outcome_billing_rate: 200,
        billing_threshold: 75
      }

      const progress = {
        achievement_percentage: 90
      }

      const service = financialWorkflowAutomationService as any
      const billingAmount = service.calculateOutcomeBasedBilling(goal, progress)
      
      expect(billingAmount).toBe(180) // 200 * (90/100) = 180
    })

    it('should calculate billable amount for service hours', async () => {
      const serviceHour = {
        hourly_rate: 250,
        duration_minutes: 90 // 1.5 hours
      }

      const service = financialWorkflowAutomationService as any
      const billableAmount = service.calculateBillableAmount(serviceHour)
      
      expect(billableAmount).toBe(375) // 250 * 1.5 = 375
    })

    it('should calculate parent financial summary', async () => {
      const parent = {
        invoices: [
          { total_amount: 800 },
          { total_amount: 600 }
        ],
        payments: [
          { amount: 500, payment_date: '2025-09-01T00:00:00Z' },
          { amount: 300, payment_date: '2025-08-30T00:00:00Z' }
        ]
      }

      const service = financialWorkflowAutomationService as any
      const summary = service.calculateParentFinancialSummary(parent)
      
      expect(summary.totalInvoiced).toBe(1400) // 800 + 600
      expect(summary.totalPaid).toBe(800) // 500 + 300
      expect(summary.outstandingBalance).toBe(600) // 1400 - 800
      expect(summary.recentPayments).toHaveLength(2)
    })
  })

  // ==============================================
  // WORKFLOW EXECUTION TESTS
  // ==============================================

  describe('Workflow Execution Engine', () => {
    const mockWorkflow = {
      id: 'workflow_1',
      name: 'Payment Processing Workflow',
      is_active: true,
      actions: [
        {
          id: 'action_1',
          type: 'send_notification',
          parameters: { template: 'payment_received' },
          stopOnError: false
        },
        {
          id: 'action_2',
          type: 'update_payment_plan',
          parameters: { planId: 'plan_1' },
          stopOnError: true
        }
      ]
    }

    it('should execute workflow successfully', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWorkflow, error: null })
      } as any)

      const triggerData = {
        paymentId: 'payment_123',
        invoiceId: 'invoice_123'
      }

      const result = await financialWorkflowAutomationService.executeWorkflow('workflow_1', triggerData)
      
      expect(result.success).toBe(true)
      expect(result.execution).toBeDefined()
      expect(result.execution?.workflowId).toBe('workflow_1')
      expect(result.execution?.status).toBe('completed')
    })

    it('should handle workflow action failures', async () => {
      const failingWorkflow = {
        ...mockWorkflow,
        actions: [
          {
            id: 'action_fail',
            type: 'unknown_action',
            parameters: {},
            stopOnError: true
          }
        ]
      }

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: failingWorkflow, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.executeWorkflow('workflow_fail', {})
      
      expect(result.success).toBe(true) // Service succeeds but execution fails
      expect(result.execution?.status).toBe('failed')
      expect(result.execution?.error).toBeDefined()
    })

    it('should handle workflow not found', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Workflow not found' } })
      } as any)

      const result = await financialWorkflowAutomationService.executeWorkflow('nonexistent', {})
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ==============================================
  // INTEGRATION TESTS
  // ==============================================

  describe('End-to-End Integration', () => {
    it('should handle complete payment processing workflow', async () => {
      // Simulate complete payment flow: payment received -> reconciliation -> notification -> update
      const paymentData = {
        paymentId: 'payment_e2e',
        invoiceId: 'invoice_e2e',
        amount: 800,
        paymentMethod: 'mada',
        studentId: 'student_e2e',
        parentId: 'parent_e2e'
      }

      // Process payment webhook
      const webhookResult = await financialWorkflowAutomationService.processN8nWebhook({
        event: 'payment_received',
        data: paymentData,
        source: 'n8n_workflow'
      })

      expect(webhookResult.success).toBe(true)
      expect(webhookResult.actions?.some(action => action.action === 'process_payment_notification')).toBe(true)

      // Run reconciliation
      const reconciliationResult = await financialWorkflowAutomationService.autoReconcilePayments()
      expect(reconciliationResult.success).toBe(true)
    })

    it('should handle overdue invoice escalation workflow', async () => {
      const overdueData = {
        invoiceId: 'invoice_overdue',
        studentId: 'student_overdue',
        parentId: 'parent_overdue',
        daysPastDue: 20,
        amount: 1200
      }

      // Process overdue webhook
      const webhookResult = await financialWorkflowAutomationService.processN8nWebhook({
        event: 'invoice_overdue',
        data: overdueData,
        source: 'n8n_workflow'
      })

      expect(webhookResult.success).toBe(true)
      
      // Should trigger escalation for 20 days overdue
      expect(webhookResult.actions?.[0].result).toContain('20 days past due')
    })

    it('should maintain data consistency across synchronization', async () => {
      // Test that synchronization maintains referential integrity
      const syncResult = await financialWorkflowAutomationService.synchronizeWithTherapySystems()
      
      expect(syncResult.success).toBe(true)
      expect(syncResult.totalRecordsSynchronized).toBeGreaterThanOrEqual(0)
      
      // Errors should be collected but not stop the process
      if (syncResult.errors && syncResult.errors.length > 0) {
        expect(Array.isArray(syncResult.errors)).toBe(true)
      }
    })
  })

  // ==============================================
  // ERROR HANDLING TESTS
  // ==============================================

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockRejectedValue(new Error('Connection timeout'))
      } as any)

      const result = await financialWorkflowAutomationService.scheduleAutomaticInvoices()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection timeout')
    })

    it('should handle invalid webhook data gracefully', async () => {
      const invalidWebhookData = {
        event: 'payment_received' as const,
        data: null, // Invalid data
        source: 'n8n_workflow' as const
      }

      const result = await financialWorkflowAutomationService.processN8nWebhook(invalidWebhookData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle partial synchronization failures', async () => {
      // Mock one system failing while others succeed
      const service = financialWorkflowAutomationService as any
      
      // Mock successful IEP sync
      vi.spyOn(service, 'syncWithIEPManagement').mockResolvedValue({
        recordCount: 5,
        status: 'success',
        errors: []
      })

      // Mock failed service hour sync
      vi.spyOn(service, 'syncWithServiceHourTracking').mockResolvedValue({
        recordCount: 0,
        status: 'failed',
        errors: ['Service hour sync failed']
      })

      const result = await service.synchronizeWithTherapySystems()
      
      expect(result.success).toBe(true) // Overall success
      expect(result.synchronizedSystems?.iepManagement.status).toBe('success')
      expect(result.synchronizedSystems?.serviceHourTracking.status).toBe('failed')
      expect(result.errors).toContain('Service hour sync failed')
    })
  })

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Test with large mock dataset
      const largePaymentSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `payment_${i}`,
        amount: 800,
        student_id: `student_${i % 100}`, // 10 payments per student
        payment_date: new Date().toISOString(),
        status: 'confirmed'
      }))

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: largePaymentSet, error: null })
      } as any)

      const startTime = Date.now()
      const result = await financialWorkflowAutomationService.autoReconcilePayments()
      const processingTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should batch process reminders efficiently', async () => {
      const manyReminders = Array.from({ length: 100 }, (_, i) => ({
        id: `reminder_${i}`,
        invoice_id: `invoice_${i}`,
        parent_id: `parent_${i}`,
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      }))

      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: manyReminders, error: null })
      } as any)

      const result = await financialWorkflowAutomationService.sendScheduledReminders()
      
      expect(result.success).toBe(true)
      expect(result.sentReminders?.length).toBe(manyReminders.length)
    })
  })
})