import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  APISecurityService,
  RateLimitRule,
  SecurityEvent,
  SessionSecurityInfo,
  RateLimitStatus,
  SecurityHeaders
} from '../services/api-security-service'
import { useAuth } from '../components/auth/AuthGuard'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'

export interface UseAPISecurityOptions {
  enabled?: boolean
  monitorSessions?: boolean
  autoRefresh?: boolean
}

export const useAPISececurity = (options: UseAPISecurityOptions = {}) => {
  const { enabled = true, monitorSessions = true, autoRefresh = false } = options
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  // Local state for security monitoring
  const [securityAlerts, setSecurityAlerts] = useState<SecurityEvent[]>([])
  const [sessionWarnings, setSessionWarnings] = useState<string[]>([])

  // Query: Get rate limit rules
  const {
    data: rateLimitRules,
    isLoading: isRulesLoading,
    error: rulesError
  } = useQuery({
    queryKey: ['rate-limit-rules'],
    queryFn: APISecurityService.getRateLimitRules,
    enabled: enabled && !!user,
    staleTime: autoRefresh ? 2 * 60 * 1000 : 10 * 60 * 1000, // 2 or 10 minutes
  })

  // Query: Get security events
  const {
    data: securityEvents,
    isLoading: isEventsLoading,
    refetch: refetchSecurityEvents
  } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => APISecurityService.getSecurityEvents(100),
    enabled: enabled && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: autoRefresh ? 30 * 1000 : false, // 30 seconds if auto refresh
  })

  // Query: Get active sessions
  const {
    data: activeSessions,
    isLoading: isSessionsLoading,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['active-sessions', user?.id],
    queryFn: () => APISecurityService.getActiveSessions(user?.id),
    enabled: enabled && monitorSessions && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Query: Get security dashboard
  const {
    data: securityDashboard,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: APISecurityService.getSecurityDashboard,
    enabled: enabled && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: autoRefresh ? 60 * 1000 : false, // 1 minute if auto refresh
  })

  // Mutation: Create rate limit rule
  const createRuleMutation = useMutation({
    mutationFn: (rule: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at'>) =>
      APISecurityService.createRateLimitRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-rules'] })
      toast.success(t('security.rate_limit.created', 'Rate limit rule created successfully'))
    },
    onError: (error: any) => {
      console.error('Error creating rate limit rule:', error)
      toast.error(error.message || t('security.rate_limit.create.error', 'Failed to create rate limit rule'))
    }
  })

  // Mutation: Update rate limit rule
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<RateLimitRule> }) =>
      APISecurityService.updateRateLimitRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-rules'] })
      toast.success(t('security.rate_limit.updated', 'Rate limit rule updated successfully'))
    },
    onError: (error: any) => {
      console.error('Error updating rate limit rule:', error)
      toast.error(error.message || t('security.rate_limit.update.error', 'Failed to update rate limit rule'))
    }
  })

  // Mutation: Log security event
  const logSecurityEventMutation = useMutation({
    mutationFn: (event: Omit<SecurityEvent, 'id' | 'created_at'>) =>
      APISecurityService.logSecurityEvent(event),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] })
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      
      // Add to local alerts for immediate UI feedback
      setSecurityAlerts(prev => [newEvent, ...prev.slice(0, 4)])
      
      // Show toast for high severity events
      if (newEvent.severity === 'HIGH' || newEvent.severity === 'CRITICAL') {
        toast.error(
          t('security.event.logged', `Security event logged: ${newEvent.event_type}`)
        )
      }
    },
    onError: (error: any) => {
      console.error('Error logging security event:', error)
    }
  })

  // Mutation: Terminate session
  const terminateSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string, reason?: string }) =>
      APISecurityService.terminateSession(sessionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      toast.success(t('security.session.terminated', 'Session terminated successfully'))
    },
    onError: (error: any) => {
      console.error('Error terminating session:', error)
      toast.error(error.message || t('security.session.terminate.error', 'Failed to terminate session'))
    }
  })

  // Mutation: Cleanup expired sessions
  const cleanupSessionsMutation = useMutation({
    mutationFn: APISecurityService.cleanupExpiredSessions,
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] })
      toast.success(
        t('security.sessions.cleaned', `Cleaned up ${count} expired sessions`)
      )
    },
    onError: (error: any) => {
      console.error('Error cleaning up sessions:', error)
      toast.error(error.message || t('security.sessions.cleanup.error', 'Failed to cleanup sessions'))
    }
  })

  // Helper functions
  const checkRateLimit = async (endpoint: string): Promise<RateLimitStatus> => {
    try {
      return await APISecurityService.checkRateLimit(endpoint, user?.id)
    } catch (error) {
      console.error('Error checking rate limit:', error)
      // Return permissive default on error
      return {
        endpoint,
        current_count: 0,
        max_requests: 1000,
        reset_time: new Date(Date.now() + 3600000).toISOString(),
        is_limited: false
      }
    }
  }

  const recordRequest = async (endpoint: string, requestDetails?: Record<string, any>) => {
    try {
      await APISecurityService.recordRequest(endpoint, user?.id, requestDetails)
    } catch (error) {
      console.error('Error recording API request:', error)
      // Don't throw - this shouldn't block the actual request
    }
  }

  const validateSession = async (sessionToken: string) => {
    try {
      const result = await APISecurityService.validateSessionSecurity(sessionToken)
      
      if (result.issues.length > 0) {
        setSessionWarnings(result.issues)
        
        // Log security event for validation failures
        if (!result.valid) {
          await logSecurityEventMutation.mutateAsync({
            event_type: 'INVALID_TOKEN',
            user_id: user?.id || null,
            ip_address: '0.0.0.0', // Will be set by the backend
            user_agent: navigator.userAgent,
            endpoint: '/api/auth/validate',
            request_details: { issues: result.issues },
            severity: 'MEDIUM',
            blocked: !result.valid
          })
        }
      } else {
        setSessionWarnings([])
      }
      
      return result
    } catch (error) {
      console.error('Error validating session:', error)
      setSessionWarnings(['Session validation failed'])
      return { valid: false, issues: ['Validation error'] }
    }
  }

  const getSecurityHeaders = (): SecurityHeaders => {
    return APISecurityService.getSecurityHeaders()
  }

  const checkCORS = async (origin: string): Promise<boolean> => {
    try {
      return await APISecurityService.applyCORSPolicy(origin)
    } catch (error) {
      console.error('Error checking CORS policy:', error)
      return false
    }
  }

  const analyzeIP = async (ipAddress: string) => {
    try {
      const analysis = await APISecurityService.analyzeIPAddress(ipAddress)
      
      // Log security event for suspicious IPs
      if (analysis.is_suspicious) {
        await logSecurityEventMutation.mutateAsync({
          event_type: 'SUSPICIOUS_IP',
          user_id: user?.id || null,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          endpoint: '/api/security/ip-analysis',
          request_details: analysis,
          severity: analysis.threat_level as SecurityEvent['severity'],
          blocked: analysis.blocked
        })
      }
      
      return analysis
    } catch (error) {
      console.error('Error analyzing IP address:', error)
      return {
        is_suspicious: false,
        threat_level: 'LOW',
        blocked: false
      }
    }
  }

  const throttleRequest = async (endpoint: string) => {
    try {
      return await APISecurityService.throttleRequest(endpoint, user?.id)
    } catch (error) {
      console.error('Error checking throttling:', error)
      return { allowed: true, delay_ms: 0 }
    }
  }

  // Get current security status
  const getSecurityStatus = () => {
    const dashboard = securityDashboard
    if (!dashboard) return 'UNKNOWN'
    
    if (dashboard.suspicious_activity_score > 80) return 'CRITICAL'
    if (dashboard.suspicious_activity_score > 50) return 'HIGH'
    if (dashboard.suspicious_activity_score > 20) return 'MEDIUM'
    return 'LOW'
  }

  // Get security recommendations
  const getSecurityRecommendations = () => {
    const recommendations: string[] = []
    
    if (securityDashboard?.rate_limit_violations_24h > 50) {
      recommendations.push(t('security.recommend.rate_limits', 'Consider tightening rate limits'))
    }
    
    if (securityDashboard?.active_sessions_count > 1000) {
      recommendations.push(t('security.recommend.sessions', 'High number of active sessions'))
    }
    
    if (securityDashboard?.blocked_requests_24h > 100) {
      recommendations.push(t('security.recommend.threats', 'Elevated threat activity detected'))
    }
    
    if (sessionWarnings.length > 0) {
      recommendations.push(t('security.recommend.session_issues', 'Session security issues detected'))
    }
    
    return recommendations
  }

  // Format security event for display
  const formatSecurityEvent = (event: SecurityEvent) => {
    const eventNames = {
      'RATE_LIMIT_EXCEEDED': t('security.events.rate_limit', 'Rate Limit Exceeded'),
      'SUSPICIOUS_REQUEST': t('security.events.suspicious', 'Suspicious Request'),
      'INVALID_TOKEN': t('security.events.invalid_token', 'Invalid Token'),
      'CORS_VIOLATION': t('security.events.cors', 'CORS Violation'),
      'SESSION_TIMEOUT': t('security.events.session_timeout', 'Session Timeout'),
      'BRUTE_FORCE_ATTEMPT': t('security.events.brute_force', 'Brute Force Attempt'),
      'UNAUTHORIZED_ACCESS': t('security.events.unauthorized', 'Unauthorized Access'),
      'SUSPICIOUS_IP': t('security.events.suspicious_ip', 'Suspicious IP'),
      'MALFORMED_REQUEST': t('security.events.malformed', 'Malformed Request')
    }
    
    return {
      ...event,
      displayName: eventNames[event.event_type] || event.event_type,
      timeAgo: new Date(event.created_at).toLocaleString()
    }
  }

  // Effect: Monitor for critical security events
  useEffect(() => {
    if (securityEvents) {
      const criticalEvents = securityEvents.filter(
        event => event.severity === 'CRITICAL' && 
        new Date(event.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      )
      
      if (criticalEvents.length > 0) {
        setSecurityAlerts(criticalEvents.slice(0, 5))
      }
    }
  }, [securityEvents])

  return {
    // Data
    rateLimitRules: rateLimitRules || [],
    securityEvents: securityEvents || [],
    activeSessions: activeSessions || [],
    securityDashboard,
    securityAlerts,
    sessionWarnings,

    // Loading states
    isLoading: isRulesLoading || isEventsLoading || isDashboardLoading,
    isRulesLoading,
    isEventsLoading,
    isSessionsLoading,
    isDashboardLoading,
    isCreatingRule: createRuleMutation.isPending,
    isUpdatingRule: updateRuleMutation.isPending,
    isLoggingEvent: logSecurityEventMutation.isPending,
    isTerminatingSession: terminateSessionMutation.isPending,
    isCleaningSessions: cleanupSessionsMutation.isPending,

    // Actions
    createRateLimit: createRuleMutation.mutateAsync,
    updateRateLimit: updateRuleMutation.mutateAsync,
    logSecurityEvent: logSecurityEventMutation.mutateAsync,
    terminateSession: terminateSessionMutation.mutateAsync,
    cleanupSessions: cleanupSessionsMutation.mutateAsync,
    refetchSecurityEvents,
    refetchSessions,
    refetchDashboard,

    // Helper functions
    checkRateLimit,
    recordRequest,
    validateSession,
    getSecurityHeaders,
    checkCORS,
    analyzeIP,
    throttleRequest,
    getSecurityStatus,
    getSecurityRecommendations,
    formatSecurityEvent,

    // Errors
    error: rulesError,
    rulesError,
    createError: createRuleMutation.error,
    updateError: updateRuleMutation.error,
    eventError: logSecurityEventMutation.error,
    sessionError: terminateSessionMutation.error,
    cleanupError: cleanupSessionsMutation.error,
  }
}

export default useAPISececurity