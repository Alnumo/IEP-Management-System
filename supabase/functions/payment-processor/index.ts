import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

interface PaymentRequest {
  invoiceId: string
  amount: number
  currency: string
  paymentMethod: string
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  paymentData: {
    [key: string]: any
  }
  metadata?: {
    [key: string]: any
  }
}

interface PaymentResponse {
  success: boolean
  transactionId?: string
  status: string
  error?: {
    code: string
    message: string
    messageAr?: string
  }
  actionRequired?: {
    type: string
    url?: string
  }
  timestamp: string
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const paymentRequest: PaymentRequest = await req.json()

    // Validate request
    if (!paymentRequest.invoiceId || !paymentRequest.amount || !paymentRequest.paymentMethod) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields',
            messageAr: 'حقول مطلوبة مفقودة'
          },
          timestamp: new Date().toISOString()
        } as PaymentResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', paymentRequest.invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: {
            code: 'INVOICE_NOT_FOUND',
            message: 'Invoice not found',
            messageAr: 'الفاتورة غير موجودة'
          },
          timestamp: new Date().toISOString()
        } as PaymentResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate payment amount
    if (paymentRequest.amount > invoice.balance_amount) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: {
            code: 'AMOUNT_EXCEEDS_BALANCE',
            message: 'Payment amount exceeds invoice balance',
            messageAr: 'مبلغ الدفع يتجاوز رصيد الفاتورة'
          },
          timestamp: new Date().toISOString()
        } as PaymentResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Store payment transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        invoice_id: paymentRequest.invoiceId,
        student_id: invoice.student_id,
        payment_method: paymentRequest.paymentMethod,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'SAR',
        status: 'processing',
        gateway_provider: getGatewayProvider(paymentRequest.paymentMethod),
        customer_info: paymentRequest.customer,
        initiated_at: timestamp,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: {
            code: 'TRANSACTION_CREATE_FAILED',
            message: 'Failed to create transaction record',
            messageAr: 'فشل في إنشاء سجل المعاملة'
          },
          timestamp
        } as PaymentResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Process payment based on method
    let paymentResult: PaymentResponse

    switch (paymentRequest.paymentMethod) {
      case 'mada':
      case 'visa':
      case 'mastercard':
        paymentResult = await processMadaPayment(paymentRequest, transactionId, supabaseClient)
        break
      case 'stc_pay':
        paymentResult = await processStcPayPayment(paymentRequest, transactionId, supabaseClient)
        break
      case 'bank_transfer':
        paymentResult = await processBankTransferPayment(paymentRequest, transactionId, supabaseClient)
        break
      case 'cash':
        paymentResult = await processCashPayment(paymentRequest, transactionId, supabaseClient)
        break
      default:
        paymentResult = {
          success: false,
          status: 'failed',
          error: {
            code: 'PAYMENT_METHOD_NOT_SUPPORTED',
            message: `Payment method ${paymentRequest.paymentMethod} is not supported`,
            messageAr: 'طريقة الدفع غير مدعومة'
          },
          timestamp
        }
    }

    // Update transaction status
    await supabaseClient
      .from('payment_transactions')
      .update({
        status: paymentResult.status,
        gateway_response: paymentResult,
        completed_at: paymentResult.success ? timestamp : null,
        error_code: paymentResult.error?.code,
        error_message: paymentResult.error?.message,
        updated_at: timestamp
      })
      .eq('transaction_id', transactionId)

    // Update invoice if payment completed
    if (paymentResult.success && paymentResult.status === 'completed') {
      await updateInvoicePayment(paymentRequest.invoiceId, paymentRequest.amount, supabaseClient)
    }

    return new Response(JSON.stringify(paymentResult), {
      status: paymentResult.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        status: 'failed',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          messageAr: 'خطأ داخلي في الخادم'
        },
        timestamp: new Date().toISOString()
      } as PaymentResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Payment method processors
async function processMadaPayment(request: PaymentRequest, transactionId: string, supabase: any): Promise<PaymentResponse> {
  // Simulate MADA API call
  const isSuccess = Math.random() > 0.1 // 90% success rate
  const requires3D = Math.random() > 0.7 // 30% require 3D Secure
  
  if (!isSuccess) {
    return {
      success: false,
      status: 'failed',
      error: {
        code: 'CARD_DECLINED',
        message: 'Card was declined',
        messageAr: 'تم رفض البطاقة'
      },
      timestamp: new Date().toISOString()
    }
  }

  if (requires3D) {
    return {
      success: true,
      transactionId,
      status: 'requires_action',
      actionRequired: {
        type: '3d_secure',
        url: `https://3dsecure.mada.com/auth?txn=${transactionId}`
      },
      timestamp: new Date().toISOString()
    }
  }

  return {
    success: true,
    transactionId,
    status: 'completed',
    timestamp: new Date().toISOString()
  }
}

async function processStcPayPayment(request: PaymentRequest, transactionId: string, supabase: any): Promise<PaymentResponse> {
  // Simulate STC Pay API call
  const isSuccess = Math.random() > 0.05 // 95% success rate
  
  if (!isSuccess) {
    return {
      success: false,
      status: 'failed',
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance',
        messageAr: 'رصيد غير كافي'
      },
      timestamp: new Date().toISOString()
    }
  }

  // STC Pay usually requires redirect for authentication
  return {
    success: true,
    transactionId,
    status: 'requires_action',
    actionRequired: {
      type: 'redirect',
      url: `https://stcpay.com.sa/payment?txn=${transactionId}`
    },
    timestamp: new Date().toISOString()
  }
}

async function processBankTransferPayment(request: PaymentRequest, transactionId: string, supabase: any): Promise<PaymentResponse> {
  // Bank transfers are typically initiated and require manual verification
  return {
    success: true,
    transactionId,
    status: 'processing',
    timestamp: new Date().toISOString()
  }
}

async function processCashPayment(request: PaymentRequest, transactionId: string, supabase: any): Promise<PaymentResponse> {
  // Cash payments are immediately marked as completed
  return {
    success: true,
    transactionId,
    status: 'completed',
    timestamp: new Date().toISOString()
  }
}

function getGatewayProvider(paymentMethod: string): string {
  const gatewayMap: { [key: string]: string } = {
    'mada': 'mada',
    'visa': 'mada',
    'mastercard': 'mada',
    'stc_pay': 'stc_pay',
    'bank_transfer': 'bank_transfer',
    'cash': 'manual'
  }
  return gatewayMap[paymentMethod] || 'unknown'
}

async function updateInvoicePayment(invoiceId: string, amount: number, supabase: any): Promise<void> {
  // Update invoice payment amounts
  const { error } = await supabase.rpc('update_invoice_payment', {
    p_invoice_id: invoiceId,
    p_payment_amount: amount
  })

  if (error) {
    console.error('Failed to update invoice payment:', error)
  }
}