import { supabase } from '../lib/supabase'

// Types for API security system
export interface RateLimitRule {
  id: string
  endpoint_pattern: string
  max_requests: number
  time_window_seconds: number
  user_role: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface SecurityEvent {
  id: string
  event_type: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_REQUEST' | 'INVALID_TOKEN' | 'CORS_VIOLATION' | 'SESSION_TIMEOUT'
  user_id: string | null
  ip_address: string
  user_agent: string
  endpoint: string
  request_details: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  blocked: boolean
  created_at: string
}

export interface SessionSecurityInfo {
  id: string
  user_id: string
  session_token: string
  ip_address: string
  user_agent: string
  last_activity_at: string
  expires_at: string
  is_active: boolean
  security_flags: Record<string, any>
  created_at: string
}

export interface RateLimitStatus {
  endpoint: string
  current_count: number
  max_requests: number
  reset_time: string
  is_limited: boolean
}

export interface SecurityHeaders {
  'Content-Security-Policy': string
  'X-Frame-Options': string
  'X-Content-Type-Options': string
  'Referrer-Policy': string
  'X-XSS-Protection': string
  'Strict-Transport-Security': string
}

export class APISecurityService {
  // Rate limiting management
  static async getRateLimitRules(): Promise<RateLimitRule[]> {
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('enabled', true)
      .order('endpoint_pattern')

    if (error) {
      console.error('Error fetching rate limit rules:', error)
      throw new Error('Failed to fetch rate limit rules')
    }

    return data || []
  }

  static async createRateLimitRule(rule: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at'>): Promise<RateLimitRule> {
    // Validate rule
    const validationErrors = this.validateRateLimitRule(rule)
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0])
    }

    const { data, error } = await supabase
      .from('api_rate_limits')
      .insert({
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rate limit rule:', error)
      throw new Error('Failed to create rate limit rule')
    }

    return data
  }

  static async updateRateLimitRule(id: string, updates: Partial<RateLimitRule>): Promise<RateLimitRule> {
    const { data, error } = await supabase
      .from('api_rate_limits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating rate limit rule:', error)
      throw new Error('Failed to update rate limit rule')
    }

    return data
  }

  static async checkRateLimit(endpoint: string, userId?: string): Promise<RateLimitStatus> {
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        endpoint_path: endpoint,
        user_id: userId || null
      })

    if (error) {
      console.error('Error checking rate limit:', error)
      throw new Error('Failed to check rate limit')
    }

    return data
  }

  static async recordRequest(endpoint: string, userId?: string, requestDetails?: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .rpc('record_api_request', {
        endpoint_path: endpoint,
        user_id: userId || null,
        request_metadata: requestDetails || {}
      })

    if (error) {
      console.error('Error recording API request:', error)
      // Don't throw here as this shouldn't block the actual request
    }
  }

  // Security event management
  static async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<SecurityEvent> {
    const { data, error } = await supabase
      .from('security_events')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging security event:', error)
      throw new Error('Failed to log security event')
    }

    return data
  }

  static async getSecurityEvents(
    limit: number = 50,
    severity?: SecurityEvent['severity'],
    eventType?: SecurityEvent['event_type']
  ): Promise<SecurityEvent[]> {
    let query = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching security events:', error)
      throw new Error('Failed to fetch security events')
    }

    return data || []
  }

  // Session security management
  static async getActiveSessions(userId?: string): Promise<SessionSecurityInfo[]> {
    let query = supabase
      .from('user_sessions')
      .select('*')
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching active sessions:', error)
      throw new Error('Failed to fetch active sessions')
    }

    return data || []
  }

  static async terminateSession(sessionId: string, reason: string = 'MANUAL'): Promise<void> {
    const { error } = await supabase
      .rpc('terminate_user_session', {
        session_id: sessionId,
        termination_reason: reason
      })

    if (error) {
      console.error('Error terminating session:', error)
      throw new Error('Failed to terminate session')
    }
  }

  static async validateSessionSecurity(sessionToken: string): Promise<{
    valid: boolean
    session?: SessionSecurityInfo
    issues: string[]
  }> {
    const { data, error } = await supabase
      .rpc('validate_session_security', { session_token: sessionToken })

    if (error) {
      console.error('Error validating session security:', error)
      throw new Error('Failed to validate session security')
    }

    return data
  }

  static async updateSessionActivity(sessionId: string, metadata?: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        security_flags: metadata || {}
      })
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating session activity:', error)
      // Don't throw as this is background activity
    }
  }

  // Security headers management
  static getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  }

  static async applyCORSPolicy(origin: string): Promise<boolean> {
    const allowedOrigins = [
      'https://therapy-plans-manager.netlify.app',
      'https://arkan-therapy.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ]

    return allowedOrigins.includes(origin) || origin.endsWith('.arkan-therapy.com')
  }

  // Security monitoring
  static async getSecurityDashboard(): Promise<{
    rate_limit_violations_24h: number
    active_sessions_count: number
    security_events_by_severity: Record<string, number>
    blocked_requests_24h: number
    suspicious_activity_score: number
  }> {
    const { data, error } = await supabase
      .rpc('get_security_dashboard_stats')

    if (error) {
      console.error('Error fetching security dashboard:', error)
      throw new Error('Failed to fetch security dashboard')
    }

    return data
  }

  // Request throttling
  static async throttleRequest(endpoint: string, userId?: string): Promise<{
    allowed: boolean
    delay_ms: number
    reason?: string
  }> {
    const { data, error } = await supabase
      .rpc('check_request_throttling', {
        endpoint_path: endpoint,
        user_id: userId || null
      })

    if (error) {
      console.error('Error checking request throttling:', error)
      return { allowed: true, delay_ms: 0 }
    }

    return data
  }

  // Validation helpers
  static validateRateLimitRule(rule: Partial<RateLimitRule & { compliance_framework?: string, auto_delete_enabled?: boolean, backup_before_deletion?: boolean }>): string[] {
    const errors: string[] = []

    if (!rule.endpoint_pattern) {
      errors.push('Endpoint pattern is required')
    }

    if (rule.max_requests !== undefined && rule.max_requests < 1) {
      errors.push('Max requests must be at least 1')
    }

    if (rule.time_window_seconds !== undefined) {
      if (rule.time_window_seconds < 1) {
        errors.push('Time window must be at least 1 second')
      }
      if (rule.time_window_seconds > 946728000) { // ~30 years in seconds
        errors.push('Time window cannot exceed 30 years')
      }
    }

    if (rule.endpoint_pattern && !this.isValidEndpointPattern(rule.endpoint_pattern)) {
      errors.push('Invalid endpoint pattern format')
    }

    // Check for compliance framework validation
    if (rule.compliance_framework) {
      const validFrameworks = ['HIPAA', 'FERPA', 'GDPR', 'PDPL', 'TAX', 'OPERATIONAL', 'COMPLIANCE']
      if (!validFrameworks.includes(rule.compliance_framework)) {
        errors.push('Invalid compliance framework')
      }
    }

    // Check auto-delete requirement for backup
    if (rule.auto_delete_enabled && rule.backup_before_deletion === false) {
      errors.push('Auto-delete requires backup before deletion to be enabled')
    }

    return errors
  }

  static isValidEndpointPattern(pattern: string): boolean {
    try {
      // Check if it's a valid regex pattern
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  // IP-based security
  static async analyzeIPAddress(ipAddress: string): Promise<{
    is_suspicious: boolean
    threat_level: string
    blocked: boolean
    reason?: string
  }> {
    const { data, error } = await supabase
      .rpc('analyze_ip_address', { ip_address: ipAddress })

    if (error) {
      console.error('Error analyzing IP address:', error)
      return { is_suspicious: false, threat_level: 'LOW', blocked: false }
    }

    return data
  }

  // Cleanup and maintenance
  static async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await supabase
      .rpc('cleanup_expired_sessions')

    if (error) {
      console.error('Error cleaning up expired sessions:', error)
      throw new Error('Failed to cleanup expired sessions')
    }

    return data // Returns count of cleaned up sessions
  }

  static async archiveOldSecurityEvents(): Promise<number> {
    const { data, error } = await supabase
      .rpc('archive_old_security_events')

    if (error) {
      console.error('Error archiving old security events:', error)
      throw new Error('Failed to archive old security events')
    }

    return data // Returns count of archived events
  }
}

// Export individual functions for easier importing
export const {
  getRateLimitRules,
  createRateLimitRule,
  updateRateLimitRule,
  checkRateLimit,
  recordRequest,
  logSecurityEvent,
  getSecurityEvents,
  getActiveSessions,
  terminateSession,
  validateSessionSecurity,
  updateSessionActivity,
  getSecurityHeaders,
  applyCORSPolicy,
  getSecurityDashboard,
  throttleRequest,
  validateRateLimitRule,
  analyzeIPAddress,
  cleanupExpiredSessions,
  archiveOldSecurityEvents
} = APISecurityService

export default APISecurityService