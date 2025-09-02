import { describe, it, expect, vi } from 'vitest'
import { APISecurityService } from '../../services/api-security-service'

// Mock Supabase with working chain methods
vi.mock('../../lib/supabase', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }

  const mockSupabase = {
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
    }
  }
  
  return { supabase: mockSupabase }
})

describe('APISecurityService - Core Functionality', () => {
  describe('Security Headers', () => {
    it('should return proper security headers', () => {
      const headers = APISecurityService.getSecurityHeaders()
      
      expect(headers).toHaveProperty('Content-Security-Policy')
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY')
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff')
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin')
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block')
      expect(headers).toHaveProperty('Strict-Transport-Security')
      
      // Verify CSP contains essential directives
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    })
  })

  describe('CORS Policy', () => {
    it('should allow approved origins', async () => {
      const allowedOrigins = [
        'https://therapy-plans-manager.netlify.app',
        'https://arkan-therapy.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ]

      for (const origin of allowedOrigins) {
        const result = await APISecurityService.applyCORSPolicy(origin)
        expect(result).toBe(true)
      }
    })

    it('should allow subdomain origins', async () => {
      const subdomainOrigins = [
        'https://app.arkan-therapy.com',
        'https://admin.arkan-therapy.com',
        'https://test.arkan-therapy.com'
      ]

      for (const origin of subdomainOrigins) {
        const result = await APISecurityService.applyCORSPolicy(origin)
        expect(result).toBe(true)
      }
    })

    it('should reject disallowed origins', async () => {
      const disallowedOrigins = [
        'https://malicious-site.com',
        'http://evil.hacker.com',
        'https://fake-arkan.com'
      ]

      for (const origin of disallowedOrigins) {
        const result = await APISecurityService.applyCORSPolicy(origin)
        expect(result).toBe(false)
      }
    })
  })

  describe('Validation Helpers', () => {
    it('should validate rate limit rules correctly', () => {
      // Valid rule
      const validRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 3600,
        compliance_framework: 'HIPAA'
      }
      expect(APISecurityService.validateRateLimitRule(validRule)).toEqual([])

      // Invalid max requests
      const invalidMaxRule = { ...validRule, max_requests: 0 }
      const maxErrors = APISecurityService.validateRateLimitRule(invalidMaxRule)
      expect(maxErrors).toContain('Max requests must be at least 1')

      // Invalid time window
      const invalidTimeRule = { ...validRule, time_window_seconds: 0 }
      const timeErrors = APISecurityService.validateRateLimitRule(invalidTimeRule)
      expect(timeErrors).toContain('Time window must be at least 1 second')

      // Missing endpoint pattern
      const missingPatternRule = { max_requests: 100, time_window_seconds: 3600 }
      const patternErrors = APISecurityService.validateRateLimitRule(missingPatternRule)
      expect(patternErrors).toContain('Endpoint pattern is required')
    })

    it('should validate endpoint patterns correctly', () => {
      // Valid patterns
      expect(APISecurityService.isValidEndpointPattern('^/api/auth/.*$')).toBe(true)
      expect(APISecurityService.isValidEndpointPattern('/simple-path')).toBe(true)
      expect(APISecurityService.isValidEndpointPattern('.*')).toBe(true)

      // Invalid patterns
      expect(APISecurityService.isValidEndpointPattern('^/api/auth/[invalid')).toBe(false)
      expect(APISecurityService.isValidEndpointPattern('(')).toBe(false)
    })
  })

  describe('Arabic Language Support', () => {
    it('should handle Arabic endpoint patterns', () => {
      const arabicPattern = '^/api/العلاج/.*'
      expect(APISecurityService.isValidEndpointPattern(arabicPattern)).toBe(true)
    })

    it('should validate rules with Arabic text', () => {
      const arabicRule = {
        endpoint_pattern: '^/api/المرضى/.*',
        max_requests: 50,
        time_window_seconds: 3600,
        compliance_framework: 'PDPL'
      }
      expect(APISecurityService.validateRateLimitRule(arabicRule)).toEqual([])
    })
  })

  describe('English Language Support', () => {
    it('should handle standard English patterns', () => {
      const englishPatterns = [
        '^/api/patients/.*',
        '/api/therapy-sessions',
        '^/api/medical-records/\\d+$'
      ]

      for (const pattern of englishPatterns) {
        expect(APISecurityService.isValidEndpointPattern(pattern)).toBe(true)
      }
    })

    it('should validate rules with English compliance frameworks', () => {
      const frameworks = ['HIPAA', 'FERPA', 'GDPR', 'PDPL', 'TAX', 'OPERATIONAL', 'COMPLIANCE']
      
      for (const framework of frameworks) {
        const rule = {
          endpoint_pattern: '^/api/test/.*',
          max_requests: 100,
          time_window_seconds: 3600,
          compliance_framework: framework
        }
        expect(APISecurityService.validateRateLimitRule(rule)).toEqual([])
      }
    })
  })

  describe('Edge Cases and Error Prevention', () => {
    it('should handle extreme rate limit values', () => {
      // Very high values (still valid)
      const highRule = {
        endpoint_pattern: '^/api/bulk/.*',
        max_requests: 10000,
        time_window_seconds: 86400 // 24 hours
      }
      expect(APISecurityService.validateRateLimitRule(highRule)).toEqual([])

      // Very low but valid values  
      const lowRule = {
        endpoint_pattern: '^/api/sensitive/.*',
        max_requests: 1,
        time_window_seconds: 1
      }
      expect(APISecurityService.validateRateLimitRule(lowRule)).toEqual([])

      // Too high (invalid - over 30 years)  
      const tooHighRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 1000000000 // Much larger than 30 years limit
      }
      const errors = APISecurityService.validateRateLimitRule(tooHighRule)
      expect(errors).toContain('Time window cannot exceed 30 years')
    })

    it('should handle complex regex patterns', () => {
      const complexPatterns = [
        '^/api/(auth|users|sessions)/(login|logout|refresh)$',
        '^/api/therapy-plans/\\d+/(sessions|goals|assessments)$',
        '^/api/students/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/medical-records$'
      ]

      for (const pattern of complexPatterns) {
        expect(APISecurityService.isValidEndpointPattern(pattern)).toBe(true)
      }
    })

    it('should handle special characters in patterns safely', () => {
      const specialPatterns = [
        '^/api/files/[^/]+\\.(pdf|doc|docx)$',
        '^/api/reports/\\d{4}-\\d{2}-\\d{2}$',
        '/api/search\\?.*query=.*'
      ]

      for (const pattern of specialPatterns) {
        expect(APISecurityService.isValidEndpointPattern(pattern)).toBe(true)
      }
    })
  })

  describe('Security Best Practices Validation', () => {
    it('should enforce security requirements for critical endpoints', () => {
      const criticalRule = {
        endpoint_pattern: '^/api/medical-records/.*',
        max_requests: 1000,
        time_window_seconds: 60,
        auto_delete_enabled: true,
        backup_before_deletion: false
      }

      const errors = APISecurityService.validateRateLimitRule(criticalRule)
      expect(errors).toContain('Auto-delete requires backup before deletion to be enabled')
    })

    it('should validate compliance framework requirements', () => {
      const invalidFrameworkRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 100,
        time_window_seconds: 3600,
        compliance_framework: 'INVALID_FRAMEWORK'
      }

      const errors = APISecurityService.validateRateLimitRule(invalidFrameworkRule)
      expect(errors).toContain('Invalid compliance framework')
    })
  })
})

describe('APISecurityService - Integration Readiness', () => {
  it('should be ready for database integration', () => {
    expect(typeof APISecurityService.getRateLimitRules).toBe('function')
    expect(typeof APISecurityService.createRateLimitRule).toBe('function')
    expect(typeof APISecurityService.updateRateLimitRule).toBe('function')
    expect(typeof APISecurityService.logSecurityEvent).toBe('function')
    expect(typeof APISecurityService.getSecurityEvents).toBe('function')
    expect(typeof APISecurityService.getActiveSessions).toBe('function')
    expect(typeof APISecurityService.terminateSession).toBe('function')
    expect(typeof APISecurityService.validateSessionSecurity).toBe('function')
    expect(typeof APISecurityService.getSecurityDashboard).toBe('function')
    expect(typeof APISecurityService.cleanupExpiredSessions).toBe('function')
    expect(typeof APISecurityService.archiveOldSecurityEvents).toBe('function')
  })

  it('should have all required exports', () => {
    // Test that the main class and functions are available through the import
    expect(APISecurityService).toBeDefined()
    expect(APISecurityService.getSecurityHeaders).toBeDefined()
    expect(APISecurityService.applyCORSPolicy).toBeDefined()
    expect(APISecurityService.validateRateLimitRule).toBeDefined()
    expect(APISecurityService.isValidEndpointPattern).toBeDefined()
  })

  it('should handle bilingual functionality', () => {
    // Test that the service can handle both Arabic and English patterns
    const arabicPattern = '^/api/العلاج/.*'
    const englishPattern = '^/api/therapy/.*'
    
    expect(APISecurityService.isValidEndpointPattern(arabicPattern)).toBe(true)
    expect(APISecurityService.isValidEndpointPattern(englishPattern)).toBe(true)
  })
})