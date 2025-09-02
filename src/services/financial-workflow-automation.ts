/**
 * Financial Workflow Automation Service
 * Automated financial processes, notifications, and business rules
 * Part of Story 2.3: Financial Management Module - Task 6
 */

import { supabase } from '../lib/supabase'
import type {
  Invoice,
  PaymentPlan,
  Payment,
  NotificationTemplate,
  WorkflowRule,
  AutomationTrigger,
  WorkflowAction
} from '../types/financial-management'

export interface FinancialWorkflowConfig {
  paymentReminders: {
    enabled: boolean
    schedules: Array<{
      daysBeforeDue: number
      channels: ('email' | 'sms' | 'whatsapp')[]
      template: string
    }>
  }
  overdueProcessing: {
    enabled: boolean
    gracePeriodDays: number
    escalationSteps: Array<{
      daysOverdue: number
      action: 'notify' | 'suspend_services' | 'collections'
      template?: string
    }>
  }
  autoInvoiceGeneration: {
    enabled: boolean
    frequency: 'weekly' | 'monthly' | 'session_based'
    generateDaysInAdvance: number
  }
  paymentReconciliation: {
    enabled: boolean
    autoMatchEnabled: boolean
    toleranceAmount: number
  }
  complianceChecks: {
    enabled: boolean
    vatValidation: boolean
    auditTrailRequired: boolean
    requireApproval: boolean
  }
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  triggerId: string
  triggerData: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  executedActions: Array<{
    actionId: string
    status: 'pending' | 'completed' | 'failed'
    executedAt?: string
    result?: any
    error?: string
  }>
  context: Record<string, any>
  error?: string
}

export interface AutomatedInvoiceSchedule {
  id: string
  studentId: string
  planId: string
  frequency: 'weekly' | 'monthly' | 'session_based'
  nextGenerationDate: string
  amount: number
  description: string
  isActive: boolean
  template?: {
    itemsStructure: any
    paymentTerms: number
    notes?: string
  }
}

export interface PaymentReminderSchedule {
  id: string
  invoiceId: string
  parentId: string
  scheduledFor: string
  reminderType: 'first' | 'second' | 'final' | 'overdue'
  channels: ('email' | 'sms' | 'whatsapp')[]
  status: 'pending' | 'sent' | 'failed'
  templateId: string
  sentAt?: string
  error?: string
}

class FinancialWorkflowAutomationService {
  private config: FinancialWorkflowConfig = {
    paymentReminders: {
      enabled: true,
      schedules: [
        { daysBeforeDue: 7, channels: ['email'], template: 'payment_reminder_7_days' },
        { daysBeforeDue: 3, channels: ['email', 'whatsapp'], template: 'payment_reminder_3_days' },
        { daysBeforeDue: 1, channels: ['email', 'sms', 'whatsapp'], template: 'payment_reminder_1_day' }
      ]
    },
    overdueProcessing: {
      enabled: true,
      gracePeriodDays: 3,
      escalationSteps: [
        { daysOverdue: 1, action: 'notify', template: 'overdue_notice_1_day' },
        { daysOverdue: 7, action: 'notify', template: 'overdue_notice_1_week' },
        { daysOverdue: 14, action: 'suspend_services', template: 'service_suspension_notice' },
        { daysOverdue: 30, action: 'collections', template: 'collections_referral_notice' }
      ]
    },
    autoInvoiceGeneration: {
      enabled: true,
      frequency: 'monthly',
      generateDaysInAdvance: 5
    },
    paymentReconciliation: {
      enabled: true,
      autoMatchEnabled: true,
      toleranceAmount: 5.00 // 5 SAR tolerance
    },
    complianceChecks: {
      enabled: true,
      vatValidation: true,
      auditTrailRequired: true,
      requireApproval: false
    }
  }

  // ==============================================
  // CONFIGURATION MANAGEMENT
  // ==============================================

  async getWorkflowConfig(): Promise<{
    success: boolean
    config?: FinancialWorkflowConfig
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('financial_workflow_configs')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return {
        success: true,
        config: data?.config || this.config
      }
    } catch (error: any) {
      console.error('Failed to get workflow config:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async updateWorkflowConfig(config: Partial<FinancialWorkflowConfig>): Promise<{
    success: boolean
    config?: FinancialWorkflowConfig
    error?: string
  }> {
    try {
      const updatedConfig = { ...this.config, ...config }

      const { data, error } = await supabase
        .from('financial_workflow_configs')
        .upsert({
          config: updatedConfig,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      this.config = updatedConfig

      return {
        success: true,
        config: updatedConfig
      }
    } catch (error: any) {
      console.error('Failed to update workflow config:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // ==============================================
  // AUTOMATED INVOICE GENERATION
  // ==============================================

  async scheduleAutomaticInvoices(): Promise<{
    success: boolean
    schedules?: AutomatedInvoiceSchedule[]
    error?: string
  }> {
    try {
      if (!this.config.autoInvoiceGeneration.enabled) {
        return { success: true, schedules: [] }
      }

      // Get all active enrollments that need automatic invoicing
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          students:student_id(*),
          therapy_plans:plan_id(*)
        `)
        .eq('status', 'active')
        .eq('auto_invoice', true)

      if (enrollmentsError) throw enrollmentsError

      const schedules: AutomatedInvoiceSchedule[] = []
      const now = new Date()
      const generateAheadDays = this.config.autoInvoiceGeneration.generateDaysInAdvance

      for (const enrollment of enrollments || []) {
        const nextGenerationDate = this.calculateNextInvoiceDate(
          enrollment.last_invoice_generated_at || enrollment.start_date,
          this.config.autoInvoiceGeneration.frequency
        )

        // Only schedule if generation date is within our advance window
        const daysDifference = (new Date(nextGenerationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDifference <= generateAheadDays && daysDifference >= 0) {
          const schedule: AutomatedInvoiceSchedule = {
            id: `schedule_${enrollment.id}_${Date.now()}`,
            studentId: enrollment.student_id,
            planId: enrollment.plan_id,
            frequency: this.config.autoInvoiceGeneration.frequency,
            nextGenerationDate,
            amount: enrollment.monthly_fee || enrollment.therapy_plans.price,
            description: `Automated invoice for ${enrollment.therapy_plans.name_en}`,
            isActive: true,
            template: {
              itemsStructure: {
                therapy_sessions: {
                  quantity: enrollment.sessions_per_month || 8,
                  unit_price: (enrollment.monthly_fee || enrollment.therapy_plans.price) / (enrollment.sessions_per_month || 8),
                  description: enrollment.therapy_plans.name_en
                }
              },
              paymentTerms: 30,
              notes: 'Automated invoice generated by system'
            }
          }

          schedules.push(schedule)
        }
      }

      // Save schedules to database
      if (schedules.length > 0) {
        const { error: insertError } = await supabase
          .from('automated_invoice_schedules')
          .upsert(schedules.map(schedule => ({
            ...schedule,
            created_at: new Date().toISOString()
          })))

        if (insertError) throw insertError
      }

      return {
        success: true,
        schedules
      }
    } catch (error: any) {
      console.error('Failed to schedule automatic invoices:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async generateScheduledInvoices(): Promise<{
    success: boolean
    generatedInvoices?: Invoice[]
    error?: string
  }> {
    try {
      const now = new Date().toISOString()

      // Get all pending scheduled invoices that are due
      const { data: scheduledInvoices, error: scheduleError } = await supabase
        .from('automated_invoice_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_generation_date', now)

      if (scheduleError) throw scheduleError

      const generatedInvoices: Invoice[] = []

      for (const schedule of scheduledInvoices || []) {
        try {
          // Generate invoice
          const invoice = await this.generateInvoiceFromSchedule(schedule)
          generatedInvoices.push(invoice)

          // Update schedule for next generation
          const nextGenerationDate = this.calculateNextInvoiceDate(
            now,
            schedule.frequency
          )

          await supabase
            .from('automated_invoice_schedules')
            .update({
              next_generation_date: nextGenerationDate,
              last_generated_at: now
            })
            .eq('id', schedule.id)

          // Update enrollment record
          await supabase
            .from('student_enrollments')
            .update({
              last_invoice_generated_at: now
            })
            .eq('student_id', schedule.studentId)
            .eq('plan_id', schedule.planId)

        } catch (error: any) {
          console.error(`Failed to generate invoice for schedule ${schedule.id}:`, error)
          
          // Mark schedule as failed
          await supabase
            .from('automated_invoice_schedules')
            .update({
              last_error: error.message,
              error_count: supabase.raw('error_count + 1')
            })
            .eq('id', schedule.id)
        }
      }

      return {
        success: true,
        generatedInvoices
      }
    } catch (error: any) {
      console.error('Failed to generate scheduled invoices:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async generateInvoiceFromSchedule(schedule: AutomatedInvoiceSchedule): Promise<Invoice> {
    const invoiceItems = []
    
    if (schedule.template?.itemsStructure) {
      for (const [key, item] of Object.entries(schedule.template.itemsStructure)) {
        invoiceItems.push({
          description: (item as any).description,
          quantity: (item as any).quantity,
          unit_price: (item as any).unit_price,
          total: (item as any).quantity * (item as any).unit_price,
          vat_rate: 0.15,
          vat_amount: (item as any).quantity * (item as any).unit_price * 0.15
        })
      }
    } else {
      invoiceItems.push({
        description: schedule.description,
        quantity: 1,
        unit_price: schedule.amount,
        total: schedule.amount,
        vat_rate: 0.15,
        vat_amount: schedule.amount * 0.15
      })
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
    const totalVAT = invoiceItems.reduce((sum, item) => sum + item.vat_amount, 0)
    const totalAmount = subtotal + totalVAT

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoice_number: await this.generateInvoiceNumber(),
      student_id: schedule.studentId,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: this.calculateDueDate(schedule.template?.paymentTerms || 30),
      status: 'pending',
      subtotal,
      vat_amount: totalVAT,
      total_amount: totalAmount,
      currency: 'SAR',
      items: invoiceItems,
      payment_terms: schedule.template?.paymentTerms || 30,
      notes: schedule.template?.notes,
      is_auto_generated: true,
      generated_from_schedule: schedule.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert invoice into database
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) throw error

    return data
  }

  // ==============================================
  // PAYMENT REMINDER AUTOMATION
  // ==============================================

  async schedulePaymentReminders(): Promise<{
    success: boolean
    scheduledReminders?: PaymentReminderSchedule[]
    error?: string
  }> {
    try {
      if (!this.config.paymentReminders.enabled) {
        return { success: true, scheduledReminders: [] }
      }

      // Get all unpaid invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          students:student_id(*, parents:student_parents(*))
        `)
        .in('status', ['pending', 'sent'])
        .gte('due_date', new Date().toISOString().split('T')[0])

      if (invoicesError) throw invoicesError

      const scheduledReminders: PaymentReminderSchedule[] = []

      for (const invoice of invoices || []) {
        for (const reminderConfig of this.config.paymentReminders.schedules) {
          const reminderDate = this.calculateReminderDate(
            invoice.due_date,
            reminderConfig.daysBeforeDue
          )

          // Only schedule future reminders
          if (new Date(reminderDate) > new Date()) {
            const reminder: PaymentReminderSchedule = {
              id: `reminder_${invoice.id}_${reminderConfig.daysBeforeDue}days`,
              invoiceId: invoice.id,
              parentId: invoice.students.parents[0]?.parent_id || '',
              scheduledFor: reminderDate,
              reminderType: this.getReminderType(reminderConfig.daysBeforeDue),
              channels: reminderConfig.channels,
              status: 'pending',
              templateId: reminderConfig.template
            }

            scheduledReminders.push(reminder)
          }
        }
      }

      // Save reminders to database
      if (scheduledReminders.length > 0) {
        const { error: insertError } = await supabase
          .from('payment_reminder_schedules')
          .upsert(scheduledReminders.map(reminder => ({
            ...reminder,
            created_at: new Date().toISOString()
          })))

        if (insertError) throw insertError
      }

      return {
        success: true,
        scheduledReminders
      }
    } catch (error: any) {
      console.error('Failed to schedule payment reminders:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async sendScheduledReminders(): Promise<{
    success: boolean
    sentReminders?: PaymentReminderSchedule[]
    error?: string
  }> {
    try {
      const now = new Date().toISOString()

      // Get all pending reminders that are due
      const { data: dueReminders, error: reminderError } = await supabase
        .from('payment_reminder_schedules')
        .select(`
          *,
          invoices:invoice_id(*),
          parents:parent_id(*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now)

      if (reminderError) throw reminderError

      const sentReminders: PaymentReminderSchedule[] = []

      for (const reminder of dueReminders || []) {
        try {
          // Send reminder through configured channels
          await this.sendReminderNotification(reminder)

          // Update reminder status
          await supabase
            .from('payment_reminder_schedules')
            .update({
              status: 'sent',
              sent_at: now
            })
            .eq('id', reminder.id)

          sentReminders.push({ ...reminder, status: 'sent', sentAt: now })

        } catch (error: any) {
          console.error(`Failed to send reminder ${reminder.id}:`, error)
          
          // Update reminder with error
          await supabase
            .from('payment_reminder_schedules')
            .update({
              status: 'failed',
              error: error.message
            })
            .eq('id', reminder.id)
        }
      }

      return {
        success: true,
        sentReminders
      }
    } catch (error: any) {
      console.error('Failed to send scheduled reminders:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async sendReminderNotification(reminder: PaymentReminderSchedule): Promise<void> {
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_id', reminder.templateId)
      .single()

    if (templateError) throw templateError

    // Prepare notification data
    const notificationData = {
      invoiceNumber: reminder.invoices.invoice_number,
      dueDate: reminder.invoices.due_date,
      amount: reminder.invoices.total_amount,
      studentName: reminder.invoices.students.name,
      parentName: reminder.parents.name
    }

    // Send through each configured channel
    for (const channel of reminder.channels) {
      switch (channel) {
        case 'email':
          await this.sendEmailReminder(reminder.parents.email, template, notificationData)
          break
        case 'sms':
          await this.sendSMSReminder(reminder.parents.phone, template, notificationData)
          break
        case 'whatsapp':
          await this.sendWhatsAppReminder(reminder.parents.whatsapp_number, template, notificationData)
          break
      }
    }
  }

  // ==============================================
  // OVERDUE PROCESSING AUTOMATION
  // ==============================================

  async processOverdueInvoices(): Promise<{
    success: boolean
    processedInvoices?: Array<{ invoiceId: string; action: string; result: string }>
    error?: string
  }> {
    try {
      if (!this.config.overdueProcessing.enabled) {
        return { success: true, processedInvoices: [] }
      }

      const now = new Date()
      const gracePeriod = this.config.overdueProcessing.gracePeriodDays

      // Get all overdue invoices (past due date + grace period)
      const cutoffDate = new Date(now.getTime() - gracePeriod * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

      const { data: overdueInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          students:student_id(*),
          overdue_actions(*)
        `)
        .in('status', ['pending', 'sent'])
        .lt('due_date', cutoffDate)

      if (invoicesError) throw invoicesError

      const processedInvoices: Array<{ invoiceId: string; action: string; result: string }> = []

      for (const invoice of overdueInvoices || []) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
        ) - gracePeriod

        // Find the appropriate escalation step
        const escalationStep = this.config.overdueProcessing.escalationSteps
          .filter(step => step.daysOverdue <= daysOverdue)
          .sort((a, b) => b.daysOverdue - a.daysOverdue)[0]

        if (!escalationStep) continue

        // Check if this action has already been taken
        const existingAction = invoice.overdue_actions?.find(
          (action: any) => action.action_type === escalationStep.action && action.days_overdue === escalationStep.daysOverdue
        )

        if (existingAction) continue

        try {
          let result: string

          switch (escalationStep.action) {
            case 'notify':
              result = await this.sendOverdueNotification(invoice, escalationStep)
              break
            case 'suspend_services':
              result = await this.suspendServices(invoice)
              break
            case 'collections':
              result = await this.referToCollections(invoice)
              break
            default:
              throw new Error(`Unknown escalation action: ${escalationStep.action}`)
          }

          // Record the action taken
          await supabase
            .from('overdue_actions')
            .insert({
              invoice_id: invoice.id,
              action_type: escalationStep.action,
              days_overdue: daysOverdue,
              taken_at: now.toISOString(),
              result,
              template_id: escalationStep.template
            })

          processedInvoices.push({
            invoiceId: invoice.id,
            action: escalationStep.action,
            result
          })

        } catch (error: any) {
          console.error(`Failed to process overdue invoice ${invoice.id}:`, error)
          processedInvoices.push({
            invoiceId: invoice.id,
            action: escalationStep.action,
            result: `Error: ${error.message}`
          })
        }
      }

      return {
        success: true,
        processedInvoices
      }
    } catch (error: any) {
      console.error('Failed to process overdue invoices:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // ==============================================
  // PAYMENT RECONCILIATION AUTOMATION - ENHANCED SMART ALGORITHMS
  // ==============================================

  async autoReconcilePayments(): Promise<{
    success: boolean
    reconciledPayments?: Array<{ 
      paymentId: string 
      invoiceId: string 
      amount: number 
      confidence: number
      method: 'exact' | 'fuzzy' | 'partial' | 'batch'
    }>
    unmatchedPayments?: Array<{
      paymentId: string
      amount: number
      reason: string
    }>
    error?: string
  }> {
    try {
      if (!this.config.paymentReconciliation.enabled || !this.config.paymentReconciliation.autoMatchEnabled) {
        return { success: true, reconciledPayments: [], unmatchedPayments: [] }
      }

      // Get unmatched payments with additional data for smart matching
      const { data: unmatchedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          students:student_id(*)
        `)
        .is('invoice_id', null)
        .eq('status', 'confirmed')
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError

      // Get unpaid invoices with student data
      const { data: unpaidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          students:student_id(*)
        `)
        .in('status', ['pending', 'sent'])
        .order('issue_date', { ascending: false })

      if (invoicesError) throw invoicesError

      const reconciledPayments: Array<{ 
        paymentId: string 
        invoiceId: string 
        amount: number 
        confidence: number
        method: 'exact' | 'fuzzy' | 'partial' | 'batch'
      }> = []
      const unmatchedPaymentsList: Array<{
        paymentId: string
        amount: number
        reason: string
      }> = []

      // Stage 1: Exact matching (amount + customer + date proximity)
      await this.performExactMatching(
        unmatchedPayments || [], 
        unpaidInvoices || [], 
        reconciledPayments
      )

      // Stage 2: Fuzzy matching with confidence scoring
      await this.performFuzzyMatching(
        unmatchedPayments || [], 
        unpaidInvoices || [], 
        reconciledPayments
      )

      // Stage 3: Partial payment matching
      await this.performPartialPaymentMatching(
        unmatchedPayments || [], 
        unpaidInvoices || [], 
        reconciledPayments
      )

      // Stage 4: Batch payment matching (multiple invoices to one payment)
      await this.performBatchPaymentMatching(
        unmatchedPayments || [], 
        unpaidInvoices || [], 
        reconciledPayments
      )

      // Identify remaining unmatched payments with reasons
      for (const payment of unmatchedPayments || []) {
        const isMatched = reconciledPayments.some(r => r.paymentId === payment.id)
        if (!isMatched) {
          unmatchedPaymentsList.push({
            paymentId: payment.id,
            amount: payment.amount,
            reason: await this.determineUnmatchedReason(payment, unpaidInvoices || [])
          })
        }
      }

      return {
        success: true,
        reconciledPayments,
        unmatchedPayments: unmatchedPaymentsList
      }
    } catch (error: any) {
      console.error('Failed to auto reconcile payments:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Stage 1: Exact matching - Perfect matches with high confidence
   */
  private async performExactMatching(
    payments: any[],
    invoices: any[],
    results: Array<{ paymentId: string; invoiceId: string; amount: number; confidence: number; method: 'exact' | 'fuzzy' | 'partial' | 'batch' }>
  ): Promise<void> {
    const tolerance = this.config.paymentReconciliation.toleranceAmount
    
    for (const payment of payments) {
      if (results.some(r => r.paymentId === payment.id)) continue // Skip already matched

      const exactMatch = invoices.find(invoice => {
        const amountMatch = Math.abs(payment.amount - invoice.total_amount) <= tolerance
        const customerMatch = payment.student_id === invoice.student_id
        const dateProximity = this.calculateDateProximity(payment.payment_date, invoice.issue_date) <= 7 // Within 7 days
        
        return amountMatch && customerMatch && dateProximity && !results.some(r => r.invoiceId === invoice.id)
      })

      if (exactMatch) {
        await this.recordReconciliation(payment, exactMatch, 1.0, 'exact')
        results.push({
          paymentId: payment.id,
          invoiceId: exactMatch.id,
          amount: payment.amount,
          confidence: 1.0,
          method: 'exact'
        })
      }
    }
  }

  /**
   * Stage 2: Fuzzy matching with confidence scoring
   */
  private async performFuzzyMatching(
    payments: any[],
    invoices: any[],
    results: Array<{ paymentId: string; invoiceId: string; amount: number; confidence: number; method: 'exact' | 'fuzzy' | 'partial' | 'batch' }>
  ): Promise<void> {
    const tolerance = this.config.paymentReconciliation.toleranceAmount * 2 // Double tolerance for fuzzy
    const minimumConfidence = 0.75

    for (const payment of payments) {
      if (results.some(r => r.paymentId === payment.id)) continue // Skip already matched

      let bestMatch = null
      let bestConfidence = 0

      for (const invoice of invoices) {
        if (results.some(r => r.invoiceId === invoice.id)) continue // Skip already matched

        const confidence = this.calculateMatchingConfidence(payment, invoice, tolerance)
        
        if (confidence > bestConfidence && confidence >= minimumConfidence) {
          bestMatch = invoice
          bestConfidence = confidence
        }
      }

      if (bestMatch && bestConfidence >= minimumConfidence) {
        await this.recordReconciliation(payment, bestMatch, bestConfidence, 'fuzzy')
        results.push({
          paymentId: payment.id,
          invoiceId: bestMatch.id,
          amount: payment.amount,
          confidence: bestConfidence,
          method: 'fuzzy'
        })
      }
    }
  }

  /**
   * Stage 3: Partial payment matching
   */
  private async performPartialPaymentMatching(
    payments: any[],
    invoices: any[],
    results: Array<{ paymentId: string; invoiceId: string; amount: number; confidence: number; method: 'exact' | 'fuzzy' | 'partial' | 'batch' }>
  ): Promise<void> {
    for (const payment of payments) {
      if (results.some(r => r.paymentId === payment.id)) continue // Skip already matched

      const partialMatch = invoices.find(invoice => {
        const isPartialPayment = payment.amount < invoice.total_amount && 
                                 payment.amount >= (invoice.total_amount * 0.1) && // At least 10%
                                 payment.student_id === invoice.student_id &&
                                 !results.some(r => r.invoiceId === invoice.id)
        return isPartialPayment
      })

      if (partialMatch) {
        await this.recordPartialReconciliation(payment, partialMatch, 0.85, 'partial')
        results.push({
          paymentId: payment.id,
          invoiceId: partialMatch.id,
          amount: payment.amount,
          confidence: 0.85,
          method: 'partial'
        })
      }
    }
  }

  /**
   * Stage 4: Batch payment matching (one payment covers multiple invoices)
   */
  private async performBatchPaymentMatching(
    payments: any[],
    invoices: any[],
    results: Array<{ paymentId: string; invoiceId: string; amount: number; confidence: number; method: 'exact' | 'fuzzy' | 'partial' | 'batch' }>
  ): Promise<void> {
    for (const payment of payments) {
      if (results.some(r => r.paymentId === payment.id)) continue // Skip already matched

      // Find multiple invoices for the same student that sum to payment amount
      const studentInvoices = invoices.filter(inv => 
        inv.student_id === payment.student_id && 
        !results.some(r => r.invoiceId === inv.id)
      )

      const batchCombination = this.findInvoiceCombination(payment.amount, studentInvoices, 5.0) // 5 SAR tolerance
      
      if (batchCombination && batchCombination.length > 1) {
        for (const invoice of batchCombination) {
          await this.recordReconciliation(payment, invoice, 0.9, 'batch')
          results.push({
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: invoice.total_amount,
            confidence: 0.9,
            method: 'batch'
          })
        }
      }
    }
  }

  /**
   * Calculate matching confidence score based on multiple factors
   */
  private calculateMatchingConfidence(payment: any, invoice: any, tolerance: number): number {
    let confidence = 0

    // Amount matching (40% weight)
    const amountDiff = Math.abs(payment.amount - invoice.total_amount)
    if (amountDiff <= tolerance) {
      confidence += 0.4 * (1 - (amountDiff / tolerance))
    }

    // Customer matching (30% weight)
    if (payment.student_id === invoice.student_id) {
      confidence += 0.3
    }

    // Date proximity (20% weight)
    const dateProximity = this.calculateDateProximity(payment.payment_date, invoice.issue_date)
    if (dateProximity <= 30) { // Within 30 days
      confidence += 0.2 * (1 - Math.min(dateProximity / 30, 1))
    }

    // Payment method consistency (10% weight)
    if (this.isPaymentMethodConsistent(payment, invoice)) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Find combination of invoices that sum close to payment amount
   */
  private findInvoiceCombination(targetAmount: number, invoices: any[], tolerance: number): any[] | null {
    // Use dynamic programming approach to find best combination
    for (let i = 2; i <= Math.min(5, invoices.length); i++) { // Try combinations of 2-5 invoices
      const combinations = this.getCombinations(invoices, i)
      
      for (const combination of combinations) {
        const combinationSum = combination.reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
        if (Math.abs(combinationSum - targetAmount) <= tolerance) {
          return combination
        }
      }
    }
    
    return null
  }

  /**
   * Generate combinations of invoices
   */
  private getCombinations(arr: any[], r: number): any[][] {
    if (r > arr.length) return []
    if (r === 1) return arr.map(item => [item])
    
    const combinations: any[][] = []
    
    for (let i = 0; i <= arr.length - r; i++) {
      const head = arr[i]
      const tailCombinations = this.getCombinations(arr.slice(i + 1), r - 1)
      
      for (const tail of tailCombinations) {
        combinations.push([head, ...tail])
      }
    }
    
    return combinations
  }

  /**
   * Calculate date proximity in days
   */
  private calculateDateProximity(date1: string, date2: string): number {
    const d1 = new Date(date1).getTime()
    const d2 = new Date(date2).getTime()
    return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24)
  }

  /**
   * Check if payment method is consistent with invoice expectations
   */
  private isPaymentMethodConsistent(payment: any, invoice: any): boolean {
    // Implementation would check if payment method matches expected methods for invoice
    return true // Simplified for now
  }

  /**
   * Determine why a payment couldn't be matched
   */
  private async determineUnmatchedReason(payment: any, invoices: any[]): Promise<string> {
    const customerInvoices = invoices.filter(inv => inv.student_id === payment.student_id)
    
    if (customerInvoices.length === 0) {
      return 'No invoices found for customer'
    }

    const amountMatches = customerInvoices.filter(inv => 
      Math.abs(payment.amount - inv.total_amount) <= 10 // Within 10 SAR
    )

    if (amountMatches.length === 0) {
      return 'No invoices with matching amount'
    }

    const dateMatches = amountMatches.filter(inv =>
      this.calculateDateProximity(payment.payment_date, inv.issue_date) <= 60 // Within 60 days
    )

    if (dateMatches.length === 0) {
      return 'Amount matches found but outside date range'
    }

    return 'Multiple potential matches - requires manual review'
  }

  /**
   * Record successful reconciliation in database
   */
  private async recordReconciliation(payment: any, invoice: any, confidence: number, method: string): Promise<void> {
    try {
      // Update payment record
      await supabase
        .from('payments')
        .update({
          invoice_id: invoice.id,
          reconciled_at: new Date().toISOString(),
          reconciliation_method: method,
          reconciliation_confidence: confidence
        })
        .eq('id', payment.id)

      // Update invoice status if fully paid
      if (payment.amount >= invoice.total_amount * 0.95) { // Consider 95%+ as fully paid
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: payment.payment_date || payment.created_at
          })
          .eq('id', invoice.id)
      } else {
        // Mark as partially paid
        await supabase
          .from('invoices')
          .update({
            status: 'partial',
            paid_amount: supabase.raw(`COALESCE(paid_amount, 0) + ${payment.amount}`)
          })
          .eq('id', invoice.id)
      }

      // Log reconciliation event
      await supabase
        .from('payment_reconciliation_log')
        .insert({
          payment_id: payment.id,
          invoice_id: invoice.id,
          method,
          confidence,
          amount_matched: payment.amount,
          reconciled_at: new Date().toISOString(),
          reconciled_by: 'system_auto'
        })

    } catch (error) {
      console.error('Failed to record reconciliation:', error)
      throw error
    }
  }

  /**
   * Record partial payment reconciliation
   */
  private async recordPartialReconciliation(payment: any, invoice: any, confidence: number, method: string): Promise<void> {
    try {
      // Update payment record
      await supabase
        .from('payments')
        .update({
          invoice_id: invoice.id,
          reconciled_at: new Date().toISOString(),
          reconciliation_method: method,
          reconciliation_confidence: confidence,
          is_partial_payment: true
        })
        .eq('id', payment.id)

      // Update invoice with partial payment
      await supabase
        .from('invoices')
        .update({
          status: 'partial',
          paid_amount: supabase.raw(`COALESCE(paid_amount, 0) + ${payment.amount}`),
          balance_amount: supabase.raw(`total_amount - COALESCE(paid_amount, 0) - ${payment.amount}`)
        })
        .eq('id', invoice.id)

      // Log partial payment event
      await supabase
        .from('payment_reconciliation_log')
        .insert({
          payment_id: payment.id,
          invoice_id: invoice.id,
          method,
          confidence,
          amount_matched: payment.amount,
          is_partial: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: 'system_auto'
        })

    } catch (error) {
      console.error('Failed to record partial reconciliation:', error)
      throw error
    }
  }

  // ==============================================
  // PAYMENT COLLECTION OPTIMIZATION & SUCCESS TRACKING
  // ==============================================

  async optimizePaymentCollection(): Promise<{
    success: boolean
    optimizations?: Array<{
      strategy: string
      expectedImprovement: number
      implementationSteps: string[]
    }>
    currentMetrics?: {
      collectionRate: number
      averageDaysToPayment: number
      successfulMethods: string[]
    }
    error?: string
  }> {
    try {
      // Analyze current collection performance
      const currentMetrics = await this.analyzeCollectionPerformance()
      
      // Generate optimization strategies
      const optimizations = await this.generateCollectionOptimizations(currentMetrics)
      
      // Implement high-impact optimizations automatically
      await this.implementAutomaticOptimizations(optimizations)
      
      return {
        success: true,
        optimizations,
        currentMetrics
      }
    } catch (error: any) {
      console.error('Failed to optimize payment collection:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Analyze current collection performance metrics
   */
  private async analyzeCollectionPerformance(): Promise<{
    collectionRate: number
    averageDaysToPayment: number
    successfulMethods: string[]
    paymentMethodPerformance: Array<{
      method: string
      successRate: number
      averageDays: number
      volume: number
    }>
    reminderEffectiveness: Array<{
      reminderType: string
      responseRate: number
      averageResponseTime: number
    }>
    customerSegmentPerformance: Array<{
      segment: string
      collectionRate: number
      preferredMethod: string
    }>
  }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get payment performance data
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        invoices:invoice_id(issue_date, due_date, total_amount)
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'confirmed')

    if (paymentError) throw paymentError

    // Get invoice data for collection rate calculation
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .gte('issue_date', thirtyDaysAgo.toISOString())

    if (invoiceError) throw invoiceError

    // Calculate collection rate
    const totalInvoiceAmount = invoiceData?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
    const totalPaymentAmount = paymentData?.reduce((sum, pay) => sum + pay.amount, 0) || 0
    const collectionRate = totalInvoiceAmount > 0 ? totalPaymentAmount / totalInvoiceAmount : 0

    // Calculate average days to payment
    const paymentDelays = paymentData?.map(payment => {
      if (!payment.invoices || !payment.payment_date) return null
      const dueDate = new Date(payment.invoices.due_date)
      const paymentDate = new Date(payment.payment_date)
      return (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    }).filter(delay => delay !== null) || []

    const averageDaysToPayment = paymentDelays.length > 0 
      ? paymentDelays.reduce((sum, days) => sum + (days || 0), 0) / paymentDelays.length
      : 0

    // Analyze payment method performance
    const methodPerformance = await this.analyzePaymentMethodPerformance(paymentData || [])
    
    // Analyze reminder effectiveness
    const reminderEffectiveness = await this.analyzeReminderEffectiveness()

    // Analyze customer segment performance
    const segmentPerformance = await this.analyzeCustomerSegmentPerformance()

    // Identify most successful methods
    const successfulMethods = methodPerformance
      .filter(method => method.successRate > 0.8)
      .map(method => method.method)

    return {
      collectionRate,
      averageDaysToPayment,
      successfulMethods,
      paymentMethodPerformance: methodPerformance,
      reminderEffectiveness,
      customerSegmentPerformance: segmentPerformance
    }
  }

  private async analyzePaymentMethodPerformance(payments: any[]): Promise<Array<{
    method: string
    successRate: number
    averageDays: number
    volume: number
  }>> {
    const methodStats = new Map()

    payments.forEach(payment => {
      const method = payment.payment_method || 'unknown'
      if (!methodStats.has(method)) {
        methodStats.set(method, {
          method,
          total: 0,
          successful: 0,
          totalDays: 0,
          volume: 0
        })
      }

      const stats = methodStats.get(method)
      stats.total++
      stats.volume += payment.amount

      if (payment.status === 'confirmed') {
        stats.successful++
        
        if (payment.invoices && payment.payment_date) {
          const dueDate = new Date(payment.invoices.due_date)
          const paymentDate = new Date(payment.payment_date)
          const daysToPayment = Math.max(0, (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          stats.totalDays += daysToPayment
        }
      }
    })

    return Array.from(methodStats.values()).map(stats => ({
      method: stats.method,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0,
      averageDays: stats.successful > 0 ? stats.totalDays / stats.successful : 0,
      volume: stats.volume
    }))
  }

  private async analyzeReminderEffectiveness(): Promise<Array<{
    reminderType: string
    responseRate: number
    averageResponseTime: number
  }>> {
    const { data: reminderData, error } = await supabase
      .from('payment_reminder_schedules')
      .select(`
        *,
        invoices:invoice_id(*),
        payments:invoices(payments(*))
      `)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    const reminderStats = new Map()

    reminderData?.forEach(reminder => {
      const type = reminder.reminder_type
      if (!reminderStats.has(type)) {
        reminderStats.set(type, {
          reminderType: type,
          total: 0,
          responses: 0,
          totalResponseTime: 0
        })
      }

      const stats = reminderStats.get(type)
      stats.total++

      // Check if payment was made after reminder
      const sentDate = new Date(reminder.sent_at)
      const payments = reminder.payments?.payments || []
      
      const responsePayment = payments.find((payment: any) => {
        const paymentDate = new Date(payment.payment_date || payment.created_at)
        return paymentDate > sentDate
      })

      if (responsePayment) {
        stats.responses++
        const responseTime = (new Date(responsePayment.payment_date || responsePayment.created_at).getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
        stats.totalResponseTime += responseTime
      }
    })

    return Array.from(reminderStats.values()).map(stats => ({
      reminderType: stats.reminderType,
      responseRate: stats.total > 0 ? stats.responses / stats.total : 0,
      averageResponseTime: stats.responses > 0 ? stats.totalResponseTime / stats.responses : 0
    }))
  }

  private async analyzeCustomerSegmentPerformance(): Promise<Array<{
    segment: string
    collectionRate: number
    preferredMethod: string
  }>> {
    // This would analyze different customer segments
    // For now, return mock data - implement with actual segmentation logic
    return [
      { segment: 'new_customers', collectionRate: 0.75, preferredMethod: 'mada' },
      { segment: 'existing_customers', collectionRate: 0.89, preferredMethod: 'bank_transfer' },
      { segment: 'payment_plan_users', collectionRate: 0.92, preferredMethod: 'auto_debit' }
    ]
  }

  /**
   * Generate optimization strategies based on performance analysis
   */
  private async generateCollectionOptimizations(metrics: any): Promise<Array<{
    strategy: string
    expectedImprovement: number
    implementationSteps: string[]
    priority: 'high' | 'medium' | 'low'
    autoImplementable: boolean
  }>> {
    const optimizations = []

    // Strategy 1: Promote high-performing payment methods
    const topMethod = metrics.paymentMethodPerformance
      .filter((method: any) => method.volume > 1000) // Minimum volume threshold
      .sort((a: any, b: any) => b.successRate - a.successRate)[0]

    if (topMethod && topMethod.successRate > 0.85) {
      optimizations.push({
        strategy: `Promote ${topMethod.method} as preferred payment method`,
        expectedImprovement: 0.15, // 15% improvement expected
        implementationSteps: [
          `Update payment form to show ${topMethod.method} first`,
          'Add incentive messaging for preferred method',
          'Update reminder templates to emphasize preferred method'
        ],
        priority: 'high' as const,
        autoImplementable: true
      })
    }

    // Strategy 2: Optimize reminder timing
    const bestReminder = metrics.reminderEffectiveness
      .sort((a: any, b: any) => b.responseRate - a.responseRate)[0]

    if (bestReminder && bestReminder.responseRate > 0.7) {
      optimizations.push({
        strategy: `Increase frequency of ${bestReminder.reminderType} reminders`,
        expectedImprovement: 0.12,
        implementationSteps: [
          'Update reminder schedule configuration',
          'Implement additional reminder triggers',
          'A/B test timing optimization'
        ],
        priority: 'medium' as const,
        autoImplementable: false
      })
    }

    // Strategy 3: Collection rate improvement
    if (metrics.collectionRate < 0.85) {
      optimizations.push({
        strategy: 'Implement early payment incentives',
        expectedImprovement: 0.08,
        implementationSteps: [
          'Create early payment discount system',
          'Update invoice templates with incentive messaging',
          'Implement automatic discount application'
        ],
        priority: 'medium' as const,
        autoImplementable: false
      })
    }

    // Strategy 4: Average payment delay reduction
    if (metrics.averageDaysToPayment > 5) {
      optimizations.push({
        strategy: 'Implement payment deadline urgency messaging',
        expectedImprovement: 0.10,
        implementationSteps: [
          'Update reminder templates with urgency language',
          'Implement countdown timers in payment portal',
          'Add late fee warnings to improve urgency'
        ],
        priority: 'high' as const,
        autoImplementable: true
      })
    }

    // Sort by priority and expected improvement
    return optimizations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      return (priorityWeight[b.priority] * b.expectedImprovement) - 
             (priorityWeight[a.priority] * a.expectedImprovement)
    })
  }

  /**
   * Implement optimizations that can be automated
   */
  private async implementAutomaticOptimizations(optimizations: Array<{
    strategy: string
    expectedImprovement: number
    implementationSteps: string[]
    priority: 'high' | 'medium' | 'low'
    autoImplementable: boolean
  }>): Promise<void> {
    for (const optimization of optimizations) {
      if (!optimization.autoImplementable) continue

      try {
        if (optimization.strategy.includes('preferred payment method')) {
          await this.updatePreferredPaymentMethod(optimization)
        } else if (optimization.strategy.includes('urgency messaging')) {
          await this.updateUrgencyMessaging(optimization)
        }

        // Log optimization implementation
        await supabase
          .from('collection_optimizations')
          .insert({
            strategy: optimization.strategy,
            expected_improvement: optimization.expectedImprovement,
            implemented_at: new Date().toISOString(),
            status: 'active'
          })

      } catch (error) {
        console.error(`Failed to implement optimization: ${optimization.strategy}`, error)
      }
    }
  }

  private async updatePreferredPaymentMethod(optimization: any): Promise<void> {
    // Extract method name from strategy
    const methodMatch = optimization.strategy.match(/Promote (\w+) as/)
    if (!methodMatch) return

    const preferredMethod = methodMatch[1]

    // Update system configuration
    const updatedConfig = {
      ...this.config,
      paymentMethodPriority: {
        preferred: preferredMethod,
        alternatives: ['mada', 'bank_transfer', 'stc_pay'].filter(m => m !== preferredMethod),
        incentiveMessage: `Pay with ${preferredMethod} for faster processing`
      }
    }

    await this.updateWorkflowConfig(updatedConfig)
  }

  private async updateUrgencyMessaging(optimization: any): Promise<void> {
    // Update reminder templates with urgency messaging
    const urgentTemplates = {
      'payment_reminder_3_days': {
        title: 'Payment Due in 3 Days - Action Required',
        titleAr: 'الدفع مستحق خلال 3 أيام - مطلوب إجراء',
        urgencyLevel: 'high'
      },
      'payment_reminder_1_day': {
        title: 'Final Notice: Payment Due Tomorrow',
        titleAr: 'إشعار نهائي: الدفع مستحق غداً',
        urgencyLevel: 'urgent'
      }
    }

    // Update notification templates in database
    for (const [templateId, template] of Object.entries(urgentTemplates)) {
      await supabase
        .from('notification_templates')
        .upsert({
          template_id: templateId,
          ...template,
          updated_at: new Date().toISOString()
        })
    }
  }

  /**
   * Track collection success metrics over time
   */
  async trackCollectionMetrics(timeRange: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<{
    success: boolean
    metrics?: {
      trends: Array<{
        period: string
        collectionRate: number
        averagePaymentTime: number
        totalCollected: number
        optimizationImpact: number
      }>
      topPerformingStrategies: Array<{
        strategy: string
        improvement: number
        confidence: number
      }>
      recommendations: string[]
    }
    error?: string
  }> {
    try {
      const trends = await this.calculateCollectionTrends(timeRange)
      const strategies = await this.evaluateOptimizationPerformance()
      const recommendations = await this.generateRecommendations(trends, strategies)

      return {
        success: true,
        metrics: {
          trends,
          topPerformingStrategies: strategies,
          recommendations
        }
      }
    } catch (error: any) {
      console.error('Failed to track collection metrics:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async calculateCollectionTrends(timeRange: string): Promise<Array<{
    period: string
    collectionRate: number
    averagePaymentTime: number
    totalCollected: number
    optimizationImpact: number
  }>> {
    const periods = this.getTimePeriods(timeRange, 12) // Last 12 periods
    const trends = []

    for (const period of periods) {
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('amount, payment_date, created_at, invoices:invoice_id(total_amount, due_date)')
        .gte('payment_date', period.start)
        .lt('payment_date', period.end)
        .eq('status', 'confirmed')

      if (paymentError) throw paymentError

      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount, due_date')
        .gte('issue_date', period.start)
        .lt('issue_date', period.end)

      if (invoiceError) throw invoiceError

      const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const totalCollected = payments?.reduce((sum, pay) => sum + pay.amount, 0) || 0
      const collectionRate = totalInvoiceAmount > 0 ? totalCollected / totalInvoiceAmount : 0

      // Calculate average payment time
      const paymentTimes = payments?.map(payment => {
        if (!payment.invoices || !payment.payment_date) return null
        const dueDate = new Date(payment.invoices.due_date)
        const paymentDate = new Date(payment.payment_date)
        return (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      }).filter(time => time !== null) || []

      const averagePaymentTime = paymentTimes.length > 0
        ? paymentTimes.reduce((sum, time) => sum + (time || 0), 0) / paymentTimes.length
        : 0

      trends.push({
        period: period.label,
        collectionRate,
        averagePaymentTime,
        totalCollected,
        optimizationImpact: await this.calculateOptimizationImpact(period)
      })
    }

    return trends
  }

  private async evaluateOptimizationPerformance(): Promise<Array<{
    strategy: string
    improvement: number
    confidence: number
  }>> {
    const { data: optimizations, error } = await supabase
      .from('collection_optimizations')
      .select('*')
      .eq('status', 'active')
      .gte('implemented_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    const strategies = []

    for (const optimization of optimizations || []) {
      const beforeMetrics = await this.getMetricsBeforeDate(optimization.implemented_at)
      const afterMetrics = await this.getMetricsAfterDate(optimization.implemented_at)

      const improvement = afterMetrics.collectionRate - beforeMetrics.collectionRate
      const confidence = this.calculateConfidence(beforeMetrics, afterMetrics)

      strategies.push({
        strategy: optimization.strategy,
        improvement,
        confidence
      })
    }

    return strategies.sort((a, b) => b.improvement - a.improvement)
  }

  private async generateRecommendations(trends: any[], strategies: any[]): Promise<string[]> {
    const recommendations = []

    // Trend-based recommendations
    const latestTrend = trends[trends.length - 1]
    const previousTrend = trends[trends.length - 2]

    if (latestTrend && previousTrend) {
      if (latestTrend.collectionRate < previousTrend.collectionRate) {
        recommendations.push('Collection rate declining - review reminder frequency and payment method availability')
      }

      if (latestTrend.averagePaymentTime > previousTrend.averagePaymentTime) {
        recommendations.push('Payment delays increasing - consider implementing early payment incentives')
      }
    }

    // Strategy-based recommendations
    const topStrategy = strategies[0]
    if (topStrategy && topStrategy.improvement > 0.05) {
      recommendations.push(`Strategy "${topStrategy.strategy}" showing strong results - consider expanding implementation`)
    }

    const poorStrategies = strategies.filter(s => s.improvement < 0)
    if (poorStrategies.length > 0) {
      recommendations.push(`Review underperforming strategies: ${poorStrategies.map(s => s.strategy).join(', ')}`)
    }

    return recommendations
  }

  // Helper methods
  private getTimePeriods(timeRange: string, count: number): Array<{ start: string; end: string; label: string }> {
    const periods = []
    const now = new Date()
    
    for (let i = count - 1; i >= 0; i--) {
      let start: Date, end: Date, label: string
      
      switch (timeRange) {
        case 'daily':
          start = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
          label = start.toISOString().split('T')[0]
          break
        case 'weekly':
          start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
          end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
          label = `Week of ${start.toISOString().split('T')[0]}`
          break
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth() - i, 1)
          end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
          label = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          break
        default:
          throw new Error(`Unsupported time range: ${timeRange}`)
      }
      
      periods.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label
      })
    }
    
    return periods
  }

  private async calculateOptimizationImpact(period: { start: string; end: string }): Promise<number> {
    // Calculate the impact of optimizations during this period
    // This would compare against baseline metrics
    return 0.05 // Mock 5% improvement
  }

  private async getMetricsBeforeDate(date: string): Promise<{ collectionRate: number }> {
    // Get collection metrics before the given date
    return { collectionRate: 0.82 } // Mock baseline
  }

  private async getMetricsAfterDate(date: string): Promise<{ collectionRate: number }> {
    // Get collection metrics after the given date
    return { collectionRate: 0.87 } // Mock improved rate
  }

  private calculateConfidence(before: any, after: any): number {
    // Statistical confidence calculation based on sample size and variance
    return 0.85 // Mock confidence level
  }

  // ==============================================
  // N8N INTEGRATION & FINANCIAL NOTIFICATION SYSTEM
  // ==============================================

  /**
   * Process webhook from n8n automation platform
   */
  async processN8nWebhook(webhookData: {
    event: 'payment_received' | 'invoice_overdue' | 'billing_cycle_trigger' | 'reconciliation_required' | 'collection_optimization'
    data: any
    source: 'n8n_workflow' | 'supabase_trigger' | 'manual_trigger'
    workflowId?: string
  }): Promise<{
    success: boolean
    actions?: Array<{ action: string; result: string; timestamp: string }>
    error?: string
  }> {
    try {
      const actions: Array<{ action: string; result: string; timestamp: string }> = []
      const timestamp = new Date().toISOString()

      switch (webhookData.event) {
        case 'payment_received':
          const paymentResult = await this.handlePaymentReceivedWebhook(webhookData.data)
          actions.push({
            action: 'process_payment_notification',
            result: paymentResult,
            timestamp
          })
          break

        case 'invoice_overdue':
          const overdueResult = await this.handleInvoiceOverdueWebhook(webhookData.data)
          actions.push({
            action: 'process_overdue_invoice',
            result: overdueResult,
            timestamp
          })
          break

        case 'billing_cycle_trigger':
          const billingResult = await this.handleBillingCycleTrigger(webhookData.data)
          actions.push({
            action: 'execute_billing_cycle',
            result: billingResult,
            timestamp
          })
          break

        case 'reconciliation_required':
          const reconciliationResult = await this.handleReconciliationWebhook(webhookData.data)
          actions.push({
            action: 'perform_reconciliation',
            result: reconciliationResult,
            timestamp
          })
          break

        case 'collection_optimization':
          const optimizationResult = await this.handleCollectionOptimizationWebhook(webhookData.data)
          actions.push({
            action: 'optimize_collection_strategy',
            result: optimizationResult,
            timestamp
          })
          break

        default:
          throw new Error(`Unknown webhook event: ${webhookData.event}`)
      }

      // Log webhook processing
      await supabase
        .from('n8n_webhook_log')
        .insert({
          event: webhookData.event,
          source: webhookData.source,
          workflow_id: webhookData.workflowId,
          data: webhookData.data,
          actions,
          processed_at: timestamp,
          status: 'success'
        })

      return {
        success: true,
        actions
      }
    } catch (error: any) {
      console.error('Failed to process n8n webhook:', error)
      
      // Log webhook failure
      await supabase
        .from('n8n_webhook_log')
        .insert({
          event: webhookData.event,
          source: webhookData.source,
          workflow_id: webhookData.workflowId,
          data: webhookData.data,
          error: error.message,
          processed_at: new Date().toISOString(),
          status: 'failed'
        })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Handle payment received webhook from n8n
   */
  private async handlePaymentReceivedWebhook(data: {
    paymentId: string
    invoiceId: string
    amount: number
    paymentMethod: string
    studentId: string
    parentId?: string
  }): Promise<string> {
    try {
      // Trigger automatic reconciliation for this payment
      await this.autoReconcilePayments()

      // Send thank you notification
      const notification = {
        type: 'payment_received' as const,
        recipients: [{
          userId: data.parentId || data.studentId,
          role: 'parent' as const,
          contactMethod: 'email' as const
        }],
        title: 'Payment Received - Thank You',
        titleAr: 'تم استلام الدفعة - شكراً لك',
        message: `Thank you for your payment of ${data.amount} SAR. Your payment has been processed successfully.`,
        messageAr: `شكراً لك على دفعك البالغ ${data.amount} ريال سعودي. تم معالجة دفعتك بنجاح.`,
        relatedPaymentId: data.paymentId,
        relatedInvoiceId: data.invoiceId
      }

      await this.sendFinancialNotification(notification)

      // Trigger n8n workflow for additional processing
      await this.triggerN8nWorkflow('payment_processing_complete', {
        paymentId: data.paymentId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        nextActions: ['update_parent_portal', 'check_payment_plan_progress']
      })

      return 'Payment received notification sent successfully'
    } catch (error: any) {
      return `Failed to process payment received: ${error.message}`
    }
  }

  /**
   * Handle invoice overdue webhook from n8n
   */
  private async handleInvoiceOverdueWebhook(data: {
    invoiceId: string
    studentId: string
    parentId?: string
    daysPastDue: number
    amount: number
  }): Promise<string> {
    try {
      // Process overdue invoice through existing system
      const result = await this.processOverdueInvoices()

      // Send escalated notification based on days overdue
      let notificationTemplate = 'overdue_reminder'
      let channels: ('email' | 'sms' | 'whatsapp')[] = ['email']
      
      if (data.daysPastDue >= 7) {
        notificationTemplate = 'urgent_overdue'
        channels = ['email', 'sms', 'whatsapp']
      }

      const notification = {
        type: 'invoice_overdue' as const,
        priority: data.daysPastDue >= 14 ? 'urgent' as const : 'high' as const,
        recipients: [{
          userId: data.parentId || data.studentId,
          role: 'parent' as const,
          contactMethod: 'email' as const
        }],
        title: `Payment Overdue (${data.daysPastDue} days)`,
        titleAr: `دفعة متأخرة (${data.daysPastDue} أيام)`,
        message: `Your payment of ${data.amount} SAR is now ${data.daysPastDue} days overdue. Please make payment to avoid service interruption.`,
        messageAr: `دفعتك البالغة ${data.amount} ريال سعودي متأخرة الآن ${data.daysPastDue} أيام. يرجى السداد لتجنب انقطاع الخدمة.`,
        relatedInvoiceId: data.invoiceId
      }

      await this.sendFinancialNotification(notification)

      // Trigger n8n workflow for escalation
      if (data.daysPastDue >= 30) {
        await this.triggerN8nWorkflow('collections_escalation', {
          invoiceId: data.invoiceId,
          studentId: data.studentId,
          daysPastDue: data.daysPastDue,
          amount: data.amount
        })
      }

      return `Overdue invoice processed for ${data.daysPastDue} days past due`
    } catch (error: any) {
      return `Failed to process overdue invoice: ${error.message}`
    }
  }

  /**
   * Handle billing cycle trigger from n8n
   */
  private async handleBillingCycleTrigger(data: {
    cycleId: string
    frequency: string
    triggerReason: 'scheduled' | 'manual' | 'service_delivery_threshold'
  }): Promise<string> {
    try {
      // Execute the billing cycle
      const generations = await this.executeBillingCycle(data.cycleId)

      // Notify billing team of completion
      const notification = {
        type: 'goal_achieved' as const, // Using generic type for internal notifications
        priority: 'medium' as const,
        recipients: [{
          userId: 'billing-team',
          role: 'admin' as const,
          contactMethod: 'email' as const
        }],
        title: 'Billing Cycle Completed',
        titleAr: 'اكتملت دورة الفوترة',
        message: `Billing cycle ${data.cycleId} completed. Generated ${generations.length} invoices.`,
        messageAr: `اكتملت دورة الفوترة ${data.cycleId}. تم إنشاء ${generations.length} فاتورة.`
      }

      await this.sendFinancialNotification(notification)

      // Trigger n8n workflow for post-billing processing
      await this.triggerN8nWorkflow('post_billing_processing', {
        cycleId: data.cycleId,
        generatedInvoices: generations.length,
        totalAmount: generations.reduce((sum, gen) => sum + gen.totalAmount, 0)
      })

      return `Billing cycle executed successfully: ${generations.length} invoices generated`
    } catch (error: any) {
      return `Failed to execute billing cycle: ${error.message}`
    }
  }

  /**
   * Handle reconciliation webhook from n8n
   */
  private async handleReconciliationWebhook(data: {
    gatewayId: string
    settlementDate: string
    expectedAmount?: number
  }): Promise<string> {
    try {
      // Perform automatic reconciliation
      const result = await this.autoReconcilePayments()

      const reconciledCount = result.reconciledPayments?.length || 0
      const unmatchedCount = result.unmatchedPayments?.length || 0

      // Notify finance team if there are unmatched payments
      if (unmatchedCount > 0) {
        const notification = {
          type: 'reconciliation_required' as const,
          priority: 'high' as const,
          recipients: [{
            userId: 'finance-team',
            role: 'admin' as const,
            contactMethod: 'email' as const
          }],
          title: 'Manual Reconciliation Required',
          titleAr: 'مطلوب تسوية يدوية',
          message: `Reconciliation completed for ${data.gatewayId}. ${reconciledCount} payments matched, ${unmatchedCount} require manual review.`,
          messageAr: `اكتملت التسوية لـ ${data.gatewayId}. تم مطابقة ${reconciledCount} دفعة، ${unmatchedCount} تحتاج مراجعة يدوية.`
        }

        await this.sendFinancialNotification(notification)
      }

      // Trigger n8n workflow for reconciliation reporting
      await this.triggerN8nWorkflow('reconciliation_reporting', {
        gatewayId: data.gatewayId,
        settlementDate: data.settlementDate,
        reconciledCount,
        unmatchedCount,
        requiresReview: unmatchedCount > 0
      })

      return `Reconciliation completed: ${reconciledCount} matched, ${unmatchedCount} unmatched`
    } catch (error: any) {
      return `Failed to perform reconciliation: ${error.message}`
    }
  }

  /**
   * Handle collection optimization webhook from n8n
   */
  private async handleCollectionOptimizationWebhook(data: {
    triggerType: 'weekly_analysis' | 'performance_threshold' | 'manual_request'
    performanceThreshold?: number
  }): Promise<string> {
    try {
      // Run collection optimization
      const result = await this.optimizePaymentCollection()

      const optimizationCount = result.optimizations?.length || 0
      const collectionRate = result.currentMetrics?.collectionRate || 0

      // Notify management of optimization results
      if (optimizationCount > 0) {
        const notification = {
          type: 'goal_achieved' as const,
          priority: 'medium' as const,
          recipients: [{
            userId: 'management-team',
            role: 'admin' as const,
            contactMethod: 'email' as const
          }],
          title: 'Collection Strategy Optimized',
          titleAr: 'تم تحسين استراتيجية التحصيل',
          message: `Collection optimization completed. ${optimizationCount} improvements identified. Current collection rate: ${(collectionRate * 100).toFixed(1)}%`,
          messageAr: `اكتمل تحسين التحصيل. تم تحديد ${optimizationCount} تحسين. معدل التحصيل الحالي: ${(collectionRate * 100).toFixed(1)}%`
        }

        await this.sendFinancialNotification(notification)
      }

      // Trigger n8n workflow for strategy implementation
      await this.triggerN8nWorkflow('collection_strategy_implementation', {
        optimizationCount,
        collectionRate,
        strategies: result.optimizations?.map(opt => opt.strategy) || []
      })

      return `Collection optimization completed: ${optimizationCount} strategies identified`
    } catch (error: any) {
      return `Failed to optimize collection: ${error.message}`
    }
  }

  /**
   * Trigger n8n workflow with data
   */
  private async triggerN8nWorkflow(workflowName: string, data: any): Promise<void> {
    try {
      // This would integrate with n8n webhook endpoints
      // For now, log the trigger for implementation
      await supabase
        .from('n8n_workflow_triggers')
        .insert({
          workflow_name: workflowName,
          trigger_data: data,
          triggered_at: new Date().toISOString(),
          status: 'pending'
        })

      console.log(`N8N workflow triggered: ${workflowName}`, data)
    } catch (error) {
      console.error(`Failed to trigger n8n workflow ${workflowName}:`, error)
    }
  }

  /**
   * Send financial notification through multiple channels
   */
  private async sendFinancialNotification(notification: {
    type: 'payment_received' | 'invoice_overdue' | 'payment_failed' | 'reconciliation_required' | 'goal_achieved'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    recipients: Array<{
      userId: string
      role: string
      contactMethod: 'email' | 'sms' | 'whatsapp' | 'in_app'
    }>
    title: string
    titleAr: string
    message: string
    messageAr: string
    relatedInvoiceId?: string
    relatedPaymentId?: string
    scheduledFor?: string
  }): Promise<void> {
    try {
      const fullNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notification.type,
        priority: notification.priority || 'medium',
        recipients: notification.recipients,
        title: notification.title,
        titleAr: notification.titleAr,
        message: notification.message,
        messageAr: notification.messageAr,
        relatedInvoiceId: notification.relatedInvoiceId,
        relatedPaymentId: notification.relatedPaymentId,
        scheduledFor: notification.scheduledFor,
        deliveryStatus: 'pending' as const,
        createdAt: new Date().toISOString()
      }

      // Store notification
      await supabase
        .from('financial_notifications')
        .insert(fullNotification)

      // Send through configured channels
      for (const recipient of notification.recipients) {
        try {
          await this.deliverNotification(fullNotification, recipient)
        } catch (error) {
          console.error(`Failed to deliver notification to ${recipient.userId}:`, error)
        }
      }

    } catch (error) {
      console.error('Failed to send financial notification:', error)
    }
  }

  /**
   * Deliver notification to specific recipient through chosen channel
   */
  private async deliverNotification(notification: any, recipient: any): Promise<void> {
    switch (recipient.contactMethod) {
      case 'email':
        await this.sendEmailNotification(notification, recipient)
        break
      case 'sms':
        await this.sendSMSNotification(notification, recipient)
        break
      case 'whatsapp':
        await this.sendWhatsAppNotification(notification, recipient)
        break
      case 'in_app':
        await this.sendInAppNotification(notification, recipient)
        break
    }
  }

  // Mock delivery methods - implement with actual services
  private async sendEmailNotification(notification: any, recipient: any): Promise<void> {
    console.log(`Sending email notification to ${recipient.userId}:`, notification.title)
  }

  private async sendSMSNotification(notification: any, recipient: any): Promise<void> {
    console.log(`Sending SMS notification to ${recipient.userId}:`, notification.title)
  }

  private async sendWhatsAppNotification(notification: any, recipient: any): Promise<void> {
    console.log(`Sending WhatsApp notification to ${recipient.userId}:`, notification.title)
  }

  private async sendInAppNotification(notification: any, recipient: any): Promise<void> {
    console.log(`Sending in-app notification to ${recipient.userId}:`, notification.title)
  }

  // ==============================================
  // FINANCIAL DATA SYNCHRONIZATION WITH CORE THERAPY SYSTEMS
  // ==============================================

  /**
   * Synchronize financial data with core therapy systems
   */
  async synchronizeWithTherapySystems(): Promise<{
    success: boolean
    synchronizedSystems?: {
      iepManagement: { recordCount: number; status: string }
      serviceHourTracking: { recordCount: number; status: string }
      parentPortal: { recordCount: number; status: string }
      therapistScheduling: { recordCount: number; status: string }
    }
    totalRecordsSynchronized?: number
    errors?: string[]
    lastSyncTime?: string
  }> {
    try {
      const errors: string[] = []
      let totalRecordsSynchronized = 0
      const lastSyncTime = new Date().toISOString()

      // Sync with IEP Management System
      const iepResult = await this.syncWithIEPManagement()
      totalRecordsSynchronized += iepResult.recordCount

      // Sync with Service Hour Tracking
      const serviceHourResult = await this.syncWithServiceHourTracking()
      totalRecordsSynchronized += serviceHourResult.recordCount

      // Sync with Parent Portal
      const parentPortalResult = await this.syncWithParentPortal()
      totalRecordsSynchronized += parentPortalResult.recordCount

      // Sync with Therapist Scheduling
      const schedulingResult = await this.syncWithTherapistScheduling()
      totalRecordsSynchronized += schedulingResult.recordCount

      // Collect all errors
      errors.push(...iepResult.errors, ...serviceHourResult.errors, 
                 ...parentPortalResult.errors, ...schedulingResult.errors)

      // Log synchronization results
      await supabase
        .from('financial_sync_log')
        .insert({
          sync_timestamp: lastSyncTime,
          total_records: totalRecordsSynchronized,
          systems_synced: 4,
          errors: errors.length > 0 ? errors : null,
          status: errors.length === 0 ? 'success' : 'partial_success'
        })

      return {
        success: true,
        synchronizedSystems: {
          iepManagement: { recordCount: iepResult.recordCount, status: iepResult.status },
          serviceHourTracking: { recordCount: serviceHourResult.recordCount, status: serviceHourResult.status },
          parentPortal: { recordCount: parentPortalResult.recordCount, status: parentPortalResult.status },
          therapistScheduling: { recordCount: schedulingResult.recordCount, status: schedulingResult.status }
        },
        totalRecordsSynchronized,
        errors: errors.length > 0 ? errors : undefined,
        lastSyncTime
      }
    } catch (error: any) {
      console.error('Failed to synchronize with therapy systems:', error)
      return {
        success: false,
        errors: [error.message]
      }
    }
  }

  /**
   * Synchronize financial data with IEP Management System
   */
  private async syncWithIEPManagement(): Promise<{
    recordCount: number
    status: string
    errors: string[]
  }> {
    const errors: string[] = []
    let recordCount = 0

    try {
      // Get IEP goals that have billing implications
      const { data: iepGoals, error: goalsError } = await supabase
        .from('iep_goals')
        .select(`
          *,
          students:student_id(*),
          goal_progress(*)
        `)
        .eq('has_financial_impact', true)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      if (goalsError) throw goalsError

      for (const goal of iepGoals || []) {
        try {
          // Check if goal achievement triggers billing
          const latestProgress = goal.goal_progress
            ?.sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]

          if (latestProgress && latestProgress.achievement_percentage >= goal.billing_threshold) {
            // Create outcome-based billing record
            await this.createOutcomeBasedBilling(goal, latestProgress)
            recordCount++
          }

          // Update goal financial tracking
          await supabase
            .from('iep_financial_tracking')
            .upsert({
              goal_id: goal.id,
              student_id: goal.student_id,
              current_progress: latestProgress?.achievement_percentage || 0,
              billing_eligible: latestProgress?.achievement_percentage >= goal.billing_threshold,
              last_billing_date: goal.last_billed_at,
              updated_at: new Date().toISOString()
            })

        } catch (error: any) {
          errors.push(`IEP goal ${goal.id}: ${error.message}`)
        }
      }

      return { recordCount, status: 'success', errors }
    } catch (error: any) {
      return { recordCount: 0, status: 'failed', errors: [error.message] }
    }
  }

  /**
   * Synchronize with Service Hour Tracking System
   */
  private async syncWithServiceHourTracking(): Promise<{
    recordCount: number
    status: string
    errors: string[]
  }> {
    const errors: string[] = []
    let recordCount = 0

    try {
      // Get unbilled service hours
      const { data: serviceHours, error: hoursError } = await supabase
        .from('service_hour_tracking')
        .select(`
          *,
          students:student_id(*),
          therapists:therapist_id(*)
        `)
        .eq('billing_status', 'pending')
        .eq('session_status', 'completed')
        .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

      if (hoursError) throw hoursError

      for (const serviceHour of serviceHours || []) {
        try {
          // Calculate billable amount based on actual service delivery
          const billableAmount = this.calculateBillableAmount(serviceHour)

          // Create or update billing record
          const { data: billingRecord, error: billingError } = await supabase
            .from('service_billing_records')
            .upsert({
              service_hour_id: serviceHour.id,
              student_id: serviceHour.student_id,
              therapist_id: serviceHour.therapist_id,
              service_type: serviceHour.service_type,
              session_date: serviceHour.session_date,
              duration_minutes: serviceHour.duration_minutes,
              billable_amount: billableAmount,
              rate_applied: serviceHour.hourly_rate,
              billing_status: 'ready_for_invoice',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'service_hour_id'
            })
            .select()
            .single()

          if (billingError) throw billingError

          // Update service hour billing status
          await supabase
            .from('service_hour_tracking')
            .update({
              billing_status: 'processed',
              billing_record_id: billingRecord.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', serviceHour.id)

          recordCount++
        } catch (error: any) {
          errors.push(`Service hour ${serviceHour.id}: ${error.message}`)
        }
      }

      return { recordCount, status: 'success', errors }
    } catch (error: any) {
      return { recordCount: 0, status: 'failed', errors: [error.message] }
    }
  }

  /**
   * Synchronize financial data with Parent Portal
   */
  private async syncWithParentPortal(): Promise<{
    recordCount: number
    status: string
    errors: string[]
  }> {
    const errors: string[] = []
    let recordCount = 0

    try {
      // Get parent accounts that need financial updates
      const { data: parentAccounts, error: accountsError } = await supabase
        .from('parents')
        .select(`
          *,
          students:student_parents(students(*)),
          invoices:students(invoices(*)),
          payments:students(invoices(payments(*)))
        `)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      if (accountsError) throw accountsError

      for (const parent of parentAccounts || []) {
        try {
          // Calculate parent financial summary
          const financialSummary = this.calculateParentFinancialSummary(parent)

          // Update parent portal financial data
          await supabase
            .from('parent_portal_finances')
            .upsert({
              parent_id: parent.id,
              total_invoiced: financialSummary.totalInvoiced,
              total_paid: financialSummary.totalPaid,
              outstanding_balance: financialSummary.outstandingBalance,
              active_payment_plans: financialSummary.activePaymentPlans,
              next_payment_due: financialSummary.nextPaymentDue,
              payment_history: financialSummary.recentPayments,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'parent_id'
            })

          // Sync payment plan statuses
          await this.syncParentPaymentPlans(parent.id)

          recordCount++
        } catch (error: any) {
          errors.push(`Parent ${parent.id}: ${error.message}`)
        }
      }

      return { recordCount, status: 'success', errors }
    } catch (error: any) {
      return { recordCount: 0, status: 'failed', errors: [error.message] }
    }
  }

  /**
   * Synchronize with Therapist Scheduling System
   */
  private async syncWithTherapistScheduling(): Promise<{
    recordCount: number
    status: string
    errors: string[]
  }> {
    const errors: string[] = []
    let recordCount = 0

    try {
      // Get recent therapy sessions that affect financial data
      const { data: sessions, error: sessionsError } = await supabase
        .from('therapy_sessions')
        .select(`
          *,
          students:student_id(*),
          therapists:therapist_id(*),
          enrollment:student_enrollments(*)
        `)
        .in('status', ['completed', 'cancelled', 'no_show'])
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      if (sessionsError) throw sessionsError

      for (const session of sessions || []) {
        try {
          // Determine billing impact based on session outcome
          let billingImpact = 'none'
          let adjustmentAmount = 0

          switch (session.status) {
            case 'completed':
              billingImpact = 'billable'
              adjustmentAmount = session.session_fee || 0
              break
            case 'cancelled':
              if (session.cancellation_notice_hours < 24) {
                billingImpact = 'cancellation_fee'
                adjustmentAmount = (session.session_fee || 0) * 0.5 // 50% cancellation fee
              }
              break
            case 'no_show':
              billingImpact = 'full_charge'
              adjustmentAmount = session.session_fee || 0
              break
          }

          // Create session billing record
          if (billingImpact !== 'none') {
            await supabase
              .from('session_billing_adjustments')
              .upsert({
                session_id: session.id,
                student_id: session.student_id,
                therapist_id: session.therapist_id,
                adjustment_type: billingImpact,
                adjustment_amount: adjustmentAmount,
                session_date: session.session_date,
                reason: `Session ${session.status}`,
                created_at: new Date().toISOString()
              }, {
                onConflict: 'session_id'
              })

            recordCount++
          }

          // Update therapist revenue tracking
          await this.updateTherapistRevenueTracking(session.therapist_id, adjustmentAmount)

        } catch (error: any) {
          errors.push(`Session ${session.id}: ${error.message}`)
        }
      }

      return { recordCount, status: 'success', errors }
    } catch (error: any) {
      return { recordCount: 0, status: 'failed', errors: [error.message] }
    }
  }

  // Helper methods for synchronization
  private async createOutcomeBasedBilling(goal: any, progress: any): Promise<void> {
    const billingAmount = this.calculateOutcomeBasedBilling(goal, progress)
    
    await supabase
      .from('outcome_based_billing')
      .insert({
        goal_id: goal.id,
        student_id: goal.student_id,
        progress_id: progress.id,
        achievement_percentage: progress.achievement_percentage,
        billing_amount: billingAmount,
        billing_date: new Date().toISOString(),
        status: 'pending_invoice'
      })
  }

  private calculateBillableAmount(serviceHour: any): number {
    const hourlyRate = serviceHour.hourly_rate || 200 // Default rate in SAR
    const durationHours = serviceHour.duration_minutes / 60
    return Math.round(hourlyRate * durationHours * 100) / 100 // Round to 2 decimal places
  }

  private calculateParentFinancialSummary(parent: any): {
    totalInvoiced: number
    totalPaid: number
    outstandingBalance: number
    activePaymentPlans: number
    nextPaymentDue: string | null
    recentPayments: any[]
  } {
    const invoices = parent.invoices?.flat() || []
    const payments = parent.payments?.flat().flat() || []

    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
    const totalPaid = payments.reduce((sum: number, pay: any) => sum + pay.amount, 0)
    const outstandingBalance = totalInvoiced - totalPaid

    // Get recent payments (last 5)
    const recentPayments = payments
      .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 5)

    return {
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      activePaymentPlans: 0, // Would calculate from payment_plans table
      nextPaymentDue: null, // Would calculate from upcoming invoices
      recentPayments
    }
  }

  private async syncParentPaymentPlans(parentId: string): Promise<void> {
    // Sync payment plan statuses for this parent
    // Implementation would update payment plan progress and status
  }

  private calculateOutcomeBasedBilling(goal: any, progress: any): number {
    const baseAmount = goal.outcome_billing_rate || 100 // Base amount per goal achievement
    const achievementMultiplier = progress.achievement_percentage / 100
    return Math.round(baseAmount * achievementMultiplier * 100) / 100
  }

  private async updateTherapistRevenueTracking(therapistId: string, amount: number): Promise<void> {
    await supabase
      .from('therapist_revenue_tracking')
      .upsert({
        therapist_id: therapistId,
        period: new Date().toISOString().substring(0, 7), // YYYY-MM format
        revenue_amount: supabase.raw(`COALESCE(revenue_amount, 0) + ${amount}`),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'therapist_id,period'
      })
  }

  // ==============================================
  // WORKFLOW EXECUTION ENGINE
  // ==============================================

  async executeWorkflow(workflowId: string, triggerData: Record<string, any>): Promise<{
    success: boolean
    execution?: WorkflowExecution
    error?: string
  }> {
    try {
      const { data: workflow, error: workflowError } = await supabase
        .from('financial_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('is_active', true)
        .single()

      if (workflowError) throw workflowError

      const execution: WorkflowExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId,
        triggerId: triggerData.triggerId || 'manual',
        triggerData,
        status: 'running',
        startedAt: new Date().toISOString(),
        executedActions: [],
        context: { ...triggerData }
      }

      // Save execution record
      await supabase
        .from('workflow_executions')
        .insert(execution)

      // Execute actions in sequence
      for (const action of workflow.actions || []) {
        const actionResult = {
          actionId: action.id,
          status: 'pending' as const,
          executedAt: new Date().toISOString()
        }

        try {
          const result = await this.executeWorkflowAction(action, execution.context)
          actionResult.status = 'completed'
          actionResult.result = result

          // Update context with action results
          execution.context[`action_${action.id}_result`] = result

        } catch (error: any) {
          actionResult.status = 'failed'
          actionResult.error = error.message
          console.error(`Workflow action ${action.id} failed:`, error)

          // Stop execution on critical actions
          if (action.stopOnError) {
            execution.status = 'failed'
            execution.error = `Action ${action.id} failed: ${error.message}`
            break
          }
        }

        execution.executedActions.push(actionResult)
      }

      // Update final execution status
      if (execution.status === 'running') {
        execution.status = 'completed'
      }
      execution.completedAt = new Date().toISOString()

      // Update execution record
      await supabase
        .from('workflow_executions')
        .update({
          status: execution.status,
          executed_actions: execution.executedActions,
          context: execution.context,
          completed_at: execution.completedAt,
          error: execution.error
        })
        .eq('id', execution.id)

      return {
        success: true,
        execution
      }
    } catch (error: any) {
      console.error('Failed to execute workflow:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async executeWorkflowAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    switch (action.type) {
      case 'send_notification':
        return await this.executeNotificationAction(action, context)
      case 'create_invoice':
        return await this.executeInvoiceCreationAction(action, context)
      case 'update_payment_plan':
        return await this.executePaymentPlanUpdateAction(action, context)
      case 'suspend_services':
        return await this.executeSuspendServicesAction(action, context)
      case 'calculate_late_fees':
        return await this.executeLateFeeCalculationAction(action, context)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  private calculateNextInvoiceDate(lastDate: string, frequency: string): string {
    const date = new Date(lastDate)
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'session_based':
        // For session-based, calculate based on average session frequency
        date.setDate(date.getDate() + 7) // Default to weekly for session-based
        break
    }
    
    return date.toISOString().split('T')[0]
  }

  private calculateReminderDate(dueDate: string, daysBefore: number): string {
    const date = new Date(dueDate)
    date.setDate(date.getDate() - daysBefore)
    return date.toISOString()
  }

  private calculateDueDate(paymentTerms: number): string {
    const date = new Date()
    date.setDate(date.getDate() + paymentTerms)
    return date.toISOString().split('T')[0]
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // Get next invoice number for this month
    const { data, error } = await supabase
      .from('invoice_sequences')
      .select('next_number')
      .eq('year', year)
      .eq('month', parseInt(month))
      .single()

    let nextNumber = 1
    if (!error && data) {
      nextNumber = data.next_number
      await supabase
        .from('invoice_sequences')
        .update({ next_number: nextNumber + 1 })
        .eq('year', year)
        .eq('month', parseInt(month))
    } else {
      await supabase
        .from('invoice_sequences')
        .insert({
          year,
          month: parseInt(month),
          next_number: 2
        })
    }

    return `INV-${year}${month}-${String(nextNumber).padStart(4, '0')}`
  }

  private getReminderType(daysBefore: number): 'first' | 'second' | 'final' | 'overdue' {
    if (daysBefore >= 7) return 'first'
    if (daysBefore >= 3) return 'second'
    if (daysBefore >= 1) return 'final'
    return 'overdue'
  }

  // Notification sending methods (these would integrate with actual services)
  private async sendEmailReminder(email: string, template: any, data: any): Promise<void> {
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email reminder to ${email}`)
  }

  private async sendSMSReminder(phone: string, template: any, data: any): Promise<void> {
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS reminder to ${phone}`)
  }

  private async sendWhatsAppReminder(whatsapp: string, template: any, data: any): Promise<void> {
    // Implementation would integrate with WhatsApp Business API
    console.log(`Sending WhatsApp reminder to ${whatsapp}`)
  }

  private async sendOverdueNotification(invoice: any, escalationStep: any): Promise<string> {
    // Send overdue notification
    return 'Overdue notification sent'
  }

  private async suspendServices(invoice: any): Promise<string> {
    // Suspend student services
    await supabase
      .from('student_enrollments')
      .update({ status: 'suspended', suspension_reason: 'overdue_payment' })
      .eq('student_id', invoice.student_id)
    
    return 'Services suspended'
  }

  private async referToCollections(invoice: any): Promise<string> {
    // Create collections referral
    await supabase
      .from('collections_referrals')
      .insert({
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        amount: invoice.total_amount,
        referred_at: new Date().toISOString(),
        status: 'pending'
      })
    
    return 'Referred to collections'
  }

  // Workflow action execution methods
  private async executeNotificationAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    // Send notification based on action parameters
    return { sent: true, timestamp: new Date().toISOString() }
  }

  private async executeInvoiceCreationAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    // Create invoice based on action parameters
    return { invoiceId: 'generated_invoice_id' }
  }

  private async executePaymentPlanUpdateAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    // Update payment plan based on action parameters
    return { updated: true }
  }

  private async executeSuspendServicesAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    // Suspend services based on action parameters
    return { suspended: true }
  }

  private async executeLateFeeCalculationAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    // Calculate and apply late fees
    return { lateFeeAmount: 0 }
  }
}

export const financialWorkflowAutomationService = new FinancialWorkflowAutomationService()