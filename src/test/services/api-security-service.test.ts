import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase first
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
  
  return { supabase: mockSupabase }
})

import { APISecurityService, RateLimitRule, SecurityEvent } from '../../services/api-security-service'

describe('APISecurityService', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Get the mocked supabase instance
    const supabaseModule = await import('../../lib/supabase')
    mockSupabase = supabaseModule.supabase
  })

  describe('Rate Limit Management', () => {
    const mockRateLimitRule: RateLimitRule = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      endpoint_pattern: '^/api/auth/.*',
      max_requests: 10,
      time_window_seconds: 900,
      user_role: null,
      enabled: true,
      created_at: '2025-09-01T10:00:00Z',
      updated_at: '2025-09-01T10:00:00Z'
    }

    it('should get rate limit rules successfully', async () => {
      const mockQuery = mockSupabase.from('api_rate_limits')
      mockQuery.single.mockResolvedValueOnce({ data: [mockRateLimitRule], error: null })

      const result = await APISecurityService.getRateLimitRules()

      expect(mockSupabase.from).toHaveBeenCalledWith('api_rate_limits')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('enabled', true)
      expect(mockQuery.order).toHaveBeenCalledWith('endpoint_pattern')
      expect(result).toEqual([mockRateLimitRule])
    })

    it('should handle errors when fetching rate limit rules', async () => {
      const mockQuery = mockSupabase.from('api_rate_limits')
      mockQuery.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      await expect(APISecurityService.getRateLimitRules()).rejects.toThrow('Failed to fetch rate limit rules')
    })

    it('should create rate limit rule successfully', async () => {
      const newRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 50,
        time_window_seconds: 3600,
        user_role: 'admin',
        enabled: true
      }

      const mockQuery = mockSupabase.from('api_rate_limits')
      mockQuery.single.mockResolvedValueOnce({ data: { ...newRule, id: 'new-rule-id' }, error: null })

      const result = await APISecurityService.createRateLimitRule(newRule)

      expect(mockSupabase.from).toHaveBeenCalledWith('api_rate_limits')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newRule,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        })
      )
      expect(result).toEqual(expect.objectContaining(newRule))
    })

    it('should validate rate limit rule before creation', async () => {
      const invalidRule = {
        endpoint_pattern: '',
        max_requests: -1,
        time_window_seconds: 0,
        user_role: null,
        enabled: true
      }

      await expect(APISecurityService.createRateLimitRule(invalidRule)).rejects.toThrow()
    })

    it('should check rate limit status', async () => {
      const mockStatus = {
        endpoint: '/api/test',
        current_count: 5,
        max_requests: 10,
        reset_time: '2025-09-01T11:00:00Z',
        is_limited: false
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatus, error: null })

      const result = await APISecurityService.checkRateLimit('/api/test', 'user-123')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_rate_limit', {
        endpoint_path: '/api/test',
        user_id: 'user-123'
      })
      expect(result).toEqual(mockStatus)
    })

    it('should record API request', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      await APISecurityService.recordRequest('/api/test', 'user-123', { 
        method: 'GET',
        user_agent: 'Mozilla/5.0' 
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_api_request', {
        endpoint_path: '/api/test',
        user_id: 'user-123',
        request_metadata: { method: 'GET', user_agent: 'Mozilla/5.0' }
      })
    })
  })

  describe('Security Event Management', () => {
    const mockSecurityEvent: SecurityEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      event_type: 'RATE_LIMIT_EXCEEDED',
      user_id: 'user-123',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0',
      endpoint: '/api/test',
      request_details: { attempts: 15 },
      severity: 'MEDIUM',
      blocked: true,
      created_at: '2025-09-01T10:00:00Z'
    }

    it('should log security event successfully', async () => {
      const newEvent = {
        event_type: 'SUSPICIOUS_REQUEST' as const,
        user_id: 'user-456',
        ip_address: '10.0.0.1',
        user_agent: 'Suspicious Agent',
        endpoint: '/api/sensitive',
        request_details: { suspicious_pattern: true },
        severity: 'HIGH' as const,
        blocked: true
      }

      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ 
        data: { ...newEvent, id: 'event-id', created_at: '2025-09-01T10:00:00Z' }, 
        error: null 
      })

      const result = await APISecurityService.logSecurityEvent(newEvent)

      expect(mockSupabase.from).toHaveBeenCalledWith('security_events')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newEvent,
          created_at: expect.any(String)
        })
      )
      expect(result).toEqual(expect.objectContaining(newEvent))
    })

    it('should get security events with filtering', async () => {
      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ data: [mockSecurityEvent], error: null })

      const result = await APISecurityService.getSecurityEvents(10, 'HIGH', 'RATE_LIMIT_EXCEEDED')

      expect(mockSupabase.from).toHaveBeenCalledWith('security_events')
      expect(mockQuery.eq).toHaveBeenCalledWith('severity', 'HIGH')
      expect(mockQuery.eq).toHaveBeenCalledWith('event_type', 'RATE_LIMIT_EXCEEDED')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(result).toEqual([mockSecurityEvent])
    })

    it('should get security events without filters', async () => {
      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ data: [mockSecurityEvent], error: null })

      const result = await APISecurityService.getSecurityEvents()

      expect(mockQuery.limit).toHaveBeenCalledWith(50) // default limit
      expect(result).toEqual([mockSecurityEvent])
    })
  })

  describe('Session Security Management', () => {
    const mockSession = {
      id: 'session-123',
      user_id: 'user-456',
      session_token: 'token-abc123',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0',
      last_activity_at: '2025-09-01T10:00:00Z',
      expires_at: '2025-09-01T18:00:00Z',
      is_active: true,
      security_flags: {},
      created_at: '2025-09-01T08:00:00Z'
    }

    it('should get active sessions', async () => {
      const mockQuery = mockSupabase.from('user_sessions')
      mockQuery.single.mockResolvedValueOnce({ data: [mockSession], error: null })

      const result = await APISecurityService.getActiveSessions()

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual([mockSession])
    })

    it('should get active sessions for specific user', async () => {
      const mockQuery = mockSupabase.from('user_sessions')
      mockQuery.single.mockResolvedValueOnce({ data: [mockSession], error: null })

      const result = await APISecurityService.getActiveSessions('user-456')

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-456')
      expect(result).toEqual([mockSession])
    })

    it('should terminate session', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      await APISecurityService.terminateSession('session-123', 'SECURITY_VIOLATION')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('terminate_user_session', {
        session_id: 'session-123',
        termination_reason: 'SECURITY_VIOLATION'
      })
    })

    it('should validate session security', async () => {
      const mockValidation = {
        valid: true,
        session: mockSession,
        issues: []
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockValidation, error: null })

      const result = await APISecurityService.validateSessionSecurity('token-abc123')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_session_security', {
        session_token: 'token-abc123'
      })
      expect(result).toEqual(mockValidation)
    })

    it('should cleanup expired sessions', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 5, error: null })

      const result = await APISecurityService.cleanupExpiredSessions()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_expired_sessions')
      expect(result).toBe(5)
    })
  })

  describe('Security Headers and CORS', () => {
    it('should return security headers', () => {
      const headers = APISecurityService.getSecurityHeaders()

      expect(headers).toHaveProperty('Content-Security-Policy')
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY')
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff')
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin')
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block')
      expect(headers).toHaveProperty('Strict-Transport-Security')
    })

    it('should apply CORS policy correctly for allowed origins', async () => {
      const allowedOrigin = 'https://therapy-plans-manager.netlify.app'
      const result = await APISecurityService.applyCORSPolicy(allowedOrigin)
      expect(result).toBe(true)
    })

    it('should apply CORS policy correctly for subdomain origins', async () => {
      const subdomainOrigin = 'https://app.arkan-therapy.com'
      const result = await APISecurityService.applyCORSPolicy(subdomainOrigin)
      expect(result).toBe(true)
    })

    it('should reject CORS for disallowed origins', async () => {
      const disallowedOrigin = 'https://malicious-site.com'
      const result = await APISecurityService.applyCORSPolicy(disallowedOrigin)
      expect(result).toBe(false)
    })

    it('should allow localhost origins', async () => {
      const localhostOrigin = 'http://localhost:3000'
      const result = await APISecurityService.applyCORSPolicy(localhostOrigin)
      expect(result).toBe(true)
    })
  })

  describe('Request Throttling and IP Analysis', () => {
    it('should check request throttling', async () => {
      const mockThrottling = {
        allowed: false,
        delay_ms: 2000,
        reason: 'Request frequency too high'
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockThrottling, error: null })

      const result = await APISecurityService.throttleRequest('/api/test', 'user-123')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_request_throttling', {
        endpoint_path: '/api/test',
        user_id: 'user-123'
      })
      expect(result).toEqual(mockThrottling)
    })

    it('should analyze IP address for threats', async () => {
      const mockAnalysis = {
        is_suspicious: true,
        threat_level: 'HIGH',
        blocked: false,
        reason: 'Multiple failed authentication attempts'
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockAnalysis, error: null })

      const result = await APISecurityService.analyzeIPAddress('192.168.1.100')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('analyze_ip_address', {
        ip_address: '192.168.1.100'
      })
      expect(result).toEqual(mockAnalysis)
    })

    it('should return safe default for IP analysis on error', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await APISecurityService.analyzeIPAddress('192.168.1.100')

      expect(result).toEqual({
        is_suspicious: false,
        threat_level: 'LOW',
        blocked: false
      })
    })
  })

  describe('Security Dashboard and Statistics', () => {
    it('should get security dashboard statistics', async () => {
      const mockDashboard = {
        rate_limit_violations_24h: 15,
        active_sessions_count: 42,
        security_events_by_severity: {
          CRITICAL: 2,
          HIGH: 5,
          MEDIUM: 8,
          LOW: 20
        },
        blocked_requests_24h: 7,
        suspicious_activity_score: 35
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockDashboard, error: null })

      const result = await APISecurityService.getSecurityDashboard()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_security_dashboard_stats')
      expect(result).toEqual(mockDashboard)
    })

    it('should archive old security events', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 150, error: null })

      const result = await APISecurityService.archiveOldSecurityEvents()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('archive_old_security_events')
      expect(result).toBe(150)
    })
  })

  describe('Validation Helpers', () => {
    it('should validate rate limit rule - valid rule', () => {
      const validRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 3600,
        compliance_framework: 'HIPAA'
      }

      const errors = APISecurityService.validateRateLimitRule(validRule)
      expect(errors).toHaveLength(0)
    })

    it('should validate rate limit rule - invalid max requests', () => {
      const invalidRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 0,
        time_window_seconds: 3600
      }

      const errors = APISecurityService.validateRateLimitRule(invalidRule)
      expect(errors).toContain('Max requests must be at least 1')
    })

    it('should validate rate limit rule - invalid time window', () => {
      const invalidRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 0
      }

      const errors = APISecurityService.validateRateLimitRule(invalidRule)
      expect(errors).toContain('Time window must be at least 1 second')
    })

    it('should validate rate limit rule - missing endpoint pattern', () => {
      const invalidRule = {
        max_requests: 100,
        time_window_seconds: 3600
      }

      const errors = APISecurityService.validateRateLimitRule(invalidRule)
      expect(errors).toContain('Endpoint pattern is required')
    })

    it('should validate rate limit rule - invalid compliance framework', () => {
      const invalidRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 3600,
        compliance_framework: 'INVALID_FRAMEWORK'
      }

      const errors = APISecurityService.validateRateLimitRule(invalidRule)
      expect(errors).toContain('Invalid compliance framework')
    })

    it('should validate rate limit rule - auto delete without backup', () => {
      const invalidRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 3600,
        auto_delete_enabled: true,
        backup_before_deletion: false
      }

      const errors = APISecurityService.validateRateLimitRule(invalidRule)
      expect(errors).toContain('Auto-delete requires backup before deletion to be enabled')
    })

    it('should validate endpoint pattern - valid regex', () => {
      const validPattern = '^/api/auth/.*$'
      const isValid = APISecurityService.isValidEndpointPattern(validPattern)
      expect(isValid).toBe(true)
    })

    it('should validate endpoint pattern - invalid regex', () => {
      const invalidPattern = '^/api/auth/[invalid'
      const isValid = APISecurityService.isValidEndpointPattern(invalidPattern)
      expect(isValid).toBe(false)
    })
  })

  describe('Arabic Language Support', () => {
    it('should handle Arabic text in security events', async () => {
      const arabicEvent = {
        event_type: 'SUSPICIOUS_REQUEST' as const,
        user_id: 'user-456',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
        endpoint: '/api/طلبات_مشبوهة',
        request_details: { 
          description: 'طلب مشبوه من مستخدم غير معروف',
          arabic_text: true 
        },
        severity: 'HIGH' as const,
        blocked: true
      }

      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ 
        data: { ...arabicEvent, id: 'event-id', created_at: '2025-09-01T10:00:00Z' }, 
        error: null 
      })

      const result = await APISecurityService.logSecurityEvent(arabicEvent)

      expect(result.request_details).toEqual(
        expect.objectContaining({ 
          description: 'طلب مشبوه من مستخدم غير معروف',
          arabic_text: true 
        })
      )
    })

    it('should handle Arabic endpoint patterns in rate limits', async () => {
      const arabicRule = {
        endpoint_pattern: '^/api/العلاج/.*',
        max_requests: 50,
        time_window_seconds: 3600,
        user_role: 'therapist',
        enabled: true
      }

      const mockQuery = mockSupabase.from('api_rate_limits')
      mockQuery.single.mockResolvedValueOnce({ 
        data: { ...arabicRule, id: 'arabic-rule-id' }, 
        error: null 
      })

      const result = await APISecurityService.createRateLimitRule(arabicRule)

      expect(result.endpoint_pattern).toBe('^/api/العلاج/.*')
    })
  })

  describe('English Language Support', () => {
    it('should handle English text in security events', async () => {
      const englishEvent = {
        event_type: 'RATE_LIMIT_EXCEEDED' as const,
        user_id: 'user-789',
        ip_address: '10.0.0.1',
        user_agent: 'Chrome/91.0',
        endpoint: '/api/english_endpoint',
        request_details: { 
          description: 'Rate limit exceeded for authentication endpoint',
          language: 'en' 
        },
        severity: 'MEDIUM' as const,
        blocked: true
      }

      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ 
        data: { ...englishEvent, id: 'event-id', created_at: '2025-09-01T10:00:00Z' }, 
        error: null 
      })

      const result = await APISecurityService.logSecurityEvent(englishEvent)

      expect(result.request_details).toEqual(
        expect.objectContaining({ 
          description: 'Rate limit exceeded for authentication endpoint',
          language: 'en' 
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network connection failed')
      })

      await expect(APISecurityService.getRateLimitRules()).rejects.toThrow('Failed to fetch rate limit rules')
    })

    it('should handle database errors in security events', async () => {
      const mockQuery = mockSupabase.from('security_events')
      mockQuery.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database constraint violation' } 
      })

      const newEvent = {
        event_type: 'SUSPICIOUS_REQUEST' as const,
        user_id: null,
        ip_address: '192.168.1.100',
        user_agent: 'Test Agent',
        endpoint: '/api/test',
        request_details: {},
        severity: 'LOW' as const,
        blocked: false
      }

      await expect(APISecurityService.logSecurityEvent(newEvent)).rejects.toThrow('Failed to log security event')
    })

    it('should handle malformed responses from database', async () => {
      const mockQuery = mockSupabase.from('api_rate_limits')
      mockQuery.single.mockResolvedValueOnce({ 
        data: 'invalid-data-format', 
        error: null 
      })

      // Should still return the data even if it's malformed (defensive programming)
      const result = await APISecurityService.getRateLimitRules()
      expect(result).toBe('invalid-data-format')
    })
  })
})