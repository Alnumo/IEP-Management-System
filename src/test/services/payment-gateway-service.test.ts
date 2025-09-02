/**
 * Payment Gateway Service Tests
 * Comprehensive testing for MADA, STC Pay, and Bank Transfer integrations
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PaymentGatewayService } from '../../services/payment-gateway-service'
import type { PaymentRequest, PaymentResult } from '../../types/financial-management'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test')
vi.stubEnv('MADA_API_URL', 'https://api.test.mada.com/v1')
vi.stubEnv('STC_PAY_API_URL', 'https://api.test.stcpay.com.sa/v2')

// Mock fetch for external API calls
global.fetch = vi.fn()

describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService
  
  beforeEach(async () => {
    // Mock credentials data
    const mockCredentials = [
      {
        gatewayId: 'mada',
        apiKey: 'test-mada-key',
        secretKey: 'test-mada-secret',
        merchantId: 'test-mada-merchant',
        environment: 'test'
      },
      {
        gatewayId: 'stc_pay',
        apiKey: 'test-stc-key',
        secretKey: 'test-stc-secret',
        merchantId: 'test-stc-merchant',
        environment: 'test'
      }
    ]

    const mockCredentialsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: mockCredentials, error: null }))
      }))
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'payment_gateway_credentials') return mockCredentialsQuery
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
    })

    service = new PaymentGatewayService()
    // Wait for credentials to initialize
    await new Promise(resolve => setTimeout(resolve, 100))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // PAYMENT PROCESSING TESTS
  // ==============================================

  describe('processPayment', () => {
    const validMadaRequest: PaymentRequest = {
      invoiceId: 'inv-123',
      amount: 1000,
      currency: 'SAR',
      paymentMethod: 'mada',
      customerInfo: {
        name: 'Ahmed Ali',
        nameAr: 'أحمد علي',
        email: 'ahmed@example.com',
        phone: '+966501234567'
      },
      paymentData: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'Ahmed Ali'
      }
    }

    const validStcPayRequest: PaymentRequest = {
      invoiceId: 'inv-456',
      amount: 500,
      currency: 'SAR',
      paymentMethod: 'stc_pay',
      customerInfo: {
        name: 'Sara Ahmed',
        nameAr: 'سارة أحمد',
        email: 'sara@example.com',
        phone: '+966501234568'
      },
      paymentData: {
        phoneNumber: '+966501234568',
        otp: '123456'
      }
    }

    const validBankTransferRequest: PaymentRequest = {
      invoiceId: 'inv-789',
      amount: 2000,
      currency: 'SAR',
      paymentMethod: 'bank_transfer',
      customerInfo: {
        name: 'Omar Hassan',
        nameAr: 'عمر حسن',
        email: 'omar@example.com',
        phone: '+966501234569'
      },
      paymentData: {
        bankCode: 'RJHISARI',
        accountNumber: '1234567890',
        accountName: 'Omar Hassan'
      }
    }

    it('should process MADA payment successfully', async () => {
      // Mock successful MADA API response
      const mockMadaResponse = {
        transactionId: 'mada-tx-123',
        status: 'completed',
        authCode: 'AUTH123',
        rrn: 'RRN123456',
        processingFee: 25.00,
        acquirerId: 'MADA_ACQ'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMadaResponse)
      } as Response)

      const result = await service.processPayment(validMadaRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('mada-tx-123')
      expect(result.processingFee).toBe(25.00)
      expect(result.gatewayData).toBeDefined()
    })

    it('should process STC Pay payment successfully', async () => {
      // Mock successful STC Pay API response
      const mockStcResponse = {
        transactionId: 'stc-tx-456',
        status: 'completed',
        referenceId: 'STC-REF-456',
        processingFee: 2.00
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStcResponse)
      } as Response)

      const result = await service.processPayment(validStcPayRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('stc-tx-456')
      expect(result.processingFee).toBe(2.00)
    })

    it('should process Bank Transfer payment successfully', async () => {
      // Mock successful bank transfer response
      const mockBankResponse = {
        transactionId: 'bank-tx-789',
        status: 'pending',
        referenceNumber: 'BANK-REF-789',
        estimatedProcessingTime: 300,
        processingFee: 5.00
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBankResponse)
      } as Response)

      const result = await service.processPayment(validBankTransferRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('pending')
      expect(result.transactionId).toBe('bank-tx-789')
      expect(result.processingFee).toBe(5.00)
    })

    it('should handle invalid payment requests', async () => {
      const invalidRequest: PaymentRequest = {
        invoiceId: '',
        amount: 0,
        currency: 'USD', // Invalid currency for Saudi Arabia
        paymentMethod: 'mada',
        customerInfo: {
          name: '',
          email: 'invalid-email',
          phone: '123' // Invalid phone format
        },
        paymentData: {}
      }

      const result = await service.processPayment(invalidRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.messageAr).toBe('طلب دفع غير صحيح')
    })

    it('should handle unsupported payment methods', async () => {
      const unsupportedRequest: PaymentRequest = {
        ...validMadaRequest,
        paymentMethod: 'paypal' as any
      }

      const result = await service.processPayment(unsupportedRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('GATEWAY_NOT_SUPPORTED')
      expect(result.error?.messageAr).toBe('طريقة الدفع غير مدعومة')
    })

    it('should handle MADA payment failures', async () => {
      // Mock failed MADA API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'CARD_DECLINED',
          message: 'Card was declined by the bank',
          messageAr: 'تم رفض البطاقة من البنك'
        })
      } as Response)

      const result = await service.processPayment(validMadaRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('CARD_DECLINED')
      expect(result.error?.messageAr).toBe('تم رفض البطاقة من البنك')
    })

    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network timeout'))

      const result = await service.processPayment(validMadaRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('PROCESSING_ERROR')
      expect(result.error?.messageAr).toBe('فشل في معالجة الدفع')
    })

    // Arabic language test
    it('should handle Arabic customer names and data correctly', async () => {
      const arabicRequest: PaymentRequest = {
        ...validMadaRequest,
        customerInfo: {
          name: 'Mohammed bin Rashid',
          nameAr: 'محمد بن راشد',
          email: 'mohammed@example.com',
          phone: '+966501234567'
        }
      }

      const mockResponse = {
        transactionId: 'mada-tx-ar',
        status: 'completed',
        authCode: 'AUTH456'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const result = await service.processPayment(arabicRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
    })

    // Mobile responsive test (payment should work on mobile)
    it('should process mobile payments correctly', async () => {
      const mobileRequest: PaymentRequest = {
        ...validStcPayRequest,
        metadata: {
          deviceType: 'mobile',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          ipAddress: '192.168.1.100'
        }
      }

      const mockResponse = {
        transactionId: 'stc-mobile-123',
        status: 'completed'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const result = await service.processPayment(mobileRequest)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('stc-mobile-123')
    })
  })

  // ==============================================
  // REFUND PROCESSING TESTS
  // ==============================================

  describe('processRefund', () => {
    it('should process MADA refund successfully', async () => {
      const refundRequest = {
        originalTransactionId: 'mada-tx-123',
        amount: 500,
        reason: 'Customer request',
        reasonAr: 'طلب من العميل'
      }

      const mockRefundResponse = {
        refundId: 'refund-123',
        status: 'completed',
        amount: 500,
        processingFee: 0
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefundResponse)
      } as Response)

      const result = await service.processRefund(refundRequest)

      expect(result.success).toBe(true)
      expect(result.refundId).toBe('refund-123')
      expect(result.status).toBe('completed')
      expect(result.amount).toBe(500)
    })

    it('should handle partial refunds for MADA', async () => {
      const partialRefundRequest = {
        originalTransactionId: 'mada-tx-123',
        amount: 250, // Half of original 500
        reason: 'Partial service cancellation',
        reasonAr: 'إلغاء جزئي للخدمة'
      }

      const mockRefundResponse = {
        refundId: 'partial-refund-123',
        status: 'completed',
        amount: 250,
        remainingRefundableAmount: 250
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefundResponse)
      } as Response)

      const result = await service.processRefund(partialRefundRequest)

      expect(result.success).toBe(true)
      expect(result.amount).toBe(250)
      expect(result.remainingRefundableAmount).toBe(250)
    })

    it('should reject refunds for bank transfers', async () => {
      const bankTransferRefundRequest = {
        originalTransactionId: 'bank-tx-789',
        amount: 1000,
        reason: 'Service cancellation'
      }

      const result = await service.processRefund(bankTransferRefundRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('REFUND_NOT_SUPPORTED')
    })

    it('should handle refund failures', async () => {
      const refundRequest = {
        originalTransactionId: 'mada-tx-invalid',
        amount: 1000,
        reason: 'Test refund'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'TRANSACTION_NOT_FOUND',
          message: 'Original transaction not found',
          messageAr: 'المعاملة الأصلية غير موجودة'
        })
      } as Response)

      const result = await service.processRefund(refundRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TRANSACTION_NOT_FOUND')
      expect(result.error?.messageAr).toBe('المعاملة الأصلية غير موجودة')
    })
  })

  // ==============================================
  // PAYMENT STATUS QUERIES
  // ==============================================

  describe('getPaymentStatus', () => {
    it('should retrieve payment status successfully', async () => {
      const mockStatusResponse = {
        transactionId: 'mada-tx-123',
        status: 'completed',
        amount: 1000,
        currency: 'SAR',
        completedAt: new Date().toISOString()
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatusResponse)
      } as Response)

      const result = await service.getPaymentStatus('mada-tx-123')

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.amount).toBe(1000)
    })

    it('should handle pending payment status', async () => {
      const mockPendingResponse = {
        transactionId: 'bank-tx-789',
        status: 'pending',
        amount: 2000,
        estimatedCompletionTime: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingResponse)
      } as Response)

      const result = await service.getPaymentStatus('bank-tx-789')

      expect(result.success).toBe(true)
      expect(result.status).toBe('pending')
      expect(result.estimatedCompletionTime).toBeDefined()
    })

    it('should handle transaction not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found'
        })
      } as Response)

      const result = await service.getPaymentStatus('invalid-tx-id')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TRANSACTION_NOT_FOUND')
    })
  })

  // ==============================================
  // GATEWAY CONFIGURATION TESTS
  // ==============================================

  describe('Gateway Configuration', () => {
    it('should return supported payment methods for Saudi Arabia', async () => {
      const supportedMethods = await service.getSupportedPaymentMethods('SAR')

      expect(supportedMethods).toContain('mada')
      expect(supportedMethods).toContain('stc_pay')
      expect(supportedMethods).toContain('bank_transfer')
      expect(supportedMethods).not.toContain('paypal') // Not supported in Saudi Arabia
    })

    it('should return gateway configuration for each payment method', async () => {
      const madaConfig = await service.getGatewayConfig('mada')

      expect(madaConfig?.name).toBe('MADA')
      expect(madaConfig?.nameAr).toBe('مدى')
      expect(madaConfig?.supportedCurrencies).toContain('SAR')
      expect(madaConfig?.pciCompliant).toBe(true)
      expect(madaConfig?.supports3DSecure).toBe(true)
    })

    it('should validate payment amounts against gateway limits', async () => {
      // Test MADA limits (5 - 50,000 SAR)
      expect(await service.isAmountValid('mada', 3)).toBe(false) // Below minimum
      expect(await service.isAmountValid('mada', 1000)).toBe(true) // Valid
      expect(await service.isAmountValid('mada', 60000)).toBe(false) // Above maximum

      // Test STC Pay limits (1 - 10,000 SAR)
      expect(await service.isAmountValid('stc_pay', 0.5)).toBe(false) // Below minimum
      expect(await service.isAmountValid('stc_pay', 500)).toBe(true) // Valid
      expect(await service.isAmountValid('stc_pay', 15000)).toBe(false) // Above maximum
    })

    it('should calculate processing fees correctly', async () => {
      // MADA: 2.5% with min 2 SAR, max 50 SAR
      expect(await service.calculateProcessingFee('mada', 100)).toBe(2.5) // 2.5% but minimum is 2 SAR
      expect(await service.calculateProcessingFee('mada', 1000)).toBe(25) // 2.5%
      expect(await service.calculateProcessingFee('mada', 3000)).toBe(50) // Max cap of 50 SAR

      // STC Pay: Fixed 2 SAR
      expect(await service.calculateProcessingFee('stc_pay', 100)).toBe(2)
      expect(await service.calculateProcessingFee('stc_pay', 5000)).toBe(2)

      // Bank Transfer: Fixed 5 SAR
      expect(await service.calculateProcessingFee('bank_transfer', 1000)).toBe(5)
      expect(await service.calculateProcessingFee('bank_transfer', 10000)).toBe(5)
    })
  })

  // ==============================================
  // SECURITY TESTS
  // ==============================================

  describe('Security', () => {
    it('should validate card data format', async () => {
      const invalidCardRequest: PaymentRequest = {
        ...validMadaRequest,
        paymentData: {
          cardNumber: '1234', // Invalid card number
          expiryMonth: '13', // Invalid month
          expiryYear: '2020', // Expired year
          cvv: '12', // Invalid CVV length
          cardholderName: ''
        }
      }

      const result = await service.processPayment(invalidCardRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should mask sensitive data in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      await service.processPayment(validMadaRequest)

      // Check that sensitive data is not logged
      const logs = consoleSpy.mock.calls.flat().join(' ')
      expect(logs).not.toContain('4111111111111111') // Card number should be masked
      expect(logs).not.toContain('123') // CVV should not appear in logs
      
      consoleSpy.mockRestore()
    })

    it('should validate phone number format for Saudi Arabia', async () => {
      const invalidPhoneRequest: PaymentRequest = {
        ...validStcPayRequest,
        customerInfo: {
          ...validStcPayRequest.customerInfo,
          phone: '+1234567890' // Non-Saudi number
        }
      }

      const result = await service.processPayment(invalidPhoneRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should enforce rate limiting for payment attempts', async () => {
      // Mock multiple rapid payment attempts
      const promises = Array.from({ length: 10 }, () => 
        service.processPayment(validMadaRequest)
      )

      const results = await Promise.all(promises)
      
      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r => 
        r.error?.code === 'RATE_LIMIT_EXCEEDED'
      )
      
      expect(rateLimitedResults.length).toBeGreaterThan(0)
    })
  })

  // ==============================================
  // EDGE CASES AND ERROR HANDLING
  // ==============================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing gateway credentials', async () => {
      // Create service with no credentials
      const serviceWithoutCredentials = new PaymentGatewayService()
      
      // Mock empty credentials
      const mockEmptyCredentials = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }
      mockSupabase.from.mockReturnValue(mockEmptyCredentials)

      const result = await serviceWithoutCredentials.processPayment(validMadaRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PROCESSING_ERROR')
    })

    it('should handle API timeout scenarios', async () => {
      // Mock API timeout
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const result = await service.processPayment(validMadaRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PROCESSING_ERROR')
    })

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null) // Malformed response
      } as Response)

      const result = await service.processPayment(validMadaRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PROCESSING_ERROR')
    })

    it('should handle currency conversion edge cases', async () => {
      const nonSARRequest: PaymentRequest = {
        ...validMadaRequest,
        currency: 'USD', // Should be rejected for Saudi gateways
        amount: 100
      }

      const result = await service.processPayment(nonSARRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should handle very large payment amounts', async () => {
      const largeAmountRequest: PaymentRequest = {
        ...validBankTransferRequest,
        amount: 2000000 // Above bank transfer limit
      }

      const result = await service.processPayment(largeAmountRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should handle duplicate transaction detection', async () => {
      // Mock successful first payment
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'duplicate-test-123',
          status: 'completed'
        })
      } as Response)

      const firstResult = await service.processPayment(validMadaRequest)
      expect(firstResult.success).toBe(true)

      // Mock duplicate detection on second identical payment
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: 'DUPLICATE_TRANSACTION',
          message: 'Duplicate transaction detected',
          messageAr: 'تم اكتشاف معاملة مكررة'
        })
      } as Response)

      const secondResult = await service.processPayment(validMadaRequest)

      expect(secondResult.success).toBe(false)
      expect(secondResult.error?.code).toBe('DUPLICATE_TRANSACTION')
    })
  })

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should handle concurrent payment processing efficiently', async () => {
      // Mock successful responses for all gateways
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'concurrent-test',
          status: 'completed'
        })
      } as Response)

      const startTime = Date.now()
      
      // Process multiple concurrent payments
      const promises = [
        service.processPayment(validMadaRequest),
        service.processPayment(validStcPayRequest),
        service.processPayment(validBankTransferRequest),
        service.processPayment({ ...validMadaRequest, invoiceId: 'inv-concurrent-2' }),
        service.processPayment({ ...validStcPayRequest, invoiceId: 'inv-concurrent-3' })
      ]

      const results = await Promise.all(promises)
      const executionTime = Date.now() - startTime

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000)
    })

    it('should efficiently validate large batches of payment data', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        ...validMadaRequest,
        invoiceId: `inv-batch-${i}`,
        amount: Math.random() * 10000
      }))

      const startTime = Date.now()
      
      const validationResults = await Promise.all(
        largeBatch.map(request => service.validatePaymentRequest(request))
      )
      
      const executionTime = Date.now() - startTime

      expect(validationResults.length).toBe(100)
      expect(executionTime).toBeLessThan(1000) // Should validate 100 requests within 1 second
    })
  })
})