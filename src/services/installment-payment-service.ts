/**
 * Enhanced Installment Payment Service
 * Story 4.2: installment-payment-system
 * 
 * Enhanced service for managing installment payment plans and payments
 * Handles CRUD operations, payment recording, status updates, and automation
 */

import { supabase } from '../lib/supabase'
import type {
  PaymentPlan,
  PaymentInstallment,
  PaymentPlanTemplate,
  PaymentPlanCreationRequest,
  PaymentPlanAnalytics,
  PaymentPlanModification,
  AutomatedPaymentProcessing,
  PaymentMethod,
  Currency
} from '../types/financial-management'
import type {
  InstallmentPlan,
  InstallmentPayment,
  InstallmentPlanFormData,
  PaymentRecordingData,
  InstallmentDashboardData,
  OverdueInstallment
} from '../types/billing'

// ==============================================
// PAYMENT PLAN CREATION AND MANAGEMENT
// ==============================================

export class InstallmentPaymentService {
  
  // ==============================================
  // ENHANCED METHODS FOR STORY 4.2
  // ==============================================

  /**
   * إنشاء خطة دفعة مقسطة جديدة / Create new installment payment plan (Story 4.2)
   * Creates an installment plan using new database schema
   */
  static async createInstallmentPlanEnhanced(formData: InstallmentPlanFormData): Promise<{
    data: InstallmentPlan | null
    error: string | null
  }> {
    try {
      // Input validation
      if (formData.numberOfInstallments <= 0) {
        return { data: null, error: 'عدد الأقساط يجب أن يكون أكبر من صفر / Number of installments must be greater than zero' }
      }

      if (new Date(formData.startDate) < new Date()) {
        return { data: null, error: 'تاريخ البداية يجب أن يكون في المستقبل / Start date must be in the future' }
      }

      // Get invoice details to calculate total amount
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount, balance_amount, student_id')
        .eq('id', formData.invoiceId)
        .single()

      if (invoiceError || !invoice) {
        return { data: null, error: 'لم يتم العثور على الفاتورة / Invoice not found' }
      }

      // Calculate installment amount
      const totalAmount = invoice.balance_amount || invoice.total_amount
      const installmentAmount = formData.firstPaymentAmount || 
        Math.round((totalAmount / formData.numberOfInstallments) * 100) / 100

      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) {
        return { data: null, error: 'غير مصرح / Unauthorized' }
      }

      // Create installment plan with new schema
      const planData = {
        subscription_id: null, // Will be filled if subscription exists
        invoice_id: formData.invoiceId,
        student_id: invoice.student_id,
        total_amount: totalAmount,
        number_of_installments: formData.numberOfInstallments,
        installment_amount: installmentAmount,
        frequency: formData.frequency,
        start_date: formData.startDate,
        status: 'active' as const,
        terms_accepted: formData.termsAccepted,
        terms_accepted_date: formData.termsAccepted ? new Date().toISOString() : null,
        late_fees_enabled: true,
        late_fee_amount: 50, // Default late fee
        grace_period_days: 3,
        reminder_settings: {
          days_before_due: [7, 3, 1],
          days_after_due: [1, 7, 14],
          methods: ['email', 'whatsapp']
        },
        created_by: currentUser.data.user.id,
        updated_by: currentUser.data.user.id
      }

      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert(planData)
        .select('*')
        .single()

      if (planError) {
        console.error('Error creating installment plan:', planError)
        return { data: null, error: 'خطأ في إنشاء خطة الأقساط / Error creating installment plan' }
      }

      // Generate installment payment records using database function
      const { error: generateError } = await supabase
        .rpc('generate_installment_payments', {
          plan_id: plan.id
        })

      if (generateError) {
        console.error('Error generating installment payments:', generateError)
        // Rollback the plan creation
        await supabase.from('installment_plans').delete().eq('id', plan.id)
        return { data: null, error: 'خطأ في إنشاء جدول الدفعات / Error creating payment schedule' }
      }

      return { data: plan, error: null }
    } catch (error) {
      console.error('Unexpected error creating installment plan:', error)
      return { data: null, error: 'خطأ غير متوقع / Unexpected error occurred' }
    }
  }

  /**
   * جلب بيانات لوحة تحكم الأقساط / Get installment dashboard data (Story 4.2)
   */
  static async getDashboardData(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string[]
      studentId?: string
      overdueOnly?: boolean
    }
  ): Promise<{
    data: InstallmentDashboardData[]
    totalCount: number
    error: string | null
  }> {
    try {
      let query = supabase
        .from('installment_dashboard_view')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('plan_status', filters.status)
      }

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      if (filters?.overdueOnly) {
        query = query.gt('overdue_installments', 0)
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching dashboard data:', error)
        return { data: [], totalCount: 0, error: 'خطأ في جلب البيانات / Error fetching data' }
      }

      return { data: data || [], totalCount: count || 0, error: null }
    } catch (error) {
      console.error('Unexpected error fetching dashboard data:', error)
      return { data: [], totalCount: 0, error: 'خطأ غير متوقع / Unexpected error occurred' }
    }
  }

  /**
   * تسجيل دفعة قسط / Record installment payment (Story 4.2)
   */
  static async recordPayment(paymentData: PaymentRecordingData): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      // Get installment details
      const { data: installment, error: installmentError } = await supabase
        .from('installment_payments')
        .select(`
          *,
          installment_plans (
            total_amount,
            student_id
          )
        `)
        .eq('id', paymentData.installmentPaymentId)
        .single()

      if (installmentError || !installment) {
        return { success: false, error: 'لم يتم العثور على القسط / Installment not found' }
      }

      // Validate payment amount
      if (paymentData.amount <= 0) {
        return { success: false, error: 'مبلغ الدفع يجب أن يكون أكبر من صفر / Payment amount must be greater than zero' }
      }

      const outstandingAmount = installment.amount - (installment.paid_amount || 0)
      if (paymentData.amount > outstandingAmount) {
        return { success: false, error: 'مبلغ الدفع أكبر من المبلغ المطلوب / Payment amount exceeds outstanding balance' }
      }

      // Calculate new paid amount and status
      const newPaidAmount = (installment.paid_amount || 0) + paymentData.amount
      let newStatus: 'pending' | 'paid' | 'overdue' | 'partial'

      if (newPaidAmount >= installment.amount) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      } else {
        newStatus = installment.status
      }

      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) {
        return { success: false, error: 'غير مصرح / Unauthorized' }
      }

      // Update installment payment
      const { error: updateError } = await supabase
        .from('installment_payments')
        .update({
          paid_amount: newPaidAmount,
          paid_date: newStatus === 'paid' ? paymentData.paymentDate : installment.paid_date,
          status: newStatus,
          payment_method: paymentData.paymentMethod,
          transaction_id: paymentData.transactionId,
          receipt_number: paymentData.receiptNumber,
          notes: paymentData.notes,
          updated_by: currentUser.data.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentData.installmentPaymentId)

      if (updateError) {
        console.error('Error updating installment payment:', updateError)
        return { success: false, error: 'خطأ في تحديث الدفعة / Error updating payment' }
      }

      // Check if all installments are paid and update plan status
      const { data: allInstallments } = await supabase
        .from('installment_payments')
        .select('status')
        .eq('installment_plan_id', installment.installment_plan_id)

      const allPaid = allInstallments?.every(inst => inst.status === 'paid')

      if (allPaid) {
        await supabase
          .from('installment_plans')
          .update({
            status: 'completed',
            updated_by: currentUser.data.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', installment.installment_plan_id)
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Unexpected error recording payment:', error)
      return { success: false, error: 'خطأ غير متوقع / Unexpected error occurred' }
    }
  }

  /**
   * جلب الأقساط المتأخرة / Get overdue installments (Story 4.2)
   */
  static async getOverdueInstallments(): Promise<{
    data: OverdueInstallment[]
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('overdue_installments_view')
        .select('*')
        .order('due_date', { ascending: true })

      if (error) {
        console.error('Error fetching overdue installments:', error)
        return { data: [], error: 'خطأ في جلب الأقساط المتأخرة / Error fetching overdue installments' }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Unexpected error fetching overdue installments:', error)
      return { data: [], error: 'خطأ غير متوقع / Unexpected error occurred' }
    }
  }

  /**
   * تحديث حالة الأقساط المتأخرة / Update overdue installment status (Story 4.2)
   */
  static async updateOverdueStatus(): Promise<{
    updatedCount: number
    error: string | null
  }> {
    try {
      // Call the database function to update overdue status
      const { error } = await supabase
        .rpc('update_overdue_installments')

      if (error) {
        console.error('Error updating overdue status:', error)
        return { updatedCount: 0, error: 'خطأ في تحديث حالة الأقساط المتأخرة / Error updating overdue status' }
      }

      // Get count of overdue installments after update
      const { count } = await supabase
        .from('installment_payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue')

      return { updatedCount: count || 0, error: null }
    } catch (error) {
      console.error('Unexpected error updating overdue status:', error)
      return { updatedCount: 0, error: 'خطأ غير متوقع / Unexpected error occurred' }
    }
  }

  // ==============================================
  // ORIGINAL METHODS (LEGACY SUPPORT)
  // ==============================================

  /**
   * Create a new payment plan from an invoice (Legacy)
   */
  async createPaymentPlan(request: PaymentPlanCreationRequest): Promise<{
    success: boolean
    paymentPlan?: PaymentPlan
    installments?: PaymentInstallment[]
    error?: string
  }> {
    try {
      // 1. Validate invoice exists and is eligible
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, students(name, name_ar)')
        .eq('id', request.invoiceId)
        .single()

      if (invoiceError || !invoice) {
        return { success: false, error: 'Invoice not found or invalid' }
      }

      if (invoice.status === 'paid') {
        return { success: false, error: 'Invoice already paid in full' }
      }

      if (invoice.balance_amount <= 0) {
        return { success: false, error: 'No outstanding balance to create payment plan' }
      }

      // 2. Calculate installment amounts
      const totalAmount = invoice.balance_amount
      const { installmentAmounts, calculatedFrequency } = this.calculateInstallmentAmounts(
        totalAmount,
        request.numberOfInstallments,
        request.frequency,
        request.firstPaymentAmount,
        request.customInstallmentAmounts
      )

      // 3. Generate installment schedule
      const installmentSchedule = this.generateInstallmentSchedule(
        request.startDate,
        calculatedFrequency,
        installmentAmounts
      )

      // 4. Get template settings if specified
      let templateSettings = null
      if (request.templateId) {
        const { data: template } = await supabase
          .from('payment_plan_templates')
          .select('*')
          .eq('id', request.templateId)
          .eq('is_active', true)
          .single()
        
        templateSettings = template
      }

      // 5. Create payment plan record
      const paymentPlanData = {
        invoice_id: request.invoiceId,
        student_id: invoice.student_id,
        total_amount: totalAmount,
        number_of_installments: request.numberOfInstallments,
        installment_amount: installmentAmounts[0], // First installment amount
        frequency: request.frequency,
        start_date: request.startDate,
        status: 'active' as const,
        terms_accepted: request.termsAccepted,
        terms_accepted_date: new Date().toISOString(),
        late_fees_enabled: templateSettings?.late_fees_enabled ?? true,
        late_fee_amount: templateSettings?.late_fee_amount ?? 25.0,
        grace_period_days: templateSettings?.grace_period_days ?? 7,
        preferred_payment_method: request.preferredPaymentMethod,
        auto_pay_enabled: request.autoPayEnabled ?? false,
        notes: request.notes
      }

      const { data: newPaymentPlan, error: planError } = await supabase
        .from('payment_plans')
        .insert(paymentPlanData)
        .select()
        .single()

      if (planError) {
        return { success: false, error: `Failed to create payment plan: ${planError.message}` }
      }

      // 6. Create installment records
      const installmentData = installmentSchedule.map((installment, index) => ({
        payment_plan_id: newPaymentPlan.id,
        installment_number: index + 1,
        amount: installment.amount,
        due_date: installment.dueDate,
        status: 'pending' as const
      }))

      const { data: createdInstallments, error: installmentError } = await supabase
        .from('payment_installments')
        .insert(installmentData)
        .select()

      if (installmentError) {
        // Rollback payment plan creation
        await supabase.from('payment_plans').delete().eq('id', newPaymentPlan.id)
        return { success: false, error: `Failed to create installments: ${installmentError.message}` }
      }

      // 7. Update invoice status to indicate payment plan exists
      await supabase
        .from('invoices')
        .update({ payment_method: `Payment Plan - ${request.frequency}` })
        .eq('id', request.invoiceId)

      // 8. Schedule first automated reminder
      if (templateSettings?.reminder_schedule) {
        await this.schedulePaymentReminders(newPaymentPlan.id, templateSettings.reminder_schedule)
      }

      return {
        success: true,
        paymentPlan: this.mapDatabaseToPaymentPlan(newPaymentPlan),
        installments: createdInstallments.map(this.mapDatabaseToInstallment)
      }

    } catch (error) {
      console.error('Error creating payment plan:', error)
      return { success: false, error: 'Internal server error during payment plan creation' }
    }
  }

  /**
   * Modify an existing payment plan
   */
  async modifyPaymentPlan(
    paymentPlanId: string, 
    modifications: {
      newSchedule?: Array<{ installmentNumber: number; amount: number; dueDate: string }>
      newFrequency?: 'weekly' | 'biweekly' | 'monthly'
      reason: string
      reasonAr: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get current payment plan
      const { data: currentPlan, error: planError } = await supabase
        .from('payment_plans')
        .select('*, payment_installments(*)')
        .eq('id', paymentPlanId)
        .single()

      if (planError || !currentPlan) {
        return { success: false, error: 'Payment plan not found' }
      }

      if (currentPlan.status !== 'active') {
        return { success: false, error: 'Can only modify active payment plans' }
      }

      // 2. Check for existing paid installments
      const paidInstallments = currentPlan.payment_installments.filter(
        (inst: any) => inst.status === 'paid'
      )

      // 3. Create modification record
      const modificationRecord: Omit<PaymentPlanModification, 'id'> = {
        modifiedBy: 'system', // Should be actual user ID
        modificationDate: new Date().toISOString(),
        modificationType: modifications.newSchedule ? 'schedule_change' : 'terms_change',
        originalValue: {
          frequency: currentPlan.frequency,
          installments: currentPlan.payment_installments
        },
        newValue: modifications,
        reason: modifications.reason,
        reasonAr: modifications.reasonAr
      }

      // 4. If modifying schedule, update unpaid installments
      if (modifications.newSchedule) {
        const unpaidInstallments = currentPlan.payment_installments.filter(
          (inst: any) => inst.status === 'pending'
        )

        for (const inst of unpaidInstallments) {
          const newScheduleItem = modifications.newSchedule.find(
            item => item.installmentNumber === inst.installment_number
          )

          if (newScheduleItem) {
            await supabase
              .from('payment_installments')
              .update({
                amount: newScheduleItem.amount,
                due_date: newScheduleItem.dueDate,
                updated_at: new Date().toISOString()
              })
              .eq('id', inst.id)
          }
        }
      }

      // 5. Update payment plan if frequency changed
      if (modifications.newFrequency) {
        await supabase
          .from('payment_plans')
          .update({ 
            frequency: modifications.newFrequency,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentPlanId)
      }

      return { success: true }

    } catch (error) {
      console.error('Error modifying payment plan:', error)
      return { success: false, error: 'Internal server error during modification' }
    }
  }

  /**
   * Process installment payment
   */
  async processInstallmentPayment(
    installmentId: string,
    paymentData: {
      amount: number
      paymentMethod: PaymentMethod
      transactionId?: string
      receiptNumber: string
      notes?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get installment details
      const { data: installment, error: instError } = await supabase
        .from('payment_installments')
        .select('*, payment_plans(*)')
        .eq('id', installmentId)
        .single()

      if (instError || !installment) {
        return { success: false, error: 'Installment not found' }
      }

      if (installment.status === 'paid') {
        return { success: false, error: 'Installment already paid' }
      }

      // 2. Validate payment amount
      const outstandingAmount = installment.amount - (installment.paid_amount || 0)
      if (paymentData.amount > outstandingAmount + 1) { // Allow $1 tolerance
        return { success: false, error: 'Payment amount exceeds outstanding balance' }
      }

      // 3. Update installment
      const newPaidAmount = (installment.paid_amount || 0) + paymentData.amount
      const newStatus = newPaidAmount >= installment.amount ? 'paid' : 'partial'

      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          paid_amount: newPaidAmount,
          paid_date: newStatus === 'paid' ? new Date().toISOString() : installment.paid_date,
          status: newStatus,
          payment_method: paymentData.paymentMethod,
          transaction_id: paymentData.transactionId,
          receipt_number: paymentData.receiptNumber,
          notes: paymentData.notes
        })
        .eq('id', installmentId)

      if (updateError) {
        return { success: false, error: `Failed to update installment: ${updateError.message}` }
      }

      // 4. Create payment record
      await this.createPaymentRecord(
        installment.payment_plans.invoice_id,
        installment.payment_plans.student_id,
        paymentData.amount,
        paymentData.paymentMethod,
        paymentData.transactionId,
        paymentData.receiptNumber,
        paymentData.notes
      )

      // 5. Check if payment plan is completed
      await this.checkAndUpdatePaymentPlanStatus(installment.payment_plan_id)

      return { success: true }

    } catch (error) {
      console.error('Error processing installment payment:', error)
      return { success: false, error: 'Internal server error during payment processing' }
    }
  }

  // ==============================================
  // PAYMENT PLAN ANALYTICS
  // ==============================================

  /**
   * Get comprehensive payment plan analytics
   */
  async getPaymentPlanAnalytics(dateRange?: { start: string; end: string }): Promise<PaymentPlanAnalytics> {
    try {
      const baseQuery = supabase
        .from('payment_plans')
        .select(`
          *,
          payment_installments(*),
          invoices(total_amount, student_id, students(name, name_ar))
        `)

      // Apply date filter if provided
      const query = dateRange 
        ? baseQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
        : baseQuery

      const { data: paymentPlans, error } = await query

      if (error) throw error

      // Calculate metrics
      const activePlans = paymentPlans?.filter(p => p.status === 'active').length || 0
      const completedPlans = paymentPlans?.filter(p => p.status === 'completed').length || 0
      const defaultedPlans = paymentPlans?.filter(p => p.status === 'defaulted').length || 0

      const totalPlannedAmount = paymentPlans?.reduce((sum, p) => sum + p.total_amount, 0) || 0
      
      // Calculate collected amount from paid installments
      const totalCollectedAmount = paymentPlans?.reduce((sum, plan) => {
        const paidInstallments = plan.payment_installments?.filter((inst: any) => inst.status === 'paid') || []
        return sum + paidInstallments.reduce((instSum: number, inst: any) => instSum + inst.paid_amount, 0)
      }, 0) || 0

      // Calculate success rates
      const totalPlans = paymentPlans?.length || 1
      const completionRate = (completedPlans / totalPlans) * 100

      // Calculate on-time payment rate
      const allInstallments = paymentPlans?.flatMap(p => p.payment_installments || []) || []
      const paidOnTime = allInstallments.filter(inst => 
        inst.status === 'paid' && 
        new Date(inst.paid_date) <= new Date(inst.due_date)
      ).length
      const onTimePaymentRate = allInstallments.length > 0 ? (paidOnTime / allInstallments.length) * 100 : 0

      // Calculate overdue metrics
      const overdueInstallments = allInstallments.filter(inst => 
        inst.status === 'overdue' || 
        (inst.status === 'pending' && new Date(inst.due_date) < new Date())
      )
      const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + (inst.amount - (inst.paid_amount || 0)), 0)

      return {
        activePlans,
        completedPlans,
        defaultedPlans,
        totalPlannedAmount,
        totalCollectedAmount,
        completionRate,
        onTimePaymentRate,
        averageCompletionTime: 90, // Placeholder - would need more complex calculation
        averagePlanAmount: totalPlannedAmount / Math.max(totalPlans, 1),
        averageInstallmentAmount: totalPlannedAmount / Math.max(allInstallments.length, 1),
        mostPopularFrequency: 'monthly', // Would need frequency analysis
        overdueAmount,
        overdueCount: overdueInstallments.length,
        collectionEfficiency: totalPlannedAmount > 0 ? (totalCollectedAmount / totalPlannedAmount) * 100 : 0,
        monthlyTrends: [], // Would implement detailed trend analysis
        riskFactors: [
          { factor: 'Payment delays', impact: 'medium', affectedPlans: Math.floor(totalPlans * 0.15) },
          { factor: 'Economic factors', impact: 'low', affectedPlans: Math.floor(totalPlans * 0.05) }
        ]
      }

    } catch (error) {
      console.error('Error calculating payment plan analytics:', error)
      // Return default analytics structure
      return {
        activePlans: 0, completedPlans: 0, defaultedPlans: 0,
        totalPlannedAmount: 0, totalCollectedAmount: 0,
        completionRate: 0, onTimePaymentRate: 0, averageCompletionTime: 0,
        averagePlanAmount: 0, averageInstallmentAmount: 0,
        mostPopularFrequency: 'monthly', overdueAmount: 0, overdueCount: 0,
        collectionEfficiency: 0, monthlyTrends: [], riskFactors: []
      }
    }
  }

  // ==============================================
  // AUTOMATED PAYMENT PROCESSING
  // ==============================================

  /**
   * Schedule automated payment processing for installment
   */
  async scheduleAutomatedPayment(
    installmentId: string,
    paymentMethod: PaymentMethod,
    scheduledDate: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const automatedPaymentData = {
        payment_plan_id: '', // Will be filled from installment
        installment_id: installmentId,
        scheduled_date: scheduledDate,
        status: 'scheduled' as const,
        payment_method: paymentMethod,
        amount: 0, // Will be filled from installment
        retry_count: 0,
        max_retries: 3
      }

      // Get installment details to fill missing data
      const { data: installment, error: instError } = await supabase
        .from('payment_installments')
        .select('payment_plan_id, amount')
        .eq('id', installmentId)
        .single()

      if (instError || !installment) {
        return { success: false, error: 'Installment not found' }
      }

      automatedPaymentData.payment_plan_id = installment.payment_plan_id
      automatedPaymentData.amount = installment.amount

      const { error: scheduleError } = await supabase
        .from('automated_payment_processing')
        .insert(automatedPaymentData)

      if (scheduleError) {
        return { success: false, error: `Failed to schedule automated payment: ${scheduleError.message}` }
      }

      return { success: true }

    } catch (error) {
      console.error('Error scheduling automated payment:', error)
      return { success: false, error: 'Internal server error during payment scheduling' }
    }
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  private calculateInstallmentAmounts(
    totalAmount: number,
    numberOfInstallments: number,
    frequency: string,
    firstPaymentAmount?: number,
    customAmounts?: Array<{ installmentNumber: number; amount: number }>
  ) {
    if (customAmounts && customAmounts.length === numberOfInstallments) {
      return {
        installmentAmounts: customAmounts.map(ca => ca.amount),
        calculatedFrequency: frequency
      }
    }

    const baseAmount = Math.floor(totalAmount / numberOfInstallments * 100) / 100
    const remainder = totalAmount - (baseAmount * numberOfInstallments)
    
    const amounts = Array(numberOfInstallments).fill(baseAmount)
    
    // Add remainder to last installment
    if (remainder > 0) {
      amounts[amounts.length - 1] += remainder
    }

    // Handle custom first payment
    if (firstPaymentAmount && firstPaymentAmount !== baseAmount) {
      amounts[0] = firstPaymentAmount
      const remainingAmount = totalAmount - firstPaymentAmount
      const remainingInstallments = numberOfInstallments - 1
      const newBaseAmount = Math.floor(remainingAmount / remainingInstallments * 100) / 100
      
      for (let i = 1; i < amounts.length; i++) {
        amounts[i] = newBaseAmount
      }
      
      // Adjust last payment for any rounding differences
      const calculatedTotal = amounts.reduce((sum, amount) => sum + amount, 0)
      const difference = totalAmount - calculatedTotal
      if (Math.abs(difference) > 0.01) {
        amounts[amounts.length - 1] += difference
      }
    }

    return { installmentAmounts: amounts, calculatedFrequency: frequency }
  }

  private generateInstallmentSchedule(
    startDate: string,
    frequency: string,
    amounts: number[]
  ): Array<{ amount: number; dueDate: string }> {
    const schedule = []
    let currentDate = new Date(startDate)

    for (let i = 0; i < amounts.length; i++) {
      schedule.push({
        amount: amounts[i],
        dueDate: currentDate.toISOString().split('T')[0]
      })

      // Calculate next due date
      switch (frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7)
          break
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14)
          break
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
      }
    }

    return schedule
  }

  private async createPaymentRecord(
    invoiceId: string,
    studentId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionId?: string,
    receiptNumber?: string,
    notes?: string
  ) {
    const paymentData = {
      invoice_id: invoiceId,
      student_id: studentId,
      amount,
      payment_method: paymentMethod,
      currency: 'SAR' as Currency,
      transaction_id: transactionId,
      receipt_number: receiptNumber || `REC-${Date.now()}`,
      status: 'completed' as const,
      notes
    }

    await supabase.from('payments').insert(paymentData)
  }

  private async checkAndUpdatePaymentPlanStatus(paymentPlanId: string) {
    const { data: installments } = await supabase
      .from('payment_installments')
      .select('status')
      .eq('payment_plan_id', paymentPlanId)

    if (!installments) return

    const allPaid = installments.every(inst => inst.status === 'paid')
    
    if (allPaid) {
      await supabase
        .from('payment_plans')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', paymentPlanId)
    }
  }

  private async schedulePaymentReminders(paymentPlanId: string, reminderSchedule: any) {
    // Implementation for scheduling reminders would integrate with notification system
    console.log('Scheduling payment reminders for plan:', paymentPlanId, reminderSchedule)
  }

  private mapDatabaseToPaymentPlan(dbPlan: any): PaymentPlan {
    return {
      id: dbPlan.id,
      invoiceId: dbPlan.invoice_id,
      studentId: dbPlan.student_id,
      totalAmount: dbPlan.total_amount,
      numberOfInstallments: dbPlan.number_of_installments,
      installmentAmount: dbPlan.installment_amount,
      frequency: dbPlan.frequency,
      startDate: dbPlan.start_date,
      status: dbPlan.status,
      termsAccepted: dbPlan.terms_accepted,
      termsAcceptedDate: dbPlan.terms_accepted_date,
      lateFeesEnabled: dbPlan.late_fees_enabled,
      lateFeeAmount: dbPlan.late_fee_amount,
      gracePeroidDays: dbPlan.grace_period_days,
      reminderSettings: {
        daysBeforeDue: [7, 3, 1],
        daysAfterDue: [1, 3, 7],
        methods: ['email', 'sms']
      },
      createdAt: dbPlan.created_at,
      updatedAt: dbPlan.updated_at
    }
  }

  private mapDatabaseToInstallment(dbInstallment: any): PaymentInstallment {
    return {
      id: dbInstallment.id,
      paymentPlanId: dbInstallment.payment_plan_id,
      installmentNumber: dbInstallment.installment_number,
      amount: dbInstallment.amount,
      dueDate: dbInstallment.due_date,
      paidDate: dbInstallment.paid_date,
      paidAmount: dbInstallment.paid_amount,
      status: dbInstallment.status,
      paymentMethod: dbInstallment.payment_method,
      transactionId: dbInstallment.transaction_id,
      receiptNumber: dbInstallment.receipt_number,
      remindersSent: [], // Would be populated from reminders table
      notes: dbInstallment.notes,
      createdAt: dbInstallment.created_at
    }
  }
}

// Export singleton instance
export const installmentPaymentService = new InstallmentPaymentService()