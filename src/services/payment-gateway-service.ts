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

// Payment gateway configuration for Saudi Arabia and International
const GATEWAY_CONFIGS: Record<string, PaymentGatewayConfig> = {
  paytabs: {
    gatewayId: 'paytabs',
    name: 'PayTabs',
    nameAr: 'بي تابس',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD', 'EUR'],
    supportedPaymentMethods: ['mada', 'visa', 'mastercard', 'amex'],
    apiUrl: process.env.PAYTABS_API_URL || 'https://secure.paytabs.sa/payment/request',
    supportsRecurring: true,
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsTokenization: true,
    minAmount: 1,
    maxAmount: 100000,
    dailyLimit: 500000,
    averageProcessingTime: 8,
    feeStructure: [
      {
        feeType: 'percentage',
        amount: 0.0275, // 2.75%
        minFee: 1,
        maxFee: 100
      }
    ],
    pciCompliant: true,
    supports3DSecure: true
  },
  stripe: {
    gatewayId: 'stripe',
    name: 'Stripe',
    nameAr: 'سترايب',
    isActive: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR'],
    supportedPaymentMethods: ['visa', 'mastercard', 'amex', 'discover'],
    apiUrl: process.env.STRIPE_API_URL || 'https://api.stripe.com/v1',
    supportsRecurring: true,
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsTokenization: true,
    minAmount: 0.5,
    maxAmount: 999999,
    dailyLimit: 1000000,
    averageProcessingTime: 5,
    feeStructure: [
      {
        feeType: 'percentage',
        amount: 0.029, // 2.9% + 30¢
        fixedFee: 0.30,
        currency: 'USD'
      }
    ],
    pciCompliant: true,
    supports3DSecure: true
  },
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
   * Process payment with fallback logic and error handling
   */
  async processPaymentWithFallback(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const availableGateways = this.getAvailableGatewaysForPayment(paymentRequest)
    let lastError: Error | null = null

    for (const gateway of availableGateways) {
      try {
        console.log(`Attempting payment with ${gateway.name} gateway`)
        
        // Create a copy of the request with gateway-specific configuration
        const gatewayRequest = {
          ...paymentRequest,
          preferredGateway: gateway.gatewayId
        }

        const result = await this.processPayment(gatewayRequest)
        
        if (result.success) {
          console.log(`Payment successful with ${gateway.name}`)
          return result
        } else if (result.status === 'requires_action') {
          // Return immediately for actions that require user interaction
          return result
        }
        
        // Gateway returned failure, try next one
        lastError = new Error(result.error?.message || 'Payment failed')
        
      } catch (error) {
        console.warn(`Payment failed with ${gateway.name}:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Check if this is a temporary error that shouldn't trigger fallback
        if (this.isTemporaryError(error)) {
          await this.delay(1000) // Wait 1 second before retrying
          continue
        }
      }
    }

    // All gateways failed
    return {
      success: false,
      status: 'failed',
      error: {
        code: 'ALL_GATEWAYS_FAILED',
        message: 'Payment failed on all available gateways',
        messageAr: 'فشل الدفع عبر جميع البوابات المتاحة',
        lastError: lastError?.message
      },
      timestamp: new Date().toISOString()
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
        case 'paytabs':
          return await this.processPayTabsPayment(paymentRequest)
        case 'stripe':
          return await this.processStripePayment(paymentRequest)
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
   * Process PayTabs payment (Saudi Arabia primary gateway)
   */
  private async processPayTabsPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const payTabsData = paymentRequest.paymentData as any
    const credentials = this.credentials.get('paytabs')
    
    if (!credentials) {
      throw new Error('PayTabs credentials not configured')
    }

    try {
      // Prepare PayTabs API request
      const apiRequest = {
        profile_id: credentials.credentials.profileId,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_currency: payTabsData.currency,
        cart_amount: payTabsData.amount,
        cart_description: payTabsData.description,
        
        // Customer details
        customer_details: {
          name: payTabsData.customerInfo.name,
          email: payTabsData.customerInfo.email,
          phone: payTabsData.customerInfo.phone,
          street1: payTabsData.customerInfo.address || 'N/A',
          city: payTabsData.customerInfo.city || 'Riyadh',
          state: payTabsData.customerInfo.state || 'Riyadh',
          country: payTabsData.customerInfo.country || 'SA',
          zip: payTabsData.customerInfo.zip || '11564'
        },
        
        // Shipping details (same as customer)
        shipping_details: {
          name: payTabsData.customerInfo.name,
          email: payTabsData.customerInfo.email,
          phone: payTabsData.customerInfo.phone,
          street1: payTabsData.customerInfo.address || 'N/A',
          city: payTabsData.customerInfo.city || 'Riyadh',
          state: payTabsData.customerInfo.state || 'Riyadh',
          country: payTabsData.customerInfo.country || 'SA',
          zip: payTabsData.customerInfo.zip || '11564'
        },
        
        // URLs
        return: payTabsData.returnUrl,
        callback: payTabsData.callbackUrl,
        
        // Payment configuration
        hide_shipping: true,
        framed: false,
        
        // Additional metadata
        invoice_id: paymentRequest.invoiceId,
        user_defined: JSON.stringify({
          customerId: payTabsData.customerInfo.id,
          ...payTabsData.metadata
        })
      }

      // Call PayTabs API
      const response = await this.callPayTabsAPI('/payment/request', apiRequest, credentials)
      
      // Parse response
      const payTabsResponse = {
        transactionId: response.tran_ref,
        status: this.mapPayTabsStatus(response.payment_result?.response_status),
        amount: response.cart_amount,
        currency: response.cart_currency as Currency,
        authCode: response.payment_result?.auth_code,
        referenceNumber: response.payment_result?.transaction_id,
        redirectUrl: response.redirect_url,
        responseCode: response.payment_result?.response_code,
        responseMessage: response.payment_result?.response_message,
        responseMessageAr: this.translatePayTabsResponse(response.payment_result?.response_message),
        timestamp: new Date().toISOString()
      }

      // Store payment record
      await this.storePaymentRecord(paymentRequest, payTabsResponse)

      return {
        success: payTabsResponse.status === 'completed' || payTabsResponse.status === 'requires_action',
        transactionId: payTabsResponse.transactionId,
        status: payTabsResponse.status,
        gatewayResponse: payTabsResponse,
        ...(payTabsResponse.redirectUrl && {
          actionRequired: {
            type: '3d_secure',
            url: payTabsResponse.redirectUrl
          }
        }),
        timestamp: payTabsResponse.timestamp
      }

    } catch (error) {
      console.error('PayTabs payment processing error:', error)
      throw error
    }
  }

  /**
   * Process Stripe payment (International gateway)
   */
  private async processStripePayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const stripeData = paymentRequest.paymentData as any
    const credentials = this.credentials.get('stripe')
    
    if (!credentials) {
      throw new Error('Stripe credentials not configured')
    }

    try {
      // Prepare Stripe Payment Intent
      const apiRequest = {
        amount: Math.round(stripeData.amount * 100), // Convert to cents
        currency: stripeData.currency.toLowerCase(),
        description: stripeData.description,
        
        // Customer details
        receipt_email: stripeData.customerInfo.email,
        
        // Payment method
        payment_method_types: ['card'],
        
        // Metadata
        metadata: {
          invoice_id: paymentRequest.invoiceId,
          customer_id: stripeData.customerInfo.id,
          customer_name: stripeData.customerInfo.name,
          ...stripeData.metadata
        },
        
        // 3D Secure
        confirmation_method: 'manual',
        confirm: true,
        
        // Return URL for 3DS
        return_url: stripeData.returnUrl
      }

      // Add payment method if provided
      if (stripeData.paymentMethodId) {
        apiRequest.payment_method = stripeData.paymentMethodId
      } else if (stripeData.cardToken) {
        apiRequest.source = stripeData.cardToken
      }

      // Call Stripe API
      const response = await this.callStripeAPI('/payment_intents', apiRequest, credentials)
      
      // Parse response
      const stripeResponse = {
        transactionId: response.id,
        status: this.mapStripeStatus(response.status),
        amount: response.amount / 100, // Convert back from cents
        currency: response.currency.toUpperCase() as Currency,
        clientSecret: response.client_secret,
        paymentMethodId: response.payment_method,
        nextAction: response.next_action,
        responseCode: response.last_payment_error?.code,
        responseMessage: response.last_payment_error?.message,
        responseMessageAr: this.translateStripeResponse(response.last_payment_error?.message),
        timestamp: new Date().toISOString()
      }

      // Store payment record
      await this.storePaymentRecord(paymentRequest, stripeResponse)

      return {
        success: stripeResponse.status === 'succeeded' || stripeResponse.status === 'requires_action',
        transactionId: stripeResponse.transactionId,
        status: stripeResponse.status,
        gatewayResponse: stripeResponse,
        ...(stripeResponse.nextAction && {
          actionRequired: {
            type: stripeResponse.nextAction.type,
            url: stripeResponse.nextAction.redirect_to_url?.url,
            clientSecret: stripeResponse.clientSecret
          }
        }),
        timestamp: stripeResponse.timestamp
      }

    } catch (error) {
      console.error('Stripe payment processing error:', error)
      throw error
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
   * Validate payment request with PCI-DSS compliance
   */
  private validatePaymentRequest(request: PaymentRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = []

    // Basic validation
    if (!request.invoiceId) errors.push('Invoice ID is required')
    if (!request.amount || request.amount <= 0) errors.push('Amount must be greater than 0')
    if (!request.currency) errors.push('Currency is required')
    if (!request.paymentMethod) errors.push('Payment method is required')
    if (!request.customer?.name) errors.push('Customer name is required')

    // Customer information validation
    if (!request.customer?.email || !this.isValidEmail(request.customer.email)) {
      errors.push('Valid customer email is required')
    }
    if (!request.customer?.phone || !this.isValidPhone(request.customer.phone)) {
      errors.push('Valid customer phone number is required')
    }

    // Gateway-specific validation
    const gateway = this.getGatewayForPaymentMethod(request.paymentMethod)
    if (gateway) {
      if (request.amount < (gateway.minAmount || 0)) {
        errors.push(`Amount must be at least ${gateway.minAmount} ${request.currency}`)
      }
      if (gateway.maxAmount && request.amount > gateway.maxAmount) {
        errors.push(`Amount cannot exceed ${gateway.maxAmount} ${request.currency}`)
      }
      
      // PCI-DSS compliance validation
      if (!gateway.pciCompliant) {
        errors.push('Gateway does not meet PCI-DSS compliance requirements')
      }
    }

    // Card data validation (PCI-DSS Level 1)
    if (request.paymentData) {
      const cardValidation = this.validateCardData(request.paymentData, request.paymentMethod)
      if (!cardValidation.isValid) {
        errors.push(...(cardValidation.errors || []))
      }
    }

    // Saudi-specific validation
    if (request.currency === 'SAR') {
      const saudiValidation = this.validateSaudiCompliance(request)
      if (!saudiValidation.isValid) {
        errors.push(...(saudiValidation.errors || []))
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Validate card data for PCI-DSS compliance
   */
  private validateCardData(paymentData: any, paymentMethod: PaymentMethod): { isValid: boolean; errors?: string[] } {
    const errors: string[] = []

    // Card number validation (Luhn algorithm)
    if (paymentData.cardNumber) {
      if (!this.isValidCardNumber(paymentData.cardNumber)) {
        errors.push('Invalid card number')
      }
      
      // Ensure card number is masked in logs
      if (paymentData.cardNumber.length > 4) {
        // Log only last 4 digits for PCI compliance
        console.log(`Processing payment for card ending in ${paymentData.cardNumber.slice(-4)}`)
      }
    }

    // Expiry validation
    if (paymentData.expiryMonth && paymentData.expiryYear) {
      if (!this.isValidExpiryDate(paymentData.expiryMonth, paymentData.expiryYear)) {
        errors.push('Invalid or expired card')
      }
    }

    // CVV validation
    if (paymentData.cvv) {
      if (!this.isValidCVV(paymentData.cvv, paymentMethod)) {
        errors.push('Invalid security code')
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Validate Saudi Arabia specific compliance
   */
  private validateSaudiCompliance(request: PaymentRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = []

    // Saudi phone number validation
    if (request.customer?.phone && !this.isValidSaudiPhone(request.customer.phone)) {
      errors.push('Invalid Saudi phone number format')
    }

    // VAT validation for invoices
    if (request.amount && request.amount > 0) {
      const vatAmount = request.amount * 0.15 // 15% VAT
      if (request.paymentData?.vatAmount && Math.abs(request.paymentData.vatAmount - vatAmount) > 0.01) {
        errors.push('VAT calculation does not match Saudi Arabia 15% rate')
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  // Validation helper methods

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/
    return phoneRegex.test(phone)
  }

  private isValidSaudiPhone(phone: string): boolean {
    // Saudi phone numbers: +966xxxxxxxxx or 05xxxxxxxx
    const saudiPhoneRegex = /^(\+966|966|0)?5[0-9]{8}$/
    return saudiPhoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  }

  private isValidCardNumber(cardNumber: string): boolean {
    // Luhn algorithm for card validation
    const digits = cardNumber.replace(/\D/g, '')
    let sum = 0
    let alternate = false
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i), 10)
      if (alternate) {
        n *= 2
        if (n > 9) {
          n = (n % 10) + 1
        }
      }
      sum += n
      alternate = !alternate
    }
    
    return sum % 10 === 0 && digits.length >= 13 && digits.length <= 19
  }

  private isValidExpiryDate(month: string, year: string): boolean {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    const expMonth = parseInt(month, 10)
    const expYear = parseInt(year, 10)
    
    // Handle 2-digit years
    const fullYear = expYear < 100 ? expYear + 2000 : expYear
    
    if (expMonth < 1 || expMonth > 12) return false
    if (fullYear < currentYear) return false
    if (fullYear === currentYear && expMonth < currentMonth) return false
    
    return true
  }

  private isValidCVV(cvv: string, paymentMethod: PaymentMethod): boolean {
    const cvvDigits = cvv.replace(/\D/g, '')
    
    // AMEX uses 4 digits, others use 3
    if (paymentMethod === 'amex') {
      return cvvDigits.length === 4
    } else {
      return cvvDigits.length === 3
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

  private async callPayTabsAPI(endpoint: string, data: any, credentials: PaymentGatewayCredentials): Promise<any> {
    const config = GATEWAY_CONFIGS.paytabs
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.credentials.serverKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`PayTabs API error: ${response.status} ${errorData.message || response.statusText}`)
    }

    return await response.json()
  }

  private async callStripeAPI(endpoint: string, data: any, credentials: PaymentGatewayCredentials): Promise<any> {
    const config = GATEWAY_CONFIGS.stripe
    
    // Convert data to form-encoded for Stripe
    const formData = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          formData.append(`${key}[${subKey}]`, String(subValue))
        })
      } else {
        formData.append(key, String(value))
      }
    })

    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.credentials.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Stripe API error: ${response.status} ${errorData.error?.message || response.statusText}`)
    }

    return await response.json()
  }

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

  private mapPayTabsStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'A': 'completed', // Authorized/Captured
      'H': 'pending',   // Hold
      'P': 'processing', // Processing
      'V': 'pending',   // Voided
      'E': 'failed',    // Error
      'D': 'failed',    // Declined
      'C': 'cancelled', // Cancelled
      'R': 'refunded'   // Refunded
    }
    return statusMap[status] || 'failed'
  }

  private mapStripeStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'requires_action',
      'processing': 'processing',
      'requires_capture': 'requires_action',
      'canceled': 'cancelled',
      'succeeded': 'completed'
    }
    return statusMap[status] || 'failed'
  }

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

  private translatePayTabsResponse(message: string): string {
    const translations: Record<string, string> = {
      'Authorized': 'تم التصريح',
      'Transaction successful': 'تمت المعاملة بنجاح',
      'Card declined': 'تم رفض البطاقة',
      'Insufficient funds': 'رصيد غير كافي',
      'Invalid card number': 'رقم البطاقة غير صحيح',
      'Transaction failed': 'فشلت المعاملة',
      'Payment processing error': 'خطأ في معالجة الدفع',
      'Invalid merchant': 'تاجر غير صحيح',
      'Transaction expired': 'انتهت صلاحية المعاملة'
    }
    return translations[message] || message
  }

  private translateStripeResponse(message: string): string {
    const translations: Record<string, string> = {
      'Your card was declined.': 'تم رفض بطاقتك',
      'Your card has insufficient funds.': 'بطاقتك لا تحتوي على رصيد كافي',
      'Your card number is incorrect.': 'رقم بطاقتك غير صحيح',
      'Your card has expired.': 'انتهت صلاحية بطاقتك',
      'Your card\'s security code is incorrect.': 'رمز الأمان لبطاقتك غير صحيح',
      'Processing error': 'خطأ في المعالجة',
      'Payment failed': 'فشل الدفع'
    }
    return translations[message] || message
  }

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

  /**
   * Get available gateways for a payment request, ordered by priority
   */
  private getAvailableGatewaysForPayment(paymentRequest: PaymentRequest): PaymentGatewayConfig[] {
    const gateways = Object.values(GATEWAY_CONFIGS)
      .filter(gateway => {
        // Check if gateway is active
        if (!gateway.isActive) return false
        
        // Check if gateway supports the currency
        if (!gateway.supportedCurrencies.includes(paymentRequest.currency)) return false
        
        // Check if gateway supports the payment method
        if (!gateway.supportedPaymentMethods.includes(paymentRequest.paymentMethod)) return false
        
        // Check amount limits
        if (paymentRequest.amount < (gateway.minAmount || 0)) return false
        if (gateway.maxAmount && paymentRequest.amount > gateway.maxAmount) return false
        
        // Check if credentials are available
        if (!this.credentials.has(gateway.gatewayId)) return false
        
        return true
      })
      .sort((a, b) => this.getGatewayPriority(a, paymentRequest) - this.getGatewayPriority(b, paymentRequest))

    return gateways
  }

  /**
   * Get gateway priority for fallback ordering
   */
  private getGatewayPriority(gateway: PaymentGatewayConfig, paymentRequest: PaymentRequest): number {
    let priority = 0

    // Preferred gateway gets highest priority (lowest number)
    if ((paymentRequest as any).preferredGateway === gateway.gatewayId) {
      priority -= 1000
    }

    // Saudi gateways get priority for SAR currency
    if (paymentRequest.currency === 'SAR') {
      switch (gateway.gatewayId) {
        case 'paytabs':
          priority -= 100 // PayTabs is primary for Saudi
          break
        case 'mada':
          priority -= 90  // MADA second priority
          break
        case 'stc_pay':
          priority -= 80  // STC Pay third priority
          break
      }
    } else {
      // International currencies prefer Stripe
      if (gateway.gatewayId === 'stripe') {
        priority -= 100
      }
    }

    // Lower processing time gets better priority
    priority += gateway.averageProcessingTime || 0

    // Lower fees get better priority
    const feeStructure = gateway.feeStructure?.[0]
    if (feeStructure) {
      if (feeStructure.feeType === 'percentage') {
        priority += (feeStructure.amount || 0) * 1000 // Convert percentage to comparable number
      }
      if (feeStructure.fixedFee) {
        priority += feeStructure.fixedFee * 10
      }
    }

    return priority
  }

  /**
   * Check if error is temporary and should be retried
   */
  private isTemporaryError(error: any): boolean {
    const temporaryErrors = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'TEMPORARY_UNAVAILABLE',
      'CONNECTION_RESET',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ]

    const errorMessage = error?.message || error?.code || ''
    return temporaryErrors.some(tempError => 
      errorMessage.toUpperCase().includes(tempError)
    )
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Retry payment with exponential backoff
   */
  async retryPaymentWithBackoff(
    paymentRequest: PaymentRequest, 
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<PaymentResult> {
    let lastResult: PaymentResult | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.processPaymentWithFallback(paymentRequest)
        
        if (result.success || result.status === 'requires_action') {
          return result
        }
        
        lastResult = result
        
        // Don't retry on certain error codes
        if (result.error?.code && this.isNonRetryableError(result.error.code)) {
          break
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
          console.log(`Retrying payment in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await this.delay(delay)
        }
        
      } catch (error) {
        console.error(`Payment retry attempt ${attempt + 1} failed:`, error)
        
        if (attempt === maxRetries) {
          return {
            success: false,
            status: 'failed',
            error: {
              code: 'MAX_RETRIES_EXCEEDED',
              message: 'Payment failed after maximum retry attempts',
              messageAr: 'فشل الدفع بعد الحد الأقصى من المحاولات'
            },
            timestamp: new Date().toISOString()
          }
        }
        
        const delay = baseDelay * Math.pow(2, attempt)
        await this.delay(delay)
      }
    }
    
    return lastResult || {
      success: false,
      status: 'failed',
      error: {
        code: 'PAYMENT_FAILED',
        message: 'Payment processing failed',
        messageAr: 'فشل في معالجة الدفع'
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Check if error code should not be retried
   */
  private isNonRetryableError(errorCode: string): boolean {
    const nonRetryableErrors = [
      'INVALID_CARD',
      'EXPIRED_CARD',
      'INSUFFICIENT_FUNDS',
      'CARD_DECLINED',
      'INVALID_CVV',
      'INVALID_AMOUNT',
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FRAUD_DETECTED'
    ]

    return nonRetryableErrors.includes(errorCode)
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService()
export { PaymentGatewayService }