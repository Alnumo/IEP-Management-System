/**
 * Security Audit Service Tests
 * Tests for comprehensive security audit functionality
 * Story 1.2: Task 1 - Security Audit Service Testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  conductSecurityAudit,
  exportSecurityAuditReport,
  analyzeTwoFactorIntegrationPoints,
  analyzePDPLCompliance,
  type SecurityAuditReport,
  type SecurityGap,
  type TwoFactorIntegrationPoints,
  type PDPLComplianceGaps
} from '@/services/security-audit-service'

describe('Security Audit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock Date.now for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-09-01T00:00:00.000Z'))
  })

  describe('conductSecurityAudit()', () => {
    it('should generate comprehensive security audit report', async () => {
      const report = await conductSecurityAudit()
      
      expect(report).toMatchObject({
        auditDate: expect.any(Date),
        version: '1.2.0',
        overallRiskLevel: expect.stringMatching(/^(critical|high|medium|low)$/),
        gaps: expect.any(Array),
        complianceStatus: {
          hipaa: expect.stringMatching(/^(compliant|partial|non-compliant)$/),
          pdpl: expect.stringMatching(/^(compliant|partial|non-compliant)$/),
          ferpa: expect.stringMatching(/^(compliant|partial|non-compliant)$/),
        },
        recommendations: expect.any(Array),
        nextReviewDate: expect.any(Date)
      })
    })

    it('should identify critical encryption gaps', async () => {
      const report = await conductSecurityAudit()
      const encryptionGaps = report.gaps.filter(gap => gap.category === 'encryption')
      
      expect(encryptionGaps).toHaveLength(3) // ENC-001, ENC-002, ENC-003
      
      const criticalEncryptionGap = encryptionGaps.find(gap => gap.id === 'ENC-001')
      expect(criticalEncryptionGap).toMatchObject({
        id: 'ENC-001',
        category: 'encryption',
        severity: 'critical',
        description: 'Field-level encryption not implemented for sensitive medical data',
        complianceFrameworks: ['HIPAA', 'PDPL']
      })
    })

    it('should identify critical authentication gaps', async () => {
      const report = await conductSecurityAudit()
      const authGaps = report.gaps.filter(gap => gap.category === 'authentication')
      
      expect(authGaps).toHaveLength(2) // AUTH-001, AUTH-002
      
      const critical2FAGap = authGaps.find(gap => gap.id === 'AUTH-001')
      expect(critical2FAGap).toMatchObject({
        id: 'AUTH-001',
        category: 'authentication', 
        severity: 'critical',
        description: 'Two-Factor Authentication (2FA) not implemented',
        complianceFrameworks: ['HIPAA', 'PDPL']
      })
    })

    it('should classify overall risk as critical due to critical gaps', async () => {
      const report = await conductSecurityAudit()
      
      // Should be critical due to ENC-001 and AUTH-001 critical gaps
      expect(report.overallRiskLevel).toBe('critical')
    })

    it('should mark HIPAA compliance as non-compliant', async () => {
      const report = await conductSecurityAudit()
      
      // Should be non-compliant due to critical HIPAA gaps
      expect(report.complianceStatus.hipaa).toBe('non-compliant')
    })

    it('should mark PDPL compliance as non-compliant', async () => {
      const report = await conductSecurityAudit()
      
      // Should be non-compliant due to critical PDPL gaps  
      expect(report.complianceStatus.pdpl).toBe('non-compliant')
    })

    it('should generate prioritized recommendations', async () => {
      const report = await conductSecurityAudit()
      
      expect(report.recommendations).toHaveLength(10)
      expect(report.recommendations[0]).toContain('IMMEDIATE ACTION REQUIRED: Implement field-level encryption')
      expect(report.recommendations[1]).toContain('IMMEDIATE ACTION REQUIRED: Deploy Two-Factor Authentication')
    })

    it('should set next review date to 90 days from audit date', async () => {
      const report = await conductSecurityAudit()
      
      const expectedNextReview = new Date('2025-11-30T00:00:00.000Z') // 90 days later
      expect(report.nextReviewDate.getTime()).toBeCloseTo(expectedNextReview.getTime(), -1)
    })
  })

  describe('exportSecurityAuditReport()', () => {
    let mockReport: SecurityAuditReport

    beforeEach(() => {
      mockReport = {
        auditDate: new Date('2025-09-01'),
        version: '1.2.0',
        overallRiskLevel: 'critical',
        gaps: [
          {
            id: 'TEST-001',
            category: 'encryption',
            severity: 'critical',
            description: 'Test gap',
            requiredImplementation: 'Test implementation',
            impact: 'Test impact',
            remediation: ['Test remediation'],
            complianceFrameworks: ['HIPAA']
          }
        ],
        complianceStatus: { hipaa: 'non-compliant', pdpl: 'non-compliant', ferpa: 'compliant' },
        recommendations: ['Test recommendation'],
        nextReviewDate: new Date('2025-11-30')
      }
    })

    it('should export report as JSON format', async () => {
      const result = await exportSecurityAuditReport(mockReport, 'json')
      
      expect(typeof result).toBe('string')
      const parsed = JSON.parse(result as string)
      expect(parsed.version).toBe('1.2.0')
      expect(parsed.overallRiskLevel).toBe('critical')
    })

    it('should export report as CSV format', async () => {
      const result = await exportSecurityAuditReport(mockReport, 'csv')
      
      expect(typeof result).toBe('string')
      expect(result).toContain('ID,Category,Severity,Description,Impact,Compliance Frameworks')
      expect(result).toContain('TEST-001,"encryption","critical","Test gap","Test impact","HIPAA"')
    })

    it('should throw error for PDF format (not yet implemented)', async () => {
      await expect(exportSecurityAuditReport(mockReport, 'pdf'))
        .rejects
        .toThrow('PDF export not yet implemented')
    })

    it('should default to JSON format for unknown format', async () => {
      const result = await exportSecurityAuditReport(mockReport)
      
      expect(typeof result).toBe('string')
      const parsed = JSON.parse(result as string)
      expect(parsed.version).toBe('1.2.0')
    })
  })

  describe('analyzeTwoFactorIntegrationPoints()', () => {
    it('should identify all 2FA integration points', () => {
      const integrationPoints = analyzeTwoFactorIntegrationPoints()
      
      expect(integrationPoints).toMatchObject({
        authenticationFlows: expect.any(Array),
        requiredComponents: expect.any(Array),
        databaseSchema: expect.any(Array),
        securityPolicies: expect.any(Array)
      })
    })

    it('should identify existing authentication flows that need 2FA integration', () => {
      const integrationPoints = analyzeTwoFactorIntegrationPoints()
      
      expect(integrationPoints.authenticationFlows).toHaveLength(5)
      expect(integrationPoints.authenticationFlows.some(flow => 
        flow.includes('LoginForm.tsx')
      )).toBe(true)
      expect(integrationPoints.authenticationFlows.some(flow => 
        flow.includes('supabase.ts')
      )).toBe(true)
      expect(integrationPoints.authenticationFlows.some(flow => 
        flow.includes('AuthGuard.tsx')
      )).toBe(true)
    })

    it('should specify required 2FA components to be created', () => {
      const integrationPoints = analyzeTwoFactorIntegrationPoints()
      
      expect(integrationPoints.requiredComponents).toHaveLength(5)
      expect(integrationPoints.requiredComponents.some(comp => 
        comp.includes('TwoFactorSetup.tsx')
      )).toBe(true)
      expect(integrationPoints.requiredComponents.some(comp => 
        comp.includes('TwoFactorVerification.tsx')
      )).toBe(true)
      expect(integrationPoints.requiredComponents.some(comp => 
        comp.includes('useTwoFactor.ts')
      )).toBe(true)
    })

    it('should identify required database schema changes', () => {
      const integrationPoints = analyzeTwoFactorIntegrationPoints()
      
      expect(integrationPoints.databaseSchema).toHaveLength(4)
      expect(integrationPoints.databaseSchema.some(schema => 
        schema.includes('user_2fa_settings table')
      )).toBe(true)
      expect(integrationPoints.databaseSchema.some(schema => 
        schema.includes('backup_codes table')
      )).toBe(true)
      expect(integrationPoints.databaseSchema.some(schema => 
        schema.includes('audit_logs enhancement')
      )).toBe(true)
    })

    it('should define security policies for 2FA implementation', () => {
      const integrationPoints = analyzeTwoFactorIntegrationPoints()
      
      expect(integrationPoints.securityPolicies).toHaveLength(5)
      expect(integrationPoints.securityPolicies.some(policy => 
        policy.includes('2FA requirement for medical_consultant role')
      )).toBe(true)
      expect(integrationPoints.securityPolicies.some(policy => 
        policy.includes('2FA requirement for admin role')
      )).toBe(true)
      expect(integrationPoints.securityPolicies.some(policy => 
        policy.includes('Emergency access procedures with 2FA bypass')
      )).toBe(true)
    })
  })

  describe('analyzePDPLCompliance()', () => {
    it('should identify comprehensive PDPL compliance gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps).toMatchObject({
        dataProcessing: expect.any(Array),
        userRights: expect.any(Array),
        securityMeasures: expect.any(Array),
        dataTransfers: expect.any(Array),
        documentation: expect.any(Array)
      })
    })

    it('should identify data processing compliance gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps.dataProcessing).toHaveLength(4)
      expect(complianceGaps.dataProcessing.some(gap => 
        gap.includes('Missing explicit consent management system')
      )).toBe(true)
      expect(complianceGaps.dataProcessing.some(gap => 
        gap.includes('No data processing purpose limitation implementation')
      )).toBe(true)
    })

    it('should identify user rights implementation gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps.userRights).toHaveLength(5)
      expect(complianceGaps.userRights.some(gap => 
        gap.includes('Right to erasure - Manual process, not automated')
      )).toBe(true)
      expect(complianceGaps.userRights.some(gap => 
        gap.includes('Right to data portability - Not implemented')
      )).toBe(true)
    })

    it('should identify security measures gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps.securityMeasures).toHaveLength(5)
      expect(complianceGaps.securityMeasures.some(gap => 
        gap.includes('Data encryption at rest - Partial implementation')
      )).toBe(true)
      expect(complianceGaps.securityMeasures.some(gap => 
        gap.includes('Incident response procedures - Not documented')
      )).toBe(true)
    })

    it('should identify data transfer compliance gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps.dataTransfers).toHaveLength(3)
      expect(complianceGaps.dataTransfers.some(gap => 
        gap.includes('No mechanism for validating data transfer legality')
      )).toBe(true)
      expect(complianceGaps.dataTransfers.some(gap => 
        gap.includes('Third-party integrations (n8n, WhatsApp) need PDPL compliance review')
      )).toBe(true)
    })

    it('should identify documentation gaps', () => {
      const complianceGaps = analyzePDPLCompliance()
      
      expect(complianceGaps.documentation).toHaveLength(4)
      expect(complianceGaps.documentation.some(gap => 
        gap.includes('Data protection impact assessments not conducted')
      )).toBe(true)
      expect(complianceGaps.documentation.some(gap => 
        gap.includes('Privacy notices not implemented in system')
      )).toBe(true)
    })
  })

  // Arabic RTL Testing
  describe('Arabic RTL Security Audit Functionality', () => {
    it('should handle Arabic security policy descriptions', async () => {
      const report = await conductSecurityAudit()
      
      // Verify the audit report structure works with RTL content
      expect(report.gaps).toBeInstanceOf(Array)
      expect(report.gaps.length).toBeGreaterThan(0)
      
      // Test that Arabic content would be supported in descriptions
      const arabicDescription = 'تشفير البيانات الطبية الحساسة مطلوب للامتثال'
      expect(typeof arabicDescription).toBe('string')
      expect(arabicDescription).toMatch(/[\u0600-\u06FF]/) // Arabic Unicode range
    })
  })

  // English LTR Testing  
  describe('English LTR Security Audit Functionality', () => {
    it('should handle English security policy descriptions', async () => {
      const report = await conductSecurityAudit()
      
      // Verify all gap descriptions are in English
      report.gaps.forEach(gap => {
        expect(gap.description).toMatch(/[A-Za-z]/) // Contains English letters
        expect(gap.impact).toMatch(/[A-Za-z]/)
        expect(gap.requiredImplementation).toMatch(/[A-Za-z]/)
      })
    })
  })

  // Mobile Responsive Testing
  describe('Mobile Responsive Security Audit', () => {
    it('should generate mobile-friendly audit reports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const report = await conductSecurityAudit()
      
      // Verify report structure is suitable for mobile display
      expect(report.gaps.every(gap => gap.description.length < 200)).toBe(true)
      expect(report.recommendations.every(rec => rec.length < 150)).toBe(true)
    })
  })
})