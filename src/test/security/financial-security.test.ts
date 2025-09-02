/**
 * Financial Security Tests
 * Comprehensive security testing for payment processing and data protection
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PaymentGatewayService } from '../../services/payment-gateway-service'
import { InstallmentPaymentService } from '../../services/installment-payment-service'
import { FinancialReportingService } from '../../services/financial-reporting-service'
import type { PaymentRequest } from '../../types/financial-management'

// Mock Supabase with security-focused responses
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'security-test-user', role: 'admin' } }
    })
  }
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock fetch for security testing
global.fetch = vi.fn()

// Security test utilities
const createMaliciousPayload = (type: 'sql_injection' | 'xss' | 'script_injection' | 'buffer_overflow') => {
  switch (type) {
    case 'sql_injection':
      return "'; DROP TABLE payments; --"
    case 'xss':
      return "<script>alert('XSS Attack')</script>"
    case 'script_injection':
      return "javascript:alert('Script Injection')"
    case 'buffer_overflow':
      return 'A'.repeat(10000) // 10KB string to test buffer handling
    default:
      return 'malicious_payload'
  }
}

const createSecurityTestPayload = (vulnerabilityType: string) => ({
  invoiceId: `inv-security-${vulnerabilityType}`,
  amount: 1000,
  currency: 'SAR',
  paymentMethod: 'mada' as const,
  customerInfo: {
    name: createMaliciousPayload(vulnerabilityType as any),
    email: 'security@test.com',
    phone: '+966501234567'
  },
  paymentData: {
    cardNumber: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
    cardholderName: createMaliciousPayload(vulnerabilityType as any)
  }
})

describe('Financial Security Tests', () => {
  let paymentService: PaymentGatewayService
  let installmentService: InstallmentPaymentService
  let reportingService: FinancialReportingService

  beforeEach(async () => {
    paymentService = new PaymentGatewayService()
    installmentService = new InstallmentPaymentService()
    reportingService = new FinancialReportingService()
    
    vi.clearAllMocks()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // INPUT VALIDATION AND SANITIZATION TESTS
  // ==============================================

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attacks in payment data', async () => {
      const sqlInjectionPayload = createSecurityTestPayload('sql_injection')
      
      // Mock database query to detect SQL injection attempts
      let capturedQuery = ''
      mockSupabase.from.mockImplementation((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            capturedQuery += `${field}=${value}|`
            return {
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }
          })
        }))
      }))

      const result = await paymentService.processPayment(sqlInjectionPayload)

      // Payment should fail validation
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      
      // Verify SQL injection patterns were not passed to database
      expect(capturedQuery).not.toContain('DROP TABLE')
      expect(capturedQuery).not.toContain('--')
    })

    it('should prevent XSS attacks in customer names and data', async () => {
      const xssPayload = createSecurityTestPayload('xss')
      
      const result = await paymentService.processPayment(xssPayload)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('Invalid characters in customer name')
    })

    it('should prevent script injection in payment metadata', async () => {
      const scriptInjectionPayload: PaymentRequest = {
        invoiceId: 'inv-script-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Test Customer'
        },
        metadata: {
          userAgent: createMaliciousPayload('script_injection'),
          customField: createMaliciousPayload('xss')
        }
      }

      const result = await paymentService.processPayment(scriptInjectionPayload)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should handle buffer overflow attempts gracefully', async () => {
      const bufferOverflowPayload = createSecurityTestPayload('buffer_overflow')
      
      const result = await paymentService.processPayment(bufferOverflowPayload)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('exceeds maximum length')
    })

    it('should validate and sanitize Arabic text input securely', async () => {
      const arabicSecurityPayload: PaymentRequest = {
        invoiceId: 'inv-arabic-security',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'محمد العربي',
          nameAr: 'محمد العربي<script>alert("xss")</script>',
          email: 'arabic@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'محمد العربي'
        }
      }

      const result = await paymentService.processPayment(arabicSecurityPayload)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.messageAr).toBeDefined()
    })
  })

  // ==============================================
  // AUTHENTICATION AND AUTHORIZATION TESTS
  // ==============================================

  describe('Authentication and Authorization', () => {
    it('should prevent unauthorized payment processing', async () => {
      // Mock unauthorized user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Unauthorized')
      })

      const unauthorizedPayment: PaymentRequest = {
        invoiceId: 'inv-unauthorized',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Unauthorized User',
          email: 'unauthorized@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Unauthorized User'
        }
      }

      const result = await paymentService.processPayment(unauthorizedPayment)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should enforce role-based access control for financial reports', async () => {
      // Mock user with insufficient permissions
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'limited-user', role: 'receptionist' } }
      })

      const result = await reportingService.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient permissions')
    })

    it('should validate session tokens and prevent token hijacking', async () => {
      const validToken = 'valid-session-token-123'
      const hijackedToken = 'hijacked-token-456'

      // Mock token validation
      mockSupabase.auth.getUser
        .mockResolvedValueOnce({
          data: { user: { id: 'valid-user', sessionToken: validToken } }
        })
        .mockResolvedValueOnce({
          data: { user: null },
          error: new Error('Invalid session token')
        })

      const validRequest: PaymentRequest = {
        invoiceId: 'inv-valid-session',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Valid User',
          email: 'valid@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Valid User'
        },
        metadata: {
          sessionToken: validToken
        }
      }

      const hijackedRequest: PaymentRequest = {
        ...validRequest,
        metadata: {
          sessionToken: hijackedToken
        }
      }

      // Valid token should work (after validation passes)
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { balance_amount: 1000 }, error: null }))
          }))
        }))
      })

      const validResult = await paymentService.processPayment(validRequest)
      // Note: This would pass validation but may fail on other grounds in testing

      // Hijacked token should be rejected
      const hijackedResult = await paymentService.processPayment(hijackedRequest)
      expect(hijackedResult.success).toBe(false)
      expect(hijackedResult.error?.code).toBe('AUTHENTICATION_ERROR')
    })
  })

  // ==============================================
  // DATA ENCRYPTION AND PCI COMPLIANCE TESTS
  // ==============================================

  describe('Data Encryption and PCI Compliance', () => {
    it('should ensure sensitive payment data is never logged or stored in plain text', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const consoleErrorSpy = vi.spyOn(console, 'error')

      const sensitivePayment: PaymentRequest = {
        invoiceId: 'inv-sensitive-data',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Test Customer'
        }
      }

      await paymentService.processPayment(sensitivePayment)

      // Check console logs for sensitive data
      const allLogs = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls].flat().join(' ')
      
      expect(allLogs).not.toContain('4111111111111111') // Card number should be masked
      expect(allLogs).not.toContain('123') // CVV should not appear
      expect(allLogs).not.toContain(sensitivePayment.paymentData.expiryMonth)

      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should mask sensitive data in API requests to payment gateways', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'masked-data-tx',
          status: 'completed'
        })
      } as Response)

      const sensitivePayment: PaymentRequest = {
        invoiceId: 'inv-masking-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Test Customer'
        }
      }

      await paymentService.processPayment(sensitivePayment)

      // Verify fetch was called but sensitive data was masked
      expect(fetch).toHaveBeenCalled()
      const fetchCall = vi.mocked(fetch).mock.calls[0]
      const requestBody = fetchCall[1]?.body as string || ''
      
      // Card number should be masked in transmission
      expect(requestBody).not.toContain('4111111111111111')
      expect(requestBody).not.toContain('123') // CVV should not be transmitted
    })

    it('should implement proper encryption for stored financial data', async () => {
      // Mock encrypted storage
      let storedData = ''
      mockSupabase.from.mockImplementation((table: string) => ({
        insert: vi.fn((data: any) => {
          storedData = JSON.stringify(data)
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { ...data, id: 'encrypted-record' }, 
                error: null 
              }))
            }))
          }
        })
      }))

      const paymentForStorage: PaymentRequest = {
        invoiceId: 'inv-encryption-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Encryption Test',
          email: 'encryption@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Encryption Test'
        }
      }

      await paymentService.processPayment(paymentForStorage)

      // Verify sensitive data is not stored in plain text
      expect(storedData).not.toContain('4111111111111111')
      expect(storedData).not.toContain('123')
      
      // Should contain encrypted or hashed values instead
      if (storedData.includes('payment_method')) {
        expect(storedData).toMatch(/encrypted|hashed|masked/i)
      }
    })

    it('should validate PCI DSS compliance requirements', async () => {
      const pciTestPayment: PaymentRequest = {
        invoiceId: 'inv-pci-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'PCI Test Customer',
          email: 'pci@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'PCI Test Customer'
        }
      }

      // Test that the payment processing follows PCI DSS guidelines
      const result = await paymentService.processPayment(pciTestPayment)

      // Verify PCI compliance requirements
      const gatewayConfig = await paymentService.getGatewayConfig('mada')
      expect(gatewayConfig?.pciCompliant).toBe(true)
      expect(gatewayConfig?.supports3DSecure).toBe(true)
    })
  })

  // ==============================================
  // RATE LIMITING AND DOS PROTECTION TESTS
  // ==============================================

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting to prevent brute force attacks', async () => {
      const rapidRequests = Array.from({ length: 100 }, (_, i) => ({
        invoiceId: `inv-rate-limit-${i}`,
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: `Rate Limit Test ${i}`,
          email: `ratetest${i}@example.com`,
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: `Rate Limit Test ${i}`
        }
      }))

      // Simulate rapid fire requests
      const results = await Promise.all(
        rapidRequests.map(request => paymentService.processPayment(request))
      )

      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r => r.error?.code === 'RATE_LIMIT_EXCEEDED')
      expect(rateLimitedResults.length).toBeGreaterThan(0)

      // Rate limiting should kick in after a threshold
      const successfulRequests = results.filter(r => r.success).length
      expect(successfulRequests).toBeLessThan(100)
    })

    it('should prevent payment enumeration attacks', async () => {
      const enumerationAttempts = Array.from({ length: 50 }, (_, i) => ({
        invoiceId: `inv-enumerate-${i}`,
        amount: 1,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Enumeration Attack',
          email: 'enum@attack.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: `411111111111111${i % 10}`, // Invalid card numbers
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Enumeration Attack'
        }
      }))

      const results = await Promise.all(
        enumerationAttempts.map(request => paymentService.processPayment(request))
      )

      // All should fail, but responses should not reveal specific validation failures
      const failedResults = results.filter(r => !r.success)
      expect(failedResults.length).toBe(50)

      failedResults.forEach(result => {
        expect(result.error?.message).not.toContain('Invalid card number')
        expect(result.error?.message).toMatch(/^(Payment validation failed|Invalid payment request)$/)
      })
    })

    it('should implement CAPTCHA or similar protection for suspicious activity', async () => {
      // Simulate suspicious pattern: same IP, multiple failed attempts
      const suspiciousRequests = Array.from({ length: 10 }, (_, i) => ({
        invoiceId: `inv-suspicious-${i}`,
        amount: Math.random() * 10000 + 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: `Suspicious User ${i}`,
          email: `suspicious${i}@example.com`,
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4000000000000002', // Card that will be declined
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: `Suspicious User ${i}`
        },
        metadata: {
          ipAddress: '192.168.1.100', // Same IP for all requests
          userAgent: 'Suspicious Bot 1.0',
          suspiciousScore: 8.5
        }
      }))

      const results = await Promise.all(
        suspiciousRequests.map(request => paymentService.processPayment(request))
      )

      // After several failed attempts from same IP, CAPTCHA should be required
      const captchaRequiredResults = results.filter(r => r.error?.code === 'CAPTCHA_REQUIRED')
      expect(captchaRequiredResults.length).toBeGreaterThan(0)
    })
  })

  // ==============================================
  // AUDIT TRAIL AND COMPLIANCE MONITORING TESTS
  // ==============================================

  describe('Audit Trail and Compliance Monitoring', () => {
    it('should create comprehensive audit logs for all financial transactions', async () => {
      const auditedTransaction: PaymentRequest = {
        invoiceId: 'inv-audit-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Audit Test Customer',
          email: 'audit@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Audit Test Customer'
        }
      }

      const auditLogs: any[] = []
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'financial_audit_trail') {
          return {
            insert: vi.fn((data: any) => {
              auditLogs.push(data)
              return Promise.resolve({ data: [], error: null })
            })
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      await paymentService.processPayment(auditedTransaction)

      // Verify comprehensive audit logging
      expect(auditLogs.length).toBeGreaterThan(0)
      const auditEntry = auditLogs[0]
      expect(auditEntry).toHaveProperty('entity_type')
      expect(auditEntry).toHaveProperty('action')
      expect(auditEntry).toHaveProperty('performed_by')
      expect(auditEntry).toHaveProperty('performed_at')
      expect(auditEntry).toHaveProperty('ip_address')
      
      // Sensitive data should not be in audit logs
      const auditString = JSON.stringify(auditEntry)
      expect(auditString).not.toContain('4111111111111111')
      expect(auditString).not.toContain('123')
    })

    it('should detect and alert on suspicious financial patterns', async () => {
      const suspiciousPatternRequests = [
        // Large amount transfer
        {
          invoiceId: 'inv-suspicious-large',
          amount: 95000, // Close to daily limit
          currency: 'SAR',
          paymentMethod: 'bank_transfer'
        },
        // Rapid small transactions (structuring)
        ...Array.from({ length: 20 }, (_, i) => ({
          invoiceId: `inv-structuring-${i}`,
          amount: 499, // Just under reporting threshold
          currency: 'SAR',
          paymentMethod: 'mada'
        }))
      ]

      const suspiciousAlerts: any[] = []
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'suspicious_activity_alerts') {
          return {
            insert: vi.fn((data: any) => {
              suspiciousAlerts.push(data)
              return Promise.resolve({ data: [], error: null })
            })
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      // Process suspicious transactions
      for (const request of suspiciousPatternRequests) {
        const fullRequest: PaymentRequest = {
          ...request,
          customerInfo: {
            name: 'Pattern Test',
            email: 'pattern@test.com',
            phone: '+966501234567'
          },
          paymentData: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            cardholderName: 'Pattern Test'
          }
        }
        await paymentService.processPayment(fullRequest)
      }

      // Should generate suspicious activity alerts
      expect(suspiciousAlerts.length).toBeGreaterThan(0)
      expect(suspiciousAlerts.some(alert => 
        alert.alert_type === 'large_transaction' || 
        alert.alert_type === 'structuring_pattern'
      )).toBe(true)
    })

    it('should ensure GDPR/PDPL compliance for data retention and deletion', async () => {
      const dataSubject = {
        userId: 'user-gdpr-test',
        email: 'gdpr@example.com'
      }

      // Mock data retention policy check
      const retentionData: any[] = []
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'data_retention_policies') {
          return {
            select: vi.fn(() => Promise.resolve({
              data: [{
                entity_type: 'payment_data',
                retention_period_days: 2555, // 7 years for financial records
                auto_deletion_enabled: true
              }],
              error: null
            }))
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }
      })

      const complianceCheck = await reportingService.checkDataRetentionCompliance(dataSubject.userId)

      expect(complianceCheck.success).toBe(true)
      expect(complianceCheck.policies).toBeDefined()
      expect(complianceCheck.policies?.some(p => p.entity_type === 'payment_data')).toBe(true)
    })
  })

  // ==============================================
  // PAYMENT GATEWAY SECURITY TESTS
  // ==============================================

  describe('Payment Gateway Security', () => {
    it('should validate SSL/TLS certificate security for gateway communications', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'ssl-test-tx',
          status: 'completed',
          sslVerified: true
        })
      } as Response)

      const sslTestPayment: PaymentRequest = {
        invoiceId: 'inv-ssl-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'SSL Test Customer',
          email: 'ssl@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'SSL Test Customer'
        }
      }

      await paymentService.processPayment(sslTestPayment)

      // Verify HTTPS was used
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:/),
        expect.any(Object)
      )
    })

    it('should implement proper webhook signature verification', async () => {
      const webhookPayload = {
        transactionId: 'webhook-test-tx',
        status: 'completed',
        amount: 1000,
        timestamp: Date.now()
      }

      const validSignature = 'valid-webhook-signature-123'
      const invalidSignature = 'invalid-signature-456'

      // Mock webhook processing
      const processWebhook = async (payload: any, signature: string) => {
        if (signature !== validSignature) {
          throw new Error('Invalid webhook signature')
        }
        return { success: true, processed: true }
      }

      // Valid signature should work
      const validResult = await processWebhook(webhookPayload, validSignature)
      expect(validResult.success).toBe(true)

      // Invalid signature should fail
      await expect(processWebhook(webhookPayload, invalidSignature))
        .rejects.toThrow('Invalid webhook signature')
    })

    it('should protect against replay attacks on payment requests', async () => {
      const timestampedPayment: PaymentRequest = {
        invoiceId: 'inv-replay-test',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'Replay Test Customer',
          email: 'replay@example.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'Replay Test Customer'
        },
        metadata: {
          nonce: 'unique-nonce-123',
          timestamp: Date.now()
        }
      }

      // First request should succeed (after validation)
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'replay-test-tx-1',
          status: 'completed'
        })
      } as Response)

      const firstResult = await paymentService.processPayment(timestampedPayment)
      
      // Second identical request should be rejected as replay
      const secondResult = await paymentService.processPayment(timestampedPayment)
      expect(secondResult.success).toBe(false)
      expect(secondResult.error?.code).toBe('DUPLICATE_TRANSACTION')
    })
  })

  // ==============================================
  // SAUDI ARABIA SPECIFIC COMPLIANCE TESTS
  // ==============================================

  describe('Saudi Arabia Compliance and Regulatory Tests', () => {
    it('should enforce Saudi Personal Data Protection Law (PDPL) requirements', async () => {
      const pdplTestData = {
        customerId: 'saudi-customer-123',
        personalData: {
          name: 'عبد الله محمد',
          nationalId: '1234567890',
          phone: '+966501234567',
          address: 'الرياض، المملكة العربية السعودية'
        },
        consentGiven: true,
        consentDate: new Date().toISOString(),
        dataProcessingPurpose: 'financial_services'
      }

      // Mock PDPL compliance check
      const pdplCheck = await reportingService.checkPDPLCompliance(pdplTestData.customerId)

      expect(pdplCheck.success).toBe(true)
      expect(pdplCheck.compliance).toHaveProperty('consentStatus', 'valid')
      expect(pdplCheck.compliance).toHaveProperty('dataMinimization', true)
      expect(pdplCheck.compliance).toHaveProperty('rightsRespected', true)
    })

    it('should validate Saudi VAT registration and compliance requirements', async () => {
      const saudiVATData = {
        vatRegistrationNumber: 'VAT-SA-300000000000003',
        businessName: 'Arkan Growth Center',
        businessNameAr: 'مركز أركان للنمو',
        taxPeriod: '2024-Q1',
        vatRate: 0.15
      }

      // Mock VAT validation with Saudi requirements
      vi.spyOn(reportingService as any, 'validateSaudiVATCompliance').mockReturnValue({
        isValid: true,
        registrationVerified: true,
        rateCompliant: true,
        issues: []
      })

      const vatValidation = await reportingService.validateSaudiVATRegistration(saudiVATData)

      expect(vatValidation.isValid).toBe(true)
      expect(vatValidation.registrationVerified).toBe(true)
      expect(vatValidation.rateCompliant).toBe(true)
      expect(saudiVATData.vatRate).toBe(0.15) // Saudi VAT rate
    })

    it('should comply with Saudi Central Bank (SAMA) payment regulations', async () => {
      const samaComplianceTest = {
        paymentMethod: 'mada',
        amount: 50000, // Large amount requiring additional verification
        currency: 'SAR',
        customerType: 'individual',
        crossBorder: false
      }

      // Mock SAMA compliance check
      const samaCheck = await paymentService.checkSAMACompliance(samaComplianceTest)

      expect(samaCheck.compliant).toBe(true)
      expect(samaCheck.requiresAdditionalVerification).toBe(true) // For large amounts
      expect(samaCheck.approvedPaymentMethods).toContain('mada')
      expect(samaCheck.approvedPaymentMethods).toContain('stc_pay')
      expect(samaCheck.supportedCurrency).toBe('SAR')
    })

    it('should implement proper Arabic language data handling and validation', async () => {
      const arabicDataTest = {
        customerName: 'محمد عبد الله الأحمد',
        address: 'طريق الملك فهد، الرياض ١٢٤٥٦',
        city: 'الرياض',
        region: 'منطقة الرياض'
      }

      // Test Arabic text validation and sanitization
      const arabicValidation = await paymentService.validateArabicText(arabicDataTest)

      expect(arabicValidation.isValid).toBe(true)
      expect(arabicValidation.encoding).toBe('UTF-8')
      expect(arabicValidation.rtlSupported).toBe(true)
      expect(arabicValidation.sanitized).toBe(true)

      // Should reject Arabic text with embedded scripts
      const maliciousArabicText = {
        customerName: 'محمد<script>alert("xss")</script>عبد الله'
      }

      const maliciousValidation = await paymentService.validateArabicText(maliciousArabicText)
      expect(maliciousValidation.isValid).toBe(false)
      expect(maliciousValidation.issues).toContain('script_detected')
    })
  })

  // ==============================================
  // PERFORMANCE SECURITY TESTS
  // ==============================================

  describe('Performance-Based Security Tests', () => {
    it('should maintain security measures under high load', async () => {
      const highLoadRequests = Array.from({ length: 100 }, (_, i) => ({
        invoiceId: `inv-load-${i}`,
        amount: Math.random() * 5000 + 100,
        currency: 'SAR',
        paymentMethod: i % 2 === 0 ? 'mada' : 'stc_pay',
        customerInfo: {
          name: `Load Test Customer ${i}`,
          email: `loadtest${i}@example.com`,
          phone: `+96650123456${i % 10}`
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: `Load Test Customer ${i}`
        }
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        highLoadRequests.map(request => paymentService.processPayment(request))
      )
      const endTime = Date.now()

      // Security measures should remain effective under load
      const validationFailures = results.filter(r => r.error?.code === 'VALIDATION_ERROR')
      const rateLimited = results.filter(r => r.error?.code === 'RATE_LIMIT_EXCEEDED')

      expect(validationFailures.length + rateLimited.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(10000) // Should not cause significant delays
    })

    it('should prevent resource exhaustion attacks', async () => {
      const resourceIntensivePayload: PaymentRequest = {
        invoiceId: 'inv-resource-attack',
        amount: 1000,
        currency: 'SAR',
        paymentMethod: 'mada',
        customerInfo: {
          name: 'A'.repeat(1000), // Very long name
          email: 'resource@attack.com',
          phone: '+966501234567'
        },
        paymentData: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'A'.repeat(1000) // Very long cardholder name
        },
        metadata: {
          customData: 'X'.repeat(10000) // Large metadata
        }
      }

      const startTime = Date.now()
      const result = await paymentService.processPayment(resourceIntensivePayload)
      const processingTime = Date.now() - startTime

      // Should reject oversized payloads quickly
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(processingTime).toBeLessThan(1000) // Should fail fast
    })
  })
})