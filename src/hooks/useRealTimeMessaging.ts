/**
 * Real-time Messaging Hook
 * React Query hooks for real-time messaging with optimistic updates
 * Following useStudents.ts patterns with Supabase real-time integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { requireAuth } from '@/lib/auth-utils'
import { messagingService } from '@/services/messaging-service'
import type {
  Conversation,
  Message,
  SendMessageData,
  CreateConversationData,
  UpdateConversationData,
  ConversationFilters,
  MessageFilters,
  ConversationStats,
  TypingEvent,
  MessageReadEvent
} from '@/types/communication'

// =============================================================================
// CONVERSATION HOOKS
// =============================================================================

/**
 * Fetch user conversations with real-time updates
 */
export const useConversations = (userId: string, filters: ConversationFilters = {}) => {
  const queryClient = useQueryClient()

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!userId) return

    const cleanup = messagingService.subscribeToUserConversations(userId, (conversation) => {
      // Update conversation in cache
      queryClient.setQueryData(['conversations', userId], (old: Conversation[] | undefined) => {
        if (!old) return [conversation]
        
        const existingIndex = old.findIndex(c => c.id === conversation.id)
        if (existingIndex >= 0) {
          const updated = [...old]
          updated[existingIndex] = conversation
          // Sort by last message time
          return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        }
        
        return [conversation, ...old].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      })
    })

    return cleanup
  }, [userId, queryClient])

  return useQuery({
    queryKey: ['conversations', userId, filters],
    queryFn: async (): Promise<Conversation[]> => {
      return retryApiCall(async () => {
        console.log('🔍 useConversations: Fetching conversations for user:', userId)
        
        const user = await requireAuth()
        
        const data = await messagingService.getUserConversations(userId)
        
        console.log('✅ useConversations: Conversations fetched successfully:', data?.length, 'records')
        return data || []
      }, {
        context: 'Fetching conversations',
        maxAttempts: 3,
        logErrors: true
      })
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - conversations update frequently
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for backup
  })
}

/**
 * Fetch single conversation by ID
 */
export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: async (): Promise<Conversation> => {
      console.log('🔍 useConversation: Fetching conversation:', conversationId)
      
      const user = await requireAuth()
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          student:students(
            id, first_name_ar, last_name_ar, first_name_en, last_name_en, registration_number
          ),
          parent:parent_profiles(id, name, email, avatar_url),
          therapist:therapist_profiles(id, name, email, avatar_url, specialization)
        `)
        .eq('id', conversationId)
        .single()

      if (error) {
        console.error('❌ Error fetching conversation:', error)
        throw error
      }

      console.log('✅ useConversation: Conversation fetched successfully')
      return data
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Create new conversation
 */
export const useCreateConversation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateConversationData): Promise<Conversation> => {
      console.log('🔍 useCreateConversation: Creating conversation:', data)
      
      const user = await requireAuth()
      
      const newConversation = await messagingService.createConversation(data)
      
      console.log('✅ useCreateConversation: Conversation created successfully:', newConversation.id)
      return newConversation
    },
    onSuccess: (data, variables) => {
      // Invalidate conversations list for both participants
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.parent_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.therapist_id] })
      
      // Set the new conversation in cache
      queryClient.setQueryData(['conversations', data.id], data)
      
      console.log('✅ useCreateConversation: Cache updated successfully')
    },
    onError: (error, variables) => {
      console.error('❌ useCreateConversation: Error creating conversation:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useCreateConversation',
        action: 'create_conversation',
        metadata: { 
          parent_id: variables.parent_id,
          therapist_id: variables.therapist_id,
          student_id: variables.student_id
        }
      })
    }
  })
}

// =============================================================================
// MESSAGE HOOKS
// =============================================================================

/**
 * Fetch messages for a conversation with real-time updates
 */
export const useRealTimeMessaging = (conversationId: string) => {
  const queryClient = useQueryClient()

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return

    const cleanup = messagingService.subscribeToConversation(conversationId, {
      onNewMessage: (message: Message) => {
        console.log('📨 New message received:', message.id)
        
        // Add to messages cache with optimistic update
        queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
          if (!old) return [message]
          
          // Check if message already exists (prevent duplicates)
          if (old.some(m => m.id === message.id)) return old
          
          return [...old, message].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })

        // Update conversation last message info
        queryClient.setQueryData(['conversations', conversationId], (old: Conversation | undefined) => {
          if (!old) return old
          return {
            ...old,
            last_message_at: message.created_at,
            last_message_by: message.sender_id,
            message_count: old.message_count + 1
          }
        })
      },
      
      onMessageRead: ({ userId, timestamp }: MessageReadEvent) => {
        console.log('👀 Messages marked as read by:', userId)
        
        // Update read status for messages in cache
        queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
          if (!old) return old
          
          return old.map(message => {
            if (message.recipient_id === userId && !message.read_status) {
              return {
                ...message,
                read_status: true,
                read_at: timestamp
              }
            }
            return message
          })
        })
      },
      
      onTyping: ({ userId, isTyping }: TypingEvent) => {
        // Update typing indicators in cache or state management
        queryClient.setQueryData(['typing', conversationId], (old: Record<string, boolean> | undefined) => {
          return { ...old, [userId]: isTyping }
        })
        
        // Clear typing indicator after 3 seconds if true
        if (isTyping) {
          setTimeout(() => {
            queryClient.setQueryData(['typing', conversationId], (current: Record<string, boolean> | undefined) => {
              if (!current) return {}
              const updated = { ...current }
              delete updated[userId]
              return updated
            })
          }, 3000)
        }
      }
    })

    return cleanup
  }, [conversationId, queryClient])

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      // PATTERN: Always validate auth first (see useStudents.ts:22)
      const user = await requireAuth()
      
      const data = await messagingService.getConversationMessages(conversationId)
      
      console.log('✅ useRealTimeMessaging: Messages fetched successfully:', data?.length, 'records')
      return data || []
    },
    enabled: !!conversationId,
    staleTime: 0, // Always fresh for real-time messaging
    refetchInterval: false, // Rely on real-time subscriptions
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })
}

/**
 * Send message with optimistic updates
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SendMessageData): Promise<Message> => {
      console.log('🔍 useSendMessage: Sending message:', data)
      
      const user = await requireAuth()
      
      const newMessage = await messagingService.sendMessage(data)
      
      console.log('✅ useSendMessage: Message sent successfully:', newMessage.id)
      return newMessage
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', variables.conversation_id] })
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', variables.conversation_id])
      
      // Create optimistic message
      const user = await requireAuth()
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: variables.conversation_id,
        sender_id: user.id,
        recipient_id: variables.recipient_id,
        content_ar: variables.content_ar,
        content_en: variables.content_en,
        message_type: variables.message_type,
        priority_level: variables.priority_level || 'normal',
        requires_response: variables.requires_response || false,
        response_deadline: variables.response_deadline,
        media_attachments: variables.media_attachments || [],
        read_status: false,
        delivered_at: new Date().toISOString(),
        alert_processed: false,
        escalation_triggered: false,
        related_session_id: variables.related_session_id,
        related_goal_id: variables.related_goal_id,
        reply_to_message_id: variables.reply_to_message_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        }
      }
      
      // Optimistically update messages
      queryClient.setQueryData(['messages', variables.conversation_id], (old: Message[] | undefined) => {
        if (!old) return [optimisticMessage]
        return [...old, optimisticMessage]
      })
      
      // Return context for rollback
      return { previousMessages, optimisticMessage }
    },
    onError: (error, variables, context) => {
      // Roll back optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.conversation_id], context.previousMessages)
      }
      
      console.error('❌ useSendMessage: Error sending message:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useSendMessage',
        action: 'send_message',
        metadata: { 
          conversation_id: variables.conversation_id,
          message_type: variables.message_type
        }
      })
    },
    onSuccess: (actualMessage, variables, context) => {
      // Replace optimistic message with actual message
      queryClient.setQueryData(['messages', variables.conversation_id], (old: Message[] | undefined) => {
        if (!old) return [actualMessage]
        
        return old.map(message => {
          // Replace temporary optimistic message with actual
          if (message.id === context?.optimisticMessage.id) {
            return actualMessage
          }
          return message
        })
      })

      // Update conversation cache
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      
      console.log('✅ useSendMessage: Cache updated successfully')
    },
  })
}

/**
 * Mark messages as read
 */
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string): Promise<number> => {
      console.log('🔍 useMarkMessagesAsRead: Marking messages as read:', conversationId)
      
      const user = await requireAuth()
      
      const count = await messagingService.markMessagesAsRead(conversationId)
      
      console.log('✅ useMarkMessagesAsRead: Messages marked as read:', count)
      return count
    },
    onSuccess: (count, conversationId) => {
      // Update message read status in cache
      queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
        if (!old) return old
        
        return old.map(message => {
          if (!message.read_status && message.recipient_id === user.id) {
            return {
              ...message,
              read_status: true,
              read_at: new Date().toISOString()
            }
          }
          return message
        })
      })

      // Update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      
      console.log('✅ useMarkMessagesAsRead: Cache updated successfully')
    },
    onError: (error, conversationId) => {
      console.error('❌ useMarkMessagesAsRead: Error marking messages as read:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useMarkMessagesAsRead',
        action: 'mark_messages_read',
        metadata: { conversation_id: conversationId }
      })
    }
  })
}

/**
 * Get unread message count for user
 */
export const useUnreadMessageCount = (userId: string) => {
  return useQuery({
    queryKey: ['unread-count', userId],
    queryFn: async (): Promise<number> => {
      console.log('🔍 useUnreadMessageCount: Fetching unread count for user:', userId)
      
      const user = await requireAuth()
      
      const count = await messagingService.getUnreadMessageCount(userId)
      
      console.log('✅ useUnreadMessageCount: Unread count fetched:', count)
      return count
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// =============================================================================
// TYPING INDICATOR HOOKS
// =============================================================================

/**
 * Typing indicators for conversation
 */
export const useTypingIndicators = (conversationId: string) => {
  return useQuery({
    queryKey: ['typing', conversationId],
    queryFn: async (): Promise<Record<string, boolean>> => {
      // Typing indicators are managed entirely by real-time events
      // This query just provides the cache structure
      return {}
    },
    enabled: !!conversationId,
    staleTime: Infinity, // Never stale - managed by real-time events
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

/**
 * Send typing indicator
 */
export const useSendTypingIndicator = () => {
  return useMutation({
    mutationFn: async ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      await messagingService.sendTypingIndicator(conversationId, isTyping)
    },
    onError: (error) => {
      console.error('❌ Error sending typing indicator:', error)
      // Don't report typing errors to error monitoring - they're not critical
    }
  })
}

// =============================================================================
// SEARCH AND FILTERING HOOKS
// =============================================================================

/**
 * Search messages across conversations
 */
export const useSearchMessages = (searchTerm: string, filters: MessageFilters = {}) => {
  return useQuery({
    queryKey: ['messages', 'search', searchTerm, filters],
    queryFn: async (): Promise<Message[]> => {
      if (!searchTerm.trim()) {
        return []
      }

      console.log('🔍 useSearchMessages: Searching messages with term:', searchTerm)
      
      const user = await requireAuth()
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations!inner(
            id, parent_id, therapist_id, student_id,
            student:students(first_name_ar, last_name_ar, first_name_en, last_name_en)
          )
        `)
        .or(`content_ar.ilike.%${searchTerm}%,content_en.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.conversation_id) {
        query = query.eq('conversation_id', filters.conversation_id)
      }

      if (filters.message_type) {
        query = query.eq('message_type', filters.message_type)
      }

      if (filters.priority_level) {
        query = query.eq('priority_level', filters.priority_level)
      }

      if (filters.unread_only) {
        query = query.eq('read_status', false)
      }

      const { data, error } = await query.limit(50)

      if (error) {
        console.error('❌ Error searching messages:', error)
        throw error
      }

      console.log('✅ useSearchMessages: Search completed:', data?.length || 0, 'results')
      return data || []
    },
    enabled: !!searchTerm.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// =============================================================================
// CONVERSATION STATISTICS HOOKS
// =============================================================================

/**
 * Get conversation statistics for dashboard
 */
export const useConversationStats = (userId: string) => {
  return useQuery({
    queryKey: ['conversation-stats', userId],
    queryFn: async (): Promise<ConversationStats> => {
      console.log('🔍 useConversationStats: Fetching stats for user:', userId)
      
      const user = await requireAuth()
      
      // Get basic conversation statistics
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, status, message_count, unread_count_parent, unread_count_therapist, created_at')
        .or(`parent_id.eq.${userId},therapist_id.eq.${userId}`)

      // Get today's voice call count
      const today = new Date().toISOString().split('T')[0]
      const { data: todayCalls } = await supabase
        .from('voice_calls')
        .select('id')
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .gte('initiated_at', today)

      // Calculate statistics
      const stats: ConversationStats = {
        total_conversations: conversations?.length || 0,
        active_conversations: conversations?.filter(c => c.status === 'active').length || 0,
        unread_messages: conversations?.reduce((sum, c) => {
          const userUnread = userId === c.parent_id ? c.unread_count_parent : c.unread_count_therapist
          return sum + userUnread
        }, 0) || 0,
        priority_messages: 0, // Would need additional query
        voice_calls_today: todayCalls?.length || 0,
        media_shared_today: 0, // Would need additional query
        response_time_avg_minutes: 0, // Would need complex calculation
        user_engagement_score: 0.8 // Placeholder - calculate based on activity
      }

      console.log('✅ useConversationStats: Stats calculated:', stats)
      return stats
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Check if user can message another user
 */
export const useCanMessage = (recipientId: string) => {
  return useQuery({
    queryKey: ['can-message', recipientId],
    queryFn: async (): Promise<boolean> => {
      const user = await requireAuth()
      
      // Check if there's an active relationship (parent-therapist via student)
      const { data } = await supabase
        .from('student_therapists')
        .select('id')
        .or(`parent_id.eq.${user.id},therapist_id.eq.${user.id}`)
        .or(`parent_id.eq.${recipientId},therapist_id.eq.${recipientId}`)
        .eq('is_active', true)
        .limit(1)

      return (data?.length || 0) > 0
    },
    enabled: !!recipientId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Archive conversation
 */
export const useArchiveConversation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      console.log('🔍 useArchiveConversation: Archiving conversation:', conversationId)
      
      await messagingService.archiveConversation(conversationId)
    },
    onSuccess: (_, conversationId) => {
      // Remove from active conversations
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        if (!old) return old
        return old.filter(c => c.id !== conversationId)
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      
      console.log('✅ useArchiveConversation: Conversation archived successfully')
    },
    onError: (error, conversationId) => {
      console.error('❌ useArchiveConversation: Error archiving conversation:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'useArchiveConversation',
        action: 'archive_conversation',
        metadata: { conversation_id: conversationId }
      })
    }
  })
}