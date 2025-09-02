/**
 * Financial Reporting Service
 * Advanced financial reporting, compliance, and audit trail system
 * Part of Story 2.3: Financial Management Module - Task 5
 */

import { supabase } from '../lib/supabase'
import type {
  VatCompliance,
  FinancialAuditTrail,
  FinancialNotification,
  Currency
} from '../types/financial-management'

// ==============================================
// FINANCIAL REPORTING SERVICE
// ==============================================

export class FinancialReportingService {

  /**
   * Generate Saudi VAT compliance report
   */
  async generateVATReport(periodStart: string, periodEnd: string): Promise<{
    success: boolean
    report?: VatCompliance
    error?: string
  }> {
    try {
      // Query all invoices for the period
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(*),
          payments(*)
        `)
        .gte('issue_date', periodStart)
        .lte('issue_date', periodEnd)
        .eq('status', 'paid')

      if (invoicesError || !invoices) {
        return { success: false, error: 'Failed to fetch invoice data for VAT report' }
      }

      // Calculate VAT totals
      const vatRate = 0.15 // 15% Saudi VAT rate
      let totalSales = 0
      let vatCollected = 0
      let vatPaid = 0 // Would include input VAT from purchases

      invoices.forEach(invoice => {
        totalSales += invoice.subtotal
        vatCollected += invoice.tax_amount
      })

      // Get VAT settings from billing_settings
      const { data: vatSettings } = await supabase
        .from('billing_settings')
        .select('setting_value')
        .eq('setting_key', 'vat_registration_number')
        .single()

      const vatRegistrationNumber = vatSettings?.setting_value || 'VAT-REG-12345'

      // Create compliance report
      const vatCompliance: VatCompliance = {
        vatRegistrationNumber: vatRegistrationNumber.replace(/"/g, ''),
        vatRate: vatRate,
        vatReturns: [{
          periodStart,
          periodEnd,
          totalSales,
          vatCollected,
          vatPaid,
          netVat: vatCollected - vatPaid,
          filingDate: new Date().toISOString().split('T')[0],
          status: 'draft'
        }],
        lastComplianceCheck: new Date().toISOString(),
        complianceStatus: 'compliant',
        issues: []
      }

      // Validate compliance
      const complianceIssues = this.validateVATCompliance(vatCompliance, invoices)
      if (complianceIssues.length > 0) {
        vatCompliance.complianceStatus = 'issues_found'
        vatCompliance.issues = complianceIssues
      }

      // Store report in cache
      await this.cacheFinancialReport('vat_compliance', periodStart, periodEnd, {
        vatCompliance,
        generatedAt: new Date().toISOString(),
        invoiceCount: invoices.length
      })

      return { success: true, report: vatCompliance }

    } catch (error) {
      console.error('Error generating VAT report:', error)
      return { success: false, error: 'Internal error generating VAT compliance report' }
    }
  }

  /**
   * Generate comprehensive audit trail report
   */
  async generateAuditTrail(
    entityType?: 'invoice' | 'payment' | 'refund' | 'adjustment',
    dateRange?: { start: string; end: string },
    userId?: string
  ): Promise<{
    success: boolean
    auditTrail?: FinancialAuditTrail[]
    summary?: {
      totalEntries: number
      actionBreakdown: Record<string, number>
      userBreakdown: Record<string, number>
      timeRange: { start: string; end: string }
    }
    error?: string
  }> {
    try {
      // Build audit trail query
      let auditQuery = supabase
        .from('financial_audit_trail')
        .select(`
          *,
          users(name, email)
        `)
        .eq('is_archived', false)
        .order('performed_at', { ascending: false })
        .limit(1000) // Reasonable limit for performance

      // Apply filters
      if (entityType) {
        auditQuery = auditQuery.eq('entity_type', entityType)
      }

      if (dateRange) {
        auditQuery = auditQuery
          .gte('performed_at', dateRange.start)
          .lte('performed_at', dateRange.end)
      }

      if (userId) {
        auditQuery = auditQuery.eq('performed_by', userId)
      }

      const { data: auditEntries, error: auditError } = await auditQuery

      if (auditError || !auditEntries) {
        return { success: false, error: 'Failed to fetch audit trail data' }
      }

      // Map database entries to audit trail format
      const auditTrail: FinancialAuditTrail[] = auditEntries.map(entry => ({
        id: entry.id,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        action: entry.action,
        performedBy: entry.performed_by,
        performedAt: entry.performed_at,
        previousValues: entry.previous_values,
        newValues: entry.new_values,
        reason: entry.reason,
        ipAddress: entry.ip_address,
        userAgent: entry.user_agent,
        retentionPeriod: entry.retention_period,
        isArchived: entry.is_archived
      }))

      // Generate summary statistics
      const actionBreakdown: Record<string, number> = {}
      const userBreakdown: Record<string, number> = {}

      auditTrail.forEach(entry => {
        actionBreakdown[entry.action] = (actionBreakdown[entry.action] || 0) + 1
        userBreakdown[entry.performedBy] = (userBreakdown[entry.performedBy] || 0) + 1
      })

      const summary = {
        totalEntries: auditTrail.length,
        actionBreakdown,
        userBreakdown,
        timeRange: {
          start: auditTrail[auditTrail.length - 1]?.performedAt || new Date().toISOString(),
          end: auditTrail[0]?.performedAt || new Date().toISOString()
        }
      }

      return {
        success: true,
        auditTrail,
        summary
      }

    } catch (error) {
      console.error('Error generating audit trail:', error)
      return { success: false, error: 'Internal error generating audit trail report' }
    }
  }

  /**
   * Generate financial export for external systems
   */
  async generateFinancialExport(
    format: 'pdf' | 'excel' | 'csv' | 'json',
    reportType: 'revenue' | 'payments' | 'vat' | 'audit' | 'comprehensive',
    dateRange: { start: string; end: string },
    includeDetails = true
  ): Promise<{
    success: boolean
    exportData?: any
    fileName?: string
    mimeType?: string
    error?: string
  }> {
    try {
      let exportData: any = {}
      let fileName = `financial-${reportType}-${dateRange.start}-${dateRange.end}`

      switch (reportType) {
        case 'revenue':
          exportData = await this.generateRevenueExport(dateRange, includeDetails)
          break

        case 'payments':
          exportData = await this.generatePaymentsExport(dateRange, includeDetails)
          break

        case 'vat':
          const vatReport = await this.generateVATReport(dateRange.start, dateRange.end)
          exportData = vatReport.report
          break

        case 'audit':
          const auditReport = await this.generateAuditTrail(undefined, dateRange)
          exportData = {
            auditTrail: auditReport.auditTrail,
            summary: auditReport.summary
          }
          break

        case 'comprehensive':
          exportData = await this.generateComprehensiveExport(dateRange)
          break

        default:
          return { success: false, error: 'Invalid report type' }
      }

      // Format the data based on requested format
      const formattedExport = this.formatExportData(exportData, format)

      return {
        success: true,
        exportData: formattedExport.data,
        fileName: `${fileName}.${format}`,
        mimeType: formattedExport.mimeType
      }

    } catch (error) {
      console.error('Error generating financial export:', error)
      return { success: false, error: 'Internal error generating financial export' }
    }
  }

  /**
   * Generate parent portal financial statements
   */
  async generateParentFinancialStatement(
    studentId: string,
    dateRange: { start: string; end: string }
  ): Promise<{
    success: boolean
    statement?: {
      student: {
        id: string
        name: string
        nameAr: string
      }
      summary: {
        totalInvoiced: number
        totalPaid: number
        outstandingBalance: number
        currency: Currency
      }
      invoices: Array<{
        invoiceNumber: string
        issueDate: string
        dueDate: string
        amount: number
        paidAmount: number
        status: string
        services: Array<{
          serviceType: string
          date: string
          amount: number
        }>
      }>
      payments: Array<{
        date: string
        amount: number
        method: string
        receiptNumber: string
        invoiceNumber: string
      }>
      paymentPlans?: Array<{
        id: string
        totalAmount: number
        installmentsRemaining: number
        nextDueDate: string
        status: string
      }>
    }
    error?: string
  }> {
    try {
      // Get student information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, name_ar')
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        return { success: false, error: 'Student not found' }
      }

      // Get invoices for the period
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(
            service_type,
            service_date,
            total_amount
          ),
          payments(
            payment_date,
            amount,
            payment_method,
            receipt_number
          )
        `)
        .eq('student_id', studentId)
        .gte('issue_date', dateRange.start)
        .lte('issue_date', dateRange.end)
        .order('issue_date', { ascending: false })

      if (invoicesError) {
        return { success: false, error: 'Failed to fetch invoice data' }
      }

      // Get payment plans
      const { data: paymentPlans, error: plansError } = await supabase
        .from('payment_plans')
        .select(`
          id,
          total_amount,
          number_of_installments,
          status,
          payment_installments(
            due_date,
            status
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['active', 'completed'])

      // Calculate summary
      const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const totalPaid = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0
      const outstandingBalance = totalInvoiced - totalPaid

      // Format invoices
      const formattedInvoices = invoices?.map(invoice => ({
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        amount: invoice.total_amount,
        paidAmount: invoice.paid_amount,
        status: invoice.status,
        services: invoice.invoice_items?.map((item: any) => ({
          serviceType: item.service_type,
          date: item.service_date,
          amount: item.total_amount
        })) || []
      })) || []

      // Format payments
      const allPayments: any[] = []
      invoices?.forEach(invoice => {
        invoice.payments?.forEach((payment: any) => {
          allPayments.push({
            date: payment.payment_date,
            amount: payment.amount,
            method: payment.payment_method,
            receiptNumber: payment.receipt_number,
            invoiceNumber: invoice.invoice_number
          })
        })
      })

      // Format payment plans
      const formattedPaymentPlans = paymentPlans?.map(plan => {
        const pendingInstallments = plan.payment_installments?.filter(
          (inst: any) => inst.status === 'pending'
        ) || []
        const nextDue = pendingInstallments
          .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

        return {
          id: plan.id,
          totalAmount: plan.total_amount,
          installmentsRemaining: pendingInstallments.length,
          nextDueDate: nextDue?.due_date || '',
          status: plan.status
        }
      }) || []

      const statement = {
        student: {
          id: student.id,
          name: student.name,
          nameAr: student.name_ar
        },
        summary: {
          totalInvoiced,
          totalPaid,
          outstandingBalance,
          currency: 'SAR' as Currency
        },
        invoices: formattedInvoices,
        payments: allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        paymentPlans: formattedPaymentPlans.length > 0 ? formattedPaymentPlans : undefined
      }

      return { success: true, statement }

    } catch (error) {
      console.error('Error generating parent financial statement:', error)
      return { success: false, error: 'Internal error generating financial statement' }
    }
  }

  /**
   * Generate management dashboard with executive financial summaries
   */
  async generateExecutiveSummary(dateRange: { start: string; end: string }): Promise<{
    success: boolean
    summary?: {
      financialHighlights: {
        totalRevenue: number
        revenueGrowth: number
        collectionRate: number
        outstandingAmount: number
        profitMargin: number
      }
      keyMetrics: {
        averageInvoiceValue: number
        averagePaymentTime: number
        customerRetentionRate: number
        serviceUtilization: number
      }
      performanceIndicators: {
        monthlyRecurringRevenue: number
        churnRate: number
        averageRevenuePerUser: number
        lifetimeValue: number
      }
      riskFactors: Array<{
        category: string
        level: 'low' | 'medium' | 'high'
        description: string
        impact: number
        recommendation: string
      }>
      recommendations: Array<{
        priority: 'high' | 'medium' | 'low'
        category: 'revenue' | 'collections' | 'efficiency' | 'risk'
        title: string
        description: string
        expectedImpact: string
      }>
    }
    error?: string
  }> {
    try {
      // Get comprehensive financial data
      const [invoicesData, paymentsData, studentsData] = await Promise.all([
        this.getInvoicesData(dateRange),
        this.getPaymentsData(dateRange),
        this.getStudentsData(dateRange)
      ])

      // Calculate financial highlights
      const totalRevenue = paymentsData.reduce((sum, payment) => sum + payment.amount, 0)
      const totalInvoiced = invoicesData.reduce((sum, invoice) => sum + invoice.total_amount, 0)
      const totalPaid = paymentsData.reduce((sum, payment) => sum + payment.amount, 0)
      const outstandingAmount = totalInvoiced - totalPaid
      const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0

      // Calculate growth (mock calculation - would use previous period data)
      const revenueGrowth = 12.5 // Placeholder

      // Calculate profit margin (mock - would need expense data)
      const profitMargin = 25.8 // Placeholder

      // Key metrics calculations
      const averageInvoiceValue = invoicesData.length > 0 ? totalInvoiced / invoicesData.length : 0
      const averagePaymentTime = this.calculateAveragePaymentTime(paymentsData)
      const customerRetentionRate = 85.2 // Placeholder
      const serviceUtilization = 78.9 // Placeholder

      // Performance indicators
      const monthlyRecurringRevenue = totalRevenue * 0.7 // Assuming 70% is recurring
      const churnRate = 5.2 // Placeholder
      const averageRevenuePerUser = studentsData.length > 0 ? totalRevenue / studentsData.length : 0
      const lifetimeValue = averageRevenuePerUser * 24 // Assuming 2-year average

      // Risk assessment
      const riskFactors = this.assessFinancialRisks(
        collectionRate,
        outstandingAmount,
        averagePaymentTime,
        churnRate
      )

      // Generate recommendations
      const recommendations = this.generateFinancialRecommendations(
        collectionRate,
        averagePaymentTime,
        serviceUtilization,
        riskFactors
      )

      const summary = {
        financialHighlights: {
          totalRevenue,
          revenueGrowth,
          collectionRate,
          outstandingAmount,
          profitMargin
        },
        keyMetrics: {
          averageInvoiceValue,
          averagePaymentTime,
          customerRetentionRate,
          serviceUtilization
        },
        performanceIndicators: {
          monthlyRecurringRevenue,
          churnRate,
          averageRevenuePerUser,
          lifetimeValue
        },
        riskFactors,
        recommendations
      }

      return { success: true, summary }

    } catch (error) {
      console.error('Error generating executive summary:', error)
      return { success: false, error: 'Internal error generating executive summary' }
    }
  }

  // ==============================================
  // AUDIT TRAIL MANAGEMENT
  // ==============================================

  /**
   * Create audit trail entry for financial operations
   */
  async createAuditTrailEntry(
    entityType: 'invoice' | 'payment' | 'refund' | 'adjustment',
    entityId: string,
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'cancel',
    performedBy: string,
    previousValues?: Record<string, any>,
    newValues?: Record<string, any>,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auditEntry = {
        entity_type: entityType,
        entity_id: entityId,
        action,
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
        previous_values: previousValues,
        new_values: newValues,
        reason,
        ip_address: ipAddress,
        user_agent: userAgent,
        retention_period: 2555, // 7 years in days (Saudi compliance requirement)
        is_archived: false
      }

      const { error } = await supabase
        .from('financial_audit_trail')
        .insert(auditEntry)

      if (error) {
        throw error
      }

      return { success: true }

    } catch (error) {
      console.error('Error creating audit trail entry:', error)
      return { success: false, error: 'Failed to create audit trail entry' }
    }
  }

  // ==============================================
  // PRIVATE HELPER METHODS
  // ==============================================

  private validateVATCompliance(vatCompliance: VatCompliance, invoices: any[]): Array<{
    description: string
    descriptionAr: string
    severity: 'low' | 'medium' | 'high'
    resolution?: string
  }> {
    const issues: Array<{
      description: string
      descriptionAr: string
      severity: 'low' | 'medium' | 'high'
      resolution?: string
    }> = []

    // Check VAT rate consistency
    const invalidVATRates = invoices.filter(invoice => {
      const expectedVAT = Math.round(invoice.subtotal * 0.15 * 100) / 100
      const actualVAT = invoice.tax_amount
      return Math.abs(expectedVAT - actualVAT) > 0.01
    })

    if (invalidVATRates.length > 0) {
      issues.push({
        description: `${invalidVATRates.length} invoices have incorrect VAT calculations`,
        descriptionAr: `${invalidVATRates.length} فاتورة تحتوي على حسابات ضريبة قيمة مضافة غير صحيحة`,
        severity: 'high',
        resolution: 'Review and correct VAT calculations for flagged invoices'
      })
    }

    // Check for missing VAT registration numbers
    if (!vatCompliance.vatRegistrationNumber || vatCompliance.vatRegistrationNumber === 'VAT-REG-12345') {
      issues.push({
        description: 'VAT registration number is missing or using default value',
        descriptionAr: 'رقم التسجيل في ضريبة القيمة المضافة مفقود أو يستخدم القيمة الافتراضية',
        severity: 'high',
        resolution: 'Update VAT registration number in billing settings'
      })
    }

    return issues
  }

  private async cacheFinancialReport(
    reportType: string,
    dateStart: string,
    dateEnd: string,
    reportData: any
  ) {
    const cacheEntry = {
      report_type: reportType,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      parameters: {},
      report_data: reportData,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }

    await supabase.from('financial_reports_cache').insert(cacheEntry)
  }

  private formatExportData(data: any, format: string) {
    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(data, null, 2),
          mimeType: 'application/json'
        }
      case 'csv':
        return {
          data: this.convertToCSV(data),
          mimeType: 'text/csv'
        }
      case 'excel':
        return {
          data: JSON.stringify(data), // Would implement Excel formatting
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      case 'pdf':
        return {
          data: JSON.stringify(data), // Would implement PDF formatting
          mimeType: 'application/pdf'
        }
      default:
        return {
          data: JSON.stringify(data, null, 2),
          mimeType: 'application/json'
        }
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would enhance for complex structures
    if (Array.isArray(data)) {
      if (data.length === 0) return ''
      
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      ).join('\n')
      
      return `${headers}\n${rows}`
    }
    
    return JSON.stringify(data)
  }

  private async generateRevenueExport(dateRange: { start: string; end: string }, includeDetails: boolean) {
    // Implementation for revenue export
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('issue_date', dateRange.start)
      .lte('issue_date', dateRange.end)

    return {
      reportType: 'Revenue Export',
      dateRange,
      totalRevenue: invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0,
      invoices: includeDetails ? invoices : undefined,
      summary: {
        invoiceCount: invoices?.length || 0,
        averageInvoiceValue: invoices?.length ? (invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length) : 0
      }
    }
  }

  private async generatePaymentsExport(dateRange: { start: string; end: string }, includeDetails: boolean) {
    // Implementation for payments export
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', dateRange.start)
      .lte('payment_date', dateRange.end)

    return {
      reportType: 'Payments Export',
      dateRange,
      totalPayments: payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
      payments: includeDetails ? payments : undefined,
      summary: {
        paymentCount: payments?.length || 0,
        averagePaymentValue: payments?.length ? (payments.reduce((sum, payment) => sum + payment.amount, 0) / payments.length) : 0
      }
    }
  }

  private async generateComprehensiveExport(dateRange: { start: string; end: string }) {
    const [revenue, payments, vat, audit] = await Promise.all([
      this.generateRevenueExport(dateRange, true),
      this.generatePaymentsExport(dateRange, true),
      this.generateVATReport(dateRange.start, dateRange.end),
      this.generateAuditTrail(undefined, dateRange)
    ])

    return {
      reportType: 'Comprehensive Financial Export',
      dateRange,
      revenue,
      payments,
      vat: vat.report,
      audit: audit.auditTrail,
      generatedAt: new Date().toISOString()
    }
  }

  private async getInvoicesData(dateRange: { start: string; end: string }) {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .gte('issue_date', dateRange.start)
      .lte('issue_date', dateRange.end)
    return data || []
  }

  private async getPaymentsData(dateRange: { start: string; end: string }) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', dateRange.start)
      .lte('payment_date', dateRange.end)
    return data || []
  }

  private async getStudentsData(dateRange: { start: string; end: string }) {
    const { data } = await supabase
      .from('students')
      .select('id')
    return data || []
  }

  private calculateAveragePaymentTime(payments: any[]): number {
    // Mock calculation - would implement proper payment time analysis
    return 15.5
  }

  private assessFinancialRisks(
    collectionRate: number,
    outstandingAmount: number,
    averagePaymentTime: number,
    churnRate: number
  ) {
    const risks = []

    if (collectionRate < 85) {
      risks.push({
        category: 'Collection Risk',
        level: 'high' as const,
        description: 'Collection rate below target threshold',
        impact: 85,
        recommendation: 'Implement automated payment reminders and improve collection processes'
      })
    }

    if (outstandingAmount > 50000) {
      risks.push({
        category: 'Cash Flow Risk',
        level: 'medium' as const,
        description: 'High outstanding balance affecting cash flow',
        impact: 65,
        recommendation: 'Focus on collecting overdue payments and implement payment plans'
      })
    }

    if (averagePaymentTime > 30) {
      risks.push({
        category: 'Payment Delay Risk',
        level: 'medium' as const,
        description: 'Payments taking longer than expected',
        impact: 45,
        recommendation: 'Review payment terms and offer early payment incentives'
      })
    }

    return risks
  }

  private generateFinancialRecommendations(
    collectionRate: number,
    averagePaymentTime: number,
    serviceUtilization: number,
    riskFactors: any[]
  ) {
    const recommendations = []

    if (collectionRate < 90) {
      recommendations.push({
        priority: 'high' as const,
        category: 'collections' as const,
        title: 'Improve Collection Process',
        description: 'Implement automated payment reminders and follow-up procedures to improve collection rates',
        expectedImpact: '+5-8% collection rate improvement'
      })
    }

    if (averagePaymentTime > 25) {
      recommendations.push({
        priority: 'medium' as const,
        category: 'efficiency' as const,
        title: 'Optimize Payment Terms',
        description: 'Review and adjust payment terms, consider early payment discounts',
        expectedImpact: '-3-5 days average payment time'
      })
    }

    if (serviceUtilization < 80) {
      recommendations.push({
        priority: 'high' as const,
        category: 'revenue' as const,
        title: 'Increase Service Utilization',
        description: 'Optimize scheduling and capacity management to increase service delivery',
        expectedImpact: '+10-15% revenue increase'
      })
    }

    return recommendations
  }
}

// Export singleton instance
export const financialReportingService = new FinancialReportingService()