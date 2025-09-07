/**
 * WhatsApp Business API Integration Service
 * Comprehensive WhatsApp messaging automation for therapy center communications
 * Supports bilingual Arabic/English messages with template management
 */

import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { retryApiCall } from '@/lib/retry-utils'

// =============================================================================
// WHATSAPP TYPES & INTERFACES
// =============================================================================

export type MessageType = 'text' | 'template' | 'interactive' | 'media'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type TemplateCategory = 'appointment_reminder' | 'progress_update' | 'emergency_alert' | 'assessment_reminder' | 'session_feedback'

export interface WhatsAppMessage {
  id: string
  to: string
  from: string
  message_type: MessageType
  content_ar?: string
  content_en?: string
  template_name?: string
  template_params?: Record<string, any>
  status: MessageStatus
  sent_at?: string
  delivered_at?: string
  read_at?: string
  error_message?: string
  conversation_id?: string
  related_session_id?: string
  related_student_id?: string
  created_at: string
  updated_at: string
}

export interface MessageTemplate {
  id: string
  name: string
  category: TemplateCategory
  language: 'ar' | 'en' | 'both'
  template_ar?: string
  template_en?: string
  parameters: string[]
  active: boolean
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface SendTemplateMessageData {
  to: string
  template_name: string
  language: 'ar' | 'en'
  parameters: Record<string, any>
  conversation_id?: string
  related_session_id?: string
  related_student_id?: string
}

export interface SendTextMessageData {
  to: string
  message_ar?: string
  message_en?: string
  language: 'ar' | 'en'
  conversation_id?: string
}

export interface WebhookEvent {
  id: string
  webhook_type: 'message_status' | 'incoming_message' | 'system_event'
  phone_number: string
  message_id?: string
  status?: MessageStatus
  timestamp: string
  raw_data: any
}

// =============================================================================
// WHATSAPP BUSINESS API SERVICE CLASS
// =============================================================================

class WhatsAppBusinessService {
  private static instance: WhatsAppBusinessService
  private baseUrl: string
  private accessToken: string
  private phoneNumberId: string
  private verifyToken: string

  private constructor() {
    // Load configuration from environment variables
    this.baseUrl = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v18.0'
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('⚠️ WhatsApp Business API credentials not configured')
    }
  }

  static getInstance(): WhatsAppBusinessService {
    if (!WhatsAppBusinessService.instance) {
      WhatsAppBusinessService.instance = new WhatsAppBusinessService()
    }
    return WhatsAppBusinessService.instance
  }

  /**
   * Validate phone number format (Saudi Arabia +966)
   */
  private validatePhoneNumber(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Saudi Arabia phone number validation
    if (cleaned.startsWith('966')) {
      // International format already
      if (cleaned.length === 12) {
        return { valid: true, formatted: cleaned }
      }
    } else if (cleaned.startsWith('05')) {
      // Local Saudi format (05XXXXXXXX)
      if (cleaned.length === 10) {
        return { valid: true, formatted: `966${cleaned.substring(1)}` }
      }
    } else if (cleaned.startsWith('5')) {
      // Local without leading zero (5XXXXXXXX)
      if (cleaned.length === 9) {
        return { valid: true, formatted: `966${cleaned}` }
      }
    }

    return {
      valid: false,
      error: 'Invalid Saudi phone number format. Use +966XXXXXXXXX or 05XXXXXXXX'
    }
  }

  /**
   * Send text message via WhatsApp Business API
   */
  async sendTextMessage(data: SendTextMessageData): Promise<WhatsAppMessage> {
    return retryApiCall(async () => {
      console.log('🔍 WhatsApp: Sending text message to:', data.to)

      const user = await requireAuth()
      const phoneValidation = this.validatePhoneNumber(data.to)
      
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error)
      }

      const message = data.language === 'ar' ? data.message_ar : data.message_en
      if (!message) {
        throw new Error('Message content is required')
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneValidation.formatted,
        type: 'text',
        text: { body: message }
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`WhatsApp API Error: ${error.error?.message || response.statusText}`)
      }

      const result = await response.json()

      // Store message in database
      const whatsappMessage: Partial<WhatsAppMessage> = {
        to: phoneValidation.formatted!,
        from: this.phoneNumberId,
        message_type: 'text',
        content_ar: data.language === 'ar' ? message : undefined,
        content_en: data.language === 'en' ? message : undefined,
        status: 'sent',
        sent_at: new Date().toISOString(),
        conversation_id: data.conversation_id
      }

      const { data: savedMessage, error } = await supabase
        .from('whatsapp_messages')
        .insert([whatsappMessage])
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to save WhatsApp message to DB:', error)
        // Don't throw - message was sent successfully
      }

      console.log('✅ WhatsApp text message sent successfully:', result.messages[0].id)
      return savedMessage || { 
        ...whatsappMessage, 
        id: result.messages[0].id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as WhatsAppMessage

    }, {
      context: 'Sending WhatsApp text message',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Send template message via WhatsApp Business API
   */
  async sendTemplateMessage(data: SendTemplateMessageData): Promise<WhatsAppMessage> {
    return retryApiCall(async () => {
      console.log('🔍 WhatsApp: Sending template message:', data.template_name)

      const user = await requireAuth()
      const phoneValidation = this.validatePhoneNumber(data.to)
      
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error)
      }

      // Get template from database
      const { data: template, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('name', data.template_name)
        .eq('active', true)
        .single()

      if (templateError || !template) {
        throw new Error(`Template '${data.template_name}' not found or inactive`)
      }

      // Validate required parameters
      const missingParams = template.parameters.filter(
        (param: string) => !data.parameters.hasOwnProperty(param)
      )
      
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`)
      }

      // Build template components
      const templateComponents = []
      
      if (template.parameters.length > 0) {
        templateComponents.push({
          type: 'body',
          parameters: template.parameters.map((param: string) => ({
            type: 'text',
            text: data.parameters[param]?.toString() || ''
          }))
        })
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneValidation.formatted,
        type: 'template',
        template: {
          name: data.template_name,
          language: { code: data.language === 'ar' ? 'ar' : 'en' },
          components: templateComponents
        }
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`WhatsApp API Error: ${error.error?.message || response.statusText}`)
      }

      const result = await response.json()

      // Store message in database
      const whatsappMessage: Partial<WhatsAppMessage> = {
        to: phoneValidation.formatted!,
        from: this.phoneNumberId,
        message_type: 'template',
        template_name: data.template_name,
        template_params: data.parameters,
        status: 'sent',
        sent_at: new Date().toISOString(),
        conversation_id: data.conversation_id,
        related_session_id: data.related_session_id,
        related_student_id: data.related_student_id
      }

      const { data: savedMessage, error } = await supabase
        .from('whatsapp_messages')
        .insert([whatsappMessage])
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to save WhatsApp template message to DB:', error)
      }

      console.log('✅ WhatsApp template message sent successfully:', result.messages[0].id)
      return savedMessage || { 
        ...whatsappMessage, 
        id: result.messages[0].id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as WhatsAppMessage

    }, {
      context: 'Sending WhatsApp template message',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Handle incoming webhook from WhatsApp Business API
   */
  async handleWebhook(webhookData: any): Promise<void> {
    try {
      console.log('🔍 WhatsApp: Processing webhook:', webhookData)

      // Store raw webhook data for debugging
      await supabase.from('whatsapp_webhooks').insert({
        webhook_type: this.determineWebhookType(webhookData),
        raw_data: webhookData,
        processed_at: new Date().toISOString()
      })

      // Process status updates
      if (webhookData.entry) {
        for (const entry of webhookData.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                await this.processMessageStatusUpdate(change.value)
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ WhatsApp webhook processing failed:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'WhatsAppBusinessService',
        action: 'handleWebhook',
        metadata: { webhookData }
      })
    }
  }

  /**
   * Process message status updates from webhook
   */
  private async processMessageStatusUpdate(messageData: any): Promise<void> {
    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        const { id: messageId, status: messageStatus, timestamp } = status
        
        const statusUpdate = {
          status: messageStatus as MessageStatus,
          updated_at: new Date().toISOString()
        }

        if (messageStatus === 'delivered') {
          statusUpdate['delivered_at'] = new Date(parseInt(timestamp) * 1000).toISOString()
        } else if (messageStatus === 'read') {
          statusUpdate['read_at'] = new Date(parseInt(timestamp) * 1000).toISOString()
        } else if (messageStatus === 'failed') {
          statusUpdate['error_message'] = status.errors?.[0]?.title || 'Message failed'
        }

        // Update message status in database
        const { error } = await supabase
          .from('whatsapp_messages')
          .update(statusUpdate)
          .eq('id', messageId)

        if (error) {
          console.error('❌ Failed to update message status:', error)
        } else {
          console.log('✅ Updated WhatsApp message status:', messageId, '→', messageStatus)
        }
      }
    }

    // Handle incoming messages (for future two-way communication)
    if (messageData.messages) {
      for (const message of messageData.messages) {
        await this.processIncomingMessage(message)
      }
    }
  }

  /**
   * Process incoming WhatsApp messages
   */
  private async processIncomingMessage(messageData: any): Promise<void> {
    try {
      const incomingMessage = {
        external_id: messageData.id,
        from: messageData.from,
        to: this.phoneNumberId,
        message_type: messageData.type,
        content: this.extractMessageContent(messageData),
        received_at: new Date(parseInt(messageData.timestamp) * 1000).toISOString()
      }

      // Store incoming message
      await supabase.from('whatsapp_incoming_messages').insert([incomingMessage])
      
      // TODO: Implement auto-response logic for common inquiries
      console.log('✅ Processed incoming WhatsApp message:', messageData.id)

    } catch (error) {
      console.error('❌ Failed to process incoming message:', error)
    }
  }

  /**
   * Extract text content from various message types
   */
  private extractMessageContent(messageData: any): string {
    if (messageData.type === 'text') {
      return messageData.text?.body || ''
    } else if (messageData.type === 'button') {
      return messageData.button?.text || ''
    } else if (messageData.type === 'interactive') {
      return messageData.interactive?.button_reply?.title || 
             messageData.interactive?.list_reply?.title || ''
    }
    return `[${messageData.type} message]`
  }

  /**
   * Determine webhook type from payload
   */
  private determineWebhookType(webhookData: any): string {
    if (webhookData.entry?.[0]?.changes?.[0]?.field === 'messages') {
      const value = webhookData.entry[0].changes[0].value
      if (value.statuses) return 'message_status'
      if (value.messages) return 'incoming_message'
    }
    return 'system_event'
  }

  /**
   * Get message history for a phone number
   */
  async getMessageHistory(phoneNumber: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    return retryApiCall(async () => {
      await requireAuth()
      
      const phoneValidation = this.validatePhoneNumber(phoneNumber)
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error)
      }

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('to', phoneValidation.formatted)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data || []
    }, {
      context: 'Getting WhatsApp message history',
      maxAttempts: 2,
      logErrors: true
    })
  }

  /**
   * Get available message templates
   */
  async getTemplates(category?: TemplateCategory): Promise<MessageTemplate[]> {
    return retryApiCall(async () => {
      await requireAuth()

      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    }, {
      context: 'Getting WhatsApp templates',
      maxAttempts: 2,
      logErrors: false
    })
  }

  /**
   * Create or update message template
   */
  async upsertTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate> {
    return retryApiCall(async () => {
      const user = await requireAuth()

      const templateData = {
        ...template,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .upsert([templateData])
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ WhatsApp template upserted:', template.name)
      return data
    }, {
      context: 'Upserting WhatsApp template',
      maxAttempts: 2,
      logErrors: true
    })
  }

  /**
   * Verify webhook token for WhatsApp Business API
   */
  verifyWebhookToken(token: string): boolean {
    return token === this.verifyToken
  }

  /**
   * Get service configuration status
   */
  getConfigurationStatus(): {
    configured: boolean
    missingConfig: string[]
    phoneNumberId?: string
  } {
    const missingConfig: string[] = []
    
    if (!this.accessToken) missingConfig.push('WHATSAPP_ACCESS_TOKEN')
    if (!this.phoneNumberId) missingConfig.push('WHATSAPP_PHONE_NUMBER_ID')
    if (!this.verifyToken) missingConfig.push('WHATSAPP_VERIFY_TOKEN')
    
    return {
      configured: missingConfig.length === 0,
      missingConfig,
      phoneNumberId: this.phoneNumberId || undefined
    }
  }
}

// Export singleton instance
export const whatsappBusinessService = WhatsAppBusinessService.getInstance()

// Export utility functions
export const formatSaudiPhoneNumber = (phoneNumber: string): string | null => {
  const service = WhatsAppBusinessService.getInstance()
  const validation = service['validatePhoneNumber'](phoneNumber)
  return validation.valid ? validation.formatted! : null
}

export default whatsappBusinessService