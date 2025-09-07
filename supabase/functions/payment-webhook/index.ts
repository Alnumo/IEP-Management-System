import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

interface WebhookPayload {
  eventType: string
  eventId: string
  transactionId: string
  status: string
  amount?: number
  currency?: string
  gatewayProvider: string
  timestamp: string
  data?: any
  signature?: string
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for webhook
    )

    // Parse the webhook payload
    const webhookPayload: WebhookPayload = await req.json()
    const signature = req.headers.get('x-webhook-signature') || webhookPayload.signature

    // Verify webhook signature if provided
    if (signature && !await verifyWebhookSignature(req, signature, webhookPayload.gatewayProvider)) {
      return new Response('Webhook signature verification failed', {
        status: 401,
        headers: corsHeaders
      })
    }

    // Log the webhook event
    const { data: webhookEvent, error: webhookError } = await supabaseClient
      .from('payment_webhook_events')
      .insert({
        gateway_provider: webhookPayload.gatewayProvider,
        event_type: webhookPayload.eventType,
        event_id: webhookPayload.eventId,
        transaction_id: webhookPayload.transactionId,
        raw_payload: webhookPayload,
        signature_verified: !!signature,
        signature_header: signature || null,
        processing_status: 'pending'
      })
      .select()
      .single()

    if (webhookError) {
      console.error('Failed to log webhook event:', webhookError)
      return new Response('Failed to log webhook event', {
        status: 500,
        headers: corsHeaders
      })
    }

    // Process the webhook based on event type and gateway
    let processingResult: any = { success: false }

    try {
      processingResult = await processWebhookEvent(webhookPayload, supabaseClient)
    } catch (error) {
      console.error('Webhook processing error:', error)
      processingResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      }
    }

    // Update webhook event processing status
    await supabaseClient
      .from('payment_webhook_events')
      .update({
        processing_status: processingResult.success ? 'processed' : 'failed',
        processed_at: new Date().toISOString(),
        processed_payload: processingResult,
        error_message: processingResult.error || null
      })
      .eq('id', webhookEvent.id)

    return new Response(JSON.stringify({
      success: processingResult.success,
      eventId: webhookPayload.eventId,
      message: processingResult.success ? 'Webhook processed successfully' : 'Webhook processing failed'
    }), {
      status: processingResult.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook handler error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function processWebhookEvent(payload: WebhookPayload, supabase: any): Promise<any> {
  // Get the existing payment transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('transaction_id', payload.transactionId)
    .single()

  if (transactionError || !transaction) {
    console.error('Transaction not found:', payload.transactionId)
    return {
      success: false,
      error: `Transaction not found: ${payload.transactionId}`
    }
  }

  // Map gateway status to our internal status
  const newStatus = mapGatewayStatus(payload.status, payload.gatewayProvider)
  
  // Update transaction status
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  // Add completion timestamp if payment completed
  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.processing_time_seconds = Math.floor(
      (new Date().getTime() - new Date(transaction.initiated_at).getTime()) / 1000
    )
  }

  // Add error details if payment failed
  if (newStatus === 'failed') {
    updateData.error_code = payload.data?.errorCode || 'GATEWAY_ERROR'
    updateData.error_message = payload.data?.errorMessage || 'Payment failed'
  }

  // Store gateway response data
  if (payload.data) {
    updateData.gateway_response = {
      ...transaction.gateway_response,
      webhook: payload.data,
      lastUpdated: new Date().toISOString()
    }
  }

  // Update the payment transaction
  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update(updateData)
    .eq('transaction_id', payload.transactionId)

  if (updateError) {
    console.error('Failed to update transaction:', updateError)
    return {
      success: false,
      error: 'Failed to update transaction status'
    }
  }

  // Update invoice if payment completed
  if (newStatus === 'completed') {
    await updateInvoiceOnPaymentCompletion(transaction.invoice_id, transaction.amount, supabase)
  }

  // Handle installment payment updates
  if (transaction.installment_id) {
    await updateInstallmentOnPayment(transaction.installment_id, newStatus, transaction.amount, supabase)
  }

  // Send notifications based on payment status
  await sendPaymentStatusNotification(transaction, newStatus, supabase)

  return {
    success: true,
    transactionId: payload.transactionId,
    oldStatus: transaction.status,
    newStatus,
    updatedAt: new Date().toISOString()
  }
}

function mapGatewayStatus(gatewayStatus: string, gatewayProvider: string): string {
  // Status mapping for different gateways
  const statusMaps: Record<string, Record<string, string>> = {
    paytabs: {
      'A': 'completed', // Authorized/Captured
      'H': 'pending',   // Hold
      'P': 'processing', // Processing
      'V': 'pending',   // Voided
      'E': 'failed',    // Error
      'D': 'failed',    // Declined
      'C': 'cancelled', // Cancelled
      'R': 'refunded',  // Refunded
      'success': 'completed',
      'failed': 'failed',
      'pending': 'pending',
      'processing': 'processing',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    },
    stripe: {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'requires_action',
      'processing': 'processing',
      'requires_capture': 'requires_action',
      'canceled': 'cancelled',
      'succeeded': 'completed',
      'payment_failed': 'failed'
    },
    mada: {
      'success': 'completed',
      'failed': 'failed',
      'pending': 'pending',
      'processing': 'processing',
      '3d_secure_required': 'requires_action',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    },
    stc_pay: {
      'success': 'completed',
      'failed': 'failed',
      'pending': 'pending',
      'otp_required': 'requires_action',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    },
    bank_transfer: {
      'completed': 'completed',
      'failed': 'failed',
      'submitted': 'processing',
      'processing': 'processing',
      'cancelled': 'cancelled'
    }
  }

  const statusMap = statusMaps[gatewayProvider] || statusMaps.mada
  return statusMap[gatewayStatus.toLowerCase()] || 'failed'
}

async function updateInvoiceOnPaymentCompletion(invoiceId: string, amount: number, supabase: any): Promise<void> {
  try {
    // Get current invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('paid_amount, total_amount, status')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Failed to get invoice:', invoiceError)
      return
    }

    // Calculate new paid amount
    const newPaidAmount = (invoice.paid_amount || 0) + amount
    const newBalanceAmount = invoice.total_amount - newPaidAmount

    // Determine new status
    let newStatus = invoice.status
    if (newBalanceAmount <= 0) {
      newStatus = 'paid'
    }

    // Update invoice
    await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

  } catch (error) {
    console.error('Failed to update invoice on payment completion:', error)
  }
}

async function updateInstallmentOnPayment(installmentId: string, status: string, amount: number, supabase: any): Promise<void> {
  try {
    if (status === 'completed') {
      // Mark installment as paid
      await supabase
        .from('enhanced_payment_installments')
        .update({
          status: 'paid',
          paid_amount: amount,
          paid_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId)
    } else if (status === 'failed') {
      // Update installment with failure
      await supabase
        .from('enhanced_payment_installments')
        .update({
          auto_payment_attempts: supabase.raw('auto_payment_attempts + 1'),
          last_auto_payment_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId)
    }
  } catch (error) {
    console.error('Failed to update installment:', error)
  }
}

async function sendPaymentStatusNotification(transaction: any, status: string, supabase: any): Promise<void> {
  try {
    // Get student and parent information for notifications
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id, name, name_ar,
        parents (id, name, name_ar, email, phone)
      `)
      .eq('id', transaction.student_id)
      .single()

    if (studentError || !student) {
      console.error('Failed to get student for notification:', studentError)
      return
    }

    let notificationData: any = {
      type: 'payment_received',
      priority: 'medium',
      related_payment_id: transaction.id,
      related_student_id: transaction.student_id,
      related_invoice_id: transaction.invoice_id,
      created_at: new Date().toISOString(),
      delivery_status: 'pending'
    }

    // Customize notification based on status
    switch (status) {
      case 'completed':
        notificationData.type = 'payment_received'
        notificationData.title = 'Payment Received'
        notificationData.title_ar = 'تم استلام الدفع'
        notificationData.message = `Payment of ${transaction.amount} ${transaction.currency} has been processed successfully.`
        notificationData.message_ar = `تم معالجة دفعة بقيمة ${transaction.amount} ${transaction.currency} بنجاح.`
        break
      
      case 'failed':
        notificationData.type = 'payment_failed'
        notificationData.priority = 'high'
        notificationData.title = 'Payment Failed'
        notificationData.title_ar = 'فشل في الدفع'
        notificationData.message = `Payment of ${transaction.amount} ${transaction.currency} has failed. Please try again.`
        notificationData.message_ar = `فشل في دفعة بقيمة ${transaction.amount} ${transaction.currency}. يرجى المحاولة مرة أخرى.`
        break
      
      default:
        return // Don't send notifications for other statuses
    }

    // Add recipients (parents and billing admin)
    const recipients = []
    
    // Add parent recipients
    if (student.parents && student.parents.length > 0) {
      student.parents.forEach((parent: any) => {
        if (parent.email) {
          recipients.push({
            user_id: parent.id,
            role: 'parent',
            contact_method: 'email'
          })
        }
        if (parent.phone) {
          recipients.push({
            user_id: parent.id,
            role: 'parent',
            contact_method: 'sms'
          })
        }
      })
    }

    // Add billing admin recipients
    const { data: billingUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'manager', 'billing_admin'])

    if (billingUsers) {
      billingUsers.forEach((user: any) => {
        recipients.push({
          user_id: user.id,
          role: 'admin',
          contact_method: 'in_app'
        })
      })
    }

    notificationData.recipients = recipients

    // Store notification
    await supabase
      .from('financial_notifications')
      .insert(notificationData)

  } catch (error) {
    console.error('Failed to send payment status notification:', error)
  }
}

async function verifyWebhookSignature(req: Request, signature: string, gatewayProvider: string): Promise<boolean> {
  try {
    // Get webhook secret for the gateway
    const secretKey = Deno.env.get(`${gatewayProvider.toUpperCase()}_WEBHOOK_SECRET`)
    
    if (!secretKey) {
      console.warn(`No webhook secret configured for ${gatewayProvider}`)
      return true // Allow if no secret is configured
    }

    // Get request body for signature verification
    const body = await req.text()
    
    // Create expected signature (implementation depends on gateway)
    const crypto = globalThis.crypto
    const keyData = new TextEncoder().encode(secretKey)
    const messageData = new TextEncoder().encode(body)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Compare signatures (implementation may vary by gateway)
    const providedSignature = signature.replace('sha256=', '')
    
    return expectedSignature === providedSignature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}