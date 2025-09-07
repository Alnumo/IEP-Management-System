/**
 * Automated Invoice Generation Service
 * Story 1.5: Financial Management & Payment Processing - Task 2
 * 
 * Generates invoices automatically based on completed therapy sessions with:
 * - 15% Saudi VAT calculation and compliance
 * - Link to existing session attendance data  
 * - Integration with enrollment data for accurate billing
 * - Automated invoice numbering and tracking
 * - Arabic/English bilingual support
 */

import { supabase } from '../lib/supabase'
import type { 
  Invoice, 
  ServiceDeliveryRecord, 
  InvoiceGenerationRule,
  AutomatedInvoiceGeneration 
} from '../types/financial-management'

export interface SessionBillingData {
  sessionId: string
  studentId: string
  therapistId: string
  serviceType: string
  sessionDate: string
  duration: number
  actualDuration?: number
  cost: number
  isCompleted: boolean
  isBillable: boolean
  enrollmentId?: string
  programId?: string
}

export interface InvoiceGenerationOptions {
  studentId?: string
  dateRange?: {
    start: string
    end: string
  }
  serviceTypes?: string[]
  autoSend?: boolean
  paymentTerms?: number
  includeInsurance?: boolean
  ruleId?: string
  approvalRequired?: boolean
}

export interface GeneratedInvoiceResult {
  success: boolean
  invoiceId?: string
  invoiceNumber?: string
  totalAmount: number
  itemCount: number
  studentName: string
  studentNameAr: string
  error?: {
    code: string
    message: string
    messageAr: string
  }
  generationDetails: {
    sessionsProcessed: number
    vatAmount: number
    subtotal: number
    generatedAt: string
    ruleApplied?: string
  }
}

export class AutomatedInvoiceGenerationService {
  private readonly VAT_RATE = 0.15 // 15% Saudi VAT
  private readonly DEFAULT_PAYMENT_TERMS = 30 // Days
  private readonly CURRENCY = 'SAR'

  /**
   * Generate invoices for completed, unbilled therapy sessions
   */
  async generateInvoicesForCompletedSessions(
    options: InvoiceGenerationOptions = {}
  ): Promise<GeneratedInvoiceResult[]> {
    try {
      // Get billing settings
      const billingSettings = await this.getBillingSettings()
      
      // Fetch completed, unbilled sessions
      const sessionsData = await this.fetchCompletedUnbilledSessions(options)
      
      if (sessionsData.length === 0) {
        return []
      }

      // Group sessions by student for individual invoices
      const sessionsByStudent = this.groupSessionsByStudent(sessionsData)
      
      const results: GeneratedInvoiceResult[] = []

      // Generate invoice for each student
      for (const [studentId, sessions] of Object.entries(sessionsByStudent)) {
        try {
          const invoiceResult = await this.generateInvoiceForStudent(
            studentId,
            sessions,
            options,
            billingSettings
          )
          results.push(invoiceResult)
        } catch (error) {
          console.error(`Failed to generate invoice for student ${studentId}:`, error)
          results.push({
            success: false,
            totalAmount: 0,
            itemCount: 0,
            studentName: 'Unknown',
            studentNameAr: 'غير معروف',
            error: {
              code: 'INVOICE_GENERATION_ERROR',
              message: 'Failed to generate invoice for student',
              messageAr: 'فشل في إنشاء فاتورة للطالب'
            },
            generationDetails: {
              sessionsProcessed: sessions.length,
              vatAmount: 0,
              subtotal: 0,
              generatedAt: new Date().toISOString()
            }
          })
        }
      }

      return results
    } catch (error) {
      console.error('Automated invoice generation failed:', error)
      throw new Error('Failed to generate automated invoices')
    }
  }

  /**
   * Generate invoice for a specific student's sessions
   */
  private async generateInvoiceForStudent(
    studentId: string,
    sessions: SessionBillingData[],
    options: InvoiceGenerationOptions,
    billingSettings: any
  ): Promise<GeneratedInvoiceResult> {
    // Get student information
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id, name, name_ar,
        parents (id, email, phone),
        enrollments (
          id, plan_id,
          therapy_plans (id, name_ar, name_en)
        )
      `)
      .eq('id', studentId)
      .single()

    if (studentError || !studentData) {
      throw new Error(`Student not found: ${studentId}`)
    }

    // Calculate totals
    const subtotal = sessions.reduce((sum, session) => sum + session.cost, 0)
    const vatAmount = subtotal * this.VAT_RATE
    const totalAmount = subtotal + vatAmount

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(billingSettings)

    // Create invoice record
    const invoiceData: Partial<Invoice> = {
      invoice_number: invoiceNumber,
      student_id: studentId,
      parent_id: studentData.parents?.[0]?.id,
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + (options.paymentTerms || this.DEFAULT_PAYMENT_TERMS) * 24 * 60 * 60 * 1000).toISOString(),
      status: options.autoSend ? 'sent' : 'draft',
      currency: this.CURRENCY,
      subtotal: subtotal,
      discount_amount: 0,
      tax_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: 0,
      balance_amount: totalAmount,
      payment_terms: options.paymentTerms || this.DEFAULT_PAYMENT_TERMS,
      notes: this.generateInvoiceNotes(sessions, 'en'),
      internal_notes: `Auto-generated from ${sessions.length} therapy sessions`,
      created_by: await this.getCurrentUserId()
    }

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Failed to create invoice record')
    }

    // Create invoice items
    await this.createInvoiceItems(invoice.id, sessions)

    // Update sessions as billed
    await this.markSessionsAsBilled(sessions.map(s => s.sessionId), invoice.id)

    // Log the generation activity
    await this.logInvoiceGeneration(invoice.id, sessions, options.ruleId)

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      totalAmount: totalAmount,
      itemCount: sessions.length,
      studentName: studentData.name || '',
      studentNameAr: studentData.name_ar || '',
      generationDetails: {
        sessionsProcessed: sessions.length,
        vatAmount: vatAmount,
        subtotal: subtotal,
        generatedAt: new Date().toISOString(),
        ruleApplied: options.ruleId
      }
    }
  }

  /**
   * Fetch completed, unbilled therapy sessions
   */
  private async fetchCompletedUnbilledSessions(
    options: InvoiceGenerationOptions
  ): Promise<SessionBillingData[]> {
    let query = supabase
      .from('therapy_sessions')
      .select(`
        id, student_id, therapist_id, session_type as service_type,
        scheduled_date, duration_minutes, actual_duration, cost,
        status, is_billable,
        enrollments (id, plan_id)
      `)
      .eq('status', 'completed')
      .eq('is_billable', true)
      .eq('payment_status', 'pending')

    // Apply filters
    if (options.studentId) {
      query = query.eq('student_id', options.studentId)
    }

    if (options.dateRange) {
      query = query
        .gte('scheduled_date', options.dateRange.start)
        .lte('scheduled_date', options.dateRange.end)
    }

    if (options.serviceTypes && options.serviceTypes.length > 0) {
      query = query.in('session_type', options.serviceTypes)
    }

    const { data: sessions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`)
    }

    return sessions?.map(session => ({
      sessionId: session.id,
      studentId: session.student_id,
      therapistId: session.therapist_id,
      serviceType: session.service_type,
      sessionDate: session.scheduled_date,
      duration: session.duration_minutes,
      actualDuration: session.actual_duration,
      cost: session.cost || 0,
      isCompleted: session.status === 'completed',
      isBillable: session.is_billable,
      enrollmentId: session.enrollments?.[0]?.id,
      programId: session.enrollments?.[0]?.plan_id
    })) || []
  }

  /**
   * Group sessions by student ID
   */
  private groupSessionsByStudent(sessions: SessionBillingData[]): Record<string, SessionBillingData[]> {
    return sessions.reduce((groups, session) => {
      const studentId = session.studentId
      if (!groups[studentId]) {
        groups[studentId] = []
      }
      groups[studentId].push(session)
      return groups
    }, {} as Record<string, SessionBillingData[]>)
  }

  /**
   * Create invoice items from sessions
   */
  private async createInvoiceItems(invoiceId: string, sessions: SessionBillingData[]): Promise<void> {
    const invoiceItems = sessions.map(session => {
      const unitPrice = session.cost
      const quantity = session.actualDuration ? session.actualDuration / 60 : session.duration / 60 // Convert to hours
      const subtotal = unitPrice * quantity
      const vatAmount = subtotal * this.VAT_RATE
      const totalAmount = subtotal + vatAmount

      return {
        invoice_id: invoiceId,
        session_id: session.sessionId,
        student_id: session.studentId,
        therapist_id: session.therapistId,
        service_type: session.serviceType,
        service_date: session.sessionDate,
        quantity: quantity,
        unit_price: unitPrice,
        subtotal: subtotal,
        discount_amount: 0,
        tax_amount: vatAmount,
        total_amount: totalAmount,
        notes: `${session.serviceType} therapy session - ${session.duration} minutes`
      }
    })

    const { error } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (error) {
      throw new Error(`Failed to create invoice items: ${error.message}`)
    }
  }

  /**
   * Mark therapy sessions as billed
   */
  private async markSessionsAsBilled(sessionIds: string[], invoiceId: string): Promise<void> {
    const { error } = await supabase
      .from('therapy_sessions')
      .update({
        payment_status: 'pending_payment', // Indicates invoice has been created
        updated_at: new Date().toISOString()
      })
      .in('id', sessionIds)

    if (error) {
      throw new Error(`Failed to update session payment status: ${error.message}`)
    }
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(billingSettings: any): Promise<string> {
    const prefix = billingSettings?.invoice_prefix || 'INV'
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    
    // Get the latest invoice number for this month
    const { data: latestInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}-${year}${month}%`)
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (latestInvoice && latestInvoice.length > 0) {
      const lastNumber = latestInvoice[0].invoice_number
      const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
      nextNumber = lastSequence + 1
    }

    return `${prefix}-${year}${month}-${String(nextNumber).padStart(4, '0')}`
  }

  /**
   * Get billing settings from database
   */
  private async getBillingSettings(): Promise<any> {
    const { data: settings } = await supabase
      .from('billing_settings')
      .select('setting_key, setting_value')

    const settingsMap: Record<string, any> = {}
    settings?.forEach(setting => {
      try {
        settingsMap[setting.setting_key] = JSON.parse(setting.setting_value)
      } catch {
        settingsMap[setting.setting_key] = setting.setting_value
      }
    })

    return settingsMap
  }

  /**
   * Generate invoice notes based on sessions
   */
  private generateInvoiceNotes(sessions: SessionBillingData[], language: 'ar' | 'en' = 'en'): string {
    const serviceTypeCounts: Record<string, number> = {}
    sessions.forEach(session => {
      serviceTypeCounts[session.serviceType] = (serviceTypeCounts[session.serviceType] || 0) + 1
    })

    if (language === 'ar') {
      const notes = Object.entries(serviceTypeCounts)
        .map(([type, count]) => `${count} جلسة من ${type}`)
        .join('، ')
      return `فاتورة للجلسات المكتملة: ${notes}`
    } else {
      const notes = Object.entries(serviceTypeCounts)
        .map(([type, count]) => `${count} ${type} session${count > 1 ? 's' : ''}`)
        .join(', ')
      return `Invoice for completed sessions: ${notes}`
    }
  }

  /**
   * Get current user ID for audit trail
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  }

  /**
   * Log invoice generation activity
   */
  private async logInvoiceGeneration(
    invoiceId: string, 
    sessions: SessionBillingData[],
    ruleId?: string
  ): Promise<void> {
    try {
      const logData = {
        invoice_id: invoiceId,
        rule_id: ruleId,
        trigger_type: 'manual_generation',
        trigger_data: {
          sessionIds: sessions.map(s => s.sessionId),
          sessionCount: sessions.length,
          totalAmount: sessions.reduce((sum, s) => sum + s.cost, 0)
        },
        triggered_at: new Date().toISOString(),
        invoice_status: 'generated',
        service_records: sessions.map(session => ({
          sessionId: session.sessionId,
          serviceType: session.serviceType,
          amount: session.cost,
          duration: session.duration,
          date: session.sessionDate
        })),
        total_amount: sessions.reduce((sum, s) => sum + s.cost, 0) * (1 + this.VAT_RATE),
        item_count: sessions.length,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      await supabase
        .from('automated_invoice_generation')
        .insert(logData)
    } catch (error) {
      console.error('Failed to log invoice generation:', error)
      // Don't throw here as it's just logging
    }
  }

  /**
   * Generate invoices by enrollment period (monthly, quarterly, etc.)
   */
  async generateInvoicesByEnrollmentPeriod(
    enrollmentIds: string[],
    billingPeriod: 'monthly' | 'quarterly' | 'custom',
    dateRange?: { start: string; end: string }
  ): Promise<GeneratedInvoiceResult[]> {
    try {
      // Get enrollment data with associated sessions
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id, student_id, plan_id, start_date,
          students (id, name, name_ar),
          therapy_plans (id, name_ar, name_en),
          therapy_sessions (
            id, session_type, scheduled_date, duration_minutes,
            actual_duration, cost, status, is_billable, payment_status
          )
        `)
        .in('id', enrollmentIds)

      if (error) {
        throw new Error(`Failed to fetch enrollment data: ${error.message}`)
      }

      const results: GeneratedInvoiceResult[] = []

      for (const enrollment of enrollments || []) {
        // Filter sessions based on billing period and completion status
        const eligibleSessions = enrollment.therapy_sessions
          ?.filter(session => 
            session.status === 'completed' && 
            session.is_billable && 
            session.payment_status === 'pending' &&
            this.isSessionInBillingPeriod(session.scheduled_date, billingPeriod, dateRange)
          )

        if (eligibleSessions && eligibleSessions.length > 0) {
          const sessionData: SessionBillingData[] = eligibleSessions.map(session => ({
            sessionId: session.id,
            studentId: enrollment.student_id,
            therapistId: '', // Would need to be included in query
            serviceType: session.session_type,
            sessionDate: session.scheduled_date,
            duration: session.duration_minutes,
            actualDuration: session.actual_duration,
            cost: session.cost || 0,
            isCompleted: true,
            isBillable: true,
            enrollmentId: enrollment.id,
            programId: enrollment.plan_id
          }))

          const invoiceResult = await this.generateInvoiceForStudent(
            enrollment.student_id,
            sessionData,
            { autoSend: false },
            await this.getBillingSettings()
          )

          results.push(invoiceResult)
        }
      }

      return results
    } catch (error) {
      console.error('Failed to generate invoices by enrollment period:', error)
      throw error
    }
  }

  /**
   * Check if session falls within billing period
   */
  private isSessionInBillingPeriod(
    sessionDate: string,
    billingPeriod: 'monthly' | 'quarterly' | 'custom',
    dateRange?: { start: string; end: string }
  ): boolean {
    const session = new Date(sessionDate)
    const now = new Date()

    if (billingPeriod === 'custom' && dateRange) {
      return session >= new Date(dateRange.start) && session <= new Date(dateRange.end)
    }

    if (billingPeriod === 'monthly') {
      return session.getMonth() === now.getMonth() && session.getFullYear() === now.getFullYear()
    }

    if (billingPeriod === 'quarterly') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const sessionQuarter = Math.floor(session.getMonth() / 3)
      return sessionQuarter === currentQuarter && session.getFullYear() === now.getFullYear()
    }

    return false
  }

  /**
   * Get service rates from database
   */
  async getServiceRates(): Promise<Record<string, number>> {
    const { data: rates, error } = await supabase
      .from('service_rates')
      .select('service_type, standard_rate')
      .eq('is_active', true)

    if (error) {
      console.error('Failed to fetch service rates:', error)
      return {}
    }

    const ratesMap: Record<string, number> = {}
    rates?.forEach(rate => {
      ratesMap[rate.service_type] = rate.standard_rate
    })

    return ratesMap
  }

  /**
   * Calculate VAT amount for given subtotal
   */
  calculateVAT(subtotal: number): number {
    return subtotal * this.VAT_RATE
  }

  /**
   * Validate invoice generation data
   */
  private validateInvoiceData(sessions: SessionBillingData[]): boolean {
    if (!sessions || sessions.length === 0) {
      return false
    }

    // Check that all sessions are completed and billable
    return sessions.every(session => 
      session.isCompleted && 
      session.isBillable && 
      session.cost > 0
    )
  }
}