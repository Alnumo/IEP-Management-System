import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('WhatsApp Business API Webhook Function started')

interface WhatsAppWebhookEvent {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text?: { body: string }
          type: string
          context?: {
            from: string
            id: string
          }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{
            code: number
            title: string
            message: string
          }>
        }>
      }
      field: string
    }>
  }>
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const whatsappVerifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Process WhatsApp message status updates
 */
async function processStatusUpdates(statuses: any[], phoneNumberId: string) {
  console.log(`Processing ${statuses.length} status updates`)
  
  for (const status of statuses) {
    const { id: messageId, status: messageStatus, timestamp, errors } = status
    
    const updateData = {
      status: messageStatus,
      updated_at: new Date().toISOString()
    }

    // Add timestamp-specific fields
    if (messageStatus === 'delivered') {
      updateData['delivered_at'] = new Date(parseInt(timestamp) * 1000).toISOString()
    } else if (messageStatus === 'read') {
      updateData['read_at'] = new Date(parseInt(timestamp) * 1000).toISOString()
    } else if (messageStatus === 'failed' && errors?.length > 0) {
      updateData['error_message'] = errors[0].title
    }

    // Update message in database
    const { error } = await supabase
      .from('whatsapp_messages')
      .update(updateData)
      .eq('external_id', messageId)

    if (error) {
      console.error('Error updating message status:', error)
    } else {
      console.log(`Updated message ${messageId} status to ${messageStatus}`)
    }

    // Trigger real-time update for conversation if applicable
    const { data: messageData } = await supabase
      .from('whatsapp_messages')
      .select('conversation_id')
      .eq('external_id', messageId)
      .single()

    if (messageData?.conversation_id) {
      // Send real-time update to conversation subscribers
      await supabase
        .channel(`conversation:${messageData.conversation_id}`)
        .send({
          type: 'broadcast',
          event: 'whatsapp_status_update',
          payload: {
            messageId,
            status: messageStatus,
            timestamp: new Date().toISOString()
          }
        })
    }
  }
}

/**
 * Process incoming WhatsApp messages
 */
async function processIncomingMessages(messages: any[], contacts: any[], phoneNumberId: string) {
  console.log(`Processing ${messages.length} incoming messages`)
  
  for (const message of messages) {
    const contact = contacts?.find(c => c.wa_id === message.from)
    
    // Store incoming message
    const incomingMessage = {
      external_id: message.id,
      from_phone: message.from,
      to_phone: phoneNumberId,
      contact_name: contact?.profile?.name,
      message_type: message.type,
      content: extractMessageContent(message),
      received_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      context_message_id: message.context?.id,
      raw_data: message
    }

    const { data: savedMessage, error } = await supabase
      .from('whatsapp_incoming_messages')
      .insert([incomingMessage])
      .select()
      .single()

    if (error) {
      console.error('Error saving incoming message:', error)
      continue
    }

    // Try to match with existing conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        parent:profiles!parent_id(phone),
        therapist:profiles!therapist_id(phone)
      `)
      .or(`parent.phone.eq.${message.from},therapist.phone.eq.${message.from}`)
      .single()

    if (conversation) {
      // Add message to existing conversation thread
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: null, // External message
        recipient_id: conversation.parent?.phone === message.from 
          ? conversation.therapist_id 
          : conversation.parent_id,
        content_ar: message.type === 'text' ? message.text?.body : null,
        content_en: message.type === 'text' ? message.text?.body : null,
        message_type: 'system',
        priority_level: 'normal',
        external_source: 'whatsapp',
        external_id: message.id
      })

      // Send real-time notification
      await supabase
        .channel(`conversation:${conversation.id}`)
        .send({
          type: 'broadcast',
          event: 'whatsapp_message_received',
          payload: {
            messageId: message.id,
            from: message.from,
            content: extractMessageContent(message),
            timestamp: new Date().toISOString()
          }
        })
    }

    // Check for auto-response triggers
    await processAutoResponse(message, savedMessage)
  }
}

/**
 * Extract content from different message types
 */
function extractMessageContent(message: any): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || ''
    case 'button':
      return message.button?.text || ''
    case 'interactive':
      return message.interactive?.button_reply?.title || 
             message.interactive?.list_reply?.title || ''
    case 'location':
      return `Location: ${message.location?.latitude}, ${message.location?.longitude}`
    case 'image':
      return `[Image: ${message.image?.caption || 'No caption'}]`
    case 'document':
      return `[Document: ${message.document?.filename || 'Unnamed'}]`
    case 'audio':
      return '[Voice Message]'
    case 'video':
      return `[Video: ${message.video?.caption || 'No caption'}]`
    default:
      return `[${message.type} message]`
  }
}

/**
 * Process auto-response based on incoming message content
 */
async function processAutoResponse(message: any, savedMessage: any) {
  if (message.type !== 'text') return
  
  const content = message.text?.body?.toLowerCase().trim()
  if (!content) return

  // Common Arabic/English auto-responses
  const autoResponses = {
    // Arabic responses
    'مرحبا': {
      ar: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
      en: 'Welcome! How can I help you today?'
    },
    'السلام عليكم': {
      ar: 'وعليكم السلام ورحمة الله وبركاته. أهلاً وسهلاً بك.',
      en: 'Peace be upon you. Welcome!'
    },
    'موعد': {
      ar: 'لحجز موعد أو الاستفسار عن المواعيد المتاحة، يرجى الاتصال بنا على الرقم أو استخدام التطبيق.',
      en: 'To book an appointment or inquire about available slots, please call us or use the app.'
    },
    
    // English responses
    'hello': {
      ar: 'مرحباً! كيف يمكنني مساعدتك؟',
      en: 'Hello! How can I assist you?'
    },
    'appointment': {
      ar: 'لحجز موعد، يرجى استخدام التطبيق أو الاتصال بنا مباشرة.',
      en: 'To book an appointment, please use our app or call us directly.'
    },
    'help': {
      ar: 'يسعدنا مساعدتك! يمكنك الاتصال بنا أو استخدام التطبيق لجميع الخدمات.',
      en: 'We\'re happy to help! You can call us or use our app for all services.'
    }
  }

  // Check for auto-response triggers
  for (const [trigger, response] of Object.entries(autoResponses)) {
    if (content.includes(trigger)) {
      // Queue auto-response (prefer Arabic for Saudi users)
      await supabase.from('whatsapp_outbound_queue').insert({
        to_phone: message.from,
        message_type: 'text',
        content_ar: response.ar,
        content_en: response.en,
        language: 'ar', // Default to Arabic
        priority: 'normal',
        scheduled_at: new Date(Date.now() + 2000).toISOString(), // 2-second delay
        created_by: 'system'
      })

      console.log(`Queued auto-response for trigger: ${trigger}`)
      break
    }
  }
}

/**
 * Log webhook event for debugging
 */
async function logWebhookEvent(webhookData: any, eventType: string) {
  await supabase.from('whatsapp_webhook_logs').insert({
    event_type: eventType,
    phone_number_id: webhookData.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id,
    raw_payload: webhookData,
    processed_at: new Date().toISOString()
  })
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // Handle verification request from WhatsApp
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      if (mode === 'subscribe' && token === whatsappVerifyToken) {
        console.log('WhatsApp webhook verified successfully')
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        })
      } else {
        console.log('WhatsApp webhook verification failed')
        return new Response('Verification failed', { 
          status: 403,
          headers: corsHeaders
        })
      }
    }

    // Handle webhook events
    if (req.method === 'POST') {
      const webhookData: WhatsAppWebhookEvent = await req.json()
      
      // Validate webhook structure
      if (!webhookData.object || webhookData.object !== 'whatsapp_business_account') {
        return new Response('Invalid webhook object', { 
          status: 400,
          headers: corsHeaders
        })
      }

      console.log('Received WhatsApp webhook:', JSON.stringify(webhookData, null, 2))

      // Process each entry
      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { value } = change
            const phoneNumberId = value.metadata.phone_number_id

            // Log webhook event
            await logWebhookEvent(webhookData, 'message_update')

            // Process status updates
            if (value.statuses) {
              await processStatusUpdates(value.statuses, phoneNumberId)
            }

            // Process incoming messages
            if (value.messages) {
              await processIncomingMessages(
                value.messages, 
                value.contacts || [], 
                phoneNumberId
              )
            }
          }
        }
      }

      return new Response('OK', {
        headers: corsHeaders
      })
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})