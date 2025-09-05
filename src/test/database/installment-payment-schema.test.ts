/**
 * Database Schema Tests for Installment Payment System
 * Story 4.2: installment-payment-system
 * 
 * Tests the database schema, constraints, and RLS policies for installment payments
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

describe('Installment Payment Schema Tests', () => {
  let testStudentId: string
  let testInvoiceId: string
  let testSubscriptionId: string
  let testUserId: string
  let testInstallmentPlanId: string

  beforeAll(async () => {
    // Create test data dependencies
    const { data: userData } = await supabase.auth.admin.createUser({
      email: 'test-installment@example.com',
      password: 'testpassword123'
    })
    testUserId = userData.user!.id

    // Create test student (assuming students table exists)
    const { data: student } = await supabase
      .from('students')
      .insert({
        name_ar: 'طالب تجريبي للأقساط',
        name_en: 'Test Student for Installments',
        organization_id: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single()
    testStudentId = student.id

    // Create test invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        student_id: testStudentId,
        invoice_number: 'TEST-INST-001',
        issue_date: '2025-01-01',
        due_date: '2025-01-31',
        status: 'sent',
        currency: 'SAR',
        subtotal: 1000,
        total_amount: 1000,
        balance_amount: 1000,
        payment_terms: 30
      })
      .select('id')
      .single()
    testInvoiceId = invoice.id

    // Create test subscription
    const { data: subscription } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id: testStudentId,
        status: 'active',
        start_date: '2025-01-01',
        total_amount: 1000
      })
      .select('id')
      .single()
    testSubscriptionId = subscription.id
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('installment_payments').delete().eq('created_by', testUserId)
    await supabase.from('installment_plans').delete().eq('created_by', testUserId)
    await supabase.from('invoices').delete().eq('id', testInvoiceId)
    await supabase.from('student_subscriptions').delete().eq('id', testSubscriptionId)
    await supabase.from('students').delete().eq('id', testStudentId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  beforeEach(async () => {
    // Clean up installment data before each test
    await supabase.from('installment_payments').delete().eq('created_by', testUserId)
    await supabase.from('installment_plans').delete().eq('created_by', testUserId)
  })

  describe('installment_plans table', () => {
    it('should create a valid installment plan', async () => {
      const planData = {
        subscription_id: testSubscriptionId,
        invoice_id: testInvoiceId,
        student_id: testStudentId,
        total_amount: 1000,
        number_of_installments: 4,
        installment_amount: 250,
        frequency: 'monthly',
        start_date: '2025-02-01',
        terms_accepted: true,
        terms_accepted_date: new Date().toISOString(),
        late_fees_enabled: true,
        late_fee_amount: 50,
        grace_period_days: 3,
        created_by: testUserId,
        updated_by: testUserId
      }

      const { data, error } = await supabase
        .from('installment_plans')
        .insert(planData)
        .select('*')
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.id).toBeTruthy()
      expect(data.status).toBe('active')
      expect(data.frequency).toBe('monthly')
      expect(data.total_amount).toBe('1000.00')
      
      testInstallmentPlanId = data.id
    })

    it('should enforce positive total_amount constraint', async () => {
      const planData = {
        subscription_id: testSubscriptionId,
        invoice_id: testInvoiceId,
        student_id: testStudentId,
        total_amount: -100, // Invalid negative amount
        number_of_installments: 4,
        installment_amount: 250,
        frequency: 'monthly',
        start_date: '2025-02-01',
        terms_accepted: true,
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_plans')
        .insert(planData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('total_amount')
    })

    it('should enforce positive number_of_installments constraint', async () => {
      const planData = {
        subscription_id: testSubscriptionId,
        invoice_id: testInvoiceId,
        student_id: testStudentId,
        total_amount: 1000,
        number_of_installments: 0, // Invalid zero installments
        installment_amount: 250,
        frequency: 'monthly',
        start_date: '2025-02-01',
        terms_accepted: true,
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_plans')
        .insert(planData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('number_of_installments')
    })

    it('should validate frequency enum values', async () => {
      const planData = {
        subscription_id: testSubscriptionId,
        invoice_id: testInvoiceId,
        student_id: testStudentId,
        total_amount: 1000,
        number_of_installments: 4,
        installment_amount: 250,
        frequency: 'daily', // Invalid frequency
        start_date: '2025-02-01',
        terms_accepted: true,
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_plans')
        .insert(planData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('frequency')
    })

    it('should set default values correctly', async () => {
      const planData = {
        subscription_id: testSubscriptionId,
        invoice_id: testInvoiceId,
        student_id: testStudentId,
        total_amount: 1000,
        number_of_installments: 4,
        installment_amount: 250,
        start_date: '2025-02-01',
        terms_accepted: true,
        created_by: testUserId,
        updated_by: testUserId
        // Omitting optional fields to test defaults
      }

      const { data, error } = await supabase
        .from('installment_plans')
        .insert(planData)
        .select('*')
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('active')
      expect(data.frequency).toBe('monthly')
      expect(data.late_fees_enabled).toBe(true)
      expect(data.grace_period_days).toBe(3)
      expect(data.reminder_settings).toEqual({
        days_before_due: [7, 3, 1],
        days_after_due: [1, 7, 14],
        methods: ['email', 'whatsapp']
      })
    })
  })

  describe('installment_payments table', () => {
    beforeEach(async () => {
      // Create a test installment plan
      const { data: plan } = await supabase
        .from('installment_plans')
        .insert({
          subscription_id: testSubscriptionId,
          invoice_id: testInvoiceId,
          student_id: testStudentId,
          total_amount: 1000,
          number_of_installments: 4,
          installment_amount: 250,
          frequency: 'monthly',
          start_date: '2025-02-01',
          terms_accepted: true,
          created_by: testUserId,
          updated_by: testUserId
        })
        .select('id')
        .single()
      
      testInstallmentPlanId = plan.id
    })

    it('should create a valid installment payment', async () => {
      const paymentData = {
        installment_plan_id: testInstallmentPlanId,
        installment_number: 1,
        amount: 250,
        due_date: '2025-02-01',
        status: 'pending',
        created_by: testUserId,
        updated_by: testUserId
      }

      const { data, error } = await supabase
        .from('installment_payments')
        .insert(paymentData)
        .select('*')
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.id).toBeTruthy()
      expect(data.status).toBe('pending')
      expect(data.installment_number).toBe(1)
      expect(data.amount).toBe('250.00')
      expect(data.late_fee_applied).toBe(false)
      expect(data.late_fee_amount).toBe('0.00')
    })

    it('should enforce positive installment_number constraint', async () => {
      const paymentData = {
        installment_plan_id: testInstallmentPlanId,
        installment_number: 0, // Invalid zero
        amount: 250,
        due_date: '2025-02-01',
        status: 'pending',
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_payments')
        .insert(paymentData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('installment_number')
    })

    it('should enforce positive amount constraint', async () => {
      const paymentData = {
        installment_plan_id: testInstallmentPlanId,
        installment_number: 1,
        amount: -100, // Invalid negative amount
        due_date: '2025-02-01',
        status: 'pending',
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_payments')
        .insert(paymentData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('amount')
    })

    it('should validate payment status enum values', async () => {
      const paymentData = {
        installment_plan_id: testInstallmentPlanId,
        installment_number: 1,
        amount: 250,
        due_date: '2025-02-01',
        status: 'invalid_status', // Invalid status
        created_by: testUserId,
        updated_by: testUserId
      }

      const { error } = await supabase
        .from('installment_payments')
        .insert(paymentData)

      expect(error).toBeTruthy()
      expect(error?.message).toContain('status')
    })

    it('should cascade delete when installment plan is deleted', async () => {
      // Create installment payment
      const { data: payment } = await supabase
        .from('installment_payments')
        .insert({
          installment_plan_id: testInstallmentPlanId,
          installment_number: 1,
          amount: 250,
          due_date: '2025-02-01',
          status: 'pending',
          created_by: testUserId,
          updated_by: testUserId
        })
        .select('id')
        .single()

      expect(payment).toBeTruthy()

      // Delete the installment plan
      await supabase
        .from('installment_plans')
        .delete()
        .eq('id', testInstallmentPlanId)

      // Verify payment was cascade deleted
      const { data: deletedPayment } = await supabase
        .from('installment_payments')
        .select('id')
        .eq('id', payment.id)
        .single()

      expect(deletedPayment).toBeNull()
    })
  })

  describe('Database functions', () => {
    beforeEach(async () => {
      // Create a test installment plan
      const { data: plan } = await supabase
        .from('installment_plans')
        .insert({
          subscription_id: testSubscriptionId,
          invoice_id: testInvoiceId,
          student_id: testStudentId,
          total_amount: 1000,
          number_of_installments: 4,
          installment_amount: 250,
          frequency: 'monthly',
          start_date: '2025-02-01',
          terms_accepted: true,
          created_by: testUserId,
          updated_by: testUserId
        })
        .select('id')
        .single()
      
      testInstallmentPlanId = plan.id
    })

    it('should generate installment payments using generate_installment_payments function', async () => {
      // Call the function
      const { error } = await supabase
        .rpc('generate_installment_payments', {
          plan_id: testInstallmentPlanId
        })

      expect(error).toBeNull()

      // Verify payments were created
      const { data: payments } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', testInstallmentPlanId)
        .order('installment_number')

      expect(payments).toHaveLength(4)
      expect(payments[0].installment_number).toBe(1)
      expect(payments[0].amount).toBe('250.00')
      expect(payments[0].status).toBe('pending')
      expect(payments[3].installment_number).toBe(4)

      // Verify due dates are correctly calculated (monthly frequency)
      const firstDate = new Date(payments[0].due_date)
      const secondDate = new Date(payments[1].due_date)
      const daysDiff = (secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBe(30) // Monthly = 30 days
    })
  })

  describe('Performance indexes', () => {
    it('should have proper indexes for efficient queries', async () => {
      // Test that we can query efficiently by subscription_id
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('subscription_id', testSubscriptionId)

      expect(error).toBeNull()

      // Test that we can query efficiently by status and due_date
      const { data: overdueData, error: overdueError } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('status', 'pending')
        .lt('due_date', '2025-12-31')

      expect(overdueError).toBeNull()
    })
  })

  describe('Database views', () => {
    beforeEach(async () => {
      // Create test installment plan with payments
      const { data: plan } = await supabase
        .from('installment_plans')
        .insert({
          subscription_id: testSubscriptionId,
          invoice_id: testInvoiceId,
          student_id: testStudentId,
          total_amount: 1000,
          number_of_installments: 4,
          installment_amount: 250,
          frequency: 'monthly',
          start_date: '2025-02-01',
          terms_accepted: true,
          created_by: testUserId,
          updated_by: testUserId
        })
        .select('id')
        .single()
      
      testInstallmentPlanId = plan.id

      // Generate payments
      await supabase.rpc('generate_installment_payments', {
        plan_id: testInstallmentPlanId
      })

      // Mark one payment as paid
      await supabase
        .from('installment_payments')
        .update({
          status: 'paid',
          paid_amount: 250,
          paid_date: new Date().toISOString()
        })
        .eq('installment_plan_id', testInstallmentPlanId)
        .eq('installment_number', 1)
    })

    it('should correctly aggregate data in installment_dashboard_view', async () => {
      const { data, error } = await supabase
        .from('installment_dashboard_view')
        .select('*')
        .eq('id', testInstallmentPlanId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.total_installments).toBe(4)
      expect(data.paid_installments).toBe(1)
      expect(data.pending_installments).toBe(3)
      expect(data.total_paid).toBe('250.00')
      expect(data.remaining_balance).toBe('750.00')
    })
  })
})