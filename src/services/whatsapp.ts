// WhatsApp Business API Integration
// Saudi-focused parent communication system

interface WhatsAppConfig {
  apiEndpoint: string
  businessId: string
  accessToken: string
  phoneNumberId: string
}

interface MessageTemplate {
  name: string
  language: 'ar' | 'en'
  category: 'session_reminder' | 'progress_update' | 'home_program' | 'emergency' | 'appointment'
  components: TemplateComponent[]
}

interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button'
  format?: 'text' | 'image' | 'video' | 'document'
  text?: string
  parameters?: string[]
}

export class WhatsAppIntegration {
  private config: WhatsAppConfig

  constructor() {
    this.config = {
      apiEndpoint: import.meta.env.VITE_WHATSAPP_API_ENDPOINT || 'https://graph.facebook.com/v17.0',
      businessId: import.meta.env.VITE_WHATSAPP_BUSINESS_ID || '',
      accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || ''
    }
  }

  // Message Templates (Arabic-first design)
  private templates: Record<string, MessageTemplate> = {
    session_reminder: {
      name: 'session_reminder',
      language: 'ar',
      category: 'session_reminder',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🔔 تذكير بالموعد'
        },
        {
          type: 'body',
          text: 'السلام عليكم {{parent_name}}\n\nتذكير بموعد جلسة {{child_name}} غداً:\n⏰ الوقت: {{session_time}}\n📍 الغرفة: {{room_number}}\n👩‍⚕️ المعالجة: {{therapist_name}}\n\nيرجى الحضور قبل 10 دقائق من الموعد.',
          parameters: ['parent_name', 'child_name', 'session_time', 'room_number', 'therapist_name']
        },
        {
          type: 'footer',
          text: 'مركز أركان النمو للرعاية النهارية'
        }
      ]
    },

    progress_update: {
      name: 'progress_update',
      language: 'ar',
      category: 'progress_update',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🌟 تحديث التقدم'
        },
        {
          type: 'body',
          text: 'أخبار رائعة! {{child_name}} حقق إنجازاً جديداً اليوم:\n\n{{achievement_description}}\n\n📊 مستوى التقدم: {{progress_percentage}}%\n🎯 الهدف التالي: {{next_goal}}\n\nنشكركم على دعمكم المستمر!',
          parameters: ['child_name', 'achievement_description', 'progress_percentage', 'next_goal']
        }
      ]
    },

    home_program: {
      name: 'home_program',
      language: 'ar',
      category: 'home_program',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🏠 البرنامج المنزلي'
        },
        {
          type: 'body',
          text: 'تم إعداد برنامج منزلي جديد لـ {{child_name}}:\n\n📋 النشاط: {{activity_name}}\n⏱️ المدة المقترحة: {{duration}}\n🎯 الهدف: {{objective}}\n\nيمكنكم تحميل الملف من الرابط أدناه.',
          parameters: ['child_name', 'activity_name', 'duration', 'objective']
        },
        {
          type: 'button',
          text: 'تحميل البرنامج'
        }
      ]
    },

    appointment_confirmation: {
      name: 'appointment_confirmation',
      language: 'ar',
      category: 'appointment',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '✅ تأكيد الموعد'
        },
        {
          type: 'body',
          text: 'تم تأكيد موعد {{child_name}}:\n\n📅 التاريخ: {{appointment_date}}\n⏰ الوقت: {{appointment_time}}\n🏥 نوع الجلسة: {{session_type}}\n👩‍⚕️ المعالجة: {{therapist_name}}\n\nفي حال الحاجة لتغيير الموعد، يرجى الاتصال بنا.',
          parameters: ['child_name', 'appointment_date', 'appointment_time', 'session_type', 'therapist_name']
        }
      ]
    },

    emergency_alert: {
      name: 'emergency_alert',
      language: 'ar',
      category: 'emergency',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🚨 تنبيه طارئ'
        },
        {
          type: 'body',
          text: 'تنبيه عاجل بخصوص {{child_name}}:\n\n{{emergency_message}}\n\nيرجى الاتصال بالمركز فوراً على الرقم: {{center_phone}}\n\nأو الحضور للمركز مباشرة.',
          parameters: ['child_name', 'emergency_message', 'center_phone']
        }
      ]
    }
  }

  /**
   * Send a template message to a parent
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: keyof typeof this.templates,
    parameters: Record<string, string>,
    language: 'ar' | 'en' = 'ar'
  ): Promise<boolean> {
    try {
      const template = this.templates[templateName]
      if (!template) {
        throw new Error(`Template ${templateName} not found`)
      }

      // Format Saudi phone number
      const formattedPhone = this.formatSaudiPhoneNumber(phoneNumber)

      const messageData = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: language
          },
          components: this.buildTemplateComponents(template, parameters)
        }
      }

      const response = await this.makeAPIRequest('messages', messageData)
      
      // Log message for audit trail
      await this.logMessage({
        phoneNumber: formattedPhone,
        templateName,
        parameters,
        status: 'sent',
        messageId: response.messages?.[0]?.id,
        timestamp: new Date().toISOString()
      })

      return true
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      
      // Log failed message
      await this.logMessage({
        phoneNumber,
        templateName,
        parameters,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })

      return false
    }
  }

  /**
   * Send a text message (for interactive conversations)
   */
  async sendTextMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatSaudiPhoneNumber(phoneNumber)

      const messageData = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      }

      await this.makeAPIRequest('messages', messageData)
      return true
    } catch (error) {
      console.error('Failed to send WhatsApp text message:', error)
      return false
    }
  }

  /**
   * Send a document (for home programs, reports)
   */
  async sendDocument(
    phoneNumber: string, 
    documentUrl: string, 
    filename: string,
    caption?: string
  ): Promise<boolean> {
    try {
      const formattedPhone = this.formatSaudiPhoneNumber(phoneNumber)

      const messageData = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
          link: documentUrl,
          filename,
          caption
        }
      }

      await this.makeAPIRequest('messages', messageData)
      return true
    } catch (error) {
      console.error('Failed to send WhatsApp document:', error)
      return false
    }
  }

  /**
   * Handle incoming messages (webhooks)
   */
  async handleIncomingMessage(webhookData: any) {
    try {
      const { entry } = webhookData
      
      for (const entryItem of entry) {
        const { changes } = entryItem
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const { value } = change
            const { messages, contacts } = value
            
            if (messages) {
              for (const message of messages) {
                await this.processIncomingMessage(message, contacts)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error)
    }
  }

  /**
   * Process a single incoming message
   */
  private async processIncomingMessage(message: any, _contacts: any[]) {
    const { from, text, type } = message
    
    // Basic auto-responses in Arabic
    const responses = {
      greeting: 'أهلاً وسهلاً بك في مركز أركان النمو. كيف يمكننا مساعدتك؟',
      appointment: 'لحجز موعد، يرجى الاتصال بالمركز على الرقم: +966-XX-XXX-XXXX',
      progress: 'لمتابعة تقدم طفلك، يمكنك الدخول على تطبيق المركز أو زيارة الموقع الإلكتروني.',
      emergency: 'في حالات الطوارئ، يرجى الاتصال فوراً على الرقم: +966-XX-XXX-XXXX'
    }

    if (type === 'text' && text?.body) {
      const messageText = text.body.toLowerCase()
      let response = ''

      if (messageText.includes('مرحبا') || messageText.includes('السلام') || messageText.includes('hello')) {
        response = responses.greeting
      } else if (messageText.includes('موعد') || messageText.includes('appointment')) {
        response = responses.appointment
      } else if (messageText.includes('تقدم') || messageText.includes('progress')) {
        response = responses.progress
      } else if (messageText.includes('طارئ') || messageText.includes('emergency')) {
        response = responses.emergency
      }

      if (response) {
        await this.sendTextMessage(from, response)
      }
    }

    // Log incoming message
    await this.logMessage({
      phoneNumber: from,
      direction: 'incoming',
      messageType: type,
      content: text?.body || `${type} message`,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Build template components with parameters
   */
  private buildTemplateComponents(template: MessageTemplate, parameters: Record<string, string>) {
    return template.components.map(component => {
      if (component.type === 'body' && component.parameters) {
        return {
          type: component.type,
          parameters: component.parameters.map(param => ({
            type: 'text',
            text: parameters[param] || `{{${param}}}`
          }))
        }
      }
      return {
        type: component.type
      }
    })
  }

  /**
   * Format Saudi phone numbers for WhatsApp API
   */
  private formatSaudiPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle Saudi phone numbers
    if (cleaned.startsWith('966')) {
      return cleaned
    }
    if (cleaned.startsWith('0')) {
      return '966' + cleaned.substring(1)
    }
    if (cleaned.startsWith('5')) {
      return '966' + cleaned
    }
    
    return cleaned
  }

  /**
   * Make API request to WhatsApp Business API
   */
  private async makeAPIRequest(endpoint: string, data: any) {
    const url = `${this.config.apiEndpoint}/${this.config.phoneNumberId}/${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`WhatsApp API Error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Log messages for audit trail and analytics
   */
  private async logMessage(logData: any) {
    try {
      // In a real implementation, this would save to database
      console.log('WhatsApp Message Log:', logData)
      
      // You could store this in Supabase:
      // await supabase.from('whatsapp_messages').insert(logData)
    } catch (error) {
      console.error('Failed to log WhatsApp message:', error)
    }
  }

  /**
   * Bulk send session reminders
   */
  async sendSessionReminders(sessions: Array<{
    studentName: string
    parentPhone: string
    parentName: string
    sessionTime: string
    roomNumber: string
    therapistName: string
  }>) {
    const results = []
    
    for (const session of sessions) {
      const success = await this.sendTemplateMessage(
        session.parentPhone,
        'session_reminder',
        {
          parent_name: session.parentName,
          child_name: session.studentName,
          session_time: session.sessionTime,
          room_number: session.roomNumber,
          therapist_name: session.therapistName
        }
      )
      
      results.push({
        studentName: session.studentName,
        phone: session.parentPhone,
        success
      })

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }

  /**
   * Send progress updates to parents
   */
  async sendProgressUpdate(
    parentPhone: string,
    childName: string,
    achievement: string,
    progressPercentage: number,
    nextGoal: string
  ) {
    return await this.sendTemplateMessage(
      parentPhone,
      'progress_update',
      {
        child_name: childName,
        achievement_description: achievement,
        progress_percentage: progressPercentage.toString(),
        next_goal: nextGoal
      }
    )
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string) {
    try {
      const url = `${this.config.apiEndpoint}/${messageId}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to get message status:', error)
      return null
    }
  }
}

// Export singleton instance
export const whatsAppService = new WhatsAppIntegration()