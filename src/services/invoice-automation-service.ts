// Invoice Automation Service for Story 2.3: Financial Management
// Handles automated invoice generation based on service delivery and IEP goals

import { supabase } from '../lib/supabase'
import { billingService } from './billing-service'
import type { 
  InvoiceGenerationRule,
  DiscountRule,
  ServiceDeliveryRecord,
  AutomatedInvoiceGeneration,
  ServiceType
} from '../types/financial-management'
import type { Invoice, BillingItem } from './billing-service'

interface InvoiceGenerationContext {
  ruleId: string
  triggerType: string
  triggerData: Record<string, any>
  serviceRecords: ServiceDeliveryRecord[]
  studentId: string
  parentId: string
}

interface ServiceRateConfiguration {
  serviceType: ServiceType
  standardRate: number
  groupRate?: number
  homeVisitRate?: number
  assessmentRate?: number
  insuranceCovered: boolean
  effectiveDate: string
  expiryDate?: string
}

class InvoiceAutomationService {
  private readonly VAT_RATE = 0.15 // 15% VAT for Saudi Arabia

  /**
   * Process automated invoice generation based on service delivery
   */
  async processServiceDeliveryTrigger(
    serviceRecords: ServiceDeliveryRecord[],
    studentId: string
  ): Promise<AutomatedInvoiceGeneration[]> {
    try {
      // Get applicable generation rules for this student/service type
      const rules = await this.getApplicableRules(studentId, serviceRecords)
      
      const generationResults: AutomatedInvoiceGeneration[] = []

      for (const rule of rules) {
        if (!rule.isActive) continue

        // Check if rule conditions are met
        const matchingRecords = this.filterRecordsForRule(serviceRecords, rule)
        
        if (matchingRecords.length === 0) continue

        // Create automated generation record
        const generation = await this.createAutomatedGeneration({
          ruleId: rule.id,
          triggerType: 'service_delivery',
          triggerData: {
            serviceRecords: matchingRecords.map(r => r.id),
            totalAmount: matchingRecords.reduce((sum, r) => sum + r.totalAmount, 0)
          },
          serviceRecords: matchingRecords,
          studentId,
          parentId: await this.getParentIdForStudent(studentId)
        })

        generationResults.push(generation)
      }

      return generationResults
    } catch (error) {
      console.error('Error processing service delivery trigger:', error)
      throw error
    }
  }

  /**
   * Generate invoice from automation generation
   */
  async generateInvoiceFromAutomation(
    generationId: string
  ): Promise<{ invoice: Invoice; generation: AutomatedInvoiceGeneration }> {
    try {
      // Get generation record
      const { data: generation, error } = await supabase
        .from('automated_invoice_generation')
        .select('*, invoice_generation_rules(*)')
        .eq('id', generationId)
        .single()

      if (error || !generation) {
        throw new Error('Automated generation not found')
      }

      // Check if already processed
      if (generation.invoiceId) {
        const existingInvoice = await this.getInvoiceById(generation.invoiceId)
        return { invoice: existingInvoice, generation }
      }

      const rule = generation.invoice_generation_rules

      // Create billing items from service records
      const billingItems = await this.createBillingItemsFromRecords(
        generation.serviceRecords,
        rule.invoiceConfig?.customRates,
        rule.invoiceConfig?.discountRules
      )

      // Create invoice
      const invoice = await billingService.createInvoice(
        generation.studentId,
        generation.parentId,
        billingItems,
        rule.invoiceConfig?.defaultInsuranceProvider,
        rule.invoiceConfig?.insuranceCoverage || 0,
        rule.invoiceConfig?.paymentTerms || 30
      )

      // Update generation record
      await supabase
        .from('automated_invoice_generation')
        .update({
          invoiceId: invoice.id,
          invoiceStatus: 'generated',
          processedAt: new Date().toISOString()
        })
        .eq('id', generationId)

      // Handle post-generation actions
      await this.handlePostGenerationActions(invoice, rule)

      return { 
        invoice, 
        generation: { ...generation, invoiceId: invoice.id, invoiceStatus: 'generated' }
      }
    } catch (error) {
      // Mark generation as failed
      await supabase
        .from('automated_invoice_generation')
        .update({
          invoiceStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Invoice generation failed'
        })
        .eq('id', generationId)

      throw error
    }
  }

  /**
   * Create invoice generation rule
   */
  async createGenerationRule(rule: Omit<InvoiceGenerationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceGenerationRule> {
    try {
      const { data, error } = await supabase
        .from('invoice_generation_rules')
        .insert({
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating generation rule:', error)
      throw error
    }
  }

  /**
   * Update invoice generation rule
   */
  async updateGenerationRule(
    ruleId: string,
    updates: Partial<InvoiceGenerationRule>
  ): Promise<InvoiceGenerationRule> {
    try {
      const { data, error } = await supabase
        .from('invoice_generation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating generation rule:', error)
      throw error
    }
  }

  /**
   * Get generation rules for student
   */
  async getGenerationRulesForStudent(studentId: string): Promise<InvoiceGenerationRule[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_generation_rules')
        .select('*')
        .eq('is_active', true)
        .or(`trigger_conditions->studentIds.cs.{${studentId}},trigger_conditions->studentIds.is.null`)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting generation rules:', error)
      return []
    }
  }

  /**
   * Process IEP goal completion trigger
   */
  async processGoalCompletionTrigger(
    goalId: string,
    studentId: string,
    completionPercentage: number
  ): Promise<AutomatedInvoiceGeneration[]> {
    try {
      // Get rules that trigger on goal completion
      const { data: rules, error } = await supabase
        .from('invoice_generation_rules')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', 'goal_achievement')
        .contains('trigger_conditions->goalIds', [goalId])

      if (error || !rules) return []

      const generationResults: AutomatedInvoiceGeneration[] = []

      for (const rule of rules) {
        // Check completion threshold
        const minCompletion = rule.triggerConditions?.minCompletionPercentage || 80
        if (completionPercentage < minCompletion) continue

        // Get related service records for this goal
        const serviceRecords = await this.getServiceRecordsForGoal(goalId, studentId)
        
        if (serviceRecords.length === 0) continue

        const generation = await this.createAutomatedGeneration({
          ruleId: rule.id,
          triggerType: 'goal_achievement',
          triggerData: {
            goalId,
            completionPercentage,
            serviceRecords: serviceRecords.map(r => r.id)
          },
          serviceRecords,
          studentId,
          parentId: await this.getParentIdForStudent(studentId)
        })

        generationResults.push(generation)
      }

      return generationResults
    } catch (error) {
      console.error('Error processing goal completion trigger:', error)
      throw error
    }
  }

  /**
   * Process time-based billing cycles
   */
  async processTimeBasisedTriggers(): Promise<AutomatedInvoiceGeneration[]> {
    try {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const dayOfMonth = today.getDate()

      // Get time-based rules that should trigger today
      const { data: rules, error } = await supabase
        .from('invoice_generation_rules')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', 'time_based')
        .or(
          `trigger_conditions->dayOfWeek.eq.${dayOfWeek},trigger_conditions->dayOfMonth.eq.${dayOfMonth}`
        )

      if (error || !rules) return []

      const generationResults: AutomatedInvoiceGeneration[] = []

      for (const rule of rules) {
        // Get students and service records for this rule
        const students = rule.triggerConditions?.studentIds || 
                         await this.getAllActiveStudents()

        for (const studentId of students) {
          const serviceRecords = await this.getUnbilledServiceRecords(
            studentId,
            rule.triggerConditions?.serviceTypes
          )

          if (serviceRecords.length === 0) continue

          const generation = await this.createAutomatedGeneration({
            ruleId: rule.id,
            triggerType: 'time_based',
            triggerData: {
              frequency: rule.triggerConditions?.frequency,
              cycleDate: today.toISOString(),
              serviceRecords: serviceRecords.map(r => r.id)
            },
            serviceRecords,
            studentId,
            parentId: await this.getParentIdForStudent(studentId)
          })

          generationResults.push(generation)
        }
      }

      return generationResults
    } catch (error) {
      console.error('Error processing time-based triggers:', error)
      throw error
    }
  }

  /**
   * Apply discount rules to billing items
   */
  private async applyDiscountRules(
    billingItems: BillingItem[],
    discountRules: DiscountRule[]
  ): Promise<BillingItem[]> {
    if (!discountRules || discountRules.length === 0) return billingItems

    const discountedItems = [...billingItems]
    
    for (const rule of discountRules) {
      if (!rule.isActive) continue

      // Check rule conditions
      const applicableItems = discountedItems.filter(item => 
        this.isDiscountRuleApplicable(item, rule)
      )

      if (applicableItems.length === 0) continue

      // Apply discount
      const totalAmount = applicableItems.reduce((sum, item) => sum + item.subtotal, 0)
      
      let discountAmount = 0
      switch (rule.discountType) {
        case 'percentage':
          discountAmount = totalAmount * (rule.discountValue / 100)
          break
        case 'fixed':
          discountAmount = Math.min(rule.discountValue, totalAmount)
          break
        case 'bulk':
          if (applicableItems.length >= (rule.conditions?.minSessions || 1)) {
            discountAmount = totalAmount * (rule.discountValue / 100)
          }
          break
      }

      // Apply maximum discount limit
      if (rule.maxDiscount && discountAmount > rule.maxDiscount) {
        discountAmount = rule.maxDiscount
      }

      // Distribute discount proportionally across applicable items
      if (discountAmount > 0) {
        const discountPercentage = discountAmount / totalAmount
        
        applicableItems.forEach(item => {
          const itemDiscount = item.subtotal * discountPercentage
          item.discountAmount = (item.discountAmount || 0) + itemDiscount
          
          // Recalculate totals
          const discountedSubtotal = item.subtotal - (item.discountAmount || 0)
          item.taxAmount = discountedSubtotal * this.VAT_RATE
          item.totalAmount = discountedSubtotal + item.taxAmount
        })
      }
    }

    return discountedItems
  }

  /**
   * Get applicable rules for service records
   */
  private async getApplicableRules(
    studentId: string,
    serviceRecords: ServiceDeliveryRecord[]
  ): Promise<InvoiceGenerationRule[]> {
    const serviceTypes = [...new Set(serviceRecords.map(r => r.serviceType))]
    const therapistIds = [...new Set(serviceRecords.map(r => r.therapistId))]

    const { data: rules, error } = await supabase
      .from('invoice_generation_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'session_completion')
      .or(
        `trigger_conditions->studentIds.cs.{${studentId}},trigger_conditions->studentIds.is.null`
      )

    if (error) return []
    
    return (rules || []).filter(rule => {
      const conditions = rule.triggerConditions || {}
      
      // Check service type conditions
      if (conditions.serviceTypes && conditions.serviceTypes.length > 0) {
        const hasMatchingService = serviceTypes.some(type => 
          conditions.serviceTypes.includes(type)
        )
        if (!hasMatchingService) return false
      }

      // Check therapist conditions
      if (conditions.therapistIds && conditions.therapistIds.length > 0) {
        const hasMatchingTherapist = therapistIds.some(id => 
          conditions.therapistIds.includes(id)
        )
        if (!hasMatchingTherapist) return false
      }

      // Check minimum session count
      if (conditions.minSessionCount && serviceRecords.length < conditions.minSessionCount) {
        return false
      }

      // Check minimum amount
      if (conditions.minAmount) {
        const totalAmount = serviceRecords.reduce((sum, r) => sum + r.totalAmount, 0)
        if (totalAmount < conditions.minAmount) return false
      }

      return true
    })
  }

  /**
   * Filter service records based on rule conditions
   */
  private filterRecordsForRule(
    serviceRecords: ServiceDeliveryRecord[],
    rule: InvoiceGenerationRule
  ): ServiceDeliveryRecord[] {
    const conditions = rule.triggerConditions || {}
    
    return serviceRecords.filter(record => {
      // Check service type
      if (conditions.serviceTypes && conditions.serviceTypes.length > 0) {
        if (!conditions.serviceTypes.includes(record.serviceType)) return false
      }

      // Check therapist
      if (conditions.therapistIds && conditions.therapistIds.length > 0) {
        if (!conditions.therapistIds.includes(record.therapistId)) return false
      }

      // Check completion status
      if (record.status !== 'completed') return false

      // Check completion percentage
      if (record.completionPercentage < 80) return false // Default threshold

      return true
    })
  }

  /**
   * Create billing items from service records
   */
  private async createBillingItemsFromRecords(
    serviceRecords: ServiceDeliveryRecord[],
    customRates?: Record<ServiceType, number>,
    discountRules?: DiscountRule[]
  ): Promise<BillingItem[]> {
    let billingItems: BillingItem[] = []

    for (const record of serviceRecords) {
      const unitRate = customRates?.[record.serviceType] || record.unitRate
      const billableUnits = record.billableUnits
      const subtotal = unitRate * billableUnits
      const taxAmount = subtotal * this.VAT_RATE
      const totalAmount = subtotal + taxAmount

      const billingItem: BillingItem = {
        id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: record.sessionId,
        studentId: record.studentId,
        serviceType: record.serviceType,
        quantity: billableUnits,
        unitPrice: unitRate,
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
        date: record.startTime.split('T')[0], // Extract date part
        therapistId: record.therapistId,
        notes: record.notes
      }

      billingItems.push(billingItem)
    }

    // Apply discount rules if provided
    if (discountRules && discountRules.length > 0) {
      billingItems = await this.applyDiscountRules(billingItems, discountRules)
    }

    return billingItems
  }

  /**
   * Create automated generation record
   */
  private async createAutomatedGeneration(
    context: InvoiceGenerationContext
  ): Promise<AutomatedInvoiceGeneration> {
    const totalAmount = context.serviceRecords.reduce((sum, r) => sum + r.totalAmount, 0)
    
    const generation: Omit<AutomatedInvoiceGeneration, 'id'> = {
      ruleId: context.ruleId,
      triggerType: context.triggerType,
      triggerData: context.triggerData,
      triggeredAt: new Date().toISOString(),
      
      serviceRecords: context.serviceRecords,
      totalAmount,
      itemCount: context.serviceRecords.length,
      
      invoiceStatus: 'pending',
      requiresApproval: await this.doesRuleRequireApproval(context.ruleId),
      
      createdAt: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('automated_invoice_generation')
      .insert(generation)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Handle post-generation actions
   */
  private async handlePostGenerationActions(
    invoice: Invoice,
    rule: InvoiceGenerationRule
  ): Promise<void> {
    const config = rule.invoiceConfig

    // Auto-send invoice
    if (config?.autoSend) {
      // Integration with notification service would go here
      console.log(`Auto-sending invoice ${invoice.invoiceNumber}`)
    }

    // Create payment plan if configured
    if (config?.createPaymentPlan && invoice.totalAmount > 1000) {
      await billingService.createPaymentPlan(
        invoice.id,
        invoice.studentId,
        invoice.totalAmount,
        3, // 3 installments
        'monthly',
        new Date().toISOString()
      )
    }

    // Send notifications
    if (config?.notifyTherapist || config?.notifyBilling || config?.sendToParent) {
      await this.sendGenerationNotifications(invoice, config)
    }
  }

  /**
   * Helper methods
   */
  private async getParentIdForStudent(studentId: string): Promise<string> {
    const { data, error } = await supabase
      .from('students')
      .select('parent_id')
      .eq('id', studentId)
      .single()

    if (error || !data) throw new Error('Parent not found for student')
    return data.parent_id
  }

  private async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error || !data) throw new Error('Invoice not found')
    return data
  }

  private async doesRuleRequireApproval(ruleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('invoice_generation_rules')
      .select('trigger_conditions')
      .eq('id', ruleId)
      .single()

    if (error || !data) return false
    return data.trigger_conditions?.requiresApproval || false
  }

  private async getServiceRecordsForGoal(goalId: string, studentId: string): Promise<ServiceDeliveryRecord[]> {
    // This would query the service delivery records that are linked to a specific IEP goal
    // Implementation would depend on the actual data structure
    return []
  }

  private async getAllActiveStudents(): Promise<string[]> {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('is_active', true)

    if (error) return []
    return (data || []).map(s => s.id)
  }

  private async getUnbilledServiceRecords(
    studentId: string,
    serviceTypes?: ServiceType[]
  ): Promise<ServiceDeliveryRecord[]> {
    // This would query service records that haven't been billed yet
    // Implementation would depend on how billing status is tracked
    return []
  }

  private isDiscountRuleApplicable(item: BillingItem, rule: DiscountRule): boolean {
    const conditions = rule.conditions || {}

    // Check service type
    if (conditions.serviceTypes && conditions.serviceTypes.length > 0) {
      if (!conditions.serviceTypes.includes(item.serviceType)) return false
    }

    // Check minimum amount
    if (conditions.minAmount && item.subtotal < conditions.minAmount) return false

    // Check date range
    if (conditions.dateRange) {
      const itemDate = new Date(item.date)
      const startDate = new Date(conditions.dateRange.start)
      const endDate = new Date(conditions.dateRange.end)
      
      if (itemDate < startDate || itemDate > endDate) return false
    }

    return true
  }

  private async sendGenerationNotifications(
    invoice: Invoice,
    config: any
  ): Promise<void> {
    // Integration with notification service
    // This would send emails, SMS, or WhatsApp messages based on configuration
    console.log(`Sending notifications for invoice ${invoice.invoiceNumber}`)
  }

  /**
   * Get automation statistics
   */
  async getAutomationStatistics(startDate: string, endDate: string): Promise<{
    totalGenerations: number
    successfulGenerations: number
    failedGenerations: number
    totalAmount: number
    averageProcessingTime: number
    topRules: Array<{ ruleId: string; ruleName: string; count: number }>
  }> {
    try {
      const { data, error } = await supabase
        .from('automated_invoice_generation')
        .select('*, invoice_generation_rules(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) throw error

      const generations = data || []
      const successful = generations.filter(g => g.invoiceStatus === 'generated')
      const failed = generations.filter(g => g.invoiceStatus === 'failed')

      // Calculate rule usage
      const ruleCounts = new Map<string, { name: string; count: number }>()
      generations.forEach(g => {
        const existing = ruleCounts.get(g.ruleId) || { name: g.invoice_generation_rules?.name || 'Unknown', count: 0 }
        ruleCounts.set(g.ruleId, { ...existing, count: existing.count + 1 })
      })

      const topRules = Array.from(ruleCounts.entries())
        .map(([ruleId, data]) => ({ ruleId, ruleName: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return {
        totalGenerations: generations.length,
        successfulGenerations: successful.length,
        failedGenerations: failed.length,
        totalAmount: successful.reduce((sum, g) => sum + g.totalAmount, 0),
        averageProcessingTime: this.calculateAverageProcessingTime(successful),
        topRules
      }
    } catch (error) {
      console.error('Error getting automation statistics:', error)
      return {
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        totalAmount: 0,
        averageProcessingTime: 0,
        topRules: []
      }
    }
  }

  private calculateAverageProcessingTime(generations: any[]): number {
    if (generations.length === 0) return 0

    const times = generations
      .filter(g => g.processedAt && g.triggeredAt)
      .map(g => new Date(g.processedAt).getTime() - new Date(g.triggeredAt).getTime())

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length / 1000 : 0
  }
}

// Export singleton instance
export const invoiceAutomationService = new InvoiceAutomationService()
export { InvoiceAutomationService }