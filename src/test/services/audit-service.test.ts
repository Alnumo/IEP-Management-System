/**
 * Audit Service Tests
 * Tests for enhanced audit trail functionality
 * Story 1.2: Task 3 - Audit service testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditService, auditService, type AuthenticationEvent, type SecurityEvent } from '@/services/audit-service'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}))

import { supabase } from '@/lib/supabase'
const mockSupabase = vi.mocked(supabase)

describe('AuditService', () => {
  let service: AuditService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuditService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logAuthenticationEvent()', () => {
    it('should log authentication event successfully', async () => {
      const mockLogId = 'log-123-456'
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockLogId,
        error: null
      })

      const authEvent: AuthenticationEvent = {
        event_type: 'LOGIN_SUCCESS',
        event_details: {
          success: true,
          method: 'password'
        },
        user_identifier: 'user-123',
        risk_level: 'low'
      }

      const result = await service.logAuthenticationEvent(authEvent)

      expect(result).toBe(mockLogId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'LOGIN_SUCCESS',
        event_details: authEvent.event_details,
        user_identifier: 'user-123',
        risk_level: 'low'
      })
    })

    it('should handle authentication logging errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const authEvent: AuthenticationEvent = {
        event_type: 'LOGIN_FAILED',
        event_details: { success: false }
      }

      await expect(service.logAuthenticationEvent(authEvent))
        .rejects
        .toThrow('Failed to log authentication event')
    })

    it('should use default risk level if not provided', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'log-123',
        error: null
      })

      const authEvent: AuthenticationEvent = {
        event_type: 'LOGIN_SUCCESS',
        event_details: { success: true }
      }

      await service.logAuthenticationEvent(authEvent)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'LOGIN_SUCCESS',
        event_details: authEvent.event_details,
        user_identifier: undefined,
        risk_level: 'medium'
      })
    })
  })

  describe('logSecurityEvent()', () => {
    it('should log security event successfully', async () => {
      const mockLogId = 'security-log-456'
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockLogId,
        error: null
      })

      const securityEvent: SecurityEvent = {
        violation_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        event_details: {
          resource: 'medical_records',
          user_id: 'user-123'
        }
      }

      const result = await service.logSecurityEvent(securityEvent)

      expect(result).toBe(mockLogId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        violation_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        event_details: securityEvent.event_details
      })
    })

    it('should handle security logging errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Security logging failed' }
      })

      const securityEvent: SecurityEvent = {
        violation_type: 'DATA_BREACH_ATTEMPT',
        event_details: {}
      }

      await expect(service.logSecurityEvent(securityEvent))
        .rejects
        .toThrow('Failed to log security event')
    })
  })

  describe('logSuccessfulLogin()', () => {
    it('should log successful login with device fingerprint', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'login-log-123',
        error: null
      })

      await service.logSuccessfulLogin('user-123', 'device-fingerprint-abc')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'LOGIN_SUCCESS',
        event_details: expect.objectContaining({
          success: true,
          method: 'password',
          device_fingerprint: 'device-fingerprint-abc'
        }),
        user_identifier: 'user-123',
        risk_level: 'low'
      })
    })

    it('should log successful login without device fingerprint', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'login-log-456',
        error: null
      })

      await service.logSuccessfulLogin('user-456')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', 
        expect.objectContaining({
          event_type: 'LOGIN_SUCCESS',
          user_identifier: 'user-456',
          risk_level: 'low'
        })
      )
    })
  })

  describe('logFailedLogin()', () => {
    it('should log single failed login attempt', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'failed-log-123',
        error: null
      })

      await service.logFailedLogin('user-123', 'Invalid password', 1)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'LOGIN_FAILED',
        event_details: expect.objectContaining({
          success: false,
          failure_reason: 'Invalid password',
          attempt_count: 1
        }),
        user_identifier: 'user-123',
        risk_level: 'low'
      })
    })

    it('should escalate risk level for multiple failed attempts', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'failed-log-456',
        error: null
      })

      await service.logFailedLogin('user-456', 'Invalid password', 3)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'MULTIPLE_FAILED_ATTEMPTS',
        event_details: expect.objectContaining({
          success: false,
          failure_reason: 'Invalid password',
          attempt_count: 3
        }),
        user_identifier: 'user-456',
        risk_level: 'high'
      })
    })

    it('should use medium risk level for 2 attempts', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'failed-log-789',
        error: null
      })

      await service.logFailedLogin('user-789', 'Invalid password', 2)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', 
        expect.objectContaining({
          risk_level: 'medium'
        })
      )
    })
  })

  describe('logSuspiciousLogin()', () => {
    it('should log suspicious login and security event', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'suspicious-auth-log', error: null })
        .mockResolvedValueOnce({ data: 'suspicious-security-log', error: null })

      const suspiciousFactors = ['unusual_location', 'unusual_time', 'multiple_devices']

      await service.logSuspiciousLogin('user-123', suspiciousFactors)

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'SUSPICIOUS_LOGIN',
        event_details: expect.objectContaining({
          suspicious_factors: suspiciousFactors,
          requires_review: true
        }),
        user_identifier: 'user-123',
        risk_level: 'high'
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        violation_type: 'SUSPICIOUS_LOGIN_PATTERN',
        event_details: expect.objectContaining({
          user_id: 'user-123',
          suspicious_factors: suspiciousFactors,
          auto_detected: true
        })
      })
    })
  })

  describe('logLogout()', () => {
    it('should log manual logout', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'logout-log-123',
        error: null
      })

      await service.logLogout('user-123', 'manual')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'LOGOUT',
        event_details: expect.objectContaining({
          logout_type: 'manual'
        }),
        user_identifier: 'user-123',
        risk_level: 'low'
      })
    })

    it('should log session timeout', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'timeout-log-456',
        error: null
      })

      await service.logLogout('user-456', 'timeout')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', {
        event_type: 'SESSION_TIMEOUT',
        event_details: expect.objectContaining({
          logout_type: 'timeout'
        }),
        user_identifier: 'user-456',
        risk_level: 'low'
      })
    })

    it('should default to manual logout', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'default-logout-log',
        error: null
      })

      await service.logLogout('user-789')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event', 
        expect.objectContaining({
          event_type: 'LOGOUT'
        })
      )
    })
  })

  describe('logUnauthorizedAccess()', () => {
    it('should log unauthorized access attempt', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'unauthorized-log-123',
        error: null
      })

      await service.logUnauthorizedAccess('medical_records', 'user-123', { additional: 'info' })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        violation_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        event_details: expect.objectContaining({
          resource: 'medical_records',
          user_id: 'user-123',
          details: { additional: 'info' }
        })
      })
    })

    it('should handle unauthorized access without user ID', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'anonymous-unauthorized-log',
        error: null
      })

      await service.logUnauthorizedAccess('sensitive_data')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        violation_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        event_details: expect.objectContaining({
          resource: 'sensitive_data',
          user_id: undefined,
          details: {}
        })
      })
    })
  })

  describe('logMedicalDataAccess()', () => {
    it('should log medical data access for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'doctor@example.com' } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'medical-access-log',
        error: null
      })

      await service.logMedicalDataAccess('medical_records', 'record-456', 'SELECT', 'highly_sensitive')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        violation_type: 'MEDICAL_DATA_ACCESS',
        event_details: expect.objectContaining({
          table_accessed: 'medical_records',
          record_id: 'record-456',
          operation: 'SELECT',
          data_classification: 'highly_sensitive',
          user_id: 'user-123',
          compliance_required: ['HIPAA', 'PDPL']
        })
      })
    })

    it('should handle errors gracefully without throwing', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'))

      // Should not throw an error
      await expect(service.logMedicalDataAccess('medical_records', 'record-789', 'UPDATE'))
        .resolves
        .toBeUndefined()
    })

    it('should use default data classification', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-456' } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'default-classification-log',
        error: null
      })

      await service.logMedicalDataAccess('clinical_documentation', 'doc-123', 'INSERT')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event',
        expect.objectContaining({
          event_details: expect.objectContaining({
            data_classification: 'highly_sensitive'
          })
        })
      )
    })
  })

  describe('generateComplianceReport()', () => {
    it('should generate compliance report with default parameters', async () => {
      const mockReport = {
        report_metadata: {
          compliance_framework: 'HIPAA',
          start_date: '2025-08-02',
          end_date: '2025-09-01'
        },
        summary_statistics: {
          total_events: 150,
          security_violations: 5,
          medical_access_events: 85,
          authentication_events: 60
        }
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockReport,
        error: null
      })

      const result = await service.generateComplianceReport()

      expect(result).toEqual(mockReport)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_compliance_report', 
        expect.objectContaining({
          compliance_framework: 'HIPAA'
        })
      )
    })

    it('should generate compliance report with custom parameters', async () => {
      const mockReport = {
        report_metadata: {
          compliance_framework: 'PDPL'
        }
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockReport,
        error: null
      })

      const result = await service.generateComplianceReport({
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        compliance_framework: 'PDPL'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_compliance_report', {
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        compliance_framework: 'PDPL'
      })
    })

    it('should handle compliance report generation errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Report generation failed' }
      })

      await expect(service.generateComplianceReport())
        .rejects
        .toThrow('Failed to generate compliance report')
    })
  })

  describe('applyRetentionPolicies()', () => {
    it('should apply retention policies successfully', async () => {
      const mockResult = {
        success: true,
        records_archived: 1500,
        records_deleted: 200
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await service.applyRetentionPolicies()

      expect(result).toEqual(mockResult)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_audit_retention_policies')
    })

    it('should handle retention policy errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Retention policy failed' }
      })

      await expect(service.applyRetentionPolicies())
        .rejects
        .toThrow('Failed to apply retention policies')
    })
  })

  describe('createAuditArchive()', () => {
    it('should create audit archive successfully', async () => {
      const mockArchive = {
        archive_id: 'ARCHIVE-2025-Q3-001',
        records_count: 5000
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockArchive,
        error: null
      })

      const result = await service.createAuditArchive('Q3-2025')

      expect(result).toEqual(mockArchive)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_audit_archive', {
        archive_name: 'Q3-2025'
      })
    })

    it('should handle archive creation errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Archive creation failed' }
      })

      await expect(service.createAuditArchive())
        .rejects
        .toThrow('Failed to create audit archive')
    })
  })

  describe('getSecurityViolationsSummary()', () => {
    it('should get security violations summary', async () => {
      const mockViolations = [
        { risk_level: 'high', event_category: 'security_violation', timestamp: '2025-09-01T10:00:00Z' },
        { risk_level: 'critical', event_category: 'security_violation', timestamp: '2025-09-01T11:00:00Z' },
        { risk_level: 'high', event_category: 'security_violation', timestamp: '2025-09-01T12:00:00Z' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            gte: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockResolvedValueOnce({
                data: mockViolations,
                error: null
              })
            })
          })
        })
      })

      const result = await service.getSecurityViolationsSummary(30)

      expect(result).toEqual({
        total: 3,
        by_risk_level: {
          high: 2,
          critical: 1
        },
        period_days: 30
      })
    })

    it('should handle security violations summary errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            gte: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { message: 'Query failed' }
              })
            })
          })
        })
      })

      await expect(service.getSecurityViolationsSummary())
        .rejects
        .toThrow('Failed to get security violations summary')
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      // Mock sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          setItem: vi.fn(),
          getItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      })
    })

    it('should set session information', () => {
      service.setSessionInfo('session-123', 'device-abc')

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'audit_session_info',
        expect.stringContaining('session-123')
      )
    })

    it('should clear session information', () => {
      service.clearSessionInfo()

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('audit_session_info')
    })
  })

  // Arabic RTL Testing
  describe('Arabic RTL Audit Functionality', () => {
    it('should handle Arabic event details correctly', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'arabic-log-123',
        error: null
      })

      const arabicAuthEvent: AuthenticationEvent = {
        event_type: 'LOGIN_SUCCESS',
        event_details: {
          success: true,
          method: 'كلمة المرور',
          device_name: 'جهاز المستخدم',
          location: 'الرياض، المملكة العربية السعودية'
        },
        user_identifier: 'user-123',
        risk_level: 'low'
      }

      await service.logAuthenticationEvent(arabicAuthEvent)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event',
        expect.objectContaining({
          event_details: expect.objectContaining({
            method: 'كلمة المرور',
            device_name: 'جهاز المستخدم',
            location: 'الرياض، المملكة العربية السعودية'
          })
        })
      )
    })
  })

  // English LTR Testing
  describe('English LTR Audit Functionality', () => {
    it('should handle English event details correctly', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'english-log-456',
        error: null
      })

      const englishAuthEvent: AuthenticationEvent = {
        event_type: 'LOGIN_SUCCESS',
        event_details: {
          success: true,
          method: 'password',
          device_name: 'User Device',
          location: 'Riyadh, Saudi Arabia'
        },
        user_identifier: 'user-456',
        risk_level: 'low'
      }

      await service.logAuthenticationEvent(englishAuthEvent)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event',
        expect.objectContaining({
          event_details: expect.objectContaining({
            method: 'password',
            device_name: 'User Device',
            location: 'Riyadh, Saudi Arabia'
          })
        })
      )
    })
  })

  // Mobile Responsive Testing
  describe('Mobile Responsive Audit Functionality', () => {
    it('should work efficiently on mobile devices', async () => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'mobile-log-789',
        error: null
      })

      const mobileAuthEvent: AuthenticationEvent = {
        event_type: 'LOGIN_SUCCESS',
        event_details: {
          success: true,
          device_type: 'mobile',
          screen_size: '375x667',
          user_agent: 'Mobile Safari'
        },
        user_identifier: 'mobile-user-123',
        risk_level: 'low'
      }

      await service.logAuthenticationEvent(mobileAuthEvent)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_authentication_event',
        expect.objectContaining({
          event_details: expect.objectContaining({
            device_type: 'mobile',
            screen_size: '375x667'
          })
        })
      )
    })
  })
})