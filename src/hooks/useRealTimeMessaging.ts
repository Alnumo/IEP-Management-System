import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { messageEncryptionService, messageEncryptionUtils } from '@/services/message-encryption-service'
import { communicationPushNotifications } from '@/services/communication-push-notifications'
import type { Message, Conversation, SendMessageData } from '@/types/communication'

export interface UseRealTimeMessagingOptions {
  conversationId?: string
  userId?: string
  onMessageReceived?: (message: Message) => void
  onTypingStart?: (userId: string) => void
  onTypingStop?: (userId: string) => void
  onUserOnline?: (userId: string) => void
  onUserOffline?: (userId: string) => void
}

export const useRealTimeMessaging = (options: UseRealTimeMessagingOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  
  const subscriptionRef = useRef<any>(null)
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!options.conversationId) return

    setIsLoading(true)
    setError(null)

    try {
      // Check if encryption is enabled for this conversation
      const encryptionStatus = await messageEncryptionUtils.getConversationEncryptionStatus(
        options.conversationId
      )
      setEncryptionEnabled(encryptionStatus.isEnabled)

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            name,
            email,
            avatar_url
          ),
          recipient:recipient_id (
            id,
            name,
            email
          ),
          reactions:message_reactions (
            id,
            reaction_type,
            reaction_emoji,
            user_id,
            created_at
          )
        `)
        .eq('conversation_id', options.conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Decrypt messages if encryption is enabled
      const processedMessages = await Promise.all(
        (data || []).map(async (message) => {
          if (encryptionStatus.isEnabled && messageEncryptionUtils.isMessageEncrypted(message)) {
            try {
              return await messageEncryptionService.decryptMessage(message)
            } catch (decryptError) {
              console.warn('Failed to decrypt message:', message.id, decryptError)
              return { ...message, content_ar: '[رسالة مشفرة]', content_en: '[Encrypted message]' }
            }
          }
          return message
        })
      )

      setMessages(processedMessages)
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [options.conversationId])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!options.conversationId) return

    loadMessages()

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${options.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${options.conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          
          // Decrypt new message if encryption is enabled
          let processedMessage = newMessage
          if (encryptionEnabled && messageEncryptionUtils.isMessageEncrypted(newMessage)) {
            try {
              processedMessage = await messageEncryptionService.decryptMessage(newMessage)
            } catch (decryptError) {
              console.warn('Failed to decrypt new message:', newMessage.id, decryptError)
              processedMessage = { 
                ...newMessage, 
                content_ar: '[رسالة مشفرة]', 
                content_en: '[Encrypted message]' 
              }
            }
          }
          
          setMessages((prev) => [...prev, processedMessage])
          options.onMessageReceived?.(processedMessage)
          
          // Send push notification if this message is for current user
          if (processedMessage.recipient_id === options.userId && processedMessage.sender_id !== options.userId) {
            try {
              // Get conversation details for notification
              const { data: conversation } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', processedMessage.conversation_id)
                .single()
                
              if (conversation) {
                await communicationPushNotifications.notifyNewMessage(processedMessage, conversation)
              }
            } catch (error) {
              console.warn('Failed to send push notification:', error)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${options.conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            )
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Connection error')
        }
      })

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${options.conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload
        
        if (userId !== options.userId) {
          if (isTyping) {
            setTypingUsers((prev) => new Set([...prev, userId]))
            options.onTypingStart?.(userId)
            
            // Clear existing timeout for this user
            const existingTimeout = typingTimeoutRef.current.get(userId)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
            }
            
            // Set new timeout to remove typing indicator
            const timeout = setTimeout(() => {
              setTypingUsers((prev) => {
                const newSet = new Set(prev)
                newSet.delete(userId)
                return newSet
              })
              options.onTypingStop?.(userId)
              typingTimeoutRef.current.delete(userId)
            }, 3000)
            
            typingTimeoutRef.current.set(userId, timeout)
          } else {
            setTypingUsers((prev) => {
              const newSet = new Set(prev)
              newSet.delete(userId)
              return newSet
            })
            options.onTypingStop?.(userId)
            
            const existingTimeout = typingTimeoutRef.current.get(userId)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
              typingTimeoutRef.current.delete(userId)
            }
          }
        }
      })
      .subscribe()

    // Subscribe to user presence
    const presenceChannel = supabase
      .channel(`presence:${options.conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = new Set<string>()
        
        Object.keys(state).forEach((userId) => {
          users.add(userId)
        })
        
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => new Set([...prev, key]))
        options.onUserOnline?.(key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
        options.onUserOffline?.(key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && options.userId) {
          // Track user presence
          await presenceChannel.track({
            user_id: options.userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    subscriptionRef.current = { messagesChannel, typingChannel, presenceChannel }

    return () => {
      messagesChannel.unsubscribe()
      typingChannel.unsubscribe()
      presenceChannel.unsubscribe()
      
      // Clear typing timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout))
      typingTimeoutRef.current.clear()
    }
  }, [options.conversationId, options.userId, loadMessages])

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!options.conversationId || !options.userId || !subscriptionRef.current) return

    subscriptionRef.current.typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: options.userId,
        isTyping,
      },
    })
  }, [options.conversationId, options.userId])

  return {
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers: Array.from(typingUsers),
    onlineUsers: Array.from(onlineUsers),
    encryptionEnabled,
    sendTypingIndicator,
    refetchMessages: loadMessages,
  }
}

export const useConversation = (conversationId: string) => {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadConversation = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            parent:parent_id (
              id,
              name,
              email,
              avatar_url
            ),
            therapist:therapist_id (
              id,
              name,
              email,
              avatar_url
            ),
            student:student_id (
              id,
              first_name_ar,
              last_name_ar,
              first_name_en,
              last_name_en,
              registration_number
            ),
            participants:conversation_participants (
              id,
              user_id,
              role,
              status,
              notifications_enabled,
              last_seen_at
            )
          `)
          .eq('id', conversationId)
          .single()

        if (error) throw error

        setConversation(data)
      } catch (err) {
        console.error('Error loading conversation:', err)
        setError('Failed to load conversation')
      } finally {
        setIsLoading(false)
      }
    }

    if (conversationId) {
      loadConversation()
    }
  }, [conversationId])

  return { conversation, isLoading, error }
}

export const useSendMessage = () => {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (messageData: SendMessageData) => {
    setIsSending(true)
    setError(null)

    try {
      // Check if encryption should be used for this conversation
      const encryptionStatus = await messageEncryptionUtils.getConversationEncryptionStatus(
        messageData.conversationId
      )

      let messageToInsert: any = {
        conversation_id: messageData.conversationId,
        sender_id: messageData.senderId,
        recipient_id: messageData.recipientId,
        message_type: messageData.messageType || 'text',
        priority_level: messageData.priorityLevel || 'normal',
        reply_to_message_id: messageData.replyToMessageId,
        related_session_id: messageData.relatedSessionId,
        related_goal_id: messageData.relatedGoalId,
      }

      // Encrypt message if encryption is enabled
      if (encryptionStatus.isEnabled) {
        try {
          const encryptionResult = await messageEncryptionService.encryptMessage({
            content_ar: messageData.contentAr,
            content_en: messageData.contentEn,
            message_type: messageData.messageType || 'text',
            media_attachments: messageData.mediaAttachments || []
          })

          messageToInsert = {
            ...messageToInsert,
            ...encryptionResult.encryptedMessage,
            encryption_key_id: encryptionResult.encryptionMetadata.keyId,
            iv: encryptionResult.encryptionMetadata.iv,
            auth_tag: encryptionResult.encryptionMetadata.authTag,
            content_hash: encryptionResult.encryptionMetadata.contentHash,
            encrypted_at: new Date().toISOString()
          }
        } catch (encryptError) {
          console.warn('Encryption failed, sending unencrypted:', encryptError)
          messageToInsert = {
            ...messageToInsert,
            content_ar: messageData.contentAr,
            content_en: messageData.contentEn,
            media_attachments: messageData.mediaAttachments || []
          }
        }
      } else {
        messageToInsert = {
          ...messageToInsert,
          content_ar: messageData.contentAr,
          content_en: messageData.contentEn,
          media_attachments: messageData.mediaAttachments || []
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageToInsert])
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      return { success: false, error: err }
    } finally {
      setIsSending(false)
    }
  }, [])

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          read_status: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (error) throw error

      return { success: true }
    } catch (err) {
      console.error('Error marking message as read:', err)
      return { success: false, error: err }
    }
  }, [])

  const addReaction = useCallback(async (messageId: string, reactionType: string, emoji?: string) => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .upsert([
          {
            message_id: messageId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            reaction_type: reactionType,
            reaction_emoji: emoji,
          },
        ])
        .select()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      console.error('Error adding reaction:', err)
      return { success: false, error: err }
    }
  }, [])

  return {
    sendMessage,
    markAsRead,
    addReaction,
    isSending,
    error,
  }
}

// Hook for fetching user's conversations list
export const useConversations = (userId: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadConversations = async () => {
      if (!userId) {
        setConversations([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            parent:parent_id (
              id,
              name,
              email,
              avatar_url
            ),
            therapist:therapist_id (
              id,
              name,
              email,
              avatar_url
            ),
            student:student_id (
              id,
              first_name_ar,
              last_name_ar,
              first_name_en,
              last_name_en,
              registration_number
            ),
            participants:conversation_participants (
              id,
              user_id,
              role,
              status,
              notifications_enabled,
              last_seen_at
            )
          `)
          .or(`parent_id.eq.${userId},therapist_id.eq.${userId}`)
          .order('last_message_at', { ascending: false })

        if (error) throw error

        // Calculate unread messages count for each conversation
        const conversationsWithUnread = await Promise.all(
          (data || []).map(async (conversation) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversation.id)
              .eq('recipient_id', userId)
              .eq('read_status', false)

            return {
              ...conversation,
              unread_count: count || 0
            }
          })
        )

        setConversations(conversationsWithUnread)
      } catch (err) {
        console.error('Error loading conversations:', err)
        setError('Failed to load conversations')
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `parent_id=eq.${userId}`,
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `therapist_id=eq.${userId}`,
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      conversationsChannel.unsubscribe()
    }
  }, [userId])

  return { data: conversations, isLoading, error }
}

export default useRealTimeMessaging