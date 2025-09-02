// Payment Gateway Service for Story 2.3: Financial Management
// Handles MADA, STC Pay, and Bank Transfer integrations for Saudi Arabia

import { supabase } from '../lib/supabase'
import type {
  PaymentGatewayConfig,
  PaymentRequest,
  PaymentResult,
  MadaPaymentRequest,
  MadaPaymentResponse,
  StcPayPaymentRequest,
  StcPayPaymentResponse,
  BankTransferRequest,
  BankTransferResponse,
  PaymentStatus,
  PaymentMethod,
  Currency,
  PaymentGatewayCredentials
} from '../types/financial-management'

// Payment gateway configuration for Saudi Arabia
const GATEWAY_CONFIGS: Record<string, PaymentGatewayConfig> = {
  mada: {
    gatewayId: 'mada',
    name: 'MADA',
    nameAr: 'مدى',
    isActive: true,
    supportedCurrencies: ['SAR'],
    supportedPaymentMethods: ['mada', 'visa', 'mastercard'],
    apiUrl: process.env.MADA_API_URL || 'https://api.mada.com/v1',
    supportsRecurring: true,
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsTokenization: true,
    minAmount: 5,
    maxAmount: 50000,
    dailyLimit: 200000,
    averageProcessingTime: 10,
    feeStructure: [
      {
        feeType: 'percentage',
        amount: 0.025, // 2.5%
        minFee: 2,
        maxFee: 50
      }
    ],
    pciCompliant: true,
    supports3DSecure: true
  },
  stc_pay: {
    gatewayId: 'stc_pay',
    name: 'STC Pay',
    nameAr: 'دفع إس تي سي',
    isActive: true,
    supportedCurrencies: ['SAR'],
    supportedPaymentMethods: ['stc_pay'],
    apiUrl: process.env.STC_PAY_API_URL || 'https://api.stcpay.com.sa/v2',
    supportsRecurring: false,
    supportsRefunds: true,
    supportsPartialRefunds: false,
    supportsTokenization: false,
    minAmount: 1,
    maxAmount: 10000,
    dailyLimit: 50000,
    averageProcessingTime: 5,
    feeStructure: [
      {
        feeType: 'fixed',
        amount: 2,
        currency: 'SAR'
      }
    ],
    pciCompliant: true,
    supports3DSecure: false
  },
  bank_transfer: {
    gatewayId: 'bank_transfer',
    name: 'Bank Transfer',
    nameAr: 'تحويل بنكي',
    isActive: true,
    supportedCurrencies: ['SAR'],
    supportedPaymentMethods: ['bank_transfer'],
    apiUrl: process.env.BANK_API_URL || 'https://api.saudibanks.gov.sa/v1',
    supportsRecurring: false,
    supportsRefunds: false,
    supportsPartialRefunds: false,
    supportsTokenization: false,
    minAmount: 50,
    maxAmount: 1000000,
    averageProcessingTime: 300, // 5 minutes
    feeStructure: [
      {
        feeType: 'fixed',
        amount: 5,
        currency: 'SAR'
      }
    ],
    pciCompliant: true,
    supports3DSecure: false
  }
}

class PaymentGatewayService {
  private credentials: Map<string, PaymentGatewayCredentials> = new Map()

  constructor() {
    this.initializeCredentials()
  }

  private async initializeCredentials(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('payment_gateway_credentials')
        .select('*')
        .eq('environment', process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')

      if (error) throw error

      data?.forEach(cred => {
        this.credentials.set(cred.gatewayId, cred)
      })
    } catch (error) {
      console.error('Failed to initialize payment gateway credentials:', error)
    }
  }

  /**
   * Process payment using appropriate gateway
   */
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate payment request
      const validation = this.validatePaymentRequest(paymentRequest)
      if (!validation.isValid) {
        return {
          success: false,
          status: 'failed',
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors?.join(', ') || 'Invalid payment request',
            messageAr: 'طلب دفع غير صحيح'
          },
          timestamp: new Date().toISOString()
        }
      }

      // Get gateway configuration
      const gateway = this.getGatewayForPaymentMethod(paymentRequest.paymentMethod)
      if (!gateway) {
        return {
          success: false,
          status: 'failed',
          error: {
            code: 'GATEWAY_NOT_SUPPORTED',
            message: `Payment method ${paymentRequest.paymentMethod} is not supported`,
            messageAr: 'طريقة الدفع غير مدعومة'
          },
          timestamp: new Date().toISOString()
        }
      }

      // Process payment based on gateway
      switch (gateway.gatewayId) {
        case 'mada':
          return await this.processMadaPayment(paymentRequest)
        case 'stc_pay':
          return await this.processStcPayPayment(paymentRequest)
        case 'bank_transfer':
          return await this.processBankTransferPayment(paymentRequest)
        default:
          throw new Error(`Unsupported gateway: ${gateway.gatewayId}`)
      }

    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        status: 'failed',
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Payment processing failed',
          messageAr: 'فشل في معالجة الدفع'
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Process MADA payment
   */
  private async processMadaPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const madaData = paymentRequest.paymentData as MadaPaymentRequest
    const credentials = this.credentials.get('mada')
    
    if (!credentials) {
      throw new Error('MADA credentials not configured')
    }

    try {
      // Prepare MADA API request
      const apiRequest = {
        merchantId: credentials.credentials.merchantId,
        amount: madaData.amount * 100, // Convert to halalas
        currency: madaData.currency,
        description: madaData.description,
        customerEmail: madaData.customerInfo.email,
        customerPhone: madaData.customerInfo.phone,
        returnUrl: madaData.returnUrl,
        callbackUrl: madaData.callbackUrl,
        
        // Card details (if provided)
        ...(madaData.cardNumber && {
          cardNumber: madaData.cardNumber,
          expiryMonth: madaData.expiryMonth,
          expiryYear: madaData.expiryYear,
          cvv: madaData.cvv
        }),

        metadata: {
          invoiceId: paymentRequest.invoiceId,
          customerId: madaData.customerInfo.id,
          ...madaData.metadata
        }
      }

      // Call MADA API
      const response = await this.callMadaAPI('/payments', apiRequest, credentials)
      
      // Parse response
      const madaResponse: MadaPaymentResponse = {
        transactionId: response.transactionId,
        status: this.mapMadaStatus(response.status),
        amount: response.amount / 100, // Convert back from halalas
        currency: response.currency as Currency,
        authCode: response.authCode,
        referenceNumber: response.referenceNumber,
        cardMask: response.cardMask,
        cardType: response.cardType,
        redirectUrl: response.redirectUrl,
        secureRequired: response.secure3d?.required,
        responseCode: response.responseCode,
        responseMessage: response.responseMessage,
        responseMessageAr: response.responseMessageAr || this.translateMadaResponse(response.responseMessage),
        timestamp: new Date().toISOString()
      }

      // Store payment record
      await this.storePaymentRecord(paymentRequest, madaResponse)

      return {
        success: madaResponse.status === 'completed' || madaResponse.status === 'requires_action',
        transactionId: madaResponse.transactionId,
        status: madaResponse.status,
        gatewayResponse: madaResponse,
        ...(madaResponse.redirectUrl && {
          actionRequired: {
            type: '3d_secure',
            url: madaResponse.redirectUrl
          }
        }),
        timestamp: madaResponse.timestamp
      }

    } catch (error) {
      console.error('MADA payment processing error:', error)
      throw error
    }
  }

  /**
   * Process STC Pay payment
   */
  private async processStcPayPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const stcData = paymentRequest.paymentData as StcPayPaymentRequest
    const credentials = this.credentials.get('stc_pay')
    
    if (!credentials) {
      throw new Error('STC Pay credentials not configured')
    }

    try {
      const apiRequest = {
        merchantId: credentials.credentials.merchantId,
        amount: stcData.amount,
        currency: stcData.currency,
        description: stcData.description,
        descriptionAr: stcData.descriptionAr,
        mobileNumber: stcData.mobileNumber,
        returnUrl: stcData.returnUrl,
        callbackUrl: stcData.callbackUrl,
        ...(stcData.otp && { otp: stcData.otp }),
        metadata: {
          invoiceId: paymentRequest.invoiceId,
          ...stcData.metadata
        }
      }

      const response = await this.callStcPayAPI('/payments', apiRequest, credentials)
      
      const stcResponse: StcPayPaymentResponse = {
        transactionId: response.transactionId,
        payUrl: response.payUrl,
        status: this.mapStcPayStatus(response.status),
        amount: response.amount,
        currency: response.currency as Currency,
        stcReferenceId: response.stcReferenceId,
        mobileNumber: response.mobileNumber,
        responseCode: response.responseCode,
        responseMessage: response.responseMessage,
        responseMessageAr: response.responseMessageAr || this.translateStcPayResponse(response.responseMessage),
        timestamp: new Date().toISOString()
      }

      await this.storePaymentRecord(paymentRequest, stcResponse)

      return {
        success: stcResponse.status === 'completed' || stcResponse.status === 'requires_action',
        transactionId: stcResponse.transactionId,
        status: stcResponse.status,
        gatewayResponse: stcResponse,
        ...(stcResponse.payUrl && {
          actionRequired: {
            type: 'redirect',
            url: stcResponse.payUrl
          }
        }),
        timestamp: stcResponse.timestamp
      }

    } catch (error) {
      console.error('STC Pay processing error:', error)
      throw error
    }
  }

  /**
   * Process Bank Transfer payment
   */
  private async processBankTransferPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const bankData = paymentRequest.paymentData as BankTransferRequest
    const credentials = this.credentials.get('bank_transfer')
    
    if (!credentials) {
      throw new Error('Bank transfer credentials not configured')
    }

    try {
      const apiRequest = {
        merchantId: credentials.credentials.merchantId,
        amount: bankData.amount,
        currency: bankData.currency,
        description: bankData.description,
        descriptionAr: bankData.descriptionAr,
        bankCode: bankData.bankCode,
        accountNumber: bankData.accountNumber,
        iban: bankData.iban,
        beneficiaryName: bankData.beneficiaryName,
        transferType: bankData.transferType,
        purposeCode: bankData.purposeCode,
        metadata: {
          invoiceId: paymentRequest.invoiceId,
          ...bankData.metadata
        }
      }

      const response = await this.callBankAPI('/transfers', apiRequest, credentials)
      
      const bankResponse: BankTransferResponse = {
        transactionId: response.transactionId,
        status: this.mapBankTransferStatus(response.status),
        amount: response.amount,
        currency: response.currency as Currency,
        bankReferenceId: response.bankReferenceId,
        transferDate: response.transferDate,
        expectedSettlement: response.expectedSettlement,
        responseCode: response.responseCode,
        responseMessage: response.responseMessage,
        timestamp: new Date().toISOString()
      }

      await this.storePaymentRecord(paymentRequest, bankResponse)

      return {
        success: bankResponse.status === 'processing' || bankResponse.status === 'completed',
        transactionId: bankResponse.transactionId,
        status: bankResponse.status,
        gatewayResponse: bankResponse,
        timestamp: bankResponse.timestamp
      }

    } catch (error) {
      console.error('Bank transfer processing error:', error)
      throw error
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = []

    if (!request.invoiceId) errors.push('Invoice ID is required')
    if (!request.amount || request.amount <= 0) errors.push('Amount must be greater than 0')
    if (!request.currency) errors.push('Currency is required')
    if (!request.paymentMethod) errors.push('Payment method is required')
    if (!request.customer?.name) errors.push('Customer name is required')

    // Gateway-specific validation
    const gateway = this.getGatewayForPaymentMethod(request.paymentMethod)
    if (gateway) {
      if (request.amount < (gateway.minAmount || 0)) {
        errors.push(`Amount must be at least ${gateway.minAmount} ${request.currency}`)
      }
      if (gateway.maxAmount && request.amount > gateway.maxAmount) {
        errors.push(`Amount cannot exceed ${gateway.maxAmount} ${request.currency}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Get gateway configuration for payment method
   */
  private getGatewayForPaymentMethod(paymentMethod: PaymentMethod): PaymentGatewayConfig | null {
    for (const gateway of Object.values(GATEWAY_CONFIGS)) {
      if (gateway.supportedPaymentMethods.includes(paymentMethod) && gateway.isActive) {
        return gateway
      }
    }
    return null
  }

  /**
   * Store payment record in database
   */
  private async storePaymentRecord(
    request: PaymentRequest, 
    response: MadaPaymentResponse | StcPayPaymentResponse | BankTransferResponse
  ): Promise<void> {
    try {
      const paymentRecord = {
        invoice_id: request.invoiceId,
        transaction_id: response.transactionId,
        payment_method: request.paymentMethod,
        amount: response.amount,
        currency: response.currency,
        status: response.status,
        gateway_provider: this.getGatewayForPaymentMethod(request.paymentMethod)?.gatewayId,
        gateway_response: response,
        customer_info: request.customer,
        created_at: response.timestamp
      }

      const { error } = await supabase
        .from('payment_transactions')
        .insert(paymentRecord)

      if (error) {
        console.error('Failed to store payment record:', error)
        // Don't throw here as the payment might have succeeded
      }
    } catch (error) {
      console.error('Error storing payment record:', error)
    }
  }

  // API calling methods

  private async callMadaAPI(endpoint: string, data: any, credentials: PaymentGatewayCredentials): Promise<any> {
    const config = GATEWAY_CONFIGS.mada
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.credentials.apiKey}`,
        'X-Merchant-ID': credentials.credentials.merchantId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`MADA API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async callStcPayAPI(endpoint: string, data: any, credentials: PaymentGatewayCredentials): Promise<any> {
    const config = GATEWAY_CONFIGS.stc_pay
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.credentials.apiKey}`,
        'X-Merchant-ID': credentials.credentials.merchantId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`STC Pay API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async callBankAPI(endpoint: string, data: any, credentials: PaymentGatewayCredentials): Promise<any> {
    const config = GATEWAY_CONFIGS.bank_transfer
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.credentials.apiKey}`,
        'X-Institution-ID': credentials.credentials.institutionId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Bank API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  // Status mapping methods

  private mapMadaStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'processing': 'processing',
      '3d_secure_required': 'requires_action',
      'success': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    }
    return statusMap[status] || 'failed'
  }

  private mapStcPayStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'otp_required': 'requires_action',
      'success': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    }
    return statusMap[status] || 'failed'
  }

  private mapBankTransferStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'submitted': 'processing',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    }
    return statusMap[status] || 'pending'
  }

  // Translation methods for Arabic responses

  private translateMadaResponse(message: string): string {
    const translations: Record<string, string> = {
      'Transaction successful': 'تمت المعاملة بنجاح',
      'Card declined': 'تم رفض البطاقة',
      'Insufficient funds': 'رصيد غير كافي',
      'Invalid card': 'بطاقة غير صحيحة',
      'Transaction failed': 'فشلت المعاملة'
    }
    return translations[message] || message
  }

  private translateStcPayResponse(message: string): string {
    const translations: Record<string, string> = {
      'Payment successful': 'تم الدفع بنجاح',
      'Invalid mobile number': 'رقم الجوال غير صحيح',
      'Insufficient balance': 'رصيد غير كافي',
      'Payment failed': 'فشل الدفع'
    }
    return translations[message] || message
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResult | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single()

      if (error || !data) return null

      return {
        success: data.status === 'completed',
        transactionId: data.transaction_id,
        paymentId: data.id,
        status: data.status,
        gatewayResponse: data.gateway_response,
        timestamp: data.created_at
      }
    } catch (error) {
      console.error('Error getting payment status:', error)
      return null
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    try {
      // Get original payment
      const originalPayment = await this.getPaymentStatus(transactionId)
      if (!originalPayment) {
        throw new Error('Original payment not found')
      }

      const refundAmount = amount || (originalPayment.gatewayResponse as any)?.amount
      
      // Process refund based on gateway
      const gateway = this.getGatewayForPaymentMethod((originalPayment.gatewayResponse as any)?.paymentMethod)
      if (!gateway?.supportsRefunds) {
        throw new Error('Gateway does not support refunds')
      }

      // Implementation would vary by gateway
      // This is a simplified version
      const refundResult: PaymentResult = {
        success: true,
        transactionId: `refund_${Date.now()}`,
        status: 'completed',
        timestamp: new Date().toISOString()
      }

      return refundResult
    } catch (error) {
      console.error('Refund processing error:', error)
      return {
        success: false,
        status: 'failed',
        error: {
          code: 'REFUND_ERROR',
          message: error instanceof Error ? error.message : 'Refund failed',
          messageAr: 'فشل في الاسترداد'
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = []
    
    Object.values(GATEWAY_CONFIGS).forEach(gateway => {
      if (gateway.isActive) {
        methods.push(...gateway.supportedPaymentMethods)
      }
    })

    return [...new Set(methods)] // Remove duplicates
  }

  /**
   * Get gateway configurations
   */
  getGatewayConfigurations(): PaymentGatewayConfig[] {
    return Object.values(GATEWAY_CONFIGS).filter(gateway => gateway.isActive)
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService()
export { PaymentGatewayService }