import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAPISecurity } from '../../hooks/useAPISecurity'
import { LanguageContext } from '../../contexts/LanguageContext'
import { AuthContext } from '../../components/auth/AuthGuard'

// Mock services
vi.mock('../../services/api-security-service', () => ({
  APISecurityService: {
    getRateLimitRules: vi.fn(),
    getSecurityEvents: vi.fn(),
    getActiveSessions: vi.fn(),
    getSecurityDashboard: vi.fn(),
    createRateLimitRule: vi.fn(),
    updateRateLimitRule: vi.fn(),
    logSecurityEvent: vi.fn(),
    terminateSession: vi.fn(),
    cleanupExpiredSessions: vi.fn(),
    checkRateLimit: vi.fn(),
    recordRequest: vi.fn(),
    validateSessionSecurity: vi.fn(),
    getSecurityHeaders: vi.fn(),
    applyCORSPolicy: vi.fn(),
    analyzeIPAddress: vi.fn(),
    throttleRequest: vi.fn(),
    validateRateLimitRule: vi.fn()
  }
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
}

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false
}

const mockLanguageContext = {
  language: 'ar' as const,
  isRTL: true,
  t: vi.fn((key: string, fallback?: string) => fallback || key),
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn()
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0
      }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <LanguageContext.Provider value={mockLanguageContext}>
          {children}
        </LanguageContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('useAPISecurity', () => {
  let mockAPISecurityService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPISecurityService = require('../../services/api-security-service').APISecurityService
  })

  describe('Data Fetching', () => {
    it('should fetch rate limit rules successfully', async () => {
      const mockRules = [
        {
          id: '1',
          endpoint_pattern: '^/api/auth/.*',
          max_requests: 10,
          time_window_seconds: 900,
          user_role: null,
          enabled: true,
          created_at: '2025-09-01T10:00:00Z',
          updated_at: '2025-09-01T10:00:00Z'
        }
      ]

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce(mockRules)
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.rateLimitRules).toEqual(mockRules)
      })

      expect(mockAPISecurityService.getRateLimitRules).toHaveBeenCalledOnce()
    })

    it('should fetch security events successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          event_type: 'RATE_LIMIT_EXCEEDED',
          user_id: 'user-123',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
          endpoint: '/api/test',
          request_details: {},
          severity: 'MEDIUM',
          blocked: true,
          created_at: '2025-09-01T10:00:00Z'
        }
      ]

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce(mockEvents)
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.securityEvents).toEqual(mockEvents)
      })

      expect(mockAPISecurityService.getSecurityEvents).toHaveBeenCalledWith(100)
    })

    it('should fetch active sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          session_token: 'token-abc',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
          last_activity_at: '2025-09-01T10:00:00Z',
          expires_at: '2025-09-01T18:00:00Z',
          is_active: true,
          security_flags: {},
          created_at: '2025-09-01T08:00:00Z'
        }
      ]

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce(mockSessions)
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.activeSessions).toEqual(mockSessions)
      })

      expect(mockAPISecurityService.getActiveSessions).toHaveBeenCalledWith('user-123')
    })

    it('should fetch security dashboard successfully', async () => {
      const mockDashboard = {
        rate_limit_violations_24h: 15,
        active_sessions_count: 42,
        security_events_by_severity: { HIGH: 5, MEDIUM: 10 },
        blocked_requests_24h: 7,
        suspicious_activity_score: 35
      }

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce(mockDashboard)

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.securityDashboard).toEqual(mockDashboard)
      })

      expect(mockAPISecurityService.getSecurityDashboard).toHaveBeenCalledOnce()
    })
  })

  describe('Mutation Actions', () => {
    it('should create rate limit rule successfully', async () => {
      const newRule = {
        endpoint_pattern: '^/api/test/.*',
        max_requests: 50,
        time_window_seconds: 3600,
        user_role: 'admin',
        enabled: true
      }

      mockAPISecurityService.createRateLimitRule.mockResolvedValueOnce({ ...newRule, id: 'new-rule' })
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createRateLimit(newRule)
      })

      expect(mockAPISecurityService.createRateLimitRule).toHaveBeenCalledWith(newRule)
    })

    it('should handle errors when creating rate limit rule', async () => {
      const newRule = {
        endpoint_pattern: '',
        max_requests: 50,
        time_window_seconds: 3600,
        user_role: 'admin',
        enabled: true
      }

      mockAPISecurityService.createRateLimitRule.mockRejectedValueOnce(new Error('Validation failed'))
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.createRateLimit(newRule)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })

      expect(mockAPISecurityService.createRateLimitRule).toHaveBeenCalledWith(newRule)
    })

    it('should log security event successfully', async () => {
      const newEvent = {
        event_type: 'SUSPICIOUS_REQUEST' as const,
        user_id: 'user-456',
        ip_address: '10.0.0.1',
        user_agent: 'Suspicious Agent',
        endpoint: '/api/test',
        request_details: {},
        severity: 'HIGH' as const,
        blocked: true
      }

      const mockLoggedEvent = { ...newEvent, id: 'event-1', created_at: '2025-09-01T10:00:00Z' }

      mockAPISecurityService.logSecurityEvent.mockResolvedValueOnce(mockLoggedEvent)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.logSecurityEvent(newEvent)
      })

      expect(mockAPISecurityService.logSecurityEvent).toHaveBeenCalledWith(newEvent)
      expect(result.current.securityAlerts).toContain(mockLoggedEvent)
    })

    it('should terminate session successfully', async () => {
      mockAPISecurityService.terminateSession.mockResolvedValueOnce(undefined)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.terminateSession({ sessionId: 'session-1', reason: 'MANUAL' })
      })

      expect(mockAPISecurityService.terminateSession).toHaveBeenCalledWith('session-1', 'MANUAL')
    })

    it('should cleanup sessions successfully', async () => {
      mockAPISecurityService.cleanupExpiredSessions.mockResolvedValueOnce(5)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.cleanupSessions()
      })

      expect(mockAPISecurityService.cleanupExpiredSessions).toHaveBeenCalledOnce()
    })
  })

  describe('Helper Functions', () => {
    it('should check rate limit successfully', async () => {
      const mockRateLimit = {
        endpoint: '/api/test',
        current_count: 5,
        max_requests: 10,
        reset_time: '2025-09-01T11:00:00Z',
        is_limited: false
      }

      mockAPISecurityService.checkRateLimit.mockResolvedValueOnce(mockRateLimit)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const rateLimitStatus = await act(async () => {
        return await result.current.checkRateLimit('/api/test')
      })

      expect(mockAPISecurityService.checkRateLimit).toHaveBeenCalledWith('/api/test', 'user-123')
      expect(rateLimitStatus).toEqual(mockRateLimit)
    })

    it('should record request successfully', async () => {
      mockAPISecurityService.recordRequest.mockResolvedValueOnce(undefined)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.recordRequest('/api/test', { method: 'GET' })
      })

      expect(mockAPISecurityService.recordRequest).toHaveBeenCalledWith('/api/test', 'user-123', { method: 'GET' })
    })

    it('should validate session successfully', async () => {
      const mockValidation = {
        valid: true,
        session: { id: 'session-1', user_id: 'user-123' },
        issues: []
      }

      mockAPISecurityService.validateSessionSecurity.mockResolvedValueOnce(mockValidation)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const validation = await act(async () => {
        return await result.current.validateSession('token-abc')
      })

      expect(mockAPISecurityService.validateSessionSecurity).toHaveBeenCalledWith('token-abc')
      expect(validation).toEqual(mockValidation)
    })

    it('should handle session validation failures', async () => {
      const mockValidation = {
        valid: false,
        issues: ['Session expired', 'Invalid token']
      }

      mockAPISecurityService.validateSessionSecurity.mockResolvedValueOnce(mockValidation)
      mockAPISecurityService.logSecurityEvent.mockResolvedValueOnce({ id: 'event-1' })
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const validation = await act(async () => {
        return await result.current.validateSession('invalid-token')
      })

      expect(validation).toEqual(mockValidation)
      expect(result.current.sessionWarnings).toEqual(['Session expired', 'Invalid token'])
    })

    it('should get security headers', () => {
      const mockHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
      }

      mockAPISecurityService.getSecurityHeaders.mockReturnValueOnce(mockHeaders)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      const headers = result.current.getSecurityHeaders()
      expect(headers).toEqual(mockHeaders)
      expect(mockAPISecurityService.getSecurityHeaders).toHaveBeenCalledOnce()
    })

    it('should check CORS policy', async () => {
      mockAPISecurityService.applyCORSPolicy.mockResolvedValueOnce(true)
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const corsAllowed = await act(async () => {
        return await result.current.checkCORS('https://allowed-origin.com')
      })

      expect(mockAPISecurityService.applyCORSPolicy).toHaveBeenCalledWith('https://allowed-origin.com')
      expect(corsAllowed).toBe(true)
    })

    it('should analyze IP address', async () => {
      const mockAnalysis = {
        is_suspicious: true,
        threat_level: 'HIGH',
        blocked: false,
        reason: 'Multiple failed attempts'
      }

      mockAPISecurityService.analyzeIPAddress.mockResolvedValueOnce(mockAnalysis)
      mockAPISecurityService.logSecurityEvent.mockResolvedValueOnce({ id: 'event-1' })
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const analysis = await act(async () => {
        return await result.current.analyzeIP('192.168.1.100')
      })

      expect(mockAPISecurityService.analyzeIPAddress).toHaveBeenCalledWith('192.168.1.100')
      expect(analysis).toEqual(mockAnalysis)
    })
  })

  describe('Security Status and Recommendations', () => {
    it('should calculate security status based on dashboard data', async () => {
      const mockDashboard = {
        rate_limit_violations_24h: 15,
        active_sessions_count: 42,
        security_events_by_severity: { HIGH: 5, MEDIUM: 10 },
        blocked_requests_24h: 7,
        suspicious_activity_score: 85
      }

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce(mockDashboard)

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.securityDashboard).toEqual(mockDashboard)
      })

      const status = result.current.getSecurityStatus()
      expect(status).toBe('CRITICAL') // score > 80
    })

    it('should provide security recommendations', async () => {
      const mockDashboard = {
        rate_limit_violations_24h: 60, // > 50
        active_sessions_count: 1200, // > 1000
        security_events_by_severity: { HIGH: 5, MEDIUM: 10 },
        blocked_requests_24h: 150, // > 100
        suspicious_activity_score: 65
      }

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce(mockDashboard)

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.securityDashboard).toEqual(mockDashboard)
      })

      const recommendations = result.current.getSecurityRecommendations()
      expect(recommendations).toContain('security.recommend.rate_limits')
      expect(recommendations).toContain('security.recommend.sessions')
      expect(recommendations).toContain('security.recommend.threats')
    })

    it('should format security events for display', async () => {
      const mockEvent = {
        id: '1',
        event_type: 'RATE_LIMIT_EXCEEDED' as const,
        user_id: 'user-123',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
        endpoint: '/api/test',
        request_details: {},
        severity: 'MEDIUM' as const,
        blocked: true,
        created_at: '2025-09-01T10:00:00Z'
      }

      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const formattedEvent = result.current.formatSecurityEvent(mockEvent)
      expect(formattedEvent).toHaveProperty('displayName')
      expect(formattedEvent).toHaveProperty('timeAgo')
      expect(formattedEvent.displayName).toBe('security.events.rate_limit')
    })
  })

  describe('Arabic Language Support', () => {
    it('should handle Arabic translations in security context', async () => {
      mockLanguageContext.language = 'ar'
      mockLanguageContext.isRTL = true
      mockLanguageContext.t = vi.fn((key, fallback) => {
        const translations = {
          'security.rate_limit.created': 'تم إنشاء قاعدة تحديد المعدل بنجاح',
          'security.events.rate_limit': 'تجاوز حد المعدل',
          'security.session.terminated': 'تم إنهاء الجلسة بنجاح'
        }
        return translations[key] || fallback || key
      })

      mockAPISecurityService.createRateLimitRule.mockResolvedValueOnce({ id: 'new-rule' })
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createRateLimit({
          endpoint_pattern: '^/api/العلاج/.*',
          max_requests: 50,
          time_window_seconds: 3600,
          user_role: 'therapist',
          enabled: true
        })
      })

      expect(mockLanguageContext.t).toHaveBeenCalledWith('security.rate_limit.created', 'Rate limit rule created successfully')
    })
  })

  describe('Loading States', () => {
    it('should handle loading states correctly', async () => {
      // Mock slow responses
      mockAPISecurityService.getRateLimitRules.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      mockAPISecurityService.getSecurityEvents.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      mockAPISecurityService.getActiveSessions.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      mockAPISecurityService.getSecurityDashboard.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      )

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isRulesLoading).toBe(true)
      expect(result.current.isEventsLoading).toBe(true)
      expect(result.current.isDashboardLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPISecurityService.getRateLimitRules.mockRejectedValueOnce(new Error('Network error'))
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })

    it('should handle rate limit check errors with fallback', async () => {
      mockAPISecurityService.checkRateLimit.mockRejectedValueOnce(new Error('Network error'))
      mockAPISecurityService.getRateLimitRules.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityEvents.mockResolvedValueOnce([])
      mockAPISecurityService.getActiveSessions.mockResolvedValueOnce([])
      mockAPISecurityService.getSecurityDashboard.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAPISecurity(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const rateLimitStatus = await act(async () => {
        return await result.current.checkRateLimit('/api/test')
      })

      // Should return permissive default on error
      expect(rateLimitStatus).toEqual({
        endpoint: '/api/test',
        current_count: 0,
        max_requests: 1000,
        reset_time: expect.any(String),
        is_limited: false
      })
    })
  })
})