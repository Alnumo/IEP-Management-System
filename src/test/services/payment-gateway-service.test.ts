/**
 * Payment Gateway Service Tests
 * Comprehensive testing for MADA, STC Pay, and Bank Transfer integrations
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PaymentGatewayService } from '../../services/payment-gateway-service'
import type { PaymentRequest, PaymentResult, CustomerInfo } from '../../types/financial-management'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
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
}))

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test')
vi.stubEnv('MADA_API_URL', 'https://api.test.mada.com/v1')
vi.stubEnv('STC_PAY_API_URL', 'https://api.test.stcpay.com.sa/v2')
vi.stubEnv('PAYTABS_API_URL', 'https://secure.paytabs.sa/payment/request')
vi.stubEnv('STRIPE_API_URL', 'https://api.stripe.com/v1')
vi.stubEnv('PAYTABS_PROFILE_ID', 'test-profile-id')
vi.stubEnv('PAYTABS_SERVER_KEY', 'test-server-key')
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_123')

// Mock fetch for external API calls
global.fetch = vi.fn()

describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService
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
      },
      {
        gatewayId: 'paytabs',
        apiKey: 'test-paytabs-key',
        secretKey: 'test-paytabs-secret',
        merchantId: 'test-paytabs-merchant',
        profileId: 'test-profile-id',
        serverKey: 'test-server-key',
        environment: 'test'
      },
      {
        gatewayId: 'stripe',
        apiKey: 'sk_test_123',
        secretKey: 'test-stripe-secret',
        merchantId: 'test-stripe-merchant',
        publishableKey: 'pk_test_123',
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
      customer: {
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
      customer: {
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
      customer: {
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

    const validPayTabsRequest: PaymentRequest = {
      invoiceId: 'inv-pt-123',
      amount: 500,
      currency: 'SAR',
      paymentMethod: 'mada',
      customer: {
        name: 'Fatima Al-Zahra',
        nameAr: 'فاطمة الزهراء',
        email: 'fatima@example.com',
        phone: '+966501234570'
      },
      paymentData: {
        cardNumber: '5123456789012346',
        expiryMonth: '12',
        expiryYear: '2026',
        cvv: '123',
        cardholderName: 'Fatima Al-Zahra'
      },
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback'
    }

    const validStripeRequest: PaymentRequest = {
      invoiceId: 'inv-stripe-456',
      amount: 1000,
      currency: 'SAR',
      paymentMethod: 'visa',
      customer: {
        name: 'Abdullah Malik',
        nameAr: 'عبدالله مالك',
        email: 'abdullah@example.com',
        phone: '+966501234571'
      },
      paymentData: {
        cardNumber: '4242424242424242',
        expiryMonth: '08',
        expiryYear: '2027',
        cvv: '424',
        cardholderName: 'Abdullah Malik'
      },
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback'
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
        customer: {
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
        customer: {
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

    // ==============================================
    // PAYTABS INTEGRATION TESTS
    // ==============================================

    it('should process PayTabs payment successfully', async () => {
      const mockPayTabsResponse = {
        tran_ref: 'TST2409061234567890',
        tran_type: 'Sale',
        cart_id: 'inv-pt-123',
        cart_description: 'Payment for invoice inv-pt-123',
        cart_currency: 'SAR',
        cart_amount: '500.00',
        customer_details: {
          name: 'Fatima Al-Zahra',
          email: 'fatima@example.com',
          phone: '+966501234570'
        },
        payment_result: {
          response_status: 'A',
          response_code: '100',
          response_message: 'Approved',
          response_message_ar: 'تمت الموافقة',
          transaction_time: new Date().toISOString(),
          acquirer_message: 'Approved',
          acquirer_rrn: 'RRN123456789',
          acquirer_code: '00'
        },
        payment_info: {
          payment_method: 'CreditCard',
          card_first_six: '512345',
          card_last_four: '2346',
          card_scheme: 'MasterCard',
          payment_description: 'MADA Card Payment'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayTabsResponse)
      } as Response)

      const result = await service.processPayment(validPayTabsRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('TST2409061234567890')
      expect(result.gatewayResponse).toBeDefined()
    })

    it('should handle PayTabs 3D Secure requirement', async () => {
      const mockPayTabs3DResponse = {
        tran_ref: 'TST2409061234567891',
        redirect_url: 'https://secure.paytabs.sa/3ds/redirect/TST2409061234567891',
        payment_result: {
          response_status: 'H',
          response_code: '777',
          response_message: '3-D Secure Required',
          response_message_ar: 'مطلوب التحقق ثلاثي الأبعاد'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayTabs3DResponse)
      } as Response)

      const result = await service.processPayment(validPayTabsRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('requires_action')
      expect(result.actionRequired?.type).toBe('3d_secure')
      expect(result.actionRequired?.url).toBe('https://secure.paytabs.sa/3ds/redirect/TST2409061234567891')
    })

    it('should handle PayTabs payment failures', async () => {
      const mockPayTabsFailure = {
        tran_ref: 'TST2409061234567892',
        payment_result: {
          response_status: 'D',
          response_code: '481',
          response_message: 'Transaction declined',
          response_message_ar: 'تم رفض المعاملة',
          acquirer_message: 'Insufficient funds'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayTabsFailure)
      } as Response)

      const result = await service.processPayment(validPayTabsRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('CARD_DECLINED')
      expect(result.error?.messageAr).toBe('تم رفض المعاملة')
    })

    // ==============================================
    // STRIPE INTEGRATION TESTS
    // ==============================================

    it('should process Stripe payment successfully', async () => {
      const mockStripeResponse = {
        id: 'pi_1234567890ABCDEF',
        object: 'payment_intent',
        amount: 100000, // 1000 SAR in cents
        currency: 'sar',
        status: 'succeeded',
        charges: {
          data: [{
            id: 'ch_1234567890ABCDEF',
            amount: 100000,
            currency: 'sar',
            status: 'succeeded',
            payment_method_details: {
              card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 8,
                exp_year: 2027
              }
            },
            receipt_url: 'https://pay.stripe.com/receipts/acct_123/ch_1234567890ABCDEF'
          }]
        },
        client_secret: 'pi_1234567890ABCDEF_secret_123',
        created: Math.floor(Date.now() / 1000),
        metadata: {
          invoiceId: 'inv-stripe-456',
          studentId: 'student-123'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStripeResponse)
      } as Response)

      const result = await service.processPayment(validStripeRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('pi_1234567890ABCDEF')
      expect(result.gatewayResponse).toBeDefined()
    })

    it('should handle Stripe payment requiring authentication', async () => {
      const mockStripeAuthRequired = {
        id: 'pi_1234567890AUTHREQ',
        status: 'requires_action',
        next_action: {
          type: 'use_stripe_sdk',
          use_stripe_sdk: {
            type: 'three_d_secure_redirect',
            stripe_js: 'https://js.stripe.com/v3/',
            source: 'src_1234567890'
          }
        },
        client_secret: 'pi_1234567890AUTHREQ_secret_123'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStripeAuthRequired)
      } as Response)

      const result = await service.processPayment(validStripeRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('requires_action')
      expect(result.actionRequired?.type).toBe('3d_secure')
      expect(result.transactionId).toBe('pi_1234567890AUTHREQ')
    })

    it('should handle Stripe payment failures', async () => {
      const mockStripeError = {
        error: {
          type: 'card_error',
          code: 'card_declined',
          decline_code: 'generic_decline',
          message: 'Your card was declined.',
          param: 'card'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () => Promise.resolve(mockStripeError)
      } as Response)

      const result = await service.processPayment(validStripeRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('CARD_DECLINED')
    })

    // ==============================================
    // PCI-DSS COMPLIANCE TESTS
    // ==============================================

    it('should validate card number using Luhn algorithm', async () => {
      const invalidCardRequest = {
        ...validMadaRequest,
        paymentData: {
          ...validMadaRequest.paymentData,
          cardNumber: '4111111111111112' // Invalid Luhn check
        }
      }

      const result = await service.processPayment(invalidCardRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('card number')
    })

    it('should validate card expiry date', async () => {
      const expiredCardRequest = {
        ...validMadaRequest,
        paymentData: {
          ...validMadaRequest.paymentData,
          expiryMonth: '01',
          expiryYear: '2023' // Expired
        }
      }

      const result = await service.processPayment(expiredCardRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('expired')
    })

    it('should validate CVV format', async () => {
      const invalidCvvRequest = {
        ...validMadaRequest,
        paymentData: {
          ...validMadaRequest.paymentData,
          cvv: '12' // Too short
        }
      }

      const result = await service.processPayment(invalidCvvRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('CVV')
    })

    it('should mask sensitive data in error logs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Payment processing failed'))

      await service.processPayment(validMadaRequest)

      const errorLogs = consoleSpy.mock.calls.flat().join(' ')
      expect(errorLogs).not.toContain('4111111111111111') // Card number should be masked
      expect(errorLogs).not.toContain('123') // CVV should not appear in logs
      
      consoleSpy.mockRestore()
    })

    // ==============================================
    // GATEWAY FALLBACK TESTS
    // ==============================================

    it('should fallback to secondary gateway on primary failure', async () => {
      const fallbackRequest = {
        ...validMadaRequest,
        amount: 500 // Amount suitable for multiple gateways
      }

      // Mock primary gateway failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service temporarily unavailable' })
      } as Response)

      // Mock fallback gateway success
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactionId: 'fallback-tx-123',
          status: 'completed'
        })
      } as Response)

      const result = await service.processPayment(fallbackRequest)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('fallback-tx-123')
      expect(fetch).toHaveBeenCalledTimes(2) // Primary + fallback
    })

    it('should respect gateway priority order', async () => {
      const sarRequest = {
        ...validMadaRequest,
        currency: 'SAR' as const,
        amount: 1000
      }

      const gatewaySpy = vi.spyOn(service, 'selectOptimalGateway')
      gatewaySpy.mockResolvedValue('paytabs') // PayTabs should be preferred for SAR

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tran_ref: 'priority-test-123',
          payment_result: { response_status: 'A' }
        })
      } as Response)

      await service.processPayment(sarRequest)

      expect(gatewaySpy).toHaveBeenCalledWith('SAR', 1000, 'mada')
      
      gatewaySpy.mockRestore()
    })

    it('should implement exponential backoff for retries', async () => {
      const retryRequest = { ...validMadaRequest }
      
      // Mock temporary failures followed by success
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'Service unavailable' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            transactionId: 'retry-success-123',
            status: 'completed'
          })
        } as Response)

      const startTime = Date.now()
      const result = await service.processPayment(retryRequest)
      const executionTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('retry-success-123')
      expect(fetch).toHaveBeenCalledTimes(3) // Original + 2 retries
      expect(executionTime).toBeGreaterThan(1000) // Should have delays
    })

    it('should fail gracefully after maximum retry attempts', async () => {
      const maxRetryRequest = { ...validMadaRequest }
      
      // Mock persistent failures
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Persistent failure' })
      } as Response)

      const result = await service.processPayment(maxRetryRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PROCESSING_ERROR')
      expect(fetch).toHaveBeenCalledTimes(4) // Original + 3 retries (max)
    })

    // ==============================================
    // MULTI-CURRENCY SUPPORT TESTS
    // ==============================================

    it('should handle USD payments via Stripe', async () => {
      const usdRequest = {
        ...validStripeRequest,
        currency: 'USD' as const,
        amount: 100 // $100 USD
      }

      const mockStripeUsdResponse = {
        id: 'pi_usd_123456789',
        currency: 'usd',
        amount: 10000, // $100 in cents
        status: 'succeeded'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStripeUsdResponse)
      } as Response)

      const result = await service.processPayment(usdRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
    })

    it('should reject unsupported currencies for Saudi gateways', async () => {
      const eurRequest = {
        ...validMadaRequest,
        currency: 'EUR' as const
      }

      const result = await service.processPayment(eurRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toContain('currency')
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
        customer: {
          ...validStcPayRequest.customer,
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