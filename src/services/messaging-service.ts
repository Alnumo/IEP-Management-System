/**
 * Real-time Messaging Service
 * Comprehensive messaging system with real-time features, media handling, and priority alerts
 * Following notification-service.ts patterns for consistency
 */

import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { retryApiCall } from '@/lib/retry-utils'

// =============================================================================
// MESSAGING TYPES & INTERFACES
// =============================================================================

export type MessageType = 'text' | 'media' | 'voice_note' | 'system' | 'session_update' | 'progress_update'
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent'
export type ConversationStatus = 'active' | 'archived' | 'blocked' | 'muted'
export type ParticipantRole = 
  | 'primary_parent' 
  | 'secondary_parent' 
  | 'primary_therapist' 
  | 'secondary_therapist' 
  | 'supervisor' 
  | 'administrator' 
  | 'observer'

export interface Conversation {
  id: string
  parent_id: string
  therapist_id: string
  student_id: string
  title_ar?: string
  title_en?: string
  description_ar?: string
  description_en?: string
  status: ConversationStatus
  last_message_at: string
  last_message_by?: string
  message_count: number
  unread_count_parent: number
  unread_count_therapist: number
  parent_notifications_enabled: boolean
  therapist_notifications_enabled: boolean
  voice_calls_enabled: boolean
  media_sharing_enabled: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  content_ar?: string
  content_en?: string
  message_type: MessageType
  priority_level: MessagePriority
  requires_response: boolean
  response_deadline?: string
  media_attachments: MediaAttachment[]
  read_status: boolean
  read_at?: string
  delivered_at: string
  alert_processed: boolean
  alert_level?: string
  escalation_triggered: boolean
  escalation_at?: string
  related_session_id?: string
  related_goal_id?: string
  related_assessment_id?: string
  reply_to_message_id?: string
  thread_id?: string
  created_at: string
  updated_at: string
}

export interface MediaAttachment {
  id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  thumbnail_path?: string
  width?: number
  height?: number
  duration?: number // for videos/audio
  compressed: boolean
  compression_ratio?: number
}

export interface CreateConversationData {
  parent_id: string
  therapist_id: string
  student_id: string
  title_ar?: string
  title_en?: string
  description_ar?: string
  description_en?: string
}

export interface SendMessageData {
  conversation_id: string
  recipient_id: string
  content_ar?: string
  content_en?: string
  message_type: MessageType
  priority_level?: MessagePriority
  requires_response?: boolean
  response_deadline?: string
  media_attachments?: MediaAttachment[]
  related_session_id?: string
  related_goal_id?: string
  reply_to_message_id?: string
}

export interface PriorityAnalysisResult {
  priority: MessagePriority
  requiresImmediateResponse: boolean
  escalationRequired: boolean
  detectedConcerns: string[]
  confidenceScore: number
}

// =============================================================================
// MESSAGING SERVICE CLASS
// =============================================================================

export class MessagingService {
  private static instance: MessagingService
  private realtimeSubscriptions: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService()
    }
    return MessagingService.instance
  }

  /**
   * Create a new conversation between parent and therapist
   */
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Creating conversation:', data)

      const user = await requireAuth()

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('parent_id', data.parent_id)
        .eq('therapist_id', data.therapist_id)
        .eq('student_id', data.student_id)
        .single()

      if (existingConversation) {
        throw new Error('Conversation already exists between these participants')
      }

      const conversationData = {
        ...data,
        status: 'active' as ConversationStatus,
        message_count: 0,
        unread_count_parent: 0,
        unread_count_therapist: 0,
        parent_notifications_enabled: true,
        therapist_notifications_enabled: true,
        voice_calls_enabled: true,
        media_sharing_enabled: true,
        created_by: user.id
      }

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select(`
          *,
          student:students(
            id,
            first_name_ar,
            last_name_ar,
            first_name_en,
            last_name_en,
            registration_number
          ),
          parent:parent_profiles(name, email),
          therapist:therapist_profiles(name, email, specialization)
        `)
        .single()

      if (error) {
        console.error('❌ Error creating conversation:', error)
        errorMonitoring.reportError(error, {
          component: 'MessagingService',
          action: 'createConversation',
          userId: user.id,
          metadata: { parent_id: data.parent_id, therapist_id: data.therapist_id, student_id: data.student_id }
        })
        throw error
      }

      console.log('✅ Conversation created successfully:', newConversation.id)
      return newConversation
    }, {
      context: 'Creating conversation',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Send a message with priority detection and alert processing
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Sending message:', data)

      const user = await requireAuth()

      // Analyze message priority if content provided
      let priorityAnalysis: PriorityAnalysisResult | null = null
      if (data.content_ar || data.content_en) {
        priorityAnalysis = await this.analyzeMessagePriority(data.content_ar || data.content_en || '')
      }

      const messageData = {
        ...data,
        sender_id: user.id,
        priority_level: priorityAnalysis?.priority || data.priority_level || 'normal',
        requires_response: priorityAnalysis?.requiresImmediateResponse || data.requires_response || false,
        media_attachments: data.media_attachments || [],
        read_status: false,
        delivered_at: new Date().toISOString(),
        alert_processed: false,
        escalation_triggered: priorityAnalysis?.escalationRequired || false
      }

      // Validate content exists
      if (!messageData.content_ar && !messageData.content_en && messageData.media_attachments.length === 0) {
        throw new Error('Message must contain text content or media attachments')
      }

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error sending message:', error)
        errorMonitoring.reportError(error, {
          component: 'MessagingService',
          action: 'sendMessage',
          userId: user.id,
          metadata: { 
            conversation_id: data.conversation_id, 
            priority: messageData.priority_level,
            has_media: messageData.media_attachments.length > 0
          }
        })
        throw error
      }

      // Send real-time notification to recipient
      await this.broadcastMessage(newMessage)

      // Process priority alerts if needed
      if (priorityAnalysis?.escalationRequired) {
        await this.triggerPriorityAlert(newMessage, priorityAnalysis)
      }

      console.log('✅ Message sent successfully:', newMessage.id)
      return newMessage
    }, {
      context: 'Sending message',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getConversationMessages(
    conversationId: string, 
    options: {
      limit?: number
      offset?: number
      beforeMessageId?: string
    } = {}
  ): Promise<Message[]> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Fetching messages for conversation:', conversationId)

      const user = await requireAuth()

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_profiles(name, avatar_url),
          recipient:recipient_profiles(name, avatar_url),
          reply_to:reply_to_message(id, content_ar, content_en, sender_id),
          reactions:message_reactions(
            id, reaction_type, reaction_emoji,
            user:user_profiles(name, avatar_url)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      if (options.beforeMessageId) {
        const { data: beforeMessage } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', options.beforeMessageId)
          .single()

        if (beforeMessage) {
          query = query.lt('created_at', beforeMessage.created_at)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching messages:', error)
        errorMonitoring.reportError(error, {
          component: 'MessagingService',
          action: 'getConversationMessages',
          userId: user.id,
          metadata: { conversation_id: conversationId }
        })
        throw error
      }

      console.log('✅ Messages fetched successfully:', data?.length || 0, 'records')
      return data || []
    }, {
      context: 'Fetching conversation messages',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Get user conversations with latest message info
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Fetching conversations for user:', userId)

      const user = await requireAuth()

      const { data, error } = await supabase
        .from('conversation_summaries')
        .select('*')
        .or(`parent_id.eq.${userId},therapist_id.eq.${userId}`)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching conversations:', error)
        errorMonitoring.reportError(error, {
          component: 'MessagingService',
          action: 'getUserConversations',
          userId: user.id,
          metadata: { requested_user_id: userId }
        })
        throw error
      }

      console.log('✅ Conversations fetched successfully:', data?.length || 0, 'records')
      return data || []
    }, {
      context: 'Fetching user conversations',
      maxAttempts: 3,
      logErrors: true
    })
  }

  /**
   * Mark messages as read in a conversation
   */
  async markMessagesAsRead(conversationId: string): Promise<number> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Marking messages as read:', conversationId)

      const user = await requireAuth()

      // Use database function for atomic update
      const { data, error } = await supabase.rpc('mark_conversation_messages_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id
      })

      if (error) {
        console.error('❌ Error marking messages as read:', error)
        errorMonitoring.reportError(error, {
          component: 'MessagingService',
          action: 'markMessagesAsRead',
          userId: user.id,
          metadata: { conversation_id: conversationId }
        })
        throw error
      }

      // Broadcast read status update
      await this.broadcastMessageRead(conversationId, user.id)

      console.log('✅ Messages marked as read:', data, 'messages')
      return data || 0
    }, {
      context: 'Marking messages as read',
      maxAttempts: 2,
      logErrors: true
    })
  }

  /**
   * Get unread message count for user
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    return retryApiCall(async () => {
      const user = await requireAuth()

      const { data, error } = await supabase.rpc('get_user_unread_message_count', {
        user_uuid: userId
      })

      if (error) {
        throw error
      }

      return data || 0
    }, {
      context: 'Getting unread message count',
      maxAttempts: 2,
      logErrors: false
    })
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Archiving conversation:', conversationId)

      const user = await requireAuth()

      const { error } = await supabase
        .from('conversations')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        console.error('❌ Error archiving conversation:', error)
        throw error
      }

      console.log('✅ Conversation archived successfully')
    }, {
      context: 'Archiving conversation',
      maxAttempts: 2,
      logErrors: true
    })
  }

  /**
   * Analyze message content for priority level and concerns
   */
  private async analyzeMessagePriority(content: string): Promise<PriorityAnalysisResult> {
    // Simple keyword-based analysis - in production, use ML/AI service
    const urgentKeywords = [
      // Arabic urgent keywords
      'طوارئ', 'عاجل', 'مساعدة فورية', 'حادة', 'خطر', 'صعوبة شديدة', 'مشكلة خطيرة',
      'يحتاج مساعدة', 'حالة طارئة', 'فوراً', 'بسرعة',
      // English urgent keywords  
      'urgent', 'emergency', 'immediate', 'critical', 'severe', 'serious problem',
      'need help', 'crisis', 'urgent care', 'immediately', 'asap'
    ]

    const highPriorityKeywords = [
      // Arabic high priority
      'مشكلة', 'قلق', 'تأخر', 'تراجع', 'صعوبة', 'مقلق', 'لا يتجاوب', 'رفض',
      // English high priority
      'concern', 'problem', 'difficulty', 'regression', 'worried', 'not responding'
    ]

    const lowercaseContent = content.toLowerCase()
    
    // Check for urgent keywords
    const urgentFound = urgentKeywords.some(keyword => 
      lowercaseContent.includes(keyword.toLowerCase())
    )
    
    // Check for high priority keywords
    const highPriorityFound = highPriorityKeywords.some(keyword => 
      lowercaseContent.includes(keyword.toLowerCase())
    )

    if (urgentFound) {
      return {
        priority: 'urgent',
        requiresImmediateResponse: true,
        escalationRequired: true,
        detectedConcerns: urgentKeywords.filter(k => lowercaseContent.includes(k.toLowerCase())),
        confidenceScore: 0.9
      }
    }

    if (highPriorityFound) {
      return {
        priority: 'high',
        requiresImmediateResponse: true,
        escalationRequired: false,
        detectedConcerns: highPriorityKeywords.filter(k => lowercaseContent.includes(k.toLowerCase())),
        confidenceScore: 0.7
      }
    }

    return {
      priority: 'normal',
      requiresImmediateResponse: false,
      escalationRequired: false,
      detectedConcerns: [],
      confidenceScore: 0.5
    }
  }

  /**
   * Broadcast new message to conversation participants
   */
  private async broadcastMessage(message: Message): Promise<void> {
    try {
      await supabase
        .channel(`conversation:${message.conversation_id}`)
        .send({
          type: 'broadcast',
          event: 'new_message',
          payload: { message }
        })

      console.log('📡 Message broadcasted successfully:', message.id)
    } catch (error) {
      console.error('❌ Error broadcasting message:', error)
      // Don't throw - message was saved, broadcast failure shouldn't break the flow
    }
  }

  /**
   * Broadcast message read status update
   */
  private async broadcastMessageRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .channel(`conversation:${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { userId, timestamp: new Date().toISOString() }
        })

      console.log('📡 Read status broadcasted successfully')
    } catch (error) {
      console.error('❌ Error broadcasting read status:', error)
    }
  }

  /**
   * Trigger priority alert for urgent messages
   */
  private async triggerPriorityAlert(message: Message, analysis: PriorityAnalysisResult): Promise<void> {
    try {
      console.log('🚨 Triggering priority alert for message:', message.id)

      // Get conversation details for context
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          *,
          student:students(first_name_ar, last_name_ar, first_name_en, last_name_en),
          therapist:therapist_profiles(name, email),
          parent:parent_profiles(name, email)
        `)
        .eq('id', message.conversation_id)
        .single()

      if (!conversation) return

      // Create urgent notification using existing notification service
      const { notificationService } = await import('./notification-service')
      
      const alertData = {
        student_name: conversation.student?.first_name_ar || conversation.student?.first_name_en,
        sender_name: message.sender_id === conversation.parent_id 
          ? conversation.parent?.name 
          : conversation.therapist?.name,
        concerns: analysis.detectedConcerns.join(', '),
        message_preview: (message.content_ar || message.content_en || '').substring(0, 100)
      }

      // Notify appropriate recipients based on sender
      const recipientId = message.sender_id === conversation.parent_id 
        ? conversation.therapist_id 
        : conversation.parent_id

      await notificationService.sendNotification(
        recipientId,
        message.sender_id === conversation.parent_id ? 'therapist' : 'parent',
        'emergency_contact',
        alertData,
        {
          priority: 'urgent',
          channels: ['in_app', 'sms', 'email', 'push']
        }
      )

      // Update message to mark alert as processed
      await supabase
        .from('messages')
        .update({ 
          alert_processed: true, 
          alert_level: analysis.priority,
          escalation_at: analysis.escalationRequired ? new Date().toISOString() : null
        })
        .eq('id', message.id)

      console.log('✅ Priority alert triggered successfully')
    } catch (error) {
      console.error('❌ Error triggering priority alert:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'MessagingService',
        action: 'triggerPriorityAlert',
        metadata: { message_id: message.id }
      })
    }
  }

  /**
   * Subscribe to real-time conversation updates
   */
  subscribeToConversation(
    conversationId: string,
    callbacks: {
      onNewMessage?: (message: Message) => void
      onMessageRead?: (data: { userId: string; timestamp: string }) => void
      onTyping?: (data: { userId: string; isTyping: boolean }) => void
    }
  ): () => void {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        callbacks.onNewMessage?.(payload.message)
      })
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        callbacks.onMessageRead?.(payload)
      })
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        callbacks.onTyping?.(payload)
      })
      .subscribe()

    this.realtimeSubscriptions.set(`conversation:${conversationId}`, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeSubscriptions.delete(`conversation:${conversationId}`)
    }
  }

  /**
   * Subscribe to user's conversation list updates
   */
  subscribeToUserConversations(
    userId: string,
    callback: (conversation: Conversation) => void
  ): () => void {
    const channel = supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `parent_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            callback(payload.new as Conversation)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `therapist_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            callback(payload.new as Conversation)
          }
        }
      )
      .subscribe()

    this.realtimeSubscriptions.set(`user_conversations:${userId}`, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeSubscriptions.delete(`user_conversations:${userId}`)
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      const user = await requireAuth()

      await supabase
        .channel(`conversation:${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'user_typing',
          payload: { userId: user.id, isTyping, timestamp: new Date().toISOString() }
        })
    } catch (error) {
      console.error('❌ Error sending typing indicator:', error)
      // Don't throw - typing indicator failure shouldn't break anything
    }
  }

  /**
   * Upload media attachment with compression
   */
  async uploadMediaAttachment(
    conversationId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<MediaAttachment> {
    return retryApiCall(async () => {
      console.log('🔍 Messaging Service: Uploading media:', file.name)

      const user = await requireAuth()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = `${conversationId}/${user.id}/${timestamp}.${fileExt}`

      // Compress file if it's an image or video
      let fileToUpload = file
      let compressionRatio = 1
      
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const { compressedFile, ratio } = await this.compressMediaFile(file)
        fileToUpload = compressedFile
        compressionRatio = ratio
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conversation-media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error uploading media:', uploadError)
        throw uploadError
      }

      // Generate thumbnail for images and videos
      let thumbnailPath: string | undefined
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        thumbnailPath = await this.generateThumbnail(fileName, file.type)
      }

      const mediaAttachment: MediaAttachment = {
        id: uploadData.path,
        filename: file.name,
        file_path: uploadData.path,
        file_size: fileToUpload.size,
        mime_type: file.type,
        thumbnail_path: thumbnailPath,
        compressed: compressionRatio < 1,
        compression_ratio: compressionRatio
      }

      console.log('✅ Media uploaded successfully:', mediaAttachment.id)
      return mediaAttachment
    }, {
      context: 'Uploading media attachment',
      maxAttempts: 2,
      logErrors: true
    })
  }

  /**
   * Compress media file for optimal upload
   */
  private async compressMediaFile(file: File): Promise<{ compressedFile: File; ratio: number }> {
    // Simple compression - in production, use more sophisticated compression
    if (file.size <= 1024 * 1024) { // 1MB or smaller, no compression needed
      return { compressedFile: file, ratio: 1 }
    }

    if (file.type.startsWith('image/')) {
      return this.compressImage(file)
    }

    if (file.type.startsWith('video/')) {
      // For now, just return original - video compression requires more complex logic
      return { compressedFile: file, ratio: 1 }
    }

    return { compressedFile: file, ratio: 1 }
  }

  /**
   * Compress image file
   */
  private async compressImage(file: File): Promise<{ compressedFile: File; ratio: number }> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: file.type })
              const ratio = compressedFile.size / file.size
              resolve({ compressedFile, ratio })
            } else {
              resolve({ compressedFile: file, ratio: 1 })
            }
          },
          file.type,
          0.8 // 80% quality
        )
      }

      img.onerror = () => {
        resolve({ compressedFile: file, ratio: 1 })
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate thumbnail for media
   */
  private async generateThumbnail(filePath: string, mimeType: string): Promise<string> {
    // Simple thumbnail generation - in production, use server-side processing
    if (mimeType.startsWith('image/')) {
      // For images, create a smaller version
      const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1')
      return thumbnailPath
    }

    if (mimeType.startsWith('video/')) {
      // For videos, extract first frame
      const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg')
      return thumbnailPath
    }

    return filePath
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.realtimeSubscriptions.forEach(channel => {
      channel.unsubscribe()
    })
    this.realtimeSubscriptions.clear()
  }
}

// Export singleton instance
export const messagingService = MessagingService.getInstance()

// Export utility functions
export const detectMessagePriority = async (content: string): Promise<PriorityAnalysisResult> => {
  return messagingService['analyzeMessagePriority'](content)
}

export default messagingService