/**
 * Enhanced Audit Service
 * Provides comprehensive audit trail functionality and compliance reporting
 * Story 1.2: Task 3 - Audit service implementation
 */

import { supabase } from '@/lib/supabase'

export interface AuditEvent {
  table_name: string
  operation: string
  record_id: string
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  user_id?: string
  user_role?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  device_fingerprint?: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  event_category?: 'data_change' | 'authentication' | 'authorization' | 'security_violation' | 'system_access' | 'medical_access' | 'emergency_access' | 'encryption' | 'backup'
  compliance_tags?: string[]
  additional_metadata?: Record<string, any>
}

export interface AuthenticationEvent {
  event_type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_TIMEOUT' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED' | 'MULTIPLE_FAILED_ATTEMPTS' | 'SUSPICIOUS_LOGIN'
  event_details: Record<string, any>
  user_identifier?: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
}

export interface SecurityEvent {
  violation_type: string
  event_details: Record<string, any>
}

export interface ComplianceReportParams {
  start_date?: string
  end_date?: string
  compliance_framework?: string
}

/**
 * Enhanced Audit Service for comprehensive security logging
 */
export class AuditService {
  
  /**
   * Log authentication events with enhanced security tracking
   */
  async logAuthenticationEvent(event: AuthenticationEvent): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_authentication_event', {
        event_type: event.event_type,
        event_details: event.event_details,
        user_identifier: event.user_identifier,
        risk_level: event.risk_level || 'medium'
      })
      
      if (error) {
        throw new Error(`Authentication logging failed: ${error.message}`)
      }
      
      return data // Returns the log ID
    } catch (error) {
      console.error('Authentication event logging error:', error)
      throw new Error('Failed to log authentication event')
    }
  }
  
  /**
   * Log security violations and suspicious activities
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_security_event', {
        violation_type: event.violation_type,
        event_details: event.event_details
      })
      
      if (error) {
        throw new Error(`Security event logging failed: ${error.message}`)
      }
      
      return data // Returns the log ID
    } catch (error) {
      console.error('Security event logging error:', error)
      throw new Error('Failed to log security event')
    }
  }
  
  /**
   * Log successful login with device fingerprinting
   */
  async logSuccessfulLogin(userId: string, deviceFingerprint?: string): Promise<void> {
    await this.logAuthenticationEvent({
      event_type: 'LOGIN_SUCCESS',
      event_details: {
        success: true,
        method: 'password',
        device_fingerprint: deviceFingerprint,
        timestamp: new Date().toISOString()
      },
      user_identifier: userId,
      risk_level: 'low'
    })
  }
  
  /**
   * Log failed login attempt with enhanced tracking
   */
  async logFailedLogin(userIdentifier: string, failureReason: string, attemptCount: number = 1): Promise<void> {
    const riskLevel = attemptCount >= 3 ? 'high' : attemptCount >= 2 ? 'medium' : 'low'
    
    await this.logAuthenticationEvent({
      event_type: attemptCount >= 3 ? 'MULTIPLE_FAILED_ATTEMPTS' : 'LOGIN_FAILED',
      event_details: {
        success: false,
        failure_reason: failureReason,
        attempt_count: attemptCount,
        timestamp: new Date().toISOString()
      },
      user_identifier: userIdentifier,
      risk_level: riskLevel
    })
  }
  
  /**
   * Log suspicious login activity
   */
  async logSuspiciousLogin(userId: string, suspiciousFactors: string[]): Promise<void> {
    await this.logAuthenticationEvent({
      event_type: 'SUSPICIOUS_LOGIN',
      event_details: {
        suspicious_factors: suspiciousFactors,
        requires_review: true,
        timestamp: new Date().toISOString()
      },
      user_identifier: userId,
      risk_level: 'high'
    })
    
    // Also log as security event
    await this.logSecurityEvent({
      violation_type: 'SUSPICIOUS_LOGIN_PATTERN',
      event_details: {
        user_id: userId,
        suspicious_factors: suspiciousFactors,
        auto_detected: true
      }
    })
  }
  
  /**
   * Log logout event
   */
  async logLogout(userId: string, logoutType: 'manual' | 'timeout' | 'forced' = 'manual'): Promise<void> {
    await this.logAuthenticationEvent({
      event_type: logoutType === 'timeout' ? 'SESSION_TIMEOUT' : 'LOGOUT',
      event_details: {
        logout_type: logoutType,
        timestamp: new Date().toISOString()
      },
      user_identifier: userId,
      risk_level: 'low'
    })
  }
  
  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(resource: string, userId?: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      violation_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      event_details: {
        resource,
        user_id: userId,
        details: details || {},
        timestamp: new Date().toISOString()
      }
    })
  }
  
  /**
   * Log medical data access for HIPAA compliance
   */
  async logMedicalDataAccess(
    tableAccessed: string, 
    recordId: string, 
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    dataClassification: 'public' | 'internal' | 'confidential' | 'highly_sensitive' = 'highly_sensitive'
  ): Promise<void> {
    try {
      // This will be automatically logged by the database trigger
      // But we can add additional application-level logging here
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await this.logSecurityEvent({
          violation_type: 'MEDICAL_DATA_ACCESS',
          event_details: {
            table_accessed: tableAccessed,
            record_id: recordId,
            operation,
            data_classification: dataClassification,
            user_id: user.id,
            compliance_required: ['HIPAA', 'PDPL'],
            timestamp: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Medical data access logging error:', error)
      // Don't throw to avoid disrupting normal operations
    }
  }
  
  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: ComplianceReportParams = {}) {
    try {
      const { data, error } = await supabase.rpc('generate_compliance_report', {
        start_date: params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: params.end_date || new Date().toISOString().split('T')[0],
        compliance_framework: params.compliance_framework || 'HIPAA'
      })
      
      if (error) {
        throw new Error(`Compliance report generation failed: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Compliance report generation error:', error)
      throw new Error('Failed to generate compliance report')
    }
  }
  
  /**
   * Apply audit retention policies
   */
  async applyRetentionPolicies(): Promise<{ success: boolean; records_archived: number; records_deleted: number }> {
    try {
      const { data, error } = await supabase.rpc('apply_audit_retention_policies')
      
      if (error) {
        throw new Error(`Retention policy application failed: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Retention policy application error:', error)
      throw new Error('Failed to apply retention policies')
    }
  }
  
  /**
   * Create audit archive
   */
  async createAuditArchive(archiveName?: string): Promise<{ archive_id: string; records_count: number }> {
    try {
      const { data, error } = await supabase.rpc('create_audit_archive', {
        archive_name: archiveName
      })
      
      if (error) {
        throw new Error(`Archive creation failed: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Archive creation error:', error)
      throw new Error('Failed to create audit archive')
    }
  }
  
  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs({
    startDate,
    endDate,
    eventCategory,
    riskLevel,
    userId,
    limit = 100,
    offset = 0
  }: {
    startDate?: string
    endDate?: string
    eventCategory?: string
    riskLevel?: string
    userId?: string
    limit?: number
    offset?: number
  } = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          table_name,
          operation,
          user_id,
          user_role,
          timestamp,
          ip_address,
          risk_level,
          event_category,
          compliance_tags,
          additional_metadata
        `)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (startDate) {
        query = query.gte('timestamp', startDate)
      }

      if (endDate) {
        query = query.lte('timestamp', endDate)
      }

      if (eventCategory) {
        query = query.eq('event_category', eventCategory)
      }

      if (riskLevel) {
        query = query.eq('risk_level', riskLevel)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Audit log retrieval failed: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Audit log retrieval error:', error)
      throw new Error('Failed to retrieve audit logs')
    }
  }
  
  /**
   * Get security violations summary
   */
  async getSecurityViolationsSummary(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('risk_level, event_category, timestamp')
        .eq('event_category', 'security_violation')
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: false })

      if (error) {
        throw new Error(`Security violations summary failed: ${error.message}`)
      }

      // Group by risk level
      const summary = (data || []).reduce((acc, log) => {
        acc[log.risk_level] = (acc[log.risk_level] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        total: data?.length || 0,
        by_risk_level: summary,
        period_days: days
      }
    } catch (error) {
      console.error('Security violations summary error:', error)
      throw new Error('Failed to get security violations summary')
    }
  }
  
  /**
   * Set session information for enhanced audit logging
   */
  setSessionInfo(sessionId: string, deviceFingerprint?: string) {
    // This would typically be set at the database connection level
    // For now, we'll store it locally and use it in subsequent calls
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('audit_session_info', JSON.stringify({
        session_id: sessionId,
        device_fingerprint: deviceFingerprint || 'unknown',
        timestamp: new Date().toISOString()
      }))
    }
  }
  
  /**
   * Clear session information
   */
  clearSessionInfo() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('audit_session_info')
    }
  }
}

// Export singleton instance
export const auditService = new AuditService()

export default auditService