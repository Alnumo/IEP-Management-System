import { z } from 'zod'

export interface WebhookPayload {
  event: string
  action: 'create' | 'update' | 'delete' | 'submit' | 'complete'
  data: any
  timestamp: string
  source: string
  metadata?: Record<string, any>
}

export interface WebhookResponse {
  success: boolean
  message?: string
  data?: any
  errors?: string[]
}

const webhookConfigSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()),
  active: z.boolean().default(true),
  retryAttempts: z.number().default(3),
  timeout: z.number().default(30000)
})

export type WebhookConfig = z.infer<typeof webhookConfigSchema>

export const WEBHOOK_EVENTS = {
  // Student Events
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  STUDENT_FORM_SUBMITTED: 'student.form.submitted',
  
  // Therapist Events
  THERAPIST_CREATED: 'therapist.created',
  THERAPIST_UPDATED: 'therapist.updated',
  THERAPIST_DELETED: 'therapist.deleted',
  THERAPIST_FORM_SUBMITTED: 'therapist.form.submitted',
  
  // Course Events
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',
  COURSE_DELETED: 'course.deleted',
  COURSE_FORM_SUBMITTED: 'course.form.submitted',
  
  // Session Events
  SESSION_CREATED: 'session.created',
  SESSION_UPDATED: 'session.updated',
  SESSION_DELETED: 'session.deleted',
  SESSION_COMPLETED: 'session.completed',
  SESSION_FORM_SUBMITTED: 'session.form.submitted',
  
  // Therapy Program Events
  THERAPY_PROGRAM_CREATED: 'therapy_program.created',
  THERAPY_PROGRAM_UPDATED: 'therapy_program.updated',
  THERAPY_PROGRAM_DELETED: 'therapy_program.deleted',
  THERAPY_PROGRAM_FORM_SUBMITTED: 'therapy_program.form.submitted',
  
  // Medical Record Events
  MEDICAL_RECORD_CREATED: 'medical_record.created',
  MEDICAL_RECORD_UPDATED: 'medical_record.updated',
  MEDICAL_RECORD_DELETED: 'medical_record.deleted',
  MEDICAL_RECORD_FORM_SUBMITTED: 'medical_record.form.submitted',
  
  // Assessment Events
  ASSESSMENT_CREATED: 'assessment.created',
  ASSESSMENT_UPDATED: 'assessment.updated',
  ASSESSMENT_DELETED: 'assessment.deleted',
  ASSESSMENT_COMPLETED: 'assessment.completed',
  ASSESSMENT_FORM_SUBMITTED: 'assessment.form.submitted',
  
  // Enrollment Events
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_UPDATED: 'enrollment.updated',
  ENROLLMENT_DELETED: 'enrollment.deleted',
  ENROLLMENT_FORM_SUBMITTED: 'enrollment.form.submitted',
  
  // Goal Events
  GOAL_CREATED: 'goal.created',
  GOAL_UPDATED: 'goal.updated',
  GOAL_DELETED: 'goal.deleted',
  GOAL_PROGRESS_UPDATED: 'goal.progress.updated',
  GOAL_FORM_SUBMITTED: 'goal.form.submitted',
  
  // Plan Events
  PLAN_CREATED: 'plan.created',
  PLAN_UPDATED: 'plan.updated',
  PLAN_DELETED: 'plan.deleted',
  PLAN_FORM_SUBMITTED: 'plan.form.submitted',
  
  // Category Events
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',
  CATEGORY_FORM_SUBMITTED: 'category.form.submitted',
  
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_FORM_SUBMITTED: 'user.form.submitted',
  
  // Medical Consultant Events
  MEDICAL_CONSULTANT_CREATED: 'medical_consultant.created',
  MEDICAL_CONSULTANT_UPDATED: 'medical_consultant.updated',
  MEDICAL_CONSULTANT_DELETED: 'medical_consultant.deleted',
  MEDICAL_CONSULTANT_FORM_SUBMITTED: 'medical_consultant.form.submitted',
  
  // Clinical Documentation Events
  CLINICAL_DOC_CREATED: 'clinical_documentation.created',
  CLINICAL_DOC_UPDATED: 'clinical_documentation.updated',
  CLINICAL_DOC_DELETED: 'clinical_documentation.deleted',
  CLINICAL_DOC_FORM_SUBMITTED: 'clinical_documentation.form.submitted',
  
  // QR Attendance Events
  QR_ATTENDANCE_SCANNED: 'qr_attendance.scanned',
  QR_ATTENDANCE_CREATED: 'qr_attendance.created',
  QR_CODE_GENERATED: 'qr_code.generated',
  
  // Therapy Plan Enrollment Events
  THERAPY_PLAN_ENROLLMENT_CREATED: 'therapy_plan_enrollment.created',
  THERAPY_PLAN_ENROLLMENT_UPDATED: 'therapy_plan_enrollment.updated',
  THERAPY_PLAN_ENROLLMENT_DELETED: 'therapy_plan_enrollment.deleted',
  THERAPY_PLAN_ENROLLMENT_FORM_SUBMITTED: 'therapy_plan_enrollment.form.submitted',
  
  // Therapy Program Enrollment Events
  THERAPY_PROGRAM_ENROLLMENT_CREATED: 'therapy_program_enrollment.created',
  THERAPY_PROGRAM_ENROLLMENT_UPDATED: 'therapy_program_enrollment.updated',
  THERAPY_PROGRAM_ENROLLMENT_DELETED: 'therapy_program_enrollment.deleted',
  THERAPY_PROGRAM_ENROLLMENT_FORM_SUBMITTED: 'therapy_program_enrollment.form.submitted',
  
  // Billing Events
  BILLING_INVOICE_CREATED: 'billing.invoice.created',
  BILLING_PAYMENT_PROCESSED: 'billing.payment.processed',
  BILLING_PAYMENT_FAILED: 'billing.payment.failed',
  
  // Notification Events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // Analytics Events
  ANALYTICS_REPORT_GENERATED: 'analytics.report.generated',
  
  // System Events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning'
} as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]

class WebhookService {
  private webhooks: Map<string, WebhookConfig[]> = new Map()
  
  constructor() {
    this.loadWebhooks()
  }
  
  private loadWebhooks() {
    const savedWebhooks = localStorage.getItem('webhooks_config')
    if (savedWebhooks) {
      try {
        const parsed = JSON.parse(savedWebhooks)
        this.webhooks = new Map(Object.entries(parsed))
      } catch (error) {
        console.error('Failed to load webhook configurations:', error)
      }
    }
  }
  
  private saveWebhooks() {
    const webhooksObj = Object.fromEntries(this.webhooks)
    localStorage.setItem('webhooks_config', JSON.stringify(webhooksObj))
  }
  
  addWebhook(event: WebhookEvent, config: WebhookConfig): void {
    try {
      webhookConfigSchema.parse(config)
      
      if (!this.webhooks.has(event)) {
        this.webhooks.set(event, [])
      }
      
      this.webhooks.get(event)!.push(config)
      this.saveWebhooks()
    } catch (error) {
      console.error('Invalid webhook configuration:', error)
      throw new Error('Invalid webhook configuration')
    }
  }
  
  removeWebhook(event: WebhookEvent, url: string): boolean {
    const eventWebhooks = this.webhooks.get(event)
    if (!eventWebhooks) return false
    
    const index = eventWebhooks.findIndex(webhook => webhook.url === url)
    if (index === -1) return false
    
    eventWebhooks.splice(index, 1)
    
    if (eventWebhooks.length === 0) {
      this.webhooks.delete(event)
    }
    
    this.saveWebhooks()
    return true
  }
  
  getWebhooks(event?: WebhookEvent): WebhookConfig[] {
    if (event) {
      return this.webhooks.get(event) || []
    }
    
    const allWebhooks: WebhookConfig[] = []
    for (const configs of this.webhooks.values()) {
      allWebhooks.push(...configs)
    }
    return allWebhooks
  }
  
  async triggerWebhook(event: WebhookEvent, data: any, metadata?: Record<string, any>): Promise<WebhookResponse[]> {
    const eventWebhooks = this.webhooks.get(event)
    if (!eventWebhooks || eventWebhooks.length === 0) {
      return []
    }
    
    const payload: WebhookPayload = {
      event,
      action: this.extractAction(event),
      data,
      timestamp: new Date().toISOString(),
      source: 'therapy-management-system',
      metadata
    }
    
    const responses = await Promise.allSettled(
      eventWebhooks
        .filter(webhook => webhook.active)
        .map(webhook => this.sendWebhook(webhook, payload))
    )
    
    return responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`Webhook failed for ${eventWebhooks[index].url}:`, result.reason)
        return {
          success: false,
          message: result.reason?.message || 'Webhook request failed',
          errors: [result.reason?.message || 'Unknown error']
        }
      }
    })
  }
  
  private extractAction(event: WebhookEvent): WebhookPayload['action'] {
    if (event.includes('.created')) return 'create'
    if (event.includes('.updated')) return 'update'
    if (event.includes('.deleted')) return 'delete'
    if (event.includes('.submitted')) return 'submit'
    if (event.includes('.completed')) return 'complete'
    return 'create'
  }
  
  private async sendWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<WebhookResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Therapy-Management-System-Webhook/1.0'
      }
      
      if (config.secret) {
        const signature = await this.generateSignature(JSON.stringify(payload), config.secret)
        headers['X-Webhook-Signature'] = signature
      }
      
      let lastError: Error | null = null
      
      for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
        try {
          const response = await fetch(config.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          let responseData: any = null
          const contentType = response.headers.get('content-type')
          
          if (contentType && contentType.includes('application/json')) {
            try {
              responseData = await response.json()
            } catch (e) {
              console.warn('Failed to parse JSON response')
            }
          }
          
          return {
            success: true,
            message: `Webhook delivered successfully (attempt ${attempt + 1})`,
            data: responseData
          }
          
        } catch (error) {
          lastError = error as Error
          
          if (attempt < config.retryAttempts - 1) {
            await this.delay(Math.pow(2, attempt) * 1000)
          }
        }
      }
      
      throw lastError
      
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
  
  private async generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const hashArray = Array.from(new Uint8Array(signature))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return `sha256=${hashHex}`
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  validateWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    return this.generateSignature(payload, secret).then(expectedSignature => {
      return signature === expectedSignature
    }).catch(() => false)
  }
  
  clearAllWebhooks(): void {
    this.webhooks.clear()
    this.saveWebhooks()
  }
  
  exportWebhooks(): string {
    return JSON.stringify(Object.fromEntries(this.webhooks), null, 2)
  }
  
  importWebhooks(webhooksJson: string): boolean {
    try {
      const parsed = JSON.parse(webhooksJson)
      const newWebhooks = new Map(Object.entries(parsed))
      
      for (const [event, configs] of newWebhooks) {
        if (Array.isArray(configs)) {
          for (const config of configs) {
            webhookConfigSchema.parse(config)
          }
        }
      }
      
      this.webhooks = newWebhooks
      this.saveWebhooks()
      return true
    } catch (error) {
      console.error('Failed to import webhooks:', error)
      return false
    }
  }
}

export const webhookService = new WebhookService()

export const createFormSubmissionWebhook = (
  formType: string,
  formData: any,
  action: 'create' | 'update' = 'create',
  metadata?: Record<string, any>
) => {
  const eventMap: Record<string, WebhookEvent> = {
    student: WEBHOOK_EVENTS.STUDENT_FORM_SUBMITTED,
    therapist: WEBHOOK_EVENTS.THERAPIST_FORM_SUBMITTED,
    course: WEBHOOK_EVENTS.COURSE_FORM_SUBMITTED,
    session: WEBHOOK_EVENTS.SESSION_FORM_SUBMITTED,
    therapy_program: WEBHOOK_EVENTS.THERAPY_PROGRAM_FORM_SUBMITTED,
    medical_record: WEBHOOK_EVENTS.MEDICAL_RECORD_FORM_SUBMITTED,
    assessment: WEBHOOK_EVENTS.ASSESSMENT_FORM_SUBMITTED,
    enrollment: WEBHOOK_EVENTS.ENROLLMENT_FORM_SUBMITTED,
    goal: WEBHOOK_EVENTS.GOAL_FORM_SUBMITTED,
    plan: WEBHOOK_EVENTS.PLAN_FORM_SUBMITTED,
    category: WEBHOOK_EVENTS.CATEGORY_FORM_SUBMITTED,
    user: WEBHOOK_EVENTS.USER_FORM_SUBMITTED,
    medical_consultant: WEBHOOK_EVENTS.MEDICAL_CONSULTANT_FORM_SUBMITTED,
    clinical_documentation: WEBHOOK_EVENTS.CLINICAL_DOC_FORM_SUBMITTED,
    therapy_plan_enrollment: WEBHOOK_EVENTS.THERAPY_PLAN_ENROLLMENT_FORM_SUBMITTED,
    therapy_program_enrollment: WEBHOOK_EVENTS.THERAPY_PROGRAM_ENROLLMENT_FORM_SUBMITTED
  }
  
  const event = eventMap[formType]
  if (event) {
    return webhookService.triggerWebhook(event, formData, {
      action,
      formType,
      ...metadata
    })
  }
  
  console.warn(`No webhook event found for form type: ${formType}`)
  return Promise.resolve([])
}

export const createEntityWebhook = (
  entityType: string,
  action: 'created' | 'updated' | 'deleted',
  entityData: any,
  metadata?: Record<string, any>
) => {
  const eventMap: Record<string, Record<string, WebhookEvent>> = {
    student: {
      created: WEBHOOK_EVENTS.STUDENT_CREATED,
      updated: WEBHOOK_EVENTS.STUDENT_UPDATED,
      deleted: WEBHOOK_EVENTS.STUDENT_DELETED
    },
    therapist: {
      created: WEBHOOK_EVENTS.THERAPIST_CREATED,
      updated: WEBHOOK_EVENTS.THERAPIST_UPDATED,
      deleted: WEBHOOK_EVENTS.THERAPIST_DELETED
    },
    course: {
      created: WEBHOOK_EVENTS.COURSE_CREATED,
      updated: WEBHOOK_EVENTS.COURSE_UPDATED,
      deleted: WEBHOOK_EVENTS.COURSE_DELETED
    },
    session: {
      created: WEBHOOK_EVENTS.SESSION_CREATED,
      updated: WEBHOOK_EVENTS.SESSION_UPDATED,
      deleted: WEBHOOK_EVENTS.SESSION_DELETED
    },
    therapy_program: {
      created: WEBHOOK_EVENTS.THERAPY_PROGRAM_CREATED,
      updated: WEBHOOK_EVENTS.THERAPY_PROGRAM_UPDATED,
      deleted: WEBHOOK_EVENTS.THERAPY_PROGRAM_DELETED
    },
    medical_record: {
      created: WEBHOOK_EVENTS.MEDICAL_RECORD_CREATED,
      updated: WEBHOOK_EVENTS.MEDICAL_RECORD_UPDATED,
      deleted: WEBHOOK_EVENTS.MEDICAL_RECORD_DELETED
    },
    assessment: {
      created: WEBHOOK_EVENTS.ASSESSMENT_CREATED,
      updated: WEBHOOK_EVENTS.ASSESSMENT_UPDATED,
      deleted: WEBHOOK_EVENTS.ASSESSMENT_DELETED
    },
    enrollment: {
      created: WEBHOOK_EVENTS.ENROLLMENT_CREATED,
      updated: WEBHOOK_EVENTS.ENROLLMENT_UPDATED,
      deleted: WEBHOOK_EVENTS.ENROLLMENT_DELETED
    },
    goal: {
      created: WEBHOOK_EVENTS.GOAL_CREATED,
      updated: WEBHOOK_EVENTS.GOAL_UPDATED,
      deleted: WEBHOOK_EVENTS.GOAL_DELETED
    },
    plan: {
      created: WEBHOOK_EVENTS.PLAN_CREATED,
      updated: WEBHOOK_EVENTS.PLAN_UPDATED,
      deleted: WEBHOOK_EVENTS.PLAN_DELETED
    },
    category: {
      created: WEBHOOK_EVENTS.CATEGORY_CREATED,
      updated: WEBHOOK_EVENTS.CATEGORY_UPDATED,
      deleted: WEBHOOK_EVENTS.CATEGORY_DELETED
    },
    user: {
      created: WEBHOOK_EVENTS.USER_CREATED,
      updated: WEBHOOK_EVENTS.USER_UPDATED,
      deleted: WEBHOOK_EVENTS.USER_DELETED
    },
    medical_consultant: {
      created: WEBHOOK_EVENTS.MEDICAL_CONSULTANT_CREATED,
      updated: WEBHOOK_EVENTS.MEDICAL_CONSULTANT_UPDATED,
      deleted: WEBHOOK_EVENTS.MEDICAL_CONSULTANT_DELETED
    },
    clinical_documentation: {
      created: WEBHOOK_EVENTS.CLINICAL_DOC_CREATED,
      updated: WEBHOOK_EVENTS.CLINICAL_DOC_UPDATED,
      deleted: WEBHOOK_EVENTS.CLINICAL_DOC_DELETED
    },
    therapy_plan_enrollment: {
      created: WEBHOOK_EVENTS.THERAPY_PLAN_ENROLLMENT_CREATED,
      updated: WEBHOOK_EVENTS.THERAPY_PLAN_ENROLLMENT_UPDATED,
      deleted: WEBHOOK_EVENTS.THERAPY_PLAN_ENROLLMENT_DELETED
    },
    therapy_program_enrollment: {
      created: WEBHOOK_EVENTS.THERAPY_PROGRAM_ENROLLMENT_CREATED,
      updated: WEBHOOK_EVENTS.THERAPY_PROGRAM_ENROLLMENT_UPDATED,
      deleted: WEBHOOK_EVENTS.THERAPY_PROGRAM_ENROLLMENT_DELETED
    }
  }
  
  const event = eventMap[entityType]?.[action]
  if (event) {
    return webhookService.triggerWebhook(event, entityData, {
      action,
      entityType,
      ...metadata
    })
  }
  
  console.warn(`No webhook event found for entity: ${entityType}, action: ${action}`)
  return Promise.resolve([])
}