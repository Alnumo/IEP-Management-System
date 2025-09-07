/**
 * Communication Compliance Service
 * Healthcare compliance features for communication system
 * Arkan Al-Numo Center - PDPL and Medical Privacy Compliance
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import { messageEncryptionService, messageEncryptionUtils } from './message-encryption-service'
import type { Message, Conversation, VoiceCall } from '@/types/communication'

// =====================================================
// COMPLIANCE INTERFACES
// =====================================================

export interface ComplianceRule {
  id: string
  rule_type: 'data_retention' | 'access_control' | 'audit_trail' | 'encryption' | 'export_restriction'
  rule_name: string
  description_ar: string
  description_en: string
  is_active: boolean
  enforcement_level: 'warning' | 'block' | 'audit'
  applies_to: ('messages' | 'calls' | 'files' | 'conversations')[]
  rule_parameters: any
  created_at: string
  updated_at: string
}

export interface ComplianceViolation {
  id: string
  rule_id: string
  resource_type: 'message' | 'call' | 'file' | 'conversation'
  resource_id: string
  violation_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description_ar: string
  description_en: string
  user_id: string
  detected_at: string
  resolved_at?: string
  resolution_action?: string
  metadata: any
}

export interface AuditTrailEntry {
  id: string
  action_type: string
  resource_type: string
  resource_id: string
  user_id: string
  user_role: string
  details: any
  ip_address?: string
  user_agent?: string
  timestamp: string
  session_id?: string
  compliance_flags: string[]
}

export interface DataRetentionPolicy {
  id: string
  resource_type: string
  retention_period_days: number
  deletion_method: 'soft_delete' | 'hard_delete' | 'encrypt_in_place'
  exceptions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ComplianceReport {
  report_id: string
  report_type: 'audit_summary' | 'violation_report' | 'retention_status' | 'encryption_status'
  generated_at: string
  period_start: string
  period_end: string
  data: any
  format: 'json' | 'pdf' | 'csv'
}

// =====================================================
// COMMUNICATION COMPLIANCE SERVICE
// =====================================================

export class CommunicationComplianceService {
  private readonly AUDIT_RETENTION_DAYS = 2555 // 7 years as per PDPL
  private readonly DEFAULT_MESSAGE_RETENTION_DAYS = 1095 // 3 years
  private readonly CRITICAL_VIOLATION_THRESHOLD = 5

  /**
   * Initialize compliance monitoring for a conversation
   */
  async initializeConversationCompliance(conversationId: string): Promise<boolean> {
    try {
      // Enable encryption if required
      const encryptionEnabled = await messageEncryptionUtils.enableConversationEncryption(conversationId)
      
      // Create initial audit entry
      await this.logAuditTrail({
        action_type: 'conversation_created',
        resource_type: 'conversation',
        resource_id: conversationId,
        user_id: (await supabase.auth.getUser()).data.user?.id || 'system',
        user_role: 'system',
        details: {
          encryption_enabled: encryptionEnabled,
          compliance_initialized: true,
          initialization_time: new Date().toISOString()
        },
        compliance_flags: ['encryption_required', 'audit_enabled']
      })

      return true
    } catch (error) {
      console.error('Compliance initialization error:', error)
      return false
    }
  }

  /**
   * Validate message before sending for compliance
   */
  async validateMessageCompliance(
    message: Pick<Message, 'content_ar' | 'content_en' | 'message_type' | 'priority_level'>,
    conversationId: string,
    senderId: string
  ): Promise<{
    isCompliant: boolean
    violations: ComplianceViolation[]
    warnings: string[]
    requiresEncryption: boolean
  }> {
    const violations: ComplianceViolation[] = []
    const warnings: string[] = []
    let requiresEncryption = false

    try {
      // Check for sensitive medical content
      const hasSensitiveContent = await this.detectSensitiveContent(
        message.content_ar + ' ' + message.content_en
      )

      if (hasSensitiveContent) {
        requiresEncryption = true
        warnings.push('Message contains sensitive medical information and will be encrypted')
      }

      // Check content length restrictions
      const totalLength = (message.content_ar?.length || 0) + (message.content_en?.length || 0)
      if (totalLength > 10000) {
        violations.push(await this.createViolation({
          rule_type: 'content_length',
          resource_type: 'message',
          resource_id: `temp-${Date.now()}`,
          violation_type: 'content_too_long',
          severity: 'medium',
          description_ar: 'محتوى الرسالة طويل جداً',
          description_en: 'Message content too long',
          user_id: senderId,
          metadata: { content_length: totalLength, max_allowed: 10000 }
        }))
      }

      // Check for prohibited content patterns
      const prohibitedPatterns = await this.checkProhibitedContent(message)
      violations.push(...prohibitedPatterns)

      // Check user permissions
      const hasPermissions = await this.validateUserPermissions(senderId, conversationId, 'send_message')
      if (!hasPermissions) {
        violations.push(await this.createViolation({
          rule_type: 'access_control',
          resource_type: 'message',
          resource_id: `temp-${Date.now()}`,
          violation_type: 'insufficient_permissions',
          severity: 'high',
          description_ar: 'المستخدم لا يملك صلاحية إرسال رسائل في هذه المحادثة',
          description_en: 'User does not have permission to send messages in this conversation',
          user_id: senderId,
          metadata: { conversation_id: conversationId }
        }))
      }

      return {
        isCompliant: violations.length === 0,
        violations,
        warnings,
        requiresEncryption
      }

    } catch (error) {
      console.error('Message compliance validation error:', error)
      return {
        isCompliant: false,
        violations: [await this.createViolation({
          rule_type: 'system_error',
          resource_type: 'message',
          resource_id: `error-${Date.now()}`,
          violation_type: 'compliance_check_failed',
          severity: 'critical',
          description_ar: 'فشل في فحص الامتثال للرسالة',
          description_en: 'Message compliance check failed',
          user_id: senderId,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        })],
        warnings: [],
        requiresEncryption: true
      }
    }
  }

  /**
   * Log audit trail entry
   */
  async logAuditTrail(entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      const auditEntry: Omit<AuditTrailEntry, 'id'> = {
        ...entry,
        timestamp: new Date().toISOString(),
        ip_address: await this.getCurrentIPAddress(),
        user_agent: navigator?.userAgent || 'Unknown'
      }

      const { data, error } = await supabase
        .from('communication_audit_trail')
        .insert([auditEntry])
        .select('id')
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Audit trail logging error:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'CommunicationComplianceService',
        action: 'log_audit_trail',
        entry
      })
      throw error
    }
  }

  /**
   * Create and log a compliance violation
   */
  private async createViolation(
    violation: Omit<ComplianceViolation, 'id' | 'detected_at'>
  ): Promise<ComplianceViolation> {
    try {
      const violationRecord: Omit<ComplianceViolation, 'id'> = {
        ...violation,
        detected_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('compliance_violations')
        .insert([violationRecord])
        .select()
        .single()

      if (error) throw error

      // Log audit trail for violation
      await this.logAuditTrail({
        action_type: 'compliance_violation_detected',
        resource_type: violation.resource_type,
        resource_id: violation.resource_id,
        user_id: violation.user_id,
        user_role: 'user',
        details: {
          violation_type: violation.violation_type,
          severity: violation.severity,
          metadata: violation.metadata
        },
        compliance_flags: ['violation', violation.severity]
      })

      // Send notification for critical violations
      if (violation.severity === 'critical') {
        await this.handleCriticalViolation(data)
      }

      return data
    } catch (error) {
      console.error('Violation creation error:', error)
      throw error
    }
  }

  /**
   * Detect sensitive medical content in messages
   */
  private async detectSensitiveContent(content: string): Promise<boolean> {
    const sensitiveKeywords = [
      // Arabic medical terms
      'تشخيص', 'علاج', 'دواء', 'مرض', 'أعراض', 'فحص طبي', 'تحليل', 'عملية جراحية',
      'حالة طبية', 'مريض', 'صحة', 'طبيب', 'مستشفى', 'عيادة', 'دم', 'ضغط', 'سكري',
      'قلب', 'رئة', 'كبد', 'كلى', 'مخ', 'عظام', 'مفاصل', 'جلد', 'عين', 'أذن',
      
      // English medical terms
      'diagnosis', 'treatment', 'medication', 'disease', 'symptoms', 'medical exam',
      'test results', 'surgery', 'medical condition', 'patient', 'health', 'doctor',
      'hospital', 'clinic', 'blood', 'pressure', 'diabetes', 'heart', 'lung',
      'liver', 'kidney', 'brain', 'bone', 'joint', 'skin', 'eye', 'ear',
      
      // Medical identifiers and sensitive data patterns
      'patient id', 'medical record', 'ssn', 'social security', 'insurance',
      'رقم المريض', 'ملف طبي', 'تأمين صحي', 'هوية'
    ]

    const lowercaseContent = content.toLowerCase()
    return sensitiveKeywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))
  }

  /**
   * Check for prohibited content patterns
   */
  private async checkProhibitedContent(
    message: Pick<Message, 'content_ar' | 'content_en' | 'message_type'>
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []
    const content = (message.content_ar || '') + ' ' + (message.content_en || '')

    // Check for inappropriate language
    const inappropriatePatterns = [
      // Add patterns as needed for your compliance requirements
    ]

    // Check for potential data breaches
    const dataBreachPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b\d{16}\b/, // Credit card pattern
      /password\s*:\s*\w+/i // Password exposure
    ]

    dataBreachPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        violations.push({
          id: '',
          rule_id: 'data-breach-' + index,
          resource_type: 'message',
          resource_id: 'temp',
          violation_type: 'potential_data_breach',
          severity: 'critical',
          description_ar: 'محتوى قد يحتوي على معلومات حساسة',
          description_en: 'Content may contain sensitive information',
          user_id: 'temp',
          detected_at: new Date().toISOString(),
          metadata: { pattern_matched: pattern.source }
        } as ComplianceViolation)
      }
    })

    return violations
  }

  /**
   * Validate user permissions for specific actions
   */
  private async validateUserPermissions(
    userId: string, 
    conversationId: string, 
    action: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_conversation_permissions', {
          user_id: userId,
          conversation_id: conversationId,
          required_action: action
        })

      if (error) throw error
      return data?.has_permission || false
    } catch (error) {
      console.error('Permission validation error:', error)
      return false
    }
  }

  /**
   * Handle critical compliance violations
   */
  private async handleCriticalViolation(violation: ComplianceViolation): Promise<void> {
    try {
      // Send immediate notification to compliance team
      await supabase.from('notifications').insert({
        recipient_id: 'compliance-team',
        type: 'compliance_violation',
        title: 'Critical Compliance Violation',
        message: `Critical violation detected: ${violation.violation_type}`,
        priority: 'urgent',
        data: { violation_id: violation.id }
      })

      // Create incident report
      await supabase.from('compliance_incidents').insert({
        violation_id: violation.id,
        severity: violation.severity,
        status: 'open',
        assigned_to: 'compliance-manager',
        created_at: new Date().toISOString()
      })

      // Log to error monitoring
      errorMonitoring.reportError(new Error('Critical compliance violation'), {
        component: 'CommunicationComplianceService',
        violation_id: violation.id,
        severity: violation.severity,
        type: violation.violation_type
      })

    } catch (error) {
      console.error('Critical violation handling error:', error)
    }
  }

  /**
   * Generate compliance reports
   */
  async generateComplianceReport(
    type: ComplianceReport['report_type'],
    startDate: Date,
    endDate: Date,
    format: 'json' | 'pdf' | 'csv' = 'json'
  ): Promise<ComplianceReport> {
    try {
      const reportData = await this.compileReportData(type, startDate, endDate)
      
      const report: ComplianceReport = {
        report_id: `report_${type}_${Date.now()}`,
        report_type: type,
        generated_at: new Date().toISOString(),
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        data: reportData,
        format
      }

      // Store report in database
      await supabase.from('compliance_reports').insert([report])

      // Log report generation
      await this.logAuditTrail({
        action_type: 'compliance_report_generated',
        resource_type: 'report',
        resource_id: report.report_id,
        user_id: (await supabase.auth.getUser()).data.user?.id || 'system',
        user_role: 'admin',
        details: {
          report_type: type,
          period_start: startDate.toISOString(),
          period_end: endDate.toISOString(),
          format
        },
        compliance_flags: ['report_generation']
      })

      return report
    } catch (error) {
      console.error('Report generation error:', error)
      throw error
    }
  }

  /**
   * Compile report data based on type
   */
  private async compileReportData(
    type: ComplianceReport['report_type'],
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    switch (type) {
      case 'audit_summary':
        return this.compileAuditSummary(startDate, endDate)
      case 'violation_report':
        return this.compileViolationReport(startDate, endDate)
      case 'retention_status':
        return this.compileRetentionStatus(startDate, endDate)
      case 'encryption_status':
        return this.compileEncryptionStatus(startDate, endDate)
      default:
        throw new Error(`Unsupported report type: ${type}`)
    }
  }

  /**
   * Compile audit summary data
   */
  private async compileAuditSummary(startDate: Date, endDate: Date): Promise<any> {
    const { data, error } = await supabase
      .from('communication_audit_trail')
      .select('action_type, resource_type, timestamp, user_role')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())

    if (error) throw error

    const summary = {
      total_actions: data.length,
      actions_by_type: this.groupBy(data, 'action_type'),
      actions_by_resource: this.groupBy(data, 'resource_type'),
      actions_by_role: this.groupBy(data, 'user_role'),
      daily_activity: this.groupByDate(data, 'timestamp')
    }

    return summary
  }

  /**
   * Compile violation report data
   */
  private async compileViolationReport(startDate: Date, endDate: Date): Promise<any> {
    const { data, error } = await supabase
      .from('compliance_violations')
      .select('*')
      .gte('detected_at', startDate.toISOString())
      .lte('detected_at', endDate.toISOString())

    if (error) throw error

    return {
      total_violations: data.length,
      violations_by_severity: this.groupBy(data, 'severity'),
      violations_by_type: this.groupBy(data, 'violation_type'),
      unresolved_violations: data.filter(v => !v.resolved_at).length,
      critical_violations: data.filter(v => v.severity === 'critical'),
      trends: this.calculateViolationTrends(data)
    }
  }

  /**
   * Apply data retention policies
   */
  async applyDataRetentionPolicies(): Promise<{
    processed: number
    deleted: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      deleted: 0,
      errors: [] as string[]
    }

    try {
      // Get active retention policies
      const { data: policies, error: policiesError } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('is_active', true)

      if (policiesError) throw policiesError

      for (const policy of policies) {
        try {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days)

          const { data: expiredRecords, error: selectError } = await supabase
            .from(this.getTableNameForResourceType(policy.resource_type))
            .select('id')
            .lt('created_at', cutoffDate.toISOString())

          if (selectError) throw selectError

          results.processed += expiredRecords.length

          if (policy.deletion_method === 'hard_delete') {
            const { error: deleteError } = await supabase
              .from(this.getTableNameForResourceType(policy.resource_type))
              .delete()
              .lt('created_at', cutoffDate.toISOString())

            if (deleteError) throw deleteError
            results.deleted += expiredRecords.length
          } else if (policy.deletion_method === 'soft_delete') {
            const { error: updateError } = await supabase
              .from(this.getTableNameForResourceType(policy.resource_type))
              .update({ deleted_at: new Date().toISOString() })
              .lt('created_at', cutoffDate.toISOString())
              .is('deleted_at', null)

            if (updateError) throw updateError
            results.deleted += expiredRecords.length
          }

          // Log retention action
          await this.logAuditTrail({
            action_type: 'data_retention_applied',
            resource_type: 'policy',
            resource_id: policy.id,
            user_id: 'system',
            user_role: 'system',
            details: {
              policy_type: policy.resource_type,
              cutoff_date: cutoffDate.toISOString(),
              records_affected: expiredRecords.length,
              deletion_method: policy.deletion_method
            },
            compliance_flags: ['data_retention', 'automated_cleanup']
          })

        } catch (error) {
          results.errors.push(`Policy ${policy.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

    } catch (error) {
      results.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return results
  }

  /**
   * Utility methods
   */
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const group = item[key] || 'unknown'
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {})
  }

  private groupByDate(array: any[], dateKey: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const date = new Date(item[dateKey]).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
  }

  private calculateViolationTrends(violations: any[]): any {
    // Simple trend calculation - could be enhanced
    const daily = this.groupByDate(violations, 'detected_at')
    const dates = Object.keys(daily).sort()
    
    return {
      daily_counts: daily,
      trend: dates.length > 1 ? 
        (daily[dates[dates.length - 1]] > daily[dates[0]] ? 'increasing' : 'decreasing') :
        'stable'
    }
  }

  private getTableNameForResourceType(resourceType: string): string {
    const mapping = {
      'messages': 'messages',
      'calls': 'voice_calls',
      'files': 'file_attachments',
      'conversations': 'conversations'
    }
    return mapping[resourceType as keyof typeof mapping] || resourceType
  }

  private async getCurrentIPAddress(): Promise<string> {
    try {
      // This would typically come from server-side
      return 'client-side-unknown'
    } catch {
      return 'unknown'
    }
  }

  private async compileRetentionStatus(startDate: Date, endDate: Date): Promise<any> {
    // Implementation for retention status compilation
    return { message: 'Retention status compilation not yet implemented' }
  }

  private async compileEncryptionStatus(startDate: Date, endDate: Date): Promise<any> {
    // Implementation for encryption status compilation
    return { message: 'Encryption status compilation not yet implemented' }
  }
}

// Export singleton instance
export const communicationComplianceService = new CommunicationComplianceService()

export default communicationComplianceService