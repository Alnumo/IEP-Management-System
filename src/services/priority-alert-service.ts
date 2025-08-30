/**
 * Priority Alert Processing Service
 * Content analysis, escalation rules, and automated emergency protocols
 * Arkan Al-Numo Center - Emergency Response System
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import { notificationService } from '@/services/notification-service'
import type { 
  PriorityAnalysisResult, 
  AlertEscalationRule,
  MessagePriority 
} from '@/types/communication'
import type { Message } from '@/types/communication'

// =====================================================
// PRIORITY DETECTION KEYWORDS
// =====================================================

const PRIORITY_KEYWORDS = {
  urgent: {
    ar: [
      'طارئ', 'عاجل', 'مستعجل', 'أزمة', 'حالة طوارئ', 'خطير', 'سقط', 'مصاب',
      'نزيف', 'صعوبة تنفس', 'فقدان وعي', 'حساسية', 'حرارة عالية', 'ألم شديد',
      'تشنج', 'نوبة', 'رفض طعام', 'عدوان', 'إيذاء نفس', 'هروب'
    ],
    en: [
      'emergency', 'urgent', 'crisis', 'help', 'hurt', 'injured', 'bleeding',
      'breathing', 'unconscious', 'allergy', 'fever', 'severe pain', 'seizure',
      'violence', 'self-harm', 'runaway', 'suicide', 'abuse'
    ]
  },
  high: {
    ar: [
      'قلق', 'مشكلة', 'صعوبة', 'تراجع', 'رفض', 'بكاء شديد', 'عناد',
      'تغيير سلوك', 'فقدان مهارة', 'عدم تعاون', 'مخاوف', 'توتر',
      'مقاومة علاج', 'عدم تقدم', 'شكوى متكررة'
    ],
    en: [
      'concern', 'problem', 'difficulty', 'regression', 'refusing', 'crying',
      'behavior change', 'skill loss', 'not cooperating', 'worried', 'stressed',
      'treatment resistance', 'no progress', 'repeated complaint'
    ]
  },
  normal: {
    ar: [
      'استفسار', 'سؤال', 'معلومة', 'تحديث', 'تقدم', 'تحسن', 'نجح',
      'تطور إيجابي', 'مشاركة جيدة', 'تعاون', 'إنجاز'
    ],
    en: [
      'question', 'inquiry', 'information', 'update', 'progress', 'improvement',
      'success', 'positive', 'participating', 'cooperating', 'achievement'
    ]
  }
}

const ESCALATION_CONTEXTS = {
  medical: {
    ar: ['طبي', 'صحة', 'دواء', 'حساسية', 'حرارة', 'ألم', 'مرض'],
    en: ['medical', 'health', 'medication', 'allergy', 'fever', 'pain', 'illness']
  },
  behavioral: {
    ar: ['سلوك', 'عدوان', 'عناد', 'رفض', 'هروب', 'إيذاء'],
    en: ['behavior', 'aggressive', 'defiant', 'refusing', 'running', 'harm']
  },
  safety: {
    ar: ['أمان', 'خطر', 'سقط', 'جرح', 'مصاب', 'حادث'],
    en: ['safety', 'danger', 'fell', 'injured', 'accident', 'hurt']
  }
}

// =====================================================
// PRIORITY ANALYSIS ENGINE
// =====================================================

export class PriorityAlertAnalyzer {
  
  // Main analysis function
  analyzeMessagePriority(content: string): PriorityAnalysisResult {
    const cleanContent = content.toLowerCase().trim()
    const detectedConcerns: string[] = []
    let priority: MessagePriority = 'normal'
    let requiresImmediateResponse = false
    let escalationRequired = false
    let confidenceScore = 0

    // Check for urgent keywords
    const urgentMatches = this.findKeywordMatches(cleanContent, PRIORITY_KEYWORDS.urgent)
    if (urgentMatches.length > 0) {
      priority = 'urgent'
      requiresImmediateResponse = true
      escalationRequired = true
      confidenceScore = 0.9
      detectedConcerns.push(`كلمات طوارئ: ${urgentMatches.join(', ')}`)
    }
    
    // Check for high priority keywords
    else if (this.findKeywordMatches(cleanContent, PRIORITY_KEYWORDS.high).length > 0) {
      const highMatches = this.findKeywordMatches(cleanContent, PRIORITY_KEYWORDS.high)
      priority = 'high'
      requiresImmediateResponse = true
      confidenceScore = 0.7
      detectedConcerns.push(`مؤشرات أولوية عالية: ${highMatches.join(', ')}`)
    }

    // Context analysis
    const contextAnalysis = this.analyzeContext(cleanContent)
    if (contextAnalysis.requiresEscalation) {
      escalationRequired = true
      confidenceScore = Math.max(confidenceScore, 0.8)
      detectedConcerns.push(...contextAnalysis.concerns)
    }

    // Emergency patterns detection
    const emergencyPatterns = this.detectEmergencyPatterns(cleanContent)
    if (emergencyPatterns.length > 0) {
      priority = 'urgent'
      requiresImmediateResponse = true
      escalationRequired = true
      confidenceScore = 0.95
      detectedConcerns.push(...emergencyPatterns)
    }

    return {
      priority,
      requiresImmediateResponse,
      escalationRequired,
      detectedConcerns,
      confidenceScore
    }
  }

  // Find matching keywords
  private findKeywordMatches(content: string, keywords: { ar: string[], en: string[] }): string[] {
    const matches: string[] = []
    
    [...keywords.ar, ...keywords.en].forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matches.push(keyword)
      }
    })

    return matches
  }

  // Analyze context for escalation needs
  private analyzeContext(content: string): { requiresEscalation: boolean, concerns: string[] } {
    const concerns: string[] = []
    let requiresEscalation = false

    // Medical context check
    if (this.hasContextKeywords(content, ESCALATION_CONTEXTS.medical)) {
      concerns.push('سياق طبي محتمل')
      if (this.hasUrgentMedicalIndicators(content)) {
        requiresEscalation = true
        concerns.push('مؤشرات طبية عاجلة')
      }
    }

    // Safety context check
    if (this.hasContextKeywords(content, ESCALATION_CONTEXTS.safety)) {
      concerns.push('مخاوف أمنية محتملة')
      requiresEscalation = true
    }

    // Behavioral escalation check
    if (this.hasContextKeywords(content, ESCALATION_CONTEXTS.behavioral)) {
      concerns.push('مخاوف سلوكية')
      if (this.hasSevereBehavioralIndicators(content)) {
        requiresEscalation = true
        concerns.push('سلوكيات خطيرة محتملة')
      }
    }

    return { requiresEscalation, concerns }
  }

  private hasContextKeywords(content: string, context: { ar: string[], en: string[] }): boolean {
    return [...context.ar, ...context.en].some(keyword => 
      content.includes(keyword.toLowerCase())
    )
  }

  private hasUrgentMedicalIndicators(content: string): boolean {
    const urgentMedical = [
      'حرارة عالية', 'صعوبة تنفس', 'نزيف', 'فقدان وعي', 'تشنج',
      'high fever', 'breathing difficulty', 'bleeding', 'unconscious', 'seizure'
    ]
    return urgentMedical.some(indicator => content.includes(indicator.toLowerCase()))
  }

  private hasSevereBehavioralIndicators(content: string): boolean {
    const severeBehavioral = [
      'إيذاء نفس', 'عدوان شديد', 'تكسير', 'هروب', 'رفض تام',
      'self-harm', 'severe aggression', 'destroying', 'running away', 'complete refusal'
    ]
    return severeBehavioral.some(indicator => content.includes(indicator.toLowerCase()))
  }

  // Detect emergency patterns (multiple indicators combined)
  private detectEmergencyPatterns(content: string): string[] {
    const patterns: string[] = []

    // Medical emergency pattern
    if (content.includes('طارئ') && this.hasUrgentMedicalIndicators(content)) {
      patterns.push('نمط طوارئ طبية')
    }

    // Safety emergency pattern  
    if ((content.includes('مساعدة') || content.includes('help')) && 
        (content.includes('خطر') || content.includes('danger'))) {
      patterns.push('نمط طوارئ أمنية')
    }

    // Behavioral crisis pattern
    if (content.includes('أزمة') || content.includes('crisis')) {
      patterns.push('نمط أزمة سلوكية')
    }

    return patterns
  }
}

// =====================================================
// ESCALATION RULES ENGINE
// =====================================================

export class AlertEscalationEngine {
  private defaultRules: AlertEscalationRule[] = [
    {
      trigger_keywords: ['طارئ', 'emergency', 'مساعدة', 'help', 'أزمة', 'crisis'],
      priority_threshold: 'urgent',
      escalation_delay_minutes: 0, // Immediate
      notification_channels: ['sms', 'email', 'push', 'in_app'],
      escalation_roles: ['supervisor', 'administrator', 'emergency_contact']
    },
    {
      trigger_keywords: ['حساسية', 'allergy', 'نزيف', 'bleeding', 'تشنج', 'seizure'],
      priority_threshold: 'urgent',
      escalation_delay_minutes: 0,
      notification_channels: ['sms', 'email', 'push'],
      escalation_roles: ['medical_supervisor', 'administrator', 'parent']
    },
    {
      trigger_keywords: ['قلق', 'concern', 'مشكلة', 'problem', 'صعوبة', 'difficulty'],
      priority_threshold: 'high',
      escalation_delay_minutes: 15,
      notification_channels: ['in_app', 'email'],
      escalation_roles: ['supervisor', 'primary_therapist']
    }
  ]

  // Process alert and determine escalation
  async processAlert(
    message: Message, 
    analysisResult: PriorityAnalysisResult
  ): Promise<void> {
    
    try {
      // Find matching escalation rules
      const matchingRules = this.findMatchingRules(message, analysisResult)
      
      if (matchingRules.length === 0) return

      // Process each matching rule
      for (const rule of matchingRules) {
        await this.executeEscalationRule(message, rule, analysisResult)
      }

      // Log escalation activity
      await this.logEscalationActivity(message, analysisResult, matchingRules)

    } catch (error) {
      console.error('Alert processing error:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'AlertEscalationEngine',
        action: 'process_alert',
        messageId: message.id
      })
    }
  }

  private findMatchingRules(
    message: Message, 
    analysis: PriorityAnalysisResult
  ): AlertEscalationRule[] {
    
    return this.defaultRules.filter(rule => {
      // Check priority threshold
      if (!this.meetsPriorityThreshold(analysis.priority, rule.priority_threshold)) {
        return false
      }

      // Check for trigger keywords
      const content = (message.content_ar || message.content_en || '').toLowerCase()
      return rule.trigger_keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      )
    })
  }

  private meetsPriorityThreshold(
    currentPriority: MessagePriority, 
    threshold: MessagePriority
  ): boolean {
    const priorityOrder = { low: 1, normal: 2, high: 3, urgent: 4 }
    return priorityOrder[currentPriority] >= priorityOrder[threshold]
  }

  // Execute escalation rule
  private async executeEscalationRule(
    message: Message,
    rule: AlertEscalationRule,
    analysis: PriorityAnalysisResult
  ): Promise<void> {
    
    // Get stakeholders for escalation roles
    const stakeholders = await this.getStakeholdersByRoles(
      message.conversation_id,
      rule.escalation_roles
    )

    // Prepare escalation notification
    const escalationData = {
      message_id: message.id,
      conversation_id: message.conversation_id,
      original_content: message.content_ar || message.content_en,
      detected_concerns: analysis.detectedConcerns.join(', '),
      confidence_score: analysis.confidenceScore,
      escalation_reason: `تطبيق قاعدة: ${rule.trigger_keywords.join(', ')}`
    }

    // Send notifications to each stakeholder
    for (const stakeholder of stakeholders) {
      await this.sendEscalationNotification(
        stakeholder,
        escalationData,
        rule.notification_channels,
        rule.escalation_delay_minutes
      )
    }

    // Update message with escalation status
    await supabase
      .from('messages')
      .update({
        alert_processed: true,
        alert_level: analysis.priority,
        escalation_triggered: true,
        escalation_at: new Date().toISOString()
      })
      .eq('id', message.id)
  }

  // =====================================================
  // STAKEHOLDER MANAGEMENT
  // =====================================================

  private async getStakeholdersByRoles(
    conversationId: string,
    roles: string[]
  ): Promise<Array<{ id: string, name: string, email: string, phone?: string, role: string }>> {
    
    try {
      const stakeholders: any[] = []

      // Get conversation participants
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          *,
          parent:parent_id(id, name, email, phone),
          therapist:therapist_id(id, first_name_ar, last_name_ar, email, phone),
          student:student_id(*)
        `)
        .eq('id', conversationId)
        .single()

      if (!conversation) return []

      // Add stakeholders based on roles
      for (const role of roles) {
        switch (role) {
          case 'parent':
            if (conversation.parent) {
              stakeholders.push({
                ...conversation.parent,
                role: 'parent'
              })
            }
            break

          case 'primary_therapist':
            if (conversation.therapist) {
              stakeholders.push({
                id: conversation.therapist.id,
                name: `${conversation.therapist.first_name_ar} ${conversation.therapist.last_name_ar}`,
                email: conversation.therapist.email,
                phone: conversation.therapist.phone,
                role: 'therapist'
              })
            }
            break

          case 'supervisor':
          case 'administrator':
            // Get supervisors/admins from user roles
            const { data: adminUsers } = await supabase
              .from('users')
              .select('id, email, user_metadata')
              .contains('user_metadata', { role: role === 'supervisor' ? 'supervisor' : 'admin' })

            stakeholders.push(...(adminUsers || []).map(user => ({
              id: user.id,
              name: user.user_metadata?.name || 'مسؤول',
              email: user.email,
              role: role
            })))
            break

          case 'emergency_contact':
            // Get emergency contacts for the student
            if (conversation.student?.emergency_contact_phone) {
              stakeholders.push({
                id: 'emergency',
                name: 'جهة الاتصال الطارئة',
                phone: conversation.student.emergency_contact_phone,
                email: conversation.student.emergency_contact_email || '',
                role: 'emergency_contact'
              })
            }
            break
        }
      }

      return stakeholders

    } catch (error) {
      console.error('Error getting stakeholders:', error)
      return []
    }
  }

  // =====================================================
  // NOTIFICATION DISPATCH
  // =====================================================

  private async sendEscalationNotification(
    stakeholder: any,
    escalationData: any,
    channels: string[],
    delayMinutes: number = 0
  ): Promise<void> {
    
    const notificationData = {
      recipient_id: stakeholder.id,
      type: 'priority_alert',
      title: 'تنبيه أولوية عالية',
      message: this.buildEscalationMessage(escalationData, stakeholder.role),
      priority: 'urgent',
      data: escalationData,
      channels: channels
    }

    if (delayMinutes > 0) {
      // Schedule delayed notification
      setTimeout(async () => {
        await notificationService.sendNotification(notificationData)
      }, delayMinutes * 60 * 1000)
    } else {
      // Send immediate notification
      await notificationService.sendNotification(notificationData)
    }

    // Special handling for emergency contacts
    if (stakeholder.role === 'emergency_contact' && stakeholder.phone) {
      await this.sendEmergencySMS(stakeholder.phone, escalationData)
    }
  }

  private buildEscalationMessage(escalationData: any, role: string): string {
    const baseMessage = `تم اكتشاف رسالة ذات أولوية عالية في المحادثة.`
    
    const roleMessages = {
      parent: `${baseMessage} يرجى مراجعة الرسالة والرد في أقرب وقت.`,
      therapist: `${baseMessage} قد تحتاج لتدخل مباشر أو تغيير خطة العلاج.`,
      supervisor: `${baseMessage} يرجى مراجعة الحالة واتخاذ الإجراء المناسب.`,
      administrator: `${baseMessage} قد تحتاج لإجراءات إدارية عاجلة.`,
      emergency_contact: `تنبيه طارئ من مركز أركان النمو. يرجى التواصل فوراً.`
    }

    let message = roleMessages[role] || baseMessage

    if (escalationData.detected_concerns) {
      message += `\n\nالمؤشرات المكتشفة: ${escalationData.detected_concerns}`
    }

    if (escalationData.confidence_score > 0.8) {
      message += `\n\n⚠️ مستوى ثقة عالي (${Math.round(escalationData.confidence_score * 100)}%)`
    }

    return message
  }

  private async sendEmergencySMS(phone: string, escalationData: any): Promise<void> {
    try {
      // Integration with SMS service (placeholder for actual SMS provider)
      console.log('Emergency SMS would be sent to:', phone)
      console.log('Message:', `طوارئ - مركز أركان النمو. يرجى التواصل فوراً.`)
      
      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // await smsService.sendEmergencySMS(phone, message)

    } catch (error) {
      console.error('Emergency SMS error:', error)
    }
  }

  // =====================================================
  // LOGGING AND AUDIT
  // =====================================================

  private async logEscalationActivity(
    message: Message,
    analysis: PriorityAnalysisResult,
    rules: AlertEscalationRule[]
  ): Promise<void> {
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('escalation_logs')
        .insert({
          message_id: message.id,
          conversation_id: message.conversation_id,
          triggered_rules: rules.map(r => r.id),
          analysis_result: analysis,
          processed_by: 'system',
          processed_at: new Date().toISOString(),
          created_by: user?.id || 'system'
        })

    } catch (error) {
      console.error('Error logging escalation:', error)
    }
  }
}

// =====================================================
// MAIN SERVICE EXPORT
// =====================================================

export const priorityAlertService = {
  // Create analyzer instance
  createAnalyzer(): PriorityAlertAnalyzer {
    return new PriorityAlertAnalyzer()
  },

  // Create escalation engine
  createEscalationEngine(): AlertEscalationEngine {
    return new AlertEscalationEngine()
  },

  // Process single message for alerts
  async processMessage(message: Message): Promise<PriorityAnalysisResult> {
    const analyzer = new PriorityAlertAnalyzer()
    const escalationEngine = new AlertEscalationEngine()

    // Analyze message priority
    const content = message.content_ar || message.content_en || ''
    const analysis = analyzer.analyzeMessagePriority(content)

    // Process escalation if needed
    if (analysis.escalationRequired) {
      await escalationEngine.processAlert(message, analysis)
    }

    return analysis
  },

  // Batch process messages
  async processBatchMessages(messages: Message[]): Promise<PriorityAnalysisResult[]> {
    const results: PriorityAnalysisResult[] = []
    
    for (const message of messages) {
      try {
        const result = await this.processMessage(message)
        results.push(result)
      } catch (error) {
        console.error('Error processing message:', message.id, error)
        results.push({
          priority: 'normal',
          requiresImmediateResponse: false,
          escalationRequired: false,
          detectedConcerns: ['خطأ في المعالجة'],
          confidenceScore: 0
        })
      }
    }

    return results
  },

  // Get alert statistics
  async getAlertStatistics(dateFrom: string, dateTo: string): Promise<{
    totalAlerts: number
    urgentAlerts: number
    escalatedAlerts: number
    averageResponseTime: number
    topConcerns: string[]
  }> {
    
    try {
      const { data: alerts, error } = await supabase
        .from('messages')
        .select('alert_level, escalation_triggered, created_at, escalation_at')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .eq('alert_processed', true)

      if (error) throw error

      const totalAlerts = alerts?.length || 0
      const urgentAlerts = alerts?.filter(a => a.alert_level === 'urgent').length || 0
      const escalatedAlerts = alerts?.filter(a => a.escalation_triggered).length || 0

      // Calculate average response time for escalated alerts
      const responseTimes = alerts
        ?.filter(a => a.escalation_triggered && a.escalation_at)
        .map(a => {
          const created = new Date(a.created_at).getTime()
          const escalated = new Date(a.escalation_at).getTime()
          return escalated - created
        }) || []

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000 / 60 // minutes
        : 0

      // Get top concerns from escalation logs
      const { data: logs } = await supabase
        .from('escalation_logs')
        .select('analysis_result')
        .gte('processed_at', dateFrom)
        .lte('processed_at', dateTo)

      const allConcerns = logs?.flatMap(log => 
        log.analysis_result?.detectedConcerns || []
      ) || []

      const concernCounts = allConcerns.reduce((acc, concern) => {
        acc[concern] = (acc[concern] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topConcerns = Object.entries(concernCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([concern]) => concern)

      return {
        totalAlerts,
        urgentAlerts,
        escalatedAlerts,
        averageResponseTime: Math.round(averageResponseTime),
        topConcerns
      }

    } catch (error) {
      console.error('Error getting alert statistics:', error)
      return {
        totalAlerts: 0,
        urgentAlerts: 0,
        escalatedAlerts: 0,
        averageResponseTime: 0,
        topConcerns: []
      }
    }
  },

  // Test priority detection on sample content
  async testPriorityDetection(content: string): Promise<PriorityAnalysisResult> {
    const analyzer = new PriorityAlertAnalyzer()
    return analyzer.analyzeMessagePriority(content)
  }
}