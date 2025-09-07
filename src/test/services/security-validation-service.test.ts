/**
 * Security Validation Service Tests
 * Story 1.2: Security Compliance & Data Protection - AC: 6
 * Comprehensive security testing and penetration testing validation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import SecurityValidationService from '../../services/security-validation-service'
import { auditService } from '../../services/audit-service'
import { SecurityService } from '../../services/security-service'
import RLSValidationService from '../../services/rls-validation-service'
import DataRetentionAutomationService from '../../services/data-retention-automation'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

vi.mock('../../services/audit-service', () => ({
  auditService: {
    logSecurityEvent: vi.fn(),
    getSecurityViolationsSummary: vi.fn()
  }
}))

vi.mock('../../services/security-service', () => ({
  SecurityService: {
    is2FAEnabled: vi.fn()
  }
}))

vi.mock('../../services/rls-validation-service', () => ({
  default: {
    generateRLSValidationReport: vi.fn()
  }
}))

vi.mock('../../services/data-retention-automation', () => ({
  default: {
    validateRetentionConfiguration: vi.fn()
  }
}))

import { supabase } from '../../lib/supabase'

describe('SecurityValidationService', () => {
  const mockGetUser = supabase.auth.getUser as Mock
  const mockLogSecurityEvent = auditService.logSecurityEvent as Mock
  const mockGetSecurityViolationsSummary = auditService.getSecurityViolationsSummary as Mock
  const mockIs2FAEnabled = SecurityService.is2FAEnabled as Mock
  const mockGenerateRLSValidationReport = RLSValidationService.generateRLSValidationReport as Mock
  const mockValidateRetentionConfiguration = DataRetentionAutomationService.validateRetentionConfiguration as Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful responses
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    mockLogSecurityEvent.mockResolvedValue('log-id-123')

    mockGetSecurityViolationsSummary.mockResolvedValue({
      total: 0,
      by_risk_level: { high: 0, medium: 0, low: 0 },
      period_days: 30
    })

    mockIs2FAEnabled.mockResolvedValue(true)

    mockGenerateRLSValidationReport.mockResolvedValue({
      testSuite: 'RLS_VALIDATION_COMPREHENSIVE',
      executedAt: new Date().toISOString(),
      totalTests: 10,
      passedTests: 10,
      failedTests: 0,
      results: [],
      overallStatus: 'PASSED'
    })

    mockValidateRetentionConfiguration.mockResolvedValue({
      valid: true,
      issues: [],
      recommendations: ['Data retention configuration is compliant']
    })
  })

  describe('Comprehensive Security Validation', () => {
    it('should execute comprehensive security validation successfully', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report).toBeDefined()
      expect(report.reportId).toMatch(/^SEC-\d+-[a-z0-9]+$/)
      expect(report.testSuite).toBe('COMPREHENSIVE_SECURITY_VALIDATION')
      expect(report.summary.totalTests).toBeGreaterThan(0)
      expect(report.results).toBeInstanceOf(Array)
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.complianceStatus).toBeDefined()
    })

    it('should include all security test categories', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const categories = new Set(report.results.map(r => r.category))
      
      expect(categories.has('authentication')).toBe(true)
      expect(categories.has('authorization')).toBe(true)
      expect(categories.has('encryption')).toBe(true)
      expect(categories.has('input_validation')).toBe(true)
      expect(categories.has('compliance')).toBe(true)
      expect(categories.has('network')).toBe(true)
      expect(categories.has('data_protection')).toBe(true)
    })

    it('should log security validation execution in audit trail', async () => {
      await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(mockLogSecurityEvent).toHaveBeenCalledWith({
        violation_type: 'SECURITY_VALIDATION_EXECUTED',
        event_details: expect.objectContaining({
          report_id: expect.stringMatching(/^SEC-\d+-[a-z0-9]+$/),
          overall_score: expect.any(Number),
          risk_level: expect.stringMatching(/^(critical|high|medium|low)$/),
          total_tests: expect.any(Number),
          failed_tests: expect.any(Number),
          compliance_status: expect.any(Object)
        })
      })
    })

    it('should calculate risk level correctly based on failures', async () => {
      // Mock a critical failure
      mockGenerateRLSValidationReport.mockResolvedValueOnce({
        testSuite: 'RLS_VALIDATION_COMPREHENSIVE',
        executedAt: new Date().toISOString(),
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        results: [
          {
            table: 'medical_records',
            policy: 'test_policy',
            operation: 'SELECT',
            userRole: 'test',
            expectedAccess: true,
            actualAccess: false,
            passed: false
          }
        ],
        overallStatus: 'FAILED'
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.riskLevel).toMatch(/^(critical|high|medium|low)$/)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Authentication Security Tests', () => {
    it('should validate 2FA implementation', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const tfaTest = report.results.find(r => r.testName === '2FA Implementation')
      expect(tfaTest).toBeDefined()
      expect(tfaTest?.category).toBe('authentication')
      expect(tfaTest?.severity).toBe('high')
      expect(tfaTest?.status).toBe('passed')
    })

    it('should test password strength requirements', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const passwordTest = report.results.find(r => r.testName === 'Password Strength Requirements')
      expect(passwordTest).toBeDefined()
      expect(passwordTest?.category).toBe('authentication')
      expect(passwordTest?.severity).toBe('high')
    })

    it('should handle 2FA testing without authenticated user', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const tfaTest = report.results.find(r => r.testName === '2FA Implementation')
      expect(tfaTest?.status).toBe('skipped')
      expect(tfaTest?.description).toContain('Cannot test 2FA without authenticated user')
    })

    it('should handle 2FA test failures gracefully', async () => {
      mockIs2FAEnabled.mockRejectedValueOnce(new Error('2FA service unavailable'))

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const tfaTest = report.results.find(r => r.testName === '2FA Implementation')
      expect(tfaTest?.status).toBe('failed')
      expect(tfaTest?.details?.error).toBe('2FA service unavailable')
    })
  })

  describe('Authorization and RLS Tests', () => {
    it('should validate RLS policies', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const rlsTest = report.results.find(r => r.testName === 'Row Level Security Policies')
      expect(rlsTest).toBeDefined()
      expect(rlsTest?.category).toBe('authorization')
      expect(rlsTest?.severity).toBe('critical')
      expect(rlsTest?.status).toBe('passed')
    })

    it('should test role-based access control', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const rbacTest = report.results.find(r => r.testName === 'Role-Based Access Control')
      expect(rbacTest).toBeDefined()
      expect(rbacTest?.details?.roles).toContain('admin')
      expect(rbacTest?.details?.roles).toContain('therapist')
    })

    it('should handle RLS validation failures', async () => {
      mockGenerateRLSValidationReport.mockResolvedValueOnce({
        testSuite: 'RLS_VALIDATION_COMPREHENSIVE',
        executedAt: new Date().toISOString(),
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        results: [],
        overallStatus: 'FAILED',
        recommendations: ['Fix RLS policy issues']
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const rlsTest = report.results.find(r => r.testName === 'Row Level Security Policies')
      expect(rlsTest?.status).toBe('failed')
      expect(rlsTest?.remediation).toContain('Fix RLS policy issues')
    })
  })

  describe('Encryption Security Tests', () => {
    it('should validate AES-256 encryption implementation', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const encryptionTest = report.results.find(r => r.testName === 'AES-256 Medical Data Encryption')
      expect(encryptionTest).toBeDefined()
      expect(encryptionTest?.category).toBe('encryption')
      expect(encryptionTest?.severity).toBe('critical')
      expect(encryptionTest?.status).toBe('passed')
      expect(encryptionTest?.details?.algorithm).toBe('AES-256-GCM')
    })

    it('should validate encryption key management', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const keyMgmtTest = report.results.find(r => r.testName === 'Encryption Key Management')
      expect(keyMgmtTest).toBeDefined()
      expect(keyMgmtTest?.category).toBe('encryption')
      expect(keyMgmtTest?.severity).toBe('critical')
    })

    it('should test data at rest and in transit encryption', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const atRestTest = report.results.find(r => r.testName === 'Data at Rest Encryption')
      const inTransitTest = report.results.find(r => r.testName === 'Data in Transit Encryption')

      expect(atRestTest).toBeDefined()
      expect(inTransitTest).toBeDefined()
      expect(atRestTest?.details?.medicalRecords).toBe(true)
      expect(inTransitTest?.details?.httpsEnforced).toBe(true)
    })
  })

  describe('Compliance Tests', () => {
    it('should validate audit trail implementation', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const auditTest = report.results.find(r => r.testName === 'Audit Trail Implementation')
      expect(auditTest).toBeDefined()
      expect(auditTest?.category).toBe('compliance')
      expect(auditTest?.severity).toBe('critical')
      expect(auditTest?.status).toBe('passed')
    })

    it('should validate data retention compliance', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const retentionTest = report.results.find(r => r.testName === 'Data Retention Compliance')
      expect(retentionTest).toBeDefined()
      expect(retentionTest?.category).toBe('compliance')
      expect(retentionTest?.status).toBe('passed')
    })

    it('should handle retention configuration issues', async () => {
      mockValidateRetentionConfiguration.mockResolvedValueOnce({
        valid: false,
        issues: ['Medical records retention period too short'],
        recommendations: ['Increase retention to 7 years']
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const retentionTest = report.results.find(r => r.testName === 'Data Retention Compliance')
      expect(retentionTest?.status).toBe('failed')
      expect(retentionTest?.remediation).toContain('Medical records retention period too short')
    })

    it('should test data privacy controls', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      const privacyTest = report.results.find(r => r.testName === 'Data Privacy Controls')
      expect(privacyTest).toBeDefined()
      expect(privacyTest?.details?.rightToAccess).toBe(true)
      expect(privacyTest?.details?.rightToDeletion).toBe(true)
    })
  })

  describe('Compliance Status Checking', () => {
    it('should correctly assess HIPAA compliance', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.complianceStatus.hipaa).toBe(true)
    })

    it('should correctly assess PDPL compliance', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.complianceStatus.pdpl).toBe(true)
    })

    it('should correctly assess GDPR compliance', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.complianceStatus.gdpr).toBe(true)
    })

    it('should fail compliance when critical tests fail', async () => {
      // Mock failed RLS validation to fail HIPAA compliance
      mockGenerateRLSValidationReport.mockResolvedValueOnce({
        testSuite: 'RLS_VALIDATION_COMPREHENSIVE',
        executedAt: new Date().toISOString(),
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        results: [],
        overallStatus: 'FAILED'
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.complianceStatus.hipaa).toBe(false)
    })
  })

  describe('Recommendation Generation', () => {
    it('should generate appropriate recommendations for failed tests', async () => {
      // Mock some failures
      mockGenerateRLSValidationReport.mockResolvedValueOnce({
        testSuite: 'RLS_VALIDATION_COMPREHENSIVE',
        executedAt: new Date().toISOString(),
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        results: [],
        overallStatus: 'FAILED',
        recommendations: ['Fix critical RLS issues']
      })

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.recommendations.length).toBeGreaterThan(0)
    })

    it('should provide positive recommendations when all tests pass', async () => {
      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.recommendations).toContain(expect.stringContaining('Security posture is strong'))
    })
  })

  describe('Error Handling', () => {
    it('should handle framework errors gracefully', async () => {
      mockGetSecurityViolationsSummary.mockRejectedValueOnce(new Error('Audit service unavailable'))

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report).toBeDefined()
      expect(report.results.some(r => r.status === 'failed')).toBe(true)
    })

    it('should continue testing even if individual tests fail', async () => {
      mockIs2FAEnabled.mockRejectedValue(new Error('2FA unavailable'))
      mockGenerateRLSValidationReport.mockRejectedValue(new Error('RLS unavailable'))

      const report = await SecurityValidationService.executeComprehensiveSecurityValidation()

      expect(report.summary.totalTests).toBeGreaterThan(0)
      expect(report.results.some(r => r.status === 'passed')).toBe(true)
    })
  })

  describe('Report Persistence', () => {
    it('should save penetration test report successfully', async () => {
      const mockReport = {
        reportId: 'test-report-123',
        executedAt: new Date().toISOString(),
        executedBy: 'SecurityValidationService',
        testSuite: 'COMPREHENSIVE_SECURITY_VALIDATION',
        environment: 'development' as const,
        overallScore: 85,
        riskLevel: 'low' as const,
        summary: { totalTests: 20, passed: 18, failed: 1, warnings: 1, skipped: 0 },
        results: [],
        recommendations: ['Test recommendations'],
        complianceStatus: { hipaa: true, pdpl: true, gdpr: true }
      }

      await expect(
        SecurityValidationService.savePenetrationTestReport(mockReport)
      ).resolves.not.toThrow()
    })

    it('should handle save errors gracefully', async () => {
      const mockInsert = vi.fn().mockRejectedValue(new Error('Database unavailable'))
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: mockInsert
      } as any)

      const mockReport = {
        reportId: 'test-report-123',
        executedAt: new Date().toISOString(),
        executedBy: 'SecurityValidationService',
        testSuite: 'COMPREHENSIVE_SECURITY_VALIDATION',
        environment: 'development' as const,
        overallScore: 85,
        riskLevel: 'low' as const,
        summary: { totalTests: 20, passed: 18, failed: 1, warnings: 1, skipped: 0 },
        results: [],
        recommendations: [],
        complianceStatus: { hipaa: true, pdpl: true, gdpr: true }
      }

      // Should not throw even if save fails
      await expect(
        SecurityValidationService.savePenetrationTestReport(mockReport)
      ).resolves.not.toThrow()
    })
  })
})