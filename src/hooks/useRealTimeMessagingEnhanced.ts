import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { messagingService } from '@/services/messaging-service'
import { messageEncryptionService } from '@/services/message-encryption-service'
import { communicationPushNotifications } from '@/services/communication-push-notifications'
import type { 
  Message, 
  Conversation, 
  SendMessageData,
  MessageReaction,
  MessageType,
  MessagePriority 
} from '@/types/communication'

export interface UseRealTimeMessagingOptions {
  conversationId?: string
  userId?: string
  onMessageReceived?: (message: Message) => void
  onTypingStart?: (userId: string) => void
  onTypingStop?: (userId: string) => void
  onUserOnline?: (userId: string) => void
  onUserOffline?: (userId: string) => void
  onMessageRead?: (messageId: string, userId: string) => void
  onReactionAdded?: (messageId: string, reaction: MessageReaction) => void
  autoMarkAsRead?: boolean
  enableEncryption?: boolean
}

interface SendMessageOptions extends Partial<SendMessageData> {
  content_ar?: string
  content_en?: string
  message_type?: MessageType
  priority_level?: MessagePriority
  media_attachments?: any[]
  reply_to_message_id?: string
  related_session_id?: string
  related_goal_id?: string
  requires_response?: boolean
  response_deadline?: string
}

export const useRealTimeMessagingEnhanced = (options: UseRealTimeMessagingOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const channelRef = useRef<any>(null)
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSeenMessageRef = useRef<string>('')

  // Load conversation and initial messages
  const loadConversationData = useCallback(async () => {
    if (!options.conversationId) return

    setIsLoading(true)
    setError(null)

    try {
      // Load conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
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
          parent:profiles!parent_id(
            id,
            name,
            email,
            avatar_url
          ),
          therapist:profiles!therapist_id(
            id,
            name,
            email,
            avatar_url,
            specialization
          )
        `)
        .eq('id', options.conversationId)
        .single()

      if (convError) throw convError
      setConversation(convData)

      // Check encryption status
      if (options.enableEncryption) {
        const encStatus = await messageEncryptionService.getConversationEncryptionStatus(
          options.conversationId
        )
        setEncryptionEnabled(encStatus.isEnabled)
      }

      // Load messages
      const messagesData = await messagingService.getConversationMessages(
        options.conversationId,
        { limit: 50 }
      )

      // Decrypt messages if encryption is enabled
      let processedMessages = messagesData
      if (encryptionEnabled) {
        processedMessages = await Promise.all(
          messagesData.map(async (msg) => {
            if (msg.encrypted) {
              const decrypted = await messageEncryptionService.decryptMessage(msg)
              return { ...msg, ...decrypted }
            }
            return msg
          })
        )
      }

      setMessages(processedMessages)
      
      if (processedMessages.length > 0) {
        lastSeenMessageRef.current = processedMessages[0].id
      }

      // Auto mark as read if enabled
      if (options.autoMarkAsRead && options.userId) {
        const unreadMessages = processedMessages.filter(
          m => !m.read_status && m.recipient_id === options.userId
        )
        if (unreadMessages.length > 0) {
          await messagingService.markMessagesAsRead(options.conversationId)
        }
      }

    } catch (err) {
      console.error('Failed to load conversation data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }, [options.conversationId, options.userId, options.autoMarkAsRead, options.enableEncryption, encryptionEnabled])

  // Set up real-time subscriptions
  const setupRealtimeSubscription = useCallback(() => {
    if (!options.conversationId) return

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase
      .channel(`conversation:${options.conversationId}`)
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        const newMessage = payload.payload.message as Message
        
        // Decrypt if needed
        let processedMessage = newMessage
        if (encryptionEnabled && newMessage.encrypted) {
          processedMessage = await messageEncryptionService.decryptMessage(newMessage)
        }

        // Add to messages if not already present
        setMessages(prev => {
          const exists = prev.some(m => m.id === processedMessage.id)
          if (exists) return prev
          
          const updated = [processedMessage, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          
          lastSeenMessageRef.current = processedMessage.id
          return updated
        })

        // Trigger callback
        options.onMessageReceived?.(processedMessage)

        // Auto mark as read
        if (options.autoMarkAsRead && 
            options.userId && 
            processedMessage.recipient_id === options.userId) {
          await markAsRead(processedMessage.id)
        }

        // Trigger push notification if message is from other user
        if (processedMessage.sender_id !== options.userId) {
          await communicationPushNotifications.triggerMessageNotification(processedMessage)
        }
      })
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        const { messageIds, userId } = payload.payload
        
        setMessages(prev => 
          prev.map(msg => 
            messageIds.includes(msg.id) 
              ? { ...msg, read_status: true, read_at: new Date().toISOString() }
              : msg
          )
        )
        
        messageIds.forEach((id: string) => {
          options.onMessageRead?.(id, userId)
        })
      })
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        const { userId, isTyping } = payload.payload
        
        if (isTyping) {
          setTypingUsers(prev => new Set(prev).add(userId))
          options.onTypingStart?.(userId)
          
          // Clear existing timeout
          const existingTimeout = typingTimeoutRef.current.get(userId)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }
          
          // Set timeout to remove typing indicator
          const timeout = setTimeout(() => {
            setTypingUsers(prev => {
              const updated = new Set(prev)
              updated.delete(userId)
              return updated
            })
            options.onTypingStop?.(userId)
            typingTimeoutRef.current.delete(userId)
          }, 3000)
          
          typingTimeoutRef.current.set(userId, timeout)
        } else {
          setTypingUsers(prev => {
            const updated = new Set(prev)
            updated.delete(userId)
            return updated
          })
          options.onTypingStop?.(userId)
          
          const timeout = typingTimeoutRef.current.get(userId)
          if (timeout) {
            clearTimeout(timeout)
            typingTimeoutRef.current.delete(userId)
          }
        }
      })
      .on('broadcast', { event: 'reaction_added' }, (payload) => {
        const { messageId, reaction } = payload.payload
        
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || []
              const existingReaction = reactions.find(r => r.reaction_emoji === reaction.emoji)
              
              if (existingReaction) {
                return {
                  ...msg,
                  reactions: reactions.map(r => 
                    r.reaction_emoji === reaction.emoji
                      ? { ...r, count: (r.count || 1) + 1 }
                      : r
                  )
                }
              } else {
                return {
                  ...msg,
                  reactions: [...reactions, {
                    id: Date.now().toString(),
                    message_id: messageId,
                    user_id: reaction.userId,
                    reaction_type: 'emoji',
                    reaction_emoji: reaction.emoji,
                    count: 1,
                    created_at: new Date().toISOString()
                  }]
                }
              }
            }
            return msg
          })
        )
        
        options.onReactionAdded?.(messageId, reaction)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineUserIds = new Set(
          Object.values(state).flat().map((presence: any) => presence.user_id)
        )
        setOnlineUsers(onlineUserIds)
        
        onlineUserIds.forEach(userId => options.onUserOnline?.(userId))
      })
      .on('presence', { event: 'join' }, (payload) => {
        const userId = payload.newPresences[0]?.user_id
        if (userId) {
          setOnlineUsers(prev => new Set(prev).add(userId))
          options.onUserOnline?.(userId)
        }
      })
      .on('presence', { event: 'leave' }, (payload) => {
        const userId = payload.leftPresences[0]?.user_id
        if (userId) {
          setOnlineUsers(prev => {
            const updated = new Set(prev)
            updated.delete(userId)
            return updated
          })
          options.onUserOffline?.(userId)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setReconnectAttempts(0)
          
          // Track user presence
          if (options.userId) {
            await channel.track({ user_id: options.userId })
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          handleReconnect()
        }
      })

    channelRef.current = channel
  }, [options, encryptionEnabled])

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1)
      setupRealtimeSubscription()
    }, delay)
  }, [reconnectAttempts, setupRealtimeSubscription])

  // Send message
  const sendMessage = useCallback(async (data: SendMessageOptions) => {
    if (!options.conversationId || !options.userId) {
      throw new Error('Conversation ID and User ID required')
    }

    try {
      // Encrypt message if enabled
      let messageData: SendMessageData = {
        conversation_id: options.conversationId,
        recipient_id: conversation?.parent_id === options.userId 
          ? conversation.therapist_id 
          : conversation?.parent_id || '',
        ...data
      }

      if (encryptionEnabled && (data.content_ar || data.content_en)) {
        const encrypted = await messageEncryptionService.encryptMessage({
          content_ar: data.content_ar,
          content_en: data.content_en
        })
        messageData = { ...messageData, ...encrypted }
      }

      const newMessage = await messagingService.sendMessage(messageData)
      
      // Add to local messages immediately
      setMessages(prev => [newMessage, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))

      return newMessage
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [options.conversationId, options.userId, conversation, encryptionEnabled])

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!options.userId) return

    try {
      await supabase
        .from('messages')
        .update({ 
          read_status: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .eq('recipient_id', options.userId)

      // Broadcast read status
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { messageIds: [messageId], userId: options.userId }
        })
      }

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, read_status: true, read_at: new Date().toISOString() }
            : msg
        )
      )
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }, [options.userId])

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    if (!options.conversationId || !options.userId) return

    try {
      const unreadMessages = messages.filter(
        m => !m.read_status && m.recipient_id === options.userId
      )
      
      if (unreadMessages.length === 0) return

      const messageIds = unreadMessages.map(m => m.id)
      
      await messagingService.markMessagesAsRead(options.conversationId)

      // Broadcast read status
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { messageIds, userId: options.userId }
        })
      }

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id)
            ? { ...msg, read_status: true, read_at: new Date().toISOString() }
            : msg
        )
      )
    } catch (error) {
      console.error('Failed to mark all messages as read:', error)
    }
  }, [options.conversationId, options.userId, messages])

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !options.userId) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'user_typing',
        payload: { userId: options.userId, isTyping, timestamp: new Date().toISOString() }
      })
    } catch (error) {
      console.error('Failed to send typing indicator:', error)
    }
  }, [options.userId])

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!options.userId) return

    try {
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: options.userId,
          reaction_type: 'emoji',
          reaction_emoji: emoji
        })

      // Broadcast reaction
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'reaction_added',
          payload: { 
            messageId, 
            reaction: { 
              userId: options.userId, 
              emoji,
              timestamp: new Date().toISOString()
            }
          }
        })
      }
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }, [options.userId])

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!options.conversationId || messages.length === 0) return

    try {
      const oldestMessage = messages[messages.length - 1]
      const moreMessages = await messagingService.getConversationMessages(
        options.conversationId,
        { 
          limit: 50,
          beforeMessageId: oldestMessage.id
        }
      )

      // Decrypt if needed
      let processedMessages = moreMessages
      if (encryptionEnabled) {
        processedMessages = await Promise.all(
          moreMessages.map(async (msg) => {
            if (msg.encrypted) {
              const decrypted = await messageEncryptionService.decryptMessage(msg)
              return { ...msg, ...decrypted }
            }
            return msg
          })
        )
      }

      setMessages(prev => [...prev, ...processedMessages])
      
      return processedMessages
    } catch (error) {
      console.error('Failed to load more messages:', error)
      throw error
    }
  }, [options.conversationId, messages, encryptionEnabled])

  // Initialize
  useEffect(() => {
    if (options.conversationId) {
      loadConversationData()
      setupRealtimeSubscription()
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      
      // Clear all timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutRef.current.clear()
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [options.conversationId])

  return {
    // State
    messages,
    conversation,
    isConnected,
    isLoading,
    error,
    typingUsers,
    onlineUsers,
    encryptionEnabled,
    
    // Actions
    sendMessage,
    markAsRead,
    markAllAsRead,
    sendTypingIndicator,
    addReaction,
    loadMoreMessages,
    reload: loadConversationData
  }
}

// Export for backwards compatibility
export const useRealTimeMessaging = useRealTimeMessagingEnhanced